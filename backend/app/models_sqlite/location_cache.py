"""
LocationCache model for caching geocoded locations

Caches location data to reduce external API calls.
"""
from sqlalchemy import Column, String, Float, Integer, Index
from app.models_sqlite.base import BaseModel


class LocationCache(BaseModel):
    """
    Location cache model

    Caches geocoded location data to reduce API calls to external services.
    Stores coordinates, timezone, and external IDs.

    Fields:
        id: UUID primary key (inherited)
        city_name: City name
        state_province: State or province
        country: Country name
        latitude: Decimal latitude
        longitude: Decimal longitude
        timezone: IANA timezone name
        geonames_id: External GeoNames ID (unique)
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        location = LocationCache(
            city_name="New York",
            state_province="NY",
            country="USA",
            latitude=40.7128,
            longitude=-74.0060,
            timezone="America/New_York",
            geonames_id=5128581
        )
    """
    __tablename__ = 'location_cache'

    # Location details
    city_name = Column(
        String,
        nullable=False,
        comment="City name"
    )

    state_province = Column(
        String,
        nullable=True,
        comment="State or province"
    )

    country = Column(
        String,
        nullable=False,
        comment="Country name"
    )

    # Coordinates
    latitude = Column(
        Float,
        nullable=False,
        comment="Latitude in decimal degrees"
    )

    longitude = Column(
        Float,
        nullable=False,
        comment="Longitude in decimal degrees"
    )

    # Timezone
    timezone = Column(
        String,
        nullable=False,
        comment="IANA timezone name (e.g., 'America/New_York')"
    )

    # External ID (from GeoNames or similar service)
    geonames_id = Column(
        Integer,
        unique=True,
        nullable=True,
        comment="GeoNames ID (unique identifier)"
    )

    # Table indexes for location lookups
    __table_args__ = (
        Index('idx_location_cache_city_country', 'city_name', 'country'),
        Index('idx_location_cache_geonames', 'geonames_id'),
    )

    def __repr__(self):
        """String representation"""
        location = self.location_string
        return f"<LocationCache(location='{location}', tz={self.timezone})>"

    @property
    def location_string(self) -> str:
        """
        Get formatted location string

        Returns:
            Human-readable location (e.g., "New York, NY, USA")
        """
        parts = [self.city_name]
        if self.state_province:
            parts.append(self.state_province)
        parts.append(self.country)
        return ', '.join(parts)

    @property
    def coordinates_string(self) -> str:
        """
        Get formatted coordinates string

        Returns:
            Coordinates as string (e.g., "40.71°N, 74.01°W")
        """
        lat_dir = 'N' if self.latitude >= 0 else 'S'
        lon_dir = 'E' if self.longitude >= 0 else 'W'
        return f"{abs(self.latitude):.2f}°{lat_dir}, {abs(self.longitude):.2f}°{lon_dir}"

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with location_string and coordinates_string
        """
        result = super().to_dict()
        result['location_string'] = self.location_string
        result['coordinates_string'] = self.coordinates_string
        return result
