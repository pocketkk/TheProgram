"""
WebSocket endpoint for batch image generation

Provides real-time progress updates during batch image generation.
Supports tarot deck generation, theme sets, and other batch operations.
"""
import asyncio
import json
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.core.database_sqlite import DatabaseSession
from app.models.app_config import AppConfig
from app.models.generated_image import GeneratedImage, ImageCollection
from app.services.image_storage_service import get_image_storage_service

logger = logging.getLogger(__name__)

router = APIRouter()


class BatchGenerationManager:
    """Manages batch image generation sessions"""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.cancelled = False
        self._db = None

    async def send_progress(
        self,
        current: int,
        total: int,
        item_name: str,
        status: str = "generating",
        image_url: Optional[str] = None,
        image_id: Optional[str] = None,
        error: Optional[str] = None,
    ):
        """Send progress update to client"""
        await self.websocket.send_json({
            "type": "progress",
            "current": current,
            "total": total,
            "item_name": item_name,
            "status": status,
            "image_url": image_url,
            "image_id": image_id,
            "error": error,
            "percentage": round((current / total) * 100) if total > 0 else 0,
        })

    async def send_complete(self, collection_id: str, success_count: int, error_count: int):
        """Send completion message"""
        await self.websocket.send_json({
            "type": "complete",
            "collection_id": collection_id,
            "success_count": success_count,
            "error_count": error_count,
            "message": f"Generated {success_count} images" + (f" ({error_count} failed)" if error_count else ""),
        })

    async def send_error(self, message: str):
        """Send error message"""
        await self.websocket.send_json({
            "type": "error",
            "message": message,
        })

    def cancel(self):
        """Cancel the batch operation"""
        self.cancelled = True


@router.websocket("/ws/images/batch")
async def batch_generate_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for batch image generation

    Client sends:
        {
            "action": "start",
            "collection_id": "uuid",
            "items": [
                {"prompt": "...", "item_key": "major_00", "name": "The Fool"},
                ...
            ],
            "style_override": "optional style"  # Optional
        }

        {
            "action": "cancel"
        }

        {
            "action": "pause"
        }

        {
            "action": "resume"
        }

    Server sends:
        {"type": "progress", "current": 1, "total": 78, "item_name": "The Fool", "status": "generating", ...}
        {"type": "progress", "current": 1, "total": 78, "item_name": "The Fool", "status": "complete", "image_url": "..."}
        {"type": "complete", "collection_id": "...", "success_count": 78, "error_count": 0, ...}
        {"type": "error", "message": "..."}
    """
    await websocket.accept()
    manager = BatchGenerationManager(websocket)
    paused = False

    try:
        while True:
            # Wait for command
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "cancel":
                manager.cancel()
                await manager.send_error("Batch generation cancelled by user")
                break

            elif action == "pause":
                paused = True
                await websocket.send_json({"type": "paused"})

            elif action == "resume":
                paused = False
                await websocket.send_json({"type": "resumed"})

            elif action == "start":
                # Get parameters
                collection_id = data.get("collection_id")
                items = data.get("items", [])
                style_override = data.get("style_override")
                # Refinement parameters
                refinement_feedback = data.get("refinement_feedback")
                reference_image_id = data.get("reference_image_id")

                if not collection_id:
                    await manager.send_error("collection_id is required")
                    continue

                if not items:
                    await manager.send_error("items list is required")
                    continue

                # Run batch generation
                await run_batch_generation(
                    manager=manager,
                    collection_id=collection_id,
                    items=items,
                    style_override=style_override,
                    pause_check=lambda: paused,
                    refinement_feedback=refinement_feedback,
                    reference_image_id=reference_image_id,
                )

    except WebSocketDisconnect:
        logger.info("Client disconnected from batch generation")
        manager.cancel()
    except Exception as e:
        logger.error(f"Batch generation error: {e}")
        try:
            await manager.send_error(str(e))
        except Exception:
            pass


async def run_batch_generation(
    manager: BatchGenerationManager,
    collection_id: str,
    items: list,
    style_override: Optional[str],
    pause_check: callable,
    refinement_feedback: Optional[str] = None,
    reference_image_id: Optional[str] = None,
):
    """
    Run the batch generation process

    Args:
        manager: BatchGenerationManager instance
        collection_id: Collection UUID to add images to
        items: List of items to generate
        style_override: Optional style override
        pause_check: Callable that returns True if paused
        refinement_feedback: Optional text feedback to refine the image
        reference_image_id: Optional specific reference image ID (overrides collection default)
    """
    with DatabaseSession() as db:
        # Verify collection exists
        collection = db.query(ImageCollection).filter_by(id=collection_id).first()
        if not collection:
            await manager.send_error(f"Collection {collection_id} not found")
            return

        # Get API key
        config = db.query(AppConfig).filter_by(id=1).first()
        if not config or not config.has_google_api_key:
            await manager.send_error("Google API key not configured")
            return

        api_key = config.google_api_key

        # Get style from collection or override
        style = style_override or collection.style_prompt or ""

        # Get border style from collection
        border_style = getattr(collection, 'border_style', None) or ""

        # Initialize services
        try:
            from app.services.gemini_image_service import GeminiImageService
            service = GeminiImageService(api_key=api_key)
        except ImportError as e:
            await manager.send_error(f"Missing dependency: {e}")
            return
        except Exception as e:
            await manager.send_error(f"Failed to initialize image service: {e}")
            return

        storage = get_image_storage_service()

        # Track results
        success_count = 0
        error_count = 0
        total = len(items)

        # Get collection settings
        include_card_labels = getattr(collection, 'include_card_labels', False)

        # Reference image for style consistency
        # Priority: 1) passed reference_image_id (for refinement), 2) collection's approved reference
        reference_image: Optional[bytes] = None
        ref_id_to_use = reference_image_id or collection.reference_image_id
        if ref_id_to_use:
            ref_img = db.query(GeneratedImage).filter_by(id=ref_id_to_use).first()
            if ref_img and ref_img.file_path:
                try:
                    ref_full_path = storage.get_file_path(ref_img.file_path)
                    if ref_full_path and ref_full_path.exists():
                        reference_image = ref_full_path.read_bytes()
                        logger.info(f"Loaded reference image: {ref_img.file_path} ({len(reference_image)} bytes)")
                    else:
                        logger.error(f"Reference image file not found: {ref_full_path}")
                        await manager.send_error(f"Reference image file not found. Please regenerate the style preview.")
                        return
                except Exception as e:
                    logger.error(f"Could not load reference image: {e}")
                    await manager.send_error(f"Could not load reference image: {e}")
                    return
            else:
                logger.error(f"Reference image record not found in database: {ref_id_to_use}")
                await manager.send_error("Reference image not found in database. Please regenerate the style preview.")
                return
        else:
            logger.warning("No reference image ID provided - generating without style reference")

        # Generate each item
        for idx, item in enumerate(items):
            # Check for cancellation
            if manager.cancelled:
                break

            # Check for pause
            while pause_check() and not manager.cancelled:
                await asyncio.sleep(0.5)

            if manager.cancelled:
                break

            prompt = item.get("prompt", "")
            # If refinement feedback provided, prepend it as instructions
            if refinement_feedback:
                prompt = f"REFINEMENT REQUEST: {refinement_feedback}. Generate an improved version based on this feedback. Original description: {prompt}"
            item_key = item.get("item_key", f"item_{idx}")
            item_name = item.get("name", item_key)
            # Extract card number from item_key (e.g., "major_00" -> "0", "major_01" -> "I")
            card_number = item.get("number", None)
            if card_number is None and item_key.startswith("major_"):
                try:
                    num = int(item_key.split("_")[1])
                    # Convert to Roman numerals for major arcana (0 stays as 0)
                    roman_numerals = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX",
                                     "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII",
                                     "XIX", "XX", "XXI"]
                    card_number = roman_numerals[num] if num < len(roman_numerals) else str(num)
                except (IndexError, ValueError):
                    card_number = None

            # Send generating status
            await manager.send_progress(
                current=idx,
                total=total,
                item_name=item_name,
                status="generating",
            )

            try:
                # Determine purpose from collection type
                purpose_map = {
                    "tarot_deck": "tarot_card",
                    "theme_set": "background",
                    "infographic_set": "infographic",
                }
                purpose = purpose_map.get(collection.collection_type, "custom")

                # Generate image with retry for "no image data" errors
                # Pass reference_image for style consistency (None for first card)
                result = None
                max_retries = 3
                for retry in range(max_retries):
                    result = await service.generate_image(
                        prompt=prompt,
                        purpose=purpose,
                        style=style,
                        reference_image=reference_image,  # None for first, set after first success
                        include_card_labels=include_card_labels,
                        card_name=item_name,
                        card_number=card_number,
                        border_style=border_style,  # User's custom border/frame style
                    )

                    if result.success:
                        break  # Success, exit retry loop

                    # Check if it's a "no image data" error that might succeed on retry
                    if result.error and "no image" in result.error.lower():
                        if retry < max_retries - 1:
                            logger.warning(f"No image data for {item_name}, retrying ({retry + 1}/{max_retries})...")
                            await asyncio.sleep(5.0)  # Wait before retry
                            continue
                    else:
                        break  # Other error, don't retry

                if not result.success:
                    error_count += 1
                    await manager.send_progress(
                        current=idx + 1,
                        total=total,
                        item_name=item_name,
                        status="failed",
                        error=result.error,
                    )
                    continue

                # Save to storage
                filename = storage.generate_filename(f"{item_key}")
                category_map = {
                    "tarot_card": "tarot",
                    "background": "backgrounds",
                    "infographic": "infographics",
                    "custom": "custom",
                }
                category = category_map.get(purpose, "custom")

                file_path = storage.save_image(
                    image_data=result.image_data,
                    category=category,
                    filename=filename,
                    collection_id=collection_id,
                )

                # Save to database
                image = GeneratedImage(
                    image_type=purpose,
                    prompt=prompt,
                    style_prompt=style,  # Use style_prompt, not enhanced_prompt
                    file_path=file_path,
                    mime_type=result.mime_type,
                    width=result.width,
                    height=result.height,
                    file_size=len(result.image_data),
                    collection_id=collection_id,
                    item_key=item_key,
                    generation_params={  # Store extra info in generation_params JSON
                        "name": item_name,
                        "enhanced_prompt": result.enhanced_prompt,
                    },
                )
                db.add(image)
                db.commit()

                success_count += 1
                image_url = storage.get_file_url(file_path)

                # Store first successful image as style reference for remaining cards
                if reference_image is None and result.image_data:
                    reference_image = result.image_data
                    logger.info(f"Set {item_name} as style reference for remaining cards")

                await manager.send_progress(
                    current=idx + 1,
                    total=total,
                    item_name=item_name,
                    status="complete",
                    image_url=image_url,
                    image_id=image.id,
                )

                # Longer delay between requests to avoid rate limiting (Gemini has strict limits)
                await asyncio.sleep(6.0)  # 6 seconds = ~10 requests/minute, well under limits

            except Exception as e:
                logger.error(f"Error generating {item_name}: {e}")
                error_count += 1
                await manager.send_progress(
                    current=idx + 1,
                    total=total,
                    item_name=item_name,
                    status="failed",
                    error=str(e),
                )

        # Update collection status - only mark complete if ALL expected cards are generated
        # Count actual images in collection (not just this batch)
        total_images = db.query(GeneratedImage).filter_by(collection_id=collection_id).count()
        if collection.total_expected and total_images >= collection.total_expected:
            collection.is_complete = True
            db.commit()
            logger.info(f"Collection {collection_id} marked complete: {total_images}/{collection.total_expected} cards")

        # Send completion
        if not manager.cancelled:
            await manager.send_complete(
                collection_id=collection_id,
                success_count=success_count,
                error_count=error_count,
            )
