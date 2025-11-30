"""
The Guardian API Service

Fetches news articles from The Guardian's Open Platform API.
Provides historical news content for the Timeline newspaper feature.

API Documentation: https://open-platform.theguardian.com/documentation/
"""
import asyncio
import logging
from datetime import date, datetime
from typing import Dict, List, Any, Optional

import httpx

logger = logging.getLogger(__name__)


class GuardianFetchError(Exception):
    """Exception raised when Guardian API fetch fails"""
    pass


class GuardianService:
    """
    Service for fetching news articles from The Guardian API.

    The Guardian's Open Platform API provides access to articles from 1999 onwards.
    Free tier: 5,000 requests/day, 12 requests/second.

    Usage:
        service = GuardianService(api_key="your-api-key")
        articles = await service.fetch_articles_for_date(year=2020, month=3, day=15)
    """

    BASE_URL = "https://content.guardianapis.com/search"
    DEFAULT_TIMEOUT = 15.0  # seconds
    MAX_RETRIES = 3

    # Available sections for filtering
    SECTIONS = [
        "world",
        "us-news",
        "politics",
        "business",
        "technology",
        "science",
        "environment",
        "sport",
        "culture",
        "lifeandstyle"
    ]

    def __init__(
        self,
        api_key: str,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = MAX_RETRIES
    ):
        """
        Initialize Guardian service

        Args:
            api_key: Guardian API key (get from open-platform.theguardian.com)
            timeout: HTTP request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy initialization of HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={
                    "User-Agent": "TheProgram/1.0 (Astrology Desktop App)",
                    "Accept": "application/json"
                }
            )
        return self._client

    async def close(self):
        """Close the HTTP client"""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def fetch_articles_for_date(
        self,
        year: int,
        month: int,
        day: int,
        sections: Optional[List[str]] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Fetch Guardian articles published on a specific date

        Args:
            year: Year (must be >= 1999)
            month: Month (1-12)
            day: Day of month (1-31)
            sections: Optional list of sections to filter (e.g., ["world", "science"])
            limit: Maximum number of articles to return

        Returns:
            List of article dictionaries:
            [
                {
                    "headline": "Article Title",
                    "standfirst": "Article summary/subtitle",
                    "section": "world",
                    "web_url": "https://...",
                    "publication_date": "2020-03-15",
                    "source": "guardian"
                }
            ]

        Raises:
            GuardianFetchError: If fetch fails after retries
            ValueError: If date is before 1999
        """
        # Guardian API coverage starts from 1999
        if year < 1999:
            logger.warning(f"Guardian API only covers 1999+, returning empty for {year}")
            return []

        # Validate date
        try:
            target_date = date(year, month, day)
        except ValueError as e:
            raise ValueError(f"Invalid date: {year}-{month}-{day}: {e}")

        # Don't allow future dates
        if target_date > date.today():
            logger.warning(f"Future date requested: {target_date}, returning empty")
            return []

        # Build query parameters
        date_str = target_date.isoformat()
        params = {
            "api-key": self.api_key,
            "from-date": date_str,
            "to-date": date_str,
            "page-size": min(limit, 50),  # API max is 50
            "order-by": "relevance",
            "show-fields": "headline,standfirst,trailText,byline",
            "show-tags": "keyword"
        }

        # Add section filter if specified
        if sections:
            valid_sections = [s for s in sections if s in self.SECTIONS]
            if valid_sections:
                params["section"] = "|".join(valid_sections)

        # Fetch with retry logic
        last_error = None
        for attempt in range(self.max_retries):
            try:
                client = await self._get_client()
                response = await client.get(self.BASE_URL, params=params)

                # Handle HTTP errors
                if response.status_code == 401:
                    raise GuardianFetchError(
                        "Invalid Guardian API key. "
                        "Get one at https://open-platform.theguardian.com/"
                    )

                if response.status_code == 429:
                    # Rate limited - retry with backoff
                    wait_time = (2 ** attempt) * 2  # 2s, 4s, 8s
                    logger.warning(
                        f"Rate limited by Guardian API, "
                        f"waiting {wait_time}s before retry {attempt + 1}/{self.max_retries}"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                response.raise_for_status()

                # Parse response
                data = response.json()
                response_data = data.get("response", {})

                if response_data.get("status") != "ok":
                    error_msg = response_data.get("message", "Unknown error")
                    raise GuardianFetchError(f"Guardian API error: {error_msg}")

                # Extract and normalize articles
                results = response_data.get("results", [])
                return [self._normalize_article(article, date_str) for article in results]

            except httpx.TimeoutException as e:
                last_error = e
                wait_time = (2 ** attempt) * 1
                logger.warning(
                    f"Guardian request timeout, waiting {wait_time}s "
                    f"before retry {attempt + 1}/{self.max_retries}"
                )
                await asyncio.sleep(wait_time)
                continue

            except httpx.HTTPStatusError as e:
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    logger.error(f"Guardian API client error: {e}")
                    raise GuardianFetchError(f"Guardian API error: {e}") from e
                last_error = e
                wait_time = (2 ** attempt) * 2
                logger.warning(
                    f"Guardian server error, waiting {wait_time}s "
                    f"before retry {attempt + 1}/{self.max_retries}"
                )
                await asyncio.sleep(wait_time)
                continue

            except GuardianFetchError:
                raise

            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error fetching Guardian data: {e}")
                raise GuardianFetchError(f"Failed to fetch Guardian data: {e}") from e

        # All retries exhausted
        logger.error(
            f"Failed to fetch Guardian data after {self.max_retries} attempts: {last_error}"
        )
        raise GuardianFetchError(
            f"Failed to fetch Guardian data after {self.max_retries} retries: {last_error}"
        ) from last_error

    async def fetch_top_headlines(
        self,
        year: int,
        month: int,
        day: int,
        max_articles: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetch top headlines for a specific date (most relevant articles)

        Args:
            year: Year (must be >= 1999)
            month: Month (1-12)
            day: Day of month (1-31)
            max_articles: Maximum number of headlines to return

        Returns:
            List of top headline dictionaries
        """
        # Prioritize news sections for headlines
        priority_sections = ["world", "us-news", "politics", "business", "science"]
        articles = await self.fetch_articles_for_date(
            year, month, day,
            sections=priority_sections,
            limit=max_articles * 2  # Fetch extra to allow filtering
        )

        # Sort by section priority and return top N
        section_order = {s: i for i, s in enumerate(priority_sections)}
        sorted_articles = sorted(
            articles,
            key=lambda a: (section_order.get(a.get("section", ""), 99), 0)
        )

        return sorted_articles[:max_articles]

    def _normalize_article(
        self,
        article: Dict[str, Any],
        pub_date: str
    ) -> Dict[str, Any]:
        """
        Normalize Guardian article to standard format

        Args:
            article: Raw article from API
            pub_date: Publication date string (YYYY-MM-DD)

        Returns:
            Normalized article dictionary
        """
        fields = article.get("fields", {})

        # Get headline - try multiple fields
        headline = (
            fields.get("headline") or
            article.get("webTitle") or
            "Untitled Article"
        )

        # Get summary - prefer standfirst, fall back to trailText
        summary = (
            fields.get("standfirst") or
            fields.get("trailText") or
            ""
        )

        # Clean up summary (may contain HTML)
        if summary:
            # Basic HTML stripping
            import re
            summary = re.sub(r'<[^>]+>', '', summary)
            summary = summary.strip()

        # Extract keywords from tags
        tags = article.get("tags", [])
        keywords = [tag.get("webTitle", "") for tag in tags[:5]]

        return {
            "headline": headline,
            "summary": summary,
            "section": article.get("sectionId", ""),
            "section_name": article.get("sectionName", ""),
            "web_url": article.get("webUrl", ""),
            "publication_date": pub_date,
            "byline": fields.get("byline", ""),
            "keywords": keywords,
            "source": "guardian"
        }

    def get_coverage_info(self) -> Dict[str, Any]:
        """
        Get information about Guardian API coverage

        Returns:
            Dictionary with coverage details
        """
        return {
            "name": "The Guardian",
            "source_id": "guardian",
            "start_year": 1999,
            "end_year": date.today().year,
            "rate_limit": {
                "requests_per_day": 5000,
                "requests_per_second": 12
            },
            "sections": self.SECTIONS,
            "api_url": "https://open-platform.theguardian.com/"
        }

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Factory function to create service with API key from config
def create_guardian_service(api_key: str) -> Optional[GuardianService]:
    """
    Create Guardian service if API key is provided

    Args:
        api_key: Guardian API key

    Returns:
        GuardianService instance or None if no API key
    """
    if api_key and api_key.strip():
        return GuardianService(api_key=api_key.strip())
    return None
