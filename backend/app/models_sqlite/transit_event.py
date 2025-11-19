"""
TransitEvent model for tracking transit aspects over time

Stores transit events for notification and search functionality.
"""
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models_sqlite.base import BaseModel


class TransitEvent(BaseModel):
    """
    Transit event model

    Tracks when transiting planets form aspects to natal planets.
    Used for notifications, calendar views, and transit search.

    Fields:
        id: UUID primary key (inherited)
        chart_id: Foreign key to Chart
        event_date: ISO 8601 datetime of event
        transiting_planet: Planet that is transiting
        natal_planet: Natal planet being aspected
        aspect_type: Type of aspect
        orb: Orb in degrees
        is_applying: True if aspect is applying, False if separating
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        chart: Parent chart

    Example:
        event = TransitEvent(
            chart_id=chart.id,
            event_date="2025-01-15T14:30:00",
            transiting_planet="jupiter",
            natal_planet="sun",
            aspect_type="trine",
            orb=2.5,
            is_applying=True
        )
    """
    __tablename__ = 'transit_events'

    # Foreign key to chart
    chart_id = Column(
        String,
        ForeignKey('charts.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Foreign key to charts table"
    )

    # Event timing
    event_date = Column(
        String,
        nullable=False,
        index=True,
        comment="ISO 8601 datetime of transit event"
    )

    # Transit information
    transiting_planet = Column(
        String,
        nullable=False,
        comment="Transiting planet: 'jupiter', 'saturn', 'uranus', etc."
    )

    natal_planet = Column(
        String,
        nullable=False,
        comment="Natal planet being aspected: 'sun', 'moon', etc."
    )

    aspect_type = Column(
        String,
        nullable=False,
        comment="Aspect type: conjunction, trine, square, opposition, sextile, etc."
    )

    # Orb and direction
    orb = Column(
        Float,
        nullable=True,
        comment="Orb in degrees"
    )

    is_applying = Column(
        Boolean,
        nullable=True,
        comment="True if applying, False if separating, NULL if exact"
    )

    # Relationships
    chart = relationship(
        'Chart',
        back_populates='transit_events'
    )

    # Table indexes for efficient queries
    __table_args__ = (
        Index('idx_transit_events_chart_id', 'chart_id'),
        Index('idx_transit_events_event_date', 'event_date'),
        Index('idx_transit_events_chart_date', 'chart_id', 'event_date'),
    )

    def __repr__(self):
        """String representation"""
        return (
            f"<TransitEvent("
            f"date={self.event_date[:10]}, "
            f"{self.transiting_planet} {self.aspect_type} {self.natal_planet}"
            f")>"
        )

    @property
    def description(self) -> str:
        """
        Get human-readable description of transit

        Returns:
            Description like "Jupiter trine Sun"
        """
        return (
            f"{self.transiting_planet.capitalize()} "
            f"{self.aspect_type} "
            f"{self.natal_planet.capitalize()}"
        )

    @property
    def is_exact(self) -> bool:
        """
        Check if transit is exact (within 1 degree orb)

        Returns:
            True if orb <= 1.0
        """
        return self.orb is not None and self.orb <= 1.0

    @property
    def direction_string(self) -> str:
        """
        Get direction as string

        Returns:
            "applying", "separating", or "exact"
        """
        if self.is_applying is None:
            return "exact"
        return "applying" if self.is_applying else "separating"

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with description and flags
        """
        result = super().to_dict()
        result['description'] = self.description
        result['is_exact'] = self.is_exact
        result['direction_string'] = self.direction_string
        return result
