"""
Personalization Service

The "algorithm" that controls the user's personalized Cosmic Paper.
Filters, scores, and ranks content based on user preferences,
interests, and trust settings.
"""
import logging
import re
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

from app.services.sports_service import SportsService, get_sports_service

logger = logging.getLogger(__name__)


class ContentSource(Enum):
    """Known content sources"""
    GUARDIAN = "guardian"
    NYT = "nyt"
    WIKIPEDIA = "wikipedia"
    RSS = "rss"
    WEATHER = "weather"
    SYSTEM = "system"


@dataclass
class PersonalizationConfig:
    """Configuration for content personalization"""
    # Topics & Interests
    interests: List[Dict[str, Any]] = field(default_factory=list)  # [{"topic": "...", "weight": 1.0}]

    # Sports
    sports_teams: List[Dict[str, Any]] = field(default_factory=list)
    sports_leagues: List[str] = field(default_factory=list)

    # Filtering
    blocked_sources: Set[str] = field(default_factory=set)
    blocked_keywords: Set[str] = field(default_factory=set)
    prioritized_topics: Set[str] = field(default_factory=set)

    # Truth Algorithm
    enable_truth_filter: bool = False
    truth_focus_topics: Set[str] = field(default_factory=set)
    source_trust_levels: Dict[str, float] = field(default_factory=dict)

    # Display
    show_weather: bool = True
    show_sports: bool = True
    show_horoscope_context: bool = True
    show_rss_content: bool = True

    # Custom sections
    custom_sections: List[Dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_content_preferences(cls, prefs: Any) -> "PersonalizationConfig":
        """Create config from ContentPreferences model"""
        return cls(
            interests=prefs.interests or [],
            sports_teams=prefs.sports_teams or [],
            sports_leagues=prefs.sports_leagues or [],
            blocked_sources=set(prefs.blocked_sources or []),
            blocked_keywords=set(k.lower() for k in (prefs.blocked_keywords or [])),
            prioritized_topics=set(t.lower() for t in (prefs.prioritized_topics or [])),
            enable_truth_filter=prefs.enable_truth_filter or False,
            truth_focus_topics=set(t.lower() for t in (prefs.truth_focus_topics or [])),
            source_trust_levels=prefs.source_trust_levels or {},
            show_weather=prefs.show_weather if prefs.show_weather is not None else True,
            show_sports=prefs.show_sports if prefs.show_sports is not None else True,
            show_horoscope_context=prefs.show_horoscope_context if prefs.show_horoscope_context is not None else True,
            show_rss_content=prefs.show_rss_content if prefs.show_rss_content is not None else True,
            custom_sections=prefs.custom_sections or []
        )


@dataclass
class ScoredArticle:
    """Article with personalization score"""
    article: Dict[str, Any]
    relevance_score: float = 0.0
    trust_score: float = 0.5
    combined_score: float = 0.0
    matched_interests: List[str] = field(default_factory=list)
    matched_sports: Dict[str, Any] = field(default_factory=dict)
    is_blocked: bool = False
    block_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = self.article.copy()
        result["_personalization"] = {
            "relevance_score": self.relevance_score,
            "trust_score": self.trust_score,
            "combined_score": self.combined_score,
            "matched_interests": self.matched_interests,
            "matched_sports": self.matched_sports,
            "is_blocked": self.is_blocked,
            "block_reason": self.block_reason
        }
        return result


class PersonalizationService:
    """
    The user's personal content algorithm.

    Controls what content appears in their Cosmic Paper based on:
    - Topic interests with weights
    - Sports teams/leagues
    - Source trust levels (truth algorithm)
    - Blocked sources/keywords
    - Custom section configurations

    This gives users full control over their information feed,
    supporting their spirituality and personal truth.

    Usage:
        service = PersonalizationService(config)

        # Score and filter articles
        scored = service.score_articles(articles)
        filtered = service.filter_articles(scored)
        ranked = service.rank_articles(filtered)

        # Get articles for custom sections
        tech_articles = service.get_articles_for_section(ranked, "technology")
    """

    def __init__(self, config: PersonalizationConfig):
        """
        Initialize personalization service.

        Args:
            config: PersonalizationConfig with user preferences
        """
        self.config = config
        self._sports_service: Optional[SportsService] = None

        # Build keyword patterns
        self._interest_patterns = self._build_interest_patterns()

    def _build_interest_patterns(self) -> Dict[str, re.Pattern]:
        """Build regex patterns for interest matching"""
        patterns = {}
        for interest in self.config.interests:
            topic = interest.get("topic", "").lower()
            if topic:
                # Create pattern that matches whole words
                patterns[topic] = re.compile(rf'\b{re.escape(topic)}\b', re.IGNORECASE)
        return patterns

    def _get_sports_service(self) -> SportsService:
        """Get configured sports service"""
        if self._sports_service is None:
            self._sports_service = get_sports_service()
            self._sports_service.set_interests(
                teams=self.config.sports_teams,
                leagues=self.config.sports_leagues
            )
        return self._sports_service

    def score_article(self, article: Dict[str, Any]) -> ScoredArticle:
        """
        Score a single article based on user preferences.

        Args:
            article: Article dict with headline, content, source, etc.

        Returns:
            ScoredArticle with scores and matches
        """
        result = ScoredArticle(article=article)

        # Get text content
        headline = article.get("headline", "")
        content = article.get("content") or article.get("summary", "")
        source = article.get("source", "").lower()
        combined_text = f"{headline} {content}".lower()

        # Check if blocked
        if self._is_blocked(source, combined_text):
            result.is_blocked = True
            result.block_reason = self._get_block_reason(source, combined_text)
            return result

        # Calculate relevance score based on interests
        result.relevance_score, result.matched_interests = self._calculate_relevance(
            headline, combined_text
        )

        # Calculate trust score based on source
        result.trust_score = self._calculate_trust(source)

        # Check sports matches
        if self.config.show_sports and (self.config.sports_teams or self.config.sports_leagues):
            sports_service = self._get_sports_service()
            match = sports_service.match_content(content, headline)
            if match.matched:
                result.matched_sports = match.to_dict()
                # Boost relevance for sports matches
                result.relevance_score += match.score * 0.3

        # Calculate combined score
        if self.config.enable_truth_filter:
            # Weight trust more heavily when truth filter is enabled
            result.combined_score = (
                result.relevance_score * 0.4 +
                result.trust_score * 0.6
            )
        else:
            # Normal weighting
            result.combined_score = (
                result.relevance_score * 0.7 +
                result.trust_score * 0.3
            )

        # Bonus for prioritized topics
        for topic in self.config.prioritized_topics:
            if topic in combined_text:
                result.combined_score *= 1.2  # 20% boost

        # Bonus for truth focus topics
        if self.config.enable_truth_filter:
            for topic in self.config.truth_focus_topics:
                if topic in combined_text:
                    result.combined_score *= 1.15  # 15% boost

        # Cap at 1.0
        result.combined_score = min(1.0, result.combined_score)

        return result

    def _is_blocked(self, source: str, text: str) -> bool:
        """Check if content should be blocked"""
        # Check blocked sources
        if source in self.config.blocked_sources:
            return True

        # Check blocked keywords
        for keyword in self.config.blocked_keywords:
            if keyword in text:
                return True

        return False

    def _get_block_reason(self, source: str, text: str) -> str:
        """Get reason content was blocked"""
        if source in self.config.blocked_sources:
            return f"Blocked source: {source}"

        for keyword in self.config.blocked_keywords:
            if keyword in text:
                return f"Blocked keyword: {keyword}"

        return "Unknown"

    def _calculate_relevance(
        self,
        headline: str,
        full_text: str
    ) -> tuple[float, List[str]]:
        """
        Calculate relevance score based on interests.

        Returns:
            Tuple of (score, list of matched interests)
        """
        if not self.config.interests:
            return (0.5, [])  # Neutral if no interests configured

        score = 0.0
        matched = []

        for interest in self.config.interests:
            topic = interest.get("topic", "").lower()
            weight = interest.get("weight", 1.0)
            pattern = self._interest_patterns.get(topic)

            if not pattern:
                continue

            # Check headline (more valuable)
            if pattern.search(headline):
                score += weight * 0.6
                matched.append(topic)
            # Check full text
            elif pattern.search(full_text):
                score += weight * 0.3
                matched.append(topic)

        # Normalize score
        max_possible = sum(i.get("weight", 1.0) * 0.6 for i in self.config.interests)
        if max_possible > 0:
            score = min(1.0, score / max_possible)

        return (score, list(set(matched)))

    def _calculate_trust(self, source: str) -> float:
        """Calculate trust score for a source"""
        source_lower = source.lower()

        # Check user-defined trust levels
        if source_lower in self.config.source_trust_levels:
            return self.config.source_trust_levels[source_lower]

        # Default trust levels for known sources
        default_trust = {
            "guardian": 0.7,
            "nyt": 0.7,
            "wikipedia": 0.6,
            "rss": 0.5,
            "system": 0.5
        }

        return default_trust.get(source_lower, 0.5)

    def score_articles(
        self,
        articles: List[Dict[str, Any]]
    ) -> List[ScoredArticle]:
        """
        Score multiple articles.

        Args:
            articles: List of article dicts

        Returns:
            List of ScoredArticle objects
        """
        return [self.score_article(a) for a in articles]

    def filter_articles(
        self,
        scored_articles: List[ScoredArticle],
        include_blocked: bool = False
    ) -> List[ScoredArticle]:
        """
        Filter out blocked articles.

        Args:
            scored_articles: List of ScoredArticle objects
            include_blocked: If True, include blocked articles (marked)

        Returns:
            Filtered list of articles
        """
        if include_blocked:
            return scored_articles

        return [a for a in scored_articles if not a.is_blocked]

    def rank_articles(
        self,
        scored_articles: List[ScoredArticle],
        limit: Optional[int] = None
    ) -> List[ScoredArticle]:
        """
        Rank articles by combined score.

        Args:
            scored_articles: List of ScoredArticle objects
            limit: Maximum number to return

        Returns:
            Sorted list (highest score first)
        """
        sorted_articles = sorted(
            scored_articles,
            key=lambda a: a.combined_score,
            reverse=True
        )

        if limit:
            return sorted_articles[:limit]
        return sorted_articles

    def get_articles_for_section(
        self,
        scored_articles: List[ScoredArticle],
        section_topics: List[str],
        limit: int = 5
    ) -> List[ScoredArticle]:
        """
        Get articles matching specific section topics.

        Args:
            scored_articles: Pre-scored articles
            section_topics: List of topics for this section
            limit: Maximum articles to return

        Returns:
            Articles matching section topics, ranked by score
        """
        section_topics_lower = [t.lower() for t in section_topics]
        matching = []

        for article in scored_articles:
            if article.is_blocked:
                continue

            # Check if any matched interests overlap with section topics
            if any(t in section_topics_lower for t in article.matched_interests):
                matching.append(article)
                continue

            # Check content directly
            text = f"{article.article.get('headline', '')} {article.article.get('content', '')}".lower()
            if any(topic in text for topic in section_topics_lower):
                matching.append(article)

        # Sort by combined score and limit
        matching.sort(key=lambda a: a.combined_score, reverse=True)
        return matching[:limit]

    def get_sports_articles(
        self,
        scored_articles: List[ScoredArticle],
        limit: int = 5
    ) -> List[ScoredArticle]:
        """
        Get articles matching user's sports interests.

        Args:
            scored_articles: Pre-scored articles
            limit: Maximum articles to return

        Returns:
            Sports-related articles matching user interests
        """
        matching = [
            a for a in scored_articles
            if not a.is_blocked and a.matched_sports.get("matched")
        ]

        matching.sort(key=lambda a: a.matched_sports.get("score", 0), reverse=True)
        return matching[:limit]

    def build_personalized_sections(
        self,
        scored_articles: List[ScoredArticle]
    ) -> List[Dict[str, Any]]:
        """
        Build personalized newspaper sections from scored articles.

        Args:
            scored_articles: Pre-scored articles

        Returns:
            List of section dicts with name and articles
        """
        sections = []

        # Build custom sections from config
        for section_config in self.config.custom_sections:
            section_name = section_config.get("name", "Custom")
            section_topics = section_config.get("topics", [])

            articles = self.get_articles_for_section(
                scored_articles,
                section_topics,
                limit=5
            )

            if articles:
                sections.append({
                    "name": section_name,
                    "articles": [a.to_dict() for a in articles],
                    "is_personalized": True
                })

        # Add sports section if configured
        if self.config.show_sports and (self.config.sports_teams or self.config.sports_leagues):
            sports_articles = self.get_sports_articles(scored_articles, limit=5)
            if sports_articles:
                sections.append({
                    "name": "YOUR SPORTS",
                    "articles": [a.to_dict() for a in sports_articles],
                    "is_personalized": True
                })

        return sections

    def get_interest_summary(self) -> Dict[str, Any]:
        """
        Get summary of configured interests for UI display.

        Returns:
            Dict with interest configuration summary
        """
        return {
            "topics_count": len(self.config.interests),
            "top_topics": [i.get("topic") for i in self.config.interests[:5]],
            "sports": {
                "teams_count": len(self.config.sports_teams),
                "leagues_count": len(self.config.sports_leagues),
                "teams": [t.get("name") for t in self.config.sports_teams[:3]],
                "leagues": self.config.sports_leagues[:3]
            },
            "filtering": {
                "blocked_sources": len(self.config.blocked_sources),
                "blocked_keywords": len(self.config.blocked_keywords),
                "prioritized_topics": len(self.config.prioritized_topics)
            },
            "truth_algorithm": {
                "enabled": self.config.enable_truth_filter,
                "focus_topics_count": len(self.config.truth_focus_topics)
            }
        }


def create_personalization_service(
    content_preferences: Any
) -> PersonalizationService:
    """
    Create PersonalizationService from ContentPreferences model.

    Args:
        content_preferences: ContentPreferences model instance

    Returns:
        Configured PersonalizationService
    """
    config = PersonalizationConfig.from_content_preferences(content_preferences)
    return PersonalizationService(config)
