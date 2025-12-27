"""
AI Insights Pydantic schemas

Schemas for AI-powered reading pattern analysis and recommendations.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# =============================================================================
# Interest Analysis Schemas
# =============================================================================

class InterestAnalysisResponse(BaseModel):
    """Response from interest analysis."""
    status: str = Field(..., description="Status: success, insufficient_data, error")
    message: Optional[str] = Field(None, description="Status message")
    insights: List[str] = Field(default_factory=list, description="Pattern observations")
    trends: List[str] = Field(default_factory=list, description="Emerging trends")
    suggestions: List[str] = Field(default_factory=list, description="Content suggestions")
    reading_style: Optional[str] = Field(None, description="Reader style summary")
    focus_areas: List[str] = Field(default_factory=list, description="Top focus areas")
    analyzed_at: Optional[str] = Field(None, description="Analysis timestamp")


# =============================================================================
# Feed Recommendation Schemas
# =============================================================================

class RecommendedFeed(BaseModel):
    """A recommended RSS feed."""
    name: str = Field(..., description="Feed name")
    url: str = Field(..., description="RSS feed URL")
    reason: str = Field(..., description="Why this feed is recommended")
    topics: List[str] = Field(default_factory=list, description="Matching topics")


class ExploreTopic(BaseModel):
    """A topic to explore."""
    topic: str = Field(..., description="Topic name")
    reason: str = Field(..., description="Why this might interest the reader")
    search_terms: List[str] = Field(default_factory=list, description="Search keywords")


class FeedRecommendationsResponse(BaseModel):
    """Response from feed recommendations."""
    status: str = Field(..., description="Status: success, insufficient_data, error")
    message: Optional[str] = Field(None, description="Status message")
    recommended_feeds: List[RecommendedFeed] = Field(
        default_factory=list,
        description="Recommended RSS feeds"
    )
    explore_topics: List[ExploreTopic] = Field(
        default_factory=list,
        description="Topics to explore"
    )
    diversify_suggestions: List[str] = Field(
        default_factory=list,
        description="Suggestions for diversifying reading"
    )
    based_on_topics: List[str] = Field(
        default_factory=list,
        description="Topics used for recommendations"
    )


# =============================================================================
# Content Discovery Schemas
# =============================================================================

class DiscoveryRequest(BaseModel):
    """Request for content discovery suggestions."""
    topics: List[str] = Field(..., min_length=1, description="Current article topics")


class DiscoverySuggestionsResponse(BaseModel):
    """Response from content discovery."""
    status: str = Field(..., description="Status: success, error")
    message: Optional[str] = Field(None, description="Status message")
    related_searches: List[str] = Field(
        default_factory=list,
        description="Search queries for related content"
    )
    deeper_dive: List[str] = Field(
        default_factory=list,
        description="Subtopics to explore"
    )
    connections: List[str] = Field(
        default_factory=list,
        description="Connections to other interests"
    )
    question_to_explore: Optional[str] = Field(
        None,
        description="An interesting question to explore"
    )


# =============================================================================
# Privacy Info Schema
# =============================================================================

class PrivacyInfoResponse(BaseModel):
    """Information about what data is sent for AI analysis."""
    data_sent: List[str] = Field(
        ...,
        description="Types of data sent to AI"
    )
    data_not_sent: List[str] = Field(
        ...,
        description="Types of data NOT sent to AI"
    )
    explanation: str = Field(
        ...,
        description="Human-readable privacy explanation"
    )
