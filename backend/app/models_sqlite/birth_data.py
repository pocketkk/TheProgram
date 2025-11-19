"""
BirthData model for storing birth information

Stores all information needed for astrological chart calculations:
date, time, location, timezone, etc.
"""
from sqlalchemy import Column, String, Float, Integer, Boolean, Index, CheckConstraint
from sqlalchemy.orm import relationship

from app.models_sqlite.base import BaseModel


class BirthData(BaseModel):
    """
    Birth data model

    Stores birth information required for chart calculations.
    Single-user mode - no client associations.

    Fields:
        id: UUID primary key (inherited)
        birth_date: ISO 8601 date (YYYY-MM-DD)
        birth_time: ISO 8601 time (HH:MM:SS) or NULL if unknown
        time_unknown: Boolean flag for unknown birth time
        latitude: Decimal degrees (-90 to +90)
        longitude: Decimal degrees (-180 to +180)
        timezone: IANA timezone name (e.g., "America/New_York")
        utc_offset: Offset in minutes from UTC
        city: Birth city name
        state_province: State or province
        country: Country name
        rodden_rating: Data quality rating (AA, A, B, C, DD, X)
        gender: Gender (optional)
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        charts: Charts calculated from this birth data

    Rodden Rating Scale:
        AA: Accurate from birth certificate
        A: Quoted from birth certificate
        B: Biography or autobiography
        C: Caution, no source
        DD: Dirty data, conflicting sources
        X: Time unknown

    Example:
        birth_data = BirthData(
            birth_date="1990-01-15",
            birth_time="14:30:00",
            time_unknown=False,
            latitude=40.7128,
            longitude=-74.0060,
            timezone="America/New_York",
            city="New York",
            state_province="NY",
            country="USA",
            rodden_rating="A"
        )
    """
    __tablename__ = 'birth_data'

    # Birth date and time
    birth_date = Column(
        String,
        nullable=False,
        index=True,
        comment="Birth date in ISO 8601 format (YYYY-MM-DD)"
    )

    birth_time = Column(
        String,
        nullable=True,
        comment="Birth time in ISO 8601 format (HH:MM:SS), NULL if unknown"
    )

    time_unknown = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if birth time is unknown (0=false, 1=true)"
    )

    # Location (decimal degrees)
    latitude = Column(
        Float,
        nullable=False,
        comment="Latitude in decimal degrees (-90 to +90)"
    )

    longitude = Column(
        Float,
        nullable=False,
        comment="Longitude in decimal degrees (-180 to +180)"
    )

    # Timezone information
    timezone = Column(
        String,
        nullable=False,
        comment="IANA timezone name (e.g., 'America/New_York')"
    )

    utc_offset = Column(
        Integer,
        nullable=True,
        comment="UTC offset in minutes (for reference)"
    )

    # Location details
    city = Column(
        String,
        nullable=True,
        comment="Birth city name"
    )

    state_province = Column(
        String,
        nullable=True,
        comment="State or province"
    )

    country = Column(
        String,
        nullable=True,
        comment="Country name"
    )

    # Data quality (Rodden Rating)
    rodden_rating = Column(
        String,
        nullable=True,
        comment="Rodden rating: AA, A, B, C, DD, or X"
    )

    # Additional information
    gender = Column(
        String,
        nullable=True,
        comment="Gender (optional)"
    )

    # Relationships
    charts = relationship(
        'Chart',
        back_populates='birth_data',
        cascade='all, delete-orphan',
        lazy='select'
    )

    # Table constraints and indexes
    __table_args__ = (
        CheckConstraint('latitude >= -90 AND latitude <= 90', name='ck_birth_data_latitude'),
        CheckConstraint('longitude >= -180 AND longitude <= 180', name='ck_birth_data_longitude'),
        Index('idx_birth_data_birth_date', 'birth_date'),
    )

    def __repr__(self):
        """String representation"""
        location = self.location_string or "Unknown location"
        return f"<BirthData(id={self.id[:8]}..., date={self.birth_date}, location='{location}')>"

    @property
    def location_string(self) -> str:
        """
        Get formatted location string

        Returns:
            Human-readable location (e.g., "New York, NY, USA")
        """
        parts = []
        if self.city:
            parts.append(self.city)
        if self.state_province:
            parts.append(self.state_province)
        if self.country:
            parts.append(self.country)
        return ', '.join(parts) if parts else ''

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

    @property
    def has_time(self) -> bool:
        """
        Check if birth time is known

        Returns:
            True if time is available, False otherwise
        """
        return not self.time_unknown and self.birth_time is not None

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with location_string and coordinates_string
        """
        result = super().to_dict()
        result['location_string'] = self.location_string
        result['coordinates_string'] = self.coordinates_string
        result['has_time'] = self.has_time
        return result
