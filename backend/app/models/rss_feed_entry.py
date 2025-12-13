"""
RssFeedEntry model for cached RSS feed entries

Stores individual entries from RSS feeds with publication dates
for historical date matching in the Cosmic Paper.
"""
from sqlalchemy import Column, String, ForeignKey, Index

from app.models.base import BaseModel


class RssFeedEntry(BaseModel):
    """
    Cached RSS feed entry for date-based filtering.

    Stores individual entries from RSS feeds with their publication
    dates to enable historical date matching in Cosmic Paper.

    Fields:
        id: UUID primary key
        feed_id: FK to parent RssFeed
        guid: Unique identifier from the feed entry
        title: Entry title/headline
        link: URL to full article
        summary: Entry summary/description
        content: Full content if available
        author: Author name
        published_at: Publication timestamp (ISO 8601)
        published_date: Publication date only (YYYY-MM-DD) for queries
        categories: Categories/tags from the feed
        image_url: Featured image URL if available

    Example:
        entry = RssFeedEntry(
            feed_id="...",
            guid="https://example.com/article/123",
            title="Breaking News",
            link="https://example.com/article/123",
            summary="Article summary...",
            published_at="2024-01-15T10:30:00Z",
            published_date="2024-01-15"
        )
    """
    __tablename__ = 'rss_feed_entries'
    __table_args__ = (
        # Index for date-based queries
        Index('ix_rss_entries_published_date', 'published_date'),
        # Index for feed + date queries
        Index('ix_rss_entries_feed_date', 'feed_id', 'published_date'),
        # Unique constraint on feed + guid
        Index('ix_rss_entries_feed_guid', 'feed_id', 'guid', unique=True),
    )

    # ==========================================================================
    # Relationships
    # ==========================================================================
    feed_id = Column(
        String,
        ForeignKey('rss_feeds.id', ondelete='CASCADE'),
        nullable=False,
        comment="FK to parent RssFeed"
    )

    # ==========================================================================
    # Entry Identification
    # ==========================================================================
    guid = Column(
        String,
        nullable=False,
        comment="Unique identifier from the feed entry"
    )

    # ==========================================================================
    # Content
    # ==========================================================================
    title = Column(
        String,
        nullable=False,
        comment="Entry title/headline"
    )

    link = Column(
        String,
        nullable=True,
        comment="URL to full article"
    )

    summary = Column(
        String,
        nullable=True,
        comment="Entry summary/description"
    )

    content = Column(
        String,
        nullable=True,
        comment="Full content if available"
    )

    author = Column(
        String,
        nullable=True,
        comment="Author name"
    )

    # ==========================================================================
    # Timestamps (for date-based queries)
    # ==========================================================================
    published_at = Column(
        String,
        nullable=True,
        comment="Publication timestamp (ISO 8601)"
    )

    published_date = Column(
        String,
        nullable=True,
        comment="Publication date only (YYYY-MM-DD) for efficient queries"
    )

    # ==========================================================================
    # Metadata
    # ==========================================================================
    categories = Column(
        String,
        nullable=True,
        comment="Categories/tags from feed (comma-separated)"
    )

    image_url = Column(
        String,
        nullable=True,
        comment="Featured image URL if available"
    )

    def __repr__(self):
        """String representation"""
        title_preview = (self.title[:30] + "...") if len(self.title) > 33 else self.title
        return f"<RssFeedEntry(title='{title_preview}', date='{self.published_date}')>"

    def to_article_dict(self) -> dict:
        """
        Convert to article format for newspaper integration.

        Returns:
            Dictionary compatible with newspaper article format
        """
        return {
            "headline": self.title,
            "content": self.summary or self.content or "",
            "link": self.link,
            "author": self.author,
            "published_date": self.published_date,
            "source": "rss",
            "feed_id": self.feed_id,
            "image_url": self.image_url,
            "categories": self.categories.split(",") if self.categories else []
        }

    @classmethod
    def from_feed_entry(
        cls,
        feed_id: str,
        entry: dict,
        published_date: str
    ) -> "RssFeedEntry":
        """
        Create from parsed feed entry dict.

        Args:
            feed_id: Parent feed ID
            entry: Parsed feed entry dict (from feedparser)
            published_date: Normalized date string (YYYY-MM-DD)

        Returns:
            RssFeedEntry instance
        """
        # Get GUID (use link as fallback)
        guid = entry.get('id') or entry.get('guid') or entry.get('link', '')

        # Get published timestamp
        published_at = None
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            from datetime import datetime
            try:
                dt = datetime(*entry.published_parsed[:6])
                published_at = dt.isoformat() + "Z"
            except Exception:
                pass

        # Extract categories
        categories = None
        if entry.get('tags'):
            categories = ",".join(
                t.get('term', '') for t in entry.get('tags', []) if t.get('term')
            )

        # Get image URL from various common locations
        image_url = None
        if entry.get('media_content'):
            for media in entry.get('media_content', []):
                if media.get('type', '').startswith('image'):
                    image_url = media.get('url')
                    break
        elif entry.get('media_thumbnail'):
            if entry['media_thumbnail']:
                image_url = entry['media_thumbnail'][0].get('url')

        return cls(
            feed_id=feed_id,
            guid=guid,
            title=entry.get('title', 'Untitled'),
            link=entry.get('link'),
            summary=entry.get('summary'),
            content=entry.get('content', [{}])[0].get('value') if entry.get('content') else None,
            author=entry.get('author'),
            published_at=published_at,
            published_date=published_date,
            categories=categories,
            image_url=image_url
        )
