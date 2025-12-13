"""
Dream Service

Manages dream journal entries and correlates dreams with
historical events and news themes. Dreams are the newspaper
of the unconscious - this service bridges inner and outer worlds.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.dream_entry import DreamEntry


class DreamService:
    """
    Service for managing dream journal entries and finding correlations.

    Dreams often contain themes, symbols, and premonitions that
    connect to outer world events. This service:
    - Manages dream journal entries
    - Extracts and tracks themes/symbols
    - Finds correlations between dreams and historical events
    - Generates the "Dispatches from the Unconscious" section
    """

    # Common dream symbols and their archetypal meanings
    ARCHETYPE_MEANINGS = {
        "water": ["emotions", "unconscious", "purification", "change"],
        "fire": ["transformation", "passion", "destruction", "illumination"],
        "flying": ["freedom", "transcendence", "escape", "perspective"],
        "falling": ["loss of control", "fear", "letting go", "surrender"],
        "death": ["transformation", "endings", "rebirth", "change"],
        "house": ["self", "psyche", "identity", "security"],
        "snake": ["transformation", "healing", "wisdom", "hidden fears"],
        "mother": ["nurturing", "origin", "comfort", "the feminine"],
        "father": ["authority", "protection", "discipline", "the masculine"],
        "child": ["innocence", "potential", "vulnerability", "new beginnings"],
        "animals": ["instincts", "nature", "untamed aspects", "guides"],
        "chase": ["avoidance", "anxiety", "pursuit of goals", "fleeing fears"],
        "teeth": ["power", "confidence", "anxiety", "communication"],
        "naked": ["vulnerability", "authenticity", "exposure", "shame"],
        "vehicle": ["life direction", "control", "journey", "ambition"],
    }

    def __init__(self, db: Session):
        self.db = db

    def get_all_dreams(
        self,
        limit: int = 50,
        offset: int = 0,
        recurring_only: bool = False
    ) -> List[DreamEntry]:
        """Get all dream entries"""
        query = self.db.query(DreamEntry)
        if recurring_only:
            query = query.filter_by(recurring=True)
        return query.order_by(desc(DreamEntry.dream_date)).offset(offset).limit(limit).all()

    def get_dream(self, dream_id: str) -> Optional[DreamEntry]:
        """Get a specific dream by ID"""
        return self.db.query(DreamEntry).filter_by(id=dream_id).first()

    def get_dreams_by_date(self, date: str) -> List[DreamEntry]:
        """Get dreams from a specific date"""
        return self.db.query(DreamEntry).filter_by(dream_date=date).all()

    def get_dreams_by_date_range(
        self,
        start_date: str,
        end_date: str
    ) -> List[DreamEntry]:
        """Get dreams within a date range"""
        return self.db.query(DreamEntry).filter(
            DreamEntry.dream_date >= start_date,
            DreamEntry.dream_date <= end_date
        ).order_by(desc(DreamEntry.dream_date)).all()

    def search_dreams_by_theme(self, theme: str) -> List[DreamEntry]:
        """Search dreams containing a specific theme/symbol"""
        all_dreams = self.db.query(DreamEntry).all()
        return [d for d in all_dreams if d.matches_theme(theme)]

    def create_dream(self, **kwargs) -> DreamEntry:
        """Create a new dream entry"""
        dream = DreamEntry(**kwargs)
        self.db.add(dream)
        self.db.commit()
        self.db.refresh(dream)
        return dream

    def update_dream(self, dream_id: str, **kwargs) -> Optional[DreamEntry]:
        """Update a dream entry"""
        dream = self.get_dream(dream_id)
        if not dream:
            return None

        for key, value in kwargs.items():
            if hasattr(dream, key):
                setattr(dream, key, value)

        self.db.commit()
        self.db.refresh(dream)
        return dream

    def delete_dream(self, dream_id: str) -> bool:
        """Delete a dream entry"""
        dream = self.get_dream(dream_id)
        if not dream:
            return False

        self.db.delete(dream)
        self.db.commit()
        return True

    def add_correlation(
        self,
        dream_id: str,
        event_date: str,
        event_description: str,
        matching_symbol: str
    ) -> Optional[DreamEntry]:
        """Add a correlation between a dream and an event"""
        dream = self.get_dream(dream_id)
        if not dream:
            return None

        if dream.correlations is None:
            dream.correlations = []

        correlation = {
            "date": event_date,
            "event": event_description,
            "symbol": matching_symbol,
            "added_at": datetime.now().isoformat()
        }

        dream.correlations.append(correlation)
        self.db.commit()
        self.db.refresh(dream)
        return dream

    def find_correlations_with_news(
        self,
        articles: List[Dict[str, Any]],
        days_range: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Find potential correlations between recent dreams and news articles.

        Looks for theme/symbol matches between dreams and article content.
        """
        # Get recent dreams
        today = datetime.now().strftime('%Y-%m-%d')
        cutoff = datetime.now()
        cutoff = cutoff.replace(day=cutoff.day - days_range)
        cutoff_str = cutoff.strftime('%Y-%m-%d')

        recent_dreams = self.get_dreams_by_date_range(cutoff_str, today)
        if not recent_dreams:
            return []

        correlations = []

        for dream in recent_dreams:
            dream_keywords = dream.all_keywords

            for article in articles:
                headline = article.get('headline', '').lower()
                content = article.get('content', '').lower()
                full_text = f"{headline} {content}"

                matching_symbols = []
                for keyword in dream_keywords:
                    if keyword.lower() in full_text:
                        matching_symbols.append(keyword)

                if matching_symbols:
                    correlations.append({
                        "dream_id": dream.id,
                        "dream_date": dream.dream_date,
                        "dream_title": dream.title,
                        "article_headline": article.get('headline'),
                        "article_date": article.get('date') or article.get('year'),
                        "matching_symbols": matching_symbols,
                        "correlation_strength": len(matching_symbols)
                    })

        # Sort by correlation strength
        correlations.sort(key=lambda x: x['correlation_strength'], reverse=True)
        return correlations

    def get_archetype_meanings(self, symbols: List[str]) -> Dict[str, List[str]]:
        """Get archetypal meanings for dream symbols"""
        meanings = {}
        for symbol in symbols:
            symbol_lower = symbol.lower()
            if symbol_lower in self.ARCHETYPE_MEANINGS:
                meanings[symbol] = self.ARCHETYPE_MEANINGS[symbol_lower]
        return meanings

    def get_recurring_themes(self) -> Dict[str, int]:
        """Get most common recurring themes across all dreams"""
        all_dreams = self.db.query(DreamEntry).all()

        theme_counts = {}
        for dream in all_dreams:
            for keyword in dream.all_keywords:
                keyword_lower = keyword.lower()
                theme_counts[keyword_lower] = theme_counts.get(keyword_lower, 0) + 1

        # Sort by frequency
        sorted_themes = dict(sorted(
            theme_counts.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        return sorted_themes

    def get_dreams_on_this_day(self, month: int, day: int) -> List[DreamEntry]:
        """Get dreams that occurred on a specific month/day across all years"""
        all_dreams = self.db.query(DreamEntry).all()
        matching = []

        for dream in all_dreams:
            if dream.dream_date:
                parts = dream.dream_date.split('-')
                if len(parts) >= 3:
                    try:
                        dream_month = int(parts[1])
                        dream_day = int(parts[2])
                        if dream_month == month and dream_day == day:
                            matching.append(dream)
                    except ValueError:
                        continue

        return matching

    def generate_newspaper_section(
        self,
        target_date: str,
        include_correlations: bool = True
    ) -> Dict[str, Any]:
        """
        Generate the "Dispatches from the Unconscious" section.

        This creates a dream-based section for the newspaper,
        including dreams from the same date in previous years
        and any correlations with current news.
        """
        # Parse target date
        parts = target_date.split('-')
        if len(parts) >= 3:
            month = int(parts[1])
            day = int(parts[2])
        else:
            month = 1
            day = 1

        # Get dreams from this day in history
        historical_dreams = self.get_dreams_on_this_day(month, day)

        # Get most recent dreams
        recent_dreams = self.get_all_dreams(limit=3)

        # Get recurring themes
        themes = self.get_recurring_themes()
        top_themes = list(themes.items())[:5]

        section = {
            "section_name": "DISPATCHES FROM THE UNCONSCIOUS",
            "section_type": "dreams",
            "date": target_date,
            "on_this_day_dreams": [d.to_newspaper_dict() for d in historical_dreams],
            "recent_dreams": [d.to_newspaper_dict() for d in recent_dreams],
            "recurring_themes": [
                {"theme": theme, "count": count}
                for theme, count in top_themes
            ],
            "has_content": bool(historical_dreams or recent_dreams)
        }

        # Add archetypal insights
        all_symbols = []
        for dream in historical_dreams + recent_dreams:
            all_symbols.extend(dream.symbols or [])

        if all_symbols:
            section["archetype_insights"] = self.get_archetype_meanings(
                list(set(all_symbols))[:5]
            )

        return section


def get_dream_service(db: Session) -> DreamService:
    """Create a dream service instance"""
    return DreamService(db)
