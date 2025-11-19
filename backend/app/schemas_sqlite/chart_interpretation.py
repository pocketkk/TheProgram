"""
ChartInterpretation-related Pydantic schemas (single-user mode)

Same as multi-user schemas - interpretations already don't have user_id
"""
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID


class InterpretationSection(BaseModel):
    """Schema for a section of an interpretation"""
    title: str = Field(..., description="Section title")
    content: str = Field(..., description="Section content")


class ChartInterpretationBase(BaseModel):
    """Base chart interpretation schema with common fields"""
    element_type: str = Field(..., max_length=50, description="Element type (planet, house, aspect, pattern)")
    element_key: str = Field(..., max_length=255, description="Element identifier")
    ai_description: str = Field(..., description="AI-generated description text")
    ai_model: Optional[str] = Field(None, max_length=100, description="AI model used for generation")
    ai_prompt_version: Optional[str] = Field(None, max_length=50, description="Prompt template version")
    is_approved: Optional[str] = Field("pending", max_length=20, description="Approval status")

    @validator("element_type")
    def validate_element_type(cls, v):
        """Validate element type"""
        valid_types = ["planet", "house", "aspect", "pattern"]
        if v.lower() not in valid_types:
            raise ValueError(f"Element type must be one of: {', '.join(valid_types)}")
        return v.lower()

    @validator("is_approved")
    def validate_approval_status(cls, v):
        """Validate approval status"""
        if v is None:
            return "pending"
        valid_statuses = ["pending", "approved", "rejected", "needs_review"]
        if v.lower() not in valid_statuses:
            raise ValueError(f"Approval status must be one of: {', '.join(valid_statuses)}")
        return v.lower()


class ChartInterpretationCreate(ChartInterpretationBase):
    """Schema for creating a new chart interpretation"""
    chart_id: UUID = Field(..., description="Chart ID this interpretation belongs to")
    version: Optional[int] = Field(1, description="Version number")


class ChartInterpretationUpdate(BaseModel):
    """Schema for updating chart interpretation"""
    ai_description: Optional[str] = Field(None, description="Updated description text")
    is_approved: Optional[str] = Field(None, max_length=20, description="Updated approval status")


class ChartInterpretationResponse(ChartInterpretationBase):
    """Schema for chart interpretation response"""
    id: UUID = Field(..., description="Interpretation ID")
    chart_id: UUID = Field(..., description="Chart ID")
    version: int = Field(..., description="Version number")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class GenerateInterpretationRequest(BaseModel):
    """Request schema for generating AI interpretations"""
    element_types: Optional[list[str]] = Field(
        None,
        description="Specific element types to generate (if None, generates all)"
    )
    regenerate_existing: bool = Field(
        False,
        description="Whether to regenerate existing interpretations"
    )
    ai_model: Optional[str] = Field(
        "claude-haiku-4-5-20251001",
        description="AI model to use for generation"
    )

    @validator("element_types")
    def validate_element_types(cls, v):
        """Validate element types list"""
        if v is None:
            return v
        valid_types = ["planet", "house", "aspect", "pattern"]
        for element_type in v:
            if element_type.lower() not in valid_types:
                raise ValueError(f"Each element type must be one of: {', '.join(valid_types)}")
        return [et.lower() for et in v]


class GenerateInterpretationResponse(BaseModel):
    """Response schema for generation request"""
    chart_id: UUID = Field(..., description="Chart ID")
    generated_count: int = Field(..., description="Number of interpretations generated")
    skipped_count: int = Field(0, description="Number of interpretations skipped (already exist)")
    interpretations: list[ChartInterpretationResponse] = Field(..., description="Generated interpretations")
    errors: Optional[list[str]] = Field(None, description="Any errors encountered during generation")
