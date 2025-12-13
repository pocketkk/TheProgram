"""
Timeline Historical API Routes

Endpoints for Wikipedia events, AI-generated newspapers, and historical timeline features.
Single-user desktop application - no user_id required.
"""
from typing import Optional, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, datetime
from uuid import UUID
import asyncio
import json

from app.core.database_sqlite import get_db
from app.models.historical_date import HistoricalDate
from app.models.birth_data import BirthData
from app.models.user_event import UserEvent
from app.models.journal_entry import JournalEntry
from app.services.wikipedia_service import get_wikipedia_service, WikipediaFetchError
from app.services.newspaper_service import NewspaperGenerationError
from app.models.app_config import AppConfig
from app.schemas.timeline_historical import (
    HistoricalEventsResponse,
    NewspaperResponse,
    TimelineDateResponse,
    WikipediaEvent,
    NewspaperSection,
    NewspaperArticle,
)
from app.schemas.common import Message

router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

def _month_day_key(month: int, day: int) -> str:
    """Generate MM-DD cache key"""
    return f"{month:02d}-{day:02d}"


def _historical_date_to_events_response(
    historical: HistoricalDate,
    month: int,
    day: int
) -> HistoricalEventsResponse:
    """Convert HistoricalDate model to HistoricalEventsResponse schema"""
    return HistoricalEventsResponse(
        month=month,
        day=day,
        events=[WikipediaEvent(**event) for event in (historical.wikipedia_events or [])],
        births=[WikipediaEvent(**birth) for birth in (historical.wikipedia_births or [])],
        deaths=[WikipediaEvent(**death) for death in (historical.wikipedia_deaths or [])],
        holidays=historical.wikipedia_holidays or [],
        selected=[],  # Wikipedia doesn't provide selected in our cache
        cached=True,
        cached_at=historical.wikipedia_fetched_at,
    )


def _generate_fallback_newspaper(
    historical: HistoricalDate,
    month: int,
    day: int,
    style: str
) -> NewspaperResponse:
    """
    Generate a basic newspaper from Wikipedia data without AI
    Used as fallback when Gemini API key is not configured
    """
    date_display = date(2000, month, day).strftime("%B %d")

    # Style-specific settings
    if style == "victorian":
        headline = f"CHRONICLES OF HISTORY! Events of {date_display}"
        world_title = "WORLD EVENTS"
        births_title = "NOTABLE BIRTHS"
        deaths_title = "NOTABLE DEATHS"
    else:
        headline = f"On This Day: {date_display}"
        world_title = "Historical Events"
        births_title = "Born on This Day"
        deaths_title = "Deaths on This Day"

    sections = []

    # World Events section
    events = historical.wikipedia_events or []
    if events:
        articles = []
        for event in events[:5]:  # Top 5 events
            year = event.get("year", "Unknown")
            text = event.get("text", "")
            articles.append(NewspaperArticle(
                headline=f"{year}: {text[:80]}{'...' if len(text) > 80 else ''}",
                content=text,
                year=int(year) if isinstance(year, (int, str)) and str(year).isdigit() else 0,
                significance="Historical event from this date"
            ))
        sections.append(NewspaperSection(name=world_title, articles=articles))

    # Births section
    births = historical.wikipedia_births or []
    if births:
        articles = []
        for birth in births[:3]:  # Top 3 births
            year = birth.get("year", "Unknown")
            text = birth.get("text", "")
            articles.append(NewspaperArticle(
                headline=f"Born {year}: {text[:60]}{'...' if len(text) > 60 else ''}",
                content=text,
                year=int(year) if isinstance(year, (int, str)) and str(year).isdigit() else 0,
                significance="Notable birth on this date"
            ))
        sections.append(NewspaperSection(name=births_title, articles=articles))

    # Deaths section
    deaths = historical.wikipedia_deaths or []
    if deaths:
        articles = []
        for death in deaths[:3]:  # Top 3 deaths
            year = death.get("year", "Unknown")
            text = death.get("text", "")
            articles.append(NewspaperArticle(
                headline=f"Died {year}: {text[:60]}{'...' if len(text) > 60 else ''}",
                content=text,
                year=int(year) if isinstance(year, (int, str)) and str(year).isdigit() else 0,
                significance="Notable death on this date"
            ))
        sections.append(NewspaperSection(name=deaths_title, articles=articles))

    return NewspaperResponse(
        date_display=date_display,
        headline=headline,
        sections=sections,
        style=style,
        generated_at=datetime.utcnow().isoformat(),
        cached=False,
    )


def _historical_date_to_newspaper_response(historical: HistoricalDate) -> NewspaperResponse:
    """Convert HistoricalDate model to NewspaperResponse schema"""
    if not historical.newspaper_content:
        raise ValueError("No newspaper content in historical date record")

    content = historical.newspaper_content
    sections = [
        NewspaperSection(
            name=section["name"],
            articles=[NewspaperArticle(**article) for article in section["articles"]]
        )
        for section in content.get("sections", [])
    ]

    return NewspaperResponse(
        date_display=content.get("date_display", ""),
        headline=content.get("headline", ""),
        sections=sections,
        style=historical.newspaper_style or "modern",
        generated_at=historical.newspaper_generated_at or "",
        cached=True,
    )


# =============================================================================
# Wikipedia Events Endpoints
# =============================================================================

@router.get("/historical/{month}/{day}", response_model=HistoricalEventsResponse)
async def get_historical_events(
    month: int,
    day: int,
    force_refresh: bool = Query(False, description="Force fetch from Wikipedia, ignoring cache"),
    db: Session = Depends(get_db),
):
    """
    Get Wikipedia 'On This Day' events for a specific month/day

    Returns cached data if available, otherwise fetches from Wikipedia API.

    Args:
        month: Month (1-12)
        day: Day (1-31)
        force_refresh: Force fresh fetch from Wikipedia
        db: Database session

    Returns:
        Historical events, births, deaths, holidays

    Raises:
        HTTPException 400: Invalid month/day
        HTTPException 503: Wikipedia API unavailable
    """
    # Validate inputs
    if not (1 <= month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid month: {month}. Must be 1-12."
        )
    if not (1 <= day <= 31):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid day: {day}. Must be 1-31."
        )

    month_day = _month_day_key(month, day)

    # Check cache unless force_refresh
    if not force_refresh:
        historical = db.query(HistoricalDate).filter(
            HistoricalDate.month_day == month_day
        ).first()

        if historical and historical.has_wikipedia_data:
            return _historical_date_to_events_response(historical, month, day)

    # Fetch from Wikipedia
    try:
        wikipedia_service = get_wikipedia_service()
        wiki_data = await wikipedia_service.fetch_on_this_day(month=month, day=day)

        # Get or create HistoricalDate record
        historical = db.query(HistoricalDate).filter(
            HistoricalDate.month_day == month_day
        ).first()

        if not historical:
            historical = HistoricalDate(month_day=month_day)
            db.add(historical)

        # Update Wikipedia data
        historical.wikipedia_events = wiki_data.get("events", [])
        historical.wikipedia_births = wiki_data.get("births", [])
        historical.wikipedia_deaths = wiki_data.get("deaths", [])
        historical.wikipedia_holidays = wiki_data.get("holidays", [])
        historical.wikipedia_fetched_at = datetime.utcnow().isoformat()
        historical.wikipedia_fetch_error = None

        try:
            db.commit()
            db.refresh(historical)
        except Exception as commit_error:
            # Handle race condition - another request may have inserted
            db.rollback()
            if "UNIQUE constraint failed" in str(commit_error):
                historical = db.query(HistoricalDate).filter(
                    HistoricalDate.month_day == month_day
                ).first()
                if not historical:
                    raise
            else:
                raise

        return _historical_date_to_events_response(historical, month, day)

    except WikipediaFetchError as e:
        # Log error to database
        historical = db.query(HistoricalDate).filter(
            HistoricalDate.month_day == month_day
        ).first()

        if historical:
            historical.wikipedia_fetch_error = str(e)
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Wikipedia API unavailable: {str(e)}"
        )


# =============================================================================
# Newspaper Generation Endpoints
# =============================================================================

@router.get("/historical/{month}/{day}/newspaper", response_model=NewspaperResponse)
async def get_or_generate_newspaper(
    month: int,
    day: int,
    style: str = Query("modern", description="Journalism style: 'victorian' or 'modern'"),
    regenerate: bool = Query(False, description="Force regenerate newspaper, ignoring cache"),
    db: Session = Depends(get_db),
):
    """
    Get or generate AI newspaper for a specific month/day

    Returns cached newspaper if available and style matches, otherwise generates new one.

    Args:
        month: Month (1-12)
        day: Day (1-31)
        style: Journalism style ('victorian' or 'modern')
        regenerate: Force regenerate, ignoring cache
        db: Database session

    Returns:
        AI-generated newspaper content

    Raises:
        HTTPException 400: Invalid month/day or style
        HTTPException 503: Wikipedia API or Gemini unavailable
    """
    # Validate inputs
    if not (1 <= month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid month: {month}. Must be 1-12."
        )
    if not (1 <= day <= 31):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid day: {day}. Must be 1-31."
        )
    if style not in ["victorian", "modern"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid style: {style}. Must be 'victorian' or 'modern'."
        )

    month_day = _month_day_key(month, day)

    # Check cache unless regenerate
    if not regenerate:
        historical = db.query(HistoricalDate).filter(
            HistoricalDate.month_day == month_day
        ).first()

        if historical and historical.has_newspaper and historical.newspaper_style == style:
            return _historical_date_to_newspaper_response(historical)

    # Get Wikipedia data first (needed for generation)
    historical = db.query(HistoricalDate).filter(
        HistoricalDate.month_day == month_day
    ).first()

    if not historical or not historical.has_wikipedia_data:
        # Fetch Wikipedia data first
        try:
            wikipedia_service = get_wikipedia_service()
            wiki_data = await wikipedia_service.fetch_on_this_day(month=month, day=day)

            if not historical:
                historical = HistoricalDate(month_day=month_day)
                db.add(historical)

            historical.wikipedia_events = wiki_data.get("events", [])
            historical.wikipedia_births = wiki_data.get("births", [])
            historical.wikipedia_deaths = wiki_data.get("deaths", [])
            historical.wikipedia_holidays = wiki_data.get("holidays", [])
            historical.wikipedia_fetched_at = datetime.utcnow().isoformat()

            try:
                db.commit()
                db.refresh(historical)
            except Exception as commit_error:
                # Handle race condition - another request may have inserted
                db.rollback()
                if "UNIQUE constraint failed" in str(commit_error):
                    historical = db.query(HistoricalDate).filter(
                        HistoricalDate.month_day == month_day
                    ).first()
                    if not historical:
                        raise
                else:
                    raise

        except WikipediaFetchError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Wikipedia API unavailable: {str(e)}"
            )

    # Try AI-powered newspaper generation, fall back to basic format if unavailable
    try:
        # Import here to avoid circular imports
        from app.services.newspaper_service import get_newspaper_service

        newspaper_service = get_newspaper_service()

        # Prepare Wikipedia data for generation
        wikipedia_data = historical.get_wikipedia_data()
        date_display = date(2000, month, day).strftime("%B %d")  # e.g., "July 20"

        # Generate newspaper with AI
        newspaper_result = await newspaper_service.generate_newspaper(
            wikipedia_data=wikipedia_data,
            style=style,
            date_context=date_display,
        )

        # Save to database
        historical.newspaper_content = newspaper_result.to_dict()
        historical.newspaper_style = style
        historical.newspaper_generated_at = datetime.utcnow().isoformat()
        historical.generation_prompt_hash = newspaper_result.generation_metadata.get("prompt_hash")

        db.commit()
        db.refresh(historical)

        return _historical_date_to_newspaper_response(historical)

    except ValueError as e:
        # Google API key not configured - use fallback newspaper format
        import logging
        logging.getLogger(__name__).info(
            f"Gemini unavailable ({e}), using fallback newspaper format"
        )
        return _generate_fallback_newspaper(historical, month, day, style)

    except NewspaperGenerationError as e:
        # AI generation failed - use fallback newspaper format
        import logging
        logging.getLogger(__name__).warning(
            f"AI newspaper generation failed ({e}), using fallback format"
        )
        return _generate_fallback_newspaper(historical, month, day, style)


@router.get("/historical/{year}/{month}/{day}/newspaper", response_model=NewspaperResponse)
async def get_year_specific_newspaper(
    year: int,
    month: int,
    day: int,
    style: str = Query("modern", description="Journalism style: 'victorian' or 'modern'"),
    regenerate: bool = Query(False, description="Force regenerate newspaper, ignoring cache"),
    db: Session = Depends(get_db),
):
    """
    Get or generate year-specific AI newspaper for a specific date

    This endpoint fetches news from the ACTUAL DATE specified (e.g., news from
    November 30, 1985) rather than "On This Day" events from different years.

    News Sources (coverage periods):
    - The Guardian: 1999-present
    - New York Times: 1851-present
    - Wikipedia: All dates (as context/fallback)

    Configure API keys in Settings to access Guardian and NYT archives.

    Args:
        year: Year (e.g., 1985)
        month: Month (1-12)
        day: Day (1-31)
        style: Journalism style ('victorian' or 'modern')
        regenerate: Force regenerate, ignoring cache
        db: Database session

    Returns:
        AI-generated newspaper with source attribution

    Raises:
        HTTPException 400: Invalid date or style
        HTTPException 503: All news sources unavailable
    """
    import logging
    logger = logging.getLogger(__name__)

    # Validate inputs
    if year < 1000 or year > 9999:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid year: {year}. Must be 1000-9999."
        )
    if not (1 <= month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid month: {month}. Must be 1-12."
        )
    if not (1 <= day <= 31):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid day: {day}. Must be 1-31."
        )
    if style not in ["victorian", "modern"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid style: {style}. Must be 'victorian' or 'modern'."
        )

    # Validate the date is real
    try:
        target_date = date(year, month, day)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date: {year}-{month:02d}-{day:02d}"
        )

    full_date_key = f"{year}-{month:02d}-{day:02d}"

    # Check cache unless regenerate (using full_date, not month_day)
    if not regenerate:
        historical = db.query(HistoricalDate).filter(
            HistoricalDate.full_date == full_date_key
        ).first()

        if historical and historical.has_newspaper and historical.newspaper_style == style:
            # Return cached year-specific newspaper
            content = historical.newspaper_content
            sections = [
                NewspaperSection(
                    name=section["name"],
                    articles=[NewspaperArticle(**article) for article in section["articles"]]
                )
                for section in content.get("sections", [])
            ]
            return NewspaperResponse(
                date_display=content.get("date_display", f"{month}/{day}/{year}"),
                headline=content.get("headline", ""),
                sections=sections,
                style=style,
                generated_at=historical.newspaper_generated_at or "",
                cached=True,
                year=year,
                is_year_specific=True,
                sources_used=historical.newspaper_sources.split(",") if historical.newspaper_sources else [],
                sources_failed={}
            )

    # Get app config for API keys
    config = db.query(AppConfig).first()
    if not config:
        config = AppConfig()
        db.add(config)
        db.commit()
        db.refresh(config)

    # Fetch news from multiple sources
    try:
        from app.services.news_aggregator_service import create_news_aggregator

        aggregator = create_news_aggregator(
            guardian_api_key=config.guardian_api_key,
            nyt_api_key=config.nyt_api_key,
            sources_priority=config.newspaper_sources_priority
        )

        # Fetch aggregated news
        aggregated_news = await aggregator.fetch_news_for_date(
            year=year,
            month=month,
            day=day,
            articles_per_source=15
        )

        # Close connections
        await aggregator.close()

        logger.info(
            f"Aggregated news for {full_date_key}: "
            f"Guardian={len(aggregated_news.guardian_articles)}, "
            f"NYT={len(aggregated_news.nyt_articles)}, "
            f"Wikipedia={bool(aggregated_news.wikipedia_context)}"
        )

    except Exception as e:
        logger.error(f"Failed to aggregate news: {e}")
        # Return fallback if aggregation fails
        from app.services.newspaper_service import get_newspaper_service
        try:
            newspaper_service = get_newspaper_service()
            fallback = newspaper_service.generate_fallback_newspaper(year, month, day, style)
            return NewspaperResponse(
                date_display=fallback.date_display,
                headline=fallback.headline,
                sections=[
                    NewspaperSection(
                        name=section["name"],
                        articles=[NewspaperArticle(**article) for article in section["articles"]]
                    )
                    for section in fallback.sections
                ],
                style=style,
                generated_at=datetime.utcnow().isoformat(),
                cached=False,
                year=year,
                is_year_specific=True,
                sources_used=[],
                sources_failed={"aggregation": str(e)}
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"News aggregation failed: {str(e)}"
            )

    # Generate newspaper with AI synthesis
    try:
        from app.services.newspaper_service import get_newspaper_service

        newspaper_service = get_newspaper_service(api_key=config.google_api_key)

        # Check if we have any content to generate from
        if not aggregated_news.has_real_news and not aggregated_news.wikipedia_context:
            logger.warning(f"No news content found for {full_date_key}")
            fallback = newspaper_service.generate_fallback_newspaper(year, month, day, style)
            return NewspaperResponse(
                date_display=fallback.date_display,
                headline=fallback.headline,
                sections=[
                    NewspaperSection(
                        name=section["name"],
                        articles=[NewspaperArticle(**article) for article in section["articles"]]
                    )
                    for section in fallback.sections
                ],
                style=style,
                generated_at=datetime.utcnow().isoformat(),
                cached=False,
                year=year,
                is_year_specific=True,
                sources_used=aggregated_news.sources_used,
                sources_failed=aggregated_news.sources_failed
            )

        # Generate with AI synthesis
        newspaper_result = await newspaper_service.generate_newspaper_from_aggregated(
            aggregated_news=aggregated_news,
            style=style,
        )

        # Create or update cache entry for this full date
        historical = db.query(HistoricalDate).filter(
            HistoricalDate.full_date == full_date_key
        ).first()

        if not historical:
            # Create new record for year-specific data
            # Use full_date as month_day to ensure uniqueness (year-specific records)
            historical = HistoricalDate(
                month_day=full_date_key,  # Use full date as unique key for year-specific
                full_date=full_date_key
            )
            db.add(historical)

        # Cache the generated newspaper
        historical.newspaper_content = newspaper_result.to_dict()
        historical.newspaper_style = style
        historical.newspaper_generated_at = datetime.utcnow().isoformat()
        historical.generation_prompt_hash = newspaper_result.generation_metadata.get("prompt_hash")
        historical.newspaper_sources = ",".join(aggregated_news.sources_used)

        # Also cache source articles for potential future use
        if aggregated_news.guardian_articles:
            historical.guardian_articles = aggregated_news.guardian_articles
            historical.guardian_fetched_at = datetime.utcnow().isoformat()
        if aggregated_news.nyt_articles:
            historical.nyt_articles = aggregated_news.nyt_articles
            historical.nyt_fetched_at = datetime.utcnow().isoformat()
        if aggregated_news.wikipedia_context:
            historical.wikipedia_events = aggregated_news.wikipedia_context.get("events", [])
            historical.wikipedia_births = aggregated_news.wikipedia_context.get("births", [])
            historical.wikipedia_deaths = aggregated_news.wikipedia_context.get("deaths", [])
            historical.wikipedia_fetched_at = datetime.utcnow().isoformat()

        try:
            db.commit()
            db.refresh(historical)
        except Exception as commit_error:
            db.rollback()
            if "UNIQUE constraint failed" not in str(commit_error):
                raise
            # Race condition - just return the generated result without caching
            logger.warning(f"Race condition on cache insert for {full_date_key}")

        # Build response
        sections = [
            NewspaperSection(
                name=section["name"],
                articles=[NewspaperArticle(**article) for article in section["articles"]]
            )
            for section in newspaper_result.sections
        ]

        return NewspaperResponse(
            date_display=newspaper_result.date_display,
            headline=newspaper_result.headline,
            sections=sections,
            style=style,
            generated_at=datetime.utcnow().isoformat(),
            cached=False,
            year=year,
            is_year_specific=True,
            sources_used=aggregated_news.sources_used,
            sources_failed=aggregated_news.sources_failed
        )

    except ValueError as e:
        # Google API key not configured - return inline fallback
        logger.info(f"Gemini unavailable ({e}), returning fallback newspaper")
        date_str = f"{month}/{day}/{year}"
        return NewspaperResponse(
            date_display=date_str,
            headline=f"The Daily Chronicle - {date_str}",
            sections=[
                NewspaperSection(
                    name="WORLD EVENTS",
                    articles=[
                        NewspaperArticle(
                            headline="Historical News Unavailable",
                            content="Configure your Google API key in Settings to enable AI-generated historical newspapers with news from this date.",
                            year=year,
                            significance="Configure Gemini API key for full newspaper experience",
                            source="system"
                        )
                    ]
                )
            ],
            style=style,
            generated_at=datetime.utcnow().isoformat(),
            cached=False,
            year=year,
            is_year_specific=True,
            sources_used=aggregated_news.sources_used if 'aggregated_news' in dir() else [],
            sources_failed={"gemini": str(e)}
        )

    except NewspaperGenerationError as e:
        # AI generation failed - return inline fallback
        logger.warning(f"AI newspaper generation failed: {e}")
        date_str = f"{month}/{day}/{year}"
        return NewspaperResponse(
            date_display=date_str,
            headline=f"The Daily Chronicle - {date_str}",
            sections=[
                NewspaperSection(
                    name="WORLD EVENTS",
                    articles=[
                        NewspaperArticle(
                            headline="News Generation Error",
                            content="Unable to generate the newspaper at this time. Please try again later.",
                            year=year,
                            significance="Temporary generation issue",
                            source="system"
                        )
                    ]
                )
            ],
            style=style,
            generated_at=datetime.utcnow().isoformat(),
            cached=False,
            year=year,
            is_year_specific=True,
            sources_used=aggregated_news.sources_used if 'aggregated_news' in dir() else [],
            sources_failed={"generation": str(e)}
        )


# =============================================================================
# Streaming Newspaper Generation Endpoint
# =============================================================================

def _sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event"""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


@router.get("/historical/{year}/{month}/{day}/newspaper/stream")
async def stream_year_specific_newspaper(
    year: int,
    month: int,
    day: int,
    style: str = Query("modern", description="Journalism style: 'victorian' or 'modern'"),
):
    """
    Stream year-specific newspaper generation with progress updates.

    Returns Server-Sent Events with progress updates during:
    - Cache check
    - Guardian API fetch
    - NYT API fetch
    - Wikipedia fetch
    - AI synthesis
    - Final newspaper result

    Event types:
    - progress: {step, message, percent}
    - source_complete: {source, article_count, success}
    - complete: {newspaper: NewspaperResponse}
    - error: {message}
    """
    import logging
    logger = logging.getLogger(__name__)

    async def generate_events() -> AsyncGenerator[str, None]:
        try:
            # Validate inputs
            if year < 1000 or year > 9999:
                yield _sse_event("error", {"message": f"Invalid year: {year}"})
                return
            if not (1 <= month <= 12):
                yield _sse_event("error", {"message": f"Invalid month: {month}"})
                return
            if not (1 <= day <= 31):
                yield _sse_event("error", {"message": f"Invalid day: {day}"})
                return
            if style not in ["victorian", "modern"]:
                yield _sse_event("error", {"message": f"Invalid style: {style}"})
                return

            try:
                target_date = date(year, month, day)
            except ValueError:
                yield _sse_event("error", {"message": f"Invalid date: {year}-{month:02d}-{day:02d}"})
                return

            full_date_key = f"{year}-{month:02d}-{day:02d}"

            # Step 1: Check cache
            yield _sse_event("progress", {
                "step": "cache",
                "message": "Checking cache...",
                "percent": 5
            })
            await asyncio.sleep(0.1)  # Small delay for UI smoothness

            # Get database session
            from app.core.database_sqlite import SessionLocal
            db = SessionLocal()

            try:
                historical = db.query(HistoricalDate).filter(
                    HistoricalDate.full_date == full_date_key
                ).first()

                if historical and historical.has_newspaper and historical.newspaper_style == style:
                    yield _sse_event("progress", {
                        "step": "cache_hit",
                        "message": "Found cached newspaper!",
                        "percent": 100
                    })

                    # Return cached newspaper
                    content = historical.newspaper_content
                    sections = [
                        {
                            "name": section["name"],
                            "articles": section["articles"]
                        }
                        for section in content.get("sections", [])
                    ]

                    yield _sse_event("complete", {
                        "newspaper": {
                            "date_display": content.get("date_display", f"{month}/{day}/{year}"),
                            "headline": content.get("headline", ""),
                            "sections": sections,
                            "style": style,
                            "generated_at": historical.newspaper_generated_at or "",
                            "cached": True,
                            "year": year,
                            "is_year_specific": True,
                            "sources_used": historical.newspaper_sources.split(",") if historical.newspaper_sources else [],
                            "sources_failed": {}
                        }
                    })
                    return

                # Step 2: Get API keys from config
                yield _sse_event("progress", {
                    "step": "config",
                    "message": "Loading API configuration...",
                    "percent": 10
                })

                config = db.query(AppConfig).first()
                if not config:
                    config = AppConfig()
                    db.add(config)
                    db.commit()
                    db.refresh(config)

                # Step 3: Fetch from news sources
                yield _sse_event("progress", {
                    "step": "fetching",
                    "message": "Fetching news from archives...",
                    "percent": 15
                })

                from app.services.news_aggregator_service import create_news_aggregator

                aggregator = create_news_aggregator(
                    guardian_api_key=config.guardian_api_key,
                    nyt_api_key=config.nyt_api_key,
                    sources_priority=config.newspaper_sources_priority
                )

                # Fetch Guardian
                if config.guardian_api_key:
                    yield _sse_event("progress", {
                        "step": "guardian",
                        "message": "Fetching from The Guardian...",
                        "percent": 25
                    })

                # Fetch NYT
                if config.nyt_api_key:
                    yield _sse_event("progress", {
                        "step": "nyt",
                        "message": "Fetching from New York Times...",
                        "percent": 35
                    })

                # Fetch Wikipedia
                yield _sse_event("progress", {
                    "step": "wikipedia",
                    "message": "Fetching from Wikipedia...",
                    "percent": 45
                })

                # Actually fetch all sources
                try:
                    aggregated_news = await aggregator.fetch_news_for_date(
                        year=year,
                        month=month,
                        day=day,
                        articles_per_source=15
                    )
                    await aggregator.close()

                    # Report source results
                    yield _sse_event("source_complete", {
                        "source": "guardian",
                        "article_count": len(aggregated_news.guardian_articles),
                        "success": len(aggregated_news.guardian_articles) > 0
                    })
                    yield _sse_event("source_complete", {
                        "source": "nyt",
                        "article_count": len(aggregated_news.nyt_articles),
                        "success": len(aggregated_news.nyt_articles) > 0
                    })
                    yield _sse_event("source_complete", {
                        "source": "wikipedia",
                        "article_count": len(aggregated_news.wikipedia_context.get("events", [])) if aggregated_news.wikipedia_context else 0,
                        "success": bool(aggregated_news.wikipedia_context)
                    })

                except Exception as e:
                    logger.error(f"Failed to aggregate news: {e}")
                    yield _sse_event("error", {"message": f"Failed to fetch news: {str(e)}"})
                    return

                # Step 4: AI Synthesis
                yield _sse_event("progress", {
                    "step": "synthesis",
                    "message": "AI is writing your newspaper...",
                    "percent": 60
                })

                try:
                    from app.services.newspaper_service import get_newspaper_service

                    newspaper_service = get_newspaper_service(api_key=config.google_api_key)

                    if not aggregated_news.has_real_news and not aggregated_news.wikipedia_context:
                        yield _sse_event("progress", {
                            "step": "fallback",
                            "message": "No news found, generating placeholder...",
                            "percent": 80
                        })
                        date_str = f"{month}/{day}/{year}"
                        yield _sse_event("complete", {
                            "newspaper": {
                                "date_display": date_str,
                                "headline": f"The Daily Chronicle - {date_str}",
                                "sections": [{
                                    "name": "WORLD EVENTS",
                                    "articles": [{
                                        "headline": "No News Available",
                                        "content": "No news archives found for this date.",
                                        "year": year,
                                        "significance": "Historical records unavailable",
                                        "source": "system"
                                    }]
                                }],
                                "style": style,
                                "generated_at": datetime.utcnow().isoformat(),
                                "cached": False,
                                "year": year,
                                "is_year_specific": True,
                                "sources_used": aggregated_news.sources_used,
                                "sources_failed": aggregated_news.sources_failed
                            }
                        })
                        return

                    yield _sse_event("progress", {
                        "step": "generating",
                        "message": "Gemini is crafting articles...",
                        "percent": 70
                    })

                    newspaper_result = await newspaper_service.generate_newspaper_from_aggregated(
                        aggregated_news=aggregated_news,
                        style=style,
                    )

                    yield _sse_event("progress", {
                        "step": "caching",
                        "message": "Saving to cache...",
                        "percent": 90
                    })

                    # Cache the result
                    if not historical:
                        historical = HistoricalDate(
                            month_day=full_date_key,
                            full_date=full_date_key
                        )
                        db.add(historical)

                    historical.newspaper_content = newspaper_result.to_dict()
                    historical.newspaper_style = style
                    historical.newspaper_generated_at = datetime.utcnow().isoformat()
                    historical.newspaper_sources = ",".join(aggregated_news.sources_used)

                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

                    yield _sse_event("progress", {
                        "step": "complete",
                        "message": "Newspaper ready!",
                        "percent": 100
                    })

                    # Return the newspaper
                    sections = [
                        {
                            "name": section["name"],
                            "articles": section["articles"]
                        }
                        for section in newspaper_result.sections
                    ]

                    yield _sse_event("complete", {
                        "newspaper": {
                            "date_display": newspaper_result.date_display,
                            "headline": newspaper_result.headline,
                            "sections": sections,
                            "style": style,
                            "generated_at": datetime.utcnow().isoformat(),
                            "cached": False,
                            "year": year,
                            "is_year_specific": True,
                            "sources_used": aggregated_news.sources_used,
                            "sources_failed": aggregated_news.sources_failed
                        }
                    })

                except ValueError as e:
                    # No Google API key
                    date_str = f"{month}/{day}/{year}"
                    yield _sse_event("complete", {
                        "newspaper": {
                            "date_display": date_str,
                            "headline": f"The Daily Chronicle - {date_str}",
                            "sections": [{
                                "name": "WORLD EVENTS",
                                "articles": [{
                                    "headline": "AI Generation Unavailable",
                                    "content": "Configure your Google API key in Settings to enable AI-generated newspapers.",
                                    "year": year,
                                    "significance": "Configure Gemini API key",
                                    "source": "system"
                                }]
                            }],
                            "style": style,
                            "generated_at": datetime.utcnow().isoformat(),
                            "cached": False,
                            "year": year,
                            "is_year_specific": True,
                            "sources_used": aggregated_news.sources_used if 'aggregated_news' in dir() else [],
                            "sources_failed": {"gemini": str(e)}
                        }
                    })

                except NewspaperGenerationError as e:
                    date_str = f"{month}/{day}/{year}"
                    yield _sse_event("complete", {
                        "newspaper": {
                            "date_display": date_str,
                            "headline": f"The Daily Chronicle - {date_str}",
                            "sections": [{
                                "name": "WORLD EVENTS",
                                "articles": [{
                                    "headline": "Generation Error",
                                    "content": "Unable to generate newspaper. Please try again.",
                                    "year": year,
                                    "significance": "Temporary error",
                                    "source": "system"
                                }]
                            }],
                            "style": style,
                            "generated_at": datetime.utcnow().isoformat(),
                            "cached": False,
                            "year": year,
                            "is_year_specific": True,
                            "sources_used": aggregated_news.sources_used if 'aggregated_news' in dir() else [],
                            "sources_failed": {"generation": str(e)}
                        }
                    })

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield _sse_event("error", {"message": str(e)})

    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


# =============================================================================
# Complete Timeline Date Endpoints
# =============================================================================

@router.get("/date/{target_date}", response_model=TimelineDateResponse)
async def get_timeline_date(
    target_date: date,
    birth_data_id: Optional[UUID] = Query(None, description="Birth data for transit calculations"),
    include_historical: bool = Query(True, description="Include Wikipedia events"),
    include_newspaper: bool = Query(False, description="Include AI newspaper"),
    newspaper_style: str = Query("modern", description="Newspaper style if generating"),
    include_transits: bool = Query(False, description="Include transit calculations"),
    db: Session = Depends(get_db),
):
    """
    Get complete timeline data for a specific date

    Combines Wikipedia events, user journal entries, user events, and optionally
    AI-generated newspaper and transit calculations.

    Args:
        target_date: Date to retrieve
        birth_data_id: Optional birth data for transits
        include_historical: Include Wikipedia events
        include_newspaper: Include AI newspaper
        newspaper_style: Style for newspaper generation
        include_transits: Include transit calculations
        db: Database session

    Returns:
        Complete timeline date data

    Raises:
        HTTPException 404: Birth data not found (if birth_data_id provided)
        HTTPException 503: External API unavailable
    """
    # Validate birth_data_id if provided
    if birth_data_id:
        birth_data = db.query(BirthData).filter(BirthData.id == str(birth_data_id)).first()
        if not birth_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Birth data not found"
            )

    response = TimelineDateResponse(
        date=str(target_date),
        historical_events=None,
        newspaper=None,
        transits=None,
        journal_entries=[],
        user_events=[],
    )

    # Get historical events if requested
    if include_historical:
        try:
            response.historical_events = await get_historical_events(
                month=target_date.month,
                day=target_date.day,
                force_refresh=False,
                db=db,
            )
        except HTTPException:
            # Continue even if Wikipedia fails
            pass

    # Get newspaper if requested
    if include_newspaper:
        try:
            response.newspaper = await get_or_generate_newspaper(
                month=target_date.month,
                day=target_date.day,
                style=newspaper_style,
                regenerate=False,
                db=db,
            )
        except HTTPException:
            # Continue even if newspaper generation fails
            pass

    # Get user journal entries
    journal_entries = db.query(JournalEntry).filter(
        JournalEntry.entry_date == str(target_date)
    ).all()
    response.journal_entries = [entry.to_dict() for entry in journal_entries]

    # Get user events
    if birth_data_id:
        user_events = db.query(UserEvent).filter(
            UserEvent.birth_data_id == str(birth_data_id),
            UserEvent.event_date == str(target_date)
        ).all()
        response.user_events = [event.to_dict() for event in user_events]

    # Transit calculations would go here
    # TODO: Implement transit calculation endpoint and call it
    if include_transits and birth_data_id:
        response.transits = {
            "note": "Transit calculations not yet implemented",
            "target_date": str(target_date),
            "birth_data_id": str(birth_data_id),
        }

    return response


# =============================================================================
# Transit Calculation Endpoints
# =============================================================================

@router.get("/transits/{target_date}/{birth_data_id}")
async def get_historical_transits(
    target_date: date,
    birth_data_id: UUID,
    include_aspects: bool = Query(True, description="Include aspect calculations"),
    include_houses: bool = Query(True, description="Include house transits"),
    db: Session = Depends(get_db),
):
    """
    Calculate historical transits for a specific date

    Calculates transit positions and aspects for any historical date.

    Args:
        target_date: Date for transit calculation
        birth_data_id: Birth data UUID for natal positions
        include_aspects: Include transit-natal aspects
        include_houses: Include house transits
        db: Database session

    Returns:
        Transit calculation data

    Raises:
        HTTPException 404: Birth data not found
        HTTPException 501: Not yet implemented
    """
    # Validate birth_data
    birth_data = db.query(BirthData).filter(BirthData.id == str(birth_data_id)).first()
    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # TODO: Implement transit calculation
    # This would use the transit_calculator service to calculate transits for the target date
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Historical transit calculation not yet implemented. Use existing /transits endpoints."
    )


# =============================================================================
# Cache Management Endpoints
# =============================================================================

@router.delete("/cache/{month}/{day}", response_model=Message)
async def clear_historical_cache(
    month: int,
    day: int,
    clear_wikipedia: bool = Query(True, description="Clear Wikipedia cache"),
    clear_newspaper: bool = Query(True, description="Clear newspaper cache"),
    db: Session = Depends(get_db),
):
    """
    Clear cached data for a specific month/day

    Useful for forcing refresh of stale data.

    Args:
        month: Month (1-12)
        day: Day (1-31)
        clear_wikipedia: Clear Wikipedia data
        clear_newspaper: Clear newspaper data
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: No cached data found
    """
    month_day = _month_day_key(month, day)
    historical = db.query(HistoricalDate).filter(
        HistoricalDate.month_day == month_day
    ).first()

    if not historical:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No cached data for {month:02d}-{day:02d}"
        )

    if clear_wikipedia:
        historical.wikipedia_events = None
        historical.wikipedia_births = None
        historical.wikipedia_deaths = None
        historical.wikipedia_holidays = None
        historical.wikipedia_fetched_at = None
        historical.wikipedia_fetch_error = None

    if clear_newspaper:
        historical.newspaper_content = None
        historical.newspaper_style = None
        historical.newspaper_generated_at = None
        historical.generation_prompt_hash = None

    # If everything cleared, delete the record
    if not historical.has_wikipedia_data and not historical.has_newspaper:
        db.delete(historical)
    else:
        db.add(historical)

    db.commit()

    return Message(message=f"Cache cleared for {month:02d}-{day:02d}")


# =============================================================================
# Personalized Newspaper Endpoint
# =============================================================================

@router.get("/historical/{year}/{month}/{day}/newspaper/personalized")
async def get_personalized_newspaper(
    year: int,
    month: int,
    day: int,
    style: str = Query("modern", description="Journalism style: 'victorian' or 'modern'"),
    regenerate: bool = Query(False, description="Force regenerate newspaper, ignoring cache"),
    db: Session = Depends(get_db),
):
    """
    Get a PERSONALIZED newspaper for a specific date.

    This endpoint generates a newspaper tailored to the user's interests,
    including:
    - Historical weather for their location
    - Sports news filtered by their teams/leagues
    - RSS feed content filtered by date
    - News articles scored and ranked by interests
    - Custom sections based on user-defined topics

    Configure personalization in Settings > Content Preferences.

    Args:
        year: Year (e.g., 1985)
        month: Month (1-12)
        day: Day (1-31)
        style: Journalism style ('victorian' or 'modern')
        regenerate: Force regenerate, ignoring cache
        db: Database session

    Returns:
        Personalized newspaper with weather, sports, and custom sections
    """
    import logging
    logger = logging.getLogger(__name__)

    # Validate inputs
    if year < 1000 or year > 9999:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid year: {year}. Must be 1000-9999."
        )
    if not (1 <= month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid month: {month}. Must be 1-12."
        )
    if not (1 <= day <= 31):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid day: {day}. Must be 1-31."
        )
    if style not in ["victorian", "modern"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid style: {style}. Must be 'victorian' or 'modern'."
        )

    # Validate the date is real
    try:
        target_date = date(year, month, day)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date: {year}-{month:02d}-{day:02d}"
        )

    full_date_key = f"{year}-{month:02d}-{day:02d}"

    # Get app config for API keys
    config = db.query(AppConfig).first()
    if not config:
        config = AppConfig()
        db.add(config)
        db.commit()
        db.refresh(config)

    # First, get the base newspaper (from cache or generate)
    base_newspaper = None
    aggregated_news = None

    # Check cache for base newspaper
    if not regenerate:
        historical = db.query(HistoricalDate).filter(
            HistoricalDate.full_date == full_date_key
        ).first()

        if historical and historical.has_newspaper and historical.newspaper_style == style:
            base_newspaper = {
                "headline": historical.newspaper_content.get("headline", ""),
                "date_display": historical.newspaper_content.get("date_display", f"{month}/{day}/{year}"),
                "sections": historical.newspaper_content.get("sections", []),
                "metadata": {
                    "sources_used": historical.newspaper_sources.split(",") if historical.newspaper_sources else []
                }
            }

    # If no cached base newspaper, fetch news and generate
    if not base_newspaper:
        try:
            from app.services.news_aggregator_service import create_news_aggregator
            from app.services.newspaper_service import get_newspaper_service

            aggregator = create_news_aggregator(
                guardian_api_key=config.guardian_api_key,
                nyt_api_key=config.nyt_api_key,
                sources_priority=config.newspaper_sources_priority
            )

            # Fetch aggregated news
            aggregated_news = await aggregator.fetch_news_for_date(
                year=year,
                month=month,
                day=day,
                articles_per_source=15
            )
            await aggregator.close()

            # Generate base newspaper
            if config.google_api_key and (aggregated_news.has_real_news or aggregated_news.wikipedia_context):
                newspaper_service = get_newspaper_service(api_key=config.google_api_key)
                newspaper_result = await newspaper_service.generate_newspaper_from_aggregated(
                    aggregated_news=aggregated_news,
                    style=style
                )
                base_newspaper = {
                    "headline": newspaper_result.headline,
                    "date_display": newspaper_result.date_display,
                    "sections": newspaper_result.sections,
                    "metadata": newspaper_result.generation_metadata
                }
            else:
                # Fallback newspaper
                newspaper_service = get_newspaper_service()
                fallback = newspaper_service.generate_fallback_newspaper(year, month, day, style)
                base_newspaper = {
                    "headline": fallback.headline,
                    "date_display": fallback.date_display,
                    "sections": fallback.sections,
                    "metadata": fallback.generation_metadata
                }

        except Exception as e:
            logger.error(f"Failed to generate base newspaper: {e}")
            base_newspaper = {
                "headline": f"The Cosmic Chronicle - {month}/{day}/{year}",
                "date_display": f"{month}/{day}/{year}",
                "sections": [],
                "metadata": {"error": str(e)}
            }

    # Now apply personalization
    try:
        from app.services.personalized_newspaper_service import get_personalized_newspaper_service

        personalized_service = get_personalized_newspaper_service(db)
        personalized_newspaper = await personalized_service.generate_personalized_newspaper(
            year=year,
            month=month,
            day=day,
            base_newspaper=base_newspaper,
            aggregated_news=aggregated_news,
            style=style
        )

        return personalized_newspaper.to_dict()

    except Exception as e:
        logger.error(f"Personalization failed, returning base newspaper: {e}")
        # Return base newspaper without personalization
        return {
            "date": full_date_key,
            "year": year,
            "month": month,
            "day": day,
            "headline": base_newspaper.get("headline", ""),
            "date_display": base_newspaper.get("date_display", ""),
            "sections": base_newspaper.get("sections", []),
            "personalized_sections": [],
            "weather": None,
            "style": style,
            "sources_used": base_newspaper.get("metadata", {}).get("sources_used", []),
            "personalization_applied": False,
            "metadata": {"error": str(e)}
        }
