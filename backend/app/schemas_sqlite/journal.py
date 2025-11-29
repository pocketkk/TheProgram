"""
Journal-related Pydantic schemas (single-user mode)

Schemas for journal entries with tags, mood, and AI context.
Part of Phase 2: Journal System.
"""
from typing import Optional, List, Dict, Any
import json
from pydantic import BaseModel, Field, validator
from datetime import datetime, date
from uuid import UUID


class JournalEntryBase(BaseModel):
    """Base journal entry schema with common fields"""
    entry_date: date = Field(..., description="Date of the entry")
    title: Optional[str] = Field(None, max_length=255, description="Entry title")
    content: str = Field(..., min_length=1, description="Journal entry content (markdown supported)")
    tags: Optional[List[str]] = Field(default_factory=list, description="List of tags")
    mood: Optional[str] = Field(None, max_length=50, description="Mood indicator")
    mood_score: Optional[int] = Field(None, ge=1, le=10, description="Mood score 1-10")

    @validator("tags", pre=True, always=True)
    def ensure_tags_list(cls, v):
        """Ensure tags is a list"""
        if v is None:
            return []
        return v

    @validator("mood")
    def validate_mood(cls, v):
        """Validate mood indicator"""
        if v is None:
            return v
        valid_moods = [
            "reflective", "anxious", "inspired", "peaceful", "curious",
            "melancholic", "joyful", "contemplative", "energized", "confused",
            "grateful", "frustrated", "hopeful", "neutral", "overwhelmed"
        ]
        if v.lower() not in valid_moods:
            # Allow custom moods but normalize
            return v.lower()
        return v.lower()


class JournalEntryCreate(JournalEntryBase):
    """Schema for creating a new journal entry"""
    birth_data_id: Optional[UUID] = Field(None, description="Optional link to birth data")
    chart_id: Optional[UUID] = Field(None, description="Optional link to specific chart")
    transit_context: Optional[Dict[str, Any]] = Field(None, description="Transit snapshot at entry time")


class JournalEntryUpdate(BaseModel):
    """Schema for updating a journal entry"""
    entry_date: Optional[date] = Field(None, description="Date of the entry")
    title: Optional[str] = Field(None, max_length=255, description="Entry title")
    content: Optional[str] = Field(None, min_length=1, description="Journal entry content")
    tags: Optional[List[str]] = Field(None, description="List of tags")
    mood: Optional[str] = Field(None, max_length=50, description="Mood indicator")
    mood_score: Optional[int] = Field(None, ge=1, le=10, description="Mood score 1-10")
    birth_data_id: Optional[UUID] = Field(None, description="Link to birth data")
    chart_id: Optional[UUID] = Field(None, description="Link to specific chart")


class JournalEntryResponse(JournalEntryBase):
    """Schema for journal entry response"""
    id: UUID = Field(..., description="Entry ID")
    birth_data_id: Optional[UUID] = Field(None, description="Birth data ID")
    chart_id: Optional[UUID] = Field(None, description="Chart ID")
    transit_context: Optional[Dict[str, Any]] = Field(None, description="Transit snapshot")
    ai_summary: Optional[str] = Field(None, description="AI-generated summary")
    preview: str = Field(..., description="Content preview (first 150 chars)")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    @validator("tags", pre=True, always=True)
    def parse_tags_json(cls, v):
        """Parse tags from JSON string if needed (SQLite stores as TEXT)"""
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v

    @validator("transit_context", pre=True, always=True)
    def parse_transit_context_json(cls, v):
        """Parse transit_context from JSON string if needed"""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v

    class Config:
        from_attributes = True


class JournalEntryWithContext(JournalEntryResponse):
    """Journal entry with additional context for display"""
    chart_name: Optional[str] = Field(None, description="Name of linked chart")
    birth_data_label: Optional[str] = Field(None, description="Label for linked birth data")


# =============================================================================
# Journal Search and Filter Schemas
# =============================================================================

class JournalSearchRequest(BaseModel):
    """Schema for searching journal entries"""
    query: Optional[str] = Field(None, description="Full-text search query")
    tags: Optional[List[str]] = Field(None, description="Filter by tags (any match)")
    mood: Optional[str] = Field(None, description="Filter by mood")
    mood_score_min: Optional[int] = Field(None, ge=1, le=10, description="Minimum mood score")
    mood_score_max: Optional[int] = Field(None, ge=1, le=10, description="Maximum mood score")
    date_from: Optional[date] = Field(None, description="Start date filter")
    date_to: Optional[date] = Field(None, description="End date filter")
    birth_data_id: Optional[UUID] = Field(None, description="Filter by birth data")
    chart_id: Optional[UUID] = Field(None, description="Filter by chart")
    limit: int = Field(50, ge=1, le=200, description="Maximum results")
    offset: int = Field(0, ge=0, description="Offset for pagination")


class JournalSearchResponse(BaseModel):
    """Schema for journal search results"""
    entries: List[JournalEntryResponse] = Field(..., description="Matching entries")
    total: int = Field(..., description="Total matching entries")
    limit: int = Field(..., description="Results limit")
    offset: int = Field(..., description="Results offset")


# =============================================================================
# AI Integration Schemas
# =============================================================================

class GenerateJournalSummaryRequest(BaseModel):
    """Schema for requesting AI summary of journal entry"""
    entry_id: UUID = Field(..., description="Journal entry ID to summarize")
    include_transit_context: bool = Field(True, description="Include transit context in analysis")


class GenerateJournalSummaryResponse(BaseModel):
    """Schema for AI summary response"""
    entry_id: UUID = Field(..., description="Journal entry ID")
    summary: str = Field(..., description="AI-generated summary")
    themes: List[str] = Field(..., description="Identified themes")
    suggested_tags: List[str] = Field(..., description="Suggested additional tags")


class JournalInsightsRequest(BaseModel):
    """Schema for requesting AI insights across journal entries"""
    date_from: Optional[date] = Field(None, description="Start date for analysis")
    date_to: Optional[date] = Field(None, description="End date for analysis")
    birth_data_id: Optional[UUID] = Field(None, description="Focus on specific birth data")
    focus_tags: Optional[List[str]] = Field(None, description="Focus on specific tags")


class JournalInsightsResponse(BaseModel):
    """Schema for journal insights response"""
    patterns: List[Dict[str, Any]] = Field(..., description="Identified patterns")
    mood_trends: Dict[str, Any] = Field(..., description="Mood trend analysis")
    recurring_themes: List[str] = Field(..., description="Recurring themes")
    transit_correlations: List[Dict[str, Any]] = Field(..., description="Transit-mood correlations")
    summary: str = Field(..., description="Overall insights summary")
