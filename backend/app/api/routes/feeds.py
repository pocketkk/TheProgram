"""
RSS Feed management endpoints

CRUD operations for RSS feeds and articles.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models import RssFeed, RssArticle
from app.schemas.rss import (
    RssFeedCreate,
    RssFeedUpdate,
    RssFeedResponse,
    RssFeedListResponse,
    RssFeedDiscovery,
    RssArticleResponse,
    RssArticleWithFeed,
    RssArticleListResponse,
    RssArticleMarkReadRequest,
    RssArticleRecordReadingRequest,
    OpmlImportRequest,
    OpmlImportResponse,
    OpmlExportResponse,
    FeedRefreshRequest,
    FeedRefreshResponse,
    FeedRefreshResult,
)
from app.schemas.common import Message
from app.services.rss_service import get_rss_service, RssServiceError

router = APIRouter()


# =============================================================================
# Feed Management
# =============================================================================

@router.post("/feeds", response_model=RssFeedResponse, status_code=status.HTTP_201_CREATED)
async def create_feed(
    feed_in: RssFeedCreate,
    db: Session = Depends(get_db)
):
    """
    Subscribe to a new RSS feed.

    Validates the feed URL and creates a new subscription.

    Args:
        feed_in: Feed creation data
        db: Database session

    Returns:
        Created feed subscription

    Raises:
        HTTPException 400: If feed URL is invalid or already subscribed
    """
    # Check for duplicate URL
    existing = db.query(RssFeed).filter(RssFeed.url == feed_in.url).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already subscribed to this feed"
        )

    # Validate and discover feed
    rss_service = get_rss_service()
    try:
        discovery = await rss_service.discover_feed(feed_in.url)
    except RssServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid feed: {str(e)}"
        )

    # Create feed
    feed = RssFeed(
        url=feed_in.url,
        title=feed_in.title or discovery.title,
        description=feed_in.description or discovery.description,
        site_url=feed_in.site_url or discovery.site_url,
        icon_url=feed_in.icon_url or discovery.icon_url,
        category=feed_in.category,
        fetch_interval_minutes=feed_in.fetch_interval_minutes
    )

    db.add(feed)
    db.commit()
    db.refresh(feed)

    return feed


@router.get("/feeds", response_model=RssFeedListResponse)
async def list_feeds(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """
    List all RSS feed subscriptions.

    Returns all feeds with optional filtering.

    Args:
        category: Optional category filter
        is_active: Optional active status filter
        db: Database session

    Returns:
        List of feeds
    """
    query = db.query(RssFeed)

    if category:
        query = query.filter(RssFeed.category == category)
    if is_active is not None:
        query = query.filter(RssFeed.is_active == is_active)

    query = query.order_by(RssFeed.title)
    feeds = query.all()

    return RssFeedListResponse(
        feeds=feeds,
        total=len(feeds)
    )


@router.get("/feeds/{feed_id}", response_model=RssFeedResponse)
async def get_feed(
    feed_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get feed by ID.

    Args:
        feed_id: Feed ID
        db: Database session

    Returns:
        Feed details

    Raises:
        HTTPException 404: If feed not found
    """
    feed = db.query(RssFeed).filter(RssFeed.id == str(feed_id)).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found"
        )
    return feed


@router.put("/feeds/{feed_id}", response_model=RssFeedResponse)
async def update_feed(
    feed_id: UUID,
    feed_in: RssFeedUpdate,
    db: Session = Depends(get_db)
):
    """
    Update feed settings.

    Args:
        feed_id: Feed ID
        feed_in: Update data
        db: Database session

    Returns:
        Updated feed

    Raises:
        HTTPException 404: If feed not found
    """
    feed = db.query(RssFeed).filter(RssFeed.id == str(feed_id)).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found"
        )

    # Update fields
    update_data = feed_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(feed, field, value)

    db.commit()
    db.refresh(feed)

    return feed


@router.delete("/feeds/{feed_id}", response_model=Message)
async def delete_feed(
    feed_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Unsubscribe from a feed.

    Deletes the feed and all cached articles.

    Args:
        feed_id: Feed ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If feed not found
    """
    feed = db.query(RssFeed).filter(RssFeed.id == str(feed_id)).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found"
        )

    db.delete(feed)
    db.commit()

    return Message(message="Feed unsubscribed successfully")


@router.post("/feeds/discover", response_model=RssFeedDiscovery)
async def discover_feed(
    url: str = Body(..., embed=True, description="Feed URL to discover")
):
    """
    Discover and validate an RSS feed URL.

    Fetches the feed and extracts metadata without subscribing.

    Args:
        url: Feed URL to discover

    Returns:
        Discovered feed metadata

    Raises:
        HTTPException 400: If feed is invalid
    """
    rss_service = get_rss_service()
    try:
        discovery = await rss_service.discover_feed(url)
        return RssFeedDiscovery(
            url=discovery.url,
            title=discovery.title,
            description=discovery.description,
            site_url=discovery.site_url,
            icon_url=discovery.icon_url
        )
    except RssServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid feed: {str(e)}"
        )


@router.post("/feeds/{feed_id}/refresh", response_model=FeedRefreshResult)
async def refresh_feed(
    feed_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Refresh a single feed.

    Fetches new articles from the feed.

    Args:
        feed_id: Feed ID
        db: Database session

    Returns:
        Refresh result

    Raises:
        HTTPException 404: If feed not found
    """
    feed = db.query(RssFeed).filter(RssFeed.id == str(feed_id)).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found"
        )

    rss_service = get_rss_service()
    result = await rss_service.refresh_feed(db, feed)

    return FeedRefreshResult(
        feed_id=UUID(result.feed_id),
        success=result.success,
        new_articles=result.new_articles,
        error=result.error
    )


@router.post("/feeds/refresh-all", response_model=FeedRefreshResponse)
async def refresh_all_feeds(
    request: Optional[FeedRefreshRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Refresh all feeds (or specific feeds).

    Fetches new articles from all active feeds.

    Args:
        request: Optional request with specific feed IDs
        db: Database session

    Returns:
        Refresh results for all feeds
    """
    rss_service = get_rss_service()

    if request and request.feed_ids:
        # Refresh specific feeds
        results = []
        for feed_id in request.feed_ids:
            feed = db.query(RssFeed).filter(RssFeed.id == str(feed_id)).first()
            if feed:
                result = await rss_service.refresh_feed(db, feed)
                results.append(FeedRefreshResult(
                    feed_id=UUID(result.feed_id),
                    success=result.success,
                    new_articles=result.new_articles,
                    error=result.error
                ))
    else:
        # Refresh all feeds
        service_results = await rss_service.refresh_all_feeds(db)
        results = [
            FeedRefreshResult(
                feed_id=UUID(r.feed_id),
                success=r.success,
                new_articles=r.new_articles,
                error=r.error
            )
            for r in service_results
        ]

    total_new = sum(r.new_articles for r in results)

    return FeedRefreshResponse(
        results=results,
        total_new_articles=total_new
    )


@router.get("/feeds/categories/all", response_model=List[str])
async def get_all_categories(db: Session = Depends(get_db)):
    """
    Get all unique feed categories.

    Returns:
        List of unique categories
    """
    categories = db.query(RssFeed.category).distinct().all()
    return sorted([cat for (cat,) in categories if cat])


# =============================================================================
# Articles
# =============================================================================

@router.get("/articles", response_model=RssArticleListResponse)
async def list_articles(
    feed_id: Optional[UUID] = Query(None, description="Filter by feed"),
    category: Optional[str] = Query(None, description="Filter by feed category"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(None, description="Filter by starred status"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    List articles with optional filters.

    Returns articles from all feeds or filtered.

    Args:
        feed_id: Optional feed filter
        category: Optional category filter
        is_read: Optional read status filter
        is_starred: Optional starred status filter
        limit: Maximum results
        offset: Pagination offset
        db: Database session

    Returns:
        List of articles with feed info
    """
    query = db.query(RssArticle).join(RssFeed)

    if feed_id:
        query = query.filter(RssArticle.feed_id == str(feed_id))
    if category:
        query = query.filter(RssFeed.category == category)
    if is_read is not None:
        query = query.filter(RssArticle.is_read == is_read)
    if is_starred is not None:
        query = query.filter(RssArticle.is_starred == is_starred)

    # Get total and unread counts
    total = query.count()
    unread_count = query.filter(RssArticle.is_read == False).count()

    # Order by published date descending
    query = query.order_by(desc(RssArticle.published_at), desc(RssArticle.created_at))
    articles = query.offset(offset).limit(limit).all()

    # Build response with feed info
    articles_with_feed = []
    for article in articles:
        article_dict = article.to_dict()
        article_dict['feed_title'] = article.feed.title
        article_dict['feed_icon_url'] = article.feed.icon_url
        article_dict['feed_category'] = article.feed.category
        articles_with_feed.append(article_dict)

    return RssArticleListResponse(
        articles=articles_with_feed,
        total=total,
        unread_count=unread_count
    )


@router.get("/articles/{article_id}", response_model=RssArticleWithFeed)
async def get_article(
    article_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get article by ID.

    Args:
        article_id: Article ID
        db: Database session

    Returns:
        Article with feed info

    Raises:
        HTTPException 404: If article not found
    """
    article = db.query(RssArticle).filter(RssArticle.id == str(article_id)).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    article_dict = article.to_dict()
    article_dict['feed_title'] = article.feed.title
    article_dict['feed_icon_url'] = article.feed.icon_url
    article_dict['feed_category'] = article.feed.category

    return article_dict


@router.post("/articles/{article_id}/read", response_model=RssArticleResponse)
async def mark_article_read(
    article_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Mark article as read.

    Args:
        article_id: Article ID
        db: Database session

    Returns:
        Updated article

    Raises:
        HTTPException 404: If article not found
    """
    article = db.query(RssArticle).filter(RssArticle.id == str(article_id)).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    article.mark_read()
    db.commit()
    db.refresh(article)

    return article


@router.post("/articles/mark-read", response_model=Message)
async def mark_articles_read(
    request: RssArticleMarkReadRequest,
    db: Session = Depends(get_db)
):
    """
    Mark multiple articles as read.

    Args:
        request: Article IDs to mark as read
        db: Database session

    Returns:
        Success message
    """
    article_ids = [str(aid) for aid in request.article_ids]
    db.query(RssArticle).filter(RssArticle.id.in_(article_ids)).update(
        {"is_read": True},
        synchronize_session=False
    )
    db.commit()

    return Message(message=f"Marked {len(article_ids)} articles as read")


@router.post("/articles/{article_id}/star", response_model=RssArticleResponse)
async def toggle_article_star(
    article_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Toggle article starred status.

    Args:
        article_id: Article ID
        db: Database session

    Returns:
        Updated article

    Raises:
        HTTPException 404: If article not found
    """
    article = db.query(RssArticle).filter(RssArticle.id == str(article_id)).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    article.toggle_star()
    db.commit()
    db.refresh(article)

    return article


@router.post("/articles/{article_id}/reading", response_model=RssArticleResponse)
async def record_article_reading(
    article_id: UUID,
    request: RssArticleRecordReadingRequest,
    db: Session = Depends(get_db)
):
    """
    Record reading behavior for the personal algorithm.

    Args:
        article_id: Article ID
        request: Reading behavior data
        db: Database session

    Returns:
        Updated article

    Raises:
        HTTPException 404: If article not found
    """
    article = db.query(RssArticle).filter(RssArticle.id == str(article_id)).first()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    article.record_reading(request.time_spent_seconds, request.scroll_depth_pct)
    article.mark_read()  # Also mark as read
    db.commit()
    db.refresh(article)

    return article


# =============================================================================
# OPML Import/Export
# =============================================================================

@router.post("/feeds/import-opml", response_model=OpmlImportResponse)
async def import_opml(
    request: OpmlImportRequest,
    db: Session = Depends(get_db)
):
    """
    Import feeds from OPML content.

    Parses OPML and subscribes to all feeds.

    Args:
        request: OPML content
        db: Database session

    Returns:
        Import results

    Raises:
        HTTPException 400: If OPML is invalid
    """
    rss_service = get_rss_service()

    try:
        imported, skipped, errors = await rss_service.import_opml(
            db, request.opml_content
        )
    except RssServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OPML: {str(e)}"
        )

    return OpmlImportResponse(
        imported=len(imported),
        skipped=skipped,
        errors=errors,
        feeds=imported
    )


@router.get("/feeds/export-opml", response_model=OpmlExportResponse)
async def export_opml(db: Session = Depends(get_db)):
    """
    Export all feeds as OPML.

    Generates OPML file content for all subscriptions.

    Args:
        db: Database session

    Returns:
        OPML content and feed count
    """
    rss_service = get_rss_service()
    feeds = db.query(RssFeed).order_by(RssFeed.category, RssFeed.title).all()

    opml_content = rss_service.generate_opml(feeds)

    return OpmlExportResponse(
        opml_content=opml_content,
        feed_count=len(feeds)
    )
