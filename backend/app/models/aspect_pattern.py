"""
AspectPattern model for storing detected aspect patterns
"""
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AspectPattern(BaseModel):
    """
    Aspect pattern model

    Stores auto-detected aspect patterns in charts
    Examples: Grand Trine, T-Square, Yod, etc.
    """
    __tablename__ = "aspect_patterns"

    # Foreign key to chart
    chart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("charts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Pattern information
    pattern_type = Column(String(50), nullable=False)
    # Types: grand_trine, t_square, yod, grand_cross, kite, mystic_rectangle, stellium, etc.

    # Planets involved (stored as JSON array)
    planets_involved = Column(JSONB, nullable=False)
    # Example: ["sun", "moon", "jupiter"]

    # Description
    description = Column(Text, nullable=True)

    # Relationships
    chart = relationship("Chart", back_populates="aspect_patterns")

    def __repr__(self):
        return f"<AspectPattern(id={self.id}, type={self.pattern_type}, chart_id={self.chart_id})>"

    @property
    def planet_count(self) -> int:
        """Get number of planets in pattern"""
        if self.planets_involved:
            return len(self.planets_involved)
        return 0
