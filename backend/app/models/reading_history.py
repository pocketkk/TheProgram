"""
ReadingHistory model for tracking article reading behavior

Part of Cosmic Chronicle - privacy-first personal news hub.
All data stored locally, never transmitted without consent.
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Index, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ReadingHistory(BaseModel):
    """
    Reading history model for personal algorithm

    Tracks reading behavior to build interest profile locally.
    Privacy-first: all data stays on device.

    Fields:
        id: UUID primary key (inherited)
        article_id: ID of the article read (can be RSS article or external)
        source_type: Type of source (rss, guardian, nyt, wikipedia, etc.)
        source_id: Source-specific ID (feed_id for RSS, etc.)
        title: Article title (for reference)
        url: Article URL (for deduplication)
        topics: Extracted topics (JSON array stored as text)
        time_spent_seconds: Time spent reading
        scroll_depth_pct: How far user scrolled (0-100)
        clicked_links: Whether user clicked any links
        starred: Whether user starred/saved the article
        feedback: User feedback (more, less, null)
        read_at: When the article was read (inherited as created_at)
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        history = ReadingHistory(
            article_id="rss-article-123",
            source_type="rss",
            source_id="feed-456",
            title="Tech News Article",
            url="https://example.com/article",
            time_spent_seconds=120,
            scroll_depth_pct=85.0
        )
    """
    __tablename__ = 'reading_history'

    # Article identification
    article_id = Column(
        String(100),
        nullable=False,
        comment="Article ID (UUID for RSS, external ID for others)"
    )

    source_type = Column(
        String(50),
        nullable=False,
        comment="Source type: rss, guardian, nyt, wikipedia, sports"
    )

    source_id = Column(
        String(100),
        nullable=True,
        comment="Source-specific ID (feed_id for RSS)"
    )

    # Article metadata (cached for reference)
    title = Column(
        Text,
        nullable=False,
        comment="Article title"
    )

    url = Column(
        Text,
        nullable=True,
        comment="Article URL"
    )

    # Extracted topics (JSON array as text)
    topics = Column(
        Text,
        nullable=True,
        comment="Extracted topics as JSON array"
    )

    # Reading behavior metrics
    time_spent_seconds = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Time spent reading in seconds"
    )

    scroll_depth_pct = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="Scroll depth percentage (0-100)"
    )

    clicked_links = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether user clicked links in article"
    )

    starred = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether user starred/saved the article"
    )

    # Explicit user feedback
    feedback = Column(
        String(10),
        nullable=True,
        comment="User feedback: more, less, or null"
    )

    # Table indexes
    __table_args__ = (
        Index('idx_reading_history_article', 'article_id'),
        Index('idx_reading_history_source', 'source_type', 'source_id'),
        Index('idx_reading_history_created', 'created_at'),
    )

    def __repr__(self):
        """String representation"""
        return f"<ReadingHistory(id={self.id[:8]}..., title='{self.title[:30]}...', source={self.source_type})>"

    def to_dict(self):
        """Convert to dictionary"""
        import json
        result = super().to_dict()
        # Parse topics JSON
        if result.get('topics'):
            try:
                result['topics'] = json.loads(result['topics'])
            except (json.JSONDecodeError, TypeError):
                result['topics'] = []
        return result

    @property
    def engagement_score(self) -> float:
        """
        Calculate engagement score from reading behavior.

        Score from 0-1 based on:
        - Time spent (up to 5 min = 0.4)
        - Scroll depth (0.3)
        - Starred (0.2)
        - Clicked links (0.1)
        """
        score = 0.0

        # Time component (max 0.4 for 5+ minutes)
        time_score = min(self.time_spent_seconds / 300, 1.0) * 0.4
        score += time_score

        # Scroll depth component (max 0.3)
        scroll_score = (self.scroll_depth_pct / 100) * 0.3
        score += scroll_score

        # Starred component (0.2)
        if self.starred:
            score += 0.2

        # Clicked links component (0.1)
        if self.clicked_links:
            score += 0.1

        return round(score, 3)
