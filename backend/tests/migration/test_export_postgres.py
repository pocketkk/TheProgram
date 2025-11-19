"""
Test PostgreSQL export functionality.

This module tests the export of data from PostgreSQL to JSON files.
"""
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Import the module under test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "migration_scripts"))

from export_from_postgres import PostgreSQLExporter


class TestPostgreSQLExporter:
    """Test PostgreSQLExporter class."""

    def test_initialization(self):
        """Test exporter initialization."""
        exporter = PostgreSQLExporter(
            postgres_url="postgresql://localhost/test",
            user_email="test@example.com"
        )

        assert exporter.postgres_url == "postgresql://localhost/test"
        assert exporter.user_email == "test@example.com"
        assert exporter.user_id is None
        assert exporter.conn is None
        assert exporter.stats == {}

    def test_serialize_row_with_uuids(self, sample_clients):
        """Test UUID serialization to string."""
        from uuid import UUID

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        row_with_uuid = {
            "id": UUID("c1111111-1111-1111-1111-111111111111"),
            "name": "Test",
        }

        result = exporter._serialize_row(row_with_uuid)

        assert result["id"] == "c1111111-1111-1111-1111-111111111111"
        assert isinstance(result["id"], str)
        assert result["name"] == "Test"

    def test_serialize_row_with_datetime(self):
        """Test datetime serialization to ISO format."""
        from datetime import datetime

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        row_with_datetime = {
            "created_at": datetime(2024, 1, 1, 12, 30, 45),
            "updated_at": datetime(2024, 6, 15, 8, 15, 0),
        }

        result = exporter._serialize_row(row_with_datetime)

        assert result["created_at"] == "2024-01-01T12:30:45"
        assert result["updated_at"] == "2024-06-15T08:15:00"
        assert isinstance(result["created_at"], str)

    def test_serialize_row_with_json(self):
        """Test JSON/JSONB field serialization."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        row_with_json = {
            "data": {"key": "value", "nested": {"a": 1}},
            "array": [1, 2, 3],
        }

        result = exporter._serialize_row(row_with_json)

        assert result["data"] == {"key": "value", "nested": {"a": 1}}
        assert result["array"] == [1, 2, 3]
        assert isinstance(result["data"], dict)
        assert isinstance(result["array"], list)

    def test_serialize_row_with_decimals(self):
        """Test Decimal serialization to float."""
        from decimal import Decimal

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        row_with_decimal = {
            "latitude": Decimal("40.7128"),
            "longitude": Decimal("-74.0060"),
        }

        result = exporter._serialize_row(row_with_decimal)

        assert result["latitude"] == 40.7128
        assert result["longitude"] == -74.0060
        assert isinstance(result["latitude"], float)

    def test_serialize_row_with_none_values(self):
        """Test NULL value serialization."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        row_with_nulls = {
            "optional_field": None,
            "another_field": "value",
        }

        result = exporter._serialize_row(row_with_nulls)

        assert result["optional_field"] is None
        assert result["another_field"] == "value"

    @patch('export_from_postgres.psycopg2.connect')
    def test_connect_success(self, mock_connect):
        """Test successful PostgreSQL connection."""
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")
        exporter.connect()

        assert exporter.conn == mock_conn
        mock_connect.assert_called_once_with("postgresql://localhost/test")

    @patch('export_from_postgres.psycopg2.connect')
    def test_connect_failure(self, mock_connect):
        """Test PostgreSQL connection failure."""
        mock_connect.side_effect = Exception("Connection failed")

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        with pytest.raises(Exception, match="Connection failed"):
            exporter.connect()

    def test_disconnect(self):
        """Test disconnection."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")
        mock_conn = MagicMock()
        exporter.conn = mock_conn

        exporter.disconnect()

        mock_conn.close.assert_called_once()

    @patch('export_from_postgres.psycopg2.connect')
    def test_get_user_id_success(self, mock_connect, sample_user_data):
        """Test successful user ID lookup."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (
            sample_user_data["user"]["id"],
            sample_user_data["user"]["full_name"],
        )
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")
        exporter.connect()
        user_id = exporter.get_user_id()

        assert user_id == sample_user_data["user"]["id"]
        mock_cursor.execute.assert_called_once()

    @patch('export_from_postgres.psycopg2.connect')
    def test_get_user_id_not_found(self, mock_connect):
        """Test user not found error."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")
        exporter.connect()

        with pytest.raises(ValueError, match="User not found"):
            exporter.get_user_id()

    def test_save_json(self, temp_migration_dir):
        """Test saving data to JSON file with checksum."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        # Patch MIGRATION_DATA_DIR
        with patch('export_from_postgres.MIGRATION_DATA_DIR', temp_migration_dir):
            test_data = {"key": "value", "number": 123}
            checksum = exporter.save_json("test.json", test_data)

            # Verify file exists
            json_file = temp_migration_dir / "test.json"
            assert json_file.exists()

            # Verify content
            with open(json_file, "r") as f:
                loaded_data = json.load(f)
            assert loaded_data == test_data

            # Verify checksum
            assert isinstance(checksum, str)
            assert len(checksum) == 64  # SHA256 hex digest length

    @patch('export_from_postgres.psycopg2.connect')
    def test_export_clients(self, mock_connect, sample_user_data, sample_clients):
        """Test exporting clients."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Mock RealDictCursor to return dicts
        mock_cursor.fetchall.return_value = [dict(c) for c in sample_clients]
        mock_conn.cursor.return_value.__enter__ = lambda self: mock_cursor
        mock_conn.cursor.return_value.__exit__ = lambda self, *args: None
        mock_connect.return_value = mock_conn

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")
        exporter.conn = mock_conn
        exporter.user_id = sample_user_data["user"]["id"]

        result = exporter.export_clients()

        assert len(result) == len(sample_clients)
        assert exporter.stats["clients"] == len(sample_clients)

    @patch('export_from_postgres.psycopg2.connect')
    def test_export_birth_data_with_clients(self, mock_connect, sample_birth_data):
        """Test exporting birth data for specific clients."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [dict(bd) for bd in sample_birth_data]
        mock_conn.cursor.return_value.__enter__ = lambda self: mock_cursor
        mock_conn.cursor.return_value.__exit__ = lambda self, *args: None
        mock_connect.return_value = mock_conn

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")
        exporter.conn = mock_conn

        client_ids = [bd["client_id"] for bd in sample_birth_data]
        result = exporter.export_birth_data(client_ids)

        assert len(result) == len(sample_birth_data)
        assert exporter.stats["birth_data"] == len(sample_birth_data)

    def test_export_birth_data_with_empty_clients(self):
        """Test exporting birth data with no clients."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        result = exporter.export_birth_data([])

        assert result == []
        assert exporter.stats.get("birth_data", 0) == 0

    @patch('export_from_postgres.psycopg2.connect')
    def test_export_interpretations_includes_default_and_custom(
        self, mock_connect, sample_user_data, sample_interpretations
    ):
        """Test that interpretations export includes both default and user custom."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [dict(i) for i in sample_interpretations]
        mock_conn.cursor.return_value.__enter__ = lambda self: mock_cursor
        mock_conn.cursor.return_value.__exit__ = lambda self, *args: None
        mock_connect.return_value = mock_conn

        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")
        exporter.conn = mock_conn
        exporter.user_id = sample_user_data["user"]["id"]

        result = exporter.export_interpretations()

        # Should include both default (user_id=None) and custom (user_id=test user)
        assert len(result) == len(sample_interpretations)
        assert exporter.stats["interpretations"] == len(sample_interpretations)

        # Verify query includes both conditions
        call_args = mock_cursor.execute.call_args[0]
        assert "user_id IS NULL OR user_id" in call_args[0]


class TestExportEdgeCases:
    """Test edge cases and error handling."""

    def test_export_with_special_characters(self):
        """Test exporting data with special characters."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        row = {
            "name": "Test's \"Name\" with Émojis 🎉",
            "notes": "Line 1\nLine 2\tTabbed",
        }

        result = exporter._serialize_row(row)

        assert result["name"] == "Test's \"Name\" with Émojis 🎉"
        assert result["notes"] == "Line 1\nLine 2\tTabbed"

    def test_export_with_very_long_text(self):
        """Test exporting data with very long text fields."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        long_text = "A" * 10000
        row = {"notes": long_text}

        result = exporter._serialize_row(row)

        assert result["notes"] == long_text
        assert len(result["notes"]) == 10000

    def test_export_with_empty_strings(self):
        """Test exporting data with empty strings."""
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        row = {"name": "", "email": ""}

        result = exporter._serialize_row(row)

        assert result["name"] == ""
        assert result["email"] == ""


class TestExportPerformance:
    """Test export performance and scalability."""

    @pytest.mark.slow
    def test_export_large_dataset(self):
        """Test exporting a large number of records."""
        # This would be a performance test with actual database
        # For now, we'll just verify the logic handles many records
        exporter = PostgreSQLExporter("postgresql://localhost/test", "test@example.com")

        # Simulate large dataset
        large_dataset = [{"id": f"id-{i}", "name": f"Name {i}"} for i in range(1000)]

        serialized = [exporter._serialize_row(row) for row in large_dataset]

        assert len(serialized) == 1000
        assert serialized[0]["id"] == "id-0"
        assert serialized[999]["id"] == "id-999"
