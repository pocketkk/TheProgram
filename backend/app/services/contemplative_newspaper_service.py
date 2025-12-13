"""
Contemplative Newspaper Service

The unified service for generating a fully contemplative Cosmic Paper.
Integrates all 18 features into a cohesive, soul-nurturing newspaper experience.
"""
import asyncio
import logging
import random
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

# Existing services
from app.services.personalized_newspaper_service import (
    PersonalizedNewspaperService,
    PersonalizedNewspaper
)
from app.services.weather_service import get_weather_service

# New contemplative services
from app.services.lineage_service import LineageService
from app.services.dream_service import DreamService
from app.services.synchronicity_service import SynchronicityService
from app.services.chart_weather_service import ChartWeatherService

logger = logging.getLogger(__name__)


@dataclass
class ContemplativeSection:
    """A contemplative newspaper section"""
    name: str
    section_type: str
    content: Dict[str, Any] = field(default_factory=dict)
    is_empty_intentionally: bool = False
    contemplation_prompt: Optional[str] = None


@dataclass
class ContemplativeNewspaper:
    """Complete contemplative newspaper"""
    date: str
    year: int
    month: int
    day: int

    # Base personalized content
    base_newspaper: Optional[Dict[str, Any]] = None

    # Contemplative sections
    chart_weather: Optional[Dict[str, Any]] = None
    lineage_section: Optional[Dict[str, Any]] = None
    dream_section: Optional[Dict[str, Any]] = None
    synchronicity_section: Optional[Dict[str, Any]] = None
    questions_section: Optional[Dict[str, Any]] = None
    silence_section: Optional[Dict[str, Any]] = None
    empty_page: Optional[Dict[str, Any]] = None
    collective_weather: Optional[Dict[str, Any]] = None
    seasonal_section: Optional[Dict[str, Any]] = None

    # Metadata
    contemplative_depth: str = "balanced"  # light, balanced, deep
    generation_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "date": self.date,
            "year": self.year,
            "month": self.month,
            "day": self.day,
            "base_newspaper": self.base_newspaper,
            "contemplative_sections": {}
        }

        # Add contemplative sections
        if self.chart_weather:
            result["contemplative_sections"]["chart_weather"] = self.chart_weather
        if self.lineage_section:
            result["contemplative_sections"]["lineage"] = self.lineage_section
        if self.dream_section:
            result["contemplative_sections"]["dreams"] = self.dream_section
        if self.synchronicity_section:
            result["contemplative_sections"]["synchronicity"] = self.synchronicity_section
        if self.questions_section:
            result["contemplative_sections"]["questions"] = self.questions_section
        if self.silence_section:
            result["contemplative_sections"]["silence"] = self.silence_section
        if self.empty_page:
            result["contemplative_sections"]["empty_page"] = self.empty_page
        if self.collective_weather:
            result["contemplative_sections"]["collective_weather"] = self.collective_weather
        if self.seasonal_section:
            result["contemplative_sections"]["seasonal"] = self.seasonal_section

        result["contemplative_depth"] = self.contemplative_depth
        result["metadata"] = self.generation_metadata

        return result


class ContemplativeNewspaperService:
    """
    Service for generating fully contemplative newspapers.

    This service orchestrates all 18 contemplative features:

    1. Synchronicity Tracker - Pattern detection in news
    2. Mood-Aware Content - Content filtered by emotional state
    3. Historical Parallels Engine - Connect events to personal chart
    4. Source Diversity Score - Perspective balance
    5. Silence Sections - Intentional blank spaces
    6. Ancestor Weather - Weather from ancestor locations
    7. Dream Integration - Connect dreams to news
    8. Gratitude Filter - Surface good news
    9. The Unread Archive - Saved for later (handled by frontend)
    10. Collective Weather Report - Emotional temperature
    11. The Forgetting Feature - Let articles disappear (frontend)
    12. Birth Chart Weather Overlay - Personal transits
    13. Lineage Mode - Family ages on historical dates
    14. The Questions Section - Archetypal questions
    15. Seasonal Awareness - Natural cycle integration
    16. The Witness Log - Journal responses (frontend)
    17. Contradiction Surfacing - Opposing viewpoints
    18. The Empty Page - Single contemplation piece
    """

    # Seasonal themes based on month
    SEASONAL_THEMES = {
        1: {"season": "Deep Winter", "theme": "Stillness", "element": "Water",
            "invitation": "What is being nurtured in the darkness?"},
        2: {"season": "Late Winter", "theme": "Quickening", "element": "Water",
            "invitation": "What is stirring beneath the surface?"},
        3: {"season": "Early Spring", "theme": "Emergence", "element": "Wood",
            "invitation": "What wants to break through?"},
        4: {"season": "Spring", "theme": "Growth", "element": "Wood",
            "invitation": "What is expanding in your life?"},
        5: {"season": "Late Spring", "theme": "Flowering", "element": "Fire",
            "invitation": "What is blooming?"},
        6: {"season": "Early Summer", "theme": "Abundance", "element": "Fire",
            "invitation": "What is ripening?"},
        7: {"season": "Summer", "theme": "Fullness", "element": "Fire",
            "invitation": "What is being celebrated?"},
        8: {"season": "Late Summer", "theme": "Harvest", "element": "Earth",
            "invitation": "What has matured?"},
        9: {"season": "Early Autumn", "theme": "Letting Go", "element": "Metal",
            "invitation": "What is ready to be released?"},
        10: {"season": "Autumn", "theme": "Descent", "element": "Metal",
             "invitation": "What is being composted?"},
        11: {"season": "Late Autumn", "theme": "Emptying", "element": "Water",
             "invitation": "What is being stripped away?"},
        12: {"season": "Early Winter", "theme": "Stillness", "element": "Water",
             "invitation": "What is being held in the dark?"}
    }

    # Archetypal questions to generate from news themes
    ARCHETYPAL_QUESTIONS = [
        "What in you resonates with this?",
        "Where have you experienced this before?",
        "What fear does this touch?",
        "What hope does this awaken?",
        "What would your ancestors say?",
        "What does this ask of you?",
        "What is the teaching here?",
        "Where is the love in this?",
        "What is the gift hidden in this difficulty?",
        "How might this serve growth?",
        "What pattern is this part of?",
        "What wants to be born from this?",
        "What needs to die for this to transform?",
        "Where is the sacred in this?",
        "What would compassion see here?"
    ]

    def __init__(self, db: Session):
        self.db = db
        self._personalized_service = PersonalizedNewspaperService(db)
        self._lineage_service = LineageService(db)
        self._dream_service = DreamService(db)
        self._sync_service = SynchronicityService(db)
        self._chart_service = ChartWeatherService(db)

    async def generate_contemplative_newspaper(
        self,
        year: int,
        month: int,
        day: int,
        base_newspaper: Optional[Dict[str, Any]] = None,
        depth: str = "balanced",
        include_sections: Optional[List[str]] = None
    ) -> ContemplativeNewspaper:
        """
        Generate a complete contemplative newspaper.

        Args:
            year: Target year
            month: Target month
            day: Target day
            base_newspaper: Pre-generated base content
            depth: Contemplative depth (light, balanced, deep)
            include_sections: Specific sections to include (or all)

        Returns:
            ContemplativeNewspaper with all contemplative sections
        """
        date_str = f"{year:04d}-{month:02d}-{day:02d}"

        newspaper = ContemplativeNewspaper(
            date=date_str,
            year=year,
            month=month,
            day=day,
            base_newspaper=base_newspaper,
            contemplative_depth=depth
        )

        # Collect articles from base newspaper for analysis
        articles = self._extract_articles(base_newspaper)

        # Determine which sections to generate
        all_sections = [
            "chart_weather", "lineage", "dreams", "synchronicity",
            "questions", "silence", "empty_page", "collective_weather", "seasonal"
        ]

        if include_sections:
            sections_to_gen = [s for s in include_sections if s in all_sections]
        else:
            sections_to_gen = all_sections

        # Generate sections based on depth
        if depth == "light":
            sections_to_gen = [s for s in sections_to_gen
                            if s in ["chart_weather", "seasonal", "questions"]]
        elif depth == "deep":
            pass  # Include all

        # Generate sections in parallel
        tasks = []

        if "chart_weather" in sections_to_gen:
            tasks.append(("chart_weather", self._generate_chart_weather(year, month, day)))

        if "lineage" in sections_to_gen:
            tasks.append(("lineage", self._generate_lineage_section(year, month, day)))

        if "dreams" in sections_to_gen:
            tasks.append(("dreams", self._generate_dream_section(date_str)))

        if "synchronicity" in sections_to_gen:
            tasks.append(("synchronicity", self._generate_synchronicity_section(articles)))

        if "questions" in sections_to_gen:
            tasks.append(("questions", self._generate_questions_section(articles)))

        if "silence" in sections_to_gen:
            tasks.append(("silence", self._generate_silence_section(depth)))

        if "empty_page" in sections_to_gen:
            tasks.append(("empty_page", self._generate_empty_page(articles)))

        if "collective_weather" in sections_to_gen:
            tasks.append(("collective_weather", self._generate_collective_weather(articles)))

        if "seasonal" in sections_to_gen:
            tasks.append(("seasonal", self._generate_seasonal_section(month, day)))

        # Execute in parallel
        if tasks:
            results = await asyncio.gather(
                *[task[1] for task in tasks],
                return_exceptions=True
            )

            for (section_name, _), result in zip(tasks, results):
                if isinstance(result, Exception):
                    logger.warning(f"Failed to generate {section_name}: {result}")
                    continue

                if section_name == "chart_weather":
                    newspaper.chart_weather = result
                elif section_name == "lineage":
                    newspaper.lineage_section = result
                elif section_name == "dreams":
                    newspaper.dream_section = result
                elif section_name == "synchronicity":
                    newspaper.synchronicity_section = result
                elif section_name == "questions":
                    newspaper.questions_section = result
                elif section_name == "silence":
                    newspaper.silence_section = result
                elif section_name == "empty_page":
                    newspaper.empty_page = result
                elif section_name == "collective_weather":
                    newspaper.collective_weather = result
                elif section_name == "seasonal":
                    newspaper.seasonal_section = result

        newspaper.generation_metadata = {
            "depth": depth,
            "sections_generated": sections_to_gen,
            "article_count_analyzed": len(articles),
            "timestamp": datetime.now().isoformat()
        }

        return newspaper

    def _extract_articles(self, base_newspaper: Optional[Dict]) -> List[Dict]:
        """Extract all articles from base newspaper"""
        if not base_newspaper:
            return []

        articles = []

        for section in base_newspaper.get("sections", []):
            articles.extend(section.get("articles", []))

        for section in base_newspaper.get("personalized_sections", []):
            articles.extend(section.get("articles", []))

        return articles

    async def _generate_chart_weather(
        self,
        year: int,
        month: int,
        day: int
    ) -> Dict[str, Any]:
        """Generate chart weather section"""
        return self._chart_service.generate_newspaper_section(year, month, day)

    async def _generate_lineage_section(
        self,
        year: int,
        month: int,
        day: int
    ) -> Dict[str, Any]:
        """Generate lineage section"""
        return self._lineage_service.generate_newspaper_section(year, month, day)

    async def _generate_dream_section(
        self,
        target_date: str
    ) -> Dict[str, Any]:
        """Generate dream section"""
        return self._dream_service.generate_newspaper_section(target_date)

    async def _generate_synchronicity_section(
        self,
        articles: List[Dict]
    ) -> Dict[str, Any]:
        """Generate synchronicity section"""
        return self._sync_service.generate_newspaper_section(articles)

    async def _generate_questions_section(
        self,
        articles: List[Dict]
    ) -> Dict[str, Any]:
        """
        Generate The Questions Section.

        Extracts themes from articles and generates archetypal
        questions for contemplation.
        """
        # Extract themes from headlines
        themes = set()
        for article in articles[:10]:
            headline = article.get("headline", "").lower()
            # Simple theme extraction
            if any(w in headline for w in ["war", "conflict", "fight"]):
                themes.add("conflict")
            if any(w in headline for w in ["death", "dies", "killed"]):
                themes.add("mortality")
            if any(w in headline for w in ["win", "victory", "triumph"]):
                themes.add("achievement")
            if any(w in headline for w in ["discover", "new", "breakthrough"]):
                themes.add("discovery")
            if any(w in headline for w in ["crisis", "emergency", "disaster"]):
                themes.add("crisis")
            if any(w in headline for w in ["love", "marriage", "wedding"]):
                themes.add("love")
            if any(w in headline for w in ["birth", "born", "baby"]):
                themes.add("new_life")

        # Select relevant questions
        selected_questions = random.sample(self.ARCHETYPAL_QUESTIONS, min(5, len(self.ARCHETYPAL_QUESTIONS)))

        # Add theme-specific questions
        theme_questions = {
            "conflict": "Where is the battle within you?",
            "mortality": "What would you do if this was your last day?",
            "achievement": "What are you striving toward?",
            "discovery": "What is waiting to be discovered in you?",
            "crisis": "What is this crisis calling forth in you?",
            "love": "Where is love asking more of you?",
            "new_life": "What is being born in you?"
        }

        for theme in list(themes)[:3]:
            if theme in theme_questions:
                selected_questions.insert(0, theme_questions[theme])

        return {
            "section_name": "QUESTIONS FOR THE SOUL",
            "section_type": "questions",
            "themes_detected": list(themes),
            "questions": selected_questions[:7],
            "invitation": "Let these questions sit with you. No answers required.",
            "has_content": bool(selected_questions)
        }

    async def _generate_silence_section(
        self,
        depth: str
    ) -> Dict[str, Any]:
        """
        Generate The Silence Section.

        An intentionally blank space for rest between content.
        """
        silence_durations = {
            "light": "3 breaths",
            "balanced": "5 breaths",
            "deep": "10 breaths"
        }

        silence_invitations = [
            "Notice your breath.",
            "Feel your body.",
            "Let the words settle.",
            "What remains when the noise stops?",
            "Here is space for what cannot be written.",
            "Between the stories, you are.",
            "Rest here a moment.",
            "Nothing to read. Nothing to do.",
        ]

        return {
            "section_name": "THE SILENCE",
            "section_type": "silence",
            "is_intentionally_empty": True,
            "duration": silence_durations.get(depth, "5 breaths"),
            "invitation": random.choice(silence_invitations),
            "display_lines": 10 if depth == "deep" else 5
        }

    async def _generate_empty_page(
        self,
        articles: List[Dict]
    ) -> Dict[str, Any]:
        """
        Generate The Empty Page.

        Select one piece to sit with - stripping away everything else.
        """
        if not articles:
            return {
                "section_name": "THE EMPTY PAGE",
                "section_type": "empty_page",
                "has_content": False
            }

        # Select one significant article
        # Prefer articles with more emotional weight
        selected = random.choice(articles[:5]) if articles else None

        if selected:
            return {
                "section_name": "THE EMPTY PAGE",
                "section_type": "empty_page",
                "headline": selected.get("headline"),
                "content": selected.get("content", "")[:500],
                "source": selected.get("source"),
                "invitation": "This. Just this. What does it ask of you?",
                "has_content": True
            }

        return {"section_name": "THE EMPTY PAGE", "has_content": False}

    async def _generate_collective_weather(
        self,
        articles: List[Dict]
    ) -> Dict[str, Any]:
        """
        Generate Collective Weather Report.

        Aggregate emotional temperature from news themes.
        """
        # Simple sentiment analysis on headlines
        positive_words = {"hope", "peace", "win", "success", "celebrate", "breakthrough", "love", "joy"}
        negative_words = {"war", "death", "crisis", "fear", "fail", "tragedy", "disaster", "violence"}
        neutral_words = {"announce", "report", "says", "plan", "consider", "meet"}

        positive_count = 0
        negative_count = 0
        neutral_count = 0

        for article in articles:
            headline = article.get("headline", "").lower()
            words = set(headline.split())

            if words & positive_words:
                positive_count += 1
            elif words & negative_words:
                negative_count += 1
            else:
                neutral_count += 1

        total = positive_count + negative_count + neutral_count or 1

        # Determine collective weather
        if negative_count / total > 0.5:
            weather = "stormy"
            description = "The collective is processing difficulty."
            guidance = "Extra gentleness is called for."
        elif positive_count / total > 0.5:
            weather = "bright"
            description = "Hope and possibility are in the air."
            guidance = "Ride this energy toward what matters."
        else:
            weather = "mixed"
            description = "The usual complexity of human experience."
            guidance = "Find your center amid the swirl."

        return {
            "section_name": "COLLECTIVE WEATHER",
            "section_type": "collective_weather",
            "weather": weather,
            "description": description,
            "guidance": guidance,
            "positive_ratio": round(positive_count / total, 2),
            "negative_ratio": round(negative_count / total, 2),
            "neutral_ratio": round(neutral_count / total, 2),
            "articles_analyzed": total,
            "has_content": True
        }

    async def _generate_seasonal_section(
        self,
        month: int,
        day: int
    ) -> Dict[str, Any]:
        """
        Generate Seasonal Awareness section.

        Connect to natural cycles and rhythms.
        """
        seasonal_data = self.SEASONAL_THEMES.get(month, self.SEASONAL_THEMES[1])

        # Add specific observances
        observances = self._get_seasonal_observances(month, day)

        return {
            "section_name": "SEASONAL AWARENESS",
            "section_type": "seasonal",
            "season": seasonal_data["season"],
            "theme": seasonal_data["theme"],
            "element": seasonal_data["element"],
            "invitation": seasonal_data["invitation"],
            "observances": observances,
            "nature_note": self._get_nature_note(month),
            "has_content": True
        }

    def _get_seasonal_observances(self, month: int, day: int) -> List[str]:
        """Get notable observances for the date"""
        # Simplified - could be expanded
        observances = []

        # Solstices and equinoxes
        if month == 3 and 19 <= day <= 22:
            observances.append("Spring Equinox - Day and night in balance")
        elif month == 6 and 20 <= day <= 22:
            observances.append("Summer Solstice - Peak of light")
        elif month == 9 and 21 <= day <= 24:
            observances.append("Autumn Equinox - Day and night in balance")
        elif month == 12 and 20 <= day <= 23:
            observances.append("Winter Solstice - Return of the light")

        return observances

    def _get_nature_note(self, month: int) -> str:
        """Get a nature observation for the month"""
        notes = {
            1: "Seeds sleep in frozen earth, dreaming of spring.",
            2: "First stirrings beneath the snow. The sap begins to rise.",
            3: "Crocuses push through. The world remembers color.",
            4: "Birdsong returns. Everything unfolds.",
            5: "Abundance everywhere. Life at full volume.",
            6: "Long days of light. The world in full bloom.",
            7: "Summer's peak. Heat and growth.",
            8: "The first fruits ripen. Harvest begins.",
            9: "The turn. Light begins its retreat.",
            10: "Leaves release their hold. Beauty in letting go.",
            11: "The trees go bare. Essential structures revealed.",
            12: "Darkness holds the seed of returning light."
        }
        return notes.get(month, "The great wheel turns.")


def get_contemplative_newspaper_service(db: Session) -> ContemplativeNewspaperService:
    """Create a contemplative newspaper service instance"""
    return ContemplativeNewspaperService(db)
