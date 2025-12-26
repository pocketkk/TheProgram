"""
Birth data management endpoints (single-user mode)

No user authentication - all birth data belongs to "the user".
Supports multiple people (friends, family, POIs) with notes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models import BirthData
from app.schemas import (
    BirthDataCreate,
    BirthDataUpdate,
    BirthDataResponse,
    BirthDataWithLocation,
    Message,
)
from app.schemas.birth_data import RELATIONSHIP_TYPES

router = APIRouter()


@router.post("/", response_model=BirthDataResponse, status_code=status.HTTP_201_CREATED)
async def create_birth_data(
    birth_data_in: BirthDataCreate,
    db: Session = Depends(get_db)
):
    """
    Create new birth data

    Creates a new birth data record (single-user mode).

    Args:
        birth_data_in: Birth data creation data
        db: Database session

    Returns:
        Created birth data

    Raises:
        HTTPException 400: If coordinates are invalid
    """
    # Create birth data (no client_id in single-user mode)
    # Coordinates are validated by database CHECK constraints
    # Convert date/time objects to ISO format strings for SQLite
    birth_data = BirthData(
        # Person identification
        name=birth_data_in.name,
        relationship_type=birth_data_in.relationship_type,
        notes=birth_data_in.notes,
        is_primary=birth_data_in.is_primary,
        color=birth_data_in.color,
        # Birth info
        birth_date=str(birth_data_in.birth_date),
        birth_time=str(birth_data_in.birth_time) if birth_data_in.birth_time else None,
        time_unknown=birth_data_in.time_unknown,
        latitude=float(birth_data_in.latitude),
        longitude=float(birth_data_in.longitude),
        timezone=birth_data_in.timezone,
        utc_offset=birth_data_in.utc_offset,
        city=birth_data_in.city,
        state_province=birth_data_in.state_province,
        country=birth_data_in.country,
        rodden_rating=birth_data_in.rodden_rating,
        gender=birth_data_in.gender
    )

    db.add(birth_data)
    db.commit()
    db.refresh(birth_data)

    return birth_data


@router.get("/", response_model=List[BirthDataResponse])
async def list_birth_data(
    relationship_type: Optional[str] = Query(None, description="Filter by relationship type"),
    db: Session = Depends(get_db)
):
    """
    List all birth data (single-user mode)

    Returns all birth data records, optionally filtered by relationship type.

    Args:
        relationship_type: Optional filter by relationship type
        db: Database session

    Returns:
        List of birth data records
    """
    query = db.query(BirthData)

    if relationship_type:
        if relationship_type.lower() not in RELATIONSHIP_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid relationship_type. Must be one of: {', '.join(RELATIONSHIP_TYPES)}"
            )
        query = query.filter(BirthData.relationship_type == relationship_type.lower())

    # Order by is_primary first (user's own chart), then by name
    birth_data_list = query.order_by(
        BirthData.is_primary.desc(),
        BirthData.name,
        BirthData.created_at.desc()
    ).all()
    return birth_data_list


@router.get("/primary", response_model=BirthDataWithLocation)
async def get_primary_birth_data(
    db: Session = Depends(get_db)
):
    """
    Get the user's primary (own) birth data

    Returns the birth data record marked as primary (is_primary=True).

    Args:
        db: Database session

    Returns:
        Primary birth data with location information

    Raises:
        HTTPException 404: If no primary birth data found
    """
    birth_data = db.query(BirthData).filter(BirthData.is_primary == True).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No primary birth data found. Please set up your birth data in onboarding."
        )

    # Create response with additional fields
    birth_data_dict = {
        "id": birth_data.id,
        "name": birth_data.name,
        "relationship_type": birth_data.relationship_type,
        "notes": birth_data.notes,
        "is_primary": birth_data.is_primary,
        "color": birth_data.color,
        "birth_date": birth_data.birth_date,
        "birth_time": birth_data.birth_time,
        "time_unknown": birth_data.time_unknown,
        "latitude": birth_data.latitude,
        "longitude": birth_data.longitude,
        "timezone": birth_data.timezone,
        "utc_offset": birth_data.utc_offset,
        "city": birth_data.city,
        "state_province": birth_data.state_province,
        "country": birth_data.country,
        "rodden_rating": birth_data.rodden_rating,
        "gender": birth_data.gender,
        "created_at": birth_data.created_at,
        "updated_at": birth_data.updated_at,
        "location_string": birth_data.location_string,
        "has_time": birth_data.has_time,
        "data_quality": birth_data.rodden_rating or "Unknown"
    }

    return birth_data_dict


@router.get("/{birth_data_id}", response_model=BirthDataWithLocation)
async def get_birth_data(
    birth_data_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get birth data by ID

    Returns a specific birth data record with location information.
    No user ownership check needed.

    Args:
        birth_data_id: Birth data ID
        db: Database session

    Returns:
        Birth data with location information

    Raises:
        HTTPException 404: If birth data not found
    """
    # Convert UUID to string for SQLite query (IDs stored as TEXT)
    birth_data = db.query(BirthData).filter(BirthData.id == str(birth_data_id)).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Create response with additional fields (no client_id in single-user mode)
    birth_data_dict = {
        "id": birth_data.id,
        # Person identification
        "name": birth_data.name,
        "relationship_type": birth_data.relationship_type,
        "notes": birth_data.notes,
        "is_primary": birth_data.is_primary,
        "color": birth_data.color,
        # Birth info
        "birth_date": birth_data.birth_date,
        "birth_time": birth_data.birth_time,
        "time_unknown": birth_data.time_unknown,
        "latitude": birth_data.latitude,
        "longitude": birth_data.longitude,
        "timezone": birth_data.timezone,
        "utc_offset": birth_data.utc_offset,
        "city": birth_data.city,
        "state_province": birth_data.state_province,
        "country": birth_data.country,
        "rodden_rating": birth_data.rodden_rating,
        "gender": birth_data.gender,
        "created_at": birth_data.created_at,
        "updated_at": birth_data.updated_at,
        "location_string": birth_data.location_string,
        "has_time": birth_data.has_time,
        "data_quality": birth_data.rodden_rating or "Unknown"
    }

    return birth_data_dict


@router.put("/{birth_data_id}", response_model=BirthDataResponse)
async def update_birth_data(
    birth_data_id: UUID,
    birth_data_update: BirthDataUpdate,
    db: Session = Depends(get_db)
):
    """
    Update birth data

    Updates a birth data record. No user ownership check needed.

    Args:
        birth_data_id: Birth data ID
        birth_data_update: Birth data update data
        db: Database session

    Returns:
        Updated birth data

    Raises:
        HTTPException 404: If birth data not found
        HTTPException 400: If coordinates are invalid
    """
    # Convert UUID to string for SQLite query (IDs stored as TEXT)
    birth_data = db.query(BirthData).filter(BirthData.id == str(birth_data_id)).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Update person identification fields
    if birth_data_update.name is not None:
        birth_data.name = birth_data_update.name

    if birth_data_update.relationship_type is not None:
        birth_data.relationship_type = birth_data_update.relationship_type

    if birth_data_update.notes is not None:
        birth_data.notes = birth_data_update.notes

    if birth_data_update.is_primary is not None:
        birth_data.is_primary = birth_data_update.is_primary

    if birth_data_update.color is not None:
        birth_data.color = birth_data_update.color

    # Update birth info fields
    if birth_data_update.birth_date is not None:
        birth_data.birth_date = birth_data_update.birth_date

    if birth_data_update.birth_time is not None:
        birth_data.birth_time = birth_data_update.birth_time

    if birth_data_update.time_unknown is not None:
        birth_data.time_unknown = birth_data_update.time_unknown

    if birth_data_update.latitude is not None:
        birth_data.latitude = birth_data_update.latitude

    if birth_data_update.longitude is not None:
        birth_data.longitude = birth_data_update.longitude

    if birth_data_update.timezone is not None:
        birth_data.timezone = birth_data_update.timezone

    if birth_data_update.utc_offset is not None:
        birth_data.utc_offset = birth_data_update.utc_offset

    if birth_data_update.city is not None:
        birth_data.city = birth_data_update.city

    if birth_data_update.state_province is not None:
        birth_data.state_province = birth_data_update.state_province

    if birth_data_update.country is not None:
        birth_data.country = birth_data_update.country

    if birth_data_update.rodden_rating is not None:
        birth_data.rodden_rating = birth_data_update.rodden_rating

    if birth_data_update.gender is not None:
        birth_data.gender = birth_data_update.gender

    # Coordinates are validated by database CHECK constraints

    db.commit()
    db.refresh(birth_data)

    return birth_data


@router.delete("/{birth_data_id}", response_model=Message)
async def delete_birth_data(
    birth_data_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete birth data

    Permanently deletes a birth data record and all associated charts.
    No user ownership check needed.

    Args:
        birth_data_id: Birth data ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If birth data not found
    """
    # Convert UUID to string for SQLite query (IDs stored as TEXT)
    birth_data = db.query(BirthData).filter(BirthData.id == str(birth_data_id)).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    db.delete(birth_data)
    db.commit()

    return {
        "message": "Birth data deleted successfully",
        "detail": "Birth data and all associated charts have been permanently removed"
    }
