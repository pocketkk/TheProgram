"""
Pytest fixtures for migration tests.

This module provides:
- PostgreSQL test database fixtures
- SQLite test database fixtures
- Sample test data
- Cleanup fixtures
"""
import json
import logging
import os
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Generator, List
from unittest.mock import MagicMock, patch

import psycopg2
import psycopg2.extras
import pytest

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest.fixture
def sample_user_data() -> Dict[str, Any]:
    """Sample user and preferences data."""
    return {
        "user": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "email": "test@example.com",
            "full_name": "Test User",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyGPEZBrZB/.",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
        "preferences": {
            "id": "223e4567-e89b-12d3-a456-426614174001",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "default_house_system": "placidus",
            "default_ayanamsa": "lahiri",
            "default_zodiac": "tropical",
            "aspect_orbs": {"conjunction": 10, "opposition": 10, "trine": 8},
            "color_scheme": "dark",
            "displayed_points": ["sun", "moon", "mercury", "venus", "mars"],
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
    }


@pytest.fixture
def sample_clients() -> List[Dict[str, Any]]:
    """Sample client data."""
    return [
        {
            "id": "c1111111-1111-1111-1111-111111111111",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1-555-0101",
            "notes": "Test client 1",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
        {
            "id": "c2222222-2222-2222-2222-222222222222",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane@example.com",
            "phone": "+1-555-0102",
            "notes": "Test client 2",
            "created_at": "2024-01-02T00:00:00",
            "updated_at": "2024-01-02T00:00:00",
        },
    ]


@pytest.fixture
def sample_birth_data() -> List[Dict[str, Any]]:
    """Sample birth data."""
    return [
        {
            "id": "b1111111-1111-1111-1111-111111111111",
            "client_id": "c1111111-1111-1111-1111-111111111111",
            "birth_date": "1990-01-15",
            "birth_time": "14:30:00",
            "time_unknown": False,
            "latitude": 40.7128,
            "longitude": -74.0060,
            "timezone": "America/New_York",
            "utc_offset": -300,
            "city": "New York",
            "state_province": "NY",
            "country": "USA",
            "rodden_rating": "AA",
            "gender": "male",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
        {
            "id": "b2222222-2222-2222-2222-222222222222",
            "client_id": "c2222222-2222-2222-2222-222222222222",
            "birth_date": "1985-06-20",
            "birth_time": None,
            "time_unknown": True,
            "latitude": 34.0522,
            "longitude": -118.2437,
            "timezone": "America/Los_Angeles",
            "utc_offset": -480,
            "city": "Los Angeles",
            "state_province": "CA",
            "country": "USA",
            "rodden_rating": "X",
            "gender": "female",
            "created_at": "2024-01-02T00:00:00",
            "updated_at": "2024-01-02T00:00:00",
        },
    ]


@pytest.fixture
def sample_charts() -> List[Dict[str, Any]]:
    """Sample chart data."""
    return [
        {
            "id": "ch111111-1111-1111-1111-111111111111",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",
            "client_id": "c1111111-1111-1111-1111-111111111111",
            "birth_data_id": "b1111111-1111-1111-1111-111111111111",
            "chart_name": "Natal Chart",
            "chart_type": "natal",
            "astro_system": "western",
            "house_system": "placidus",
            "ayanamsa": None,
            "zodiac_type": "tropical",
            "calculation_params": {"node_type": "true"},
            "chart_data": {
                "planets": {"sun": {"longitude": 295.5, "sign": 9, "house": 1}},
                "houses": {"cusps": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]},
                "aspects": [{"planet1": "sun", "planet2": "moon", "type": "trine", "orb": 2.5}],
            },
            "last_viewed": "2024-01-05T10:00:00",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
    ]


@pytest.fixture
def sample_interpretations() -> List[Dict[str, Any]]:
    """Sample interpretation data."""
    return [
        {
            "id": "i1111111-1111-1111-1111-111111111111",
            "user_id": None,  # Default interpretation
            "interpretation_type": "planet_in_sign",
            "key_identifier": "sun_in_capricorn",
            "tradition": "western",
            "text_content": "Sun in Capricorn gives ambition and discipline.",
            "source": "Classical Astrology",
            "is_user_custom": False,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
        {
            "id": "i2222222-2222-2222-2222-222222222222",
            "user_id": "123e4567-e89b-12d3-a456-426614174000",  # User custom
            "interpretation_type": "planet_in_sign",
            "key_identifier": "moon_in_cancer",
            "tradition": "western",
            "text_content": "Custom interpretation for Moon in Cancer.",
            "source": "custom",
            "is_user_custom": True,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
    ]


@pytest.fixture
def sample_location_cache() -> List[Dict[str, Any]]:
    """Sample location cache data."""
    return [
        {
            "id": "l1111111-1111-1111-1111-111111111111",
            "city_name": "New York",
            "state_province": "NY",
            "country": "USA",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "timezone": "America/New_York",
            "geonames_id": 5128581,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        },
    ]


# ============================================================================
# Temporary Directory Fixtures
# ============================================================================

@pytest.fixture
def temp_dir(tmp_path) -> Generator[Path, None, None]:
    """Temporary directory for test files."""
    yield tmp_path


@pytest.fixture
def temp_migration_dir(tmp_path) -> Generator[Path, None, None]:
    """Temporary directory for migration data."""
    migration_dir = tmp_path / "migration_data"
    migration_dir.mkdir()
    yield migration_dir


@pytest.fixture
def temp_backup_dir(tmp_path) -> Generator[Path, None, None]:
    """Temporary directory for backups."""
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    yield backup_dir


# ============================================================================
# SQLite Database Fixtures
# ============================================================================

@pytest.fixture
def sqlite_schema_path() -> Path:
    """Path to SQLite schema file."""
    return Path(__file__).parent.parent.parent / "schema_design" / "sqlite_schema.sql"


@pytest.fixture
def sqlite_conn(sqlite_schema_path, tmp_path) -> Generator[sqlite3.Connection, None, None]:
    """
    SQLite database connection with schema loaded.

    Creates a temporary SQLite database with the full schema.
    """
    db_path = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")

    # Load schema
    with open(sqlite_schema_path, "r") as f:
        schema_sql = f.read()

    conn.executescript(schema_sql)
    conn.commit()

    yield conn

    conn.close()
    if db_path.exists():
        db_path.unlink()


@pytest.fixture
def sqlite_memory_conn(sqlite_schema_path) -> Generator[sqlite3.Connection, None, None]:
    """
    In-memory SQLite database for fast tests.

    Use this for tests that don't need persistence.
    """
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")

    # Load schema
    with open(sqlite_schema_path, "r") as f:
        schema_sql = f.read()

    conn.executescript(schema_sql)
    conn.commit()

    yield conn

    conn.close()


@pytest.fixture
def populated_sqlite_conn(
    sqlite_conn,
    sample_clients,
    sample_birth_data,
    sample_charts,
) -> Generator[sqlite3.Connection, None, None]:
    """
    SQLite database populated with sample data.
    """
    cursor = sqlite_conn.cursor()

    # Insert clients
    for client in sample_clients:
        cursor.execute(
            """
            INSERT INTO clients (id, first_name, last_name, email, phone, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                client["id"],
                client["first_name"],
                client["last_name"],
                client["email"],
                client["phone"],
                client["notes"],
                client["created_at"],
                client["updated_at"],
            ),
        )

    # Insert birth data
    for bd in sample_birth_data:
        cursor.execute(
            """
            INSERT INTO birth_data (
                id, client_id, birth_date, birth_time, time_unknown,
                latitude, longitude, timezone, utc_offset,
                city, state_province, country, rodden_rating, gender,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                bd["id"],
                bd["client_id"],
                bd["birth_date"],
                bd.get("birth_time"),
                1 if bd["time_unknown"] else 0,
                bd["latitude"],
                bd["longitude"],
                bd["timezone"],
                bd.get("utc_offset"),
                bd.get("city"),
                bd.get("state_province"),
                bd.get("country"),
                bd.get("rodden_rating"),
                bd.get("gender"),
                bd["created_at"],
                bd["updated_at"],
            ),
        )

    # Insert charts
    for chart in sample_charts:
        cursor.execute(
            """
            INSERT INTO charts (
                id, client_id, birth_data_id, chart_name, chart_type,
                astro_system, house_system, ayanamsa, zodiac_type,
                calculation_params, chart_data, last_viewed,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                chart["id"],
                chart.get("client_id"),
                chart["birth_data_id"],
                chart.get("chart_name"),
                chart["chart_type"],
                chart["astro_system"],
                chart.get("house_system"),
                chart.get("ayanamsa"),
                chart.get("zodiac_type", "tropical"),
                json.dumps(chart.get("calculation_params")) if chart.get("calculation_params") else None,
                json.dumps(chart["chart_data"]),
                chart.get("last_viewed"),
                chart["created_at"],
                chart["updated_at"],
            ),
        )

    sqlite_conn.commit()

    yield sqlite_conn


# ============================================================================
# Mock PostgreSQL Fixtures
# ============================================================================

@pytest.fixture
def mock_postgres_conn(
    sample_user_data,
    sample_clients,
    sample_birth_data,
    sample_charts,
    sample_interpretations,
):
    """
    Mock PostgreSQL connection for testing without real database.

    This fixture provides a MagicMock that returns sample data
    when queried, allowing tests to run without a real PostgreSQL database.
    """
    mock_conn = MagicMock()
    mock_cursor = MagicMock()

    # Configure cursor to return sample data
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
        elif "SELECT * FROM interpretations" in query:
            mock_cursor.fetchall.return_value = sample_interpretations
        else:
            mock_cursor.fetchall.return_value = []
            mock_cursor.fetchone.return_value = None

    mock_cursor.execute.side_effect = execute_side_effect
    mock_cursor.__enter__ = lambda self: mock_cursor
    mock_cursor.__exit__ = lambda self, *args: None

    mock_conn.cursor.return_value = mock_cursor

    yield mock_conn


# ============================================================================
# JSON Export/Import Fixtures
# ============================================================================

@pytest.fixture
def sample_export_files(
    temp_migration_dir,
    sample_user_data,
    sample_clients,
    sample_birth_data,
    sample_charts,
    sample_interpretations,
    sample_location_cache,
) -> Generator[Path, None, None]:
    """
    Create sample JSON export files for import testing.
    """
    # Save user data
    with open(temp_migration_dir / "user_data.json", "w") as f:
        json.dump(sample_user_data, f, indent=2)

    # Save clients
    with open(temp_migration_dir / "clients.json", "w") as f:
        json.dump(sample_clients, f, indent=2)

    # Save birth data
    with open(temp_migration_dir / "birth_data.json", "w") as f:
        json.dump(sample_birth_data, f, indent=2)

    # Save charts
    with open(temp_migration_dir / "charts.json", "w") as f:
        json.dump(sample_charts, f, indent=2)

    # Save interpretations
    with open(temp_migration_dir / "interpretations.json", "w") as f:
        json.dump(sample_interpretations, f, indent=2)

    # Save location cache
    with open(temp_migration_dir / "location_cache.json", "w") as f:
        json.dump(sample_location_cache, f, indent=2)

    # Save empty files for other tables
    for table in ["chart_interpretations", "aspect_patterns", "transit_events", "session_notes"]:
        with open(temp_migration_dir / f"{table}.json", "w") as f:
            json.dump([], f)

    # Create manifest
    manifest = {
        "export_timestamp": datetime.utcnow().isoformat(),
        "user_email": "test@example.com",
        "user_id": sample_user_data["user"]["id"],
        "row_counts": {
            "clients": len(sample_clients),
            "birth_data": len(sample_birth_data),
            "charts": len(sample_charts),
            "interpretations": len(sample_interpretations),
            "location_cache": len(sample_location_cache),
        },
        "checksums": {},
    }

    with open(temp_migration_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    yield temp_migration_dir


# ============================================================================
# Utility Fixtures
# ============================================================================

@pytest.fixture
def captured_logs(caplog):
    """Capture log messages for validation."""
    caplog.set_level(logging.INFO)
    return caplog


@pytest.fixture(autouse=True)
def reset_environment():
    """Reset environment variables before each test."""
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)
