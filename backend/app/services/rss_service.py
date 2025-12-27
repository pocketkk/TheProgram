"""
RSS Feed Service

Handles RSS/Atom feed parsing, fetching, and management.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
import asyncio
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field

import feedparser
import httpx
from sqlalchemy.orm import Session

from app.models import RssFeed, RssArticle
from app.core.datetime_helpers import now_iso

logger = logging.getLogger(__name__)


class RssServiceError(Exception):
    """Base exception for RSS service errors"""
    pass


class FeedFetchError(RssServiceError):
    """Error fetching feed from URL"""
    pass


class FeedParseError(RssServiceError):
    """Error parsing feed content"""
    pass


class OpmlParseError(RssServiceError):
    """Error parsing OPML content"""
    pass


@dataclass
class FeedDiscovery:
    """Discovered feed information"""
    url: str
    title: str
    description: Optional[str] = None
    site_url: Optional[str] = None
    icon_url: Optional[str] = None


@dataclass
class FeedRefreshResult:
    """Result of refreshing a single feed"""
    feed_id: str
    success: bool
    new_articles: int = 0
    error: Optional[str] = None


@dataclass
class ParsedArticle:
    """Parsed article from RSS feed"""
    guid: str
    url: str
    title: str
    author: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    published_at: Optional[str] = None
    categories: List[str] = field(default_factory=list)


class RssService:
    """
    Service for RSS/Atom feed management.

    Features:
    - Feed discovery and validation
    - Article fetching and parsing
    - OPML import/export
    - Feed health monitoring

    Usage:
        service = RssService()
        feed_info = await service.discover_feed("https://example.com/feed.xml")
        result = await service.refresh_feed(db, feed_id)
    """

    DEFAULT_TIMEOUT = 30.0
    DEFAULT_USER_AGENT = "CosmicChronicle/1.0 (+https://github.com/theprogram)"

    def __init__(self, timeout: float = DEFAULT_TIMEOUT):
        """Initialize RSS service"""
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={"User-Agent": self.DEFAULT_USER_AGENT},
                follow_redirects=True
            )
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def discover_feed(self, url: str) -> FeedDiscovery:
        """
        Discover and validate an RSS/Atom feed.

        Args:
            url: Feed URL to discover

        Returns:
            FeedDiscovery with feed metadata

        Raises:
            FeedFetchError: If feed cannot be fetched
            FeedParseError: If feed cannot be parsed
        """
        client = await self._get_client()

        try:
            response = await client.get(url)
            response.raise_for_status()
            content = response.text
        except httpx.HTTPStatusError as e:
            raise FeedFetchError(f"HTTP {e.response.status_code}: {e.response.reason_phrase}")
        except httpx.RequestError as e:
            raise FeedFetchError(f"Request failed: {str(e)}")

        # Parse the feed
        parsed = feedparser.parse(content)

        if parsed.bozo and not parsed.entries:
            error_msg = str(parsed.bozo_exception) if parsed.bozo_exception else "Unknown parse error"
            raise FeedParseError(f"Failed to parse feed: {error_msg}")

        feed = parsed.feed

        # Extract feed metadata
        title = feed.get("title", "Untitled Feed")
        description = feed.get("description") or feed.get("subtitle")
        site_url = feed.get("link")

        # Try to get icon
        icon_url = None
        if hasattr(feed, "image") and feed.image:
            icon_url = feed.image.get("href") or feed.image.get("url")

        return FeedDiscovery(
            url=url,
            title=title,
            description=description,
            site_url=site_url,
            icon_url=icon_url
        )

    def _parse_entry(self, entry: Any, feed_url: str) -> ParsedArticle:
        """Parse a single feed entry into an article"""
        # Get GUID (fall back to link if no id)
        guid = entry.get("id") or entry.get("link") or entry.get("title", "")

        # Get URL
        url = entry.get("link", "")
        if not url and entry.get("links"):
            for link in entry.links:
                if link.get("rel") == "alternate" or link.get("type") == "text/html":
                    url = link.get("href", "")
                    break

        # Get title
        title = entry.get("title", "Untitled")

        # Get author
        author = None
        if entry.get("author"):
            author = entry.author
        elif entry.get("author_detail"):
            author = entry.author_detail.get("name")

        # Get summary and content
        summary = None
        content = None

        if entry.get("summary"):
            summary = entry.summary

        if entry.get("content"):
            # Get the best content (prefer HTML)
            for c in entry.content:
                if c.get("type") in ("text/html", "html"):
                    content = c.get("value")
                    break
            if not content and entry.content:
                content = entry.content[0].get("value")

        # Get image
        image_url = None
        if entry.get("media_thumbnail"):
            image_url = entry.media_thumbnail[0].get("url")
        elif entry.get("media_content"):
            for media in entry.media_content:
                if media.get("medium") == "image":
                    image_url = media.get("url")
                    break
        elif entry.get("enclosures"):
            for enc in entry.enclosures:
                if enc.get("type", "").startswith("image/"):
                    image_url = enc.get("href")
                    break

        # Get published date
        published_at = None
        if entry.get("published_parsed"):
            try:
                dt = datetime(*entry.published_parsed[:6])
                published_at = dt.isoformat() + "Z"
            except (TypeError, ValueError):
                pass
        elif entry.get("updated_parsed"):
            try:
                dt = datetime(*entry.updated_parsed[:6])
                published_at = dt.isoformat() + "Z"
            except (TypeError, ValueError):
                pass

        # Get categories
        categories = []
        if entry.get("tags"):
            categories = [tag.get("term", "") for tag in entry.tags if tag.get("term")]

        return ParsedArticle(
            guid=guid,
            url=url,
            title=title,
            author=author,
            summary=summary,
            content=content,
            image_url=image_url,
            published_at=published_at,
            categories=categories
        )

    async def fetch_articles(self, url: str, limit: int = 50) -> List[ParsedArticle]:
        """
        Fetch and parse articles from a feed URL.

        Args:
            url: Feed URL
            limit: Maximum articles to return

        Returns:
            List of ParsedArticle objects
        """
        client = await self._get_client()

        try:
            response = await client.get(url)
            response.raise_for_status()
            content = response.text
        except httpx.HTTPStatusError as e:
            raise FeedFetchError(f"HTTP {e.response.status_code}: {e.response.reason_phrase}")
        except httpx.RequestError as e:
            raise FeedFetchError(f"Request failed: {str(e)}")

        # Parse the feed
        parsed = feedparser.parse(content)

        if parsed.bozo and not parsed.entries:
            error_msg = str(parsed.bozo_exception) if parsed.bozo_exception else "Unknown parse error"
            raise FeedParseError(f"Failed to parse feed: {error_msg}")

        # Parse entries
        articles = []
        for entry in parsed.entries[:limit]:
            try:
                article = self._parse_entry(entry, url)
                articles.append(article)
            except Exception as e:
                logger.warning(f"Failed to parse entry: {e}")
                continue

        return articles

    async def refresh_feed(
        self,
        db: Session,
        feed: RssFeed,
        max_articles: int = 50
    ) -> FeedRefreshResult:
        """
        Refresh a single feed and save new articles.

        Args:
            db: Database session
            feed: Feed to refresh
            max_articles: Maximum new articles to save

        Returns:
            FeedRefreshResult with refresh status
        """
        try:
            articles = await self.fetch_articles(feed.url, limit=max_articles)

            # Get existing GUIDs for this feed
            existing_guids = set(
                db.query(RssArticle.guid)
                .filter(RssArticle.feed_id == feed.id)
                .all()
            )
            existing_guids = {g[0] for g in existing_guids}

            # Add new articles
            new_count = 0
            for article in articles:
                if article.guid in existing_guids:
                    continue

                new_article = RssArticle(
                    feed_id=feed.id,
                    guid=article.guid,
                    url=article.url,
                    title=article.title,
                    author=article.author,
                    summary=article.summary,
                    content=article.content,
                    image_url=article.image_url,
                    published_at=article.published_at,
                    categories=article.categories
                )
                db.add(new_article)
                new_count += 1

            # Update feed status
            total_count = db.query(RssArticle).filter(RssArticle.feed_id == feed.id).count()
            feed.mark_success(total_count + new_count)

            db.commit()

            logger.info(f"Refreshed feed '{feed.title}': {new_count} new articles")

            return FeedRefreshResult(
                feed_id=feed.id,
                success=True,
                new_articles=new_count
            )

        except RssServiceError as e:
            feed.mark_error(str(e))
            db.commit()

            return FeedRefreshResult(
                feed_id=feed.id,
                success=False,
                error=str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error refreshing feed: {e}")
            feed.mark_error(f"Unexpected error: {str(e)}")
            db.commit()

            return FeedRefreshResult(
                feed_id=feed.id,
                success=False,
                error=str(e)
            )

    async def refresh_all_feeds(
        self,
        db: Session,
        force: bool = False
    ) -> List[FeedRefreshResult]:
        """
        Refresh all active feeds that need updating.

        Args:
            db: Database session
            force: If True, refresh all feeds regardless of interval

        Returns:
            List of FeedRefreshResult for each feed
        """
        # Get feeds to refresh
        query = db.query(RssFeed).filter(RssFeed.is_active == True)
        feeds = query.all()

        if not force:
            feeds = [f for f in feeds if f.needs_refresh]

        logger.info(f"Refreshing {len(feeds)} feeds")

        results = []
        for feed in feeds:
            result = await self.refresh_feed(db, feed)
            results.append(result)

        return results

    # =========================================================================
    # OPML Import/Export
    # =========================================================================

    def parse_opml(self, opml_content: str) -> List[Dict[str, Any]]:
        """
        Parse OPML content to extract feeds.

        Args:
            opml_content: Raw OPML XML string

        Returns:
            List of feed dictionaries with url, title, category

        Raises:
            OpmlParseError: If OPML cannot be parsed
        """
        try:
            root = ET.fromstring(opml_content)
        except ET.ParseError as e:
            raise OpmlParseError(f"Invalid XML: {e}")

        feeds = []

        # Find all outline elements with xmlUrl attribute (these are feeds)
        def process_outlines(parent, category=None):
            for outline in parent.findall("outline"):
                xml_url = outline.get("xmlUrl")

                if xml_url:
                    # This is a feed
                    feeds.append({
                        "url": xml_url,
                        "title": outline.get("title") or outline.get("text", "Untitled"),
                        "site_url": outline.get("htmlUrl"),
                        "category": category
                    })
                else:
                    # This might be a category
                    cat_name = outline.get("title") or outline.get("text")
                    process_outlines(outline, cat_name)

        body = root.find("body")
        if body is not None:
            process_outlines(body)

        return feeds

    def generate_opml(self, feeds: List[RssFeed]) -> str:
        """
        Generate OPML content from feeds.

        Args:
            feeds: List of RssFeed objects

        Returns:
            OPML XML string
        """
        root = ET.Element("opml", version="2.0")

        # Head
        head = ET.SubElement(root, "head")
        title = ET.SubElement(head, "title")
        title.text = "Cosmic Chronicle Subscriptions"
        date_created = ET.SubElement(head, "dateCreated")
        date_created.text = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")

        # Body
        body = ET.SubElement(root, "body")

        # Group by category
        categories: Dict[Optional[str], List[RssFeed]] = {}
        for feed in feeds:
            cat = feed.category or "Uncategorized"
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(feed)

        # Create outlines
        for category, cat_feeds in sorted(categories.items()):
            cat_outline = ET.SubElement(body, "outline", text=category)

            for feed in cat_feeds:
                attrs = {
                    "type": "rss",
                    "text": feed.title,
                    "title": feed.title,
                    "xmlUrl": feed.url
                }
                if feed.site_url:
                    attrs["htmlUrl"] = feed.site_url
                ET.SubElement(cat_outline, "outline", **attrs)

        # Convert to string with declaration
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")

    async def import_opml(
        self,
        db: Session,
        opml_content: str
    ) -> Tuple[List[RssFeed], int, List[str]]:
        """
        Import feeds from OPML content.

        Args:
            db: Database session
            opml_content: Raw OPML XML string

        Returns:
            Tuple of (imported_feeds, skipped_count, errors)
        """
        parsed_feeds = self.parse_opml(opml_content)

        imported = []
        skipped = 0
        errors = []

        # Get existing feed URLs
        existing_urls = set(
            url[0] for url in db.query(RssFeed.url).all()
        )

        for feed_data in parsed_feeds:
            url = feed_data["url"]

            # Skip duplicates
            if url in existing_urls:
                skipped += 1
                continue

            # Validate feed
            try:
                discovery = await self.discover_feed(url)

                # Create feed
                new_feed = RssFeed(
                    url=url,
                    title=feed_data.get("title") or discovery.title,
                    description=discovery.description,
                    site_url=feed_data.get("site_url") or discovery.site_url,
                    icon_url=discovery.icon_url,
                    category=feed_data.get("category")
                )
                db.add(new_feed)
                imported.append(new_feed)
                existing_urls.add(url)

            except RssServiceError as e:
                errors.append(f"{url}: {str(e)}")
                continue

        db.commit()

        return imported, skipped, errors

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Singleton instance
_rss_service: Optional[RssService] = None


def get_rss_service() -> RssService:
    """Get singleton RSS service instance"""
    global _rss_service
    if _rss_service is None:
        _rss_service = RssService()
    return _rss_service


async def close_rss_service():
    """Close the singleton RSS service"""
    global _rss_service
    if _rss_service:
        await _rss_service.close()
        _rss_service = None
