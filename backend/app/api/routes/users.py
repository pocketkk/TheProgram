"""
User management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.dependencies import get_current_user, get_current_superuser
from app.models import User, UserPreferences
from app.schemas import (
    UserResponse,
    UserUpdate,
    UserPreferencesResponse,
    UserPreferencesCreate,
    UserPreferencesUpdate,
    Message,
)

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information

    Returns the authenticated user's profile information.

    Args:
        current_user: Current authenticated user

    Returns:
        Current user information
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user information

    Update the authenticated user's profile information.

    Args:
        user_update: User update data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated user information

    Raises:
        HTTPException 400: If email already exists
    """
    # Check if email is being changed and if it already exists
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email

    # Update other fields
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    if user_update.business_name is not None:
        current_user.business_name = user_update.business_name

    # Update password if provided
    if user_update.password:
        current_user.password_hash = get_password_hash(user_update.password)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me", response_model=Message)
async def delete_current_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete current user account

    Permanently deletes the authenticated user's account and all associated data.

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        Success message
    """
    db.delete(current_user)
    db.commit()

    return {
        "message": "User account deleted successfully",
        "detail": "All associated data has been permanently removed"
    }


# =============================================================================
# User Preferences Endpoints
# =============================================================================

@router.get("/me/preferences", response_model=UserPreferencesResponse)
async def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's preferences

    Returns the authenticated user's chart calculation preferences.

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        User preferences

    Raises:
        HTTPException 404: If preferences not found
    """
    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()

    if not preferences:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User preferences not found"
        )

    return preferences


@router.put("/me/preferences", response_model=UserPreferencesResponse)
async def update_user_preferences(
    preferences_update: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's preferences

    Update the authenticated user's chart calculation preferences.

    Args:
        preferences_update: Preferences update data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated preferences

    Raises:
        HTTPException 404: If preferences not found
    """
    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == current_user.id
    ).first()

    if not preferences:
        # Create preferences if they don't exist
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)

    # Update fields
    if preferences_update.default_house_system is not None:
        preferences.default_house_system = preferences_update.default_house_system

    if preferences_update.default_ayanamsa is not None:
        preferences.default_ayanamsa = preferences_update.default_ayanamsa

    if preferences_update.default_zodiac is not None:
        preferences.default_zodiac = preferences_update.default_zodiac

    if preferences_update.color_scheme is not None:
        preferences.color_scheme = preferences_update.color_scheme

    if preferences_update.aspect_orbs is not None:
        preferences.aspect_orbs = preferences_update.aspect_orbs

    if preferences_update.displayed_points is not None:
        preferences.displayed_points = preferences_update.displayed_points

    db.commit()
    db.refresh(preferences)

    return preferences


# =============================================================================
# Admin Endpoints (Superuser only)
# =============================================================================

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """
    List all users (admin only)

    Returns a list of all users with pagination.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        current_user: Current superuser

    Returns:
        List of users
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """
    Get user by ID (admin only)

    Returns a specific user's information.

    Args:
        user_id: User ID
        db: Database session
        current_user: Current superuser

    Returns:
        User information

    Raises:
        HTTPException 404: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.delete("/{user_id}", response_model=Message)
async def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """
    Delete user by ID (admin only)

    Permanently deletes a user account and all associated data.

    Args:
        user_id: User ID
        db: Database session
        current_user: Current superuser

    Returns:
        Success message

    Raises:
        HTTPException 404: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully",
        "detail": f"User {user_id} and all associated data have been permanently removed"
    }
