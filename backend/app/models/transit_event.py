"""
TransitEvent model for tracking transit aspects
"""
from sqlalchemy import Column, String, DateTime, Boolean, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class TransitEvent(BaseModel):
    """
    Transit event model

    Tracks specific transit aspects over time
    Useful for transit search and notifications
    """
    __tablename__ = "transit_events"

    # Foreign key to chart
    chart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("charts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Event timing
    event_date = Column(DateTime, nullable=False, index=True)

    # Transit information
    transiting_planet = Column(String(50), nullable=False)
    natal_planet = Column(String(50), nullable=False)
    aspect_type = Column(String(50), nullable=False)  # conjunction, trine, etc.

    # Orb and direction
    orb = Column(Numeric(5, 2), nullable=True)  # Degrees
    is_applying = Column(Boolean, nullable=True)  # True=applying, False=separating

    # Create composite index for chart + date lookup
    __table_args__ = (
        Index('idx_chart_date', 'chart_id', 'event_date'),
    )

    # Relationships
    chart = relationship("Chart", back_populates="transit_events")

    def __repr__(self):
        return f"<TransitEvent(id={self.id}, {self.description})>"

    @property
    def description(self) -> str:
        """Get human-readable description of transit"""
        return f"{self.transiting_planet.title()} {self.aspect_type} {self.natal_planet.title()}"

    @property
    def orb_string(self) -> str:
        """Get formatted orb string"""
        if self.orb is not None:
            direction = "applying" if self.is_applying else "separating"
            return f"{float(self.orb):.2f}° {direction}"
        return "exact"
