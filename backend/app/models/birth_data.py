"""
BirthData model for storing birth information
"""
from sqlalchemy import Column, String, Date, Time, Boolean, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BirthData(BaseModel):
    """
    Birth data model

    Stores birth information for chart calculations
    Multiple birth data records can exist for one client (rectified charts, etc.)
    """
    __tablename__ = "birth_data"

    # Foreign key to client
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Birth date and time
    birth_date = Column(Date, nullable=False, index=True)
    birth_time = Column(Time, nullable=True)  # NULL if time unknown
    time_unknown = Column(Boolean, default=False, nullable=False)

    # Location (stored as plain values - encryption can be added later)
    latitude = Column(Numeric(10, 7), nullable=False)  # -90 to +90
    longitude = Column(Numeric(10, 7), nullable=False)  # -180 to +180

    # Timezone information
    timezone = Column(String(100), nullable=False)  # IANA timezone name
    utc_offset = Column(Integer, nullable=True)  # Offset in minutes from UTC

    # Location details
    city = Column(String(255), nullable=True)
    state_province = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)

    # Data quality
    rodden_rating = Column(String(2), nullable=True)
    # AA = Accurate from birth certificate
    # A = Quoted from birth certificate
    # B = Biography or autobiography
    # C = Caution, no source
    # DD = Dirty data, conflicting sources
    # X = Time unknown

    # Additional information
    gender = Column(String(20), nullable=True)

    # Relationships
    client = relationship("Client", back_populates="birth_data")

    charts = relationship(
        "Chart",
        back_populates="birth_data",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<BirthData(id={self.id}, date={self.birth_date}, location={self.city})>"

    @property
    def is_time_known(self) -> bool:
        """Check if birth time is known"""
        return not self.time_unknown and self.birth_time is not None

    @property
    def location_string(self) -> str:
        """Get formatted location string"""
        parts = []
        if self.city:
            parts.append(self.city)
        if self.state_province:
            parts.append(self.state_province)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts) if parts else f"({self.latitude}, {self.longitude})"

    @property
    def data_quality(self) -> str:
        """Get data quality description"""
        ratings = {
            "AA": "Accurate (Birth Certificate)",
            "A": "Quoted (Birth Certificate)",
            "B": "Biography/Autobiography",
            "C": "Caution (No Source)",
            "DD": "Dirty Data (Conflicting)",
            "X": "Time Unknown"
        }
        return ratings.get(self.rodden_rating, "Unknown")

    def validate_coordinates(self) -> bool:
        """Validate latitude and longitude are in valid ranges"""
        if self.latitude is None or self.longitude is None:
            return False
        return -90 <= self.latitude <= 90 and -180 <= self.longitude <= 180
