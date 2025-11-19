"""
Test end-to-end migration process.

This module tests the complete migration workflow from export to validation.
"""
import json
import sqlite3
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Import modules under test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "migration_scripts"))

from export_from_postgres import PostgreSQLExporter
from import_to_sqlite import SQLiteImporter
from migrate import MigrationOrchestrator


class TestFullMigrationWorkflow:
    """Test complete migration workflow."""

    @patch('export_from_postgres.psycopg2.connect')
    def test_export_import_cycle(
        self,
        mock_pg_connect,
        tmp_path,
        sqlite_schema_path,
        sample_user_data,
        sample_clients,
        sample_birth_data,
        sample_charts,
    ):
        """Test complete export → import cycle."""
        # Setup mock PostgreSQL connection
        import psycopg2.extras

        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        def execute_side_effect(query, params=None):
            if "SELECT id, full_name FROM users" in query:
                mock_cursor.fetchone.return_value = (
                    sample_user_data["user"]["id"],
                    sample_user_data["user"]["full_name"],
                )
            elif "SELECT * FROM users" in query:
                mock_cursor.fetchone.return_value = sample_user_data["user"]
            elif "SELECT * FROM user_preferences" in query:
                mock_cursor.fetchone.return_value = sample_user_data["preferences"]
            elif "SELECT * FROM clients" in query:
                mock_cursor.fetchall.return_value = sample_clients
            elif "SELECT * FROM birth_data" in query:
                mock_cursor.fetchall.return_value = sample_birth_data
            elif "SELECT * FROM charts" in query:
                mock_cursor.fetchall.return_value = sample_charts
            else:
                mock_cursor.fetchall.return_value = []
                mock_cursor.fetchone.return_value = None

        mock_cursor.execute.side_effect = execute_side_effect
        mock_conn.cursor.return_value.__enter__ = lambda self: mock_cursor
        mock_conn.cursor.return_value.__exit__ = lambda self, *args: None
        mock_pg_connect.return_value = mock_conn

        # Setup paths
        migration_dir = tmp_path / "migration_data"
        migration_dir.mkdir()
        db_path = tmp_path / "test.db"

        # Phase 1: Export
        with patch('export_from_postgres.MIGRATION_DATA_DIR', migration_dir):
            exporter = PostgreSQLExporter("postgresql://test", "test@example.com")
            checksums = exporter.export_all()

        # Verify export files created
        assert (migration_dir / "user_data.json").exists()
        assert (migration_dir / "clients.json").exists()
        assert (migration_dir / "manifest.json").exists()

        # Verify checksums
        assert "user_data.json" in checksums
        assert "clients.json" in checksums

        # Phase 2: Import
        with patch('import_to_sqlite.MIGRATION_DATA_DIR', migration_dir):
            importer = SQLiteImporter(db_path, sqlite_schema_path)
            importer.import_all()

        # Phase 3: Verify imported data
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check clients
        cursor.execute("SELECT COUNT(*) FROM clients")
        assert cursor.fetchone()[0] == len(sample_clients)

        # Check birth_data
        cursor.execute("SELECT COUNT(*) FROM birth_data")
        assert cursor.fetchone()[0] == len(sample_birth_data)

        # Check charts
        cursor.execute("SELECT COUNT(*) FROM charts")
        assert cursor.fetchone()[0] == len(sample_charts)

        # Verify a specific client
        cursor.execute("SELECT first_name, last_name FROM clients WHERE id = ?", (sample_clients[0]["id"],))
        result = cursor.fetchone()
        assert result[0] == sample_clients[0]["first_name"]
        assert result[1] == sample_clients[0]["last_name"]

        conn.close()

    def test_migration_preserves_relationships(
        self,
        tmp_path,
        sqlite_schema_path,
        sample_export_files,
    ):
        """Test that migration preserves foreign key relationships."""
        db_path = tmp_path / "test.db"

        # Import
        with patch('import_to_sqlite.MIGRATION_DATA_DIR', sample_export_files):
            importer = SQLiteImporter(db_path, sqlite_schema_path)
            importer.import_all()

        # Verify relationships
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        cursor = conn.cursor()

        # Check foreign key integrity
        cursor.execute("PRAGMA foreign_key_check")
        violations = cursor.fetchall()
        assert len(violations) == 0, f"Found foreign key violations: {violations}"

        # Test a specific relationship
        cursor.execute("""
            SELECT c.first_name, bd.birth_date
            FROM clients c
            JOIN birth_data bd ON bd.client_id = c.id
        """)
        results = cursor.fetchall()
        assert len(results) > 0, "No clients with birth_data found"

        conn.close()

    def test_migration_preserves_data_integrity(
        self,
        tmp_path,
        sqlite_schema_path,
        sample_export_files,
    ):
        """Test that migration preserves data integrity."""
        db_path = tmp_path / "test.db"

        # Load manifest to get expected counts
        with open(sample_export_files / "manifest.json") as f:
            manifest = json.load(f)

        # Import
        with patch('import_to_sqlite.MIGRATION_DATA_DIR', sample_export_files):
            importer = SQLiteImporter(db_path, sqlite_schema_path)
            importer.import_all()

        # Verify counts match manifest
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        for table, expected_count in manifest["row_counts"].items():
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            actual_count = cursor.fetchone()[0]

            # location_cache might have fewer due to INSERT OR IGNORE
            if table == "location_cache":
                assert actual_count <= expected_count
            else:
                assert actual_count == expected_count, f"{table}: expected {expected_count}, got {actual_count}"

        conn.close()


class TestMigrationOrchestrator:
    """Test MigrationOrchestrator class."""

    def test_orchestrator_initialization(self, tmp_path, sqlite_schema_path):
        """Test orchestrator initialization."""
        db_path = tmp_path / "test.db"

        orchestrator = MigrationOrchestrator(
            postgres_url="postgresql://test",
            sqlite_path=db_path,
            user_email="test@example.com",
        )

        assert orchestrator.postgres_url == "postgresql://test"
        assert orchestrator.sqlite_path == db_path
        assert orchestrator.user_email == "test@example.com"
        assert orchestrator.skip_export is False
        assert orchestrator.skip_import is False
        assert orchestrator.skip_validation is False

    def test_orchestrator_skip_flags(self, tmp_path):
        """Test orchestrator with skip flags."""
        db_path = tmp_path / "test.db"

        orchestrator = MigrationOrchestrator(
            postgres_url="postgresql://test",
            sqlite_path=db_path,
            user_email="test@example.com",
            skip_export=True,
            skip_validation=True,
        )

        assert orchestrator.skip_export is True
        assert orchestrator.skip_validation is True

    def test_orchestrator_backup_creation(self, tmp_path, sqlite_schema_path):
        """Test that orchestrator creates backups."""
        db_path = tmp_path / "test.db"
        backup_dir = tmp_path / "backups"
        backup_dir.mkdir()

        # Create existing database
        conn = sqlite3.connect(db_path)
        conn.execute("CREATE TABLE test (id INTEGER)")
        conn.close()

        # Create orchestrator
        with patch('migrate.BACKUP_DIR', backup_dir):
            orchestrator = MigrationOrchestrator(
                postgres_url="postgresql://test",
                sqlite_path=db_path,
                user_email="test@example.com",
            )

            backup_path = orchestrator.create_backup()

        # Verify backup created
        assert backup_path is not None
        assert backup_path.exists()
        assert backup_path.parent == backup_dir

    def test_orchestrator_no_backup_if_no_db(self, tmp_path):
        """Test that no backup is created if database doesn't exist."""
        db_path = tmp_path / "nonexistent.db"

        orchestrator = MigrationOrchestrator(
            postgres_url="postgresql://test",
            sqlite_path=db_path,
            user_email="test@example.com",
        )

        backup_path = orchestrator.create_backup()
        assert backup_path is None


class TestMigrationEdgeCases:
    """Test edge cases in migration."""

    def test_migration_with_empty_tables(self, tmp_path, sqlite_schema_path):
        """Test migration with empty tables."""
        migration_dir = tmp_path / "migration_data"
        migration_dir.mkdir()

        # Create manifest and empty JSON files
        manifest = {
            "export_timestamp": "2024-01-01T00:00:00",
            "user_email": "test@example.com",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "row_counts": {},
            "checksums": {},
        }

        with open(migration_dir / "manifest.json", "w") as f:
            json.dump(manifest, f)

        # Create empty JSON files for all tables
        tables = [
            "user_data", "clients", "birth_data", "charts",
            "chart_interpretations", "interpretations",
            "aspect_patterns", "transit_events", "session_notes", "location_cache"
        ]

        for table in tables:
            if table == "user_data":
                with open(migration_dir / f"{table}.json", "w") as f:
                    json.dump({"user": {"password_hash": "test"}, "preferences": None}, f)
            else:
                with open(migration_dir / f"{table}.json", "w") as f:
                    json.dump([], f)

        # Import
        db_path = tmp_path / "test.db"

        with patch('import_to_sqlite.MIGRATION_DATA_DIR', migration_dir):
            importer = SQLiteImporter(db_path, sqlite_schema_path)
            importer.import_all()

        # Verify database created but empty
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM clients")
        assert cursor.fetchone()[0] == 0

        conn.close()

    def test_migration_with_large_json_fields(self, tmp_path, sqlite_schema_path):
        """Test migration with large JSON data."""
        migration_dir = tmp_path / "migration_data"
        migration_dir.mkdir()

        # Create chart with large JSON data
        large_chart_data = {
            "planets": {f"planet_{i}": {"longitude": i * 10.5} for i in range(100)},
            "aspects": [{"planet1": f"p{i}", "planet2": f"p{j}", "orb": 1.5} for i in range(10) for j in range(10)],
        }

        charts = [{
            "id": "ch111111-1111-1111-1111-111111111111",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "client_id": "c1111111-1111-1111-1111-111111111111",
            "birth_data_id": "b1111111-1111-1111-1111-111111111111",
            "chart_type": "natal",
            "astro_system": "western",
            "chart_data": large_chart_data,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]

        clients = [{
            "id": "c1111111-1111-1111-1111-111111111111",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "first_name": "Test",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]

        birth_data = [{
            "id": "b1111111-1111-1111-1111-111111111111",
            "client_id": "c1111111-1111-1111-1111-111111111111",
            "birth_date": "1990-01-01",
            "latitude": 0.0,
            "longitude": 0.0,
            "timezone": "UTC",
            "time_unknown": False,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }]

        # Save files
        with open(migration_dir / "user_data.json", "w") as f:
            json.dump({"user": {"password_hash": "test"}, "preferences": None}, f)

        with open(migration_dir / "clients.json", "w") as f:
            json.dump(clients, f)

        with open(migration_dir / "birth_data.json", "w") as f:
            json.dump(birth_data, f)

        with open(migration_dir / "charts.json", "w") as f:
            json.dump(charts, f)

        for table in ["chart_interpretations", "interpretations", "aspect_patterns", "transit_events", "session_notes", "location_cache"]:
            with open(migration_dir / f"{table}.json", "w") as f:
                json.dump([], f)

        manifest = {
            "export_timestamp": "2024-01-01T00:00:00",
            "user_email": "test@example.com",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "row_counts": {"clients": 1, "charts": 1},
            "checksums": {},
        }

        with open(migration_dir / "manifest.json", "w") as f:
            json.dump(manifest, f)

        # Import
        db_path = tmp_path / "test.db"

        with patch('import_to_sqlite.MIGRATION_DATA_DIR', migration_dir):
            importer = SQLiteImporter(db_path, sqlite_schema_path)
            importer.import_all()

        # Verify large JSON preserved
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT chart_data FROM charts WHERE id = ?", ("ch111111-1111-1111-1111-111111111111",))
        result = cursor.fetchone()

        retrieved_data = json.loads(result[0])
        assert len(retrieved_data["planets"]) == 100
        assert len(retrieved_data["aspects"]) == 100

        conn.close()
