"""
Personalized Newspaper Service

Generates a fully personalized Cosmic Paper combining:
- Multi-source news (Guardian, NYT, Wikipedia)
- Historical weather for user's location
- Sports news filtered by user's teams/leagues
- RSS feed content filtered by date
- Content ranked by user's interests and trust algorithm
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.services.weather_service import WeatherService, get_weather_service, HistoricalWeather, WeatherFetchError
from app.services.rss_service import RssService, get_rss_service
from app.services.sports_service import get_sports_service
from app.services.personalization_service import (
    PersonalizationService,
    PersonalizationConfig,
    create_personalization_service,
    ScoredArticle
)
from app.services.news_aggregator_service import AggregatedNews

if TYPE_CHECKING:
    from app.models.content_preferences import ContentPreferences
    from app.models.rss_feed import RssFeed

logger = logging.getLogger(__name__)


@dataclass
class PersonalizedSection:
    """A personalized newspaper section"""
    name: str
    articles: List[Dict[str, Any]] = field(default_factory=list)
    is_personalized: bool = True
    section_type: str = "custom"  # custom, sports, rss, weather


@dataclass
class PersonalizedNewspaper:
    """Complete personalized newspaper content"""
    date: str
    year: int
    month: int
    day: int

    # Main content
    headline: str
    date_display: str
    standard_sections: List[Dict[str, Any]] = field(default_factory=list)
    personalized_sections: List[PersonalizedSection] = field(default_factory=list)

    # Weather
    weather: Optional[Dict[str, Any]] = None

    # Metadata
    style: str = "modern"
    sources_used: List[str] = field(default_factory=list)
    personalization_applied: bool = False
    generation_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "year": self.year,
            "month": self.month,
            "day": self.day,
            "headline": self.headline,
            "date_display": self.date_display,
            "sections": self.standard_sections,
            "personalized_sections": [
                {
                    "name": s.name,
                    "articles": s.articles,
                    "is_personalized": s.is_personalized,
                    "section_type": s.section_type
                }
                for s in self.personalized_sections
            ],
            "weather": self.weather,
            "style": self.style,
            "sources_used": self.sources_used,
            "personalization_applied": self.personalization_applied,
            "metadata": self.generation_metadata
        }


class PersonalizedNewspaperService:
    """
    Service for generating personalized newspapers.

    Combines multi-source news aggregation with user personalization
    to create a unique newspaper experience tailored to the user's
    interests, location, and information preferences.

    Usage:
        service = PersonalizedNewspaperService(db)
        newspaper = await service.generate_personalized_newspaper(
            year=1969,
            month=7,
            day=20,
            base_newspaper=base_newspaper_content
        )
    """

    def __init__(self, db: Session):
        """
        Initialize with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        self._weather_service: Optional[WeatherService] = None
        self._rss_service: Optional[RssService] = None
        self._personalization_service: Optional[PersonalizationService] = None
        self._content_preferences: Optional["ContentPreferences"] = None

    def _get_content_preferences(self) -> "ContentPreferences":
        """Get or load content preferences"""
        if self._content_preferences is None:
            from app.models.content_preferences import ContentPreferences
            prefs = self.db.query(ContentPreferences).filter_by(id="1").first()
            if not prefs:
                # Create default preferences
                prefs = ContentPreferences(id="1")
                self.db.add(prefs)
                self.db.commit()
                self.db.refresh(prefs)
            self._content_preferences = prefs
        return self._content_preferences

    def _get_personalization_service(self) -> PersonalizationService:
        """Get or create personalization service"""
        if self._personalization_service is None:
            prefs = self._get_content_preferences()
            self._personalization_service = create_personalization_service(prefs)
        return self._personalization_service

    async def generate_personalized_newspaper(
        self,
        year: int,
        month: int,
        day: int,
        base_newspaper: Optional[Dict[str, Any]] = None,
        aggregated_news: Optional[AggregatedNews] = None,
        style: str = "modern"
    ) -> PersonalizedNewspaper:
        """
        Generate a personalized newspaper for a specific date.

        Args:
            year: Target year
            month: Target month (1-12)
            day: Target day (1-31)
            base_newspaper: Pre-generated base newspaper content
            aggregated_news: Pre-fetched aggregated news data
            style: Newspaper style (victorian/modern)

        Returns:
            PersonalizedNewspaper with all content
        """
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        prefs = self._get_content_preferences()

        # Start building the personalized newspaper
        newspaper = PersonalizedNewspaper(
            date=date_str,
            year=year,
            month=month,
            day=day,
            headline=base_newspaper.get("headline", f"The Cosmic Chronicle - {date_str}") if base_newspaper else f"The Cosmic Chronicle - {date_str}",
            date_display=base_newspaper.get("date_display", f"{month}/{day}/{year}") if base_newspaper else f"{month}/{day}/{year}",
            style=style
        )

        # Copy standard sections from base newspaper
        if base_newspaper and base_newspaper.get("sections"):
            newspaper.standard_sections = base_newspaper["sections"]
            newspaper.sources_used = base_newspaper.get("metadata", {}).get("sources_used", [])

        # Gather personalized content in parallel
        tasks = []

        # Weather (if configured)
        if prefs.show_weather and prefs.has_location:
            tasks.append(("weather", self._fetch_weather(year, month, day)))

        # Sports section (if configured)
        if prefs.show_sports and (prefs.sports_teams or prefs.sports_leagues):
            tasks.append(("sports", self._generate_sports_section(aggregated_news, base_newspaper)))

        # RSS content (if configured)
        if prefs.show_rss_content:
            tasks.append(("rss", self._fetch_rss_content(year, month, day)))

        # Custom sections based on interests
        if prefs.custom_sections:
            tasks.append(("custom", self._generate_custom_sections(aggregated_news, base_newspaper)))

        # Execute tasks in parallel
        if tasks:
            results = await asyncio.gather(
                *[task[1] for task in tasks],
                return_exceptions=True
            )

            for (task_type, _), result in zip(tasks, results):
                if isinstance(result, Exception):
                    logger.warning(f"Failed to generate {task_type} content: {result}")
                    continue

                if task_type == "weather" and result:
                    newspaper.weather = result

                elif task_type == "sports" and result:
                    newspaper.personalized_sections.append(result)

                elif task_type == "rss" and result:
                    newspaper.personalized_sections.extend(result)

                elif task_type == "custom" and result:
                    newspaper.personalized_sections.extend(result)

        # Apply personalization scoring to standard sections
        if base_newspaper and base_newspaper.get("sections"):
            personalization_service = self._get_personalization_service()
            newspaper.standard_sections = self._score_and_reorder_sections(
                base_newspaper["sections"],
                personalization_service
            )

        newspaper.personalization_applied = bool(
            newspaper.weather or
            newspaper.personalized_sections or
            prefs.interests
        )

        newspaper.generation_metadata = {
            "personalization_applied": newspaper.personalization_applied,
            "weather_included": newspaper.weather is not None,
            "personalized_section_count": len(newspaper.personalized_sections),
            "interests_count": len(prefs.interests or []),
            "truth_filter_enabled": prefs.enable_truth_filter
        }

        return newspaper

    async def _fetch_weather(
        self,
        year: int,
        month: int,
        day: int
    ) -> Optional[Dict[str, Any]]:
        """Fetch historical weather for user's location"""
        prefs = self._get_content_preferences()

        if not prefs.has_location:
            return None

        try:
            weather_service = get_weather_service()
            date_str = f"{year:04d}-{month:02d}-{day:02d}"

            weather = await weather_service.get_historical_weather(
                latitude=prefs.latitude,
                longitude=prefs.longitude,
                target_date=date_str,
                location_name=prefs.location_name
            )

            result = weather.to_dict()
            result["summary"] = weather.to_newspaper_summary()
            return result

        except WeatherFetchError as e:
            logger.warning(f"Weather fetch failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected weather error: {e}")
            return None

    async def _generate_sports_section(
        self,
        aggregated_news: Optional[AggregatedNews],
        base_newspaper: Optional[Dict[str, Any]]
    ) -> Optional[PersonalizedSection]:
        """Generate sports section from news content"""
        prefs = self._get_content_preferences()

        if not prefs.sports_teams and not prefs.sports_leagues:
            return None

        # Collect all articles
        all_articles = []

        # From aggregated news
        if aggregated_news:
            all_articles.extend(aggregated_news.guardian_articles)
            all_articles.extend(aggregated_news.nyt_articles)

        # From base newspaper sections
        if base_newspaper and base_newspaper.get("sections"):
            for section in base_newspaper["sections"]:
                all_articles.extend(section.get("articles", []))

        if not all_articles:
            return None

        # Filter for sports content
        sports_service = get_sports_service()
        sports_service.set_interests(
            teams=prefs.sports_teams,
            leagues=prefs.sports_leagues
        )

        matched_articles = sports_service.filter_articles(all_articles, min_score=0.1)

        if not matched_articles:
            return None

        # Format for newspaper
        formatted_articles = []
        for article in matched_articles[:5]:
            formatted = {
                "headline": article.get("headline", "Sports Update"),
                "content": article.get("content") or article.get("summary", ""),
                "year": article.get("year"),
                "source": article.get("source", "news"),
                "significance": self._format_sports_significance(article.get("sports_match", {}))
            }
            formatted_articles.append(formatted)

        if not formatted_articles:
            return None

        return PersonalizedSection(
            name="YOUR SPORTS",
            articles=formatted_articles,
            is_personalized=True,
            section_type="sports"
        )

    def _format_sports_significance(self, sports_match: Dict[str, Any]) -> str:
        """Format sports match info for display"""
        parts = []
        if sports_match.get("teams"):
            parts.append(f"Teams: {', '.join(sports_match['teams'])}")
        if sports_match.get("leagues"):
            parts.append(f"Leagues: {', '.join(sports_match['leagues'])}")
        return " | ".join(parts) if parts else "Sports content matching your interests"

    async def _fetch_rss_content(
        self,
        year: int,
        month: int,
        day: int
    ) -> List[PersonalizedSection]:
        """Fetch and filter RSS content by date"""
        from app.models.rss_feed import RssFeed

        # Get active feeds
        feeds = self.db.query(RssFeed).filter(
            RssFeed.is_active == True
        ).all()

        if not feeds:
            return []

        rss_service = get_rss_service()
        date_str = f"{year:04d}-{month:02d}-{day:02d}"

        # Group feeds by category
        feeds_by_category: Dict[str, List[RssFeed]] = {}
        for feed in feeds:
            category = feed.category or "general"
            if category not in feeds_by_category:
                feeds_by_category[category] = []
            feeds_by_category[category].append(feed)

        sections = []

        # Fetch feeds in parallel
        all_feed_data = []
        for feed in feeds:
            all_feed_data.append({
                "url": feed.url,
                "name": feed.name,
                "category": feed.category
            })

        results = await rss_service.fetch_multiple_feeds(all_feed_data, concurrency=5)

        # Group results by category
        entries_by_category: Dict[str, List[Dict[str, Any]]] = {}

        for result in results:
            if not result.success or not result.entries:
                continue

            # Find the feed to get its category
            feed = next((f for f in feeds if f.url == result.feed_url), None)
            if not feed:
                continue

            category = feed.category or "general"
            if category not in entries_by_category:
                entries_by_category[category] = []

            # Filter entries by date (match month/day for historical "on this day" feel)
            for entry in result.entries:
                if entry.published_date:
                    try:
                        entry_date = datetime.strptime(entry.published_date, '%Y-%m-%d')
                        if entry_date.month == month and entry_date.day == day:
                            entries_by_category[category].append(
                                entry.to_article_dict(result.feed_name)
                            )
                    except ValueError:
                        continue

        # Create sections for each category with content
        for category, entries in entries_by_category.items():
            if entries:
                sections.append(PersonalizedSection(
                    name=f"RSS: {category.upper()}",
                    articles=entries[:5],
                    is_personalized=True,
                    section_type="rss"
                ))

        return sections

    async def _generate_custom_sections(
        self,
        aggregated_news: Optional[AggregatedNews],
        base_newspaper: Optional[Dict[str, Any]]
    ) -> List[PersonalizedSection]:
        """Generate custom sections based on user interests"""
        prefs = self._get_content_preferences()

        if not prefs.custom_sections:
            return []

        # Collect all articles
        all_articles = []

        if aggregated_news:
            all_articles.extend(aggregated_news.guardian_articles)
            all_articles.extend(aggregated_news.nyt_articles)

        if base_newspaper and base_newspaper.get("sections"):
            for section in base_newspaper["sections"]:
                all_articles.extend(section.get("articles", []))

        if not all_articles:
            return []

        personalization_service = self._get_personalization_service()
        scored_articles = personalization_service.score_articles(all_articles)
        filtered_articles = personalization_service.filter_articles(scored_articles)

        sections = []

        for section_config in prefs.custom_sections:
            section_name = section_config.get("name", "Custom")
            section_topics = section_config.get("topics", [])

            if not section_topics:
                continue

            matching_articles = personalization_service.get_articles_for_section(
                filtered_articles,
                section_topics,
                limit=5
            )

            if matching_articles:
                sections.append(PersonalizedSection(
                    name=section_name,
                    articles=[a.to_dict() for a in matching_articles],
                    is_personalized=True,
                    section_type="custom"
                ))

        return sections

    def _score_and_reorder_sections(
        self,
        sections: List[Dict[str, Any]],
        personalization_service: PersonalizationService
    ) -> List[Dict[str, Any]]:
        """Score and potentially reorder articles within sections"""
        result = []

        for section in sections:
            section_copy = section.copy()
            articles = section.get("articles", [])

            if articles:
                # Score articles
                scored = personalization_service.score_articles(articles)

                # Filter blocked content
                filtered = personalization_service.filter_articles(scored)

                # Rank by combined score
                ranked = personalization_service.rank_articles(filtered)

                # Convert back to dicts
                section_copy["articles"] = [a.to_dict() for a in ranked]

            result.append(section_copy)

        return result


def get_personalized_newspaper_service(db: Session) -> PersonalizedNewspaperService:
    """Create a personalized newspaper service instance"""
    return PersonalizedNewspaperService(db)
