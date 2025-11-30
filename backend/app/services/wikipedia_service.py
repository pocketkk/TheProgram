"""
Wikipedia "On This Day" Service

Fetches historical events, births, deaths, and holidays from Wikipedia API.
Provides historical context for daily insights and chart analysis.
"""
import asyncio
import logging
from datetime import date
from typing import Dict, List, Any, Optional

import httpx

logger = logging.getLogger(__name__)


class WikipediaFetchError(Exception):
    """Exception raised when Wikipedia API fetch fails"""
    pass


class WikipediaService:
    """
    Service for fetching "On This Day" events from Wikipedia API.

    Uses the Wikimedia REST API which provides curated historical events,
    births, deaths, and holidays for any given date.

    Usage:
        service = WikipediaService()
        data = await service.fetch_on_this_day(month=1, day=15)
    """

    BASE_URL = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday"
    DEFAULT_TIMEOUT = 10.0  # seconds
    MAX_RETRIES = 3

    # Event type endpoints
    EVENT_TYPES = {
        "all": "all",           # All types combined
        "selected": "selected", # Curated highlights
        "events": "events",     # Historical events
        "births": "births",     # Notable births
        "deaths": "deaths",     # Notable deaths
        "holidays": "holidays"  # Holidays and observances
    }

    def __init__(
        self,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = MAX_RETRIES
    ):
        """
        Initialize Wikipedia service

        Args:
            timeout: HTTP request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy initialization of HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={
                    "User-Agent": "TheProgram/1.0 (Astrology Desktop App; https://github.com/yourorg/theprogram)",
                    "Accept": "application/json"
                }
            )
        return self._client

    async def close(self):
        """Close the HTTP client"""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def fetch_on_this_day(
        self,
        month: int,
        day: int,
        event_type: str = "all"
    ) -> Dict[str, Any]:
        """
        Fetch "On This Day" events from Wikipedia

        Args:
            month: Month (1-12)
            day: Day of month (1-31)
            event_type: Type of events to fetch (all, selected, events, births, deaths, holidays)

        Returns:
            Dictionary containing event data:
            {
                "events": [{"year": 1969, "text": "...", "pages": [...]}],
                "births": [...],
                "deaths": [...],
                "holidays": [...],
                "selected": [...]
            }

        Raises:
            WikipediaFetchError: If fetch fails after retries
        """
        # Validate inputs
        if not (1 <= month <= 12):
            raise ValueError(f"Invalid month: {month}. Must be 1-12.")
        if not (1 <= day <= 31):
            raise ValueError(f"Invalid day: {day}. Must be 1-31.")
        if event_type not in self.EVENT_TYPES:
            raise ValueError(
                f"Invalid event_type: {event_type}. "
                f"Must be one of: {', '.join(self.EVENT_TYPES.keys())}"
            )

        # Build URL
        url = f"{self.BASE_URL}/{event_type}/{month:02d}/{day:02d}"

        # Fetch with retry logic
        last_error = None
        for attempt in range(self.max_retries):
            try:
                client = await self._get_client()
                response = await client.get(url)

                # Handle HTTP errors
                if response.status_code == 404:
                    # Invalid date (e.g., Feb 30) - return empty data
                    logger.warning(f"Invalid date {month}/{day} - returning empty data")
                    return self._empty_response()

                if response.status_code == 429:
                    # Rate limited - retry with backoff
                    wait_time = (2 ** attempt) * 2  # 2s, 4s, 8s
                    logger.warning(
                        f"Rate limited by Wikipedia API, "
                        f"waiting {wait_time}s before retry {attempt + 1}/{self.max_retries}"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                # Raise for other HTTP errors
                response.raise_for_status()

                # Parse and return data
                data = response.json()
                return self._normalize_response(data)

            except httpx.TimeoutException as e:
                last_error = e
                wait_time = (2 ** attempt) * 1  # 1s, 2s, 4s
                logger.warning(
                    f"Request timeout, waiting {wait_time}s "
                    f"before retry {attempt + 1}/{self.max_retries}"
                )
                await asyncio.sleep(wait_time)
                continue

            except httpx.HTTPStatusError as e:
                # Don't retry for client errors (4xx except 429)
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    logger.error(f"Wikipedia API client error: {e}")
                    raise WikipediaFetchError(f"Wikipedia API error: {e}") from e
                # Retry for server errors (5xx)
                last_error = e
                wait_time = (2 ** attempt) * 2
                logger.warning(
                    f"Server error, waiting {wait_time}s "
                    f"before retry {attempt + 1}/{self.max_retries}"
                )
                await asyncio.sleep(wait_time)
                continue

            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error fetching Wikipedia data: {e}")
                raise WikipediaFetchError(f"Failed to fetch Wikipedia data: {e}") from e

        # All retries exhausted
        logger.error(
            f"Failed to fetch Wikipedia data after {self.max_retries} attempts: {last_error}"
        )
        raise WikipediaFetchError(
            f"Failed to fetch Wikipedia data after {self.max_retries} retries: {last_error}"
        ) from last_error

    async def fetch_on_this_day_for_date(
        self,
        target_date: date,
        event_type: str = "all"
    ) -> Dict[str, Any]:
        """
        Fetch "On This Day" events for a specific date

        Args:
            target_date: Date to fetch events for
            event_type: Type of events to fetch

        Returns:
            Dictionary containing event data
        """
        return await self.fetch_on_this_day(
            month=target_date.month,
            day=target_date.day,
            event_type=event_type
        )

    async def fetch_selected_events(
        self,
        month: int,
        day: int,
        max_events: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Fetch only the curated "selected" events for a date

        Args:
            month: Month (1-12)
            day: Day of month (1-31)
            max_events: Maximum number of events to return

        Returns:
            List of selected event dictionaries
        """
        data = await self.fetch_on_this_day(month, day, event_type="selected")
        events = data.get("selected", [])
        return events[:max_events]

    def _normalize_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize Wikipedia API response to consistent format

        Args:
            data: Raw API response

        Returns:
            Normalized data structure
        """
        # Wikipedia API returns data with different keys depending on endpoint
        # Normalize to always have all keys
        normalized = {
            "events": data.get("events", []),
            "births": data.get("births", []),
            "deaths": data.get("deaths", []),
            "holidays": data.get("holidays", []),
            "selected": data.get("selected", [])
        }

        # Clean up event data - extract essential fields
        for category in normalized:
            normalized[category] = [
                self._clean_event(event)
                for event in normalized[category]
            ]

        return normalized

    def _clean_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract essential fields from event data

        Args:
            event: Raw event dictionary

        Returns:
            Cleaned event with essential fields
        """
        # Extract year if present
        year = event.get("year")

        # Extract text description
        text = event.get("text", "")

        # Extract page links (for more info)
        pages = event.get("pages", [])
        page_titles = [page.get("title", "") for page in pages]

        # Get first page URL if available
        page_url = None
        if pages and len(pages) > 0:
            # Wikipedia mobile API provides content_urls
            page_url = pages[0].get("content_urls", {}).get("desktop", {}).get("page")

        return {
            "year": year,
            "text": text,
            "page_titles": page_titles,
            "page_url": page_url
        }

    def _empty_response(self) -> Dict[str, Any]:
        """Return empty response structure for invalid dates"""
        return {
            "events": [],
            "births": [],
            "deaths": [],
            "holidays": [],
            "selected": []
        }

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Singleton instance
_wikipedia_service: Optional[WikipediaService] = None


def get_wikipedia_service() -> WikipediaService:
    """
    Get the singleton WikipediaService instance

    Returns:
        WikipediaService instance
    """
    global _wikipedia_service
    if _wikipedia_service is None:
        _wikipedia_service = WikipediaService()
    return _wikipedia_service


async def cleanup_wikipedia_service():
    """Clean up the singleton instance"""
    global _wikipedia_service
    if _wikipedia_service is not None:
        await _wikipedia_service.close()
        _wikipedia_service = None
