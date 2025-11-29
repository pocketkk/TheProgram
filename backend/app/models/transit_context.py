"""
TransitContext model for storing transit analysis snapshots

Captures transit data and AI-generated context for specific dates/events.
Part of Phase 2: Transit Timeline.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedDict


class TransitContext(BaseModel):
    """
    Transit context model for timeline analysis

    Stores calculated transit data and AI-generated historical context
    for specific dates. Can be linked to user events or standalone dates.

    Fields:
        id: UUID primary key (inherited)
        birth_data_id: Link to birth data (natal chart) for transit calculation
        user_event_id: Optional link to user event
        context_date: ISO 8601 date for this context (YYYY-MM-DD)
        transit_data: JSON calculated transit positions and aspects
        significant_transits: JSON list of significant transits (Saturn return, etc.)
        historical_context: AI-generated historical/mundane context
        personal_context: AI-generated personal interpretation
        themes: JSON list of identified themes
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        birth_data: Natal chart data
        user_event: Optional linked user event

    Transit Data Structure (JSON):
        {
            "transits": {
                "sun": {"longitude": 295.5, "natal_aspect": "trine_moon", "orb": 1.2},
                "saturn": {"longitude": 340.1, "natal_aspect": "conjunct_saturn", "orb": 0.5},
                ...
            },
            "major_aspects": [
                {"transiting": "saturn", "natal": "saturn", "type": "conjunction", "orb": 0.5},
                ...
            ],
            "lunar_phase": "waxing_gibbous",
            "retrograde_planets": ["mercury", "venus"]
        }

    Significant Transits (JSON list):
        [
            {"name": "Saturn Return", "phase": "applying", "orb": 2.5},
            {"name": "Pluto Square Sun", "phase": "exact", "orb": 0.1},
            ...
        ]

    Example:
        context = TransitContext(
            birth_data_id=birth_data.id,
            user_event_id=event.id,
            context_date="2024-03-15",
            transit_data={...},
            significant_transits=[{"name": "Saturn Return", "phase": "exact"}],
            historical_context="In March 2024, Saturn stationed at 11° Pisces...",
            personal_context="This Saturn return marks a significant restructuring...",
            themes=["responsibility", "career", "maturity"]
        )
    """
    __tablename__ = 'transit_contexts'

    # Foreign keys
    birth_data_id = Column(
        String,
        ForeignKey('birth_data.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Link to natal birth data"
    )

    user_event_id = Column(
        String,
        ForeignKey('user_events.id', ondelete='CASCADE'),
        nullable=True,
        index=True,
        comment="Optional link to user event"
    )

    # Context date
    context_date = Column(
        String,
        nullable=False,
        index=True,
        comment="Date for this transit context (YYYY-MM-DD)"
    )

    # Calculated transit data
    transit_data = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON calculated transit positions and aspects"
    )

    significant_transits = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON list of significant transits (Saturn return, etc.)"
    )

    # AI-generated context
    historical_context = Column(
        Text,
        nullable=True,
        comment="AI-generated historical/mundane astrological context"
    )

    personal_context = Column(
        Text,
        nullable=True,
        comment="AI-generated personal interpretation"
    )

    themes = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON list of identified themes"
    )

    # Relationships
    birth_data = relationship(
        'BirthData',
        foreign_keys=[birth_data_id],
        lazy='select'
    )

    user_event = relationship(
        'UserEvent',
        back_populates='transit_contexts',
        foreign_keys=[user_event_id],
        lazy='select'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_transit_context_date', 'context_date'),
        Index('idx_transit_context_birth_data', 'birth_data_id'),
        Index('idx_transit_context_event', 'user_event_id'),
    )

    def __repr__(self):
        """String representation"""
        return f"<TransitContext(id={self.id[:8]}..., date={self.context_date})>"

    @property
    def theme_list(self) -> list:
        """
        Get themes as Python list

        Returns:
            List of themes or empty list
        """
        if isinstance(self.themes, list):
            return self.themes
        return []

    @property
    def has_significant_transits(self) -> bool:
        """
        Check if there are significant transits

        Returns:
            True if significant transits exist
        """
        return bool(self.significant_transits)

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation
        """
        result = super().to_dict()
        result['theme_list'] = self.theme_list
        result['has_significant_transits'] = self.has_significant_transits
        return result
