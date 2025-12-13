"""
Sports News Service

Filters and enhances news content with sports-specific matching
for teams, leagues, and sports the user follows.
"""
import logging
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class TeamInfo:
    """Information about a sports team"""
    name: str
    league: str
    sport: str
    aliases: List[str] = field(default_factory=list)
    city: Optional[str] = None
    country: Optional[str] = None

    def get_all_names(self) -> Set[str]:
        """Get all possible name variations"""
        names = {self.name.lower()}
        for alias in self.aliases:
            names.add(alias.lower())
        if self.city:
            names.add(f"{self.city} {self.name}".lower())
        return names


@dataclass
class LeagueInfo:
    """Information about a sports league"""
    name: str
    sport: str
    country: Optional[str] = None
    aliases: List[str] = field(default_factory=list)

    def get_all_names(self) -> Set[str]:
        """Get all possible name variations"""
        names = {self.name.lower()}
        for alias in self.aliases:
            names.add(alias.lower())
        return names


# Common sports leagues with aliases
KNOWN_LEAGUES: Dict[str, LeagueInfo] = {
    # North American
    "NBA": LeagueInfo("NBA", "basketball", "USA", ["National Basketball Association", "pro basketball"]),
    "NFL": LeagueInfo("NFL", "american_football", "USA", ["National Football League", "pro football"]),
    "MLB": LeagueInfo("MLB", "baseball", "USA", ["Major League Baseball", "pro baseball"]),
    "NHL": LeagueInfo("NHL", "ice_hockey", "USA", ["National Hockey League", "pro hockey"]),
    "MLS": LeagueInfo("MLS", "soccer", "USA", ["Major League Soccer"]),

    # European Football
    "Premier League": LeagueInfo("Premier League", "soccer", "England", ["EPL", "English Premier League"]),
    "La Liga": LeagueInfo("La Liga", "soccer", "Spain", ["Spanish La Liga"]),
    "Serie A": LeagueInfo("Serie A", "soccer", "Italy", ["Italian Serie A"]),
    "Bundesliga": LeagueInfo("Bundesliga", "soccer", "Germany", ["German Bundesliga"]),
    "Ligue 1": LeagueInfo("Ligue 1", "soccer", "France", ["French Ligue 1"]),
    "Champions League": LeagueInfo("Champions League", "soccer", "Europe", ["UEFA Champions League", "UCL"]),

    # Tennis
    "ATP": LeagueInfo("ATP", "tennis", None, ["ATP Tour", "Association of Tennis Professionals"]),
    "WTA": LeagueInfo("WTA", "tennis", None, ["WTA Tour", "Women's Tennis Association"]),

    # Golf
    "PGA": LeagueInfo("PGA", "golf", "USA", ["PGA Tour", "Professional Golfers' Association"]),
    "LPGA": LeagueInfo("LPGA", "golf", "USA", ["LPGA Tour", "Ladies Professional Golf Association"]),

    # Racing
    "F1": LeagueInfo("F1", "motorsport", None, ["Formula 1", "Formula One"]),
    "NASCAR": LeagueInfo("NASCAR", "motorsport", "USA", ["National Association for Stock Car Racing"]),

    # Combat Sports
    "UFC": LeagueInfo("UFC", "mma", None, ["Ultimate Fighting Championship"]),
    "WWE": LeagueInfo("WWE", "wrestling", "USA", ["World Wrestling Entertainment"]),
    "Boxing": LeagueInfo("Boxing", "boxing", None, ["professional boxing"]),

    # Cricket
    "IPL": LeagueInfo("IPL", "cricket", "India", ["Indian Premier League"]),
    "ICC": LeagueInfo("ICC", "cricket", None, ["International Cricket Council"]),

    # Rugby
    "Six Nations": LeagueInfo("Six Nations", "rugby", "Europe", ["Six Nations Championship"]),
    "Super Rugby": LeagueInfo("Super Rugby", "rugby", "Southern Hemisphere", []),
}


# Sport-specific keywords for content filtering
SPORT_KEYWORDS: Dict[str, List[str]] = {
    "basketball": ["basketball", "hoops", "slam dunk", "three-pointer", "nba", "court"],
    "american_football": ["football", "touchdown", "quarterback", "nfl", "super bowl", "gridiron"],
    "baseball": ["baseball", "home run", "pitcher", "mlb", "innings", "batting"],
    "ice_hockey": ["hockey", "puck", "nhl", "goalie", "stanley cup", "rink"],
    "soccer": ["football", "soccer", "goal", "striker", "premier league", "world cup", "pitch"],
    "tennis": ["tennis", "grand slam", "wimbledon", "ace", "match point"],
    "golf": ["golf", "pga", "birdie", "eagle", "masters", "fairway"],
    "motorsport": ["racing", "f1", "nascar", "grand prix", "pit stop", "lap"],
    "mma": ["mma", "ufc", "knockout", "submission", "octagon"],
    "boxing": ["boxing", "heavyweight", "knockout", "title fight"],
    "cricket": ["cricket", "wicket", "innings", "test match", "ipl"],
    "rugby": ["rugby", "try", "scrum", "six nations"],
}


@dataclass
class SportsMatch:
    """Result of matching content to sports interests"""
    matched: bool
    teams: List[str] = field(default_factory=list)
    leagues: List[str] = field(default_factory=list)
    sports: List[str] = field(default_factory=list)
    score: float = 0.0  # Relevance score 0-1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "matched": self.matched,
            "teams": self.teams,
            "leagues": self.leagues,
            "sports": self.sports,
            "score": self.score
        }


class SportsService:
    """
    Sports news filtering and matching service.

    Matches news content against user's sports interests
    (teams, leagues, sports) to provide personalized sports coverage.

    Usage:
        service = SportsService()

        # Configure user interests
        service.set_interests(
            teams=[
                {"name": "Lakers", "league": "NBA", "sport": "basketball"},
                {"name": "Manchester United", "league": "Premier League", "sport": "soccer"}
            ],
            leagues=["NFL", "Champions League"],
            sports=["tennis"]
        )

        # Match content
        match = service.match_content("Lakers beat Celtics 110-105 in overtime thriller")
        if match.matched:
            print(f"Matched teams: {match.teams}")
    """

    def __init__(self):
        """Initialize sports service"""
        self.followed_teams: List[TeamInfo] = []
        self.followed_leagues: Set[str] = set()
        self.followed_sports: Set[str] = set()
        self._team_names_cache: Set[str] = set()
        self._league_names_cache: Set[str] = set()

    def set_interests(
        self,
        teams: Optional[List[Dict[str, Any]]] = None,
        leagues: Optional[List[str]] = None,
        sports: Optional[List[str]] = None
    ):
        """
        Configure user's sports interests.

        Args:
            teams: List of team dicts with name, league, sport, and optional aliases
            leagues: List of league names to follow
            sports: List of sports to follow
        """
        # Parse teams
        self.followed_teams = []
        if teams:
            for team in teams:
                self.followed_teams.append(TeamInfo(
                    name=team.get("name", ""),
                    league=team.get("league", ""),
                    sport=team.get("sport", ""),
                    aliases=team.get("aliases", []),
                    city=team.get("city"),
                    country=team.get("country")
                ))

        # Set leagues
        self.followed_leagues = set(leagues or [])

        # Set sports
        self.followed_sports = set(s.lower() for s in (sports or []))

        # Build name caches
        self._build_name_caches()

    def _build_name_caches(self):
        """Build caches for fast name lookups"""
        # Team names
        self._team_names_cache = set()
        for team in self.followed_teams:
            self._team_names_cache.update(team.get_all_names())

        # League names (from followed + known aliases)
        self._league_names_cache = set()
        for league_name in self.followed_leagues:
            self._league_names_cache.add(league_name.lower())
            if league_name in KNOWN_LEAGUES:
                self._league_names_cache.update(
                    KNOWN_LEAGUES[league_name].get_all_names()
                )

    def match_content(
        self,
        text: str,
        headline: Optional[str] = None
    ) -> SportsMatch:
        """
        Match text content against user's sports interests.

        Args:
            text: Content text to match
            headline: Optional headline (weighted more heavily)

        Returns:
            SportsMatch with matched teams, leagues, sports, and score
        """
        if not text:
            return SportsMatch(matched=False)

        text_lower = text.lower()
        headline_lower = headline.lower() if headline else ""
        combined = f"{headline_lower} {text_lower}"

        matched_teams = []
        matched_leagues = []
        matched_sports = []

        # Match teams
        for team in self.followed_teams:
            for name in team.get_all_names():
                if name in combined:
                    matched_teams.append(team.name)
                    break

        # Match leagues
        for league_name in self.followed_leagues:
            # Check league name directly
            if league_name.lower() in combined:
                matched_leagues.append(league_name)
                continue

            # Check aliases from known leagues
            if league_name in KNOWN_LEAGUES:
                league_info = KNOWN_LEAGUES[league_name]
                for alias in league_info.get_all_names():
                    if alias in combined:
                        matched_leagues.append(league_name)
                        break

        # Match sports
        for sport in self.followed_sports:
            keywords = SPORT_KEYWORDS.get(sport, [sport])
            for keyword in keywords:
                if keyword in combined:
                    matched_sports.append(sport)
                    break

        # Calculate relevance score
        score = self._calculate_score(
            matched_teams, matched_leagues, matched_sports, headline_lower
        )

        matched = bool(matched_teams or matched_leagues or matched_sports)

        return SportsMatch(
            matched=matched,
            teams=list(set(matched_teams)),
            leagues=list(set(matched_leagues)),
            sports=list(set(matched_sports)),
            score=score
        )

    def _calculate_score(
        self,
        teams: List[str],
        leagues: List[str],
        sports: List[str],
        headline: str
    ) -> float:
        """Calculate relevance score (0-1)"""
        score = 0.0

        # Teams are most important
        score += len(teams) * 0.4

        # Leagues next
        score += len(leagues) * 0.3

        # Sports least specific
        score += len(sports) * 0.2

        # Bonus for headline matches
        for team in self.followed_teams:
            for name in team.get_all_names():
                if name in headline:
                    score += 0.1
                    break

        return min(1.0, score)

    def filter_articles(
        self,
        articles: List[Dict[str, Any]],
        min_score: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Filter articles to only those matching sports interests.

        Args:
            articles: List of article dicts with headline and content/summary
            min_score: Minimum match score to include (0-1)

        Returns:
            Filtered list of articles with sports_match metadata
        """
        filtered = []

        for article in articles:
            headline = article.get("headline", "")
            content = article.get("content") or article.get("summary", "")

            match = self.match_content(content, headline)

            if match.matched and match.score >= min_score:
                article_copy = article.copy()
                article_copy["sports_match"] = match.to_dict()
                filtered.append(article_copy)

        # Sort by score descending
        filtered.sort(key=lambda a: a.get("sports_match", {}).get("score", 0), reverse=True)

        return filtered

    def categorize_article(
        self,
        headline: str,
        content: str
    ) -> Optional[str]:
        """
        Categorize article into a sport category.

        Args:
            headline: Article headline
            content: Article content

        Returns:
            Sport category name or None if not sports-related
        """
        combined = f"{headline} {content}".lower()

        # Check each sport's keywords
        for sport, keywords in SPORT_KEYWORDS.items():
            for keyword in keywords:
                if keyword in combined:
                    return sport

        return None

    def get_sports_section_filters(self) -> Dict[str, List[str]]:
        """
        Get keyword filters for sports section of newspaper.

        Returns:
            Dict mapping sport categories to filter keywords
        """
        filters = {}

        # Add keywords for followed sports
        for sport in self.followed_sports:
            if sport in SPORT_KEYWORDS:
                filters[sport] = SPORT_KEYWORDS[sport]

        # Add keywords for sports of followed teams
        for team in self.followed_teams:
            if team.sport and team.sport not in filters:
                if team.sport in SPORT_KEYWORDS:
                    filters[team.sport] = SPORT_KEYWORDS[team.sport]

        # Add keywords for sports of followed leagues
        for league_name in self.followed_leagues:
            if league_name in KNOWN_LEAGUES:
                sport = KNOWN_LEAGUES[league_name].sport
                if sport and sport not in filters:
                    if sport in SPORT_KEYWORDS:
                        filters[sport] = SPORT_KEYWORDS[sport]

        return filters

    def is_sports_content(self, text: str) -> bool:
        """
        Check if text is sports-related (regardless of user interests).

        Args:
            text: Text to check

        Returns:
            True if content appears to be sports-related
        """
        text_lower = text.lower()

        # Check all sport keywords
        for keywords in SPORT_KEYWORDS.values():
            for keyword in keywords:
                if keyword in text_lower:
                    return True

        # Check known leagues
        for league_info in KNOWN_LEAGUES.values():
            for name in league_info.get_all_names():
                if name in text_lower:
                    return True

        return False


# Singleton instance
_sports_service: Optional[SportsService] = None


def get_sports_service() -> SportsService:
    """Get or create sports service singleton"""
    global _sports_service
    if _sports_service is None:
        _sports_service = SportsService()
    return _sports_service
