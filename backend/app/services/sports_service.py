"""
Sports Service

Fetches sports scores and news from ESPN and other sources.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
import re

import httpx

logger = logging.getLogger(__name__)


class SportsServiceError(Exception):
    """Base exception for sports service errors"""
    pass


class SportsApiError(SportsServiceError):
    """Error from sports API"""
    pass


@dataclass
class SportScore:
    """Sports score data"""
    game_id: str
    sport: str
    league: str
    status: str  # scheduled, in_progress, final
    home_team: str
    home_team_abbr: str
    home_score: Optional[int]
    home_logo: Optional[str]
    away_team: str
    away_team_abbr: str
    away_score: Optional[int]
    away_logo: Optional[str]
    start_time: datetime
    venue: Optional[str] = None
    broadcast: Optional[str] = None
    period: Optional[str] = None  # Q1, 1st Half, 3rd Inning, etc.
    time_remaining: Optional[str] = None


@dataclass
class SportsHeadline:
    """Sports news headline"""
    id: str
    title: str
    description: str
    url: str
    image_url: Optional[str]
    published_at: datetime
    sport: str
    league: Optional[str]
    source: str = "ESPN"


@dataclass
class SportsData:
    """Complete sports data"""
    scores: List[SportScore] = field(default_factory=list)
    headlines: List[SportsHeadline] = field(default_factory=list)
    fetched_at: datetime = field(default_factory=datetime.utcnow)


# Simple in-memory cache
_sports_cache: Dict[str, tuple[SportsData, datetime]] = {}
CACHE_DURATION = timedelta(minutes=5)


# ESPN endpoints (public, no API key required)
ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard"
ESPN_NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/news"

# Supported sports/leagues
SUPPORTED_LEAGUES = {
    "nfl": ("football", "nfl"),
    "nba": ("basketball", "nba"),
    "mlb": ("baseball", "mlb"),
    "nhl": ("hockey", "nhl"),
    "ncaaf": ("football", "college-football"),
    "ncaab": ("basketball", "mens-college-basketball"),
    "soccer_mls": ("soccer", "usa.1"),
    "soccer_epl": ("soccer", "eng.1"),
    "soccer_laliga": ("soccer", "esp.1"),
}


class SportsService:
    """
    Service for fetching sports data from ESPN.

    Features:
    - Live scores and game status
    - Sports news headlines
    - Multi-league support
    - Caching to reduce API calls

    Usage:
        service = SportsService()
        data = await service.get_sports_data(["nfl", "nba"])
    """

    DEFAULT_TIMEOUT = 30.0

    def __init__(self, timeout: float = DEFAULT_TIMEOUT):
        """Initialize sports service"""
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={"User-Agent": "CosmicChronicle/1.0"}
            )
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _get_cache_key(self, leagues: List[str]) -> str:
        """Generate cache key for leagues"""
        return ",".join(sorted(leagues))

    def _get_cached(self, leagues: List[str]) -> Optional[SportsData]:
        """Get cached sports data if valid"""
        key = self._get_cache_key(leagues)
        if key in _sports_cache:
            data, cached_at = _sports_cache[key]
            if datetime.utcnow() - cached_at < CACHE_DURATION:
                return data
            else:
                del _sports_cache[key]
        return None

    def _set_cache(self, leagues: List[str], data: SportsData):
        """Cache sports data"""
        key = self._get_cache_key(leagues)
        _sports_cache[key] = (data, datetime.utcnow())

    async def get_scores(self, league: str) -> List[SportScore]:
        """
        Get current scores for a league.

        Args:
            league: League key (nfl, nba, mlb, etc.)

        Returns:
            List of game scores
        """
        if league not in SUPPORTED_LEAGUES:
            logger.warning(f"Unsupported league: {league}")
            return []

        sport, league_id = SUPPORTED_LEAGUES[league]
        url = ESPN_SCOREBOARD_URL.format(sport=sport, league=league_id)

        client = await self._get_client()

        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            scores = []
            events = data.get("events", [])

            for event in events:
                try:
                    competition = event.get("competitions", [{}])[0]
                    competitors = competition.get("competitors", [])

                    if len(competitors) < 2:
                        continue

                    # Find home and away teams
                    home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
                    away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])

                    # Parse status
                    status_data = event.get("status", {})
                    status_type = status_data.get("type", {}).get("name", "scheduled")

                    status_map = {
                        "STATUS_SCHEDULED": "scheduled",
                        "STATUS_IN_PROGRESS": "in_progress",
                        "STATUS_HALFTIME": "in_progress",
                        "STATUS_FINAL": "final",
                        "STATUS_POSTPONED": "postponed",
                        "STATUS_CANCELED": "canceled",
                    }
                    status = status_map.get(status_type, "scheduled")

                    # Parse game time
                    start_time = datetime.fromisoformat(
                        event.get("date", "").replace("Z", "+00:00")
                    )

                    scores.append(SportScore(
                        game_id=event.get("id", ""),
                        sport=sport,
                        league=league.upper(),
                        status=status,
                        home_team=home.get("team", {}).get("displayName", ""),
                        home_team_abbr=home.get("team", {}).get("abbreviation", ""),
                        home_score=int(home.get("score", 0)) if home.get("score") else None,
                        home_logo=home.get("team", {}).get("logo"),
                        away_team=away.get("team", {}).get("displayName", ""),
                        away_team_abbr=away.get("team", {}).get("abbreviation", ""),
                        away_score=int(away.get("score", 0)) if away.get("score") else None,
                        away_logo=away.get("team", {}).get("logo"),
                        start_time=start_time,
                        venue=competition.get("venue", {}).get("fullName"),
                        broadcast=competition.get("broadcasts", [{}])[0].get("names", [""])[0] if competition.get("broadcasts") else None,
                        period=status_data.get("period"),
                        time_remaining=status_data.get("displayClock"),
                    ))
                except Exception as e:
                    logger.warning(f"Error parsing game: {e}")
                    continue

            return scores

        except httpx.HTTPStatusError as e:
            logger.error(f"ESPN API error for {league}: {e.response.status_code}")
            return []
        except httpx.RequestError as e:
            logger.error(f"ESPN request failed for {league}: {e}")
            return []

    async def get_headlines(self, league: str, limit: int = 10) -> List[SportsHeadline]:
        """
        Get news headlines for a league.

        Args:
            league: League key (nfl, nba, mlb, etc.)
            limit: Maximum headlines

        Returns:
            List of headlines
        """
        if league not in SUPPORTED_LEAGUES:
            logger.warning(f"Unsupported league: {league}")
            return []

        sport, league_id = SUPPORTED_LEAGUES[league]
        url = ESPN_NEWS_URL.format(sport=sport, league=league_id)

        client = await self._get_client()

        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            headlines = []
            articles = data.get("articles", [])[:limit]

            for article in articles:
                try:
                    published = article.get("published", "")
                    if published:
                        published_at = datetime.fromisoformat(
                            published.replace("Z", "+00:00")
                        )
                    else:
                        published_at = datetime.utcnow()

                    images = article.get("images", [])
                    image_url = images[0].get("url") if images else None

                    headlines.append(SportsHeadline(
                        id=str(article.get("id", "")),
                        title=article.get("headline", ""),
                        description=article.get("description", ""),
                        url=article.get("links", {}).get("web", {}).get("href", ""),
                        image_url=image_url,
                        published_at=published_at,
                        sport=sport,
                        league=league.upper(),
                    ))
                except Exception as e:
                    logger.warning(f"Error parsing headline: {e}")
                    continue

            return headlines

        except httpx.HTTPStatusError as e:
            logger.error(f"ESPN news API error for {league}: {e.response.status_code}")
            return []
        except httpx.RequestError as e:
            logger.error(f"ESPN news request failed for {league}: {e}")
            return []

    async def get_sports_data(
        self,
        leagues: List[str],
        include_scores: bool = True,
        include_headlines: bool = True,
        use_cache: bool = True
    ) -> SportsData:
        """
        Get scores and headlines for multiple leagues.

        Args:
            leagues: List of league keys
            include_scores: Include game scores
            include_headlines: Include news headlines
            use_cache: Whether to use cached data

        Returns:
            SportsData with scores and headlines
        """
        # Check cache
        if use_cache:
            cached = self._get_cached(leagues)
            if cached:
                return cached

        all_scores = []
        all_headlines = []

        # Fetch data in parallel
        tasks = []
        for league in leagues:
            if include_scores:
                tasks.append(("scores", league, self.get_scores(league)))
            if include_headlines:
                tasks.append(("headlines", league, self.get_headlines(league)))

        results = await asyncio.gather(
            *[task[2] for task in tasks],
            return_exceptions=True
        )

        for i, result in enumerate(results):
            task_type = tasks[i][0]
            if isinstance(result, Exception):
                logger.error(f"Error fetching {task_type}: {result}")
                continue
            if task_type == "scores":
                all_scores.extend(result)
            else:
                all_headlines.extend(result)

        # Sort by time
        all_scores.sort(key=lambda x: x.start_time, reverse=True)
        all_headlines.sort(key=lambda x: x.published_at, reverse=True)

        data = SportsData(
            scores=all_scores,
            headlines=all_headlines[:20],  # Limit total headlines
        )

        # Cache the result
        self._set_cache(leagues, data)

        return data

    def get_supported_leagues(self) -> Dict[str, Dict[str, str]]:
        """Get list of supported leagues"""
        return {
            key: {"sport": sport, "league_id": league_id, "display_name": key.upper()}
            for key, (sport, league_id) in SUPPORTED_LEAGUES.items()
        }

    def to_dict(self, data: SportsData) -> Dict[str, Any]:
        """Convert SportsData to dictionary for JSON response"""
        return {
            "scores": [
                {
                    "game_id": s.game_id,
                    "sport": s.sport,
                    "league": s.league,
                    "status": s.status,
                    "home_team": s.home_team,
                    "home_team_abbr": s.home_team_abbr,
                    "home_score": s.home_score,
                    "home_logo": s.home_logo,
                    "away_team": s.away_team,
                    "away_team_abbr": s.away_team_abbr,
                    "away_score": s.away_score,
                    "away_logo": s.away_logo,
                    "start_time": s.start_time.isoformat(),
                    "venue": s.venue,
                    "broadcast": s.broadcast,
                    "period": s.period,
                    "time_remaining": s.time_remaining,
                }
                for s in data.scores
            ],
            "headlines": [
                {
                    "id": h.id,
                    "title": h.title,
                    "description": h.description,
                    "url": h.url,
                    "image_url": h.image_url,
                    "published_at": h.published_at.isoformat(),
                    "sport": h.sport,
                    "league": h.league,
                    "source": h.source,
                }
                for h in data.headlines
            ],
            "fetched_at": data.fetched_at.isoformat(),
        }

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Singleton instance
_sports_service: Optional[SportsService] = None


def get_sports_service() -> SportsService:
    """Get sports service instance"""
    global _sports_service
    if _sports_service is None:
        _sports_service = SportsService()
    return _sports_service


async def close_sports_service():
    """Close the singleton sports service"""
    global _sports_service
    if _sports_service:
        await _sports_service.close()
        _sports_service = None
