"""
Test CASCADE delete functionality after migration.

This module verifies that foreign key CASCADE deletes work correctly
in the migrated SQLite database.
"""
import json
import sqlite3
from pathlib import Path

import pytest


class TestCascadeDeletes:
    """Test CASCADE delete operations."""

    def test_delete_client_cascades_to_birth_data(self, populated_sqlite_conn):
        """Test that deleting a client deletes related birth_data."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Get a client ID with birth data
        cursor.execute("""
            SELECT c.id
            FROM clients c
            JOIN birth_data bd ON bd.client_id = c.id
            LIMIT 1
        """)
        client_id = cursor.fetchone()[0]

        # Count birth_data before delete
        cursor.execute("SELECT COUNT(*) FROM birth_data WHERE client_id = ?", (client_id,))
        birth_data_before = cursor.fetchone()[0]
        assert birth_data_before > 0

        # Delete client
        cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
        conn.commit()

        # Verify birth_data cascade deleted
        cursor.execute("SELECT COUNT(*) FROM birth_data WHERE client_id = ?", (client_id,))
        birth_data_after = cursor.fetchone()[0]
        assert birth_data_after == 0

    def test_delete_client_cascades_to_charts(self, populated_sqlite_conn):
        """Test that deleting a client deletes related charts."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Get a client ID with charts
        cursor.execute("""
            SELECT c.id
            FROM clients c
            JOIN charts ch ON ch.client_id = c.id
            LIMIT 1
        """)
        result = cursor.fetchone()

        if not result:
            pytest.skip("No clients with charts in test data")

        client_id = result[0]

        # Count charts before delete
        cursor.execute("SELECT COUNT(*) FROM charts WHERE client_id = ?", (client_id,))
        charts_before = cursor.fetchone()[0]
        assert charts_before > 0

        # Delete client
        cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
        conn.commit()

        # Verify charts cascade deleted
        cursor.execute("SELECT COUNT(*) FROM charts WHERE client_id = ?", (client_id,))
        charts_after = cursor.fetchone()[0]
        assert charts_after == 0

    def test_delete_client_cascades_to_session_notes(self, sqlite_conn, sample_clients):
        """Test that deleting a client deletes related session notes."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert client
        client = sample_clients[0]
        cursor.execute(
            "INSERT INTO clients (id, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (client["id"], client["first_name"], client["last_name"], client["created_at"], client["updated_at"])
        )

        # Insert session note
        note_id = "n1111111-1111-1111-1111-111111111111"
        cursor.execute(
            """INSERT INTO session_notes (id, client_id, note_date, note_content, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (note_id, client["id"], "2024-01-01", "Test note", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Verify session note exists
        cursor.execute("SELECT COUNT(*) FROM session_notes WHERE client_id = ?", (client["id"],))
        assert cursor.fetchone()[0] == 1

        # Delete client
        cursor.execute("DELETE FROM clients WHERE id = ?", (client["id"],))
        conn.commit()

        # Verify session note cascade deleted
        cursor.execute("SELECT COUNT(*) FROM session_notes WHERE client_id = ?", (client["id"],))
        assert cursor.fetchone()[0] == 0

    def test_delete_birth_data_cascades_to_charts(self, populated_sqlite_conn):
        """Test that deleting birth_data deletes related charts."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Get a birth_data ID with charts
        cursor.execute("""
            SELECT bd.id
            FROM birth_data bd
            JOIN charts ch ON ch.birth_data_id = bd.id
            LIMIT 1
        """)
        result = cursor.fetchone()

        if not result:
            pytest.skip("No birth_data with charts in test data")

        birth_data_id = result[0]

        # Count charts before delete
        cursor.execute("SELECT COUNT(*) FROM charts WHERE birth_data_id = ?", (birth_data_id,))
        charts_before = cursor.fetchone()[0]
        assert charts_before > 0

        # Delete birth_data
        cursor.execute("DELETE FROM birth_data WHERE id = ?", (birth_data_id,))
        conn.commit()

        # Verify charts cascade deleted
        cursor.execute("SELECT COUNT(*) FROM charts WHERE birth_data_id = ?", (birth_data_id,))
        charts_after = cursor.fetchone()[0]
        assert charts_after == 0

    def test_delete_chart_cascades_to_interpretations(self, sqlite_conn, sample_clients, sample_birth_data, sample_charts):
        """Test that deleting a chart deletes related chart_interpretations."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert test data
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
        interp_id = "ci111111-1111-1111-1111-111111111111"
        cursor.execute(
            """INSERT INTO chart_interpretations (id, chart_id, element_type, element_key, ai_description, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (interp_id, chart["id"], "planet", "sun", "Test interpretation", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Verify interpretation exists
        cursor.execute("SELECT COUNT(*) FROM chart_interpretations WHERE chart_id = ?", (chart["id"],))
        assert cursor.fetchone()[0] == 1

        # Delete chart
        cursor.execute("DELETE FROM charts WHERE id = ?", (chart["id"],))
        conn.commit()

        # Verify interpretation cascade deleted
        cursor.execute("SELECT COUNT(*) FROM chart_interpretations WHERE chart_id = ?", (chart["id"],))
        assert cursor.fetchone()[0] == 0

    def test_delete_chart_cascades_to_aspect_patterns(self, sqlite_conn, sample_clients, sample_birth_data, sample_charts):
        """Test that deleting a chart deletes related aspect_patterns."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert test data
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

        # Insert aspect pattern
        pattern_id = "ap111111-1111-1111-1111-111111111111"
        cursor.execute(
            """INSERT INTO aspect_patterns (id, chart_id, pattern_type, planets_involved, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (pattern_id, chart["id"], "grand_trine", json.dumps(["sun", "moon", "jupiter"]), "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Verify pattern exists
        cursor.execute("SELECT COUNT(*) FROM aspect_patterns WHERE chart_id = ?", (chart["id"],))
        assert cursor.fetchone()[0] == 1

        # Delete chart
        cursor.execute("DELETE FROM charts WHERE id = ?", (chart["id"],))
        conn.commit()

        # Verify pattern cascade deleted
        cursor.execute("SELECT COUNT(*) FROM aspect_patterns WHERE chart_id = ?", (chart["id"],))
        assert cursor.fetchone()[0] == 0

    def test_delete_chart_cascades_to_transit_events(self, sqlite_conn, sample_clients, sample_birth_data, sample_charts):
        """Test that deleting a chart deletes related transit_events."""
        conn = sqlite_conn
        cursor = conn.cursor()

        # Insert test data
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

        # Insert transit event
        transit_id = "t1111111-1111-1111-1111-111111111111"
        cursor.execute(
            """INSERT INTO transit_events (id, chart_id, event_date, transiting_planet, natal_planet, aspect_type, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (transit_id, chart["id"], "2024-06-15T00:00:00", "jupiter", "sun", "trine", "2024-01-01T00:00:00", "2024-01-01T00:00:00")
        )
        conn.commit()

        # Verify transit exists
        cursor.execute("SELECT COUNT(*) FROM transit_events WHERE chart_id = ?", (chart["id"],))
        assert cursor.fetchone()[0] == 1

        # Delete chart
        cursor.execute("DELETE FROM charts WHERE id = ?", (chart["id"],))
        conn.commit()

        # Verify transit cascade deleted
        cursor.execute("SELECT COUNT(*) FROM transit_events WHERE chart_id = ?", (chart["id"],))
        assert cursor.fetchone()[0] == 0

    def test_cascade_delete_chain(self, populated_sqlite_conn):
        """Test that deleting a client cascades through entire chain."""
        conn = populated_sqlite_conn
        cursor = conn.cursor()

        # Get a client with full data chain
        cursor.execute("""
            SELECT c.id
            FROM clients c
            JOIN birth_data bd ON bd.client_id = c.id
            JOIN charts ch ON ch.client_id = c.id
            LIMIT 1
        """)
        result = cursor.fetchone()

        if not result:
            pytest.skip("No clients with full data chain in test data")

        client_id = result[0]

        # Count related records before delete
        cursor.execute("SELECT COUNT(*) FROM birth_data WHERE client_id = ?", (client_id,))
        birth_data_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM charts WHERE client_id = ?", (client_id,))
        charts_count = cursor.fetchone()[0]

        # Delete client
        cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
        conn.commit()

        # Verify all related records cascade deleted
        cursor.execute("SELECT COUNT(*) FROM birth_data WHERE client_id = ?", (client_id,))
        assert cursor.fetchone()[0] == 0

        cursor.execute("SELECT COUNT(*) FROM charts WHERE client_id = ?", (client_id,))
        assert cursor.fetchone()[0] == 0

    def test_foreign_keys_enabled(self, sqlite_conn):
        """Verify that foreign keys are enabled in the database."""
        cursor = sqlite_conn.cursor()
        cursor.execute("PRAGMA foreign_keys")
        result = cursor.fetchone()

        assert result[0] == 1, "Foreign keys must be enabled for cascade deletes to work"
