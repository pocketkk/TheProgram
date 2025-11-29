"""
Birth data-related Pydantic schemas (single-user mode)

Same as multi-user schemas - birth data already doesn't have user_id
"""
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import date, time, datetime
from decimal import Decimal
from uuid import UUID


class BirthDataBase(BaseModel):
    """Base birth data schema with common fields"""
    birth_date: date = Field(..., description="Birth date")
    birth_time: Optional[time] = Field(None, description="Birth time (if known)")
    time_unknown: bool = Field(False, description="Flag indicating if birth time is unknown")
    latitude: Decimal = Field(..., ge=-90, le=90, description="Latitude (-90 to +90)")
    longitude: Decimal = Field(..., ge=-180, le=180, description="Longitude (-180 to +180)")
    timezone: str = Field(..., max_length=100, description="IANA timezone name (e.g., America/New_York)")
    utc_offset: Optional[int] = Field(None, description="UTC offset in minutes")
    city: Optional[str] = Field(None, max_length=255, description="City name")
    state_province: Optional[str] = Field(None, max_length=255, description="State or province")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    rodden_rating: Optional[str] = Field(None, max_length=2, description="Rodden rating (AA, A, B, C, DD, X)")
    gender: Optional[str] = Field(None, max_length=20, description="Gender")

    @validator("rodden_rating")
    def validate_rodden_rating(cls, v):
        """Validate Rodden rating is one of the valid values"""
        if v is None:
            return v
        valid_ratings = ["AA", "A", "B", "C", "DD", "X"]
        if v.upper() not in valid_ratings:
            raise ValueError(f"Rodden rating must be one of: {', '.join(valid_ratings)}")
        return v.upper()

    @validator("time_unknown")
    def validate_time_consistency(cls, v, values):
        """Ensure time_unknown is consistent with birth_time"""
        if v and "birth_time" in values and values["birth_time"] is not None:
            raise ValueError("Cannot set time_unknown=True when birth_time is provided")
        return v


class BirthDataCreate(BirthDataBase):
    """Schema for creating new birth data"""
    pass


class BirthDataUpdate(BaseModel):
    """Schema for updating birth data"""
    birth_date: Optional[date] = Field(None, description="Birth date")
    birth_time: Optional[time] = Field(None, description="Birth time")
    time_unknown: Optional[bool] = Field(None, description="Flag indicating if birth time is unknown")
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90, description="Latitude")
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180, description="Longitude")
    timezone: Optional[str] = Field(None, max_length=100, description="IANA timezone name")
    utc_offset: Optional[int] = Field(None, description="UTC offset in minutes")
    city: Optional[str] = Field(None, max_length=255, description="City name")
    state_province: Optional[str] = Field(None, max_length=255, description="State or province")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    rodden_rating: Optional[str] = Field(None, max_length=2, description="Rodden rating")
    gender: Optional[str] = Field(None, max_length=20, description="Gender")

    @validator("rodden_rating")
    def validate_rodden_rating(cls, v):
        """Validate Rodden rating"""
        if v is None:
            return v
        valid_ratings = ["AA", "A", "B", "C", "DD", "X"]
        if v.upper() not in valid_ratings:
            raise ValueError(f"Rodden rating must be one of: {', '.join(valid_ratings)}")
        return v.upper()


class BirthDataResponse(BirthDataBase):
    """Schema for birth data response"""
    id: UUID = Field(..., description="Birth data ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class BirthDataWithLocation(BirthDataResponse):
    """Birth data response with formatted location string"""
    location_string: str = Field(..., description="Formatted location string")
    has_time: bool = Field(..., description="Whether birth time is known")
    data_quality: str = Field(..., description="Human-readable data quality description")
