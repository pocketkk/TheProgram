"""
Palm Reading API Routes

Endpoints for palm reading analysis using AI vision.
"""
import json
import os
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.palm_reading import PalmReading
from app.models.app_config import AppConfig
from app.services.palm_reading_service import PalmReadingService
from app.services.image_storage_service import get_image_storage_service
from app.schemas.palm_reading import (
    PalmReadingResponse,
    QuickInsightResponse,
    PalmReadingRecord,
    PalmReadingListResponse,
    PalmReadingUpdate,
)

router = APIRouter(prefix="/palm-reading", tags=["Palm Reading"])


def get_anthropic_api_key(db: Session) -> str:
    """Get Anthropic API key from app config"""
    config = db.query(AppConfig).filter_by(id="1").first()
    if not config or not config.anthropic_api_key:
        # Try environment variable as fallback
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Anthropic API key not configured. Please set it in Settings."
            )
        return api_key
    return config.anthropic_api_key


@router.post("/analyze", response_model=PalmReadingResponse)
async def analyze_palm(
    image: UploadFile = File(..., description="Palm image to analyze"),
    hand_type: str = Form(default="both", description="Type of hand: 'left', 'right', or 'both'"),
    additional_context: Optional[str] = Form(default=None, description="Optional context or questions"),
    save_reading: bool = Form(default=True, description="Whether to save the reading to history"),
    db: Session = Depends(get_db)
):
    """
    Analyze a palm image and generate a comprehensive reading with astrological correlations.

    The image should show the palm(s) clearly facing the camera. For best results:
    - Good lighting
    - Palm flat and fingers spread
    - Clear focus on palm lines

    Returns a detailed reading covering:
    - Hand shape and element
    - Major lines (heart, head, life, fate)
    - Mounts (planetary hills)
    - Finger analysis
    - Special markings
    - Astrological synthesis
    - Guidance and potential
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {', '.join(allowed_types)}"
        )

    # Validate hand type
    valid_hand_types = ["left", "right", "both"]
    if hand_type not in valid_hand_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid hand type. Must be one of: {', '.join(valid_hand_types)}"
        )

    # Get API key
    api_key = get_anthropic_api_key(db)

    # Read image data
    image_data = await image.read()

    # Analyze palm
    service = PalmReadingService(api_key=api_key)
    result = await service.analyze_palm_async(
        image_data=image_data,
        media_type=image.content_type,
        hand_type=hand_type,
        additional_context=additional_context
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Palm analysis failed: {result.get('error', 'Unknown error')}"
        )

    # Save to database if requested
    if save_reading and result["success"]:
        # Optionally save the image
        image_path = None
        try:
            storage = get_image_storage_service()
            # Reset file pointer
            await image.seek(0)
            image_data_for_storage = await image.read()
            filename = f"palm_{hand_type}_{PalmReading.__table__.columns.id.default.arg()}.{image.content_type.split('/')[-1]}"
            image_path = str(storage.save_image(
                image_data=image_data_for_storage,
                category="palm_readings",
                filename=filename
            ))
        except Exception as e:
            # Don't fail the request if image save fails
            print(f"Warning: Could not save palm image: {e}")

        # Create database record
        palm_reading = PalmReading(
            hand_type=hand_type,
            full_reading=result["full_reading"],
            sections_json=json.dumps(result["sections"]) if result["sections"] else None,
            image_path=image_path,
            additional_context=additional_context,
            model_used=result["model_used"],
            tokens_input=result["tokens_used"]["input"] if result["tokens_used"] else None,
            tokens_output=result["tokens_used"]["output"] if result["tokens_used"] else None
        )
        db.add(palm_reading)
        db.commit()
        db.refresh(palm_reading)

    return PalmReadingResponse(**result)


@router.post("/quick-insight", response_model=QuickInsightResponse)
async def get_quick_insight(
    image: UploadFile = File(..., description="Palm image for quick insight"),
    db: Session = Depends(get_db)
):
    """
    Get a quick, brief palm insight (3-4 sentences).

    Useful for a preview before requesting a full reading.
    Does not save to history.
    """
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {', '.join(allowed_types)}"
        )

    api_key = get_anthropic_api_key(db)
    image_data = await image.read()

    service = PalmReadingService(api_key=api_key)
    result = await service.generate_quick_insight_async(
        image_data=image_data,
        media_type=image.content_type
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Quick insight failed: {result.get('error', 'Unknown error')}"
        )

    return QuickInsightResponse(**result)


@router.get("/history", response_model=PalmReadingListResponse)
async def list_palm_readings(
    limit: int = Query(default=20, le=100, description="Maximum number of readings to return"),
    offset: int = Query(default=0, ge=0, description="Number of readings to skip"),
    favorites_only: bool = Query(default=False, description="Only return favorite readings"),
    db: Session = Depends(get_db)
):
    """
    List saved palm readings.

    Returns readings in reverse chronological order (newest first).
    """
    query = db.query(PalmReading)

    if favorites_only:
        query = query.filter(PalmReading.is_favorite == True)

    total = query.count()

    readings = query.order_by(PalmReading.created_at.desc()).offset(offset).limit(limit).all()

    return PalmReadingListResponse(
        readings=[PalmReadingRecord.model_validate(r) for r in readings],
        total=total
    )


@router.get("/{reading_id}", response_model=PalmReadingRecord)
async def get_palm_reading(
    reading_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific palm reading by ID"""
    reading = db.query(PalmReading).filter(PalmReading.id == reading_id).first()

    if not reading:
        raise HTTPException(status_code=404, detail="Palm reading not found")

    return PalmReadingRecord.model_validate(reading)


@router.patch("/{reading_id}", response_model=PalmReadingRecord)
async def update_palm_reading(
    reading_id: str,
    update_data: PalmReadingUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a palm reading (notes, favorite status).
    """
    reading = db.query(PalmReading).filter(PalmReading.id == reading_id).first()

    if not reading:
        raise HTTPException(status_code=404, detail="Palm reading not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(reading, key, value)

    db.commit()
    db.refresh(reading)

    return PalmReadingRecord.model_validate(reading)


@router.delete("/{reading_id}")
async def delete_palm_reading(
    reading_id: str,
    db: Session = Depends(get_db)
):
    """Delete a palm reading"""
    reading = db.query(PalmReading).filter(PalmReading.id == reading_id).first()

    if not reading:
        raise HTTPException(status_code=404, detail="Palm reading not found")

    # Optionally delete associated image
    if reading.image_path:
        try:
            storage = get_image_storage_service()
            storage.delete_image(reading.image_path)
        except Exception as e:
            print(f"Warning: Could not delete palm image: {e}")

    db.delete(reading)
    db.commit()

    return {"success": True, "message": "Palm reading deleted"}
