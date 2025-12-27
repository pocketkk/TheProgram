"""
Interest and Reading History Pydantic schemas

Schemas for tracking reading behavior and interest profiles.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


# =============================================================================
# Reading History Schemas
# =============================================================================

class ReadingEventCreate(BaseModel):
    """Schema for recording a reading event"""
    article_id: str = Field(..., description="Unique article identifier")
    source_type: str = Field(..., description="Source type (rss, guardian, etc.)")
    title: str = Field(..., description="Article title")
    url: Optional[str] = Field(None, description="Article URL")
    source_id: Optional[str] = Field(None, description="Source-specific ID")
    content: Optional[str] = Field(None, description="Article content for topic extraction")
    time_spent_seconds: int = Field(0, ge=0, description="Time spent reading")
    scroll_depth_pct: float = Field(0.0, ge=0, le=100, description="Scroll depth percentage")
    clicked_links: bool = Field(False, description="Whether links were clicked")
    starred: bool = Field(False, description="Whether article was starred")
    feedback: Optional[str] = Field(None, description="User feedback: more or less")


class ReadingHistoryResponse(BaseModel):
    """Schema for reading history response"""
    id: UUID = Field(..., description="Record ID")
    article_id: str = Field(..., description="Article ID")
    source_type: str = Field(..., description="Source type")
    source_id: Optional[str] = Field(None, description="Source-specific ID")
    title: str = Field(..., description="Article title")
    url: Optional[str] = Field(None, description="Article URL")
    topics: List[str] = Field(default_factory=list, description="Extracted topics")
    time_spent_seconds: int = Field(..., description="Time spent reading")
    scroll_depth_pct: float = Field(..., description="Scroll depth")
    clicked_links: bool = Field(..., description="Links clicked")
    starred: bool = Field(..., description="Starred")
    feedback: Optional[str] = Field(None, description="User feedback")
    engagement_score: float = Field(..., description="Calculated engagement score")
    created_at: datetime = Field(..., description="Read timestamp")

    class Config:
        from_attributes = True


class ReadingHistoryListResponse(BaseModel):
    """Schema for reading history list"""
    readings: List[ReadingHistoryResponse] = Field(..., description="Reading records")
    total: int = Field(..., description="Total count")


class FeedbackUpdate(BaseModel):
    """Schema for updating feedback on a reading"""
    feedback: str = Field(..., description="Feedback: more or less")


# =============================================================================
# Interest Profile Schemas
# =============================================================================

class InterestProfileResponse(BaseModel):
    """Schema for interest profile response"""
    id: UUID = Field(..., description="Profile ID")
    topic: str = Field(..., description="Topic keyword")
    category: Optional[str] = Field(None, description="Topic category")
    score: float = Field(..., description="Raw interest score")
    decayed_score: float = Field(..., description="Score with time decay applied")
    article_count: int = Field(..., description="Articles read on topic")
    total_time_seconds: int = Field(..., description="Total reading time")
    positive_feedback: int = Field(..., description="Positive feedback count")
    negative_feedback: int = Field(..., description="Negative feedback count")
    last_seen: Optional[str] = Field(None, description="Last encounter timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True


class InterestProfileListResponse(BaseModel):
    """Schema for interest profiles list"""
    interests: List[InterestProfileResponse] = Field(..., description="Interest profiles")
    total: int = Field(..., description="Total count")


# =============================================================================
# Reading Stats Schemas
# =============================================================================

class ReadingStatsResponse(BaseModel):
    """Schema for reading statistics"""
    total_readings: int = Field(..., description="Total articles read")
    total_time_seconds: int = Field(..., description="Total reading time in seconds")
    total_time_hours: float = Field(..., description="Total reading time in hours")
    sources: Dict[str, int] = Field(..., description="Articles by source")
    starred_count: int = Field(..., description="Starred articles")
    positive_feedback: int = Field(..., description="Positive feedback count")
    negative_feedback: int = Field(..., description="Negative feedback count")
    topics_tracked: int = Field(..., description="Unique topics tracked")


# =============================================================================
# For You / Relevance Schemas
# =============================================================================

class ArticleForScoring(BaseModel):
    """Schema for an article to be scored"""
    id: str = Field(..., description="Article ID")
    title: str = Field(..., description="Article title")
    content: Optional[str] = Field(None, description="Article content")
    source: Optional[str] = Field(None, description="Article source")


class ScoredArticle(BaseModel):
    """Schema for a scored article"""
    id: str = Field(..., description="Article ID")
    title: str = Field(..., description="Article title")
    relevance_score: float = Field(..., description="Relevance score 0-1")
    matched_topics: List[str] = Field(..., description="Topics that matched interests")


class ForYouRequest(BaseModel):
    """Schema for requesting For You articles"""
    articles: List[ArticleForScoring] = Field(..., description="Articles to score")
    limit: int = Field(10, ge=1, le=50, description="Maximum results")
    min_score: float = Field(0.4, ge=0, le=1, description="Minimum relevance score")


class ForYouResponse(BaseModel):
    """Schema for For You response"""
    articles: List[ScoredArticle] = Field(..., description="Scored articles")
    total_scored: int = Field(..., description="Total articles scored")


class ScoreExplanation(BaseModel):
    """Schema for explaining a relevance score"""
    relevance_score: float = Field(..., description="Final score")
    matched_topics: List[str] = Field(..., description="Matched topics")
    topic_details: List[Dict[str, Any]] = Field(..., description="Topic score details")
    category_match: bool = Field(..., description="Whether category matched")
    recommendation: str = Field(..., description="Human-readable recommendation")
