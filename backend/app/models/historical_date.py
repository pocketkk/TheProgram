"""
HistoricalDate model for caching Wikipedia "On This Day" data and generated newspapers

Caches historical events from Wikipedia API and AI-generated newspaper content.
Key is month-day (MM-DD) since Wikipedia returns the same events for any year.
"""
from sqlalchemy import Column, String, Index, Text

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedDict, JSONEncodedList


class HistoricalDate(BaseModel):
    """
    Cache for Wikipedia "On This Day" events and generated newspaper content

    Caches historical events fetched from Wikipedia API and AI-generated
    newspaper transformations. Cache key is MM-DD format since Wikipedia's
    "On This Day" returns identical events regardless of year.

    Fields:
        id: UUID primary key (inherited)
        month_day: Cache key in MM-DD format (e.g., "07-20" for July 20)

        # Wikipedia data (raw from API)
        wikipedia_events: JSON list of historical events
        wikipedia_births: JSON list of notable births
        wikipedia_deaths: JSON list of notable deaths
        wikipedia_holidays: JSON list of holidays/observances
        wikipedia_fetched_at: ISO timestamp of last fetch
        wikipedia_fetch_error: Error message if fetch failed

        # Generated newspaper
        newspaper_content: JSON structured newspaper with sections/articles
        newspaper_style: Style used for generation ("victorian", "modern")
        newspaper_generated_at: ISO timestamp of generation
        generation_prompt_hash: Hash of prompt for cache invalidation

        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        historical = HistoricalDate(
            month_day="07-20",
            wikipedia_events=[
                {"year": 1969, "text": "Apollo 11 lands on the Moon..."},
                {"year": 1944, "text": "Failed assassination of Hitler..."}
            ],
            wikipedia_births=[...],
            wikipedia_deaths=[...],
            wikipedia_holidays=[...],
            wikipedia_fetched_at="2025-01-15T12:00:00Z",
            newspaper_content={
                "headline": "MAN WALKS ON MOON",
                "sections": [...]
            },
            newspaper_style="victorian",
            newspaper_generated_at="2025-01-15T12:01:00Z"
        )
    """
    __tablename__ = 'historical_dates'

    # Cache key: MM-DD format
    month_day = Column(
        String(5),
        nullable=False,
        unique=True,
        index=True,
        comment="Cache key in MM-DD format (e.g., '07-20')"
    )

    # Wikipedia raw data (JSON)
    wikipedia_events = Column(
        JSONEncodedList,
        nullable=True,
        comment="JSON list of historical events from Wikipedia"
    )

    wikipedia_births = Column(
        JSONEncodedList,
        nullable=True,
        comment="JSON list of notable births from Wikipedia"
    )

    wikipedia_deaths = Column(
        JSONEncodedList,
        nullable=True,
        comment="JSON list of notable deaths from Wikipedia"
    )

    wikipedia_holidays = Column(
        JSONEncodedList,
        nullable=True,
        comment="JSON list of holidays/observances from Wikipedia"
    )

    # Fetch metadata
    wikipedia_fetched_at = Column(
        String,
        nullable=True,
        comment="ISO timestamp of last Wikipedia fetch"
    )

    wikipedia_fetch_error = Column(
        Text,
        nullable=True,
        comment="Error message if Wikipedia fetch failed"
    )

    # Year-specific date (YYYY-MM-DD) for multi-source news
    full_date = Column(
        String(10),
        nullable=True,
        index=True,
        comment="Full date in YYYY-MM-DD format for year-specific news caching"
    )

    # The Guardian API data
    guardian_articles = Column(
        JSONEncodedList,
        nullable=True,
        comment="JSON list of articles from The Guardian API"
    )

    guardian_fetched_at = Column(
        String,
        nullable=True,
        comment="ISO timestamp of last Guardian API fetch"
    )

    guardian_fetch_error = Column(
        Text,
        nullable=True,
        comment="Error message if Guardian fetch failed"
    )

    # New York Times API data
    nyt_articles = Column(
        JSONEncodedList,
        nullable=True,
        comment="JSON list of articles from NYT Archive/Search API"
    )

    nyt_fetched_at = Column(
        String,
        nullable=True,
        comment="ISO timestamp of last NYT API fetch"
    )

    nyt_fetch_error = Column(
        Text,
        nullable=True,
        comment="Error message if NYT fetch failed"
    )

    # Source tracking for generated newspaper
    newspaper_sources = Column(
        String,
        nullable=True,
        comment="Comma-separated list of sources used: 'guardian,nyt,wikipedia'"
    )

    # Generated newspaper (Gemini output)
    newspaper_content = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON structured newspaper with headline, sections, articles"
    )

    newspaper_style = Column(
        String(50),
        nullable=True,
        comment="Style used for generation: 'victorian', 'modern'"
    )

    newspaper_generated_at = Column(
        String,
        nullable=True,
        comment="ISO timestamp of newspaper generation"
    )

    generation_prompt_hash = Column(
        String(64),
        nullable=True,
        comment="Hash of generation prompt for cache invalidation"
    )

    # Table indexes
    __table_args__ = (
        Index('idx_historical_date_month_day', 'month_day'),
        Index('idx_historical_date_full_date', 'full_date'),
    )

    def __repr__(self):
        """String representation"""
        has_wiki = bool(self.wikipedia_events)
        has_paper = bool(self.newspaper_content)
        return f"<HistoricalDate(month_day={self.month_day}, wiki={has_wiki}, newspaper={has_paper})>"

    @property
    def has_wikipedia_data(self) -> bool:
        """Check if Wikipedia data has been fetched"""
        return bool(self.wikipedia_events or self.wikipedia_births or self.wikipedia_deaths)

    @property
    def has_newspaper(self) -> bool:
        """Check if newspaper has been generated"""
        return bool(self.newspaper_content)

    @property
    def has_guardian_data(self) -> bool:
        """Check if Guardian articles have been fetched"""
        return bool(self.guardian_articles)

    @property
    def has_nyt_data(self) -> bool:
        """Check if NYT articles have been fetched"""
        return bool(self.nyt_articles)

    @property
    def is_year_specific(self) -> bool:
        """Check if this is a year-specific cache entry (has full_date)"""
        return bool(self.full_date)

    @property
    def event_count(self) -> int:
        """Total count of all Wikipedia events"""
        return (
            len(self.wikipedia_events or []) +
            len(self.wikipedia_births or []) +
            len(self.wikipedia_deaths or [])
        )

    def get_wikipedia_data(self) -> dict:
        """
        Get all Wikipedia data as a dictionary

        Returns:
            Dict with events, births, deaths, holidays lists
        """
        return {
            "events": self.wikipedia_events or [],
            "births": self.wikipedia_births or [],
            "deaths": self.wikipedia_deaths or [],
            "holidays": self.wikipedia_holidays or [],
        }

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with has_wikipedia_data, has_newspaper, etc.
        """
        result = super().to_dict()
        result['has_wikipedia_data'] = self.has_wikipedia_data
        result['has_newspaper'] = self.has_newspaper
        result['has_guardian_data'] = self.has_guardian_data
        result['has_nyt_data'] = self.has_nyt_data
        result['is_year_specific'] = self.is_year_specific
        result['event_count'] = self.event_count
        return result
