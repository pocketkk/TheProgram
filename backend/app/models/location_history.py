"""
Location History models for tracking user's historical locations

Supports importing location data from various sources:
- Google Takeout (Timeline/Location History)
- Apple Location Services export
- Manual entry
- Future: Calendar events, photos EXIF data

Part of the "Personal History Investigation" feature for correlating
life events with astrological transits.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Text, Float, Integer
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedDict


class LocationImport(BaseModel):
    """
    Location import batch model

    Tracks metadata about each import operation. Allows users to:
    - See what data sources they've imported
    - Delete an entire import batch if needed
    - Track import statistics

    Fields:
        id: UUID primary key (inherited)
        source: Import source (google_takeout, apple, manual, etc.)
        source_file_name: Original file name if applicable
        import_status: Status (pending, processing, completed, failed)
        total_records: Total records found in source
        imported_records: Successfully imported records
        skipped_records: Skipped records (duplicates, invalid, etc.)
        error_message: Error message if failed
        date_range_start: Earliest date in imported data
        date_range_end: Latest date in imported data
        metadata: Additional metadata (JSON)
        created_at: Import timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        records: Location records from this import

    Example:
        import_batch = LocationImport(
            source="google_takeout",
            source_file_name="Records.json",
            import_status="completed",
            total_records=50000,
            imported_records=48500,
            skipped_records=1500
        )
    """
    __tablename__ = 'location_imports'

    # Import source
    source = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Import source: google_takeout, apple, manual, gpx, photos"
    )

    source_file_name = Column(
        String(255),
        nullable=True,
        comment="Original file name if applicable"
    )

    # Import status
    import_status = Column(
        String(20),
        nullable=False,
        default='pending',
        index=True,
        comment="Status: pending, processing, completed, failed"
    )

    # Statistics
    total_records = Column(
        Integer,
        nullable=True,
        default=0,
        comment="Total records found in source"
    )

    imported_records = Column(
        Integer,
        nullable=True,
        default=0,
        comment="Successfully imported records"
    )

    skipped_records = Column(
        Integer,
        nullable=True,
        default=0,
        comment="Skipped records (duplicates, invalid)"
    )

    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if import failed"
    )

    # Date range of imported data
    date_range_start = Column(
        String,
        nullable=True,
        index=True,
        comment="Earliest date in import (ISO 8601)"
    )

    date_range_end = Column(
        String,
        nullable=True,
        index=True,
        comment="Latest date in import (ISO 8601)"
    )

    # Additional metadata
    metadata = Column(
        JSONEncodedDict,
        nullable=True,
        default=dict,
        comment="Additional import metadata (JSON)"
    )

    # Relationships
    records = relationship(
        'LocationRecord',
        back_populates='import_batch',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    # Indexes
    __table_args__ = (
        Index('idx_location_import_source', 'source'),
        Index('idx_location_import_status', 'import_status'),
        Index('idx_location_import_date_range', 'date_range_start', 'date_range_end'),
    )

    def __repr__(self):
        """String representation"""
        return f"<LocationImport(id={self.id[:8]}..., source={self.source}, status={self.import_status})>"

    def to_dict(self):
        """Convert to dictionary"""
        result = super().to_dict()
        result['record_count'] = self.records.count() if self.records else 0
        return result


class LocationRecord(BaseModel):
    """
    Individual location record model

    Stores a single location data point with timestamp. Designed to handle
    high-volume imports (hundreds of thousands of records) efficiently.

    Fields:
        id: UUID primary key (inherited)
        import_id: Link to import batch
        timestamp: When user was at this location (ISO 8601)
        latitude: Location latitude
        longitude: Location longitude
        accuracy_meters: Location accuracy in meters (if available)
        altitude_meters: Altitude in meters (if available)
        place_name: Human-readable place name (reverse geocoded or from source)
        place_type: Type of place (home, work, restaurant, etc.)
        duration_minutes: Time spent at location (if calculable)
        source_id: Original ID from source (for deduplication)
        metadata: Additional data from source (JSON)
        created_at: Record creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        import_batch: The import this record came from

    Example:
        record = LocationRecord(
            import_id=import_batch.id,
            timestamp="2024-03-15T14:30:00Z",
            latitude=37.7749,
            longitude=-122.4194,
            place_name="San Francisco, CA",
            duration_minutes=120
        )
    """
    __tablename__ = 'location_records'

    # Link to import batch
    import_id = Column(
        String,
        ForeignKey('location_imports.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Link to import batch"
    )

    # Timestamp
    timestamp = Column(
        String,
        nullable=False,
        index=True,
        comment="When user was at this location (ISO 8601)"
    )

    # Core location data
    latitude = Column(
        Float,
        nullable=False,
        comment="Latitude (-90 to 90)"
    )

    longitude = Column(
        Float,
        nullable=False,
        comment="Longitude (-180 to 180)"
    )

    # Optional accuracy/altitude
    accuracy_meters = Column(
        Float,
        nullable=True,
        comment="Location accuracy in meters"
    )

    altitude_meters = Column(
        Float,
        nullable=True,
        comment="Altitude in meters"
    )

    # Place information
    place_name = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Human-readable place name"
    )

    place_type = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Type: home, work, restaurant, travel, etc."
    )

    # Duration at location
    duration_minutes = Column(
        Integer,
        nullable=True,
        comment="Time spent at location in minutes"
    )

    # Source tracking for deduplication
    source_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Original ID from source for deduplication"
    )

    # Additional metadata
    metadata = Column(
        JSONEncodedDict,
        nullable=True,
        default=dict,
        comment="Additional data from source (JSON)"
    )

    # Relationships
    import_batch = relationship(
        'LocationImport',
        foreign_keys=[import_id],
        back_populates='records'
    )

    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_location_record_timestamp', 'timestamp'),
        Index('idx_location_record_import', 'import_id'),
        Index('idx_location_record_place', 'place_name'),
        Index('idx_location_record_place_type', 'place_type'),
        Index('idx_location_record_coords', 'latitude', 'longitude'),
        Index('idx_location_record_source_id', 'source_id'),
    )

    def __repr__(self):
        """String representation"""
        return f"<LocationRecord(id={self.id[:8]}..., ts={self.timestamp}, place={self.place_name})>"

    @property
    def coordinates(self) -> tuple:
        """Get coordinates as tuple"""
        return (self.latitude, self.longitude)

    @property
    def date_only(self) -> str:
        """Get just the date portion of timestamp"""
        if self.timestamp:
            return self.timestamp[:10]
        return ""

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['coordinates'] = self.coordinates
        result['date_only'] = self.date_only
        return result


class SignificantLocation(BaseModel):
    """
    Aggregated significant location model

    Represents places where the user spent significant time. Derived from
    LocationRecords through aggregation. Used for:
    - Identifying home/work locations
    - Showing major life locations on timeline
    - Correlating with transits (e.g., "moved to new city during Saturn return")

    Fields:
        id: UUID primary key (inherited)
        name: User-friendly name (can be edited)
        latitude: Center latitude of location cluster
        longitude: Center longitude of location cluster
        address: Full address (if reverse geocoded)
        city: City name
        state_province: State or province
        country: Country
        location_type: Type (home, work, frequent, travel, etc.)
        first_visit: First recorded visit (ISO 8601)
        last_visit: Last recorded visit (ISO 8601)
        total_visits: Number of distinct visits
        total_duration_hours: Total time spent (hours)
        is_residence: Whether this was a residence
        residence_start: Start date if residence
        residence_end: End date if residence (null if current)
        notes: User notes about this location
        metadata: Additional data (JSON)
        created_at: Record creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        location = SignificantLocation(
            name="Home - San Francisco",
            latitude=37.7749,
            longitude=-122.4194,
            city="San Francisco",
            state_province="California",
            country="United States",
            location_type="home",
            is_residence=True,
            residence_start="2020-01-15"
        )
    """
    __tablename__ = 'significant_locations'

    # Name and core location
    name = Column(
        String(255),
        nullable=False,
        comment="User-friendly location name"
    )

    latitude = Column(
        Float,
        nullable=False,
        comment="Center latitude"
    )

    longitude = Column(
        Float,
        nullable=False,
        comment="Center longitude"
    )

    # Address components
    address = Column(
        String(500),
        nullable=True,
        comment="Full address if known"
    )

    city = Column(
        String(100),
        nullable=True,
        index=True,
        comment="City name"
    )

    state_province = Column(
        String(100),
        nullable=True,
        comment="State or province"
    )

    country = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Country"
    )

    # Location classification
    location_type = Column(
        String(50),
        nullable=False,
        default='frequent',
        index=True,
        comment="Type: home, work, frequent, travel, family, etc."
    )

    # Visit statistics
    first_visit = Column(
        String,
        nullable=True,
        index=True,
        comment="First recorded visit (ISO 8601)"
    )

    last_visit = Column(
        String,
        nullable=True,
        index=True,
        comment="Last recorded visit (ISO 8601)"
    )

    total_visits = Column(
        Integer,
        nullable=True,
        default=0,
        comment="Number of distinct visits"
    )

    total_duration_hours = Column(
        Float,
        nullable=True,
        default=0,
        comment="Total time spent in hours"
    )

    # Residence tracking
    is_residence = Column(
        String(5),
        nullable=False,
        default='false',
        comment="Whether this was a residence (true/false)"
    )

    residence_start = Column(
        String,
        nullable=True,
        index=True,
        comment="Start date if residence (ISO 8601)"
    )

    residence_end = Column(
        String,
        nullable=True,
        comment="End date if residence, null if current"
    )

    # User notes
    notes = Column(
        Text,
        nullable=True,
        comment="User notes about this location"
    )

    # Additional metadata
    metadata = Column(
        JSONEncodedDict,
        nullable=True,
        default=dict,
        comment="Additional data (JSON)"
    )

    # Indexes
    __table_args__ = (
        Index('idx_significant_location_type', 'location_type'),
        Index('idx_significant_location_city', 'city'),
        Index('idx_significant_location_country', 'country'),
        Index('idx_significant_location_visits', 'first_visit', 'last_visit'),
        Index('idx_significant_location_residence', 'is_residence', 'residence_start'),
    )

    def __repr__(self):
        """String representation"""
        return f"<SignificantLocation(id={self.id[:8]}..., name={self.name}, type={self.location_type})>"

    @property
    def coordinates(self) -> tuple:
        """Get coordinates as tuple"""
        return (self.latitude, self.longitude)

    @property
    def is_current_residence(self) -> bool:
        """Check if this is the current residence"""
        return self.is_residence == 'true' and self.residence_end is None

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
        return ", ".join(parts) if parts else f"{self.latitude:.4f}, {self.longitude:.4f}"

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['coordinates'] = self.coordinates
        result['is_current_residence'] = self.is_current_residence
        result['location_string'] = self.location_string
        return result
