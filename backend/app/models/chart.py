"""
Chart model for storing calculated astrological charts

Stores chart metadata and calculated chart data (planets, houses, aspects).
"""
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedDict


class Chart(BaseModel):
    """
    Astrological chart model

    Stores calculated chart data and metadata.
    Charts can be natal, transit, progressed, synastry, etc.
    Single-user mode - no client associations.

    Fields:
        id: UUID primary key (inherited)
        birth_data_id: Foreign key to BirthData (required)
        chart_name: Descriptive name (e.g., "Natal Chart", "Solar Return 2025")
        chart_type: Type of chart (natal, transit, progressed, etc.)
        astro_system: Astrological system (western, vedic, human_design)
        house_system: House system used (placidus, koch, whole_sign, etc.)
        ayanamsa: Ayanamsa for sidereal/Vedic (lahiri, raman, etc.)
        zodiac_type: Zodiac type (tropical, sidereal)
        calculation_params: Additional calculation parameters (JSON)
        chart_data: Calculated chart data (JSON) - planets, houses, aspects
        last_viewed: Last time chart was viewed
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        birth_data: Birth data used for calculation
        interpretations: AI-generated interpretations for this chart
        aspect_patterns: Detected aspect patterns
        transit_events: Transit events for this chart

    Chart Data Structure (JSON):
        {
            "planets": {
                "sun": {"longitude": 123.45, "sign": 4, "house": 1, ...},
                "moon": {...},
                ...
            },
            "houses": {
                "cusps": [0, 30, 60, ...],
                "ascendant": 45.67,
                "mc": 135.67
            },
            "aspects": [
                {"planet1": "sun", "planet2": "moon", "type": "trine", "orb": 2.5},
                ...
            ],
            "patterns": [
                {"type": "grand_trine", "planets": ["sun", "moon", "jupiter"]},
                ...
            ]
        }

    Example:
        chart = Chart(
            birth_data_id=birth_data.id,
            chart_name="Natal Chart",
            chart_type="natal",
            astro_system="western",
            house_system="placidus",
            zodiac_type="tropical",
            chart_data={
                "planets": {...},
                "houses": {...},
                "aspects": [...]
            }
        )
    """
    __tablename__ = 'charts'

    # Foreign keys
    birth_data_id = Column(
        String,
        ForeignKey('birth_data.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Foreign key to birth_data (required)"
    )

    # Chart metadata
    chart_name = Column(
        String,
        nullable=True,
        comment="Descriptive chart name"
    )

    chart_type = Column(
        String,
        nullable=False,
        index=True,
        comment="Chart type: natal, transit, progressed, synastry, composite, return, horary"
    )

    astro_system = Column(
        String,
        nullable=False,
        comment="Astrological system: western, vedic, human_design"
    )

    # Calculation parameters
    house_system = Column(
        String,
        nullable=True,
        comment="House system: placidus, koch, whole_sign, equal, campanus, etc."
    )

    ayanamsa = Column(
        String,
        nullable=True,
        comment="Ayanamsa for sidereal/Vedic: lahiri, raman, krishnamurti, etc."
    )

    zodiac_type = Column(
        String,
        nullable=False,
        default='tropical',
        comment="Zodiac type: tropical or sidereal"
    )

    # Additional calculation parameters (JSON)
    calculation_params = Column(
        JSONEncodedDict,
        nullable=True,
        comment="Additional params: {'node_type': 'true', 'include_asteroids': true, 'orbs': {...}}"
    )

    # Calculated chart data (JSON)
    chart_data = Column(
        JSONEncodedDict,
        nullable=False,
        comment="Calculated chart data: planets, houses, aspects, patterns"
    )

    # Viewing tracking
    last_viewed = Column(
        String,
        nullable=True,
        comment="ISO 8601 timestamp of last view"
    )

    # Relationships
    birth_data = relationship(
        'BirthData',
        back_populates='charts'
    )

    interpretations = relationship(
        'ChartInterpretation',
        back_populates='chart',
        cascade='all, delete-orphan',
        lazy='select'
    )

    aspect_patterns = relationship(
        'AspectPattern',
        back_populates='chart',
        cascade='all, delete-orphan',
        lazy='select'
    )

    transit_events = relationship(
        'TransitEvent',
        back_populates='chart',
        cascade='all, delete-orphan',
        lazy='select'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_charts_birth_data_id', 'birth_data_id'),
        Index('idx_charts_chart_type', 'chart_type'),
        Index('idx_charts_created_at', 'created_at'),
    )

    def __repr__(self):
        """String representation"""
        name = self.chart_name or f"{self.chart_type} chart"
        return f"<Chart(id={self.id[:8]}..., name='{name}', type={self.chart_type})>"

    @property
    def display_name(self) -> str:
        """
        Get display name for chart

        Returns:
            Chart name or default based on type
        """
        if self.chart_name:
            return self.chart_name
        return f"{self.chart_type.title()} Chart"

    @property
    def planets(self) -> dict:
        """
        Get planet positions from chart data

        Returns:
            Dictionary of planet positions or empty dict
        """
        if self.chart_data and 'planets' in self.chart_data:
            return self.chart_data['planets']
        return {}

    @property
    def houses(self) -> dict:
        """
        Get house cusps from chart data

        Returns:
            Dictionary of house data or empty dict
        """
        if self.chart_data and 'houses' in self.chart_data:
            return self.chart_data['houses']
        return {}

    @property
    def aspects(self) -> list:
        """
        Get aspects from chart data

        Returns:
            List of aspect dictionaries or empty list
        """
        if self.chart_data and 'aspects' in self.chart_data:
            return self.chart_data['aspects']
        return []

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with display_name
        """
        result = super().to_dict()
        result['display_name'] = self.display_name
        # Note: chart_data is already included via to_dict
        return result

    def update_last_viewed(self):
        """Update last viewed timestamp"""
        from datetime import datetime
        self.last_viewed = datetime.utcnow().isoformat()
