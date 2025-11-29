"""
AspectPattern model for auto-detected aspect patterns in charts

Stores detected patterns like grand trines, T-squares, yods, etc.
"""
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class AspectPattern(BaseModel):
    """
    Aspect pattern model

    Stores auto-detected aspect patterns in charts.
    Patterns are configurations of three or more planets forming
    geometric relationships.

    Fields:
        id: UUID primary key (inherited)
        chart_id: Foreign key to Chart
        pattern_type: Type of pattern
        planets_involved: List of planets (JSON array)
        description: Pattern description
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        chart: Parent chart

    Pattern Types:
        - grand_trine: Three planets 120° apart
        - t_square: Two oppositions and two squares
        - yod: Finger of God (two quincunxes and a sextile)
        - grand_cross: Four planets in two oppositions and four squares
        - kite: Grand trine with one planet opposing another
        - mystic_rectangle: Two trines and two sextiles
        - stellium: Three or more planets in same sign/house
        - etc.

    Example:
        pattern = AspectPattern(
            chart_id=chart.id,
            pattern_type="grand_trine",
            planets_involved=["sun", "moon", "jupiter"],
            description="Grand Trine in Fire signs"
        )
    """
    __tablename__ = 'aspect_patterns'

    # Foreign key to chart
    chart_id = Column(
        String,
        ForeignKey('charts.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Foreign key to charts table"
    )

    # Pattern information
    pattern_type = Column(
        String,
        nullable=False,
        index=True,
        comment="Pattern type: grand_trine, t_square, yod, grand_cross, kite, etc."
    )

    # Planets involved (stored as JSON array)
    planets_involved = Column(
        JSONEncodedList,
        nullable=False,
        comment="List of planets: ['sun', 'moon', 'jupiter']"
    )

    # Description
    description = Column(
        String,
        nullable=True,
        comment="Description of the pattern"
    )

    # Relationships
    chart = relationship(
        'Chart',
        back_populates='aspect_patterns'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_aspect_patterns_chart_id', 'chart_id'),
        Index('idx_aspect_patterns_pattern_type', 'pattern_type'),
    )

    def __repr__(self):
        """String representation"""
        planets = ', '.join(self.planets_involved) if self.planets_involved else "no planets"
        return (
            f"<AspectPattern("
            f"chart={self.chart_id[:8]}..., "
            f"type={self.pattern_type}, "
            f"planets=[{planets}]"
            f")>"
        )

    @property
    def planet_count(self) -> int:
        """
        Get number of planets in pattern

        Returns:
            Count of planets involved
        """
        return len(self.planets_involved) if self.planets_involved else 0

    @property
    def planet_names_string(self) -> str:
        """
        Get comma-separated planet names

        Returns:
            String like "Sun, Moon, Jupiter"
        """
        if not self.planets_involved:
            return ""
        # Capitalize planet names
        return ', '.join(p.capitalize() for p in self.planets_involved)

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with planet count and names
        """
        result = super().to_dict()
        result['planet_count'] = self.planet_count
        result['planet_names_string'] = self.planet_names_string
        return result
