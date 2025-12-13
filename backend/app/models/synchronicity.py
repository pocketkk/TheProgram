"""
Synchronicity model for tracking meaningful coincidences

Synchronicities are acausal connecting principles - moments when
the inner and outer world mirror each other in ways that feel
deeply meaningful. This model tracks recurring themes, symbols,
and patterns across dreams, events, and personal experience.
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, Index, Float
from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class Synchronicity(BaseModel):
    """
    Synchronicity tracking for the Cosmic Paper.

    Jung described synchronicity as "meaningful coincidence" - when
    events in the outer world mysteriously align with our inner state.
    This model tracks these patterns across multiple dimensions:
    - Dreams that predict or mirror events
    - Recurring symbols in news
    - Numbers, names, or themes that keep appearing
    - Transits that coincide with specific life themes

    Fields:
        # Core pattern
        theme: The central theme or symbol (e.g., "water", "three", "phoenix")
        description: User description of the pattern
        pattern_type: Type of synchronicity
        first_noticed: When pattern first noticed
        occurrences: List of specific occurrences with dates

        # Evidence
        dream_connections: Dream entries that relate
        news_connections: News articles that relate
        personal_connections: Personal life events that relate
        transit_connections: Astrological correlations

        # Meaning
        user_interpretation: User's interpretation
        ai_interpretation: AI interpretation
        significance: How significant (1-10)
        active: Whether pattern is currently active/appearing

        # Stats
        occurrence_count: Total occurrences
        last_occurrence: Most recent occurrence date
        frequency_days: Average days between occurrences

    Example:
        sync = Synchronicity(
            theme="Ravens",
            description="Keep seeing ravens in unexpected places, then reading about them",
            pattern_type="recurring_symbol",
            occurrences=[
                {"date": "2025-01-10", "type": "dream", "note": "Three ravens in dream"},
                {"date": "2025-01-12", "type": "event", "note": "Raven landed on car"},
                {"date": "2025-01-15", "type": "news", "note": "Article about raven intelligence"}
            ],
            significance=8
        )
    """
    __tablename__ = 'synchronicities'

    # Core pattern identity
    theme = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Central theme or symbol being tracked"
    )

    description = Column(
        Text,
        nullable=True,
        comment="User's description of the pattern"
    )

    pattern_type = Column(
        String(50),
        nullable=False,
        default="recurring_symbol",
        index=True,
        comment="Type: recurring_symbol, number_pattern, name_pattern, theme_pattern, dream_prophecy"
    )

    # Timeline
    first_noticed = Column(
        String(10),
        nullable=True,
        index=True,
        comment="When pattern first noticed (YYYY-MM-DD)"
    )

    # Detailed occurrences
    occurrences = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='List of occurrences: [{"date": "...", "type": "dream|event|news", "note": "..."}]'
    )

    # Connections to other entities
    dream_ids = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='IDs of related dream entries'
    )

    witness_ids = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='IDs of related witness entries'
    )

    article_references = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='References to news articles: [{"date": "...", "headline": "...", "source": "..."}]'
    )

    personal_events = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Personal life events: [{"date": "...", "event": "..."}]'
    )

    # Astrological correlations
    transit_correlations = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Transit patterns: [{"transit": "Saturn conj Sun", "dates": [...], "note": "..."}]'
    )

    planets_involved = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Planets that seem connected: ["Saturn", "Pluto"]'
    )

    # Interpretation
    user_interpretation = Column(
        Text,
        nullable=True,
        comment="User's interpretation of meaning"
    )

    ai_interpretation = Column(
        Text,
        nullable=True,
        comment="AI-generated interpretation"
    )

    questions_raised = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Questions this synchronicity raises'
    )

    # Status and significance
    significance = Column(
        Integer,
        nullable=True,
        default=5,
        comment="Significance rating 1-10"
    )

    active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether pattern is currently active/appearing"
    )

    resolved = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether user feels meaning has been understood"
    )

    resolution_note = Column(
        Text,
        nullable=True,
        comment="How the synchronicity resolved or was understood"
    )

    # Statistics
    occurrence_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Total number of occurrences"
    )

    last_occurrence = Column(
        String(10),
        nullable=True,
        index=True,
        comment="Most recent occurrence (YYYY-MM-DD)"
    )

    avg_frequency_days = Column(
        Float,
        nullable=True,
        comment="Average days between occurrences"
    )

    # Keywords for matching
    keywords = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Keywords to match in news: ["raven", "crow", "corvid", "blackbird"]'
    )

    # Indexes
    __table_args__ = (
        Index('idx_sync_theme', 'theme'),
        Index('idx_sync_type', 'pattern_type'),
        Index('idx_sync_active', 'active'),
        Index('idx_sync_significance', 'significance'),
        Index('idx_sync_last_occurrence', 'last_occurrence'),
    )

    def __repr__(self):
        return f"<Synchronicity(theme='{self.theme}', occurrences={self.occurrence_count}, active={self.active})>"

    def add_occurrence(self, occurrence_type: str, note: str, date: str = None):
        """Add a new occurrence to the pattern"""
        from app.core.datetime_helpers import now_iso

        if date is None:
            date = now_iso()[:10]

        occurrence = {
            "date": date,
            "type": occurrence_type,
            "note": note
        }

        if self.occurrences is None:
            self.occurrences = []

        self.occurrences.append(occurrence)
        self.occurrence_count = len(self.occurrences)
        self.last_occurrence = date

        # Update frequency if we have enough data
        if self.occurrence_count >= 2:
            self._calculate_frequency()

    def _calculate_frequency(self):
        """Calculate average days between occurrences"""
        if not self.occurrences or len(self.occurrences) < 2:
            return

        from datetime import datetime
        dates = []
        for occ in self.occurrences:
            try:
                dates.append(datetime.strptime(occ.get('date', ''), '%Y-%m-%d'))
            except ValueError:
                continue

        if len(dates) < 2:
            return

        dates.sort()
        total_days = 0
        for i in range(1, len(dates)):
            total_days += (dates[i] - dates[i-1]).days

        self.avg_frequency_days = total_days / (len(dates) - 1)

    def matches_content(self, text: str) -> bool:
        """Check if text contains any keywords for this synchronicity"""
        if not self.keywords and not self.theme:
            return False

        text_lower = text.lower()

        # Check theme
        if self.theme and self.theme.lower() in text_lower:
            return True

        # Check keywords
        for keyword in (self.keywords or []):
            if keyword.lower() in text_lower:
                return True

        return False

    @property
    def days_since_last(self) -> int | None:
        """Days since last occurrence"""
        if not self.last_occurrence:
            return None
        from datetime import datetime
        try:
            last = datetime.strptime(self.last_occurrence, '%Y-%m-%d')
            return (datetime.now() - last).days
        except ValueError:
            return None

    @property
    def is_dormant(self) -> bool:
        """Check if pattern hasn't appeared in a while (2x avg frequency)"""
        if not self.avg_frequency_days or not self.days_since_last:
            return False
        return self.days_since_last > (self.avg_frequency_days * 2)

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['days_since_last'] = self.days_since_last
        result['is_dormant'] = self.is_dormant
        return result

    def to_summary_dict(self) -> dict:
        """Compact format for list display"""
        return {
            "id": self.id,
            "theme": self.theme,
            "pattern_type": self.pattern_type,
            "occurrence_count": self.occurrence_count,
            "last_occurrence": self.last_occurrence,
            "days_since_last": self.days_since_last,
            "significance": self.significance,
            "active": self.active,
            "resolved": self.resolved,
            "is_dormant": self.is_dormant
        }

    def to_newspaper_dict(self) -> dict:
        """Format for newspaper synchronicity section"""
        recent = self.occurrences[-3:] if self.occurrences else []
        return {
            "theme": self.theme,
            "description": self.description,
            "occurrence_count": self.occurrence_count,
            "recent_occurrences": recent,
            "significance": self.significance,
            "user_interpretation": self.user_interpretation,
            "questions_raised": self.questions_raised,
            "keywords": self.keywords
        }
