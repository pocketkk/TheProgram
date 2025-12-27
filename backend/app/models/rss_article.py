"""
RssArticle model for storing cached RSS articles

Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from sqlalchemy import Column, String, Text, Boolean, Float, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class RssArticle(BaseModel):
    """
    Cached RSS article model

    Stores individual articles from RSS feeds with reading status and relevance.

    Fields:
        id: UUID primary key (inherited)
        feed_id: Parent RSS feed
        guid: Unique article identifier from feed
        url: Article URL
        title: Article title
        author: Article author
        summary: Article summary/description
        content: Full article content (if available)
        image_url: Featured image URL
        published_at: Article publication date
        categories: JSON list of categories from feed
        is_read: Whether user has read this article
        is_starred: Whether user has starred this article
        relevance_score: AI-computed relevance score (0-1)
        time_spent_seconds: Time user spent reading (for algorithm)
        scroll_depth_pct: How far user scrolled (for algorithm)
        created_at: When article was cached (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        feed: Parent RssFeed

    Example:
        article = RssArticle(
            feed_id=feed.id,
            guid="https://example.com/post-123",
            url="https://example.com/post-123",
            title="Example Article",
            summary="This is an example article...",
            published_at="2025-01-15T10:30:00Z"
        )
    """
    __tablename__ = 'rss_articles'

    # Foreign key to feed
    feed_id = Column(
        String,
        ForeignKey('rss_feeds.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Parent RSS feed"
    )

    # Article identifiers
    guid = Column(
        Text,
        nullable=False,
        comment="Unique article identifier from feed"
    )

    url = Column(
        Text,
        nullable=False,
        comment="Article URL"
    )

    # Article content
    title = Column(
        Text,
        nullable=False,
        comment="Article title"
    )

    author = Column(
        String(255),
        nullable=True,
        comment="Article author"
    )

    summary = Column(
        Text,
        nullable=True,
        comment="Article summary/description"
    )

    content = Column(
        Text,
        nullable=True,
        comment="Full article content"
    )

    image_url = Column(
        Text,
        nullable=True,
        comment="Featured image URL"
    )

    published_at = Column(
        String,
        nullable=True,
        index=True,
        comment="Article publication date (ISO 8601)"
    )

    # Categorization
    categories = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment="JSON list of categories from feed"
    )

    # User interaction
    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="Whether user has read this article"
    )

    is_starred = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="Whether user has starred this article"
    )

    # Relevance scoring (for personal algorithm)
    relevance_score = Column(
        Float,
        nullable=True,
        index=True,
        comment="AI-computed relevance score (0-1)"
    )

    # Reading behavior tracking (local only)
    time_spent_seconds = Column(
        Float,
        nullable=True,
        comment="Time user spent reading"
    )

    scroll_depth_pct = Column(
        Float,
        nullable=True,
        comment="How far user scrolled (0-100)"
    )

    # Relationships
    feed = relationship(
        'RssFeed',
        back_populates='articles'
    )

    # Table indexes and constraints
    __table_args__ = (
        Index('idx_rss_article_feed_id', 'feed_id'),
        Index('idx_rss_article_guid', 'guid'),
        Index('idx_rss_article_published_at', 'published_at'),
        Index('idx_rss_article_is_read', 'is_read'),
        Index('idx_rss_article_is_starred', 'is_starred'),
        Index('idx_rss_article_relevance', 'relevance_score'),
        Index('idx_rss_article_feed_guid', 'feed_id', 'guid', unique=True),
    )

    def __repr__(self):
        """String representation"""
        return f"<RssArticle(id={self.id[:8]}..., title='{self.title[:50]}...')>"

    @property
    def preview(self) -> str:
        """Get preview of article content"""
        text = self.summary or self.content or ""
        if len(text) <= 200:
            return text
        return text[:200] + "..."

    @property
    def category_list(self) -> list:
        """Get categories as Python list"""
        return self.categories or []

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['preview'] = self.preview
        result['category_list'] = self.category_list
        return result

    def mark_read(self) -> None:
        """Mark article as read"""
        self.is_read = True

    def toggle_star(self) -> bool:
        """Toggle starred status, return new state"""
        self.is_starred = not self.is_starred
        return self.is_starred

    def record_reading(self, time_seconds: float, scroll_pct: float) -> None:
        """Record reading behavior for algorithm"""
        self.time_spent_seconds = time_seconds
        self.scroll_depth_pct = scroll_pct
