"""
Interest Tracker Service

Tracks reading behavior and builds interest profiles.
Part of Cosmic Chronicle - privacy-first personal news hub.

All data is stored locally and never transmitted without explicit user consent.
"""
import json
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from collections import Counter
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.reading_history import ReadingHistory
from app.models.interest_profile import InterestProfile

logger = logging.getLogger(__name__)


# Common stop words to exclude from topic extraction
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they',
    'we', 'you', 'i', 'me', 'my', 'your', 'his', 'her', 'their', 'our',
    'who', 'what', 'when', 'where', 'why', 'how', 'which', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'also', 'now', 'new', 'first', 'last', 'long', 'great', 'little',
    'said', 'says', 'say', 'get', 'got', 'go', 'went', 'come', 'came',
    'make', 'made', 'take', 'took', 'see', 'saw', 'know', 'knew', 'think',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'year', 'years', 'time', 'times', 'day', 'days', 'week', 'weeks',
    'month', 'months', 'today', 'yesterday', 'tomorrow', 'after', 'before',
    'about', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'where', 'when', 'why', 'how', 'any', 'all', 'both', 'each',
}

# Topic category mappings
CATEGORY_KEYWORDS = {
    'tech': ['ai', 'artificial intelligence', 'technology', 'software', 'app', 'computer',
             'programming', 'code', 'developer', 'startup', 'tech', 'digital', 'cyber',
             'machine learning', 'data', 'cloud', 'api', 'algorithm', 'robot', 'automation'],
    'politics': ['government', 'president', 'congress', 'senate', 'election', 'vote',
                 'political', 'policy', 'democrat', 'republican', 'legislation', 'law',
                 'supreme court', 'white house', 'capitol', 'campaign'],
    'business': ['market', 'stock', 'economy', 'business', 'company', 'ceo', 'profit',
                 'revenue', 'investment', 'startup', 'entrepreneur', 'finance', 'bank',
                 'trading', 'merger', 'acquisition'],
    'sports': ['game', 'team', 'player', 'coach', 'season', 'championship', 'score',
               'win', 'loss', 'nfl', 'nba', 'mlb', 'nhl', 'football', 'basketball',
               'baseball', 'hockey', 'soccer', 'tennis', 'golf'],
    'entertainment': ['movie', 'film', 'actor', 'actress', 'director', 'music', 'song',
                      'album', 'concert', 'celebrity', 'tv', 'show', 'series', 'streaming',
                      'netflix', 'disney', 'hollywood'],
    'science': ['research', 'study', 'scientist', 'discovery', 'experiment', 'space',
                'nasa', 'planet', 'climate', 'environment', 'biology', 'physics',
                'chemistry', 'medicine', 'health', 'vaccine'],
    'world': ['international', 'global', 'country', 'nation', 'foreign', 'war',
              'conflict', 'peace', 'treaty', 'united nations', 'europe', 'asia',
              'africa', 'middle east'],
}


@dataclass
class TopicExtraction:
    """Result of topic extraction from text"""
    topics: List[str]
    category: Optional[str]
    keywords: List[Tuple[str, int]]  # (word, count) pairs


class InterestTracker:
    """
    Service for tracking reading behavior and building interest profiles.

    Features:
    - Topic extraction from article text
    - Reading behavior tracking
    - Interest profile management
    - Privacy-first: all local processing

    Usage:
        tracker = InterestTracker()
        tracker.record_reading(db, article_data, behavior_data)
        interests = tracker.get_top_interests(db, limit=10)
    """

    def __init__(self, min_word_length: int = 3, max_topics: int = 10):
        """
        Initialize interest tracker.

        Args:
            min_word_length: Minimum word length for topic extraction
            max_topics: Maximum topics to extract per article
        """
        self.min_word_length = min_word_length
        self.max_topics = max_topics

    def extract_topics(self, title: str, content: str = None) -> TopicExtraction:
        """
        Extract topics from article title and content.

        Uses simple keyword extraction (no external APIs).

        Args:
            title: Article title
            content: Optional article content/summary

        Returns:
            TopicExtraction with topics, category, and keywords
        """
        # Combine title (weighted more) and content
        text = f"{title} {title} {title}"  # Title appears 3x for weighting
        if content:
            text += f" {content}"

        # Clean and tokenize
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        words = text.split()

        # Filter and count words
        word_counts = Counter()
        for word in words:
            if (len(word) >= self.min_word_length and
                word not in STOP_WORDS and
                not word.isdigit()):
                word_counts[word] += 1

        # Extract top keywords
        top_keywords = word_counts.most_common(self.max_topics * 2)

        # Determine category
        category = self._detect_category(word_counts)

        # Get topic list
        topics = [word for word, _ in top_keywords[:self.max_topics]]

        return TopicExtraction(
            topics=topics,
            category=category,
            keywords=top_keywords
        )

    def _detect_category(self, word_counts: Counter) -> Optional[str]:
        """
        Detect article category based on keyword presence.

        Args:
            word_counts: Counter of words in article

        Returns:
            Category string or None
        """
        category_scores = {}

        for category, keywords in CATEGORY_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                # Check single words
                if ' ' not in keyword:
                    score += word_counts.get(keyword, 0)
                # Check phrases (approximate by checking both words present)
                else:
                    phrase_words = keyword.split()
                    if all(word_counts.get(w, 0) > 0 for w in phrase_words):
                        score += 2  # Bonus for phrase match

            if score > 0:
                category_scores[category] = score

        if category_scores:
            return max(category_scores, key=category_scores.get)
        return None

    def record_reading(
        self,
        db: Session,
        article_id: str,
        source_type: str,
        title: str,
        url: str = None,
        source_id: str = None,
        content: str = None,
        time_spent_seconds: int = 0,
        scroll_depth_pct: float = 0.0,
        clicked_links: bool = False,
        starred: bool = False,
        feedback: str = None
    ) -> ReadingHistory:
        """
        Record an article reading event.

        Args:
            db: Database session
            article_id: Unique article identifier
            source_type: Source type (rss, guardian, nyt, etc.)
            title: Article title
            url: Article URL
            source_id: Source-specific ID
            content: Article content/summary for topic extraction
            time_spent_seconds: Time spent reading
            scroll_depth_pct: Scroll depth percentage
            clicked_links: Whether links were clicked
            starred: Whether article was starred
            feedback: User feedback (more/less)

        Returns:
            ReadingHistory record
        """
        # Extract topics
        extraction = self.extract_topics(title, content)

        # Create reading history record
        history = ReadingHistory(
            article_id=article_id,
            source_type=source_type,
            source_id=source_id,
            title=title,
            url=url,
            topics=json.dumps(extraction.topics),
            time_spent_seconds=time_spent_seconds,
            scroll_depth_pct=scroll_depth_pct,
            clicked_links=clicked_links,
            starred=starred,
            feedback=feedback
        )

        db.add(history)

        # Update interest profiles for each topic
        engagement_score = history.engagement_score

        for topic in extraction.topics:
            profile = InterestProfile.get_or_create(
                db, topic, extraction.category
            )
            profile.update_from_reading(
                engagement_score=engagement_score,
                time_spent=time_spent_seconds,
                feedback=feedback
            )

        db.commit()
        db.refresh(history)

        return history

    def update_feedback(
        self,
        db: Session,
        history_id: str,
        feedback: str
    ) -> Optional[ReadingHistory]:
        """
        Update feedback on a reading history entry.

        Args:
            db: Database session
            history_id: Reading history ID
            feedback: Feedback value (more/less)

        Returns:
            Updated ReadingHistory or None if not found
        """
        history = db.query(ReadingHistory).filter(
            ReadingHistory.id == history_id
        ).first()

        if not history:
            return None

        old_feedback = history.feedback
        history.feedback = feedback

        # Update interest profiles
        try:
            topics = json.loads(history.topics) if history.topics else []
        except (json.JSONDecodeError, TypeError):
            topics = []

        for topic in topics:
            profile = db.query(InterestProfile).filter(
                InterestProfile.topic == topic.lower()
            ).first()

            if profile:
                # Remove old feedback effect
                if old_feedback == 'more':
                    profile.positive_feedback = max(0, profile.positive_feedback - 1)
                elif old_feedback == 'less':
                    profile.negative_feedback = max(0, profile.negative_feedback - 1)

                # Apply new feedback
                if feedback == 'more':
                    profile.positive_feedback += 1
                    profile.score = min(1.0, profile.score + 0.1)
                elif feedback == 'less':
                    profile.negative_feedback += 1
                    profile.score = max(0.0, profile.score - 0.15)

        db.commit()
        db.refresh(history)

        return history

    def get_top_interests(
        self,
        db: Session,
        limit: int = 20,
        category: str = None,
        min_articles: int = 2,
        include_decayed: bool = True
    ) -> List[InterestProfile]:
        """
        Get top interest topics.

        Args:
            db: Database session
            limit: Maximum results
            category: Optional category filter
            min_articles: Minimum articles read to include
            include_decayed: Whether to apply time decay

        Returns:
            List of top interest profiles
        """
        query = db.query(InterestProfile).filter(
            InterestProfile.article_count >= min_articles
        )

        if category:
            query = query.filter(InterestProfile.category == category)

        # Get all matching profiles
        profiles = query.all()

        # Sort by decayed score if requested
        if include_decayed:
            profiles.sort(key=lambda p: p.get_decayed_score(), reverse=True)
        else:
            profiles.sort(key=lambda p: p.score, reverse=True)

        return profiles[:limit]

    def get_reading_stats(self, db: Session) -> Dict:
        """
        Get reading statistics summary.

        Returns:
            Dictionary with reading stats
        """
        from sqlalchemy import func

        # Total readings
        total_readings = db.query(func.count(ReadingHistory.id)).scalar() or 0

        # Total time spent
        total_time = db.query(
            func.sum(ReadingHistory.time_spent_seconds)
        ).scalar() or 0

        # Articles by source
        source_counts = db.query(
            ReadingHistory.source_type,
            func.count(ReadingHistory.id)
        ).group_by(ReadingHistory.source_type).all()

        # Starred count
        starred_count = db.query(func.count(ReadingHistory.id)).filter(
            ReadingHistory.starred == True
        ).scalar() or 0

        # Feedback counts
        positive_feedback = db.query(func.count(ReadingHistory.id)).filter(
            ReadingHistory.feedback == 'more'
        ).scalar() or 0

        negative_feedback = db.query(func.count(ReadingHistory.id)).filter(
            ReadingHistory.feedback == 'less'
        ).scalar() or 0

        # Topic count
        topic_count = db.query(func.count(InterestProfile.id)).scalar() or 0

        return {
            'total_readings': total_readings,
            'total_time_seconds': total_time,
            'total_time_hours': round(total_time / 3600, 1),
            'sources': dict(source_counts),
            'starred_count': starred_count,
            'positive_feedback': positive_feedback,
            'negative_feedback': negative_feedback,
            'topics_tracked': topic_count,
        }

    def clear_history(self, db: Session, keep_interests: bool = False):
        """
        Clear reading history.

        Args:
            db: Database session
            keep_interests: If True, preserve interest profiles
        """
        db.query(ReadingHistory).delete()

        if not keep_interests:
            db.query(InterestProfile).delete()

        db.commit()


# Singleton instance
_interest_tracker: Optional[InterestTracker] = None


def get_interest_tracker() -> InterestTracker:
    """Get interest tracker instance"""
    global _interest_tracker
    if _interest_tracker is None:
        _interest_tracker = InterestTracker()
    return _interest_tracker
