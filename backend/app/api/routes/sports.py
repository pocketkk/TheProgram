"""
Sports endpoints for Cosmic Chronicle

Scores, headlines, and favorites management.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models.sports_favorite import SportsFavorite
from app.schemas.sports import (
    SportsFavoriteCreate,
    SportsFavoriteResponse,
    SportsFavoriteListResponse,
    SportScore,
    SportsHeadline,
    SportsDataResponse,
    SupportedLeague,
    SupportedLeaguesResponse,
)
from app.schemas.common import Message
from app.services.sports_service import (
    get_sports_service,
    SportsServiceError,
)

router = APIRouter()


# =============================================================================
# Supported Leagues
# =============================================================================

@router.get("/sports/leagues", response_model=SupportedLeaguesResponse)
async def get_supported_leagues():
    """
    Get list of supported sports leagues.

    Returns:
        List of supported leagues with their IDs
    """
    service = get_sports_service()
    leagues_dict = service.get_supported_leagues()

    leagues = [
        SupportedLeague(
            key=key,
            sport=info["sport"],
            league_id=info["league_id"],
            display_name=info["display_name"]
        )
        for key, info in leagues_dict.items()
    ]

    return SupportedLeaguesResponse(leagues=leagues)


# =============================================================================
# Scores and Headlines
# =============================================================================

@router.get("/sports/scores", response_model=List[SportScore])
async def get_scores(
    leagues: str = Query(
        "nfl,nba",
        description="Comma-separated league keys (e.g., nfl,nba,mlb)"
    ),
):
    """
    Get current scores for specified leagues.

    Args:
        leagues: Comma-separated league keys

    Returns:
        List of game scores
    """
    service = get_sports_service()
    league_list = [l.strip().lower() for l in leagues.split(",") if l.strip()]

    if not league_list:
        return []

    try:
        data = await service.get_sports_data(
            league_list,
            include_scores=True,
            include_headlines=False
        )

        return [
            SportScore(
                game_id=s.game_id,
                sport=s.sport,
                league=s.league,
                status=s.status,
                home_team=s.home_team,
                home_team_abbr=s.home_team_abbr,
                home_score=s.home_score,
                home_logo=s.home_logo,
                away_team=s.away_team,
                away_team_abbr=s.away_team_abbr,
                away_score=s.away_score,
                away_logo=s.away_logo,
                start_time=s.start_time,
                venue=s.venue,
                broadcast=s.broadcast,
                period=s.period,
                time_remaining=s.time_remaining,
            )
            for s in data.scores
        ]
    except SportsServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sports API error: {str(e)}"
        )


@router.get("/sports/headlines", response_model=List[SportsHeadline])
async def get_headlines(
    leagues: str = Query(
        "nfl,nba",
        description="Comma-separated league keys"
    ),
    limit: int = Query(10, ge=1, le=50, description="Maximum headlines"),
):
    """
    Get sports headlines for specified leagues.

    Args:
        leagues: Comma-separated league keys
        limit: Maximum headlines per league

    Returns:
        List of headlines
    """
    service = get_sports_service()
    league_list = [l.strip().lower() for l in leagues.split(",") if l.strip()]

    if not league_list:
        return []

    try:
        data = await service.get_sports_data(
            league_list,
            include_scores=False,
            include_headlines=True
        )

        headlines = [
            SportsHeadline(
                id=h.id,
                title=h.title,
                description=h.description,
                url=h.url,
                image_url=h.image_url,
                published_at=h.published_at,
                sport=h.sport,
                league=h.league,
                source=h.source,
            )
            for h in data.headlines[:limit]
        ]

        return headlines
    except SportsServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sports API error: {str(e)}"
        )


@router.get("/sports/data", response_model=SportsDataResponse)
async def get_sports_data(
    leagues: str = Query(
        "nfl,nba",
        description="Comma-separated league keys"
    ),
):
    """
    Get combined scores and headlines for specified leagues.

    Args:
        leagues: Comma-separated league keys

    Returns:
        Scores and headlines
    """
    service = get_sports_service()
    league_list = [l.strip().lower() for l in leagues.split(",") if l.strip()]

    if not league_list:
        return SportsDataResponse(scores=[], headlines=[], fetched_at=None)

    try:
        data = await service.get_sports_data(league_list)

        return SportsDataResponse(
            scores=[
                SportScore(
                    game_id=s.game_id,
                    sport=s.sport,
                    league=s.league,
                    status=s.status,
                    home_team=s.home_team,
                    home_team_abbr=s.home_team_abbr,
                    home_score=s.home_score,
                    home_logo=s.home_logo,
                    away_team=s.away_team,
                    away_team_abbr=s.away_team_abbr,
                    away_score=s.away_score,
                    away_logo=s.away_logo,
                    start_time=s.start_time,
                    venue=s.venue,
                    broadcast=s.broadcast,
                    period=s.period,
                    time_remaining=s.time_remaining,
                )
                for s in data.scores
            ],
            headlines=[
                SportsHeadline(
                    id=h.id,
                    title=h.title,
                    description=h.description,
                    url=h.url,
                    image_url=h.image_url,
                    published_at=h.published_at,
                    sport=h.sport,
                    league=h.league,
                    source=h.source,
                )
                for h in data.headlines
            ],
            fetched_at=data.fetched_at,
        )
    except SportsServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sports API error: {str(e)}"
        )


# =============================================================================
# Favorites Management
# =============================================================================

@router.post("/sports/favorites", response_model=SportsFavoriteResponse, status_code=status.HTTP_201_CREATED)
async def create_favorite(
    favorite_in: SportsFavoriteCreate,
    db: Session = Depends(get_db)
):
    """
    Add a sports favorite (team, league, or sport).

    Args:
        favorite_in: Favorite data
        db: Database session

    Returns:
        Created favorite
    """
    # Check for duplicate
    existing = db.query(SportsFavorite).filter(
        SportsFavorite.entity_type == favorite_in.entity_type,
        SportsFavorite.entity_id == favorite_in.entity_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already added as favorite"
        )

    favorite = SportsFavorite(
        entity_type=favorite_in.entity_type,
        entity_id=favorite_in.entity_id,
        name=favorite_in.name,
        sport=favorite_in.sport,
        league=favorite_in.league,
        logo_url=favorite_in.logo_url,
    )

    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    return favorite


@router.get("/sports/favorites", response_model=SportsFavoriteListResponse)
async def list_favorites(
    sport: Optional[str] = Query(None, description="Filter by sport"),
    db: Session = Depends(get_db)
):
    """
    List all sports favorites.

    Returns:
        List of favorites
    """
    query = db.query(SportsFavorite)

    if sport:
        query = query.filter(SportsFavorite.sport == sport)

    query = query.order_by(SportsFavorite.sport, SportsFavorite.name)
    favorites = query.all()

    return SportsFavoriteListResponse(
        favorites=favorites,
        total=len(favorites)
    )


@router.delete("/sports/favorites/{favorite_id}", response_model=Message)
async def delete_favorite(
    favorite_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Remove a sports favorite.

    Args:
        favorite_id: Favorite ID
        db: Database session

    Returns:
        Success message
    """
    favorite = db.query(SportsFavorite).filter(
        SportsFavorite.id == str(favorite_id)
    ).first()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )

    db.delete(favorite)
    db.commit()

    return Message(message="Favorite removed successfully")


@router.get("/sports/favorites/scores", response_model=List[SportScore])
async def get_favorite_scores(
    db: Session = Depends(get_db)
):
    """
    Get scores for favorite teams/leagues.

    Returns:
        Scores filtered to favorites
    """
    # Get all favorites
    favorites = db.query(SportsFavorite).all()

    if not favorites:
        return []

    # Get unique leagues from favorites
    leagues = set()
    favorite_teams = set()

    for fav in favorites:
        if fav.entity_type == "league":
            leagues.add(fav.entity_id)
        elif fav.league:
            leagues.add(fav.league.lower())

        if fav.entity_type == "team":
            favorite_teams.add(fav.name.lower())
            favorite_teams.add(fav.entity_id.lower())

    if not leagues:
        return []

    service = get_sports_service()

    try:
        data = await service.get_sports_data(
            list(leagues),
            include_scores=True,
            include_headlines=False
        )

        # Filter scores to favorite teams if any team favorites exist
        scores = data.scores
        if favorite_teams:
            scores = [
                s for s in scores
                if (
                    s.home_team.lower() in favorite_teams or
                    s.away_team.lower() in favorite_teams or
                    s.home_team_abbr.lower() in favorite_teams or
                    s.away_team_abbr.lower() in favorite_teams
                )
            ]

        return [
            SportScore(
                game_id=s.game_id,
                sport=s.sport,
                league=s.league,
                status=s.status,
                home_team=s.home_team,
                home_team_abbr=s.home_team_abbr,
                home_score=s.home_score,
                home_logo=s.home_logo,
                away_team=s.away_team,
                away_team_abbr=s.away_team_abbr,
                away_score=s.away_score,
                away_logo=s.away_logo,
                start_time=s.start_time,
                venue=s.venue,
                broadcast=s.broadcast,
                period=s.period,
                time_remaining=s.time_remaining,
            )
            for s in scores
        ]
    except SportsServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sports API error: {str(e)}"
        )
