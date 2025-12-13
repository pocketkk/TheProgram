"""
DreamEntry model for dream journal integration

Dreams are the newspaper of the unconscious. This model stores
dream entries that can be correlated with historical events,
transits, and news themes - creating a bridge between inner
and outer world events.
"""
from sqlalchemy import Column, String, Float, Integer, Boolean, Index, Text
from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class DreamEntry(BaseModel):
    """
    Dream journal entry for integration with Cosmic Paper.

    Dreams offer a window into the unconscious. By logging dreams
    and extracting their themes/symbols, we can correlate them
    with outer events - finding synchronicities between inner
    visions and the historical record.

    Fields:
        dream_date: When the dream occurred (YYYY-MM-DD)
        title: Brief title for the dream
        narrative: Full dream description
        symbols: Key symbols appearing in the dream
        themes: Thematic tags extracted from dream
        emotions: Emotional qualities of the dream
        characters: People/beings that appeared
        locations: Places in the dream
        colors: Significant colors
        lucidity_level: 0-10 scale of dream awareness
        vividness: 0-10 scale of detail/clarity
        recurring: Whether this is a recurring dream
        recurring_pattern: Description of recurring elements
        interpretation: User's interpretation
        ai_interpretation: AI-generated interpretation
        transit_context: Astrological transits at time of dream
        correlations: Found correlations with news/events
            [{"date": "1969-07-20", "event": "Moon landing", "symbol": "ascending"}]
        mood_before_sleep: Mood before going to sleep
        mood_upon_waking: Mood upon waking
        sleep_quality: 1-10 rating

    Example:
        dream = DreamEntry(
            dream_date="2025-01-15",
            title="Flying over an ancient city",
            narrative="I was soaring above stone buildings...",
            symbols=["flight", "ancient city", "golden light"],
            themes=["freedom", "ancestry", "transcendence"],
            emotions=["wonder", "peace", "slight anxiety"],
            lucidity_level=6,
            vividness=8
        )
    """
    __tablename__ = 'dream_entries'

    # When
    dream_date = Column(
        String(10),
        nullable=False,
        index=True,
        comment="Date of dream (YYYY-MM-DD)"
    )

    # Core content
    title = Column(
        String(255),
        nullable=True,
        comment="Brief title for the dream"
    )

    narrative = Column(
        Text,
        nullable=False,
        comment="Full dream narrative/description"
    )

    # Dream elements (for correlation with news themes)
    symbols = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Key symbols: ["water", "flying", "snake", "house"]'
    )

    themes = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Thematic tags: ["transformation", "fear", "reunion"]'
    )

    emotions = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Emotional qualities: ["anxiety", "joy", "confusion"]'
    )

    characters = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='People/beings: ["mother", "unknown man", "animal guide"]'
    )

    locations = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Dream places: ["childhood home", "forest", "unknown city"]'
    )

    colors = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Significant colors: ["gold", "deep blue", "red"]'
    )

    # Dream quality metrics
    lucidity_level = Column(
        Integer,
        nullable=True,
        comment="0-10 scale: 0=no awareness, 10=fully lucid"
    )

    vividness = Column(
        Integer,
        nullable=True,
        comment="0-10 scale of visual/sensory detail"
    )

    emotional_intensity = Column(
        Integer,
        nullable=True,
        comment="0-10 scale of emotional impact"
    )

    # Recurring patterns
    recurring = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether this is a recurring dream"
    )

    recurring_pattern = Column(
        Text,
        nullable=True,
        comment="Description of recurring elements or variations"
    )

    # Interpretation
    interpretation = Column(
        Text,
        nullable=True,
        comment="User's own interpretation of the dream"
    )

    ai_interpretation = Column(
        Text,
        nullable=True,
        comment="AI-generated interpretation"
    )

    # Astrological context
    transit_context = Column(
        Text,
        nullable=True,
        comment="JSON snapshot of significant transits at dream time"
    )

    moon_phase = Column(
        String(50),
        nullable=True,
        comment="Moon phase when dream occurred"
    )

    # Correlations with outer events
    correlations = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Found sync with events: [{"date": "...", "event": "...", "symbol": "..."}]'
    )

    # Sleep context
    mood_before_sleep = Column(
        String(100),
        nullable=True,
        comment="Emotional state before sleep"
    )

    mood_upon_waking = Column(
        String(100),
        nullable=True,
        comment="Emotional state upon waking"
    )

    sleep_quality = Column(
        Integer,
        nullable=True,
        comment="1-10 rating of sleep quality"
    )

    # Indexes
    __table_args__ = (
        Index('idx_dream_date', 'dream_date'),
        Index('idx_dream_recurring', 'recurring'),
        Index('idx_dream_lucidity', 'lucidity_level'),
    )

    def __repr__(self):
        title = self.title or self.narrative[:30] + "..."
        return f"<DreamEntry(date={self.dream_date}, title='{title}')>"

    @property
    def all_keywords(self) -> list:
        """Get all dream keywords (symbols + themes + emotions)"""
        keywords = []
        keywords.extend(self.symbols or [])
        keywords.extend(self.themes or [])
        keywords.extend(self.emotions or [])
        return list(set(keywords))

    @property
    def has_interpretation(self) -> bool:
        """Check if dream has any interpretation"""
        return bool(self.interpretation or self.ai_interpretation)

    @property
    def has_correlations(self) -> bool:
        """Check if dream has found correlations with events"""
        return bool(self.correlations)

    def matches_theme(self, theme: str) -> bool:
        """Check if dream contains a specific theme (case-insensitive)"""
        theme_lower = theme.lower()
        for keyword in self.all_keywords:
            if theme_lower in keyword.lower():
                return True
        return False

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['all_keywords'] = self.all_keywords
        result['has_interpretation'] = self.has_interpretation
        result['has_correlations'] = self.has_correlations
        return result

    def to_newspaper_dict(self) -> dict:
        """
        Format for inclusion in newspaper's dream section.

        This creates a "dispatch from the unconscious" style entry.
        """
        return {
            "date": self.dream_date,
            "title": self.title or "Untitled Dream",
            "preview": (self.narrative[:200] + "...") if len(self.narrative) > 200 else self.narrative,
            "symbols": self.symbols or [],
            "themes": self.themes or [],
            "emotions": self.emotions or [],
            "lucidity": self.lucidity_level,
            "vividness": self.vividness,
            "interpretation_preview": (
                (self.interpretation[:150] + "...") if self.interpretation and len(self.interpretation) > 150
                else self.interpretation
            ),
            "correlations_count": len(self.correlations or []),
            "moon_phase": self.moon_phase
        }
