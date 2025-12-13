"""
Location History Pydantic schemas

Schemas for location history import and querying API endpoints.
Part of the Personal History Investigation feature.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID


# =============================================================================
# Location Import Schemas
# =============================================================================

class LocationImportBase(BaseModel):
    """Base schema for location import"""
    source: str = Field(
        ...,
        max_length=50,
        description="Import source: google_takeout, apple, manual, gpx"
    )
    source_file_name: Optional[str] = Field(
        None,
        max_length=255,
        description="Original file name"
    )

    @validator("source")
    def validate_source(cls, v):
        """Validate source is one of the valid values"""
        valid_sources = ["google_takeout", "apple", "manual", "gpx", "photos"]
        if v.lower() not in valid_sources:
            raise ValueError(f"Source must be one of: {', '.join(valid_sources)}")
        return v.lower()


class LocationImportCreate(LocationImportBase):
    """Schema for creating a new import"""
    pass


class LocationImportUpdate(BaseModel):
    """Schema for updating an import"""
    import_status: Optional[str] = Field(
        None,
        description="Status: pending, processing, completed, failed"
    )
    error_message: Optional[str] = Field(None, description="Error message if failed")

    @validator("import_status")
    def validate_status(cls, v):
        """Validate status is one of the valid values"""
        if v is None:
            return v
        valid_statuses = ["pending", "processing", "completed", "failed"]
        if v.lower() not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v.lower()


class LocationImportResponse(LocationImportBase):
    """Schema for import response"""
    id: UUID = Field(..., description="Import ID")
    import_status: str = Field(..., description="Import status")
    total_records: Optional[int] = Field(None, description="Total records in source")
    imported_records: Optional[int] = Field(None, description="Successfully imported")
    skipped_records: Optional[int] = Field(None, description="Skipped records")
    error_message: Optional[str] = Field(None, description="Error if failed")
    date_range_start: Optional[str] = Field(None, description="Earliest date")
    date_range_end: Optional[str] = Field(None, description="Latest date")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    created_at: datetime = Field(..., description="Import timestamp")
    updated_at: datetime = Field(..., description="Last update")

    class Config:
        from_attributes = True


class LocationImportStats(BaseModel):
    """Statistics about location imports"""
    total_imports: int = Field(..., description="Total number of imports")
    total_records: int = Field(..., description="Total location records")
    date_range_start: Optional[str] = Field(None, description="Earliest record date")
    date_range_end: Optional[str] = Field(None, description="Latest record date")
    sources: Dict[str, int] = Field(..., description="Record count by source")


# =============================================================================
# Location Record Schemas
# =============================================================================

class LocationRecordBase(BaseModel):
    """Base schema for location record"""
    timestamp: str = Field(..., description="When at this location (ISO 8601)")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")
    accuracy_meters: Optional[float] = Field(None, ge=0, description="Accuracy in meters")
    altitude_meters: Optional[float] = Field(None, description="Altitude in meters")
    place_name: Optional[str] = Field(None, max_length=255, description="Place name")
    place_type: Optional[str] = Field(None, max_length=50, description="Place type")
    duration_minutes: Optional[int] = Field(None, ge=0, description="Duration at location")


class LocationRecordCreate(LocationRecordBase):
    """Schema for creating a location record"""
    import_id: UUID = Field(..., description="Import batch ID")
    source_id: Optional[str] = Field(None, max_length=255, description="Source ID for dedup")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class LocationRecordUpdate(BaseModel):
    """Schema for updating a location record"""
    place_name: Optional[str] = Field(None, max_length=255, description="Place name")
    place_type: Optional[str] = Field(None, max_length=50, description="Place type")
    duration_minutes: Optional[int] = Field(None, ge=0, description="Duration")


class LocationRecordResponse(LocationRecordBase):
    """Schema for location record response"""
    id: UUID = Field(..., description="Record ID")
    import_id: UUID = Field(..., description="Import batch ID")
    source_id: Optional[str] = Field(None, description="Source ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    date_only: str = Field(..., description="Date portion of timestamp")
    created_at: datetime = Field(..., description="Created timestamp")
    updated_at: datetime = Field(..., description="Updated timestamp")

    class Config:
        from_attributes = True


class LocationRecordListParams(BaseModel):
    """Query parameters for listing location records"""
    import_id: Optional[UUID] = Field(None, description="Filter by import")
    date_from: Optional[str] = Field(None, description="Start date filter (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="End date filter (YYYY-MM-DD)")
    place_type: Optional[str] = Field(None, description="Filter by place type")
    place_name: Optional[str] = Field(None, description="Search by place name")
    limit: int = Field(100, ge=1, le=1000, description="Max records to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")


# =============================================================================
# Significant Location Schemas
# =============================================================================

class SignificantLocationBase(BaseModel):
    """Base schema for significant location"""
    name: str = Field(..., max_length=255, description="Location name")
    latitude: float = Field(..., ge=-90, le=90, description="Center latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Center longitude")
    address: Optional[str] = Field(None, max_length=500, description="Full address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state_province: Optional[str] = Field(None, max_length=100, description="State/Province")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    location_type: str = Field(
        "frequent",
        max_length=50,
        description="Type: home, work, frequent, travel, family"
    )
    notes: Optional[str] = Field(None, description="User notes")

    @validator("location_type")
    def validate_location_type(cls, v):
        """Validate location type"""
        valid_types = ["home", "work", "frequent", "travel", "family", "school", "other"]
        if v.lower() not in valid_types:
            raise ValueError(f"Type must be one of: {', '.join(valid_types)}")
        return v.lower()


class SignificantLocationCreate(SignificantLocationBase):
    """Schema for creating a significant location"""
    first_visit: Optional[str] = Field(None, description="First visit date (ISO 8601)")
    last_visit: Optional[str] = Field(None, description="Last visit date")
    is_residence: bool = Field(False, description="Is this a residence?")
    residence_start: Optional[str] = Field(None, description="Residence start date")
    residence_end: Optional[str] = Field(None, description="Residence end date")


class SignificantLocationUpdate(BaseModel):
    """Schema for updating a significant location"""
    name: Optional[str] = Field(None, max_length=255, description="Location name")
    address: Optional[str] = Field(None, max_length=500, description="Full address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state_province: Optional[str] = Field(None, max_length=100, description="State/Province")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    location_type: Optional[str] = Field(None, max_length=50, description="Location type")
    notes: Optional[str] = Field(None, description="User notes")
    is_residence: Optional[bool] = Field(None, description="Is this a residence?")
    residence_start: Optional[str] = Field(None, description="Residence start date")
    residence_end: Optional[str] = Field(None, description="Residence end date")

    @validator("location_type")
    def validate_location_type(cls, v):
        """Validate location type"""
        if v is None:
            return v
        valid_types = ["home", "work", "frequent", "travel", "family", "school", "other"]
        if v.lower() not in valid_types:
            raise ValueError(f"Type must be one of: {', '.join(valid_types)}")
        return v.lower()


class SignificantLocationResponse(SignificantLocationBase):
    """Schema for significant location response"""
    id: UUID = Field(..., description="Location ID")
    first_visit: Optional[str] = Field(None, description="First visit date")
    last_visit: Optional[str] = Field(None, description="Last visit date")
    total_visits: Optional[int] = Field(None, description="Total visit count")
    total_duration_hours: Optional[float] = Field(None, description="Total hours spent")
    is_residence: bool = Field(..., description="Is this a residence?")
    residence_start: Optional[str] = Field(None, description="Residence start")
    residence_end: Optional[str] = Field(None, description="Residence end")
    is_current_residence: bool = Field(..., description="Current residence?")
    location_string: str = Field(..., description="Formatted location string")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    created_at: datetime = Field(..., description="Created timestamp")
    updated_at: datetime = Field(..., description="Updated timestamp")

    class Config:
        from_attributes = True


# =============================================================================
# Import File Processing Schemas
# =============================================================================

class ImportFileRequest(BaseModel):
    """Request schema for file import"""
    source: str = Field(
        ...,
        description="Import source: google_takeout, apple, gpx"
    )
    options: Optional[Dict[str, Any]] = Field(
        None,
        description="Import options (e.g., date range filters)"
    )


class ImportProgress(BaseModel):
    """Progress update during import"""
    import_id: UUID = Field(..., description="Import ID")
    status: str = Field(..., description="Current status")
    progress_percent: float = Field(..., ge=0, le=100, description="Progress percentage")
    records_processed: int = Field(..., description="Records processed so far")
    records_total: Optional[int] = Field(None, description="Total records (if known)")
    current_date: Optional[str] = Field(None, description="Current date being processed")
    message: Optional[str] = Field(None, description="Status message")


class ImportResult(BaseModel):
    """Result of import operation"""
    import_id: UUID = Field(..., description="Import ID")
    success: bool = Field(..., description="Whether import succeeded")
    total_records: int = Field(..., description="Total records found")
    imported_records: int = Field(..., description="Successfully imported")
    skipped_records: int = Field(..., description="Skipped (duplicates, invalid)")
    date_range_start: Optional[str] = Field(None, description="Earliest date")
    date_range_end: Optional[str] = Field(None, description="Latest date")
    errors: List[str] = Field(default_factory=list, description="Error messages")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")


# =============================================================================
# Timeline and Transit Correlation Schemas
# =============================================================================

class LocationTimelineEntry(BaseModel):
    """A location entry on the timeline"""
    date: str = Field(..., description="Date (YYYY-MM-DD)")
    locations: List[LocationRecordResponse] = Field(..., description="Locations on this date")
    significant_locations: List[SignificantLocationResponse] = Field(
        default_factory=list,
        description="Significant locations visited"
    )
    is_travel_day: bool = Field(False, description="Whether this was a travel day")
    distance_km: Optional[float] = Field(None, description="Total distance traveled")


class LocationTransitCorrelation(BaseModel):
    """Correlation between location events and transits"""
    location_event: str = Field(..., description="Location event description")
    event_date: str = Field(..., description="Event date")
    location: SignificantLocationResponse = Field(..., description="Location details")
    transits: List[Dict[str, Any]] = Field(..., description="Active transits at time")
    transit_summary: str = Field(..., description="AI-generated transit summary")


class ResidenceHistory(BaseModel):
    """User's residence history"""
    residences: List[SignificantLocationResponse] = Field(
        ...,
        description="List of residences in chronological order"
    )
    current_residence: Optional[SignificantLocationResponse] = Field(
        None,
        description="Current residence if any"
    )
    total_moves: int = Field(..., description="Total number of moves")
    average_residence_years: Optional[float] = Field(
        None,
        description="Average years at each residence"
    )
