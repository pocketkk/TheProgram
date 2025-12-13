"""
Location History API Routes

Endpoints for importing and querying location history data.
Part of the Personal History Investigation feature.
"""
from typing import List, Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models import LocationImport, LocationRecord, SignificantLocation
from app.schemas.location_history import (
    LocationImportResponse,
    LocationImportStats,
    LocationRecordResponse,
    LocationRecordCreate,
    LocationRecordUpdate,
    SignificantLocationResponse,
    SignificantLocationCreate,
    SignificantLocationUpdate,
    ImportResult,
)
from app.services.location_history_import_service import (
    LocationHistoryImportService,
    get_location_import_service,
)

router = APIRouter(prefix="/location-history", tags=["Location History"])


# =============================================================================
# Import Endpoints
# =============================================================================

@router.post("/import", response_model=ImportResult, status_code=status.HTTP_201_CREATED)
async def import_location_history(
    file: UploadFile = File(..., description="Location history file"),
    source: str = Form(..., description="Import source: google_takeout, apple, gpx"),
    date_from: Optional[str] = Form(None, description="Filter: start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Form(None, description="Filter: end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Import location history from uploaded file

    Supports:
    - Google Takeout JSON (Records.json or Location History.json)
    - Apple Location Services export
    - GPX files from fitness apps/GPS devices

    The import runs synchronously and returns results. For very large files
    (>100MB), consider using the WebSocket endpoint for progress updates.

    Args:
        file: Uploaded location history file
        source: Import source type
        date_from: Optional start date filter
        date_to: Optional end date filter

    Returns:
        Import result with statistics

    Raises:
        HTTPException 400: Invalid file format or source
        HTTPException 422: Parsing error
    """
    # Validate source
    valid_sources = ["google_takeout", "apple", "gpx"]
    if source.lower() not in valid_sources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source must be one of: {', '.join(valid_sources)}"
        )

    # Read file content
    try:
        content = await file.read()
        content_str = content.decode("utf-8")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )

    # Build options
    options = {}
    if date_from:
        options["date_from"] = date_from
    if date_to:
        options["date_to"] = date_to

    # Import based on source
    service = get_location_import_service(db)

    try:
        if source.lower() == "google_takeout":
            import_record, warnings = service.import_google_takeout(
                content_str,
                file.filename or "Records.json",
                options
            )
        elif source.lower() == "apple":
            import_record, warnings = service.import_apple_location_history(
                content_str,
                file.filename or "Location History.json",
                options
            )
        elif source.lower() == "gpx":
            import_record, warnings = service.import_gpx(
                content_str,
                file.filename or "track.gpx",
                options
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported source: {source}"
            )

        return ImportResult(
            import_id=import_record.id,
            success=import_record.import_status == "completed",
            total_records=import_record.total_records or 0,
            imported_records=import_record.imported_records or 0,
            skipped_records=import_record.skipped_records or 0,
            date_range_start=import_record.date_range_start,
            date_range_end=import_record.date_range_end,
            errors=[import_record.error_message] if import_record.error_message else [],
            warnings=warnings
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/imports", response_model=List[LocationImportResponse])
async def list_imports(
    source: Optional[str] = Query(None, description="Filter by source"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    List all location history imports

    Returns import batches with metadata and statistics.
    """
    service = get_location_import_service(db)
    imports = service.list_imports(
        source=source,
        status=status_filter,
        limit=limit,
        offset=offset
    )
    return imports


@router.get("/imports/stats", response_model=LocationImportStats)
async def get_import_stats(db: Session = Depends(get_db)):
    """
    Get statistics about all location imports

    Returns total records, date range, and breakdown by source.
    """
    service = get_location_import_service(db)
    stats = service.get_import_stats()
    return LocationImportStats(**stats)


@router.get("/imports/{import_id}", response_model=LocationImportResponse)
async def get_import(
    import_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific import by ID"""
    service = get_location_import_service(db)
    import_record = service.get_import(str(import_id))

    if not import_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )

    return import_record


@router.delete("/imports/{import_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_import(
    import_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete an import and all its location records

    This permanently removes all location data from this import.
    """
    service = get_location_import_service(db)
    deleted = service.delete_import(str(import_id))

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )


# =============================================================================
# Location Record Endpoints
# =============================================================================

@router.get("/records", response_model=List[LocationRecordResponse])
async def list_location_records(
    import_id: Optional[UUID] = Query(None, description="Filter by import"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    place_type: Optional[str] = Query(None, description="Filter by place type"),
    place_name: Optional[str] = Query(None, description="Search by place name"),
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    List location records with optional filters

    Returns individual location data points. Use pagination for large datasets.
    """
    query = db.query(LocationRecord)

    if import_id:
        query = query.filter(LocationRecord.import_id == str(import_id))
    if date_from:
        query = query.filter(LocationRecord.timestamp >= date_from)
    if date_to:
        query = query.filter(LocationRecord.timestamp <= date_to + "T23:59:59Z")
    if place_type:
        query = query.filter(LocationRecord.place_type == place_type)
    if place_name:
        query = query.filter(LocationRecord.place_name.ilike(f"%{place_name}%"))

    records = query.order_by(
        LocationRecord.timestamp.desc()
    ).offset(offset).limit(limit).all()

    # Add computed fields
    results = []
    for record in records:
        data = record.to_dict()
        data["date_only"] = record.date_only
        results.append(data)

    return results


@router.get("/records/{record_id}", response_model=LocationRecordResponse)
async def get_location_record(
    record_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific location record"""
    record = db.query(LocationRecord).filter(
        LocationRecord.id == str(record_id)
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location record not found"
        )

    return record


@router.put("/records/{record_id}", response_model=LocationRecordResponse)
async def update_location_record(
    record_id: UUID,
    update_data: LocationRecordUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a location record

    Only place_name, place_type, and duration can be updated.
    """
    record = db.query(LocationRecord).filter(
        LocationRecord.id == str(record_id)
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location record not found"
        )

    record.update_from_dict(update_data.dict(exclude_unset=True))
    db.commit()
    db.refresh(record)

    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location_record(
    record_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a specific location record"""
    record = db.query(LocationRecord).filter(
        LocationRecord.id == str(record_id)
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location record not found"
        )

    db.delete(record)
    db.commit()


# =============================================================================
# Significant Location Endpoints
# =============================================================================

@router.get("/significant", response_model=List[SignificantLocationResponse])
async def list_significant_locations(
    location_type: Optional[str] = Query(None, description="Filter by type"),
    is_residence: Optional[bool] = Query(None, description="Filter residences"),
    city: Optional[str] = Query(None, description="Filter by city"),
    country: Optional[str] = Query(None, description="Filter by country"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
    offset: int = Query(0, ge=0, description="Offset"),
    db: Session = Depends(get_db)
):
    """
    List significant locations

    Significant locations are derived from location records - places where
    the user spent significant time (home, work, frequent visits).
    """
    query = db.query(SignificantLocation)

    if location_type:
        query = query.filter(SignificantLocation.location_type == location_type)
    if is_residence is not None:
        residence_val = "true" if is_residence else "false"
        query = query.filter(SignificantLocation.is_residence == residence_val)
    if city:
        query = query.filter(SignificantLocation.city.ilike(f"%{city}%"))
    if country:
        query = query.filter(SignificantLocation.country.ilike(f"%{country}%"))

    locations = query.order_by(
        SignificantLocation.first_visit.desc()
    ).offset(offset).limit(limit).all()

    # Add computed fields
    results = []
    for loc in locations:
        data = loc.to_dict()
        data["is_current_residence"] = loc.is_current_residence
        data["location_string"] = loc.location_string
        data["is_residence"] = loc.is_residence == "true"
        results.append(data)

    return results


@router.post("/significant", response_model=SignificantLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_significant_location(
    location_data: SignificantLocationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new significant location

    Manually add a significant location (e.g., past residence, workplace).
    """
    location = SignificantLocation(
        name=location_data.name,
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        address=location_data.address,
        city=location_data.city,
        state_province=location_data.state_province,
        country=location_data.country,
        location_type=location_data.location_type,
        first_visit=location_data.first_visit,
        last_visit=location_data.last_visit,
        is_residence="true" if location_data.is_residence else "false",
        residence_start=location_data.residence_start,
        residence_end=location_data.residence_end,
        notes=location_data.notes,
    )

    db.add(location)
    db.commit()
    db.refresh(location)

    return location


@router.get("/significant/{location_id}", response_model=SignificantLocationResponse)
async def get_significant_location(
    location_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific significant location"""
    location = db.query(SignificantLocation).filter(
        SignificantLocation.id == str(location_id)
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Significant location not found"
        )

    return location


@router.put("/significant/{location_id}", response_model=SignificantLocationResponse)
async def update_significant_location(
    location_id: UUID,
    update_data: SignificantLocationUpdate,
    db: Session = Depends(get_db)
):
    """Update a significant location"""
    location = db.query(SignificantLocation).filter(
        SignificantLocation.id == str(location_id)
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Significant location not found"
        )

    # Handle is_residence boolean to string conversion
    update_dict = update_data.dict(exclude_unset=True)
    if "is_residence" in update_dict:
        update_dict["is_residence"] = "true" if update_dict["is_residence"] else "false"

    location.update_from_dict(update_dict)
    db.commit()
    db.refresh(location)

    return location


@router.delete("/significant/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_significant_location(
    location_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a significant location"""
    location = db.query(SignificantLocation).filter(
        SignificantLocation.id == str(location_id)
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Significant location not found"
        )

    db.delete(location)
    db.commit()


# =============================================================================
# Timeline & Query Endpoints
# =============================================================================

@router.get("/timeline")
async def get_location_timeline(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    group_by: str = Query("day", description="Grouping: day, week, month"),
    db: Session = Depends(get_db)
):
    """
    Get location timeline for date range

    Returns location data grouped by day/week/month for timeline visualization.
    """
    query = db.query(LocationRecord).filter(
        LocationRecord.timestamp >= date_from,
        LocationRecord.timestamp <= date_to + "T23:59:59Z"
    ).order_by(LocationRecord.timestamp)

    records = query.all()

    # Group by date
    timeline = {}
    for record in records:
        date_key = record.date_only

        if group_by == "week":
            # Get week start (Monday)
            from datetime import datetime
            dt = datetime.fromisoformat(record.timestamp.replace("Z", "+00:00"))
            week_start = dt - timedelta(days=dt.weekday())
            date_key = week_start.strftime("%Y-%m-%d")
        elif group_by == "month":
            date_key = record.timestamp[:7]  # YYYY-MM

        if date_key not in timeline:
            timeline[date_key] = {
                "date": date_key,
                "locations": [],
                "unique_places": set(),
                "total_duration_minutes": 0
            }

        timeline[date_key]["locations"].append(record.to_dict())
        if record.place_name:
            timeline[date_key]["unique_places"].add(record.place_name)
        if record.duration_minutes:
            timeline[date_key]["total_duration_minutes"] += record.duration_minutes

    # Convert sets to lists for JSON serialization
    result = []
    for date_key in sorted(timeline.keys()):
        entry = timeline[date_key]
        entry["unique_places"] = list(entry["unique_places"])
        entry["location_count"] = len(entry["locations"])
        result.append(entry)

    return result


@router.get("/residences")
async def get_residence_history(db: Session = Depends(get_db)):
    """
    Get user's residence history

    Returns list of places where user lived, in chronological order.
    Useful for correlating with astrological events (Saturn returns, etc.)
    """
    residences = db.query(SignificantLocation).filter(
        SignificantLocation.is_residence == "true"
    ).order_by(SignificantLocation.residence_start).all()

    current_residence = None
    past_residences = []

    for residence in residences:
        data = residence.to_dict()
        data["is_current_residence"] = residence.is_current_residence
        data["location_string"] = residence.location_string
        data["is_residence"] = True

        if residence.is_current_residence:
            current_residence = data
        else:
            past_residences.append(data)

    return {
        "residences": past_residences,
        "current_residence": current_residence,
        "total_moves": len(residences) - 1 if residences else 0
    }


@router.get("/date/{date}")
async def get_locations_for_date(
    date: str,
    db: Session = Depends(get_db)
):
    """
    Get all location data for a specific date

    Useful for correlating with specific astrological events.
    """
    records = db.query(LocationRecord).filter(
        LocationRecord.timestamp >= date,
        LocationRecord.timestamp < date + "T23:59:59Z"
    ).order_by(LocationRecord.timestamp).all()

    return {
        "date": date,
        "locations": [r.to_dict() for r in records],
        "location_count": len(records),
        "unique_places": list(set(r.place_name for r in records if r.place_name))
    }
