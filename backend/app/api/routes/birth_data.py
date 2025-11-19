"""
Birth data management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models import User, BirthData
from app.schemas import (
    BirthDataCreate,
    BirthDataUpdate,
    BirthDataResponse,
    BirthDataWithLocation,
    Message,
)

router = APIRouter()


@router.post("/", response_model=BirthDataResponse, status_code=status.HTTP_201_CREATED)
async def create_birth_data(
    birth_data_in: BirthDataCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create new birth data

    Creates a new birth data record for a client.

    Args:
        birth_data_in: Birth data creation data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created birth data

    Raises:
        HTTPException 404: If client not found
        HTTPException 403: If client doesn't belong to user
    """
    # Verify client exists and belongs to user
    client = db.query(Client).filter(Client.id == birth_data_in.client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    if client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add birth data to this client"
        )

    # Create birth data
    birth_data = BirthData(
        client_id=birth_data_in.client_id,
        birth_date=birth_data_in.birth_date,
        birth_time=birth_data_in.birth_time,
        time_unknown=birth_data_in.time_unknown,
        latitude=birth_data_in.latitude,
        longitude=birth_data_in.longitude,
        timezone=birth_data_in.timezone,
        utc_offset=birth_data_in.utc_offset,
        city=birth_data_in.city,
        state_province=birth_data_in.state_province,
        country=birth_data_in.country,
        rodden_rating=birth_data_in.rodden_rating,
        gender=birth_data_in.gender
    )

    # Validate coordinates
    if not birth_data.validate_coordinates():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid coordinates: latitude must be -90 to +90, longitude must be -180 to +180"
        )

    db.add(birth_data)
    db.commit()
    db.refresh(birth_data)

    return birth_data


@router.get("/client/{client_id}", response_model=List[BirthDataResponse])
async def list_birth_data_for_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all birth data for a client

    Returns all birth data records for a specific client.

    Args:
        client_id: Client ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of birth data records

    Raises:
        HTTPException 404: If client not found
        HTTPException 403: If client doesn't belong to user
    """
    # Verify client exists and belongs to user
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    if client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this client's birth data"
        )

    birth_data_list = db.query(BirthData).filter(
        BirthData.client_id == client_id
    ).all()

    return birth_data_list


@router.get("/{birth_data_id}", response_model=BirthDataWithLocation)
async def get_birth_data(
    birth_data_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get birth data by ID

    Returns a specific birth data record with location information.

    Args:
        birth_data_id: Birth data ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Birth data with location information

    Raises:
        HTTPException 404: If birth data not found
        HTTPException 403: If birth data doesn't belong to user's client
    """
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Check ownership through client
    client = db.query(Client).filter(Client.id == birth_data.client_id).first()
    if not client or client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this birth data"
        )

    # Create response with additional fields
    birth_data_dict = {
        "id": birth_data.id,
        "client_id": birth_data.client_id,
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
        "is_time_known": birth_data.is_time_known,
        "data_quality": birth_data.data_quality
    }

    return birth_data_dict


@router.put("/{birth_data_id}", response_model=BirthDataResponse)
async def update_birth_data(
    birth_data_id: UUID,
    birth_data_update: BirthDataUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update birth data

    Updates a birth data record.

    Args:
        birth_data_id: Birth data ID
        birth_data_update: Birth data update data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated birth data

    Raises:
        HTTPException 404: If birth data not found
        HTTPException 403: If birth data doesn't belong to user's client
        HTTPException 400: If coordinates are invalid
    """
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Check ownership through client
    client = db.query(Client).filter(Client.id == birth_data.client_id).first()
    if not client or client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this birth data"
        )

    # Update fields
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

    # Validate coordinates
    if not birth_data.validate_coordinates():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid coordinates: latitude must be -90 to +90, longitude must be -180 to +180"
        )

    db.commit()
    db.refresh(birth_data)

    return birth_data


@router.delete("/{birth_data_id}", response_model=Message)
async def delete_birth_data(
    birth_data_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete birth data

    Permanently deletes a birth data record and all associated charts.

    Args:
        birth_data_id: Birth data ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Success message

    Raises:
        HTTPException 404: If birth data not found
        HTTPException 403: If birth data doesn't belong to user's client
    """
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Check ownership through client
    client = db.query(Client).filter(Client.id == birth_data.client_id).first()
    if not client or client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this birth data"
        )

    db.delete(birth_data)
    db.commit()

    return {
        "message": "Birth data deleted successfully",
        "detail": "Birth data and all associated charts have been permanently removed"
    }
