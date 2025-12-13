"""
RSS Feed Service

Handles RSS feed parsing, caching, and date-based filtering
for personalized Cosmic Paper content.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)


class RssServiceError(Exception):
    """Base exception for RSS service errors"""
    pass


class FeedFetchError(RssServiceError):
    """Raised when feed fetching fails"""
    pass


class FeedParseError(RssServiceError):
    """Raised when feed parsing fails"""
    pass


@dataclass
class RssEntry:
    """Parsed RSS entry"""
    guid: str
    title: str
    link: Optional[str]
    summary: Optional[str]
    content: Optional[str]
    author: Optional[str]
    published_at: Optional[datetime]
    published_date: Optional[str]  # YYYY-MM-DD
    categories: List[str] = field(default_factory=list)
    image_url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "guid": self.guid,
            "title": self.title,
            "link": self.link,
            "summary": self.summary,
            "content": self.content,
            "author": self.author,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "published_date": self.published_date,
            "categories": self.categories,
            "image_url": self.image_url
        }

    def to_article_dict(self, feed_name: str = "RSS") -> Dict[str, Any]:
        """Convert to newspaper article format"""
        return {
            "headline": self.title,
            "content": self.summary or self.content or "",
            "year": int(self.published_date[:4]) if self.published_date else None,
            "source": "rss",
            "source_name": feed_name,
            "link": self.link,
            "significance": f"From {feed_name}"
        }


@dataclass
class FeedResult:
    """Result of fetching a feed"""
    feed_url: str
    feed_name: str
    entries: List[RssEntry] = field(default_factory=list)
    error: Optional[str] = None
    fetched_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def success(self) -> bool:
        return self.error is None

    @property
    def entry_count(self) -> int:
        return len(self.entries)


class RssService:
    """
    RSS feed service for fetching and parsing RSS/Atom feeds.

    Supports:
    - Standard RSS 2.0 and Atom feeds
    - Date-based filtering
    - Caching of entries
    - Historical date matching

    Usage:
        service = RssService()
        result = await service.fetch_feed("https://example.com/rss.xml")
        entries = result.entries

        # Filter by date
        filtered = service.filter_by_date(entries, "2024-01-15")
    """

    DEFAULT_TIMEOUT = 30.0
    MAX_ENTRIES_PER_FEED = 100
    USER_AGENT = "TheProgram/1.0 (Cosmic Paper RSS Reader)"

    def __init__(self, timeout: float = DEFAULT_TIMEOUT):
        """
        Initialize RSS service.

        Args:
            timeout: HTTP request timeout in seconds
        """
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={"User-Agent": self.USER_AGENT},
                follow_redirects=True
            )
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def fetch_feed(
        self,
        url: str,
        feed_name: Optional[str] = None
    ) -> FeedResult:
        """
        Fetch and parse an RSS/Atom feed.

        Args:
            url: Feed URL
            feed_name: Optional name for the feed

        Returns:
            FeedResult with parsed entries or error
        """
        try:
            # Import feedparser (lazy import for optional dependency)
            try:
                import feedparser
            except ImportError:
                raise FeedParseError(
                    "feedparser package required. Install with: pip install feedparser"
                )

            # Fetch feed content
            client = await self._get_client()
            response = await client.get(url)
            response.raise_for_status()

            # Parse feed
            feed = feedparser.parse(response.text)

            if feed.bozo and feed.bozo_exception:
                # Feed has parse errors but may still have usable content
                logger.warning(f"Feed {url} has parse issues: {feed.bozo_exception}")

            # Extract feed name
            if not feed_name:
                feed_name = feed.feed.get('title', url)

            # Parse entries
            entries = []
            for entry in feed.entries[:self.MAX_ENTRIES_PER_FEED]:
                parsed = self._parse_entry(entry)
                if parsed:
                    entries.append(parsed)

            return FeedResult(
                feed_url=url,
                feed_name=feed_name,
                entries=entries
            )

        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.reason_phrase}"
            logger.error(f"Feed fetch error for {url}: {error_msg}")
            return FeedResult(
                feed_url=url,
                feed_name=feed_name or url,
                error=error_msg
            )
        except httpx.RequestError as e:
            error_msg = f"Request failed: {str(e)}"
            logger.error(f"Feed fetch error for {url}: {error_msg}")
            return FeedResult(
                feed_url=url,
                feed_name=feed_name or url,
                error=error_msg
            )
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"Feed error for {url}: {error_msg}")
            return FeedResult(
                feed_url=url,
                feed_name=feed_name or url,
                error=error_msg
            )

    def _parse_entry(self, entry: Any) -> Optional[RssEntry]:
        """
        Parse a feedparser entry into RssEntry.

        Args:
            entry: feedparser entry object

        Returns:
            RssEntry or None if parsing fails
        """
        try:
            # Get GUID (use link as fallback)
            guid = entry.get('id') or entry.get('guid') or entry.get('link', '')
            if not guid:
                return None

            # Get title
            title = entry.get('title', 'Untitled')
            if not title:
                return None

            # Parse published date
            published_at = None
            published_date = None

            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6])
                    published_date = published_at.strftime('%Y-%m-%d')
                except Exception:
                    pass
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                try:
                    published_at = datetime(*entry.updated_parsed[:6])
                    published_date = published_at.strftime('%Y-%m-%d')
                except Exception:
                    pass

            # Get content
            summary = entry.get('summary')
            content = None
            if entry.get('content'):
                content = entry['content'][0].get('value') if entry['content'] else None

            # Get categories
            categories = []
            if entry.get('tags'):
                categories = [
                    t.get('term', '') for t in entry.get('tags', [])
                    if t.get('term')
                ]

            # Get image URL from various common locations
            image_url = self._extract_image_url(entry)

            return RssEntry(
                guid=guid,
                title=title,
                link=entry.get('link'),
                summary=summary,
                content=content,
                author=entry.get('author'),
                published_at=published_at,
                published_date=published_date,
                categories=categories,
                image_url=image_url
            )

        except Exception as e:
            logger.warning(f"Failed to parse entry: {e}")
            return None

    def _extract_image_url(self, entry: Any) -> Optional[str]:
        """Extract image URL from feed entry"""
        # Check media:content
        if entry.get('media_content'):
            for media in entry.get('media_content', []):
                if media.get('type', '').startswith('image') or media.get('medium') == 'image':
                    return media.get('url')

        # Check media:thumbnail
        if entry.get('media_thumbnail'):
            thumbnails = entry.get('media_thumbnail', [])
            if thumbnails:
                return thumbnails[0].get('url')

        # Check enclosures
        if entry.get('enclosures'):
            for enc in entry.get('enclosures', []):
                if enc.get('type', '').startswith('image'):
                    return enc.get('href') or enc.get('url')

        # Check for image in content
        if entry.get('content'):
            content = entry['content'][0].get('value', '') if entry['content'] else ''
            import re
            img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content)
            if img_match:
                return img_match.group(1)

        return None

    def filter_by_date(
        self,
        entries: List[RssEntry],
        target_date: str,
        tolerance_days: int = 0
    ) -> List[RssEntry]:
        """
        Filter entries by publication date.

        Args:
            entries: List of RSS entries
            target_date: Target date (YYYY-MM-DD)
            tolerance_days: Number of days tolerance (0 = exact match)

        Returns:
            Filtered list of entries matching the date
        """
        if not entries:
            return []

        try:
            target = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            logger.error(f"Invalid date format: {target_date}")
            return []

        filtered = []
        for entry in entries:
            if not entry.published_date:
                continue

            try:
                entry_date = datetime.strptime(entry.published_date, '%Y-%m-%d').date()
                diff = abs((entry_date - target).days)
                if diff <= tolerance_days:
                    filtered.append(entry)
            except ValueError:
                continue

        return filtered

    def filter_by_month_day(
        self,
        entries: List[RssEntry],
        month: int,
        day: int
    ) -> List[RssEntry]:
        """
        Filter entries by month and day (ignoring year).

        Useful for "on this day" style matching across years.

        Args:
            entries: List of RSS entries
            month: Target month (1-12)
            day: Target day (1-31)

        Returns:
            Filtered list of entries matching the month/day
        """
        if not entries:
            return []

        filtered = []
        for entry in entries:
            if not entry.published_date:
                continue

            try:
                entry_date = datetime.strptime(entry.published_date, '%Y-%m-%d').date()
                if entry_date.month == month and entry_date.day == day:
                    filtered.append(entry)
            except ValueError:
                continue

        return filtered

    async def fetch_multiple_feeds(
        self,
        feeds: List[Dict[str, str]],
        concurrency: int = 5
    ) -> List[FeedResult]:
        """
        Fetch multiple feeds concurrently.

        Args:
            feeds: List of {"url": "...", "name": "..."} dicts
            concurrency: Maximum concurrent requests

        Returns:
            List of FeedResults
        """
        semaphore = asyncio.Semaphore(concurrency)

        async def fetch_with_semaphore(feed: Dict[str, str]) -> FeedResult:
            async with semaphore:
                return await self.fetch_feed(
                    url=feed.get('url', ''),
                    feed_name=feed.get('name')
                )

        tasks = [fetch_with_semaphore(f) for f in feeds]
        return await asyncio.gather(*tasks)

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Singleton instance
_rss_service: Optional[RssService] = None


def get_rss_service() -> RssService:
    """Get or create RSS service singleton"""
    global _rss_service
    if _rss_service is None:
        _rss_service = RssService()
    return _rss_service
