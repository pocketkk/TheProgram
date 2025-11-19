"""
Test SQLite import functionality.

This module tests the import of data from JSON files into SQLite database.
"""
import json
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest

# Import the module under test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "migration_scripts"))

from import_to_sqlite import SQLiteImporter


class TestSQLiteImporter:
    """Test SQLiteImporter class."""

    def test_initialization(self, tmp_path, sqlite_schema_path):
        """Test importer initialization."""
        db_path = tmp_path / "test.db"

        importer = SQLiteImporter(db_path, sqlite_schema_path)

        assert importer.sqlite_path == db_path
        assert importer.schema_path == sqlite_schema_path
        assert importer.conn is None
        assert importer.stats == {}

    def test_create_database(self, tmp_path, sqlite_schema_path):
        """Test creating new SQLite database from schema."""
        db_path = tmp_path / "test.db"

        importer = SQLiteImporter(db_path, sqlite_schema_path)
        importer.create_database()

        # Verify database exists
        assert db_path.exists()

        # Verify schema loaded
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check for expected tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        expected_tables = [
            "app_config",
            "user_preferences",
            "clients",
            "birth_data",
            "charts",
            "chart_interpretations",
            "interpretations",
            "aspect_patterns",
            "transit_events",
            "session_notes",
            "location_cache",
        ]

        for table in expected_tables:
            assert table in tables

        conn.close()

    def test_create_database_with_existing_backup(self, tmp_path, sqlite_schema_path):
        """Test that existing database is backed up."""
        db_path = tmp_path / "test.db"

        # Create existing database
        existing_conn = sqlite3.connect(db_path)
        existing_conn.execute("CREATE TABLE test (id INTEGER)")
        existing_conn.close()

        # Create new database (should backup old one)
        importer = SQLiteImporter(db_path, sqlite_schema_path)
        importer.create_database()

        # Verify backup exists
        backups = list(tmp_path.glob("test_backup_*.db"))
        assert len(backups) == 1

        # Verify new database is clean (has schema tables, not test table)
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test'")
        assert cursor.fetchone() is None
        conn.close()

    def test_load_json_existing_file(self, sample_export_files):
        """Test loading JSON from existing file."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))

        with patch('import_to_sqlite.MIGRATION_DATA_DIR', sample_export_files):
            data = importer.load_json("clients.json")

        assert data is not None
        assert isinstance(data, list)
        assert len(data) == 2

    def test_load_json_missing_file(self, temp_migration_dir):
        """Test loading JSON from missing file."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))

        with patch('import_to_sqlite.MIGRATION_DATA_DIR', temp_migration_dir):
            data = importer.load_json("nonexistent.json")

        assert data is None

    def test_import_user_data(self, sqlite_conn, sample_user_data):
        """Test importing user data to app_config."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_user_data(sample_user_data)

        # Verify password_hash updated
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT password_hash FROM app_config WHERE id = 1")
        result = cursor.fetchone()

        assert result[0] == sample_user_data["user"]["password_hash"]

    def test_import_user_preferences(self, sqlite_conn, sample_user_data):
        """Test importing user preferences."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_user_data(sample_user_data)

        # Verify preferences updated
        cursor = sqlite_conn.cursor()
        cursor.execute(
            "SELECT default_house_system, default_ayanamsa, color_scheme FROM user_preferences WHERE id = 1"
        )
        result = cursor.fetchone()

        prefs = sample_user_data["preferences"]
        assert result[0] == prefs["default_house_system"]
        assert result[1] == prefs["default_ayanamsa"]
        assert result[2] == prefs["color_scheme"]

    def test_import_clients(self, sqlite_conn, sample_clients):
        """Test importing clients."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_clients(sample_clients)

        # Verify clients imported
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients")
        count = cursor.fetchone()[0]

        assert count == len(sample_clients)
        assert importer.stats["clients"] == len(sample_clients)

    def test_import_clients_empty_list(self, sqlite_conn):
        """Test importing empty client list."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_clients([])

        # Should not error, just log warning
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients")
        count = cursor.fetchone()[0]

        assert count == 0

    def test_import_birth_data(self, sqlite_conn, sample_clients, sample_birth_data):
        """Test importing birth data."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        # Import clients first (foreign key dependency)
        importer.import_clients(sample_clients)

        # Import birth data
        importer.import_birth_data(sample_birth_data)

        # Verify birth data imported
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM birth_data")
        count = cursor.fetchone()[0]

        assert count == len(sample_birth_data)
        assert importer.stats["birth_data"] == len(sample_birth_data)

    def test_import_birth_data_boolean_conversion(self, sqlite_conn, sample_clients, sample_birth_data):
        """Test that boolean time_unknown is converted to 0/1."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_clients(sample_clients)
        importer.import_birth_data(sample_birth_data)

        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT id, time_unknown FROM birth_data")
        results = cursor.fetchall()

        for row in results:
            bd_id, time_unknown = row
            # Should be 0 or 1
            assert time_unknown in (0, 1)

    def test_import_charts_with_json_fields(self, sqlite_conn, sample_clients, sample_birth_data, sample_charts):
        """Test importing charts with JSON data."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        # Import dependencies
        importer.import_clients(sample_clients)
        importer.import_birth_data(sample_birth_data)

        # Import charts
        importer.import_charts(sample_charts)

        # Verify charts imported
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT id, chart_data, calculation_params FROM charts")
        results = cursor.fetchall()

        assert len(results) == len(sample_charts)

        for chart_id, chart_data_json, calc_params_json in results:
            # Verify JSON can be parsed
            chart_data = json.loads(chart_data_json)
            assert isinstance(chart_data, dict)
            assert "planets" in chart_data

            if calc_params_json:
                calc_params = json.loads(calc_params_json)
                assert isinstance(calc_params, dict)

    def test_import_interpretations(self, sqlite_conn, sample_interpretations):
        """Test importing interpretations."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_interpretations(sample_interpretations)

        # Verify interpretations imported
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM interpretations")
        count = cursor.fetchone()[0]

        assert count == len(sample_interpretations)
        assert importer.stats["interpretations"] == len(sample_interpretations)

    def test_import_interpretations_user_custom_flag(self, sqlite_conn, sample_interpretations):
        """Test that is_user_custom boolean is converted correctly."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_interpretations(sample_interpretations)

        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT id, is_user_custom FROM interpretations")
        results = cursor.fetchall()

        for interp_id, is_user_custom in results:
            # Should be 0 or 1
            assert is_user_custom in (0, 1)

    def test_import_location_cache_with_duplicates(self, sqlite_conn, sample_location_cache):
        """Test that duplicate locations are ignored (INSERT OR IGNORE)."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        # Import once
        importer.import_location_cache(sample_location_cache)
        first_count = importer.stats["location_cache"]

        # Import again (should be ignored)
        importer.import_location_cache(sample_location_cache)
        second_count = importer.stats["location_cache"]

        # Stats show attempted import, but DB should have same count
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM location_cache")
        db_count = cursor.fetchone()[0]

        assert db_count == first_count  # No duplicates added

    def test_import_all_with_transaction(self, sqlite_conn, sample_export_files, sqlite_schema_path):
        """Test that import_all uses transaction."""
        db_path = sqlite_conn.execute("PRAGMA database_list").fetchone()[2]
        sqlite_conn.close()

        importer = SQLiteImporter(Path(db_path), sqlite_schema_path)

        with patch('import_to_sqlite.MIGRATION_DATA_DIR', sample_export_files):
            # This should complete successfully
            importer.import_all()

        # Verify data imported
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM clients")
        assert cursor.fetchone()[0] == 2

        cursor.execute("SELECT COUNT(*) FROM birth_data")
        assert cursor.fetchone()[0] == 2

        conn.close()


class TestImportEdgeCases:
    """Test edge cases and error handling."""

    def test_import_with_null_values(self, sqlite_conn, sample_clients):
        """Test importing records with NULL values."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        # Client with NULLs
        client_with_nulls = {
            "id": "c9999999-9999-9999-9999-999999999999",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "first_name": "Only",
            "last_name": None,
            "email": None,
            "phone": None,
            "notes": None,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }

        importer.import_clients([client_with_nulls])

        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT last_name, email, phone, notes FROM clients WHERE id = ?", (client_with_nulls["id"],))
        result = cursor.fetchone()

        assert all(val is None for val in result)

    def test_import_with_foreign_key_violation(self, sqlite_conn, sample_birth_data):
        """Test that foreign key violations cause rollback."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        # Try to import birth_data without clients (FK violation)
        with pytest.raises(sqlite3.IntegrityError):
            importer.import_birth_data(sample_birth_data)

    def test_import_rollback_on_error(self, sqlite_conn, sqlite_schema_path, sample_export_files):
        """Test that errors trigger rollback."""
        db_path = sqlite_conn.execute("PRAGMA database_list").fetchone()[2]
        sqlite_conn.close()

        importer = SQLiteImporter(Path(db_path), sqlite_schema_path)

        # Corrupt one of the JSON files
        corrupt_file = sample_export_files / "charts.json"
        with open(corrupt_file, "w") as f:
            f.write("INVALID JSON{{{")

        with patch('import_to_sqlite.MIGRATION_DATA_DIR', sample_export_files):
            # Import should fail
            with pytest.raises(Exception):
                importer.import_all()

        # Verify no partial data imported (transaction rolled back)
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Default rows from schema should exist, but not imported data
        cursor.execute("SELECT COUNT(*) FROM clients")
        # Should be 0 (no clients imported due to rollback)
        assert cursor.fetchone()[0] == 0

        conn.close()


class TestImportDataIntegrity:
    """Test data integrity during import."""

    def test_import_preserves_data_types(self, sqlite_conn, sample_clients, sample_birth_data):
        """Test that data types are preserved correctly."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_clients(sample_clients)
        importer.import_birth_data(sample_birth_data)

        cursor = sqlite_conn.cursor()

        # Check string types
        cursor.execute("SELECT first_name FROM clients LIMIT 1")
        assert isinstance(cursor.fetchone()[0], str)

        # Check float types
        cursor.execute("SELECT latitude FROM birth_data LIMIT 1")
        result = cursor.fetchone()[0]
        assert isinstance(result, float)

        # Check integer types
        cursor.execute("SELECT time_unknown FROM birth_data LIMIT 1")
        result = cursor.fetchone()[0]
        assert isinstance(result, int)

    def test_import_preserves_uuid_format(self, sqlite_conn, sample_clients):
        """Test that UUIDs maintain correct format."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_clients(sample_clients)

        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT id FROM clients")
        results = cursor.fetchall()

        for row in results:
            uuid_str = row[0]
            # Should be valid UUID format (36 chars with hyphens)
            assert len(uuid_str) == 36
            assert uuid_str.count("-") == 4

    def test_import_preserves_timestamps(self, sqlite_conn, sample_clients):
        """Test that timestamp formats are preserved."""
        importer = SQLiteImporter(Path("dummy"), Path("dummy"))
        importer.conn = sqlite_conn

        importer.import_clients(sample_clients)

        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT created_at, updated_at FROM clients LIMIT 1")
        created_at, updated_at = cursor.fetchone()

        # Should be ISO 8601 format strings
        assert "T" in created_at
        assert "T" in updated_at
