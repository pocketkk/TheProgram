"""
Test data type transformations during migration.

This module tests UUID, datetime, JSON, and boolean transformations
from PostgreSQL to SQLite.
"""
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from uuid import UUID

import pytest


class TestUUIDTransformation:
    """Test UUID to TEXT transformation."""

    def test_uuid_format_validation(self, populated_sqlite_conn):
        """Test that all UUIDs are valid format (36 chars with hyphens)."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Check all UUID columns
        tables_with_uuids = [
            ("clients", "id"),
            ("birth_data", "id"),
            ("birth_data", "client_id"),
            ("charts", "id"),
            ("charts", "client_id"),
            ("charts", "birth_data_id"),
        ]

        for table, column in tables_with_uuids:
            cursor.execute(f"""
                SELECT {column}
                FROM {table}
                WHERE {column} IS NOT NULL
            """)

            for row in cursor.fetchall():
                uuid_str = row[0]
                # Should be 36 characters
                assert len(uuid_str) == 36, f"{table}.{column}: Invalid length {len(uuid_str)}"
                # Should have 4 hyphens at correct positions
                assert uuid_str.count("-") == 4, f"{table}.{column}: Invalid hyphen count"
                assert uuid_str[8] == "-", f"{table}.{column}: Hyphen missing at position 8"
                assert uuid_str[13] == "-", f"{table}.{column}: Hyphen missing at position 13"
                assert uuid_str[18] == "-", f"{table}.{column}: Hyphen missing at position 18"
                assert uuid_str[23] == "-", f"{table}.{column}: Hyphen missing at position 23"

    def test_uuid_lowercase(self, populated_sqlite_conn):
        """Test that UUIDs are lowercase (SQLite convention)."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM clients")

        for row in cursor.fetchall():
            uuid_str = row[0]
            # Should be lowercase
            assert uuid_str == uuid_str.lower(), f"UUID not lowercase: {uuid_str}"

    def test_uuid_can_be_parsed(self, populated_sqlite_conn):
        """Test that UUID strings can be parsed back to UUID objects."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM clients LIMIT 1")
        result = cursor.fetchone()

        if result:
            uuid_str = result[0]
            # Should be parseable as UUID
            uuid_obj = UUID(uuid_str)
            assert str(uuid_obj) == uuid_str


class TestDateTimeTransformation:
    """Test datetime to ISO 8601 TEXT transformation."""

    def test_datetime_format_validation(self, populated_sqlite_conn):
        """Test that all datetime fields are ISO 8601 format."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Check created_at and updated_at columns
        cursor.execute("SELECT created_at, updated_at FROM clients")

        for row in cursor.fetchall():
            created_at, updated_at = row

            # Should be ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
            assert "T" in created_at, f"created_at missing T separator: {created_at}"
            assert "T" in updated_at, f"updated_at missing T separator: {updated_at}"

            # Should be parseable
            datetime.fromisoformat(created_at)
            datetime.fromisoformat(updated_at)

    def test_date_format_validation(self, populated_sqlite_conn):
        """Test that date fields are ISO 8601 date format (YYYY-MM-DD)."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        cursor.execute("SELECT birth_date FROM birth_data")

        for row in cursor.fetchall():
            birth_date = row[0]

            # Should be YYYY-MM-DD format
            assert len(birth_date) == 10, f"Invalid date length: {birth_date}"
            assert birth_date[4] == "-", f"Missing hyphen at position 4: {birth_date}"
            assert birth_date[7] == "-", f"Missing hyphen at position 7: {birth_date}"

            # Should be parseable
            year, month, day = birth_date.split("-")
            assert 1900 <= int(year) <= 2100, f"Invalid year: {year}"
            assert 1 <= int(month) <= 12, f"Invalid month: {month}"
            assert 1 <= int(day) <= 31, f"Invalid day: {day}"

    def test_time_format_validation(self, populated_sqlite_conn):
        """Test that time fields are ISO 8601 time format (HH:MM:SS) or NULL."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        cursor.execute("SELECT birth_time FROM birth_data WHERE birth_time IS NOT NULL")

        for row in cursor.fetchall():
            birth_time = row[0]

            # Should be HH:MM:SS format
            assert len(birth_time) >= 8, f"Invalid time length: {birth_time}"
            assert birth_time[2] == ":", f"Missing colon at position 2: {birth_time}"
            assert birth_time[5] == ":", f"Missing colon at position 5: {birth_time}"

            # Validate time components
            hour, minute, second = birth_time.split(":")[:3]
            assert 0 <= int(hour) <= 23, f"Invalid hour: {hour}"
            assert 0 <= int(minute) <= 59, f"Invalid minute: {minute}"
            assert 0 <= int(float(second)) <= 59, f"Invalid second: {second}"


class TestJSONTransformation:
    """Test JSONB to JSON TEXT transformation."""

    def test_json_fields_parseable(self, populated_sqlite_conn):
        """Test that all JSON fields can be parsed."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Check charts.chart_data (required JSON field)
        cursor.execute("SELECT id, chart_data FROM charts")

        for row in cursor.fetchall():
            chart_id, chart_data_json = row

            # Should be non-null
            assert chart_data_json is not None, f"Chart {chart_id} has NULL chart_data"

            # Should be parseable
            try:
                data = json.loads(chart_data_json)
                assert isinstance(data, dict), f"Chart {chart_id} chart_data is not a dict"
            except json.JSONDecodeError as e:
                pytest.fail(f"Chart {chart_id} has invalid JSON: {e}")

    def test_json_structure_preserved(self, sqlite_conn, sample_charts):
        """Test that JSON structure is preserved during migration."""
        import json as json_module

        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert a chart with complex JSON
        chart = sample_charts[0]

        # Need dependencies
        cursor.execute(
            "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (chart["client_id"], "Test", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        cursor.execute(
            """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (chart["birth_data_id"], chart["client_id"], "1990-01-01", 0.0, 0.0, "UTC", 0, "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        cursor.execute(
            """INSERT INTO charts (id, client_id, birth_data_id, chart_type, astro_system, chart_data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (chart["id"], chart["client_id"], chart["birth_data_id"], chart["chart_type"], chart["astro_system"],
             json_module.dumps(chart["chart_data"]), chart["created_at"], chart["updated_at"])
        )
        conn.commit()

        # Retrieve and verify
        cursor.execute("SELECT chart_data FROM charts WHERE id = ?", (chart["id"],))
        result = cursor.fetchone()

        retrieved_data = json_module.loads(result[0])

        # Verify structure matches
        assert "planets" in retrieved_data
        assert "houses" in retrieved_data
        assert "aspects" in retrieved_data
        assert retrieved_data["planets"]["sun"]["longitude"] == 295.5

    def test_json_array_fields(self, sqlite_conn):
        """Test that JSON arrays are preserved correctly."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert aspect pattern with JSON array
        cursor.execute(
            "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            ("c1111111-1111-1111-1111-111111111111", "Test", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        cursor.execute(
            """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("b1111111-1111-1111-1111-111111111111", "c1111111-1111-1111-1111-111111111111", "1990-01-01", 0.0, 0.0, "UTC", 0, "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        cursor.execute(
            """INSERT INTO charts (id, client_id, birth_data_id, chart_type, astro_system, chart_data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            ("ch111111-1111-1111-1111-111111111111", "c1111111-1111-1111-1111-111111111111", "b1111111-1111-1111-1111-111111111111",
             "natal", "western", json.dumps({"planets": {}}), "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        planets = ["sun", "moon", "jupiter"]
        cursor.execute(
            """INSERT INTO aspect_patterns (id, chart_id, pattern_type, planets_involved, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            ("ap111111-1111-1111-1111-111111111111", "ch111111-1111-1111-1111-111111111111", "grand_trine",
             json.dumps(planets), "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Retrieve and verify
        cursor.execute("SELECT planets_involved FROM aspect_patterns WHERE id = ?", ("ap111111-1111-1111-1111-111111111111",))
        result = cursor.fetchone()

        retrieved_planets = json.loads(result[0])

        assert isinstance(retrieved_planets, list)
        assert len(retrieved_planets) == 3
        assert retrieved_planets == planets


class TestBooleanTransformation:
    """Test boolean to INTEGER (0/1) transformation."""

    def test_boolean_values_are_integers(self, populated_sqlite_conn):
        """Test that boolean fields are stored as 0 or 1."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Check time_unknown in birth_data
        cursor.execute("SELECT time_unknown FROM birth_data")

        for row in cursor.fetchall():
            time_unknown = row[0]
            assert time_unknown in (0, 1), f"Invalid boolean value: {time_unknown}"
            assert isinstance(time_unknown, int), f"Boolean not stored as int: {type(time_unknown)}"

    def test_boolean_true_conversion(self, sqlite_conn, sample_birth_data):
        """Test that True values convert to 1."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Find a birth_data with time_unknown=True
        bd_with_unknown_time = None
        for bd in sample_birth_data:
            if bd["time_unknown"]:
                bd_with_unknown_time = bd
                break

        if bd_with_unknown_time:
            # Insert client first
            cursor.execute(
                "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (bd_with_unknown_time["client_id"], "Test", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
            )

            # Insert birth_data
            cursor.execute(
                """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (bd_with_unknown_time["id"], bd_with_unknown_time["client_id"], bd_with_unknown_time["birth_date"],
                 bd_with_unknown_time["latitude"], bd_with_unknown_time["longitude"], bd_with_unknown_time["timezone"],
                 1 if bd_with_unknown_time["time_unknown"] else 0,
                 bd_with_unknown_time["created_at"], bd_with_unknown_time["updated_at"])
            )
            conn.commit()

            # Verify
            cursor.execute("SELECT time_unknown FROM birth_data WHERE id = ?", (bd_with_unknown_time["id"],))
            result = cursor.fetchone()[0]
            assert result == 1

    def test_boolean_false_conversion(self, sqlite_conn, sample_birth_data):
        """Test that False values convert to 0."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Find a birth_data with time_unknown=False
        bd_with_known_time = None
        for bd in sample_birth_data:
            if not bd["time_unknown"]:
                bd_with_known_time = bd
                break

        if bd_with_known_time:
            # Insert client first
            cursor.execute(
                "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (bd_with_known_time["client_id"], "Test", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
            )

            # Insert birth_data
            cursor.execute(
                """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (bd_with_known_time["id"], bd_with_known_time["client_id"], bd_with_known_time["birth_date"],
                 bd_with_known_time["latitude"], bd_with_known_time["longitude"], bd_with_known_time["timezone"],
                 1 if bd_with_known_time["time_unknown"] else 0,
                 bd_with_known_time["created_at"], bd_with_known_time["updated_at"])
            )
            conn.commit()

            # Verify
            cursor.execute("SELECT time_unknown FROM birth_data WHERE id = ?", (bd_with_known_time["id"],))
            result = cursor.fetchone()[0]
            assert result == 0


class TestNumericTransformation:
    """Test numeric type transformations."""

    def test_real_numbers_preserved(self, populated_sqlite_conn):
        """Test that REAL (float) values are preserved."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        cursor.execute("SELECT latitude, longitude FROM birth_data")

        for row in cursor.fetchall():
            lat, lon = row

            # Should be float/real types
            assert isinstance(lat, float), f"Latitude not REAL: {type(lat)}"
            assert isinstance(lon, float), f"Longitude not REAL: {type(lon)}"

            # Should be valid coordinate ranges
            assert -90 <= lat <= 90, f"Invalid latitude: {lat}"
            assert -180 <= lon <= 180, f"Invalid longitude: {lon}"

    def test_integers_preserved(self, populated_sqlite_conn):
        """Test that INTEGER values are preserved."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        cursor.execute("SELECT utc_offset FROM birth_data WHERE utc_offset IS NOT NULL")

        for row in cursor.fetchall():
            utc_offset = row[0]

            # Should be integer
            assert isinstance(utc_offset, int), f"UTC offset not INTEGER: {type(utc_offset)}"

            # Should be reasonable UTC offset (-12 to +14 hours in minutes)
            assert -720 <= utc_offset <= 840, f"Invalid UTC offset: {utc_offset}"
