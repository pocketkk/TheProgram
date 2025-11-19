"""
Test foreign key relationships after migration.

This module verifies that all foreign key relationships are intact
and referential integrity is maintained after migration.
"""
import sqlite3
from pathlib import Path

import pytest


class TestForeignKeyRelationships:
    """Test foreign key relationships."""

    def test_birth_data_client_relationship(self, populated_sqlite_conn):
        """Test that all birth_data records have valid client_id."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Check for orphaned birth_data (no matching client)
        cursor.execute("""
            SELECT COUNT(*)
            FROM birth_data bd
            WHERE bd.client_id NOT IN (SELECT id FROM clients)
        """)

        orphaned_count = cursor.fetchone()[0]
        assert orphaned_count == 0, f"Found {orphaned_count} orphaned birth_data records"

    def test_charts_client_relationship(self, populated_sqlite_conn):
        """Test that all charts with client_id have valid clients."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Check for orphaned charts (no matching client)
        cursor.execute("""
            SELECT COUNT(*)
            FROM charts ch
            WHERE ch.client_id IS NOT NULL
              AND ch.client_id NOT IN (SELECT id FROM clients)
        """)

        orphaned_count = cursor.fetchone()[0]
        assert orphaned_count == 0, f"Found {orphaned_count} orphaned charts (client_id)"

    def test_charts_birth_data_relationship(self, populated_sqlite_conn):
        """Test that all charts have valid birth_data_id."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Check for orphaned charts (no matching birth_data)
        cursor.execute("""
            SELECT COUNT(*)
            FROM charts ch
            WHERE ch.birth_data_id NOT IN (SELECT id FROM birth_data)
        """)

        orphaned_count = cursor.fetchone()[0]
        assert orphaned_count == 0, f"Found {orphaned_count} orphaned charts (birth_data_id)"

    def test_chart_interpretations_relationship(self, sqlite_conn, sample_clients, sample_birth_data, sample_charts):
        """Test that all chart_interpretations have valid chart_id."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert test data with chart interpretation
        import json

        client = sample_clients[0]
        cursor.execute(
            "INSERT INTO clients (id, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (client["id"], client["first_name"], client["last_name"], client["created_at"], client["updated_at"])
        )

        bd = sample_birth_data[0]
        cursor.execute(
            """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (bd["id"], bd["client_id"], bd["birth_date"], bd["latitude"], bd["longitude"], bd["timezone"], 0, bd["created_at"], bd["updated_at"])
        )

        chart = sample_charts[0]
        cursor.execute(
            """INSERT INTO charts (id, client_id, birth_data_id, chart_type, astro_system, chart_data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (chart["id"], chart.get("client_id"), chart["birth_data_id"], chart["chart_type"], chart["astro_system"],
             json.dumps(chart["chart_data"]), chart["created_at"], chart["updated_at"])
        )

        # Insert chart interpretation
        cursor.execute(
            """INSERT INTO chart_interpretations (id, chart_id, element_type, element_key, ai_description, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            ("ci111111-1111-1111-1111-111111111111", chart["id"], "planet", "sun", "Test", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Verify no orphaned interpretations
        cursor.execute("""
            SELECT COUNT(*)
            FROM chart_interpretations ci
            WHERE ci.chart_id NOT IN (SELECT id FROM charts)
        """)

        orphaned_count = cursor.fetchone()[0]
        assert orphaned_count == 0

    def test_session_notes_relationship(self, sqlite_conn, sample_clients):
        """Test that all session_notes have valid client_id."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert client and session note
        client = sample_clients[0]
        cursor.execute(
            "INSERT INTO clients (id, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (client["id"], client["first_name"], client["last_name"], client["created_at"], client["updated_at"])
        )

        cursor.execute(
            """INSERT INTO session_notes (id, client_id, note_date, note_content, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            ("n1111111-1111-1111-1111-111111111111", client["id"], "2024-01-01", "Test note", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Verify no orphaned session notes
        cursor.execute("""
            SELECT COUNT(*)
            FROM session_notes sn
            WHERE sn.client_id NOT IN (SELECT id FROM clients)
        """)

        orphaned_count = cursor.fetchone()[0]
        assert orphaned_count == 0

    def test_foreign_key_check_pragma(self, populated_sqlite_conn):
        """Test using PRAGMA foreign_key_check."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Run foreign key check
        cursor.execute("PRAGMA foreign_key_check")
        violations = cursor.fetchall()

        assert len(violations) == 0, f"Found {len(violations)} foreign key violations: {violations}"

    def test_relationships_join_queries(self, populated_sqlite_conn):
        """Test that common join queries work correctly."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Join clients with birth_data
        cursor.execute("""
            SELECT c.id, c.first_name, bd.birth_date
            FROM clients c
            JOIN birth_data bd ON bd.client_id = c.id
        """)
        results = cursor.fetchall()
        assert len(results) > 0

        # Join charts with birth_data and clients
        cursor.execute("""
            SELECT ch.id, ch.chart_name, c.first_name, bd.birth_date
            FROM charts ch
            LEFT JOIN clients c ON ch.client_id = c.id
            JOIN birth_data bd ON ch.birth_data_id = bd.id
        """)
        results = cursor.fetchall()
        # Should work even if no charts in test data

    def test_null_foreign_keys_allowed(self, sqlite_conn, sample_birth_data):
        """Test that NULL foreign keys are allowed where appropriate."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # charts.client_id can be NULL (for ephemeris charts)
        # First need birth_data
        cursor.execute(
            """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sample_birth_data[0]["id"], sample_birth_data[0]["client_id"], sample_birth_data[0]["birth_date"],
             sample_birth_data[0]["latitude"], sample_birth_data[0]["longitude"], sample_birth_data[0]["timezone"],
             0, sample_birth_data[0]["created_at"], sample_birth_data[0]["updated_at"])
        )

        # But first need the client for birth_data
        cursor.execute(
            """INSERT INTO clients (id, first_name, created_at, updated_at)
               VALUES (?, ?, ?, ?)""",
            (sample_birth_data[0]["client_id"], "Test", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )

        # Now create chart with NULL client_id
        import json
        cursor.execute(
            """INSERT INTO charts (
                id, client_id, birth_data_id, chart_type, astro_system, chart_data, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            ("ch999999-9999-9999-9999-999999999999", None, sample_birth_data[0]["id"], "natal", "western",
             json.dumps({"planets": {}}), "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Verify chart created with NULL client_id
        cursor.execute("SELECT client_id FROM charts WHERE id = ?", ("ch999999-9999-9999-9999-999999999999",))
        result = cursor.fetchone()
        assert result[0] is None


class TestReferentialIntegrity:
    """Test referential integrity constraints."""

    def test_cannot_insert_birth_data_with_invalid_client(self, sqlite_conn):
        """Test that birth_data insert fails with invalid client_id."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Try to insert birth_data with non-existent client_id
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                """INSERT INTO birth_data (id, client_id, birth_date, latitude, longitude, timezone, time_unknown, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("bd999999-9999-9999-9999-999999999999", "invalid-client-id", "2024-01-01", 0.0, 0.0, "UTC", 0,
                 "2024-01-01T00:00:00", "2024-01-01T00:00:00")
            )

    def test_cannot_insert_chart_with_invalid_birth_data(self, sqlite_conn):
        """Test that chart insert fails with invalid birth_data_id."""
        conn = sqlite_conn
        cursor = conn.cursor()

        import json

        # Try to insert chart with non-existent birth_data_id
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                """INSERT INTO charts (id, birth_data_id, chart_type, astro_system, chart_data, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                ("ch999999-9999-9999-9999-999999999999", "invalid-birth-data-id", "natal", "western",
                 json.dumps({"planets": {}}), "2024-01-01T00:00:00", "2024-01-01T00:00:00")
            )

    def test_cannot_insert_chart_interpretation_with_invalid_chart(self, sqlite_conn):
        """Test that chart_interpretation insert fails with invalid chart_id."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Try to insert interpretation with non-existent chart_id
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                """INSERT INTO chart_interpretations (id, chart_id, element_type, element_key, ai_description, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                ("ci999999-9999-9999-9999-999999999999", "invalid-chart-id", "planet", "sun", "Test",
                 "2024-01-01T00:00:00", "2024-01-01T00:00:00")
            )

    def test_cannot_update_to_invalid_foreign_key(self, populated_sqlite_conn):
        """Test that updating to invalid foreign key fails."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Get a birth_data record
        cursor.execute("SELECT id FROM birth_data LIMIT 1")
        bd_id = cursor.fetchone()[0]

        # Try to update to invalid client_id
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                "UPDATE birth_data SET client_id = ? WHERE id = ?",
                ("invalid-client-id", bd_id)
            )
