"""
Image generation and management endpoints

Provides REST API for Gemini-powered image generation,
storage management, and collection handling.
"""
import os
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.app_config import AppConfig
from app.models.generated_image import GeneratedImage, ImageCollection
from app.services.image_storage_service import get_image_storage_service
from app.schemas.image import (
    ImageGenerateRequest,
    ImageGenerateResponse,
    ImageRefineRequest,
    ImageInfo,
    ImageListResponse,
    CollectionCreate,
    CollectionUpdate,
    CollectionInfo,
    CollectionWithImages,
    CollectionListResponse,
    StorageStats,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["Images"])


def get_google_api_key(db: Session) -> str:
    """Get Google API key from database, raise if not configured"""
    config = db.query(AppConfig).filter_by(id=1).first()
    if not config or not config.has_google_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google API key not configured. Set your API key in settings to enable image generation.",
        )
    return config.google_api_key


# =============================================================================
# Image Generation Endpoints
# =============================================================================


@router.post("/generate", response_model=ImageGenerateResponse)
async def generate_image(
    request: ImageGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a single image using Gemini

    Creates an image based on the provided prompt and settings.
    Saves the image to storage and database.

    Args:
        request: Generation request with prompt and settings

    Returns:
        ImageGenerateResponse with image URL or error
    """
    api_key = get_google_api_key(db)

    try:
        from app.services.gemini_image_service import GeminiImageService

        # Initialize service with API key
        service = GeminiImageService(api_key=api_key)

        # Generate image
        result = await service.generate_image(
            prompt=request.prompt,
            purpose=request.purpose,
            style=request.style,
            aspect_ratio=request.aspect_ratio,
            astro_context=request.astro_context,
        )

        if not result.success:
            return ImageGenerateResponse(
                success=False,
                prompt=request.prompt,
                error=result.error,
            )

        # Save to storage
        storage = get_image_storage_service()
        filename = storage.generate_filename(request.purpose)

        # Determine category from purpose
        category_map = {
            "tarot_card": "tarot",
            "background": "backgrounds",
            "infographic": "infographics",
            "custom": "custom",
        }
        category = category_map.get(request.purpose, "custom")

        file_path = storage.save_image(
            image_data=result.image_data,
            category=category,
            filename=filename,
            collection_id=request.collection_id,
        )

        # Save to database
        image = GeneratedImage(
            image_type=request.purpose,
            prompt=request.prompt,
            style_prompt=request.style,
            file_path=file_path,
            mime_type=result.mime_type,
            width=result.width,
            height=result.height,
            file_size=len(result.image_data),
            collection_id=request.collection_id,
            item_key=request.item_key,
            generation_params={
                "enhanced_prompt": result.enhanced_prompt,
                "style": request.style,
                "aspect_ratio": request.aspect_ratio,
                "astro_context": request.astro_context,
            },
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        return ImageGenerateResponse(
            success=True,
            image_id=image.id,
            image_url=storage.get_file_url(file_path),
            width=result.width,
            height=result.height,
            prompt=request.prompt,
        )

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        return ImageGenerateResponse(
            success=False,
            prompt=request.prompt,
            error="Image generation dependencies not installed. Install google-genai package.",
        )
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return ImageGenerateResponse(
            success=False,
            prompt=request.prompt,
            error=str(e),
        )


@router.post("/refine", response_model=ImageGenerateResponse)
async def refine_image(
    request: ImageRefineRequest,
    db: Session = Depends(get_db),
):
    """
    Refine an existing image with new instructions

    Uses the original image as a visual reference for Gemini to generate
    a refined version based on the user's feedback.

    Args:
        request: Refinement request with image ID and instructions

    Returns:
        ImageGenerateResponse with new image or error
    """
    # Get original image
    original = db.query(GeneratedImage).filter_by(id=request.image_id).first()
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    api_key = get_google_api_key(db)
    storage = get_image_storage_service()

    # Load the original image from storage to use as reference
    original_image_bytes = None
    if original.file_path:
        original_image_bytes = storage.load_image(original.file_path)
        if not original_image_bytes:
            logger.warning(f"Could not load original image: {original.file_path}")

    # Get collection settings if the image belongs to a collection
    border_style = None
    include_card_labels = False
    if original.collection_id:
        collection = db.query(ImageCollection).filter_by(id=original.collection_id).first()
        if collection:
            border_style = getattr(collection, 'border_style', None)
            include_card_labels = getattr(collection, 'include_card_labels', False)

    # Extract card name and number from generation_params if available
    card_name = None
    card_number = None
    if original.generation_params:
        card_name = original.generation_params.get("name")
        # Try to extract card number from item_key
    if original.item_key and original.item_key.startswith("major_"):
        try:
            num = int(original.item_key.split("_")[1])
            roman_numerals = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX",
                             "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII",
                             "XIX", "XX", "XXI"]
            card_number = roman_numerals[num] if num < len(roman_numerals) else str(num)
        except (IndexError, ValueError):
            pass

    try:
        from app.services.gemini_image_service import GeminiImageService

        service = GeminiImageService(api_key=api_key)

        # Refine image with original as reference
        result = await service.refine_image(
            original_prompt=original.prompt,
            refinement_instruction=request.refinement,
            purpose=original.image_type,
            style=original.style_prompt,
            original_image=original_image_bytes,  # Pass original image as reference
            border_style=border_style,
            include_card_labels=include_card_labels,
            card_name=card_name,
            card_number=card_number,
        )

        if not result.success:
            return ImageGenerateResponse(
                success=False,
                prompt=original.prompt,
                error=result.error,
            )

        # Save to storage
        filename = storage.generate_filename(f"{original.image_type}_refined")

        category_map = {
            "tarot_card": "tarot",
            "background": "backgrounds",
            "infographic": "infographics",
            "custom": "custom",
        }
        category = category_map.get(original.image_type, "custom")

        file_path = storage.save_image(
            image_data=result.image_data,
            category=category,
            filename=filename,
            collection_id=original.collection_id,
        )

        # Save new image to database, link to original
        image = GeneratedImage(
            image_type=original.image_type,
            prompt=result.prompt,
            style_prompt=original.style_prompt,  # Carry over style from original
            file_path=file_path,
            mime_type=result.mime_type,
            width=result.width,
            height=result.height,
            file_size=len(result.image_data),
            collection_id=original.collection_id,
            item_key=original.item_key,
            parent_id=original.id,  # Field is parent_id, not parent_image_id
            generation_params={
                "refinement": request.refinement,
                "original_id": original.id,
                "enhanced_prompt": result.enhanced_prompt,
                "name": card_name,
            },
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        return ImageGenerateResponse(
            success=True,
            image_id=image.id,
            image_url=storage.get_file_url(file_path),
            width=result.width,
            height=result.height,
            prompt=result.prompt,
        )

    except Exception as e:
        logger.error(f"Image refinement error: {e}")
        return ImageGenerateResponse(
            success=False,
            prompt=original.prompt,
            error=str(e),
        )


class CardBackGenerateRequest(BaseModel):
    """Request to generate a card back for a tarot deck"""
    collection_id: str = Field(..., description="Collection ID to generate card back for")
    prompt: str = Field(
        default="Ornate mystical card back design with symmetrical geometric patterns, sacred geometry, celestial motifs",
        description="Card back design prompt"
    )


@router.post("/generate-card-back", response_model=ImageGenerateResponse)
async def generate_card_back(
    request: CardBackGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a card back image for a tarot deck collection

    Creates a card back image based on the collection's style and the provided prompt.
    The generated image is automatically linked to the collection.

    Args:
        request: Card back generation request with collection_id and optional prompt

    Returns:
        ImageGenerateResponse with image URL or error
    """
    # Get the collection
    collection = db.query(ImageCollection).filter_by(id=request.collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    api_key = get_google_api_key(db)

    try:
        from app.services.gemini_image_service import GeminiImageService

        # Initialize service with API key
        service = GeminiImageService(api_key=api_key)

        # Assemble the card back prompt with collection style
        prompt_parts = [request.prompt]
        if collection.style_prompt:
            prompt_parts.append(collection.style_prompt)
        if collection.border_style:
            prompt_parts.append(collection.border_style)
        full_prompt = ", ".join(prompt_parts)

        # Load reference image if available for style consistency
        reference_image_bytes = None
        storage = get_image_storage_service()
        if collection.reference_image_id:
            ref_img = db.query(GeneratedImage).filter_by(id=collection.reference_image_id).first()
            if ref_img and ref_img.file_path:
                reference_image_bytes = storage.load_image(ref_img.file_path)

        # Generate card back image (3:4 aspect ratio to match card faces)
        result = await service.generate_image(
            prompt=full_prompt,
            purpose="tarot_card",
            style=collection.style_prompt,
            aspect_ratio="3:4",
            reference_image=reference_image_bytes,
        )

        if not result.success:
            return ImageGenerateResponse(
                success=False,
                prompt=full_prompt,
                error=result.error,
            )

        # Save to storage
        filename = storage.generate_filename("card_back")

        file_path = storage.save_image(
            image_data=result.image_data,
            category="tarot",
            filename=filename,
            collection_id=request.collection_id,
        )

        # Save to database
        image = GeneratedImage(
            image_type="tarot_card",
            prompt=full_prompt,
            style_prompt=collection.style_prompt,
            file_path=file_path,
            mime_type=result.mime_type,
            width=result.width,
            height=result.height,
            file_size=len(result.image_data),
            collection_id=request.collection_id,
            item_key="card_back",
            generation_params={
                "enhanced_prompt": result.enhanced_prompt,
                "style": collection.style_prompt,
                "aspect_ratio": "3:4",
                "type": "card_back",
            },
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        # Update collection with the card back image
        collection.card_back_image_id = image.id
        db.commit()

        return ImageGenerateResponse(
            success=True,
            image_id=image.id,
            image_url=storage.get_file_url(file_path),
            width=result.width,
            height=result.height,
            prompt=full_prompt,
        )

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        return ImageGenerateResponse(
            success=False,
            prompt=request.prompt,
            error="Image generation dependencies not installed. Install google-genai package.",
        )
    except Exception as e:
        logger.error(f"Card back generation error: {e}")
        return ImageGenerateResponse(
            success=False,
            prompt=request.prompt,
            error=str(e),
        )


# =============================================================================
# Image Management Endpoints
# =============================================================================


@router.get("", response_model=ImageListResponse)
async def list_images(
    image_type: Optional[str] = Query(default=None, description="Filter by type"),
    collection_id: Optional[str] = Query(default=None, description="Filter by collection"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List generated images

    Returns paginated list of images with optional filtering.

    Args:
        image_type: Filter by image type
        collection_id: Filter by collection
        limit: Maximum results
        offset: Results offset

    Returns:
        ImageListResponse with images and pagination info
    """
    query = db.query(GeneratedImage)

    if image_type:
        query = query.filter(GeneratedImage.image_type == image_type)
    if collection_id:
        query = query.filter(GeneratedImage.collection_id == collection_id)

    total = query.count()
    images = query.order_by(GeneratedImage.created_at.desc()).offset(offset).limit(limit).all()

    storage = get_image_storage_service()

    return ImageListResponse(
        images=[
            ImageInfo(
                id=img.id,
                image_type=img.image_type,
                prompt=img.prompt,
                file_path=img.file_path,
                url=storage.get_file_url(img.file_path),
                width=img.width or 0,
                height=img.height or 0,
                file_size=img.file_size,
                collection_id=img.collection_id,
                item_key=img.item_key,
                metadata=None,  # Model doesn't have metadata field
                created_at=img.created_at,
            )
            for img in images
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/file/{path:path}")
async def get_image_file(path: str):
    """
    Serve an image file

    Returns the actual image file for display.

    Args:
        path: Relative path to image

    Returns:
        FileResponse with image
    """
    storage = get_image_storage_service()
    full_path = storage.get_file_path(path)

    if not full_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found",
        )

    # Determine content type
    ext = full_path.suffix.lower()
    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    content_type = content_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(full_path),
        media_type=content_type,
        filename=full_path.name,
    )


# =============================================================================
# Collection Endpoints
# =============================================================================


@router.get("/collections", response_model=CollectionListResponse)
async def list_collections(
    collection_type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    List image collections

    Returns all collections, optionally filtered by type.

    Args:
        collection_type: Filter by type (tarot_deck, theme_set, etc.)

    Returns:
        CollectionListResponse with collections
    """
    query = db.query(ImageCollection)

    if collection_type:
        query = query.filter(ImageCollection.collection_type == collection_type)

    collections = query.order_by(ImageCollection.created_at.desc()).all()

    # Get image counts
    storage = get_image_storage_service()
    result = []
    for coll in collections:
        count = db.query(GeneratedImage).filter_by(collection_id=coll.id).count()
        # Get card back URL if it exists
        card_back_url = None
        if coll.card_back_image_id:
            card_back_img = db.query(GeneratedImage).filter_by(id=coll.card_back_image_id).first()
            if card_back_img:
                card_back_url = storage.get_file_url(card_back_img.file_path)
        result.append(
            CollectionInfo(
                id=coll.id,
                name=coll.name,
                collection_type=coll.collection_type,
                style_prompt=coll.style_prompt,
                is_complete=coll.is_complete,
                is_active=coll.is_active,
                total_expected=coll.total_expected,
                include_card_labels=coll.include_card_labels,
                reference_image_id=coll.reference_image_id,
                card_back_image_id=coll.card_back_image_id,
                card_back_url=card_back_url,
                image_count=count,
                metadata=None,  # Model doesn't have metadata field
                created_at=coll.created_at,
                updated_at=coll.updated_at,
            )
        )

    return CollectionListResponse(
        collections=result,
        total=len(result),
    )


@router.post("/collections", response_model=CollectionInfo)
async def create_collection(
    request: CollectionCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new image collection

    Collections organize related images (tarot decks, theme sets).

    Args:
        request: Collection creation request

    Returns:
        CollectionInfo for new collection
    """
    collection = ImageCollection(
        name=request.name,
        collection_type=request.collection_type,
        style_prompt=request.style_prompt,
        total_expected=request.total_expected,
        include_card_labels=request.include_card_labels,
        # Note: metadata field not in model, request.metadata is ignored
    )
    db.add(collection)
    db.commit()
    db.refresh(collection)

    return CollectionInfo(
        id=collection.id,
        name=collection.name,
        collection_type=collection.collection_type,
        style_prompt=collection.style_prompt,
        is_complete=collection.is_complete,
        is_active=collection.is_active,
        total_expected=collection.total_expected,
        include_card_labels=collection.include_card_labels,
        reference_image_id=collection.reference_image_id,
        card_back_image_id=collection.card_back_image_id,
        card_back_url=None,
        image_count=0,
        metadata=None,  # Model doesn't have metadata field
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.get("/collections/{collection_id}", response_model=CollectionWithImages)
async def get_collection(
    collection_id: str,
    db: Session = Depends(get_db),
):
    """
    Get collection with its images

    Returns collection details and all images in the collection.

    Args:
        collection_id: Collection UUID

    Returns:
        CollectionWithImages with collection and images
    """
    collection = db.query(ImageCollection).filter_by(id=collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    images = db.query(GeneratedImage).filter_by(collection_id=collection_id).all()
    storage = get_image_storage_service()

    # Count unique item_keys to avoid counting regenerations multiple times
    unique_item_keys = set(img.item_key for img in images if img.item_key)
    unique_count = len(unique_item_keys)

    # Get card back URL if it exists
    card_back_url = None
    if collection.card_back_image_id:
        card_back_img = db.query(GeneratedImage).filter_by(id=collection.card_back_image_id).first()
        if card_back_img:
            card_back_url = storage.get_file_url(card_back_img.file_path)

    return CollectionWithImages(
        id=collection.id,
        name=collection.name,
        collection_type=collection.collection_type,
        style_prompt=collection.style_prompt,
        is_complete=collection.is_complete,
        is_active=collection.is_active,
        total_expected=collection.total_expected,
        include_card_labels=collection.include_card_labels,
        reference_image_id=collection.reference_image_id,
        card_back_image_id=collection.card_back_image_id,
        card_back_url=card_back_url,
        image_count=unique_count,
        metadata=None,  # Model doesn't have metadata field
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        images=[
            ImageInfo(
                id=img.id,
                image_type=img.image_type,
                prompt=img.prompt,
                file_path=img.file_path,
                url=storage.get_file_url(img.file_path),
                width=img.width or 0,
                height=img.height or 0,
                file_size=img.file_size,
                collection_id=img.collection_id,
                item_key=img.item_key,
                metadata=None,  # Model doesn't have metadata field
                created_at=img.created_at,
            )
            for img in images
        ],
    )


@router.patch("/collections/{collection_id}", response_model=CollectionInfo)
async def update_collection(
    collection_id: str,
    request: CollectionUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a collection

    Updates collection name, style, or active status.

    Args:
        collection_id: Collection UUID
        request: Update fields

    Returns:
        Updated CollectionInfo
    """
    collection = db.query(ImageCollection).filter_by(id=collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if request.name is not None:
        collection.name = request.name
    if request.style_prompt is not None:
        collection.style_prompt = request.style_prompt
    if request.is_active is not None:
        collection.is_active = request.is_active
    if request.include_card_labels is not None:
        collection.include_card_labels = request.include_card_labels
    if request.reference_image_id is not None:
        collection.reference_image_id = request.reference_image_id
    if request.card_back_image_id is not None:
        collection.card_back_image_id = request.card_back_image_id
    # Note: request.metadata ignored - model doesn't have metadata field

    db.commit()
    db.refresh(collection)

    count = db.query(GeneratedImage).filter_by(collection_id=collection_id).count()
    storage = get_image_storage_service()

    # Get card back URL if it exists
    card_back_url = None
    if collection.card_back_image_id:
        card_back_img = db.query(GeneratedImage).filter_by(id=collection.card_back_image_id).first()
        if card_back_img:
            card_back_url = storage.get_file_url(card_back_img.file_path)

    return CollectionInfo(
        id=collection.id,
        name=collection.name,
        collection_type=collection.collection_type,
        style_prompt=collection.style_prompt,
        is_complete=collection.is_complete,
        is_active=collection.is_active,
        total_expected=collection.total_expected,
        include_card_labels=collection.include_card_labels,
        reference_image_id=collection.reference_image_id,
        card_back_image_id=collection.card_back_image_id,
        card_back_url=card_back_url,
        image_count=count,
        metadata=None,  # Model doesn't have metadata field
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: str,
    delete_images: bool = Query(default=True, description="Also delete all images"),
    db: Session = Depends(get_db),
):
    """
    Delete a collection

    Optionally deletes all images in the collection.

    Args:
        collection_id: Collection UUID
        delete_images: Whether to delete associated images

    Returns:
        Success message
    """
    collection = db.query(ImageCollection).filter_by(id=collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if delete_images:
        # Delete associated images from storage and database
        images = db.query(GeneratedImage).filter_by(collection_id=collection_id).all()
        storage = get_image_storage_service()

        for img in images:
            storage.delete_image(img.file_path)
            db.delete(img)

    # Delete collection
    db.delete(collection)
    db.commit()

    return {"message": "Collection deleted successfully"}


# =============================================================================
# Storage Management Endpoints
# =============================================================================


@router.get("/storage/stats", response_model=StorageStats)
async def get_storage_stats():
    """
    Get image storage statistics

    Returns storage usage by category.

    Returns:
        StorageStats with usage information
    """
    storage = get_image_storage_service()
    stats = storage.get_storage_stats()

    return StorageStats(
        total_files=stats["total_files"],
        total_size_bytes=stats["total_size_bytes"],
        total_size_mb=stats["total_size_mb"],
        by_category=stats["by_category"],
    )


@router.post("/storage/cleanup")
async def cleanup_temp_files(
    max_age_hours: int = Query(default=24, ge=1, le=168),
):
    """
    Clean up temporary files

    Removes old files from temp directory.

    Args:
        max_age_hours: Maximum age in hours before deletion

    Returns:
        Number of files deleted
    """
    storage = get_image_storage_service()
    deleted = storage.cleanup_temp(max_age_hours=max_age_hours)

    return {
        "message": f"Cleaned up {deleted} temporary files",
        "deleted_count": deleted,
    }


# =============================================================================
# Single Image Endpoints (must be LAST - catch-all pattern)
# =============================================================================


@router.get("/{image_id}", response_model=ImageInfo)
async def get_image(
    image_id: str,
    db: Session = Depends(get_db),
):
    """
    Get image information

    Returns detailed info about a specific image.

    Args:
        image_id: Image UUID

    Returns:
        ImageInfo with image details
    """
    image = db.query(GeneratedImage).filter_by(id=image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    storage = get_image_storage_service()

    return ImageInfo(
        id=image.id,
        image_type=image.image_type,
        prompt=image.prompt,
        file_path=image.file_path,
        url=storage.get_file_url(image.file_path),
        width=image.width or 0,
        height=image.height or 0,
        file_size=image.file_size,
        collection_id=image.collection_id,
        item_key=image.item_key,
        metadata=None,  # Model doesn't have metadata field
        created_at=image.created_at,
    )


@router.delete("/{image_id}")
async def delete_image(
    image_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete an image

    Removes image from database and storage.

    Args:
        image_id: Image UUID

    Returns:
        Success message
    """
    image = db.query(GeneratedImage).filter_by(id=image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    # Delete from storage
    storage = get_image_storage_service()
    storage.delete_image(image.file_path)

    # Delete from database
    db.delete(image)
    db.commit()

    return {"message": "Image deleted successfully"}
