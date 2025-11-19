"""
Chart model for storing calculated astrological charts
"""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Chart(BaseModel):
    """
    Chart model

    Stores calculated astrological charts
    Chart data is stored as JSONB for flexibility
    """
    __tablename__ = "charts"

    # Foreign keys
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=True,  # Can be NULL for user's own chart
        index=True
    )

    birth_data_id = Column(
        UUID(as_uuid=True),
        ForeignKey("birth_data.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Chart metadata
    chart_name = Column(String(255), nullable=True)  # "Natal Chart", "Solar Return 2025"
    chart_type = Column(String(50), nullable=False, index=True)
    # Chart types: natal, transit, progressed, synastry, composite, return, horary, etc.

    astro_system = Column(String(50), nullable=False)
    # Systems: western, vedic, human_design

    # Calculation parameters
    house_system = Column(String(50), nullable=True)  # placidus, koch, whole_sign, etc.
    ayanamsa = Column(String(50), nullable=True)  # lahiri, raman, etc. (for Vedic)
    zodiac_type = Column(String(50), nullable=False, default="tropical")  # tropical, sidereal

    # Additional calculation parameters as JSON
    calculation_params = Column(JSONB, nullable=True)
    # Example: {"node_type": "true", "include_asteroids": true, "orbs": {...}}

    # Calculated chart data (stored as JSONB)
    chart_data = Column(JSONB, nullable=False)
    # Example structure:
    # {
    #   "planets": {"sun": {"longitude": 123.45, "sign": 4, ...}, ...},
    #   "houses": {"cusps": [...], "ascendant": 45.67, ...},
    #   "aspects": [{"planet1": "sun", "planet2": "moon", "type": "trine", ...}],
    #   "patterns": [{"type": "grand_trine", "planets": [...]}]
    # }

    # Viewing tracking
    last_viewed = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="charts")
    client = relationship("Client", back_populates="charts")
    birth_data = relationship("BirthData", back_populates="charts")

    aspect_patterns = relationship(
        "AspectPattern",
        back_populates="chart",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    transit_events = relationship(
        "TransitEvent",
        back_populates="chart",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    ai_interpretations = relationship(
        "ChartInterpretation",
        back_populates="chart",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<Chart(id={self.id}, type={self.chart_type}, system={self.astro_system})>"

    @property
    def display_name(self) -> str:
        """Get display name for chart"""
        if self.chart_name:
            return self.chart_name
        return f"{self.chart_type.title()} Chart"

    def update_last_viewed(self):
        """Update last viewed timestamp"""
        from datetime import datetime
        self.last_viewed = datetime.utcnow()

    def get_planet_position(self, planet: str) -> dict:
        """
        Get position data for a specific planet

        Args:
            planet: Planet name (e.g., 'sun', 'moon')

        Returns:
            Dictionary with planet position data
        """
        if self.chart_data and "planets" in self.chart_data:
            return self.chart_data["planets"].get(planet)
        return None

    def get_house_cusp(self, house_number: int) -> float:
        """
        Get cusp position for a specific house

        Args:
            house_number: House number (1-12)

        Returns:
            Cusp longitude in degrees
        """
        if self.chart_data and "houses" in self.chart_data:
            cusps = self.chart_data["houses"].get("cusps", [])
            if 1 <= house_number <= len(cusps):
                return cusps[house_number - 1]
        return None

    def get_aspects(self, planet: str = None) -> list:
        """
        Get aspects, optionally filtered by planet

        Args:
            planet: Optional planet name to filter aspects

        Returns:
            List of aspect dictionaries
        """
        if not self.chart_data or "aspects" not in self.chart_data:
            return []

        aspects = self.chart_data["aspects"]

        if planet:
            # Filter aspects involving this planet
            return [
                asp for asp in aspects
                if asp.get("planet1") == planet or asp.get("planet2") == planet
            ]

        return aspects
