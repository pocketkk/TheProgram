"""
RssFeed model for user RSS feed subscriptions

Stores RSS feed URLs and metadata for personalized content aggregation.
Each feed can be categorized and has fetch/caching settings.
"""
from sqlalchemy import Column, String, Boolean, Integer

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class RssFeed(BaseModel):
    """
    RSS Feed subscription for personalized Cosmic Paper content.

    Stores individual RSS feed subscriptions with metadata for
    organization, filtering, and historical date matching.

    Fields:
        id: UUID primary key
        url: RSS feed URL
        name: User-friendly name for the feed
        category: Category for organization (news, tech, spiritual, etc.)
        description: Optional description of the feed
        is_active: Whether to fetch from this feed
        fetch_interval_hours: How often to refresh (for caching)
        last_fetched_at: Last successful fetch timestamp
        last_error: Last error message if fetch failed
        entry_count: Number of entries in last fetch
        topics: Topic tags for content matching
        trust_level: User trust level for this source (0.0-1.0)
        supports_historical: Whether feed has historical archives
        historical_url_template: URL template for historical queries
            e.g., "https://example.com/archive/{year}/{month}/{day}"

    Example:
        feed = RssFeed(
            url="https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
            name="NYT Technology",
            category="tech",
            topics=["technology", "AI", "startups"],
            trust_level=0.85
        )
        db.add(feed)
        db.commit()
    """
    __tablename__ = 'rss_feeds'

    # ==========================================================================
    # Core Feed Information
    # ==========================================================================
    url = Column(
        String,
        nullable=False,
        unique=True,
        comment="RSS feed URL"
    )

    name = Column(
        String,
        nullable=False,
        comment="User-friendly name for the feed"
    )

    category = Column(
        String,
        nullable=True,
        default="news",
        comment="Category for organization (news, tech, spiritual, etc.)"
    )

    description = Column(
        String,
        nullable=True,
        comment="Optional description of the feed"
    )

    # ==========================================================================
    # Status & Configuration
    # ==========================================================================
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether to fetch from this feed"
    )

    fetch_interval_hours = Column(
        Integer,
        nullable=False,
        default=24,
        comment="How often to refresh (hours)"
    )

    # ==========================================================================
    # Fetch Status
    # ==========================================================================
    last_fetched_at = Column(
        String,
        nullable=True,
        comment="Last successful fetch timestamp (ISO 8601)"
    )

    last_error = Column(
        String,
        nullable=True,
        comment="Last error message if fetch failed"
    )

    entry_count = Column(
        Integer,
        nullable=True,
        default=0,
        comment="Number of entries in last fetch"
    )

    # ==========================================================================
    # Content Categorization
    # ==========================================================================
    topics = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Topic tags for content matching: ["technology", "AI"]'
    )

    # ==========================================================================
    # Trust & Quality
    # ==========================================================================
    trust_level = Column(
        String,  # Stored as string for SQLite (no native float)
        nullable=False,
        default="0.5",
        comment="User trust level for this source (0.0-1.0)"
    )

    # ==========================================================================
    # Historical Support
    # ==========================================================================
    supports_historical = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether feed has historical archives"
    )

    historical_url_template = Column(
        String,
        nullable=True,
        comment='URL template for historical queries: "https://example.com/archive/{year}/{month}/{day}"'
    )

    def __repr__(self):
        """String representation"""
        status = "active" if self.is_active else "inactive"
        return f"<RssFeed(name='{self.name}', category='{self.category}', {status})>"

    @property
    def trust_level_float(self) -> float:
        """Get trust level as float"""
        try:
            return float(self.trust_level)
        except (ValueError, TypeError):
            return 0.5

    @trust_level_float.setter
    def trust_level_float(self, value: float):
        """Set trust level from float"""
        self.trust_level = str(max(0.0, min(1.0, value)))

    def get_historical_url(self, year: int, month: int, day: int) -> str | None:
        """
        Get URL for historical content if supported.

        Args:
            year: Target year
            month: Target month (1-12)
            day: Target day (1-31)

        Returns:
            Formatted URL or None if not supported
        """
        if not self.supports_historical or not self.historical_url_template:
            return None

        return self.historical_url_template.format(
            year=year,
            month=f"{month:02d}",
            day=f"{day:02d}"
        )

    def matches_topics(self, target_topics: list) -> bool:
        """
        Check if feed topics overlap with target topics.

        Args:
            target_topics: List of topics to match against

        Returns:
            True if any topic matches
        """
        feed_topics = set(t.lower() for t in (self.topics or []))
        target_set = set(t.lower() for t in target_topics)
        return bool(feed_topics & target_set)

    def to_dict(self):
        """Convert to dictionary with computed properties"""
        result = super().to_dict()
        result['trust_level_float'] = self.trust_level_float
        return result
