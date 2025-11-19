"""
User-related Pydantic schemas
"""
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
from uuid import UUID


# =============================================================================
# User Schemas
# =============================================================================

class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, max_length=255, description="User full name")
    business_name: Optional[str] = Field(None, max_length=255, description="Business name")


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=100, description="User password (min 8 characters)")

    @validator("password")
    def validate_password(cls, v):
        """Validate password strength"""
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in v):
            raise ValueError("Password must contain at least one lowercase letter")
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    email: Optional[EmailStr] = Field(None, description="User email address")
    full_name: Optional[str] = Field(None, max_length=255, description="User full name")
    business_name: Optional[str] = Field(None, max_length=255, description="Business name")
    password: Optional[str] = Field(None, min_length=8, max_length=100, description="New password")

    @validator("password")
    def validate_password(cls, v):
        """Validate password strength if provided"""
        if v is None:
            return v
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in v):
            raise ValueError("Password must contain at least one lowercase letter")
        return v


class UserResponse(UserBase):
    """Schema for user response (excludes password)"""
    id: UUID = Field(..., description="User ID")
    is_active: bool = Field(..., description="Whether user account is active")
    is_verified: bool = Field(..., description="Whether user email is verified")
    is_superuser: bool = Field(..., description="Whether user has admin privileges")
    subscription_tier: str = Field(..., description="User subscription tier (free, pro, professional)")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserWithToken(UserResponse):
    """User response with JWT token"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


# =============================================================================
# User Preferences Schemas
# =============================================================================

class UserPreferencesBase(BaseModel):
    """Base preferences schema"""
    default_house_system: Optional[str] = Field("placidus", description="Default house system")
    default_ayanamsa: Optional[str] = Field("lahiri", description="Default ayanamsa for Vedic calculations")
    default_zodiac: Optional[str] = Field("tropical", description="Default zodiac type (tropical or sidereal)")
    color_scheme: Optional[str] = Field("light", description="UI color scheme (light or dark)")
    aspect_orbs: Optional[Dict[str, float]] = Field(None, description="Custom aspect orbs in degrees")
    displayed_points: Optional[List[str]] = Field(None, description="Points to display in charts")


class UserPreferencesCreate(UserPreferencesBase):
    """Schema for creating user preferences"""
    pass


class UserPreferencesUpdate(BaseModel):
    """Schema for updating user preferences"""
    default_house_system: Optional[str] = Field(None, description="Default house system")
    default_ayanamsa: Optional[str] = Field(None, description="Default ayanamsa")
    default_zodiac: Optional[str] = Field(None, description="Default zodiac type")
    color_scheme: Optional[str] = Field(None, description="UI color scheme")
    aspect_orbs: Optional[Dict[str, float]] = Field(None, description="Custom aspect orbs")
    displayed_points: Optional[List[str]] = Field(None, description="Points to display")


class UserPreferencesResponse(UserPreferencesBase):
    """Schema for preferences response"""
    id: UUID = Field(..., description="Preferences ID")
    user_id: UUID = Field(..., description="User ID")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True
