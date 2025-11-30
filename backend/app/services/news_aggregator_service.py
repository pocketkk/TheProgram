"""
News Aggregator Service

Orchestrates multi-source news fetching with intelligent fallback.
Combines Guardian, NYT, and Wikipedia sources for comprehensive coverage.
"""
import asyncio
import logging
from datetime import date
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set

from app.services.guardian_service import GuardianService, GuardianFetchError, create_guardian_service
from app.services.nyt_service import NYTService, NYTFetchError, create_nyt_service
from app.services.wikipedia_service import WikipediaService, WikipediaFetchError, get_wikipedia_service

logger = logging.getLogger(__name__)


@dataclass
class AggregatedNews:
    """Result of multi-source news aggregation"""
    date: str  # YYYY-MM-DD
    year: int
    month: int
    day: int

    # Articles from each source
    guardian_articles: List[Dict[str, Any]] = field(default_factory=list)
    nyt_articles: List[Dict[str, Any]] = field(default_factory=list)
    wikipedia_context: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    sources_used: List[str] = field(default_factory=list)
    sources_failed: Dict[str, str] = field(default_factory=dict)  # source -> error message
    is_year_specific: bool = True

    @property
    def total_articles(self) -> int:
        """Total number of articles from all sources"""
        return len(self.guardian_articles) + len(self.nyt_articles)

    @property
    def has_real_news(self) -> bool:
        """Check if we have actual news articles (not just Wikipedia)"""
        return len(self.guardian_articles) > 0 or len(self.nyt_articles) > 0

    @property
    def all_articles(self) -> List[Dict[str, Any]]:
        """Get all articles combined, maintaining source attribution"""
        return self.guardian_articles + self.nyt_articles

    def get_top_headlines(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get top headlines from all sources"""
        # Interleave from different sources for variety
        headlines = []
        guardian_iter = iter(self.guardian_articles)
        nyt_iter = iter(self.nyt_articles)

        while len(headlines) < limit:
            try:
                headlines.append(next(guardian_iter))
            except StopIteration:
                pass

            if len(headlines) < limit:
                try:
                    headlines.append(next(nyt_iter))
                except StopIteration:
                    pass

            # If both iterators are exhausted, break
            if len(headlines) == len(self.guardian_articles) + len(self.nyt_articles):
                break

        return headlines[:limit]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "date": self.date,
            "year": self.year,
            "month": self.month,
            "day": self.day,
            "guardian_articles": self.guardian_articles,
            "nyt_articles": self.nyt_articles,
            "wikipedia_context": self.wikipedia_context,
            "sources_used": self.sources_used,
            "sources_failed": self.sources_failed,
            "is_year_specific": self.is_year_specific,
            "total_articles": self.total_articles,
            "has_real_news": self.has_real_news
        }


class NewsAggregatorService:
    """
    Orchestrates multi-source news fetching with fallback logic.

    Source Coverage:
    - Guardian: 1999-present
    - NYT: 1851-present
    - Wikipedia: All dates (context only)

    Fallback Logic:
    1. Post-1999: Guardian -> NYT -> Wikipedia context
    2. 1851-1999: NYT -> Wikipedia context
    3. Pre-1851: Wikipedia context + AI-generated era context

    Usage:
        aggregator = NewsAggregatorService(
            guardian_api_key="...",
            nyt_api_key="...",
            sources_priority=["guardian", "nyt", "wikipedia"]
        )
        news = await aggregator.fetch_news_for_date(year=1985, month=11, day=30)
    """

    SUPPORTED_SOURCES = {"guardian", "nyt", "wikipedia"}
    DEFAULT_PRIORITY = ["guardian", "nyt", "wikipedia"]

    def __init__(
        self,
        guardian_api_key: Optional[str] = None,
        nyt_api_key: Optional[str] = None,
        sources_priority: Optional[List[str]] = None
    ):
        """
        Initialize aggregator with API keys and source priority

        Args:
            guardian_api_key: Guardian API key (optional)
            nyt_api_key: NYT API key (optional)
            sources_priority: Preferred order of sources
        """
        # Initialize services
        self.guardian_service = create_guardian_service(guardian_api_key) if guardian_api_key else None
        self.nyt_service = create_nyt_service(nyt_api_key) if nyt_api_key else None
        self.wikipedia_service = get_wikipedia_service()

        # Parse and validate priority
        if sources_priority:
            if isinstance(sources_priority, str):
                sources_priority = [s.strip() for s in sources_priority.split(",")]
            self.sources_priority = [
                s for s in sources_priority
                if s in self.SUPPORTED_SOURCES
            ]
        else:
            self.sources_priority = self.DEFAULT_PRIORITY.copy()

    async def close(self):
        """Close all service connections"""
        if self.guardian_service:
            await self.guardian_service.close()
        if self.nyt_service:
            await self.nyt_service.close()
        # Wikipedia service is a singleton, don't close

    def get_available_sources(self) -> List[str]:
        """Get list of sources that have API keys configured"""
        available = []
        if self.guardian_service:
            available.append("guardian")
        if self.nyt_service:
            available.append("nyt")
        available.append("wikipedia")  # Always available
        return available

    def get_sources_for_year(self, year: int) -> List[str]:
        """
        Get sources that cover a specific year, in priority order

        Args:
            year: Year to check coverage for

        Returns:
            List of source names that cover this year
        """
        sources = []
        available = set(self.get_available_sources())

        for source in self.sources_priority:
            if source not in available:
                continue

            if source == "guardian" and year >= 1999:
                sources.append(source)
            elif source == "nyt" and year >= 1851:
                sources.append(source)
            elif source == "wikipedia":
                sources.append(source)

        return sources

    async def fetch_news_for_date(
        self,
        year: int,
        month: int,
        day: int,
        articles_per_source: int = 10
    ) -> AggregatedNews:
        """
        Fetch news from all available sources for a specific date

        Args:
            year: Year
            month: Month (1-12)
            day: Day of month (1-31)
            articles_per_source: Max articles to fetch per source

        Returns:
            AggregatedNews with articles from all sources
        """
        # Initialize result
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        result = AggregatedNews(
            date=date_str,
            year=year,
            month=month,
            day=day,
            is_year_specific=True
        )

        # Get sources that cover this year
        sources_to_try = self.get_sources_for_year(year)
        logger.info(f"Fetching news for {date_str} from sources: {sources_to_try}")

        # Fetch from sources in parallel
        tasks = []
        source_map = {}

        for source in sources_to_try:
            if source == "guardian" and self.guardian_service:
                task = self._fetch_guardian(year, month, day, articles_per_source)
                tasks.append(task)
                source_map[len(tasks) - 1] = "guardian"

            elif source == "nyt" and self.nyt_service:
                task = self._fetch_nyt(year, month, day, articles_per_source)
                tasks.append(task)
                source_map[len(tasks) - 1] = "nyt"

            elif source == "wikipedia":
                task = self._fetch_wikipedia(month, day)
                tasks.append(task)
                source_map[len(tasks) - 1] = "wikipedia"

        # Wait for all fetches to complete
        if tasks:
            fetch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for i, fetch_result in enumerate(fetch_results):
                source = source_map[i]

                if isinstance(fetch_result, Exception):
                    error_msg = str(fetch_result)
                    logger.warning(f"Failed to fetch from {source}: {error_msg}")
                    result.sources_failed[source] = error_msg
                else:
                    if source == "guardian":
                        result.guardian_articles = fetch_result
                        if fetch_result:
                            result.sources_used.append("guardian")
                    elif source == "nyt":
                        result.nyt_articles = fetch_result
                        if fetch_result:
                            result.sources_used.append("nyt")
                    elif source == "wikipedia":
                        result.wikipedia_context = fetch_result
                        if fetch_result:
                            result.sources_used.append("wikipedia")

        logger.info(
            f"Aggregated news for {date_str}: "
            f"{len(result.guardian_articles)} Guardian, "
            f"{len(result.nyt_articles)} NYT, "
            f"Wikipedia: {bool(result.wikipedia_context)}"
        )

        return result

    async def _fetch_guardian(
        self,
        year: int,
        month: int,
        day: int,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch from Guardian with error handling"""
        try:
            articles = await self.guardian_service.fetch_articles_for_date(
                year=year,
                month=month,
                day=day,
                limit=limit
            )
            return articles
        except GuardianFetchError as e:
            logger.error(f"Guardian fetch error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected Guardian error: {e}")
            raise GuardianFetchError(f"Unexpected error: {e}") from e

    async def _fetch_nyt(
        self,
        year: int,
        month: int,
        day: int,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch from NYT with error handling"""
        try:
            articles = await self.nyt_service.fetch_front_page(
                year=year,
                month=month,
                day=day,
                max_articles=limit
            )
            return articles
        except NYTFetchError as e:
            logger.error(f"NYT fetch error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected NYT error: {e}")
            raise NYTFetchError(f"Unexpected error: {e}") from e

    async def _fetch_wikipedia(
        self,
        month: int,
        day: int
    ) -> Dict[str, Any]:
        """Fetch Wikipedia context with error handling"""
        try:
            data = await self.wikipedia_service.fetch_on_this_day(
                month=month,
                day=day,
                event_type="all"
            )
            return data
        except WikipediaFetchError as e:
            logger.error(f"Wikipedia fetch error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected Wikipedia error: {e}")
            raise WikipediaFetchError(f"Unexpected error: {e}") from e

    def get_source_status(self) -> Dict[str, Any]:
        """
        Get status of all news sources

        Returns:
            Dictionary with source availability and coverage info
        """
        return {
            "guardian": {
                "configured": self.guardian_service is not None,
                "coverage_start": 1999,
                "coverage_end": date.today().year,
                "rate_limit": "5000/day"
            },
            "nyt": {
                "configured": self.nyt_service is not None,
                "coverage_start": 1851,
                "coverage_end": date.today().year,
                "rate_limit": "500/day"
            },
            "wikipedia": {
                "configured": True,  # Always available
                "coverage_start": None,  # All dates
                "coverage_end": date.today().year,
                "rate_limit": "unlimited"
            },
            "priority_order": self.sources_priority,
            "available_sources": self.get_available_sources()
        }

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Factory function
def create_news_aggregator(
    guardian_api_key: Optional[str] = None,
    nyt_api_key: Optional[str] = None,
    sources_priority: Optional[str] = None
) -> NewsAggregatorService:
    """
    Create a news aggregator service with the provided configuration

    Args:
        guardian_api_key: Guardian API key
        nyt_api_key: NYT API key
        sources_priority: Comma-separated source priority

    Returns:
        Configured NewsAggregatorService instance
    """
    return NewsAggregatorService(
        guardian_api_key=guardian_api_key,
        nyt_api_key=nyt_api_key,
        sources_priority=sources_priority
    )
