"""
Tests for Location History Import Service

Tests the parsing and import of location data from various sources.
"""
import json
import pytest
from datetime import datetime

from app.services.location_history_import_service import (
    LocationHistoryImportService,
    ParsedLocation,
)
from app.models import LocationImport, LocationRecord


class TestGoogleTakeoutParsing:
    """Tests for Google Takeout JSON parsing"""

    def test_parse_classic_location_format(self, db_session):
        """Test parsing classic Google location format with latitudeE7/longitudeE7"""
        service = LocationHistoryImportService(db_session)

        # Classic format (pre-2022)
        data = {
            "locations": [
                {
                    "latitudeE7": 377490000,
                    "longitudeE7": -1224194000,
                    "accuracy": 20,
                    "timestampMs": "1609459200000"  # 2021-01-01 00:00:00 UTC
                },
                {
                    "latitudeE7": 408851000,
                    "longitudeE7": -740060000,
                    "accuracy": 15,
                    "timestampMs": "1609545600000"  # 2021-01-02 00:00:00 UTC
                }
            ]
        }

        file_content = json.dumps(data)
        import_record, warnings = service.import_google_takeout(file_content)

        assert import_record.import_status == "completed"
        assert import_record.imported_records == 2
        assert import_record.source == "google_takeout"

        # Check records were created
        records = db_session.query(LocationRecord).filter(
            LocationRecord.import_id == import_record.id
        ).all()

        assert len(records) == 2

        # Verify coordinates were converted correctly
        coords = [(r.latitude, r.longitude) for r in records]
        assert any(abs(lat - 37.749) < 0.001 and abs(lon - (-122.4194)) < 0.001
                   for lat, lon in coords)

    def test_parse_semantic_location_history(self, db_session):
        """Test parsing Semantic Location History format (post-2022)"""
        service = LocationHistoryImportService(db_session)

        data = {
            "timelineObjects": [
                {
                    "placeVisit": {
                        "location": {
                            "latitudeE7": 377490000,
                            "longitudeE7": -1224194000,
                            "name": "Golden Gate Park",
                            "address": "San Francisco, CA",
                            "placeId": "ChIJ_y8T9ewAhYAR5V9j_w1X6Ks"
                        },
                        "duration": {
                            "startTimestamp": "2024-01-01T10:00:00Z",
                            "endTimestamp": "2024-01-01T12:00:00Z"
                        },
                        "placeConfidence": "HIGH"
                    }
                }
            ]
        }

        file_content = json.dumps(data)
        import_record, warnings = service.import_google_takeout(file_content)

        assert import_record.import_status == "completed"
        assert import_record.imported_records == 1

        records = db_session.query(LocationRecord).filter(
            LocationRecord.import_id == import_record.id
        ).all()

        assert len(records) == 1
        record = records[0]

        assert record.place_name == "Golden Gate Park"
        assert record.duration_minutes == 120  # 2 hours
        assert "2024-01-01" in record.timestamp

    def test_parse_invalid_json(self, db_session):
        """Test handling of invalid JSON"""
        service = LocationHistoryImportService(db_session)

        with pytest.raises(ValueError, match="Invalid JSON"):
            service.import_google_takeout("not valid json {{{")

    def test_parse_unrecognized_format(self, db_session):
        """Test handling of unrecognized JSON structure"""
        service = LocationHistoryImportService(db_session)

        data = {"somethingElse": [1, 2, 3]}
        file_content = json.dumps(data)

        with pytest.raises(ValueError, match="Unrecognized"):
            service.import_google_takeout(file_content)

    def test_date_filtering(self, db_session):
        """Test date range filtering during import"""
        service = LocationHistoryImportService(db_session)

        data = {
            "locations": [
                {
                    "latitudeE7": 377490000,
                    "longitudeE7": -1224194000,
                    "timestamp": "2024-01-01T12:00:00Z"
                },
                {
                    "latitudeE7": 377490000,
                    "longitudeE7": -1224194000,
                    "timestamp": "2024-06-01T12:00:00Z"
                },
                {
                    "latitudeE7": 377490000,
                    "longitudeE7": -1224194000,
                    "timestamp": "2024-12-01T12:00:00Z"
                }
            ]
        }

        file_content = json.dumps(data)

        # Import with date filter
        import_record, warnings = service.import_google_takeout(
            file_content,
            options={
                "date_from": "2024-03-01",
                "date_to": "2024-09-01"
            }
        )

        assert import_record.imported_records == 1
        assert import_record.date_range_start == "2024-06-01"

    def test_deduplication(self, db_session):
        """Test that duplicate records are skipped"""
        service = LocationHistoryImportService(db_session)

        data = {
            "locations": [
                {
                    "latitudeE7": 377490000,
                    "longitudeE7": -1224194000,
                    "timestamp": "2024-01-01T12:00:00Z"
                }
            ]
        }

        file_content = json.dumps(data)

        # First import
        import1, _ = service.import_google_takeout(file_content, file_name="first.json")
        assert import1.imported_records == 1

        # Second import of same data
        import2, _ = service.import_google_takeout(file_content, file_name="second.json")
        assert import2.imported_records == 0
        assert import2.skipped_records == 1


class TestGPXParsing:
    """Tests for GPX file parsing"""

    def test_parse_gpx_track(self, db_session):
        """Test parsing GPX track points"""
        service = LocationHistoryImportService(db_session)

        gpx_content = """<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
            <trk>
                <name>Morning Run</name>
                <trkseg>
                    <trkpt lat="37.7749" lon="-122.4194">
                        <ele>10.5</ele>
                        <time>2024-01-01T08:00:00Z</time>
                    </trkpt>
                    <trkpt lat="37.7750" lon="-122.4195">
                        <ele>11.2</ele>
                        <time>2024-01-01T08:05:00Z</time>
                    </trkpt>
                </trkseg>
            </trk>
        </gpx>"""

        import_record, warnings = service.import_gpx(gpx_content)

        assert import_record.import_status == "completed"
        assert import_record.imported_records == 2
        assert import_record.source == "gpx"

        records = db_session.query(LocationRecord).filter(
            LocationRecord.import_id == import_record.id
        ).all()

        assert len(records) == 2
        assert all(r.altitude_meters is not None for r in records)

    def test_parse_gpx_waypoints(self, db_session):
        """Test parsing GPX waypoints"""
        service = LocationHistoryImportService(db_session)

        gpx_content = """<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
            <wpt lat="37.7749" lon="-122.4194">
                <name>Home</name>
                <time>2024-01-01T12:00:00Z</time>
            </wpt>
        </gpx>"""

        import_record, warnings = service.import_gpx(gpx_content)

        assert import_record.imported_records == 1

        record = db_session.query(LocationRecord).filter(
            LocationRecord.import_id == import_record.id
        ).first()

        assert record.place_name == "Home"
        assert record.place_type == "waypoint"

    def test_parse_invalid_gpx(self, db_session):
        """Test handling of invalid GPX XML"""
        service = LocationHistoryImportService(db_session)

        with pytest.raises(ValueError, match="Invalid GPX"):
            service.import_gpx("<not valid xml")


class TestImportManagement:
    """Tests for import management operations"""

    def test_list_imports(self, db_session):
        """Test listing imports"""
        service = LocationHistoryImportService(db_session)

        # Create some imports
        data = {"locations": [{"latitudeE7": 377490000, "longitudeE7": -1224194000, "timestamp": "2024-01-01T12:00:00Z"}]}

        service.import_google_takeout(json.dumps(data), file_name="test1.json")
        service.import_google_takeout(json.dumps(data), file_name="test2.json")

        imports = service.list_imports()
        assert len(imports) >= 2

    def test_delete_import(self, db_session):
        """Test deleting an import removes all its records"""
        service = LocationHistoryImportService(db_session)

        data = {
            "locations": [
                {"latitudeE7": 377490000, "longitudeE7": -1224194000, "timestamp": "2024-01-01T12:00:00Z"},
                {"latitudeE7": 377490000, "longitudeE7": -1224194000, "timestamp": "2024-01-02T12:00:00Z"},
            ]
        }

        import_record, _ = service.import_google_takeout(json.dumps(data))
        import_id = import_record.id

        # Verify records exist
        records = db_session.query(LocationRecord).filter(
            LocationRecord.import_id == import_id
        ).count()
        assert records == 2

        # Delete import
        result = service.delete_import(import_id)
        assert result is True

        # Verify records are gone (cascade delete)
        records = db_session.query(LocationRecord).filter(
            LocationRecord.import_id == import_id
        ).count()
        assert records == 0

    def test_get_import_stats(self, db_session):
        """Test getting import statistics"""
        service = LocationHistoryImportService(db_session)

        data = {"locations": [{"latitudeE7": 377490000, "longitudeE7": -1224194000, "timestamp": "2024-01-01T12:00:00Z"}]}
        service.import_google_takeout(json.dumps(data))

        stats = service.get_import_stats()

        assert "total_imports" in stats
        assert "total_records" in stats
        assert "sources" in stats
        assert stats["total_imports"] >= 1
        assert stats["total_records"] >= 1


class TestParsedLocation:
    """Tests for the ParsedLocation dataclass"""

    def test_parsed_location_creation(self):
        """Test creating a ParsedLocation"""
        loc = ParsedLocation(
            timestamp="2024-01-01T12:00:00Z",
            latitude=37.7749,
            longitude=-122.4194,
            accuracy_meters=10.5,
            place_name="San Francisco"
        )

        assert loc.timestamp == "2024-01-01T12:00:00Z"
        assert loc.latitude == 37.7749
        assert loc.longitude == -122.4194
        assert loc.accuracy_meters == 10.5
        assert loc.place_name == "San Francisco"
        assert loc.altitude_meters is None
        assert loc.metadata is None


# Fixture for database session
@pytest.fixture
def db_session():
    """Create a test database session"""
    from app.core.database_sqlite import SessionLocal, init_db

    # Initialize test database
    init_db()

    session = SessionLocal()
    try:
        yield session
    finally:
        # Clean up test data
        session.query(LocationRecord).delete()
        session.query(LocationImport).delete()
        session.commit()
        session.close()
