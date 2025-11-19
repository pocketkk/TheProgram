"""
Additional edge case tests for migration system.

This module tests edge cases, boundary conditions, and stress scenarios.
"""
import json
import sqlite3
import time
from pathlib import Path
from typing import Dict, Any

import pytest

# Import test utilities
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "migration_scripts"))

from import_to_sqlite import SQLiteImporter
from test_data_generators import SyntheticDataGenerator


class TestSpecialCharacters:
    """Test handling of special characters in data."""

    def test_unicode_in_names(self, sqlite_conn, temp_migration_dir):
        """Test Unicode characters in client names."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        clients = [
            {
                "id": "test-id-1",
                "first_name": "José",
                "last_name": "García",
                "email": "jose@example.com",
                "phone": "+1-555-0101",
                "notes": "Client with Spanish characters",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            },
            {
                "id": "test-id-2",
                "first_name": "Müller",
                "last_name": "François",
                "email": "muller@example.com",
                "phone": "+1-555-0102",
                "notes": "Client with German and French characters",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            },
            {
                "id": "test-id-3",
                "first_name": "李",
                "last_name": "明",
                "email": "li@example.com",
                "phone": "+1-555-0103",
                "notes": "Client with Chinese characters",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            },
        ]

        # Save to file
        with open(temp_migration_dir / "clients.json", "w", encoding="utf-8") as f:
            json.dump(clients, f, ensure_ascii=False)

        importer.conn = sqlite_conn
        importer.import_clients(clients)

        # Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT first_name, last_name FROM clients ORDER BY id")
        result = cursor.fetchall()

        assert result[0][0] == "José"
        assert result[1][0] == "Müller"
        assert result[2][0] == "李"

    def test_sql_injection_in_text_fields(self, sqlite_conn, temp_migration_dir):
        """Test that SQL injection attempts are safely handled."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        clients = [
            {
                "id": "test-id-1",
                "first_name": "Robert'); DROP TABLE clients;--",
                "last_name": "Tables",
                "email": "bobby@example.com",
                "phone": "+1-555-0101",
                "notes": "'; DELETE FROM clients WHERE '1'='1",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            }
        ]

        importer.conn = sqlite_conn
        importer.import_clients(clients)

        # Verify table still exists and data is safe
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT first_name, notes FROM clients")
        result = cursor.fetchone()

        assert result[0] == "Robert'); DROP TABLE clients;--"
        assert result[1] == "'; DELETE FROM clients WHERE '1'='1"

        # Verify table wasn't dropped
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'")
        assert cursor.fetchone() is not None

    def test_empty_strings_vs_null(self, sqlite_conn, temp_migration_dir):
        """Test distinction between empty strings and NULL values."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        clients = [
            {
                "id": "test-id-1",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "phone": "",  # Empty string
                "notes": None,  # NULL
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            }
        ]

        importer.conn = sqlite_conn
        importer.import_clients(clients)

        # Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT phone, notes FROM clients")
        result = cursor.fetchone()

        assert result[0] == ""  # Empty string preserved
        assert result[1] is None  # NULL preserved

    def test_very_long_text_fields(self, sqlite_conn, temp_migration_dir):
        """Test handling of very long text in notes."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        long_text = "Lorem ipsum " * 1000  # ~12KB of text

        clients = [
            {
                "id": "test-id-1",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "phone": "+1-555-0101",
                "notes": long_text,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            }
        ]

        importer.conn = sqlite_conn
        importer.import_clients(clients)

        # Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT notes FROM clients")
        result = cursor.fetchone()

        assert result[0] == long_text
        assert len(result[0]) > 10000


class TestBoundaryValues:
    """Test boundary values for numeric and date fields."""

    def test_coordinate_boundaries(self, sqlite_conn, temp_migration_dir):
        """Test latitude/longitude at boundaries."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        # Insert client first
        clients = [{
            "id": "test-client-1",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1-555-0101",
            "notes": "Test",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]
        importer.conn = sqlite_conn
        importer.import_clients(clients)

        birth_data = [
            {
                "id": "test-id-1",
                "client_id": "test-client-1",
                "birth_date": "1990-01-01",
                "birth_time": "12:00:00",
                "time_unknown": False,
                "latitude": 90.0,  # North Pole
                "longitude": 180.0,  # Date line
                "timezone": "UTC",
                "utc_offset": 0,
                "city": "North Pole",
                "state_province": None,
                "country": "Arctic",
                "rodden_rating": "AA",
                "gender": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            },
            {
                "id": "test-id-2",
                "client_id": "test-client-1",
                "birth_date": "1990-01-01",
                "birth_time": "12:00:00",
                "time_unknown": False,
                "latitude": -90.0,  # South Pole
                "longitude": -180.0,  # Date line
                "timezone": "UTC",
                "utc_offset": 0,
                "city": "South Pole",
                "state_province": None,
                "country": "Antarctica",
                "rodden_rating": "AA",
                "gender": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            },
        ]

        importer.import_birth_data(birth_data)

        # Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT latitude, longitude FROM birth_data ORDER BY id")
        results = cursor.fetchall()

        assert results[0] == (90.0, 180.0)
        assert results[1] == (-90.0, -180.0)

    def test_extreme_dates(self, sqlite_conn, temp_migration_dir):
        """Test very old and very new dates."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        # Insert client first
        clients = [{
            "id": "test-client-1",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1-555-0101",
            "notes": "Test",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]
        importer.conn = sqlite_conn
        importer.import_clients(clients)

        birth_data = [
            {
                "id": "test-id-1",
                "client_id": "test-client-1",
                "birth_date": "1800-01-01",  # Very old
                "birth_time": "00:00:00",
                "time_unknown": False,
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timezone": "America/New_York",
                "utc_offset": -300,
                "city": "New York",
                "state_province": "NY",
                "country": "USA",
                "rodden_rating": "C",
                "gender": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            },
            {
                "id": "test-id-2",
                "client_id": "test-client-1",
                "birth_date": "2099-12-31",  # Far future
                "birth_time": "23:59:59",
                "time_unknown": False,
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timezone": "America/New_York",
                "utc_offset": -300,
                "city": "New York",
                "state_province": "NY",
                "country": "USA",
                "rodden_rating": "X",
                "gender": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00",
            },
        ]

        importer.import_birth_data(birth_data)

        # Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT birth_date, birth_time FROM birth_data ORDER BY id")
        results = cursor.fetchall()

        assert results[0] == ("1800-01-01", "00:00:00")
        assert results[1] == ("2099-12-31", "23:59:59")


class TestPerformance:
    """Performance and scalability tests."""

    def test_import_100_clients_performance(self, sqlite_conn, temp_migration_dir):
        """Test importing 100 clients with reasonable performance."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        gen = SyntheticDataGenerator(seed=42)
        clients = gen.generate_clients(100)

        importer.conn = sqlite_conn

        start_time = time.time()
        importer.import_clients(clients)
        duration = time.time() - start_time

        # Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients")
        count = cursor.fetchone()[0]

        assert count == 100
        assert duration < 5.0  # Should complete in under 5 seconds

    def test_import_large_complete_dataset(self, sqlite_conn, temp_migration_dir):
        """Test importing a large complete dataset."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        gen = SyntheticDataGenerator(seed=123)
        dataset = gen.generate_complete_dataset(
            num_clients=50,
            charts_per_client=3,
            interpretations=10,
            session_notes_per_client=2
        )

        importer.conn = sqlite_conn

        start_time = time.time()

        # Import all data
        importer.import_user_data(dataset["user_data"])
        importer.import_clients(dataset["clients"])
        importer.import_birth_data(dataset["birth_data"])
        importer.import_charts(dataset["charts"])
        importer.import_interpretations(dataset["interpretations"])
        importer.import_chart_interpretations(dataset["chart_interpretations"])
        importer.import_aspect_patterns(dataset["aspect_patterns"])
        importer.import_transit_events(dataset["transit_events"])
        importer.import_session_notes(dataset["session_notes"])
        importer.import_location_cache(dataset["location_cache"])

        duration = time.time() - start_time

        # Verify counts
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients")
        assert cursor.fetchone()[0] == 50

        cursor.execute("SELECT COUNT(*) FROM charts")
        assert cursor.fetchone()[0] >= 50

        # Should complete in reasonable time
        assert duration < 10.0  # Should complete in under 10 seconds

    def test_query_performance_with_indexes(self, populated_sqlite_conn):
        """Test that queries perform well with indexes."""
        cursor = populated_sqlite_conn.cursor()

        # Test indexed query on client_id
        start_time = time.time()
        for _ in range(100):
            cursor.execute("SELECT * FROM birth_data WHERE client_id = ?", ("c1111111-1111-1111-1111-111111111111",))
            cursor.fetchall()
        duration = time.time() - start_time

        # With index, 100 queries should be very fast
        assert duration < 0.5  # Should complete in under 0.5 seconds


class TestConcurrency:
    """Test concurrent access scenarios."""

    def test_multiple_readers(self, populated_sqlite_conn):
        """Test that multiple readers can access database simultaneously."""
        cursor1 = populated_sqlite_conn.cursor()
        cursor2 = populated_sqlite_conn.cursor()

        # Both cursors should be able to read
        cursor1.execute("SELECT COUNT(*) FROM clients")
        count1 = cursor1.fetchone()[0]

        cursor2.execute("SELECT COUNT(*) FROM birth_data")
        count2 = cursor2.fetchone()[0]

        assert count1 >= 0
        assert count2 >= 0

    def test_transaction_isolation(self, sqlite_conn):
        """Test that transactions are properly isolated."""
        # Insert a client in a transaction but don't commit
        cursor = sqlite_conn.cursor()
        cursor.execute("""
            INSERT INTO clients (id, first_name, last_name, email, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("test-id", "John", "Doe", "john@example.com", "2024-01-01T00:00:00", "2024-01-01T00:00:00"))

        # Don't commit, verify it's in the current transaction
        cursor.execute("SELECT COUNT(*) FROM clients WHERE id = ?", ("test-id",))
        assert cursor.fetchone()[0] == 1

        # Rollback
        sqlite_conn.rollback()

        # Verify it's gone
        cursor.execute("SELECT COUNT(*) FROM clients WHERE id = ?", ("test-id",))
        assert cursor.fetchone()[0] == 0


class TestDataIntegrity:
    """Test data integrity constraints."""

    def test_duplicate_id_rejected(self, sqlite_conn):
        """Test that duplicate IDs are rejected."""
        cursor = sqlite_conn.cursor()

        # Insert first client
        cursor.execute("""
            INSERT INTO clients (id, first_name, last_name, email, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("test-id", "John", "Doe", "john@example.com", "2024-01-01T00:00:00", "2024-01-01T00:00:00"))
        sqlite_conn.commit()

        # Try to insert duplicate ID
        with pytest.raises(sqlite3.IntegrityError, match="UNIQUE constraint failed"):
            cursor.execute("""
                INSERT INTO clients (id, first_name, last_name, email, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, ("test-id", "Jane", "Smith", "jane@example.com", "2024-01-01T00:00:00", "2024-01-01T00:00:00"))

    def test_required_fields_enforced(self, sqlite_conn):
        """Test that required fields cannot be NULL."""
        cursor = sqlite_conn.cursor()

        # Try to insert client without required field
        with pytest.raises(sqlite3.IntegrityError, match="NOT NULL constraint failed"):
            cursor.execute("""
                INSERT INTO clients (id, first_name, last_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, ("test-id", "John", "Doe", "2024-01-01T00:00:00", "2024-01-01T00:00:00"))
            # email is missing

    def test_check_constraints(self, sqlite_conn):
        """Test that CHECK constraints are enforced."""
        cursor = sqlite_conn.cursor()

        # Insert valid client first
        cursor.execute("""
            INSERT INTO clients (id, first_name, last_name, email, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("test-client", "John", "Doe", "john@example.com", "2024-01-01T00:00:00", "2024-01-01T00:00:00"))
        sqlite_conn.commit()

        # Try to insert birth data with invalid latitude (> 90)
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute("""
                INSERT INTO birth_data (
                    id, client_id, birth_date, time_unknown,
                    latitude, longitude, timezone, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ("test-id", "test-client", "1990-01-01", 0, 95.0, 0.0, "UTC", "2024-01-01T00:00:00", "2024-01-01T00:00:00"))


class TestComplexJSON:
    """Test complex JSON data handling."""

    def test_deeply_nested_json(self, sqlite_conn, temp_migration_dir):
        """Test handling of deeply nested JSON structures."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        # Insert dependencies first
        clients = [{
            "id": "test-client-1",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1-555-0101",
            "notes": "Test",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]

        birth_data = [{
            "id": "test-birth-1",
            "client_id": "test-client-1",
            "birth_date": "1990-01-01",
            "birth_time": "12:00:00",
            "time_unknown": False,
            "latitude": 40.7128,
            "longitude": -74.0060,
            "timezone": "America/New_York",
            "utc_offset": -300,
            "city": "New York",
            "state_province": "NY",
            "country": "USA",
            "rodden_rating": "AA",
            "gender": None,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]

        importer.conn = sqlite_conn
        importer.import_clients(clients)
        importer.import_birth_data(birth_data)

        # Complex nested JSON
        complex_json = {
            "planets": {
                "sun": {
                    "longitude": 295.5,
                    "latitude": 0.0,
                    "speed": 1.0,
                    "aspects": [
                        {
                            "to": "moon",
                            "type": "trine",
                            "orb": 2.5,
                            "applying": True,
                            "metadata": {
                                "strength": 0.9,
                                "interpretation": "Harmonious"
                            }
                        }
                    ]
                }
            },
            "houses": {
                "cusps": list(range(12)),
                "systems": {
                    "placidus": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
                    "whole_sign": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
                }
            }
        }

        charts = [{
            "id": "test-chart-1",
            "client_id": "test-client-1",
            "birth_data_id": "test-birth-1",
            "chart_name": "Natal Chart",
            "chart_type": "natal",
            "astro_system": "western",
            "house_system": "placidus",
            "ayanamsa": None,
            "zodiac_type": "tropical",
            "calculation_params": json.dumps({"node_type": "true"}),
            "chart_data": json.dumps(complex_json),
            "last_viewed": "2024-01-01T00:00:00",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]

        importer.import_charts(charts)

        # Verify JSON can be parsed back
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT chart_data FROM charts")
        result = cursor.fetchone()[0]

        parsed = json.loads(result)
        assert parsed["planets"]["sun"]["aspects"][0]["metadata"]["strength"] == 0.9
        assert len(parsed["houses"]["systems"]["placidus"]) == 12

    def test_json_with_unicode(self, sqlite_conn, temp_migration_dir):
        """Test JSON containing Unicode characters."""
        importer = SQLiteImporter(
            db_path=":memory:",
            schema_path=Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql",
            migration_dir=temp_migration_dir
        )

        interpretations = [{
            "id": "test-interp-1",
            "user_id": None,
            "interpretation_type": "planet_in_sign",
            "key_identifier": "sun_in_capricorn",
            "tradition": "western",
            "text_content": "Le Soleil en Capricorne donne de l'ambition. 太阳在摩羯座。",
            "source": "Classical",
            "is_user_custom": False,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]

        importer.conn = sqlite_conn
        importer.import_interpretations(interpretations)

        # Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT text_content FROM interpretations")
        result = cursor.fetchone()[0]

        assert "Capricorne" in result
        assert "摩羯座" in result
