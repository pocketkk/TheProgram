"""
New York Times API Service

Fetches news articles from the NYT Archive and Article Search APIs.
Provides historical news content for the Timeline newspaper feature.

API Documentation: https://developer.nytimes.com/apis
"""
import asyncio
import logging
from datetime import date, datetime
from typing import Dict, List, Any, Optional

import httpx

logger = logging.getLogger(__name__)


class NYTFetchError(Exception):
    """Exception raised when NYT API fetch fails"""
    pass


class NYTService:
    """
    Service for fetching news articles from NYT APIs.

    Uses two APIs depending on date:
    - Archive API: For historical articles (1851-present), returns entire month
    - Article Search API: For targeted searches by date

    Free tier: 500 requests/day, 5 requests/minute.

    Usage:
        service = NYTService(api_key="your-api-key")
        articles = await service.fetch_articles_for_date(year=1985, month=11, day=30)
    """

    ARCHIVE_URL = "https://api.nytimes.com/svc/archive/v1/{year}/{month}.json"
    SEARCH_URL = "https://api.nytimes.com/svc/search/v2/articlesearch.json"
    DEFAULT_TIMEOUT = 30.0  # Archive API can be slow
    MAX_RETRIES = 3

    # News desk values for filtering front page news
    FRONT_PAGE_DESKS = [
        "Foreign",
        "National",
        "Washington",
        "Business",
        "Science",
        "Metro",
        "Sports",
        "Politics"
    ]

    def __init__(
        self,
        api_key: str,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = MAX_RETRIES
    ):
        """
        Initialize NYT service

        Args:
            api_key: NYT API key (get from developer.nytimes.com)
            timeout: HTTP request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None
        self._archive_cache: Dict[str, List[Dict]] = {}  # Cache monthly archives

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
        self._archive_cache.clear()

    async def fetch_articles_for_date(
        self,
        year: int,
        month: int,
        day: int,
        limit: int = 20,
        use_archive: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Fetch NYT articles published on a specific date

        Args:
            year: Year (must be >= 1851)
            month: Month (1-12)
            day: Day of month (1-31)
            limit: Maximum number of articles to return
            use_archive: Use Archive API for historical dates (more complete)

        Returns:
            List of article dictionaries:
            [
                {
                    "headline": "Article Title",
                    "summary": "Article lead paragraph",
                    "section": "World",
                    "web_url": "https://...",
                    "publication_date": "1985-11-30",
                    "source": "nyt"
                }
            ]

        Raises:
            NYTFetchError: If fetch fails after retries
            ValueError: If date is before 1851
        """
        # NYT Archive goes back to 1851
        if year < 1851:
            logger.warning(f"NYT Archive only covers 1851+, returning empty for {year}")
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

        # Use Archive API for historical dates (more complete coverage)
        if use_archive:
            return await self._fetch_from_archive(year, month, day, limit)
        else:
            return await self._fetch_from_search(year, month, day, limit)

    async def _fetch_from_archive(
        self,
        year: int,
        month: int,
        day: int,
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Fetch articles from NYT Archive API (entire month, filter by day)

        The Archive API returns all articles for a given month.
        We filter to the specific day after fetching.
        """
        cache_key = f"{year}-{month:02d}"

        # Check cache first
        if cache_key not in self._archive_cache:
            # Fetch the entire month
            url = self.ARCHIVE_URL.format(year=year, month=month)
            params = {"api-key": self.api_key}

            last_error = None
            for attempt in range(self.max_retries):
                try:
                    client = await self._get_client()
                    response = await client.get(url, params=params)

                    if response.status_code == 401:
                        raise NYTFetchError(
                            "Invalid NYT API key. "
                            "Get one at https://developer.nytimes.com/"
                        )

                    if response.status_code == 429:
                        wait_time = (2 ** attempt) * 5  # Longer wait for NYT rate limits
                        logger.warning(
                            f"Rate limited by NYT API, "
                            f"waiting {wait_time}s before retry {attempt + 1}/{self.max_retries}"
                        )
                        await asyncio.sleep(wait_time)
                        continue

                    response.raise_for_status()

                    data = response.json()
                    docs = data.get("response", {}).get("docs", [])

                    # Cache the month's articles
                    self._archive_cache[cache_key] = docs
                    break

                except httpx.TimeoutException as e:
                    last_error = e
                    wait_time = (2 ** attempt) * 2
                    logger.warning(
                        f"NYT Archive timeout, waiting {wait_time}s "
                        f"before retry {attempt + 1}/{self.max_retries}"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                except httpx.HTTPStatusError as e:
                    if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                        logger.error(f"NYT API client error: {e}")
                        raise NYTFetchError(f"NYT API error: {e}") from e
                    last_error = e
                    wait_time = (2 ** attempt) * 3
                    logger.warning(
                        f"NYT server error, waiting {wait_time}s "
                        f"before retry {attempt + 1}/{self.max_retries}"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                except NYTFetchError:
                    raise

                except Exception as e:
                    last_error = e
                    logger.error(f"Unexpected error fetching NYT archive: {e}")
                    raise NYTFetchError(f"Failed to fetch NYT archive: {e}") from e
            else:
                # Loop completed without break (all retries failed)
                logger.error(
                    f"Failed to fetch NYT archive after {self.max_retries} attempts"
                )
                raise NYTFetchError(
                    f"Failed to fetch NYT archive after {self.max_retries} retries: {last_error}"
                ) from last_error

        # Filter cached articles to the specific day
        all_articles = self._archive_cache.get(cache_key, [])
        target_date_str = f"{year}-{month:02d}-{day:02d}"

        day_articles = []
        for article in all_articles:
            pub_date = article.get("pub_date", "")
            if pub_date.startswith(target_date_str):
                normalized = self._normalize_archive_article(article, target_date_str)
                # Prioritize front page articles
                if normalized.get("is_front_page"):
                    day_articles.insert(0, normalized)
                else:
                    day_articles.append(normalized)

        return day_articles[:limit]

    async def _fetch_from_search(
        self,
        year: int,
        month: int,
        day: int,
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Fetch articles from NYT Article Search API (more targeted)
        """
        target_date = date(year, month, day)
        date_str = target_date.strftime("%Y%m%d")

        params = {
            "api-key": self.api_key,
            "begin_date": date_str,
            "end_date": date_str,
            "sort": "relevance",
            "page": 0,
            "fl": "headline,lead_paragraph,abstract,web_url,pub_date,section_name,news_desk,byline"
        }

        last_error = None
        for attempt in range(self.max_retries):
            try:
                client = await self._get_client()
                response = await client.get(self.SEARCH_URL, params=params)

                if response.status_code == 401:
                    raise NYTFetchError(
                        "Invalid NYT API key. "
                        "Get one at https://developer.nytimes.com/"
                    )

                if response.status_code == 429:
                    wait_time = (2 ** attempt) * 5
                    logger.warning(
                        f"Rate limited by NYT API, "
                        f"waiting {wait_time}s before retry {attempt + 1}/{self.max_retries}"
                    )
                    await asyncio.sleep(wait_time)
                    continue

                response.raise_for_status()

                data = response.json()
                docs = data.get("response", {}).get("docs", [])

                return [
                    self._normalize_search_article(article, target_date.isoformat())
                    for article in docs[:limit]
                ]

            except httpx.TimeoutException as e:
                last_error = e
                wait_time = (2 ** attempt) * 2
                logger.warning(
                    f"NYT Search timeout, waiting {wait_time}s "
                    f"before retry {attempt + 1}/{self.max_retries}"
                )
                await asyncio.sleep(wait_time)
                continue

            except httpx.HTTPStatusError as e:
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    logger.error(f"NYT API client error: {e}")
                    raise NYTFetchError(f"NYT API error: {e}") from e
                last_error = e
                wait_time = (2 ** attempt) * 3
                logger.warning(
                    f"NYT server error, waiting {wait_time}s "
                    f"before retry {attempt + 1}/{self.max_retries}"
                )
                await asyncio.sleep(wait_time)
                continue

            except NYTFetchError:
                raise

            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error in NYT search: {e}")
                raise NYTFetchError(f"Failed to search NYT: {e}") from e

        logger.error(
            f"Failed to search NYT after {self.max_retries} attempts"
        )
        raise NYTFetchError(
            f"Failed to search NYT after {self.max_retries} retries: {last_error}"
        ) from last_error

    async def fetch_front_page(
        self,
        year: int,
        month: int,
        day: int,
        max_articles: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetch front page headlines for a specific date

        Prioritizes major news desks and print_page == "1" articles.

        Args:
            year: Year (must be >= 1851)
            month: Month (1-12)
            day: Day of month (1-31)
            max_articles: Maximum number of headlines to return

        Returns:
            List of front page article dictionaries
        """
        # Get articles, they'll be sorted with front page first
        articles = await self.fetch_articles_for_date(
            year, month, day,
            limit=max_articles * 3  # Fetch extra to filter
        )

        # Filter to likely front page articles
        front_page = [a for a in articles if a.get("is_front_page")]

        if len(front_page) >= max_articles:
            return front_page[:max_articles]

        # Supplement with other major news
        remaining = max_articles - len(front_page)
        major_news = [
            a for a in articles
            if not a.get("is_front_page") and a.get("news_desk") in self.FRONT_PAGE_DESKS
        ]

        return front_page + major_news[:remaining]

    def _normalize_archive_article(
        self,
        article: Dict[str, Any],
        pub_date: str
    ) -> Dict[str, Any]:
        """
        Normalize NYT Archive article to standard format
        """
        headline_obj = article.get("headline", {})
        headline = (
            headline_obj.get("main") or
            headline_obj.get("print_headline") or
            "Untitled Article"
        )

        summary = (
            article.get("lead_paragraph") or
            article.get("abstract") or
            article.get("snippet") or
            ""
        )

        # Check if likely front page
        print_page = article.get("print_page", "")
        news_desk = article.get("news_desk", "")
        is_front_page = (
            print_page == "1" or
            news_desk in self.FRONT_PAGE_DESKS
        )

        # Extract keywords
        keywords = [
            kw.get("value", "")
            for kw in article.get("keywords", [])[:5]
        ]

        byline = article.get("byline", {})
        byline_text = byline.get("original", "") if isinstance(byline, dict) else ""

        return {
            "headline": headline,
            "summary": summary,
            "section": article.get("section_name", ""),
            "news_desk": news_desk,
            "web_url": article.get("web_url", ""),
            "publication_date": pub_date,
            "byline": byline_text,
            "keywords": keywords,
            "is_front_page": is_front_page,
            "source": "nyt"
        }

    def _normalize_search_article(
        self,
        article: Dict[str, Any],
        pub_date: str
    ) -> Dict[str, Any]:
        """
        Normalize NYT Search article to standard format
        """
        headline_obj = article.get("headline", {})
        headline = (
            headline_obj.get("main") or
            headline_obj.get("print_headline") or
            "Untitled Article"
        )

        summary = (
            article.get("lead_paragraph") or
            article.get("abstract") or
            ""
        )

        news_desk = article.get("news_desk", "")
        is_front_page = news_desk in self.FRONT_PAGE_DESKS

        byline = article.get("byline", {})
        byline_text = byline.get("original", "") if isinstance(byline, dict) else ""

        return {
            "headline": headline,
            "summary": summary,
            "section": article.get("section_name", ""),
            "news_desk": news_desk,
            "web_url": article.get("web_url", ""),
            "publication_date": pub_date,
            "byline": byline_text,
            "keywords": [],
            "is_front_page": is_front_page,
            "source": "nyt"
        }

    def get_coverage_info(self) -> Dict[str, Any]:
        """
        Get information about NYT API coverage
        """
        return {
            "name": "New York Times",
            "source_id": "nyt",
            "start_year": 1851,
            "end_year": date.today().year,
            "rate_limit": {
                "requests_per_day": 500,
                "requests_per_minute": 5
            },
            "news_desks": self.FRONT_PAGE_DESKS,
            "api_url": "https://developer.nytimes.com/"
        }

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Factory function to create service with API key from config
def create_nyt_service(api_key: str) -> Optional[NYTService]:
    """
    Create NYT service if API key is provided

    Args:
        api_key: NYT API key

    Returns:
        NYTService instance or None if no API key
    """
    if api_key and api_key.strip():
        return NYTService(api_key=api_key.strip())
    return None
