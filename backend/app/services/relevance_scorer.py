"""
Relevance Scorer Service

Scores articles based on user interests for personalized feeds.
Part of Cosmic Chronicle - privacy-first personal news hub.

All scoring is done locally with no external API calls.
"""
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.interest_profile import InterestProfile
from app.services.interest_tracker import get_interest_tracker, TopicExtraction

logger = logging.getLogger(__name__)


@dataclass
class ScoredArticle:
    """Article with relevance score"""
    article: Dict[str, Any]
    relevance_score: float
    matched_topics: List[str]
    category_match: bool


class RelevanceScorer:
    """
    Service for scoring articles based on user interests.

    Features:
    - Topic-based relevance scoring
    - Category matching
    - Recency boosting
    - Source preference weighting

    Usage:
        scorer = RelevanceScorer()
        scored = scorer.score_articles(db, articles)
        top_articles = scorer.get_for_you(db, articles, limit=10)
    """

    def __init__(
        self,
        topic_weight: float = 0.6,
        category_weight: float = 0.2,
        recency_weight: float = 0.1,
        source_weight: float = 0.1
    ):
        """
        Initialize relevance scorer.

        Args:
            topic_weight: Weight for topic matching (0-1)
            category_weight: Weight for category matching (0-1)
            recency_weight: Weight for article recency (0-1)
            source_weight: Weight for source preference (0-1)
        """
        self.topic_weight = topic_weight
        self.category_weight = category_weight
        self.recency_weight = recency_weight
        self.source_weight = source_weight
        self.tracker = get_interest_tracker()

    def score_article(
        self,
        db: Session,
        article: Dict[str, Any],
        interest_cache: Dict[str, float] = None
    ) -> ScoredArticle:
        """
        Score a single article for relevance.

        Args:
            db: Database session
            article: Article dict with title, content/summary, source
            interest_cache: Optional pre-loaded interest scores

        Returns:
            ScoredArticle with score and metadata
        """
        # Extract topics from article
        title = article.get('title', article.get('headline', ''))
        content = article.get('content', article.get('summary', article.get('description', '')))

        extraction = self.tracker.extract_topics(title, content)

        # Load interest cache if not provided
        if interest_cache is None:
            interest_cache = self._load_interest_cache(db)

        # Calculate topic score
        topic_score = 0.0
        matched_topics = []

        for topic in extraction.topics:
            topic_lower = topic.lower()
            if topic_lower in interest_cache:
                topic_score += interest_cache[topic_lower]
                matched_topics.append(topic_lower)

        # Normalize topic score (average of matched topics)
        if matched_topics:
            topic_score /= len(extraction.topics)  # Normalize by total topics
        else:
            topic_score = 0.3  # Neutral score for new topics

        # Calculate category score
        category_match = False
        category_score = 0.3  # Neutral default

        if extraction.category:
            # Check if user has interest in this category
            category_profiles = db.query(InterestProfile).filter(
                InterestProfile.category == extraction.category,
                InterestProfile.score > 0.5
            ).all()

            if category_profiles:
                category_score = sum(p.get_decayed_score() for p in category_profiles) / len(category_profiles)
                category_match = True

        # Calculate recency score (placeholder - would use published_at)
        recency_score = 0.5  # Neutral for now

        # Calculate source score (placeholder - would track source preferences)
        source_score = 0.5  # Neutral for now

        # Combine scores
        final_score = (
            topic_score * self.topic_weight +
            category_score * self.category_weight +
            recency_score * self.recency_weight +
            source_score * self.source_weight
        )

        return ScoredArticle(
            article=article,
            relevance_score=round(final_score, 4),
            matched_topics=matched_topics,
            category_match=category_match
        )

    def score_articles(
        self,
        db: Session,
        articles: List[Dict[str, Any]]
    ) -> List[ScoredArticle]:
        """
        Score multiple articles for relevance.

        Args:
            db: Database session
            articles: List of article dicts

        Returns:
            List of ScoredArticle sorted by relevance
        """
        if not articles:
            return []

        # Pre-load interest cache for efficiency
        interest_cache = self._load_interest_cache(db)

        # Score all articles
        scored = [
            self.score_article(db, article, interest_cache)
            for article in articles
        ]

        # Sort by relevance (highest first)
        scored.sort(key=lambda x: x.relevance_score, reverse=True)

        return scored

    def get_for_you(
        self,
        db: Session,
        articles: List[Dict[str, Any]],
        limit: int = 10,
        min_score: float = 0.4
    ) -> List[Dict[str, Any]]:
        """
        Get personalized "For You" articles.

        Args:
            db: Database session
            articles: Pool of articles to choose from
            limit: Maximum articles to return
            min_score: Minimum relevance score

        Returns:
            List of articles with relevance_score added
        """
        scored = self.score_articles(db, articles)

        # Filter by minimum score
        filtered = [s for s in scored if s.relevance_score >= min_score]

        # Return top articles with score added
        result = []
        for scored_article in filtered[:limit]:
            article = scored_article.article.copy()
            article['relevance_score'] = scored_article.relevance_score
            article['matched_topics'] = scored_article.matched_topics
            result.append(article)

        return result

    def _load_interest_cache(self, db: Session) -> Dict[str, float]:
        """
        Load interest scores into a cache dict.

        Args:
            db: Database session

        Returns:
            Dict mapping topic -> decayed score
        """
        profiles = db.query(InterestProfile).all()
        return {
            p.topic: p.get_decayed_score()
            for p in profiles
        }

    def explain_score(
        self,
        db: Session,
        article: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Explain why an article received its relevance score.

        Args:
            db: Database session
            article: Article dict

        Returns:
            Explanation dict with score breakdown
        """
        scored = self.score_article(db, article)

        # Get topic details
        topic_details = []
        for topic in scored.matched_topics:
            profile = db.query(InterestProfile).filter(
                InterestProfile.topic == topic
            ).first()
            if profile:
                topic_details.append({
                    'topic': topic,
                    'interest_score': profile.get_decayed_score(),
                    'article_count': profile.article_count,
                    'feedback_balance': profile.positive_feedback - profile.negative_feedback
                })

        return {
            'relevance_score': scored.relevance_score,
            'matched_topics': scored.matched_topics,
            'topic_details': topic_details,
            'category_match': scored.category_match,
            'score_breakdown': {
                'topic_contribution': len(scored.matched_topics) > 0,
                'category_contribution': scored.category_match,
            },
            'recommendation': self._get_recommendation(scored)
        }

    def _get_recommendation(self, scored: ScoredArticle) -> str:
        """Generate a human-readable recommendation."""
        if scored.relevance_score >= 0.7:
            return "Highly relevant to your interests"
        elif scored.relevance_score >= 0.5:
            return "Matches some of your interests"
        elif scored.matched_topics:
            return f"Related to: {', '.join(scored.matched_topics[:3])}"
        else:
            return "New topic - might discover something interesting"


# Singleton instance
_relevance_scorer: Optional[RelevanceScorer] = None


def get_relevance_scorer() -> RelevanceScorer:
    """Get relevance scorer instance"""
    global _relevance_scorer
    if _relevance_scorer is None:
        _relevance_scorer = RelevanceScorer()
    return _relevance_scorer
