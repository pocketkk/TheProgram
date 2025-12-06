"""
Printing API endpoints

Handles integration with The Game Crafter for printing tarot decks.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.app_config import AppConfig
from app.models.generated_image import GeneratedImage, ImageCollection
from app.services.image_storage_service import get_image_storage_service
from app.schemas.image import (
    TGCCredentialsUpdate,
    TGCCredentialsStatus,
    TGCPrintRequest,
    TGCPrintResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/printing", tags=["Printing"])


def get_tgc_credentials(db: Session) -> tuple:
    """Get TGC credentials from database, raise if not configured"""
    config = db.query(AppConfig).filter_by(id=1).first()
    if not config or not config.has_tgc_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Game Crafter credentials not configured. Set your TGC account details in settings to enable printing.",
        )
    return config.tgc_api_key_id, config.tgc_username, config.tgc_password


# =============================================================================
# Credentials Management
# =============================================================================


@router.get("/tgc/status", response_model=TGCCredentialsStatus)
async def get_tgc_status(db: Session = Depends(get_db)):
    """
    Check if TGC credentials are configured

    Returns:
        TGCCredentialsStatus with configuration state
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        return TGCCredentialsStatus(configured=False)

    return TGCCredentialsStatus(
        configured=config.has_tgc_credentials,
        username=config.tgc_username if config.has_tgc_credentials else None,
    )


@router.post("/tgc/credentials", response_model=TGCCredentialsStatus)
async def set_tgc_credentials(
    request: TGCCredentialsUpdate,
    db: Session = Depends(get_db),
):
    """
    Set or update TGC credentials

    Args:
        request: TGC credentials (API key ID, username, password)

    Returns:
        TGCCredentialsStatus confirming configuration
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        # Create config if it doesn't exist
        config = AppConfig(id=1)
        db.add(config)

    config.tgc_api_key_id = request.api_key_id
    config.tgc_username = request.username
    config.tgc_password = request.password

    db.commit()

    logger.info(f"TGC credentials updated for user: {request.username}")

    return TGCCredentialsStatus(
        configured=True,
        username=request.username,
    )


@router.delete("/tgc/credentials")
async def remove_tgc_credentials(db: Session = Depends(get_db)):
    """
    Remove TGC credentials

    Returns:
        Success message
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if config:
        config.tgc_api_key_id = None
        config.tgc_username = None
        config.tgc_password = None
        db.commit()

    return {"message": "TGC credentials removed"}


# =============================================================================
# Print Submission
# =============================================================================


@router.post("/tgc/submit", response_model=TGCPrintResponse)
async def submit_deck_for_printing(
    request: TGCPrintRequest,
    db: Session = Depends(get_db),
):
    """
    Submit a tarot deck collection for printing at The Game Crafter

    This endpoint:
    1. Validates the collection has enough cards
    2. Authenticates with TGC
    3. Uploads all card images
    4. Creates a game/deck product
    5. Returns the checkout URL

    Args:
        request: Print request with collection ID and deck name

    Returns:
        TGCPrintResponse with game URL and checkout link
    """
    # Get credentials
    api_key_id, username, password = get_tgc_credentials(db)

    # Get collection
    collection = db.query(ImageCollection).filter_by(id=request.collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if collection.collection_type != "tarot_deck":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only tarot deck collections can be printed",
        )

    # Get all images in collection
    images = db.query(GeneratedImage).filter_by(collection_id=request.collection_id).all()

    if not images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collection has no images to print",
        )

    # Get unique images by item_key (use latest for each card)
    card_images_by_key = {}
    for img in sorted(images, key=lambda x: x.created_at):
        if img.item_key:
            card_images_by_key[img.item_key] = img

    if len(card_images_by_key) < 10:  # Minimum viable deck
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Collection needs at least 10 cards. Found {len(card_images_by_key)}.",
        )

    # Load image data
    storage = get_image_storage_service()
    card_images = []

    for item_key, img in card_images_by_key.items():
        image_data = storage.load_image(img.file_path)
        if image_data:
            # Extract card name from generation_params or item_key
            card_name = item_key
            if img.generation_params and "name" in img.generation_params:
                card_name = img.generation_params["name"]

            card_images.append({
                "name": card_name,
                "item_key": item_key,
                "image_data": image_data,
            })
        else:
            logger.warning(f"Could not load image for {item_key}: {img.file_path}")

    if not card_images:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load card images from storage",
        )

    # Get or generate card back image
    card_back_data = None
    if request.card_back_image_id:
        back_image = db.query(GeneratedImage).filter_by(id=request.card_back_image_id).first()
        if back_image:
            card_back_data = storage.load_image(back_image.file_path)

    if not card_back_data:
        # Use a simple default card back (or the first card as reference)
        # In a real implementation, you might want to generate a proper card back
        # For now, we'll use the first card image as the back (not ideal but functional)
        card_back_data = card_images[0]["image_data"]
        logger.warning("Using first card as card back - consider generating a proper card back")

    try:
        from app.services.game_crafter_service import GameCrafterService

        service = GameCrafterService(
            api_key_id=api_key_id,
            username=username,
            password=password,
        )

        # Submit deck for printing
        result = await service.submit_deck_for_printing(
            deck_name=request.deck_name,
            card_images=card_images,
            card_back_image=card_back_data,
            description=request.description or f"Custom tarot deck: {collection.name}",
        )

        # Logout when done
        await service.logout()

        if result.success:
            logger.info(f"Successfully submitted deck '{request.deck_name}' to TGC")

        return TGCPrintResponse(
            success=result.success,
            game_id=result.game_id,
            deck_id=result.deck_id,
            game_url=result.game_url,
            checkout_url=result.checkout_url,
            cards_uploaded=result.cards_uploaded,
            error=result.error,
            details=result.details,
        )

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        return TGCPrintResponse(
            success=False,
            error="Printing dependencies not installed. Install httpx package.",
        )
    except Exception as e:
        logger.error(f"Print submission error: {e}")
        return TGCPrintResponse(
            success=False,
            error=str(e),
        )


@router.post("/tgc/test-connection")
async def test_tgc_connection(db: Session = Depends(get_db)):
    """
    Test connection to The Game Crafter API

    Verifies credentials by attempting to authenticate.

    Returns:
        Success message with username or error
    """
    api_key_id, username, password = get_tgc_credentials(db)

    try:
        from app.services.game_crafter_service import GameCrafterService

        service = GameCrafterService(
            api_key_id=api_key_id,
            username=username,
            password=password,
        )

        # Try to authenticate
        session = await service.authenticate()

        # Logout after test
        await service.logout()

        return {
            "success": True,
            "message": f"Successfully connected as {session.username}",
            "user_id": session.user_id,
        }

    except Exception as e:
        logger.error(f"TGC connection test failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection failed: {str(e)}",
        )
