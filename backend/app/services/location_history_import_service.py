"""
Location History Import Service

Handles importing location data from various sources:
- Google Takeout (Timeline/Location History JSON)
- Apple Location Services (export format)
- GPX files (fitness apps, GPS trackers)

Designed to handle large datasets efficiently with:
- Streaming JSON parsing for large files
- Batch database inserts
- Deduplication based on source_id
- Progress tracking for UI updates
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Generator, Tuple
from dataclasses import dataclass
import hashlib

from sqlalchemy.orm import Session

from app.models import LocationImport, LocationRecord
from app.core.datetime_helpers import now_iso

logger = logging.getLogger(__name__)


@dataclass
class ParsedLocation:
    """Normalized location data from any source"""
    timestamp: str  # ISO 8601
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = None
    altitude_meters: Optional[float] = None
    place_name: Optional[str] = None
    place_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    source_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ImportProgress:
    """Progress tracking during import"""
    status: str
    progress_percent: float
    records_processed: int
    records_total: Optional[int]
    current_date: Optional[str]
    message: str


class LocationHistoryImportService:
    """
    Service for importing location history from various sources

    Supports:
    - Google Takeout JSON (Records.json, Location History.json)
    - Apple Location Services export
    - GPX files

    Usage:
        service = LocationHistoryImportService(db_session)
        result = service.import_google_takeout(file_content)
    """

    BATCH_SIZE = 1000  # Records to insert per batch
    SUPPORTED_SOURCES = ["google_takeout", "apple", "gpx", "manual"]

    def __init__(self, db: Session):
        self.db = db
        self._progress_callback = None

    def set_progress_callback(self, callback):
        """Set callback for progress updates"""
        self._progress_callback = callback

    def _report_progress(self, progress: ImportProgress):
        """Report progress to callback if set"""
        if self._progress_callback:
            self._progress_callback(progress)

    # =========================================================================
    # Google Takeout Import
    # =========================================================================

    def import_google_takeout(
        self,
        file_content: str,
        file_name: str = "Records.json",
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[LocationImport, List[str]]:
        """
        Import location history from Google Takeout JSON

        Google Takeout exports location data in JSON format with:
        - locations array (older format)
        - timelineObjects array (newer Semantic Location History)

        Args:
            file_content: JSON file content as string
            file_name: Original file name
            options: Import options (date_from, date_to filters)

        Returns:
            Tuple of (LocationImport record, list of warning messages)

        Raises:
            ValueError: If JSON is invalid or unrecognized format
        """
        options = options or {}
        warnings = []

        # Create import record
        import_record = LocationImport(
            source="google_takeout",
            source_file_name=file_name,
            import_status="processing"
        )
        self.db.add(import_record)
        self.db.commit()

        try:
            # Parse JSON
            data = json.loads(file_content)

            # Detect format and extract locations
            locations = self._extract_google_locations(data)
            total_records = len(locations)

            import_record.total_records = total_records
            self.db.commit()

            self._report_progress(ImportProgress(
                status="processing",
                progress_percent=5.0,
                records_processed=0,
                records_total=total_records,
                current_date=None,
                message=f"Found {total_records} location records"
            ))

            # Parse and filter locations
            parsed_locations = []
            date_from = options.get("date_from")
            date_to = options.get("date_to")

            for i, loc in enumerate(locations):
                try:
                    parsed = self._parse_google_location(loc)
                    if parsed:
                        # Apply date filters
                        if date_from and parsed.timestamp < date_from:
                            continue
                        if date_to and parsed.timestamp > date_to:
                            continue
                        parsed_locations.append(parsed)
                except Exception as e:
                    warnings.append(f"Skipped record {i}: {str(e)}")
                    continue

                # Report progress periodically
                if i % 1000 == 0:
                    self._report_progress(ImportProgress(
                        status="processing",
                        progress_percent=5 + (i / total_records) * 45,
                        records_processed=i,
                        records_total=total_records,
                        current_date=parsed.timestamp[:10] if parsed else None,
                        message=f"Parsing records... {i}/{total_records}"
                    ))

            # Insert in batches
            imported_count = self._batch_insert_locations(
                import_record.id,
                parsed_locations
            )

            # Update import record with results
            import_record.import_status = "completed"
            import_record.imported_records = imported_count
            import_record.skipped_records = total_records - imported_count

            if parsed_locations:
                # Sort by timestamp to get date range
                sorted_locs = sorted(parsed_locations, key=lambda x: x.timestamp)
                import_record.date_range_start = sorted_locs[0].timestamp[:10]
                import_record.date_range_end = sorted_locs[-1].timestamp[:10]

            self.db.commit()

            self._report_progress(ImportProgress(
                status="completed",
                progress_percent=100.0,
                records_processed=imported_count,
                records_total=total_records,
                current_date=None,
                message=f"Import complete: {imported_count} records"
            ))

            return import_record, warnings

        except json.JSONDecodeError as e:
            import_record.import_status = "failed"
            import_record.error_message = f"Invalid JSON: {str(e)}"
            self.db.commit()
            raise ValueError(f"Invalid JSON format: {str(e)}")

        except Exception as e:
            import_record.import_status = "failed"
            import_record.error_message = str(e)
            self.db.commit()
            logger.exception("Google Takeout import failed")
            raise

    def _extract_google_locations(self, data: Dict) -> List[Dict]:
        """
        Extract location array from Google Takeout JSON

        Handles multiple formats:
        - {"locations": [...]} (older format)
        - {"timelineObjects": [...]} (Semantic Location History)
        - Direct array [...] (some exports)
        """
        if isinstance(data, list):
            return data

        if "locations" in data:
            return data["locations"]

        if "timelineObjects" in data:
            # Extract from Semantic Location History format
            locations = []
            for obj in data["timelineObjects"]:
                if "placeVisit" in obj:
                    locations.append(obj["placeVisit"])
                elif "activitySegment" in obj:
                    # Activity segments have start/end points
                    segment = obj["activitySegment"]
                    if "startLocation" in segment:
                        locations.append({
                            "location": segment["startLocation"],
                            "duration": segment.get("duration", {}),
                            "activityType": segment.get("activityType")
                        })
            return locations

        raise ValueError(
            "Unrecognized Google Takeout format. "
            "Expected 'locations' or 'timelineObjects' array."
        )

    def _parse_google_location(self, loc: Dict) -> Optional[ParsedLocation]:
        """
        Parse a single Google location record into normalized format

        Handles both old format (latitudeE7) and newer formats.
        """
        # Handle placeVisit format (Semantic Location History)
        if "location" in loc:
            inner_loc = loc["location"]
            duration = loc.get("duration", {})

            lat = inner_loc.get("latitudeE7", 0) / 1e7
            lon = inner_loc.get("longitudeE7", 0) / 1e7

            # Get timestamp
            if "startTimestamp" in duration:
                timestamp = duration["startTimestamp"]
            elif "startTimestampMs" in duration:
                timestamp = self._ms_to_iso(int(duration["startTimestampMs"]))
            else:
                return None

            # Calculate duration if we have end time
            duration_minutes = None
            if "endTimestamp" in duration and "startTimestamp" in duration:
                try:
                    start = datetime.fromisoformat(duration["startTimestamp"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(duration["endTimestamp"].replace("Z", "+00:00"))
                    duration_minutes = int((end - start).total_seconds() / 60)
                except Exception:
                    pass

            place_name = inner_loc.get("name") or inner_loc.get("address")

            return ParsedLocation(
                timestamp=timestamp,
                latitude=lat,
                longitude=lon,
                place_name=place_name,
                place_type=loc.get("placeConfidence"),
                duration_minutes=duration_minutes,
                source_id=inner_loc.get("placeId"),
                metadata={
                    "semantic_type": inner_loc.get("semanticType"),
                    "place_id": inner_loc.get("placeId"),
                    "confidence": loc.get("placeConfidence")
                }
            )

        # Handle classic locations format
        lat = lon = None

        # Try latitudeE7/longitudeE7 (integers * 10^7)
        if "latitudeE7" in loc:
            lat = loc["latitudeE7"] / 1e7
            lon = loc["longitudeE7"] / 1e7
        # Try direct lat/long
        elif "latitude" in loc:
            lat = loc["latitude"]
            lon = loc["longitude"]

        if lat is None or lon is None:
            return None

        # Validate coordinates
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return None

        # Get timestamp
        timestamp = None
        if "timestamp" in loc:
            timestamp = loc["timestamp"]
        elif "timestampMs" in loc:
            timestamp = self._ms_to_iso(int(loc["timestampMs"]))

        if not timestamp:
            return None

        # Generate source_id for deduplication
        source_id = self._generate_source_id("google", timestamp, lat, lon)

        return ParsedLocation(
            timestamp=timestamp,
            latitude=lat,
            longitude=lon,
            accuracy_meters=loc.get("accuracy"),
            altitude_meters=loc.get("altitude"),
            source_id=source_id,
            metadata={
                "activity": loc.get("activity"),
                "heading": loc.get("heading"),
                "velocity": loc.get("velocity"),
                "source": loc.get("source")
            }
        )

    # =========================================================================
    # Apple Location History Import
    # =========================================================================

    def import_apple_location_history(
        self,
        file_content: str,
        file_name: str = "Location History.json",
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[LocationImport, List[str]]:
        """
        Import location history from Apple Location Services export

        Apple exports location data in a similar JSON format but with
        different field names.

        Args:
            file_content: JSON file content as string
            file_name: Original file name
            options: Import options

        Returns:
            Tuple of (LocationImport record, list of warning messages)
        """
        options = options or {}
        warnings = []

        # Create import record
        import_record = LocationImport(
            source="apple",
            source_file_name=file_name,
            import_status="processing"
        )
        self.db.add(import_record)
        self.db.commit()

        try:
            data = json.loads(file_content)

            # Apple format typically has locations in a "locations" array
            locations = data.get("locations", data if isinstance(data, list) else [])
            total_records = len(locations)

            import_record.total_records = total_records
            self.db.commit()

            parsed_locations = []
            for i, loc in enumerate(locations):
                try:
                    parsed = self._parse_apple_location(loc)
                    if parsed:
                        parsed_locations.append(parsed)
                except Exception as e:
                    warnings.append(f"Skipped record {i}: {str(e)}")

            # Insert in batches
            imported_count = self._batch_insert_locations(
                import_record.id,
                parsed_locations
            )

            # Update import record
            import_record.import_status = "completed"
            import_record.imported_records = imported_count
            import_record.skipped_records = total_records - imported_count

            if parsed_locations:
                sorted_locs = sorted(parsed_locations, key=lambda x: x.timestamp)
                import_record.date_range_start = sorted_locs[0].timestamp[:10]
                import_record.date_range_end = sorted_locs[-1].timestamp[:10]

            self.db.commit()
            return import_record, warnings

        except Exception as e:
            import_record.import_status = "failed"
            import_record.error_message = str(e)
            self.db.commit()
            raise

    def _parse_apple_location(self, loc: Dict) -> Optional[ParsedLocation]:
        """Parse Apple location format"""
        lat = loc.get("latitude")
        lon = loc.get("longitude")

        if lat is None or lon is None:
            return None

        # Get timestamp
        timestamp = loc.get("timestamp") or loc.get("date")
        if not timestamp:
            return None

        source_id = self._generate_source_id("apple", timestamp, lat, lon)

        return ParsedLocation(
            timestamp=timestamp,
            latitude=lat,
            longitude=lon,
            accuracy_meters=loc.get("horizontalAccuracy"),
            altitude_meters=loc.get("altitude"),
            source_id=source_id,
            metadata={
                "vertical_accuracy": loc.get("verticalAccuracy"),
                "speed": loc.get("speed"),
                "course": loc.get("course")
            }
        )

    # =========================================================================
    # GPX Import
    # =========================================================================

    def import_gpx(
        self,
        file_content: str,
        file_name: str = "track.gpx",
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[LocationImport, List[str]]:
        """
        Import location history from GPX file

        GPX is a standard format used by many GPS devices and fitness apps.
        Supports both track points (trkpt) and waypoints (wpt).

        Args:
            file_content: GPX XML content as string
            file_name: Original file name
            options: Import options

        Returns:
            Tuple of (LocationImport record, list of warning messages)
        """
        import xml.etree.ElementTree as ET

        options = options or {}
        warnings = []

        # Create import record
        import_record = LocationImport(
            source="gpx",
            source_file_name=file_name,
            import_status="processing"
        )
        self.db.add(import_record)
        self.db.commit()

        try:
            root = ET.fromstring(file_content)

            # Handle GPX namespace
            ns = {"gpx": "http://www.topografix.com/GPX/1/1"}

            parsed_locations = []

            # Extract track points
            for trkpt in root.findall(".//gpx:trkpt", ns) or root.findall(".//trkpt"):
                try:
                    parsed = self._parse_gpx_point(trkpt, ns)
                    if parsed:
                        parsed_locations.append(parsed)
                except Exception as e:
                    warnings.append(f"Skipped track point: {str(e)}")

            # Extract waypoints
            for wpt in root.findall(".//gpx:wpt", ns) or root.findall(".//wpt"):
                try:
                    parsed = self._parse_gpx_point(wpt, ns, is_waypoint=True)
                    if parsed:
                        parsed_locations.append(parsed)
                except Exception as e:
                    warnings.append(f"Skipped waypoint: {str(e)}")

            total_records = len(parsed_locations)
            import_record.total_records = total_records

            # Insert in batches
            imported_count = self._batch_insert_locations(
                import_record.id,
                parsed_locations
            )

            # Update import record
            import_record.import_status = "completed"
            import_record.imported_records = imported_count
            import_record.skipped_records = total_records - imported_count

            if parsed_locations:
                sorted_locs = sorted(parsed_locations, key=lambda x: x.timestamp)
                import_record.date_range_start = sorted_locs[0].timestamp[:10]
                import_record.date_range_end = sorted_locs[-1].timestamp[:10]

            self.db.commit()
            return import_record, warnings

        except ET.ParseError as e:
            import_record.import_status = "failed"
            import_record.error_message = f"Invalid GPX XML: {str(e)}"
            self.db.commit()
            raise ValueError(f"Invalid GPX format: {str(e)}")

        except Exception as e:
            import_record.import_status = "failed"
            import_record.error_message = str(e)
            self.db.commit()
            raise

    def _parse_gpx_point(
        self,
        point,
        ns: Dict,
        is_waypoint: bool = False
    ) -> Optional[ParsedLocation]:
        """Parse a GPX track point or waypoint"""
        lat = point.get("lat")
        lon = point.get("lon")

        if lat is None or lon is None:
            return None

        lat = float(lat)
        lon = float(lon)

        # Get timestamp
        time_elem = point.find("gpx:time", ns) or point.find("time")
        if time_elem is not None:
            timestamp = time_elem.text
        else:
            timestamp = now_iso()

        # Get elevation
        ele_elem = point.find("gpx:ele", ns) or point.find("ele")
        altitude = float(ele_elem.text) if ele_elem is not None else None

        # Get name for waypoints
        name_elem = point.find("gpx:name", ns) or point.find("name")
        place_name = name_elem.text if name_elem is not None else None

        source_id = self._generate_source_id("gpx", timestamp, lat, lon)

        return ParsedLocation(
            timestamp=timestamp,
            latitude=lat,
            longitude=lon,
            altitude_meters=altitude,
            place_name=place_name,
            place_type="waypoint" if is_waypoint else None,
            source_id=source_id
        )

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _batch_insert_locations(
        self,
        import_id: str,
        locations: List[ParsedLocation]
    ) -> int:
        """
        Insert locations in batches for efficiency

        Returns count of successfully inserted records.
        Handles deduplication via source_id.
        """
        inserted = 0
        batch = []

        for i, loc in enumerate(locations):
            # Check for duplicates by source_id
            if loc.source_id:
                existing = self.db.query(LocationRecord).filter(
                    LocationRecord.source_id == loc.source_id
                ).first()
                if existing:
                    continue

            record = LocationRecord(
                import_id=import_id,
                timestamp=loc.timestamp,
                latitude=loc.latitude,
                longitude=loc.longitude,
                accuracy_meters=loc.accuracy_meters,
                altitude_meters=loc.altitude_meters,
                place_name=loc.place_name,
                place_type=loc.place_type,
                duration_minutes=loc.duration_minutes,
                source_id=loc.source_id,
                metadata=loc.metadata
            )
            batch.append(record)
            inserted += 1

            # Commit in batches
            if len(batch) >= self.BATCH_SIZE:
                self.db.bulk_save_objects(batch)
                self.db.commit()
                batch = []

                self._report_progress(ImportProgress(
                    status="processing",
                    progress_percent=50 + (i / len(locations)) * 45,
                    records_processed=inserted,
                    records_total=len(locations),
                    current_date=loc.timestamp[:10],
                    message=f"Inserting records... {inserted}/{len(locations)}"
                ))

        # Insert remaining
        if batch:
            self.db.bulk_save_objects(batch)
            self.db.commit()

        return inserted

    def _ms_to_iso(self, timestamp_ms: int) -> str:
        """Convert milliseconds since epoch to ISO 8601 string"""
        dt = datetime.utcfromtimestamp(timestamp_ms / 1000)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    def _generate_source_id(
        self,
        source: str,
        timestamp: str,
        lat: float,
        lon: float
    ) -> str:
        """
        Generate a unique source ID for deduplication

        Combines source, timestamp, and coordinates into a hash.
        """
        key = f"{source}:{timestamp}:{lat:.6f}:{lon:.6f}"
        return hashlib.md5(key.encode()).hexdigest()[:16]

    # =========================================================================
    # Import Management
    # =========================================================================

    def get_import(self, import_id: str) -> Optional[LocationImport]:
        """Get an import record by ID"""
        return self.db.query(LocationImport).filter(
            LocationImport.id == import_id
        ).first()

    def list_imports(
        self,
        source: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[LocationImport]:
        """List import records with optional filters"""
        query = self.db.query(LocationImport)

        if source:
            query = query.filter(LocationImport.source == source)
        if status:
            query = query.filter(LocationImport.import_status == status)

        return query.order_by(
            LocationImport.created_at.desc()
        ).offset(offset).limit(limit).all()

    def delete_import(self, import_id: str) -> bool:
        """
        Delete an import and all its records

        Returns True if deleted, False if not found.
        """
        import_record = self.get_import(import_id)
        if not import_record:
            return False

        self.db.delete(import_record)
        self.db.commit()
        return True

    def get_import_stats(self) -> Dict[str, Any]:
        """Get statistics about all imports"""
        from sqlalchemy import func

        total_imports = self.db.query(func.count(LocationImport.id)).scalar() or 0
        total_records = self.db.query(func.count(LocationRecord.id)).scalar() or 0

        # Get date range
        min_date = self.db.query(func.min(LocationRecord.timestamp)).scalar()
        max_date = self.db.query(func.max(LocationRecord.timestamp)).scalar()

        # Count by source
        source_counts = {}
        for row in self.db.query(
            LocationImport.source,
            func.sum(LocationImport.imported_records)
        ).group_by(LocationImport.source).all():
            source_counts[row[0]] = row[1] or 0

        return {
            "total_imports": total_imports,
            "total_records": total_records,
            "date_range_start": min_date[:10] if min_date else None,
            "date_range_end": max_date[:10] if max_date else None,
            "sources": source_counts
        }


def get_location_import_service(db: Session) -> LocationHistoryImportService:
    """Factory function for LocationHistoryImportService"""
    return LocationHistoryImportService(db)
