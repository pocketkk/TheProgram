"""
Content Preferences API Routes

Endpoints for managing personalized Cosmic Paper settings including
interests, location, sports, RSS feeds, and the truth algorithm.
"""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.content_preferences import ContentPreferences
from app.models.rss_feed import RssFeed
from app.schemas.content_preferences import (
    LocationUpdate,
    LocationResponse,
    InterestsUpdate,
    SportsUpdate,
    SportsResponse,
    FilteringUpdate,
    FilteringResponse,
    TruthAlgorithmUpdate,
    TruthAlgorithmResponse,
    CustomSectionsUpdate,
    DisplayPreferencesUpdate,
    DisplayPreferencesResponse,
    RssFeedCreate,
    RssFeedUpdate,
    RssFeedResponse,
    RssFeedListResponse,
    RssFeedTestResponse,
    RssCategoriesUpdate,
    ContentPreferencesResponse,
    ContentPreferencesFullUpdate,
)
from app.services.rss_service import get_rss_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content-preferences", tags=["content-preferences"])


# =============================================================================
# Helpers
# =============================================================================

def get_or_create_preferences(db: Session) -> ContentPreferences:
    """Get or create the singleton ContentPreferences record"""
    prefs = db.query(ContentPreferences).filter_by(id="1").first()
    if not prefs:
        prefs = ContentPreferences(id="1")
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


# =============================================================================
# Full Preferences
# =============================================================================

@router.get("", response_model=ContentPreferencesResponse)
async def get_content_preferences(db: Session = Depends(get_db)):
    """
    Get all content preferences.

    Returns the complete set of personalization settings including
    location, interests, sports, filtering, and display options.
    """
    prefs = get_or_create_preferences(db)
    return prefs.to_preferences_dict()


@router.patch("", response_model=ContentPreferencesResponse)
async def update_content_preferences(
    updates: ContentPreferencesFullUpdate,
    db: Session = Depends(get_db)
):
    """
    Update multiple content preference sections at once.

    Only provided fields will be updated.
    """
    prefs = get_or_create_preferences(db)

    # Update location
    if updates.location:
        prefs.location_name = updates.location.name
        prefs.latitude = updates.location.latitude
        prefs.longitude = updates.location.longitude
        prefs.timezone = updates.location.timezone

    # Update interests
    if updates.interests is not None:
        prefs.interests = [i.model_dump() for i in updates.interests]

    # Update sports
    if updates.sports:
        prefs.sports_teams = [t.model_dump() for t in updates.sports.teams]
        prefs.sports_leagues = updates.sports.leagues

    # Update filtering
    if updates.filtering:
        prefs.blocked_sources = updates.filtering.blocked_sources
        prefs.blocked_keywords = updates.filtering.blocked_keywords
        prefs.prioritized_topics = updates.filtering.prioritized_topics

    # Update truth algorithm
    if updates.truth_algorithm:
        prefs.enable_truth_filter = updates.truth_algorithm.enabled
        prefs.truth_focus_topics = updates.truth_algorithm.focus_topics
        prefs.source_trust_levels = updates.truth_algorithm.source_trust_levels

    # Update display
    if updates.display:
        if updates.display.show_weather is not None:
            prefs.show_weather = updates.display.show_weather
        if updates.display.show_sports is not None:
            prefs.show_sports = updates.display.show_sports
        if updates.display.show_horoscope_context is not None:
            prefs.show_horoscope_context = updates.display.show_horoscope_context
        if updates.display.show_rss_content is not None:
            prefs.show_rss_content = updates.display.show_rss_content

    # Update custom sections
    if updates.custom_sections is not None:
        prefs.custom_sections = [s.model_dump() for s in updates.custom_sections]

    # Update RSS categories
    if updates.rss_categories is not None:
        prefs.rss_categories = updates.rss_categories

    db.commit()
    db.refresh(prefs)

    return prefs.to_preferences_dict()


# =============================================================================
# Location
# =============================================================================

@router.get("/location", response_model=LocationResponse)
async def get_location(db: Session = Depends(get_db)):
    """Get location settings for weather"""
    prefs = get_or_create_preferences(db)
    return {
        "name": prefs.location_name,
        "latitude": prefs.latitude,
        "longitude": prefs.longitude,
        "timezone": prefs.timezone,
        "configured": prefs.has_location
    }


@router.put("/location", response_model=LocationResponse)
async def update_location(
    location: LocationUpdate,
    db: Session = Depends(get_db)
):
    """Update location for weather"""
    prefs = get_or_create_preferences(db)

    prefs.location_name = location.name
    prefs.latitude = location.latitude
    prefs.longitude = location.longitude
    prefs.timezone = location.timezone

    db.commit()
    db.refresh(prefs)

    return {
        "name": prefs.location_name,
        "latitude": prefs.latitude,
        "longitude": prefs.longitude,
        "timezone": prefs.timezone,
        "configured": prefs.has_location
    }


@router.delete("/location")
async def clear_location(db: Session = Depends(get_db)):
    """Clear location settings"""
    prefs = get_or_create_preferences(db)

    prefs.location_name = None
    prefs.latitude = None
    prefs.longitude = None
    prefs.timezone = None

    db.commit()

    return {"message": "Location cleared", "success": True}


# =============================================================================
# Interests
# =============================================================================

@router.get("/interests")
async def get_interests(db: Session = Depends(get_db)):
    """Get topic interests"""
    prefs = get_or_create_preferences(db)
    return {"interests": prefs.interests or []}


@router.put("/interests")
async def update_interests(
    data: InterestsUpdate,
    db: Session = Depends(get_db)
):
    """Update topic interests"""
    prefs = get_or_create_preferences(db)
    prefs.interests = [i.model_dump() for i in data.interests]
    db.commit()
    db.refresh(prefs)
    return {"interests": prefs.interests}


@router.post("/interests/add")
async def add_interest(
    topic: str,
    weight: float = 1.0,
    db: Session = Depends(get_db)
):
    """Add a single interest"""
    prefs = get_or_create_preferences(db)

    interests = prefs.interests or []
    existing_topics = {i.get("topic", "").lower() for i in interests}

    if topic.lower() in existing_topics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Interest '{topic}' already exists"
        )

    interests.append({"topic": topic, "weight": max(0.0, min(1.0, weight))})
    prefs.interests = interests

    db.commit()
    db.refresh(prefs)

    return {"interests": prefs.interests}


@router.delete("/interests/{topic}")
async def remove_interest(topic: str, db: Session = Depends(get_db)):
    """Remove an interest by topic name"""
    prefs = get_or_create_preferences(db)

    interests = prefs.interests or []
    original_len = len(interests)
    interests = [i for i in interests if i.get("topic", "").lower() != topic.lower()]

    if len(interests) == original_len:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interest '{topic}' not found"
        )

    prefs.interests = interests
    db.commit()
    db.refresh(prefs)

    return {"interests": prefs.interests, "message": f"Removed '{topic}'"}


# =============================================================================
# Sports
# =============================================================================

@router.get("/sports", response_model=SportsResponse)
async def get_sports(db: Session = Depends(get_db)):
    """Get sports preferences"""
    prefs = get_or_create_preferences(db)
    return {
        "teams": prefs.sports_teams or [],
        "leagues": prefs.sports_leagues or [],
        "show_sports": prefs.show_sports
    }


@router.put("/sports", response_model=SportsResponse)
async def update_sports(
    data: SportsUpdate,
    db: Session = Depends(get_db)
):
    """Update sports preferences"""
    prefs = get_or_create_preferences(db)

    prefs.sports_teams = [t.model_dump() for t in data.teams]
    prefs.sports_leagues = data.leagues

    db.commit()
    db.refresh(prefs)

    return {
        "teams": prefs.sports_teams,
        "leagues": prefs.sports_leagues,
        "show_sports": prefs.show_sports
    }


@router.post("/sports/team")
async def add_team(
    name: str,
    league: str,
    sport: str,
    city: str = None,
    db: Session = Depends(get_db)
):
    """Add a team to follow"""
    prefs = get_or_create_preferences(db)

    teams = prefs.sports_teams or []
    existing_names = {t.get("name", "").lower() for t in teams}

    if name.lower() in existing_names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team '{name}' already exists"
        )

    teams.append({
        "name": name,
        "league": league,
        "sport": sport,
        "city": city,
        "aliases": []
    })
    prefs.sports_teams = teams

    db.commit()
    db.refresh(prefs)

    return {"teams": prefs.sports_teams}


@router.delete("/sports/team/{team_name}")
async def remove_team(team_name: str, db: Session = Depends(get_db)):
    """Remove a team"""
    prefs = get_or_create_preferences(db)

    teams = prefs.sports_teams or []
    original_len = len(teams)
    teams = [t for t in teams if t.get("name", "").lower() != team_name.lower()]

    if len(teams) == original_len:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team '{team_name}' not found"
        )

    prefs.sports_teams = teams
    db.commit()

    return {"teams": prefs.sports_teams}


@router.post("/sports/league/{league_name}")
async def add_league(league_name: str, db: Session = Depends(get_db)):
    """Add a league to follow"""
    prefs = get_or_create_preferences(db)

    leagues = prefs.sports_leagues or []
    if league_name.lower() in [l.lower() for l in leagues]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"League '{league_name}' already exists"
        )

    leagues.append(league_name)
    prefs.sports_leagues = leagues

    db.commit()
    db.refresh(prefs)

    return {"leagues": prefs.sports_leagues}


@router.delete("/sports/league/{league_name}")
async def remove_league(league_name: str, db: Session = Depends(get_db)):
    """Remove a league"""
    prefs = get_or_create_preferences(db)

    leagues = prefs.sports_leagues or []
    original_len = len(leagues)
    leagues = [l for l in leagues if l.lower() != league_name.lower()]

    if len(leagues) == original_len:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"League '{league_name}' not found"
        )

    prefs.sports_leagues = leagues
    db.commit()

    return {"leagues": prefs.sports_leagues}


# =============================================================================
# Filtering
# =============================================================================

@router.get("/filtering", response_model=FilteringResponse)
async def get_filtering(db: Session = Depends(get_db)):
    """Get content filtering settings"""
    prefs = get_or_create_preferences(db)
    return {
        "blocked_sources": prefs.blocked_sources or [],
        "blocked_keywords": prefs.blocked_keywords or [],
        "prioritized_topics": prefs.prioritized_topics or []
    }


@router.put("/filtering", response_model=FilteringResponse)
async def update_filtering(
    data: FilteringUpdate,
    db: Session = Depends(get_db)
):
    """Update content filtering settings"""
    prefs = get_or_create_preferences(db)

    prefs.blocked_sources = data.blocked_sources
    prefs.blocked_keywords = data.blocked_keywords
    prefs.prioritized_topics = data.prioritized_topics

    db.commit()
    db.refresh(prefs)

    return {
        "blocked_sources": prefs.blocked_sources,
        "blocked_keywords": prefs.blocked_keywords,
        "prioritized_topics": prefs.prioritized_topics
    }


# =============================================================================
# Truth Algorithm
# =============================================================================

@router.get("/truth-algorithm", response_model=TruthAlgorithmResponse)
async def get_truth_algorithm(db: Session = Depends(get_db)):
    """Get truth/spirituality algorithm settings"""
    prefs = get_or_create_preferences(db)
    return {
        "enabled": prefs.enable_truth_filter,
        "focus_topics": prefs.truth_focus_topics or [],
        "source_trust_levels": prefs.source_trust_levels or {}
    }


@router.put("/truth-algorithm", response_model=TruthAlgorithmResponse)
async def update_truth_algorithm(
    data: TruthAlgorithmUpdate,
    db: Session = Depends(get_db)
):
    """Update truth/spirituality algorithm settings"""
    prefs = get_or_create_preferences(db)

    prefs.enable_truth_filter = data.enabled
    prefs.truth_focus_topics = data.focus_topics
    prefs.source_trust_levels = data.source_trust_levels

    db.commit()
    db.refresh(prefs)

    return {
        "enabled": prefs.enable_truth_filter,
        "focus_topics": prefs.truth_focus_topics,
        "source_trust_levels": prefs.source_trust_levels
    }


# =============================================================================
# Custom Sections
# =============================================================================

@router.get("/custom-sections")
async def get_custom_sections(db: Session = Depends(get_db)):
    """Get custom newspaper sections"""
    prefs = get_or_create_preferences(db)
    return {"sections": prefs.custom_sections or []}


@router.put("/custom-sections")
async def update_custom_sections(
    data: CustomSectionsUpdate,
    db: Session = Depends(get_db)
):
    """Update custom newspaper sections"""
    prefs = get_or_create_preferences(db)
    prefs.custom_sections = [s.model_dump() for s in data.sections]
    db.commit()
    db.refresh(prefs)
    return {"sections": prefs.custom_sections}


# =============================================================================
# Display Preferences
# =============================================================================

@router.get("/display", response_model=DisplayPreferencesResponse)
async def get_display_preferences(db: Session = Depends(get_db)):
    """Get display preferences"""
    prefs = get_or_create_preferences(db)
    return {
        "show_weather": prefs.show_weather,
        "show_sports": prefs.show_sports,
        "show_horoscope_context": prefs.show_horoscope_context,
        "show_rss_content": prefs.show_rss_content
    }


@router.patch("/display", response_model=DisplayPreferencesResponse)
async def update_display_preferences(
    data: DisplayPreferencesUpdate,
    db: Session = Depends(get_db)
):
    """Update display preferences"""
    prefs = get_or_create_preferences(db)

    if data.show_weather is not None:
        prefs.show_weather = data.show_weather
    if data.show_sports is not None:
        prefs.show_sports = data.show_sports
    if data.show_horoscope_context is not None:
        prefs.show_horoscope_context = data.show_horoscope_context
    if data.show_rss_content is not None:
        prefs.show_rss_content = data.show_rss_content

    db.commit()
    db.refresh(prefs)

    return {
        "show_weather": prefs.show_weather,
        "show_sports": prefs.show_sports,
        "show_horoscope_context": prefs.show_horoscope_context,
        "show_rss_content": prefs.show_rss_content
    }


# =============================================================================
# RSS Feeds
# =============================================================================

@router.get("/rss-feeds", response_model=RssFeedListResponse)
async def list_rss_feeds(
    category: str = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all RSS feed subscriptions"""
    query = db.query(RssFeed)

    if category:
        query = query.filter(RssFeed.category == category)
    if active_only:
        query = query.filter(RssFeed.is_active == True)

    feeds = query.order_by(RssFeed.name).all()

    return {
        "feeds": [_feed_to_response(f) for f in feeds],
        "total": len(feeds)
    }


@router.post("/rss-feeds", response_model=RssFeedResponse, status_code=status.HTTP_201_CREATED)
async def create_rss_feed(
    feed: RssFeedCreate,
    db: Session = Depends(get_db)
):
    """Create a new RSS feed subscription"""
    # Check for duplicate URL
    existing = db.query(RssFeed).filter(RssFeed.url == feed.url).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Feed with URL '{feed.url}' already exists"
        )

    new_feed = RssFeed(
        url=feed.url,
        name=feed.name,
        category=feed.category,
        description=feed.description,
        topics=feed.topics,
        trust_level=str(feed.trust_level),
        supports_historical=feed.supports_historical,
        historical_url_template=feed.historical_url_template,
        is_active=True
    )

    db.add(new_feed)
    db.commit()
    db.refresh(new_feed)

    return _feed_to_response(new_feed)


@router.get("/rss-feeds/{feed_id}", response_model=RssFeedResponse)
async def get_rss_feed(feed_id: str, db: Session = Depends(get_db)):
    """Get a specific RSS feed"""
    feed = db.query(RssFeed).filter(RssFeed.id == feed_id).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feed {feed_id} not found"
        )
    return _feed_to_response(feed)


@router.patch("/rss-feeds/{feed_id}", response_model=RssFeedResponse)
async def update_rss_feed(
    feed_id: str,
    updates: RssFeedUpdate,
    db: Session = Depends(get_db)
):
    """Update an RSS feed"""
    feed = db.query(RssFeed).filter(RssFeed.id == feed_id).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feed {feed_id} not found"
        )

    if updates.name is not None:
        feed.name = updates.name
    if updates.category is not None:
        feed.category = updates.category
    if updates.description is not None:
        feed.description = updates.description
    if updates.is_active is not None:
        feed.is_active = updates.is_active
    if updates.topics is not None:
        feed.topics = updates.topics
    if updates.trust_level is not None:
        feed.trust_level = str(updates.trust_level)
    if updates.supports_historical is not None:
        feed.supports_historical = updates.supports_historical
    if updates.historical_url_template is not None:
        feed.historical_url_template = updates.historical_url_template

    db.commit()
    db.refresh(feed)

    return _feed_to_response(feed)


@router.delete("/rss-feeds/{feed_id}")
async def delete_rss_feed(feed_id: str, db: Session = Depends(get_db)):
    """Delete an RSS feed subscription"""
    feed = db.query(RssFeed).filter(RssFeed.id == feed_id).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feed {feed_id} not found"
        )

    db.delete(feed)
    db.commit()

    return {"message": f"Feed '{feed.name}' deleted", "success": True}


@router.post("/rss-feeds/test", response_model=RssFeedTestResponse)
async def test_rss_feed(url: str):
    """Test an RSS feed URL without saving"""
    service = get_rss_service()
    result = await service.fetch_feed(url)

    sample_entries = []
    for entry in result.entries[:5]:
        sample_entries.append({
            "title": entry.title,
            "link": entry.link,
            "published_date": entry.published_date,
            "summary": (entry.summary or "")[:200] + "..." if entry.summary and len(entry.summary) > 200 else entry.summary
        })

    return {
        "success": result.success,
        "feed_name": result.feed_name,
        "entry_count": result.entry_count,
        "error": result.error,
        "sample_entries": sample_entries
    }


@router.post("/rss-feeds/{feed_id}/refresh")
async def refresh_rss_feed(feed_id: str, db: Session = Depends(get_db)):
    """Manually refresh an RSS feed"""
    feed = db.query(RssFeed).filter(RssFeed.id == feed_id).first()
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feed {feed_id} not found"
        )

    service = get_rss_service()
    result = await service.fetch_feed(feed.url, feed.name)

    from app.core.datetime_helpers import now_iso
    feed.last_fetched_at = now_iso()

    if result.success:
        feed.entry_count = result.entry_count
        feed.last_error = None
    else:
        feed.last_error = result.error

    db.commit()
    db.refresh(feed)

    return {
        "success": result.success,
        "entry_count": result.entry_count,
        "error": result.error
    }


# =============================================================================
# RSS Categories
# =============================================================================

@router.get("/rss-categories")
async def get_rss_categories(db: Session = Depends(get_db)):
    """Get RSS feed categories"""
    prefs = get_or_create_preferences(db)
    return {"categories": prefs.rss_categories or ["news", "tech", "spiritual", "personal"]}


@router.put("/rss-categories")
async def update_rss_categories(
    data: RssCategoriesUpdate,
    db: Session = Depends(get_db)
):
    """Update RSS feed categories"""
    prefs = get_or_create_preferences(db)
    prefs.rss_categories = data.categories
    db.commit()
    db.refresh(prefs)
    return {"categories": prefs.rss_categories}


# =============================================================================
# Helpers
# =============================================================================

def _feed_to_response(feed: RssFeed) -> dict:
    """Convert RssFeed model to response dict"""
    return {
        "id": feed.id,
        "url": feed.url,
        "name": feed.name,
        "category": feed.category or "news",
        "description": feed.description,
        "is_active": feed.is_active,
        "topics": feed.topics or [],
        "trust_level": feed.trust_level_float,
        "supports_historical": feed.supports_historical,
        "historical_url_template": feed.historical_url_template,
        "last_fetched_at": feed.last_fetched_at,
        "last_error": feed.last_error,
        "entry_count": feed.entry_count or 0,
        "created_at": feed.created_at,
        "updated_at": feed.updated_at
    }
