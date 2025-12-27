"""
RSS feed Pydantic schemas

Schemas for RSS feed subscriptions and cached articles.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import Optional, List
import json
from pydantic import BaseModel, Field, validator, HttpUrl
from datetime import datetime
from uuid import UUID


# =============================================================================
# RSS Feed Schemas
# =============================================================================

class RssFeedBase(BaseModel):
    """Base RSS feed schema"""
    url: str = Field(..., description="RSS/Atom feed URL")
    title: str = Field(..., max_length=255, description="Feed title")
    category: Optional[str] = Field(None, max_length=50, description="User-assigned category")


class RssFeedCreate(RssFeedBase):
    """Schema for creating a new RSS feed subscription"""
    description: Optional[str] = Field(None, description="Feed description")
    site_url: Optional[str] = Field(None, description="Main website URL")
    icon_url: Optional[str] = Field(None, description="Feed icon URL")
    fetch_interval_minutes: int = Field(60, ge=5, le=1440, description="Refresh interval (5-1440 minutes)")


class RssFeedUpdate(BaseModel):
    """Schema for updating an RSS feed"""
    title: Optional[str] = Field(None, max_length=255, description="Feed title")
    category: Optional[str] = Field(None, max_length=50, description="Category")
    description: Optional[str] = Field(None, description="Feed description")
    icon_url: Optional[str] = Field(None, description="Feed icon URL")
    is_active: Optional[bool] = Field(None, description="Whether feed is active")
    fetch_interval_minutes: Optional[int] = Field(None, ge=5, le=1440, description="Refresh interval")


class RssFeedResponse(RssFeedBase):
    """Schema for RSS feed response"""
    id: UUID = Field(..., description="Feed ID")
    description: Optional[str] = Field(None, description="Feed description")
    site_url: Optional[str] = Field(None, description="Main website URL")
    icon_url: Optional[str] = Field(None, description="Feed icon URL")
    is_active: bool = Field(..., description="Whether feed is active")
    fetch_interval_minutes: int = Field(..., description="Refresh interval")
    last_fetched_at: Optional[datetime] = Field(None, description="Last fetch time")
    last_error: Optional[str] = Field(None, description="Last error message")
    error_count: int = Field(..., description="Consecutive error count")
    article_count: int = Field(..., description="Cached article count")
    is_healthy: bool = Field(..., description="Whether feed is healthy")
    needs_refresh: bool = Field(..., description="Whether feed needs refresh")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class RssFeedListResponse(BaseModel):
    """Schema for list of RSS feeds"""
    feeds: List[RssFeedResponse] = Field(..., description="List of feeds")
    total: int = Field(..., description="Total feed count")


class RssFeedDiscovery(BaseModel):
    """Schema for feed discovery from URL"""
    url: str = Field(..., description="Discovered feed URL")
    title: str = Field(..., description="Feed title")
    description: Optional[str] = Field(None, description="Feed description")
    site_url: Optional[str] = Field(None, description="Main website URL")
    icon_url: Optional[str] = Field(None, description="Feed icon URL")


# =============================================================================
# RSS Article Schemas
# =============================================================================

class RssArticleBase(BaseModel):
    """Base RSS article schema"""
    title: str = Field(..., description="Article title")
    url: str = Field(..., description="Article URL")
    summary: Optional[str] = Field(None, description="Article summary")


class RssArticleResponse(RssArticleBase):
    """Schema for RSS article response"""
    id: UUID = Field(..., description="Article ID")
    feed_id: UUID = Field(..., description="Parent feed ID")
    guid: str = Field(..., description="Article GUID")
    author: Optional[str] = Field(None, description="Article author")
    content: Optional[str] = Field(None, description="Full article content")
    image_url: Optional[str] = Field(None, description="Featured image URL")
    published_at: Optional[datetime] = Field(None, description="Publication date")
    categories: List[str] = Field(default_factory=list, description="Article categories")
    is_read: bool = Field(..., description="Whether article is read")
    is_starred: bool = Field(..., description="Whether article is starred")
    relevance_score: Optional[float] = Field(None, description="Relevance score (0-1)")
    preview: str = Field(..., description="Content preview")
    created_at: datetime = Field(..., description="When article was cached")
    updated_at: datetime = Field(..., description="Last update timestamp")

    @validator("categories", pre=True, always=True)
    def parse_categories_json(cls, v):
        """Parse categories from JSON string if needed"""
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v

    class Config:
        from_attributes = True


class RssArticleWithFeed(RssArticleResponse):
    """Article response with feed info"""
    feed_title: str = Field(..., description="Parent feed title")
    feed_icon_url: Optional[str] = Field(None, description="Parent feed icon")
    feed_category: Optional[str] = Field(None, description="Parent feed category")


class RssArticleListResponse(BaseModel):
    """Schema for list of RSS articles"""
    articles: List[RssArticleWithFeed] = Field(..., description="List of articles")
    total: int = Field(..., description="Total article count")
    unread_count: int = Field(..., description="Unread article count")


class RssArticleMarkReadRequest(BaseModel):
    """Schema for marking articles as read"""
    article_ids: List[UUID] = Field(..., description="Article IDs to mark as read")


class RssArticleRecordReadingRequest(BaseModel):
    """Schema for recording reading behavior"""
    time_spent_seconds: float = Field(..., ge=0, description="Time spent reading")
    scroll_depth_pct: float = Field(..., ge=0, le=100, description="Scroll depth percentage")


# =============================================================================
# OPML Import/Export Schemas
# =============================================================================

class OpmlFeed(BaseModel):
    """Schema for a feed in OPML format"""
    title: str = Field(..., description="Feed title")
    xml_url: str = Field(..., description="RSS feed URL")
    html_url: Optional[str] = Field(None, description="Website URL")
    category: Optional[str] = Field(None, description="Feed category")


class OpmlImportRequest(BaseModel):
    """Schema for OPML import"""
    opml_content: str = Field(..., description="Raw OPML XML content")


class OpmlImportResponse(BaseModel):
    """Schema for OPML import result"""
    imported: int = Field(..., description="Number of feeds imported")
    skipped: int = Field(..., description="Number of feeds skipped (duplicates)")
    errors: List[str] = Field(default_factory=list, description="Import errors")
    feeds: List[RssFeedResponse] = Field(..., description="Imported feeds")


class OpmlExportResponse(BaseModel):
    """Schema for OPML export"""
    opml_content: str = Field(..., description="Generated OPML XML")
    feed_count: int = Field(..., description="Number of feeds exported")


# =============================================================================
# Feed Refresh Schemas
# =============================================================================

class FeedRefreshRequest(BaseModel):
    """Schema for feed refresh request"""
    feed_ids: Optional[List[UUID]] = Field(None, description="Specific feeds to refresh (None = all)")


class FeedRefreshResult(BaseModel):
    """Schema for single feed refresh result"""
    feed_id: UUID = Field(..., description="Feed ID")
    success: bool = Field(..., description="Whether refresh succeeded")
    new_articles: int = Field(default=0, description="Number of new articles")
    error: Optional[str] = Field(None, description="Error message if failed")


class FeedRefreshResponse(BaseModel):
    """Schema for feed refresh response"""
    results: List[FeedRefreshResult] = Field(..., description="Refresh results per feed")
    total_new_articles: int = Field(..., description="Total new articles across all feeds")
