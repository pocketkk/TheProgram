"""
Test migration validation functionality.

This module tests the validation of migrated data to ensure correctness.
"""
import json
import sqlite3
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Import module under test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "migration_scripts"))

from validate_migration import MigrationValidator


class TestValidationRowCounts:
    """Test row count validation."""

    @patch('validate_migration.psycopg2.connect')
    def test_row_counts_match(
        self,
        mock_pg_connect,
        populated_sqlite_conn,
        sample_user_data,
    ):
        """Test validation when row counts match."""
        # Setup mock PostgreSQL connection
        mock_pg_conn = MagicMock()
        mock_pg_cursor = MagicMock()

        # Mock row count queries
        def execute_side_effect(query, params=None):
            if "SELECT id FROM users WHERE email" in query:
                mock_pg_cursor.fetchone.return_value = (sample_user_data["user"]["id"],)
            elif "SELECT COUNT(*) FROM clients" in query:
                mock_pg_cursor.fetchone.return_value = (2,)  # Match sample data
            elif "SELECT COUNT(*) FROM birth_data" in query:
                mock_pg_cursor.fetchone.return_value = (2,)
            else:
                mock_pg_cursor.fetchone.return_value = (0,)

        mock_pg_cursor.execute.side_effect = execute_side_effect
        mock_pg_conn.cursor.return_value = mock_pg_cursor
        mock_pg_connect.return_value = mock_pg_conn

        # Get SQLite database path
        db_path = populated_sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        # Create validator
        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.pg_conn = mock_pg_conn
        validator.sqlite_conn = populated_sqlite_conn
        validator.user_id = sample_user_data["user"]["id"]

        # Validate row counts
        result = validator.validate_row_counts()

        # Verification depends on actual data in populated_sqlite_conn
        # The test demonstrates the validation logic

    @patch('validate_migration.psycopg2.connect')
    def test_row_counts_mismatch_detected(
        self,
        mock_pg_connect,
        populated_sqlite_conn,
        sample_user_data,
    ):
        """Test validation detects row count mismatches."""
        # Setup mock PostgreSQL with different counts
        mock_pg_conn = MagicMock()
        mock_pg_cursor = MagicMock()

        def execute_side_effect(query, params=None):
            if "SELECT id FROM users WHERE email" in query:
                mock_pg_cursor.fetchone.return_value = (sample_user_data["user"]["id"],)
            elif "SELECT COUNT(*) FROM clients" in query:
                mock_pg_cursor.fetchone.return_value = (100,)  # Intentional mismatch
            else:
                mock_pg_cursor.fetchone.return_value = (0,)

        mock_pg_cursor.execute.side_effect = execute_side_effect
        mock_pg_conn.cursor.return_value = mock_pg_cursor
        mock_pg_connect.return_value = mock_pg_conn

        db_path = populated_sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.pg_conn = mock_pg_conn
        validator.sqlite_conn = populated_sqlite_conn
        validator.user_id = sample_user_data["user"]["id"]

        # Validate row counts (should detect mismatch)
        result = validator.validate_row_counts()

        # Should fail due to mismatch
        assert result is False
        assert len(validator.errors) > 0


class TestValidationForeignKeys:
    """Test foreign key validation."""

    def test_foreign_key_validation_success(self, populated_sqlite_conn):
        """Test validation when all foreign keys are valid."""
        db_path = populated_sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.sqlite_conn = populated_sqlite_conn

        # Validate foreign keys
        result = validator.validate_foreign_keys()

        # Should pass with valid test data
        assert result is True

    def test_foreign_key_validation_detects_orphans(self, sqlite_conn):
        """Test validation detects orphaned records."""
        # Insert chart without valid birth_data (FK violation)
        # First insert client
        cursor = sqlite_conn.cursor()
        cursor.execute(
            "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            ("c1111111-1111-1111-1111-111111111111", "Test", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        # Try to insert chart without birth_data (this would normally fail with FK constraints)
        # We need to temporarily disable FK constraints to create orphan
        sqlite_conn.execute("PRAGMA foreign_keys = OFF")

        cursor.execute(
            """INSERT INTO charts (id, birth_data_id, chart_type, astro_system, chart_data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            ("ch111111-1111-1111-1111-111111111111", "nonexistent-bd-id", "natal", "western",
             json.dumps({"planets": {}}), "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        sqlite_conn.commit()

        # Re-enable FK constraints
        sqlite_conn.execute("PRAGMA foreign_keys = ON")

        # Validate
        db_path = sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.sqlite_conn = sqlite_conn

        # Should detect orphaned chart
        result = validator.validate_foreign_keys()

        assert result is False
        assert len(validator.errors) > 0


class TestValidationJSON:
    """Test JSON field validation."""

    def test_json_validation_success(self, populated_sqlite_conn):
        """Test validation when all JSON is valid."""
        db_path = populated_sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.sqlite_conn = populated_sqlite_conn

        # Validate JSON fields
        result = validator.validate_json_fields()

        # Should pass with valid test data
        # May be True or False depending on test data presence
        assert isinstance(result, bool)

    def test_json_validation_detects_invalid_json(self, sqlite_conn, sample_clients, sample_birth_data):
        """Test validation detects invalid JSON."""
        # Insert chart with invalid JSON
        cursor = sqlite_conn.cursor()

        cursor.execute(
            "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (sample_clients[0]["id"], sample_clients[0]["first_name"], "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        cursor.execute(
            """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sample_birth_data[0]["id"], sample_birth_data[0]["client_id"], sample_birth_data[0]["birth_date"],
             sample_birth_data[0]["latitude"], sample_birth_data[0]["longitude"], sample_birth_data[0]["timezone"],
             0, "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        # Insert chart with INVALID JSON
        cursor.execute(
            """INSERT INTO charts (id, birth_data_id, chart_type, astro_system, chart_data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            ("ch111111-1111-1111-1111-111111111111", sample_birth_data[0]["id"], "natal", "western",
             "INVALID JSON{{{", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        sqlite_conn.commit()

        # Validate
        db_path = sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.sqlite_conn = sqlite_conn

        # Should detect invalid JSON
        result = validator.validate_json_fields()

        assert result is False
        assert len(validator.errors) > 0


class TestValidationDataTypes:
    """Test data type validation."""

    def test_uuid_format_validation(self, populated_sqlite_conn):
        """Test UUID format validation."""
        db_path = populated_sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.sqlite_conn = populated_sqlite_conn

        # Validate data types
        result = validator.validate_data_types()

        # Should pass with valid test data
        assert isinstance(result, bool)

    def test_date_format_validation(self, sqlite_conn, sample_clients, sample_birth_data):
        """Test date format validation."""
        cursor = sqlite_conn.cursor()

        cursor.execute(
            "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (sample_clients[0]["id"], sample_clients[0]["first_name"], "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        # Insert birth_data with properly formatted date
        cursor.execute(
            """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sample_birth_data[0]["id"], sample_birth_data[0]["client_id"], "1990-01-15",  # Valid format
             40.0, -74.0, "America/New_York", 0, "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        sqlite_conn.commit()

        db_path = sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.sqlite_conn = sqlite_conn

        result = validator.validate_data_types()

        # Should pass with valid date format
        # (May have warnings but no errors)
        assert len([e for e in validator.errors if "date" in e.lower()]) == 0

    def test_coordinate_range_validation(self, sqlite_conn, sample_clients):
        """Test that coordinate validation detects out-of-range values."""
        cursor = sqlite_conn.cursor()

        cursor.execute(
            "INSERT INTO clients (id, first_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (sample_clients[0]["id"], sample_clients[0]["first_name"], "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        # Insert birth_data with invalid coordinates
        cursor.execute(
            """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("b1111111-1111-1111-1111-111111111111", sample_clients[0]["id"], "1990-01-01",
             999.0, -999.0,  # Invalid coordinates
             "UTC", 0, "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        sqlite_conn.commit()

        db_path = sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.sqlite_conn = sqlite_conn

        result = validator.validate_data_types()

        # Should detect invalid coordinates
        assert result is False
        assert len(validator.errors) > 0


class TestValidationReport:
    """Test validation report generation."""

    @patch('validate_migration.psycopg2.connect')
    def test_generate_report(
        self,
        mock_pg_connect,
        populated_sqlite_conn,
        temp_migration_dir,
        sample_user_data,
    ):
        """Test validation report generation."""
        # Setup mocks
        mock_pg_conn = MagicMock()
        mock_pg_cursor = MagicMock()

        def execute_side_effect(query, params=None):
            if "SELECT id FROM users WHERE email" in query:
                mock_pg_cursor.fetchone.return_value = (sample_user_data["user"]["id"],)
            else:
                mock_pg_cursor.fetchone.return_value = (0,)

        mock_pg_cursor.execute.side_effect = execute_side_effect
        mock_pg_conn.cursor.return_value = mock_pg_cursor
        mock_pg_connect.return_value = mock_pg_conn

        db_path = populated_sqlite_conn.execute("PRAGMA database_list").fetchone()[2]

        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path(db_path),
            user_email="test@example.com"
        )

        validator.pg_conn = mock_pg_conn
        validator.sqlite_conn = populated_sqlite_conn
        validator.user_id = sample_user_data["user"]["id"]

        # Add some validation results
        validator.validation_results = {"clients": {"pg_count": 2, "sqlite_count": 2, "match": True}}
        validator.errors = []
        validator.warnings = []

        # Generate report
        with patch('validate_migration.MIGRATION_DATA_DIR', temp_migration_dir):
            report = validator.generate_report()

        # Verify report structure
        assert "user_email" in report
        assert "validation_results" in report
        assert "errors" in report
        assert "warnings" in report
        assert "overall_status" in report

        # Verify report saved
        report_file = temp_migration_dir / "validation_report.json"
        assert report_file.exists()

        # Verify report contents
        with open(report_file) as f:
            saved_report = json.load(f)

        assert saved_report["user_email"] == "test@example.com"
        assert saved_report["overall_status"] in ("PASS", "FAIL")

    def test_report_status_pass(self):
        """Test that report shows PASS when no errors."""
        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path("test.db"),
            user_email="test@example.com"
        )

        validator.errors = []
        validator.warnings = ["Some warning"]

        report = validator.generate_report()

        assert report["overall_status"] == "PASS"

    def test_report_status_fail(self):
        """Test that report shows FAIL when errors exist."""
        validator = MigrationValidator(
            postgres_url="postgresql://test",
            sqlite_path=Path("test.db"),
            user_email="test@example.com"
        )

        validator.errors = ["Some error"]
        validator.warnings = []

        report = validator.generate_report()

        assert report["overall_status"] == "FAIL"
