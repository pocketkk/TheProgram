"""
LocationCache model for caching geocoded locations
"""
from sqlalchemy import Column, String, Integer, Numeric, Index
from app.models.base import BaseModel


class LocationCache(BaseModel):
    """
    Location cache model

    Caches geocoded locations for performance
    Reduces API calls to geocoding services
    """
    __tablename__ = "location_cache"

    # Location details
    city_name = Column(String(255), nullable=False)
    state_province = Column(String(255), nullable=True)
    country = Column(String(100), nullable=False)

    # Coordinates
    latitude = Column(Numeric(10, 7), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)

    # Timezone
    timezone = Column(String(100), nullable=False)

    # External ID (from GeoNames or similar)
    geonames_id = Column(Integer, unique=True, nullable=True, index=True)

    # Create composite index for city + country lookup
    __table_args__ = (
        Index('idx_city_country', 'city_name', 'country'),
    )

    def __repr__(self):
        return f"<LocationCache(id={self.id}, location={self.location_string})>"

    @property
    def location_string(self) -> str:
        """Get formatted location string"""
        parts = [self.city_name]
        if self.state_province:
            parts.append(self.state_province)
        parts.append(self.country)
        return ", ".join(parts)
