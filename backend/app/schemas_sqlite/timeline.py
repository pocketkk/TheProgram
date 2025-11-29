"""
Timeline-related Pydantic schemas (single-user mode)

Schemas for user events, transit context, and timeline visualization.
Part of Phase 2: Transit Timeline.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any, TYPE_CHECKING
from pydantic import BaseModel, Field, validator
from datetime import datetime, date
from uuid import UUID


# =============================================================================
# User Event Schemas
# =============================================================================

class UserEventBase(BaseModel):
    """Base user event schema with common fields"""
    event_date: date = Field(..., description="Date of the event")
    event_time: Optional[str] = Field(None, description="Optional time (HH:MM:SS)")
    title: str = Field(..., max_length=255, description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    category: Optional[str] = Field(None, max_length=50, description="Event category")
    importance: str = Field("moderate", description="Importance level")
    tags: Optional[List[str]] = Field(default_factory=list, description="Event tags")
    is_recurring: bool = Field(False, description="Is this a recurring event")
    recurrence_pattern: Optional[str] = Field(None, description="Recurrence pattern")

    @validator("category")
    def validate_category(cls, v):
        """Validate event category"""
        if v is None:
            return v
        valid_categories = [
            "career", "relationship", "health", "spiritual", "travel",
            "financial", "creative", "education", "family", "personal"
        ]
        if v.lower() not in valid_categories:
            return v.lower()  # Allow custom categories
        return v.lower()

    @validator("importance")
    def validate_importance(cls, v):
        """Validate importance level"""
        valid_levels = ["minor", "moderate", "major", "transformative"]
        if v.lower() not in valid_levels:
            raise ValueError(f"Importance must be one of: {', '.join(valid_levels)}")
        return v.lower()

    @validator("recurrence_pattern")
    def validate_recurrence(cls, v, values):
        """Validate recurrence pattern"""
        if v is None:
            return v
        valid_patterns = ["daily", "weekly", "monthly", "yearly"]
        if v.lower() not in valid_patterns:
            raise ValueError(f"Recurrence must be one of: {', '.join(valid_patterns)}")
        return v.lower()


class UserEventCreate(UserEventBase):
    """Schema for creating a new user event"""
    birth_data_id: UUID = Field(..., description="Birth data for transit calculations")


class UserEventUpdate(BaseModel):
    """Schema for updating a user event"""
    event_date: Optional[date] = Field(None, description="Date of the event")
    event_time: Optional[str] = Field(None, description="Time of the event")
    title: Optional[str] = Field(None, max_length=255, description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    category: Optional[str] = Field(None, max_length=50, description="Event category")
    importance: Optional[str] = Field(None, description="Importance level")
    tags: Optional[List[str]] = Field(None, description="Event tags")
    is_recurring: Optional[bool] = Field(None, description="Is recurring")
    recurrence_pattern: Optional[str] = Field(None, description="Recurrence pattern")


class UserEventResponse(UserEventBase):
    """Schema for user event response"""
    id: UUID = Field(..., description="Event ID")
    birth_data_id: UUID = Field(..., description="Birth data ID")
    transit_analysis: Optional[str] = Field(None, description="AI transit analysis")
    datetime_string: str = Field(..., description="Combined date/time string")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class UserEventWithTransitsData(BaseModel):
    """User event data with transit context included (no inheritance to avoid circular refs)"""
    # Core event fields
    id: UUID = Field(..., description="Event ID")
    birth_data_id: UUID = Field(..., description="Birth data ID")
    event_date: date = Field(..., description="Date of the event")
    event_time: Optional[str] = Field(None, description="Optional time (HH:MM:SS)")
    title: str = Field(..., description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    category: Optional[str] = Field(None, description="Event category")
    importance: str = Field("moderate", description="Importance level")
    tags: Optional[List[str]] = Field(default_factory=list, description="Event tags")
    transit_analysis: Optional[str] = Field(None, description="AI transit analysis")
    transit_context: Optional[Dict[str, Any]] = Field(None, description="Transit context data")

    class Config:
        from_attributes = True


# =============================================================================
# Transit Context Schemas
# =============================================================================

class TransitContextBase(BaseModel):
    """Base transit context schema"""
    context_date: date = Field(..., description="Date for this context")


class TransitContextCreate(TransitContextBase):
    """Schema for creating transit context"""
    birth_data_id: UUID = Field(..., description="Birth data for natal positions")
    user_event_id: Optional[UUID] = Field(None, description="Optional linked event")
    transit_data: Optional[Dict[str, Any]] = Field(None, description="Calculated transits")
    significant_transits: Optional[List[Dict[str, Any]]] = Field(None, description="Significant transits")


class TransitContextUpdate(BaseModel):
    """Schema for updating transit context"""
    transit_data: Optional[Dict[str, Any]] = Field(None, description="Transit data")
    significant_transits: Optional[List[Dict[str, Any]]] = Field(None, description="Significant transits")
    historical_context: Optional[str] = Field(None, description="Historical context")
    personal_context: Optional[str] = Field(None, description="Personal interpretation")
    themes: Optional[List[str]] = Field(None, description="Identified themes")


class TransitContextResponse(TransitContextBase):
    """Schema for transit context response"""
    id: UUID = Field(..., description="Context ID")
    birth_data_id: UUID = Field(..., description="Birth data ID")
    user_event_id: Optional[UUID] = Field(None, description="Linked event ID")
    transit_data: Optional[Dict[str, Any]] = Field(None, description="Transit positions and aspects")
    significant_transits: Optional[List[Dict[str, Any]]] = Field(None, description="Significant transits")
    historical_context: Optional[str] = Field(None, description="Historical astrological context")
    personal_context: Optional[str] = Field(None, description="Personal interpretation")
    themes: Optional[List[str]] = Field(None, description="Identified themes")
    has_significant_transits: bool = Field(..., description="Whether significant transits exist")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


# =============================================================================
# Timeline View Schemas
# =============================================================================

class TimelineRangeRequest(BaseModel):
    """Schema for requesting timeline data for a date range"""
    birth_data_id: UUID = Field(..., description="Birth data ID")
    start_date: date = Field(..., description="Start of timeline range")
    end_date: date = Field(..., description="End of timeline range")
    include_events: bool = Field(True, description="Include user events")
    include_transits: bool = Field(True, description="Include transit contexts")
    transit_types: Optional[List[str]] = Field(None, description="Filter specific transit types")
    event_categories: Optional[List[str]] = Field(None, description="Filter event categories")


class TimelineDataPoint(BaseModel):
    """A single point on the timeline"""
    point_date: date = Field(..., description="Date of the data point", alias="date")
    events: List[Dict[str, Any]] = Field(default_factory=list, description="Events on this date")
    transit_context: Optional[Dict[str, Any]] = Field(None, description="Transit context")
    significant_transits: List[Dict[str, Any]] = Field(default_factory=list, description="Significant transits")
    lunar_phase: Optional[str] = Field(None, description="Moon phase")

    class Config:
        populate_by_name = True


class TimelineRangeResponse(BaseModel):
    """Schema for timeline data response"""
    birth_data_id: UUID = Field(..., description="Birth data ID")
    start_date: date = Field(..., description="Range start")
    end_date: date = Field(..., description="Range end")
    data_points: List[TimelineDataPoint] = Field(..., description="Timeline data points")
    upcoming_significant_transits: List[Dict[str, Any]] = Field(..., description="Upcoming major transits")
    active_long_term_transits: List[Dict[str, Any]] = Field(..., description="Active outer planet transits")


# =============================================================================
# AI Context Generation Schemas
# =============================================================================

class GenerateTransitContextRequest(BaseModel):
    """Schema for requesting AI-generated transit context"""
    birth_data_id: UUID = Field(..., description="Birth data ID")
    context_date: date = Field(..., description="Date for context")
    user_event_id: Optional[UUID] = Field(None, description="Optional linked event")
    include_historical: bool = Field(True, description="Include historical context")
    include_personal: bool = Field(True, description="Include personal interpretation")


class GenerateTransitContextResponse(BaseModel):
    """Schema for AI-generated context response"""
    context_id: UUID = Field(..., description="Created/updated context ID")
    transit_data: Dict[str, Any] = Field(..., description="Calculated transit data")
    significant_transits: List[Dict[str, Any]] = Field(..., description="Significant transits found")
    historical_context: Optional[str] = Field(None, description="AI historical context")
    personal_context: Optional[str] = Field(None, description="AI personal interpretation")
    themes: List[str] = Field(..., description="Identified themes")


class TimelineSummaryRequest(BaseModel):
    """Schema for requesting AI summary of timeline period"""
    birth_data_id: UUID = Field(..., description="Birth data ID")
    start_date: date = Field(..., description="Period start")
    end_date: date = Field(..., description="Period end")
    focus_areas: Optional[List[str]] = Field(None, description="Areas to focus on")


class TimelineSummaryResponse(BaseModel):
    """Schema for AI timeline summary"""
    period_start: date = Field(..., description="Period start")
    period_end: date = Field(..., description="Period end")
    summary: str = Field(..., description="AI summary of the period")
    key_transits: List[Dict[str, Any]] = Field(..., description="Key transits in period")
    themes: List[str] = Field(..., description="Major themes")
    event_correlations: List[Dict[str, Any]] = Field(..., description="Event-transit correlations")
    recommendations: List[str] = Field(..., description="AI recommendations")


# Alias for backwards compatibility
UserEventWithTransits = UserEventWithTransitsData
