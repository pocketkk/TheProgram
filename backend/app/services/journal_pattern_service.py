"""
Journal Pattern Recognition Service

Analyzes journal entries to identify patterns, correlations with astrological
events, and provides insights.
Part of Phase 3: AI Proactive Intelligence
"""
from typing import Dict, List, Optional, Any, Tuple
from datetime import date, datetime, timedelta
from collections import defaultdict
import re
from sqlalchemy.orm import Session

from app.services.ai_interpreter import get_ai_interpreter


class JournalPatternService:
    """
    Service for analyzing patterns across journal entries.
    """

    # Emotional keywords for sentiment analysis
    POSITIVE_KEYWORDS = {
        'happy', 'joy', 'excited', 'grateful', 'love', 'peaceful', 'calm',
        'amazing', 'wonderful', 'fantastic', 'great', 'good', 'blessed',
        'thankful', 'hopeful', 'inspired', 'creative', 'productive', 'success',
        'accomplished', 'proud', 'confident', 'energized', 'motivated'
    }

    NEGATIVE_KEYWORDS = {
        'sad', 'angry', 'frustrated', 'anxious', 'worried', 'stressed',
        'depressed', 'tired', 'exhausted', 'overwhelmed', 'confused', 'lost',
        'hurt', 'disappointed', 'afraid', 'lonely', 'stuck', 'difficult',
        'challenging', 'struggling', 'painful', 'upset'
    }

    # Life area keywords
    LIFE_AREAS = {
        'career': {'work', 'job', 'career', 'boss', 'colleague', 'office', 'project', 'meeting', 'deadline', 'promotion'},
        'relationships': {'relationship', 'partner', 'love', 'friend', 'family', 'marriage', 'dating', 'connection'},
        'health': {'health', 'exercise', 'sleep', 'energy', 'tired', 'sick', 'doctor', 'wellness', 'body', 'fitness'},
        'finances': {'money', 'financial', 'budget', 'savings', 'income', 'expense', 'investment', 'debt'},
        'personal_growth': {'growth', 'learning', 'meditation', 'spiritual', 'mindfulness', 'awareness', 'therapy'},
        'creativity': {'creative', 'art', 'music', 'writing', 'project', 'inspiration', 'create', 'express'},
    }

    def __init__(self):
        self.ai_interpreter = get_ai_interpreter()

    def analyze_patterns(
        self,
        entries: List[Dict],
        natal_chart: Optional[Dict] = None,
        transit_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Analyze patterns across journal entries.

        Args:
            entries: List of journal entries with date, content, mood, tags
            natal_chart: Optional natal chart for astrological correlation
            transit_history: Optional transit data for pattern matching

        Returns:
            Dictionary containing pattern analysis results
        """
        if not entries:
            return {
                "status": "no_data",
                "message": "No journal entries to analyze"
            }

        # Basic statistics
        total_entries = len(entries)
        date_range = self._get_date_range(entries)

        # Mood analysis
        mood_analysis = self._analyze_moods(entries)

        # Content analysis
        content_analysis = self._analyze_content(entries)

        # Temporal patterns
        temporal_patterns = self._analyze_temporal_patterns(entries)

        # Tag analysis
        tag_analysis = self._analyze_tags(entries)

        # Theme detection
        themes = self._detect_themes(entries)

        # Astrological correlations (if chart provided)
        astro_correlations = None
        if natal_chart and transit_history:
            astro_correlations = self._correlate_with_transits(entries, transit_history)

        # Generate AI insights
        ai_insights = self._generate_ai_pattern_insights(
            mood_analysis,
            content_analysis,
            temporal_patterns,
            themes
        )

        return {
            "summary": {
                "total_entries": total_entries,
                "date_range": date_range,
                "average_mood": mood_analysis.get("average_score"),
            },
            "mood_analysis": mood_analysis,
            "content_analysis": content_analysis,
            "temporal_patterns": temporal_patterns,
            "tag_analysis": tag_analysis,
            "themes": themes,
            "astrological_correlations": astro_correlations,
            "ai_insights": ai_insights,
            "recommendations": self._generate_recommendations(mood_analysis, temporal_patterns)
        }

    def _get_date_range(self, entries: List[Dict]) -> Dict:
        """Get the date range of entries."""
        dates = []
        for entry in entries:
            entry_date = entry.get('created_at') or entry.get('date')
            if entry_date:
                if isinstance(entry_date, str):
                    try:
                        entry_date = datetime.fromisoformat(entry_date.replace('Z', '+00:00'))
                    except ValueError:
                        continue
                dates.append(entry_date)

        if not dates:
            return {"start": None, "end": None, "days": 0}

        start = min(dates)
        end = max(dates)
        days = (end - start).days + 1

        return {
            "start": start.isoformat() if hasattr(start, 'isoformat') else str(start),
            "end": end.isoformat() if hasattr(end, 'isoformat') else str(end),
            "days": days
        }

    def _analyze_moods(self, entries: List[Dict]) -> Dict:
        """Analyze mood patterns across entries."""
        mood_scores = []
        mood_counts = defaultdict(int)

        mood_score_map = {
            'great': 5, 'good': 4, 'neutral': 3, 'okay': 3,
            'bad': 2, 'terrible': 1, 'anxious': 2, 'calm': 4,
            'happy': 5, 'sad': 2, 'angry': 2, 'peaceful': 4
        }

        for entry in entries:
            mood = entry.get('mood', '').lower()
            if mood:
                mood_counts[mood] += 1
                score = mood_score_map.get(mood, 3)
                mood_scores.append(score)

        avg_score = sum(mood_scores) / len(mood_scores) if mood_scores else 3

        # Find most common moods
        top_moods = sorted(mood_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        # Trend analysis (if enough data)
        trend = "stable"
        if len(mood_scores) >= 5:
            first_half = mood_scores[:len(mood_scores)//2]
            second_half = mood_scores[len(mood_scores)//2:]
            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)

            if second_avg - first_avg > 0.5:
                trend = "improving"
            elif first_avg - second_avg > 0.5:
                trend = "declining"

        return {
            "average_score": round(avg_score, 2),
            "total_recorded": len(mood_scores),
            "distribution": dict(mood_counts),
            "top_moods": [{"mood": m, "count": c} for m, c in top_moods],
            "trend": trend
        }

    def _analyze_content(self, entries: List[Dict]) -> Dict:
        """Analyze content of journal entries."""
        all_words = []
        positive_count = 0
        negative_count = 0
        life_area_mentions = defaultdict(int)

        for entry in entries:
            content = entry.get('content', '') + ' ' + entry.get('title', '')
            words = re.findall(r'\b[a-zA-Z]+\b', content.lower())
            all_words.extend(words)

            # Count positive/negative words
            for word in words:
                if word in self.POSITIVE_KEYWORDS:
                    positive_count += 1
                elif word in self.NEGATIVE_KEYWORDS:
                    negative_count += 1

            # Count life area mentions
            for area, keywords in self.LIFE_AREAS.items():
                for word in words:
                    if word in keywords:
                        life_area_mentions[area] += 1

        # Calculate sentiment ratio
        total_sentiment_words = positive_count + negative_count
        sentiment_ratio = 0.5
        if total_sentiment_words > 0:
            sentiment_ratio = positive_count / total_sentiment_words

        # Word frequency (excluding common words)
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'i', 'my', 'me', 'we', 'it', 'this', 'that', 'have', 'has', 'had'}
        word_freq = defaultdict(int)
        for word in all_words:
            if word not in common_words and len(word) > 2:
                word_freq[word] += 1

        top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:15]

        return {
            "total_words": len(all_words),
            "average_words_per_entry": round(len(all_words) / len(entries), 1) if entries else 0,
            "sentiment": {
                "ratio": round(sentiment_ratio, 2),
                "positive_words": positive_count,
                "negative_words": negative_count,
                "overall": "positive" if sentiment_ratio > 0.55 else "negative" if sentiment_ratio < 0.45 else "neutral"
            },
            "life_areas": dict(life_area_mentions),
            "top_words": [{"word": w, "count": c} for w, c in top_words]
        }

    def _analyze_temporal_patterns(self, entries: List[Dict]) -> Dict:
        """Analyze patterns based on time."""
        day_of_week = defaultdict(int)
        time_of_day = defaultdict(int)
        monthly = defaultdict(int)

        for entry in entries:
            entry_date = entry.get('created_at') or entry.get('date')
            if entry_date:
                if isinstance(entry_date, str):
                    try:
                        entry_date = datetime.fromisoformat(entry_date.replace('Z', '+00:00'))
                    except ValueError:
                        continue

                day_of_week[entry_date.strftime('%A')] += 1

                hour = entry_date.hour if hasattr(entry_date, 'hour') else 12
                if 5 <= hour < 12:
                    time_of_day['morning'] += 1
                elif 12 <= hour < 17:
                    time_of_day['afternoon'] += 1
                elif 17 <= hour < 21:
                    time_of_day['evening'] += 1
                else:
                    time_of_day['night'] += 1

                monthly[entry_date.strftime('%Y-%m')] += 1

        # Find most active day
        most_active_day = max(day_of_week.items(), key=lambda x: x[1])[0] if day_of_week else None

        return {
            "by_day_of_week": dict(day_of_week),
            "by_time_of_day": dict(time_of_day),
            "by_month": dict(monthly),
            "most_active_day": most_active_day,
            "journaling_consistency": self._calculate_consistency(entries)
        }

    def _calculate_consistency(self, entries: List[Dict]) -> Dict:
        """Calculate journaling consistency."""
        dates_with_entries = set()

        for entry in entries:
            entry_date = entry.get('created_at') or entry.get('date')
            if entry_date:
                if isinstance(entry_date, str):
                    try:
                        entry_date = datetime.fromisoformat(entry_date.replace('Z', '+00:00'))
                    except ValueError:
                        continue
                dates_with_entries.add(entry_date.date() if hasattr(entry_date, 'date') else entry_date)

        if len(dates_with_entries) < 2:
            return {"score": 0, "streak": 0, "level": "just_started"}

        sorted_dates = sorted(dates_with_entries)
        total_days = (sorted_dates[-1] - sorted_dates[0]).days + 1
        consistency = len(dates_with_entries) / total_days if total_days > 0 else 0

        # Calculate current streak
        streak = 0
        today = date.today()
        check_date = today
        while check_date in dates_with_entries:
            streak += 1
            check_date -= timedelta(days=1)

        level = "excellent" if consistency > 0.8 else "good" if consistency > 0.5 else "developing" if consistency > 0.2 else "occasional"

        return {
            "score": round(consistency * 100, 1),
            "streak": streak,
            "level": level,
            "total_days_covered": total_days,
            "days_with_entries": len(dates_with_entries)
        }

    def _analyze_tags(self, entries: List[Dict]) -> Dict:
        """Analyze tag usage patterns."""
        tag_counts = defaultdict(int)
        tag_combinations = defaultdict(int)

        for entry in entries:
            tags = entry.get('tags', []) or []
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(',')]

            for tag in tags:
                tag_counts[tag.lower()] += 1

            # Track tag combinations
            if len(tags) >= 2:
                for i, tag1 in enumerate(tags):
                    for tag2 in tags[i+1:]:
                        combo = tuple(sorted([tag1.lower(), tag2.lower()]))
                        tag_combinations[combo] += 1

        top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        top_combos = sorted(tag_combinations.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "total_unique_tags": len(tag_counts),
            "top_tags": [{"tag": t, "count": c} for t, c in top_tags],
            "common_combinations": [{"tags": list(t), "count": c} for t, c in top_combos]
        }

    def _detect_themes(self, entries: List[Dict]) -> List[Dict]:
        """Detect recurring themes in journal entries."""
        themes = []

        # Check for life area themes
        content_analysis = self._analyze_content(entries)
        life_areas = content_analysis.get('life_areas', {})

        for area, count in sorted(life_areas.items(), key=lambda x: x[1], reverse=True)[:4]:
            if count >= 2:
                themes.append({
                    "theme": area.replace('_', ' ').title(),
                    "mentions": count,
                    "type": "life_area"
                })

        # Detect transition/change themes
        change_keywords = {'change', 'transition', 'new', 'beginning', 'ending', 'moving', 'starting'}
        change_count = 0
        for entry in entries:
            content = (entry.get('content', '') + ' ' + entry.get('title', '')).lower()
            if any(kw in content for kw in change_keywords):
                change_count += 1

        if change_count >= 2:
            themes.append({
                "theme": "Life Transitions",
                "mentions": change_count,
                "type": "pattern"
            })

        return themes

    def _correlate_with_transits(
        self,
        entries: List[Dict],
        transit_history: List[Dict]
    ) -> Dict:
        """Correlate journal patterns with astrological transits."""
        # This would require matching entry dates with transit data
        # Simplified implementation
        correlations = []

        # Group entries by mood
        high_energy_entries = [e for e in entries if e.get('mood', '').lower() in ['great', 'happy', 'excited']]
        low_energy_entries = [e for e in entries if e.get('mood', '').lower() in ['sad', 'tired', 'anxious']]

        if len(high_energy_entries) > len(entries) * 0.3:
            correlations.append({
                "observation": "High-energy days are frequent",
                "possible_influence": "Jupiter or Mars transits may be active"
            })

        if len(low_energy_entries) > len(entries) * 0.3:
            correlations.append({
                "observation": "Challenging periods detected",
                "possible_influence": "Saturn transits may be requiring growth"
            })

        return {
            "correlations": correlations,
            "note": "Detailed transit correlation requires specific date matching"
        }

    def _generate_ai_pattern_insights(
        self,
        mood_analysis: Dict,
        content_analysis: Dict,
        temporal_patterns: Dict,
        themes: List[Dict]
    ) -> Optional[str]:
        """Generate AI insights from patterns."""
        try:
            prompt = f"""Analyze these journal patterns and provide a brief, insightful summary (3-4 sentences):

Mood Trend: {mood_analysis.get('trend', 'stable')} (avg score: {mood_analysis.get('average_score', 3)}/5)
Overall Sentiment: {content_analysis.get('sentiment', {}).get('overall', 'neutral')}
Top Life Areas: {', '.join([t['theme'] for t in themes[:3]]) if themes else 'varied'}
Journaling Consistency: {temporal_patterns.get('journaling_consistency', {}).get('level', 'developing')}
Most Active Day: {temporal_patterns.get('most_active_day', 'varies')}

Provide warm, encouraging insights that highlight positive patterns while gently acknowledging areas for growth."""

            result = self.ai_interpreter.generate_custom_interpretation(prompt)
            return result.get('interpretation')
        except Exception:
            return None

    def _generate_recommendations(
        self,
        mood_analysis: Dict,
        temporal_patterns: Dict
    ) -> List[str]:
        """Generate personalized recommendations."""
        recommendations = []

        # Based on mood trend
        trend = mood_analysis.get('trend', 'stable')
        if trend == 'declining':
            recommendations.append("Consider adding gratitude reflections to shift perspective")
        elif trend == 'improving':
            recommendations.append("Your mood is trending positively - keep noting what's working")

        # Based on consistency
        consistency = temporal_patterns.get('journaling_consistency', {})
        if consistency.get('level') == 'occasional':
            recommendations.append("Try setting a daily reminder to build journaling habit")
        elif consistency.get('streak', 0) >= 7:
            recommendations.append("Great streak! You're building a powerful self-reflection practice")

        # Based on timing
        most_active = temporal_patterns.get('most_active_day')
        if most_active:
            recommendations.append(f"{most_active}s seem to be your most reflective days")

        return recommendations[:4]


# Singleton instance
_journal_pattern_service = None


def get_journal_pattern_service() -> JournalPatternService:
    """Get the singleton JournalPatternService instance."""
    global _journal_pattern_service
    if _journal_pattern_service is None:
        _journal_pattern_service = JournalPatternService()
    return _journal_pattern_service
