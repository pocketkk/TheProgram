"""
Palm Reading Pydantic schemas

Request and response schemas for palm reading API endpoints.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime


class PalmReadingRequest(BaseModel):
    """Request schema for palm reading analysis"""
    hand_type: str = Field(
        default="both",
        description="Type of hand(s) in the image: 'left', 'right', or 'both'"
    )
    additional_context: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional additional context or questions from the user"
    )


class PalmReadingSections(BaseModel):
    """Schema for parsed palm reading sections"""
    hand_shape: Optional[str] = Field(default=None, description="Hand shape and element analysis")
    major_lines: Optional[str] = Field(default=None, description="Overview of major lines")
    heart_line: Optional[str] = Field(default=None, description="Heart line analysis")
    head_line: Optional[str] = Field(default=None, description="Head line analysis")
    life_line: Optional[str] = Field(default=None, description="Life line analysis")
    fate_line: Optional[str] = Field(default=None, description="Fate line analysis")
    mounts: Optional[str] = Field(default=None, description="Mounts (planetary hills) analysis")
    fingers: Optional[str] = Field(default=None, description="Finger analysis")
    special_markings: Optional[str] = Field(default=None, description="Special markings analysis")
    astrological_synthesis: Optional[str] = Field(default=None, description="Astrological synthesis")
    guidance: Optional[str] = Field(default=None, description="Guidance and potential")
    introduction: Optional[str] = Field(default=None, description="Introduction section")


class TokenUsage(BaseModel):
    """Schema for AI token usage"""
    input: int = Field(..., description="Input tokens used")
    output: int = Field(..., description="Output tokens used")


class PalmReadingResponse(BaseModel):
    """Response schema for palm reading analysis"""
    success: bool = Field(..., description="Whether the analysis was successful")
    full_reading: Optional[str] = Field(default=None, description="Complete palm reading text")
    sections: Optional[Dict[str, str]] = Field(default=None, description="Parsed reading sections")
    hand_type: Optional[str] = Field(default=None, description="Type of hand analyzed")
    model_used: Optional[str] = Field(default=None, description="AI model used for analysis")
    tokens_used: Optional[TokenUsage] = Field(default=None, description="Token usage statistics")
    error: Optional[str] = Field(default=None, description="Error message if unsuccessful")


class QuickInsightResponse(BaseModel):
    """Response schema for quick palm insight"""
    success: bool = Field(..., description="Whether the analysis was successful")
    insight: Optional[str] = Field(default=None, description="Quick insight text")
    model_used: Optional[str] = Field(default=None, description="AI model used")
    error: Optional[str] = Field(default=None, description="Error message if unsuccessful")


# Database model schemas

class PalmReadingBase(BaseModel):
    """Base schema for palm reading database record"""
    hand_type: str = Field(..., max_length=20, description="Type of hand analyzed")
    full_reading: str = Field(..., description="Complete palm reading text")
    sections_json: Optional[str] = Field(default=None, description="JSON string of parsed sections")
    image_path: Optional[str] = Field(default=None, max_length=500, description="Path to stored palm image")
    additional_context: Optional[str] = Field(default=None, max_length=500, description="User-provided context")
    model_used: Optional[str] = Field(default=None, max_length=100, description="AI model used")
    tokens_input: Optional[int] = Field(default=None, description="Input tokens used")
    tokens_output: Optional[int] = Field(default=None, description="Output tokens used")


class PalmReadingCreate(PalmReadingBase):
    """Schema for creating a palm reading record"""
    pass


class PalmReadingUpdate(BaseModel):
    """Schema for updating a palm reading record"""
    notes: Optional[str] = Field(default=None, description="User notes on the reading")
    is_favorite: Optional[bool] = Field(default=None, description="Mark as favorite")


class PalmReadingRecord(PalmReadingBase):
    """Schema for palm reading database response"""
    id: str = Field(..., description="Palm reading ID")
    notes: Optional[str] = Field(default=None, description="User notes")
    is_favorite: bool = Field(default=False, description="Whether marked as favorite")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class PalmReadingListResponse(BaseModel):
    """Response schema for listing palm readings"""
    readings: List[PalmReadingRecord] = Field(..., description="List of palm readings")
    total: int = Field(..., description="Total number of readings")
