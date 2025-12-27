"""
RssFeed model for storing RSS feed subscriptions

Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class RssFeed(BaseModel):
    """
    RSS feed subscription model

    Stores user's RSS feed subscriptions with metadata and fetch status.

    Fields:
        id: UUID primary key (inherited)
        url: RSS/Atom feed URL
        title: Feed title (can be user-customized)
        description: Feed description
        site_url: Main website URL
        icon_url: Feed favicon or icon
        category: User-assigned category (e.g., "tech", "news", "personal")
        is_active: Whether to fetch this feed
        fetch_interval_minutes: How often to refresh (default 60)
        last_fetched_at: Last successful fetch timestamp
        last_error: Last fetch error message (null if successful)
        error_count: Consecutive error count (reset on success)
        article_count: Cached article count
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        articles: RssArticle items from this feed

    Example:
        feed = RssFeed(
            url="https://example.com/feed.xml",
            title="Example Blog",
            category="tech",
            fetch_interval_minutes=30
        )
    """
    __tablename__ = 'rss_feeds'

    # Feed URL (unique)
    url = Column(
        Text,
        nullable=False,
        unique=True,
        comment="RSS/Atom feed URL"
    )

    # Feed metadata
    title = Column(
        String(255),
        nullable=False,
        comment="Feed title (user-customizable)"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Feed description"
    )

    site_url = Column(
        Text,
        nullable=True,
        comment="Main website URL"
    )

    icon_url = Column(
        Text,
        nullable=True,
        comment="Feed favicon or icon URL"
    )

    # Categorization
    category = Column(
        String(50),
        nullable=True,
        index=True,
        comment="User-assigned category"
    )

    # Status
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether to fetch this feed"
    )

    fetch_interval_minutes = Column(
        Integer,
        nullable=False,
        default=60,
        comment="Refresh interval in minutes"
    )

    last_fetched_at = Column(
        String,
        nullable=True,
        comment="Last successful fetch timestamp (ISO 8601)"
    )

    last_error = Column(
        Text,
        nullable=True,
        comment="Last fetch error message"
    )

    error_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Consecutive error count"
    )

    article_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Cached article count"
    )

    # Relationships
    articles = relationship(
        'RssArticle',
        back_populates='feed',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_rss_feed_url', 'url'),
        Index('idx_rss_feed_category', 'category'),
        Index('idx_rss_feed_is_active', 'is_active'),
        Index('idx_rss_feed_last_fetched', 'last_fetched_at'),
    )

    def __repr__(self):
        """String representation"""
        return f"<RssFeed(id={self.id[:8]}..., title='{self.title}', url='{self.url[:50]}...')>"

    @property
    def is_healthy(self) -> bool:
        """Check if feed is healthy (no recent errors)"""
        return self.error_count == 0

    @property
    def needs_refresh(self) -> bool:
        """Check if feed needs to be refreshed based on interval"""
        if not self.last_fetched_at:
            return True
        from datetime import datetime, timedelta
        last_fetch = datetime.fromisoformat(self.last_fetched_at.replace('Z', '+00:00'))
        now = datetime.now(last_fetch.tzinfo) if last_fetch.tzinfo else datetime.now()
        return (now - last_fetch) > timedelta(minutes=self.fetch_interval_minutes)

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['is_healthy'] = self.is_healthy
        result['needs_refresh'] = self.needs_refresh
        return result

    def mark_success(self, article_count: int) -> None:
        """Mark a successful fetch"""
        from app.core.datetime_helpers import now_iso
        self.last_fetched_at = now_iso()
        self.last_error = None
        self.error_count = 0
        self.article_count = article_count

    def mark_error(self, error_message: str) -> None:
        """Mark a failed fetch"""
        from app.core.datetime_helpers import now_iso
        self.last_fetched_at = now_iso()
        self.last_error = error_message
        self.error_count += 1
