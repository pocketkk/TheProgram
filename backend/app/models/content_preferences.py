"""
ContentPreferences model for personalized Cosmic Paper settings

Singleton table - contains exactly ONE row (id=1)
Stores user content preferences for personalized news aggregation.
"""
from sqlalchemy import Column, String, Float, Boolean

from app.models.base import SingletonModel
from app.core.json_helpers import JSONEncodedDict, JSONEncodedList


class ContentPreferences(SingletonModel):
    """
    Content preferences singleton for personalized Cosmic Paper.

    This table contains exactly one row with id=1.
    Stores user's content interests, location, and personalization settings.

    Fields:
        # Location (for weather)
        location_name: Human-readable location name
        latitude: Location latitude
        longitude: Location longitude
        timezone: Timezone identifier (e.g., 'America/New_York')

        # Topics & Interests
        interests: List of topic interests with weights
            [{"topic": "technology", "weight": 1.0}, {"topic": "science", "weight": 0.8}]

        # Sports Preferences
        sports_teams: List of teams to follow
            [{"name": "Lakers", "league": "NBA", "sport": "basketball"}]
        sports_leagues: List of leagues to follow ["NBA", "NFL", "Premier League"]

        # RSS Feed Settings
        rss_categories: Categories for organizing RSS feeds
            ["tech", "news", "spiritual", "local"]

        # Content Filtering
        blocked_sources: Sources to never show ["source1", "source2"]
        blocked_keywords: Keywords to filter out ["spam", "clickbait"]
        prioritized_topics: Topics to boost in ranking

        # Truth/Spirituality Algorithm Settings
        enable_truth_filter: Enable spirituality/truth focused filtering
        truth_focus_topics: Topics aligned with user's spiritual journey
            ["consciousness", "astrology", "meditation", "philosophy"]
        source_trust_levels: User trust ratings for sources
            {"nyt": 0.8, "guardian": 0.9, "wikipedia": 0.7}

        # Personalization Flags
        show_weather: Show historical weather in newspaper
        show_sports: Show sports section if user has teams
        show_horoscope_context: Integrate astrological context

    Example:
        prefs = db.query(ContentPreferences).filter_by(id='1').first()
        prefs.interests = [
            {"topic": "technology", "weight": 1.0},
            {"topic": "space", "weight": 0.9},
            {"topic": "consciousness", "weight": 0.8}
        ]
        db.commit()
    """
    __tablename__ = 'content_preferences'

    # ==========================================================================
    # Location Settings (for weather)
    # ==========================================================================
    location_name = Column(
        String,
        nullable=True,
        comment="Human-readable location name (e.g., 'New York, NY')"
    )

    latitude = Column(
        Float,
        nullable=True,
        comment="Location latitude for weather lookup"
    )

    longitude = Column(
        Float,
        nullable=True,
        comment="Location longitude for weather lookup"
    )

    timezone = Column(
        String,
        nullable=True,
        comment="Timezone identifier (e.g., 'America/New_York')"
    )

    # ==========================================================================
    # Topics & Interests
    # ==========================================================================
    interests = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Topic interests with weights: [{"topic": "tech", "weight": 1.0}]'
    )

    # ==========================================================================
    # Sports Preferences
    # ==========================================================================
    sports_teams = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Teams to follow: [{"name": "Lakers", "league": "NBA", "sport": "basketball"}]'
    )

    sports_leagues = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Leagues to follow: ["NBA", "NFL", "Premier League"]'
    )

    # ==========================================================================
    # RSS Feed Settings
    # ==========================================================================
    rss_categories = Column(
        JSONEncodedList,
        nullable=True,
        default=lambda: ["news", "tech", "spiritual", "personal"],
        comment='Categories for organizing RSS feeds'
    )

    # ==========================================================================
    # Content Filtering
    # ==========================================================================
    blocked_sources = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Sources to never show in newspaper'
    )

    blocked_keywords = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Keywords to filter out from content'
    )

    prioritized_topics = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Topics to boost in content ranking'
    )

    # ==========================================================================
    # Truth/Spirituality Algorithm Settings
    # ==========================================================================
    enable_truth_filter = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Enable spirituality/truth focused content filtering"
    )

    truth_focus_topics = Column(
        JSONEncodedList,
        nullable=True,
        default=lambda: ["consciousness", "spirituality", "philosophy", "wisdom"],
        comment='Topics aligned with spiritual journey'
    )

    source_trust_levels = Column(
        JSONEncodedDict,
        nullable=True,
        default=dict,
        comment='User trust ratings for sources: {"nyt": 0.8, "guardian": 0.9}'
    )

    # ==========================================================================
    # Display Preferences
    # ==========================================================================
    show_weather = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Show historical weather in newspaper"
    )

    show_sports = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Show sports section if user has teams configured"
    )

    show_horoscope_context = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Integrate astrological context into newspaper"
    )

    show_rss_content = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Include RSS feed content in personalized sections"
    )

    # ==========================================================================
    # Personalized Sections Configuration
    # ==========================================================================
    custom_sections = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Custom newspaper sections: [{"name": "My Tech", "topics": ["AI", "coding"]}]'
    )

    def __repr__(self):
        """String representation"""
        interests_count = len(self.interests or [])
        teams_count = len(self.sports_teams or [])
        return (
            f"<ContentPreferences("
            f"interests={interests_count}, "
            f"teams={teams_count}, "
            f"location={self.location_name}"
            f")>"
        )

    @property
    def has_location(self) -> bool:
        """Check if location is configured for weather"""
        return self.latitude is not None and self.longitude is not None

    @property
    def active_interests(self) -> list:
        """Get interests sorted by weight (highest first)"""
        interests = self.interests or []
        return sorted(interests, key=lambda x: x.get('weight', 0.5), reverse=True)

    @property
    def followed_teams(self) -> list:
        """Get list of team names being followed"""
        teams = self.sports_teams or []
        return [t.get('name') for t in teams if t.get('name')]

    @property
    def followed_leagues(self) -> list:
        """Get list of leagues being followed"""
        return self.sports_leagues or []

    def get_interest_topics(self) -> list:
        """Get list of just topic names from interests"""
        return [i.get('topic') for i in (self.interests or []) if i.get('topic')]

    def get_trust_level(self, source: str) -> float:
        """Get trust level for a source (default 0.5)"""
        levels = self.source_trust_levels or {}
        return levels.get(source.lower(), 0.5)

    def to_preferences_dict(self) -> dict:
        """
        Get all preferences as a dictionary for API responses.
        Includes computed properties.
        """
        return {
            "location": {
                "name": self.location_name,
                "latitude": self.latitude,
                "longitude": self.longitude,
                "timezone": self.timezone,
                "configured": self.has_location
            },
            "interests": self.interests or [],
            "sports": {
                "teams": self.sports_teams or [],
                "leagues": self.sports_leagues or [],
                "show_sports": self.show_sports
            },
            "rss": {
                "categories": self.rss_categories or [],
                "show_content": self.show_rss_content
            },
            "filtering": {
                "blocked_sources": self.blocked_sources or [],
                "blocked_keywords": self.blocked_keywords or [],
                "prioritized_topics": self.prioritized_topics or []
            },
            "truth_algorithm": {
                "enabled": self.enable_truth_filter,
                "focus_topics": self.truth_focus_topics or [],
                "source_trust_levels": self.source_trust_levels or {}
            },
            "display": {
                "show_weather": self.show_weather,
                "show_sports": self.show_sports,
                "show_horoscope_context": self.show_horoscope_context,
                "show_rss_content": self.show_rss_content
            },
            "custom_sections": self.custom_sections or []
        }
