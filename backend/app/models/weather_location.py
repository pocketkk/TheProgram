"""
WeatherLocation model for storing saved weather locations

Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from sqlalchemy import Column, String, Float, Boolean, Index

from app.models.base import BaseModel


class WeatherLocation(BaseModel):
    """
    Saved weather location model

    Stores user's saved locations for weather display.

    Fields:
        id: UUID primary key (inherited)
        name: Display name (e.g., "Home", "Work")
        city: City name
        country: Country code (e.g., "US", "GB")
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        is_primary: Whether this is the primary/default location
        timezone: Timezone string (e.g., "America/New_York")
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        location = WeatherLocation(
            name="Home",
            city="San Francisco",
            country="US",
            latitude=37.7749,
            longitude=-122.4194,
            is_primary=True
        )
    """
    __tablename__ = 'weather_locations'

    # Location identifiers
    name = Column(
        String(100),
        nullable=False,
        comment="Display name for this location"
    )

    city = Column(
        String(255),
        nullable=False,
        comment="City name"
    )

    country = Column(
        String(10),
        nullable=False,
        comment="Country code (ISO 3166-1 alpha-2)"
    )

    # Coordinates
    latitude = Column(
        Float,
        nullable=False,
        comment="Latitude coordinate"
    )

    longitude = Column(
        Float,
        nullable=False,
        comment="Longitude coordinate"
    )

    # Status
    is_primary = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether this is the primary location"
    )

    # Timezone
    timezone = Column(
        String(50),
        nullable=True,
        comment="Timezone string (e.g., America/New_York)"
    )

    # Table indexes
    __table_args__ = (
        Index('idx_weather_location_is_primary', 'is_primary'),
        Index('idx_weather_location_city', 'city'),
    )

    def __repr__(self):
        """String representation"""
        return f"<WeatherLocation(id={self.id[:8]}..., name='{self.name}', city='{self.city}')>"

    def to_dict(self):
        """Convert to dictionary"""
        result = super().to_dict()
        return result
