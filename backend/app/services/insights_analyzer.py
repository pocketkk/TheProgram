"""
AI Insights Analyzer Service

Analyzes reading patterns and interests using Claude AI.
Provides personalized content discovery suggestions.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import anthropic
from anthropic import Anthropic
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.reading_history import ReadingHistory
from app.models.interest_profile import InterestProfile

logger = logging.getLogger(__name__)


class InsightsAnalyzer:
    """
    AI-powered insights for reading patterns and interests.

    Privacy-first: Only sends anonymized topic scores to Claude,
    never article content or personal information.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-haiku-4-5-20251001"):
        """
        Initialize insights analyzer.

        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
            model: AI model to use (haiku for cost efficiency)
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model
        self._client = None

    @property
    def client(self) -> Anthropic:
        """Lazy-load the Anthropic client."""
        if self._client is None:
            if not self.api_key:
                raise ValueError("Anthropic API key required. Set ANTHROPIC_API_KEY environment variable.")
            self._client = Anthropic(api_key=self.api_key)
        return self._client

    def get_reading_summary(self, db: Session) -> Dict[str, Any]:
        """
        Get a summary of reading activity for AI analysis.

        Only includes anonymized aggregate data.
        """
        # Get reading stats
        total_readings = db.query(func.count(ReadingHistory.id)).scalar() or 0
        total_time = db.query(func.sum(ReadingHistory.time_spent_seconds)).scalar() or 0

        # Time period analysis
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        readings_this_week = db.query(func.count(ReadingHistory.id)).filter(
            ReadingHistory.created_at >= week_ago
        ).scalar() or 0

        readings_this_month = db.query(func.count(ReadingHistory.id)).filter(
            ReadingHistory.created_at >= month_ago
        ).scalar() or 0

        # Feedback summary
        positive = db.query(func.count(ReadingHistory.id)).filter(
            ReadingHistory.feedback == 'more'
        ).scalar() or 0

        negative = db.query(func.count(ReadingHistory.id)).filter(
            ReadingHistory.feedback == 'less'
        ).scalar() or 0

        # Source distribution
        sources = db.query(
            ReadingHistory.source_type,
            func.count(ReadingHistory.id)
        ).group_by(ReadingHistory.source_type).all()

        return {
            'total_readings': total_readings,
            'total_time_hours': round(total_time / 3600, 1),
            'readings_this_week': readings_this_week,
            'readings_this_month': readings_this_month,
            'positive_feedback': positive,
            'negative_feedback': negative,
            'sources': {s[0]: s[1] for s in sources}
        }

    def get_interest_summary(self, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get anonymized interest profile for AI analysis.

        Returns topic names with scores only - no personal data.
        """
        profiles = db.query(InterestProfile).filter(
            InterestProfile.article_count >= 2  # Only established interests
        ).order_by(desc(InterestProfile.score)).limit(limit).all()

        return [
            {
                'topic': p.topic,
                'category': p.category,
                'score': round(p.score, 2),
                'decayed_score': round(p.get_decayed_score(), 2),
                'article_count': p.article_count,
                'feedback_balance': p.positive_feedback - p.negative_feedback
            }
            for p in profiles
        ]

    def get_recent_topics(self, db: Session, days: int = 7) -> List[str]:
        """Get topics from recent readings."""
        cutoff = datetime.utcnow() - timedelta(days=days)

        recent = db.query(ReadingHistory).filter(
            ReadingHistory.created_at >= cutoff
        ).all()

        topics = set()
        for reading in recent:
            if reading.topics:
                try:
                    reading_topics = json.loads(reading.topics)
                    topics.update(reading_topics)
                except (json.JSONDecodeError, TypeError):
                    pass

        return list(topics)[:30]  # Limit to 30 topics

    def analyze_interests(self, db: Session) -> Dict[str, Any]:
        """
        Analyze reading patterns and interests using Claude AI.

        Returns insights, trends, and suggestions.
        Privacy: Only sends anonymized topic/score data.
        """
        # Gather anonymized data
        reading_summary = self.get_reading_summary(db)
        interests = self.get_interest_summary(db)
        recent_topics = self.get_recent_topics(db)

        if not interests:
            return {
                'status': 'insufficient_data',
                'message': 'Start reading more articles to build your interest profile.',
                'insights': [],
                'trends': [],
                'suggestions': []
            }

        # Build prompt with only anonymized data
        prompt = f"""Analyze this reading pattern data and provide personalized insights.

READING ACTIVITY:
- Total articles read: {reading_summary['total_readings']}
- Total reading time: {reading_summary['total_time_hours']} hours
- Articles this week: {reading_summary['readings_this_week']}
- Articles this month: {reading_summary['readings_this_month']}
- Positive feedback given: {reading_summary['positive_feedback']}
- Negative feedback given: {reading_summary['negative_feedback']}
- Sources used: {json.dumps(reading_summary['sources'])}

TOP INTERESTS (topic, category, score, article_count, feedback_balance):
{json.dumps(interests, indent=2)}

RECENT TOPICS (last 7 days):
{', '.join(recent_topics) if recent_topics else 'None yet'}

Provide a JSON response with this exact structure:
{{
  "insights": [
    "3-5 observations about reading patterns and interests"
  ],
  "trends": [
    "2-3 emerging trends or shifts in interests"
  ],
  "suggestions": [
    "3-5 specific content or topic suggestions to explore"
  ],
  "reading_style": "A 1-2 sentence summary of the reader's style",
  "focus_areas": ["top 3 focus areas based on patterns"]
}}

Be specific, actionable, and insightful. Reference the actual topics and patterns you see."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            response_text = message.content[0].text.strip()

            # Parse JSON response
            # Handle potential markdown code blocks
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)
            result['status'] = 'success'
            result['analyzed_at'] = datetime.utcnow().isoformat()

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            return {
                'status': 'parse_error',
                'message': 'Failed to parse AI response',
                'raw_response': response_text if 'response_text' in locals() else None
            }
        except Exception as e:
            logger.error(f"Error analyzing interests: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }

    def get_feed_recommendations(self, db: Session) -> Dict[str, Any]:
        """
        Get AI-powered feed recommendations based on interests.

        Suggests RSS feeds and topics to explore.
        """
        interests = self.get_interest_summary(db, limit=15)

        if not interests:
            return {
                'status': 'insufficient_data',
                'message': 'Read more articles to get personalized feed recommendations.',
                'recommendations': []
            }

        # Get top topics for recommendations
        top_topics = [i['topic'] for i in interests[:10]]
        categories = list(set(i['category'] for i in interests if i['category']))

        prompt = f"""Based on these reading interests, suggest RSS feeds and content sources.

TOP INTERESTS:
{json.dumps(interests[:10], indent=2)}

INTEREST CATEGORIES:
{', '.join(categories) if categories else 'Various'}

Provide a JSON response with this exact structure:
{{
  "recommended_feeds": [
    {{
      "name": "Feed name",
      "url": "RSS feed URL (use real, working RSS URLs)",
      "reason": "Why this feed matches interests",
      "topics": ["matching topics"]
    }}
  ],
  "explore_topics": [
    {{
      "topic": "Topic name",
      "reason": "Why this might interest the reader",
      "search_terms": ["keywords to search for"]
    }}
  ],
  "diversify_suggestions": [
    "2-3 suggestions for diversifying reading"
  ]
}}

Focus on quality, reputable sources. Include a mix of:
- Major news outlets with RSS feeds
- Topic-specific blogs and publications
- Niche sources for specialized interests

Use real RSS URLs from sources like:
- News: Reuters, BBC, NPR, The Guardian, NYT
- Tech: Ars Technica, TechCrunch, Hacker News, The Verge
- Science: Nature, Science Daily, Ars Technica Science
- Other niches as appropriate"""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1200,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            response_text = message.content[0].text.strip()

            # Parse JSON response
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)
            result['status'] = 'success'
            result['based_on_topics'] = top_topics

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse feed recommendations: {e}")
            return {
                'status': 'parse_error',
                'message': 'Failed to parse AI response'
            }
        except Exception as e:
            logger.error(f"Error getting feed recommendations: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }

    def get_discovery_suggestions(
        self,
        db: Session,
        current_article_topics: List[str]
    ) -> Dict[str, Any]:
        """
        Get content discovery suggestions based on current article and interests.

        Used for "You might also like" recommendations.
        """
        interests = self.get_interest_summary(db, limit=10)

        prompt = f"""Suggest related content based on the current article topics and reader interests.

CURRENT ARTICLE TOPICS:
{', '.join(current_article_topics)}

READER'S TOP INTERESTS:
{json.dumps(interests[:8], indent=2)}

Provide a JSON response with this exact structure:
{{
  "related_searches": [
    "5 search queries to find related content"
  ],
  "deeper_dive": [
    "3 specific subtopics to explore within this subject"
  ],
  "connections": [
    "2-3 ways this connects to the reader's other interests"
  ],
  "question_to_explore": "An interesting question this article might inspire"
}}

Be specific and thought-provoking. Connect the current content to broader themes."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.8,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            response_text = message.content[0].text.strip()

            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]

            result = json.loads(response_text)
            result['status'] = 'success'

            return result

        except Exception as e:
            logger.error(f"Error getting discovery suggestions: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }


# Singleton instance
_insights_analyzer: Optional[InsightsAnalyzer] = None


def get_insights_analyzer() -> InsightsAnalyzer:
    """Get or create insights analyzer instance."""
    global _insights_analyzer
    if _insights_analyzer is None:
        _insights_analyzer = InsightsAnalyzer()
    return _insights_analyzer
