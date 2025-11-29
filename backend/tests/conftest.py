"""
Pytest configuration and shared fixtures
"""
import os
import sys
from datetime import datetime
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.config import settings


# =============================================================================
# Application Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def test_app():
    """
    FastAPI application instance for testing
    Uses session scope - created once per test session
    """
    return app


@pytest.fixture(scope="function")
def client(test_app) -> Generator:
    """
    FastAPI test client
    Uses function scope - new client for each test
    """
    with TestClient(test_app) as test_client:
        yield test_client


# =============================================================================
# Swiss Ephemeris Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def ephemeris_available() -> bool:
    """
    Check if Swiss Ephemeris data files are available
    """
    ephemeris_path = settings.EPHEMERIS_PATH
    if not os.path.exists(ephemeris_path):
        return False

    # Check for essential files
    essential_files = ['seplm18.se1', 'sepl_18.se1']
    for file in essential_files:
        if not os.path.exists(os.path.join(ephemeris_path, file)):
            return False

    return True


@pytest.fixture(scope="session")
def skip_if_no_ephemeris(ephemeris_available):
    """
    Skip tests if ephemeris files are not available
    """
    if not ephemeris_available:
        pytest.skip("Swiss Ephemeris data files not available")


# =============================================================================
# Sample Birth Data Fixtures
# =============================================================================

@pytest.fixture
def sample_birth_data_1():
    """
    Sample birth data: January 15, 1990, 14:30 EST, New York
    """
    return {
        "name": "Test Person 1",
        "birth_date": datetime(1990, 1, 15),
        "birth_time": datetime(1990, 1, 15, 14, 30),
        "timezone_offset": -5 * 60,  # EST (UTC-5)
        "latitude": 40.7128,
        "longitude": -74.0060,
        "city": "New York",
        "country": "USA",
    }


@pytest.fixture
def sample_birth_data_2():
    """
    Sample birth data: July 4, 1985, 08:15 PST, Los Angeles
    """
    return {
        "name": "Test Person 2",
        "birth_date": datetime(1985, 7, 4),
        "birth_time": datetime(1985, 7, 4, 8, 15),
        "timezone_offset": -8 * 60,  # PST (UTC-8)
        "latitude": 34.0522,
        "longitude": -118.2437,
        "city": "Los Angeles",
        "country": "USA",
    }


@pytest.fixture
def sample_birth_data_london():
    """
    Sample birth data: March 21, 2000, 12:00 GMT, London
    """
    return {
        "name": "Test Person London",
        "birth_date": datetime(2000, 3, 21),
        "birth_time": datetime(2000, 3, 21, 12, 0),
        "timezone_offset": 0,  # GMT (UTC+0)
        "latitude": 51.5074,
        "longitude": -0.1278,
        "city": "London",
        "country": "UK",
    }


@pytest.fixture
def sample_birth_data_mumbai():
    """
    Sample birth data: November 14, 1988, 18:45 IST, Mumbai
    For Vedic astrology testing
    """
    return {
        "name": "Test Person Mumbai",
        "birth_date": datetime(1988, 11, 14),
        "birth_time": datetime(1988, 11, 14, 18, 45),
        "timezone_offset": 5 * 60 + 30,  # IST (UTC+5:30)
        "latitude": 19.0760,
        "longitude": 72.8777,
        "city": "Mumbai",
        "country": "India",
    }


# =============================================================================
# Expected Results Fixtures (for validation)
# =============================================================================

@pytest.fixture
def expected_sun_positions():
    """
    Expected Sun positions for sample birth data (for validation)
    Values calculated using professional astrology software
    """
    return {
        "1990-01-15 14:30 EST": {
            "longitude": 294.5,  # Approximate, ~24° Capricorn
            "sign": 9,  # Capricorn (0-indexed)
            "sign_name": "Capricorn",
        },
        "1985-07-04 08:15 PST": {
            "longitude": 102.0,  # Approximate, ~12° Cancer
            "sign": 3,  # Cancer
            "sign_name": "Cancer",
        },
        "2000-03-21 12:00 GMT": {
            "longitude": 0.5,  # Approximate, ~0° Aries (Spring Equinox)
            "sign": 0,  # Aries
            "sign_name": "Aries",
        },
    }


@pytest.fixture
def expected_house_cusps():
    """
    Expected house cusp ranges for sample data
    """
    return {
        # All longitudes should be 0-360
        "valid_range": (0, 360),
        # Ascendant should match 1st house cusp
        "ascendant_equals_1st": True,
    }


# =============================================================================
# Aspect Testing Fixtures
# =============================================================================

@pytest.fixture
def aspect_test_cases():
    """
    Test cases for aspect calculations
    Format: (long1, long2, aspect_type, expected_result)
    """
    return [
        # Exact conjunction (0°)
        (45.0, 45.0, 0, True),
        # Conjunction within orb (8°)
        (45.0, 50.0, 0, True),
        # Conjunction outside orb
        (45.0, 60.0, 0, False),

        # Exact opposition (180°)
        (45.0, 225.0, 180, True),
        # Opposition within orb
        (45.0, 230.0, 180, True),

        # Exact trine (120°)
        (45.0, 165.0, 120, True),
        # Trine within orb
        (45.0, 170.0, 120, True),

        # Exact square (90°)
        (45.0, 135.0, 90, True),
        # Square within orb
        (45.0, 140.0, 90, True),

        # Exact sextile (60°)
        (45.0, 105.0, 60, True),
        # Sextile within orb
        (45.0, 108.0, 60, True),
    ]


# =============================================================================
# House System Testing Fixtures
# =============================================================================

@pytest.fixture
def house_systems_to_test():
    """
    List of house systems that should be tested
    """
    return [
        'placidus',
        'koch',
        'porphyry',
        'regiomontanus',
        'campanus',
        'equal',
        'whole_sign',
    ]


# =============================================================================
# Ayanamsa Testing Fixtures
# =============================================================================

@pytest.fixture
def ayanamsa_systems_to_test():
    """
    List of ayanamsa systems for Vedic calculations
    """
    return [
        'lahiri',
        'raman',
        'krishnamurti',
        'yukteshwar',
        'fagan_bradley',
    ]


# =============================================================================
# SQLite Database Fixtures for Integration Tests
# =============================================================================

@pytest.fixture(scope="function")
def test_db():
    """
    Create a fresh SQLite test database for each test
    Uses in-memory database for fast, isolated tests

    Yields:
        Database session
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app.core.database_sqlite import Base
    from app.models.app_config import AppConfig
    from app.models.user_preferences import UserPreferences

    # Create in-memory database
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign keys for SQLite
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Initialize singleton tables
    config = AppConfig(id=1)
    session.add(config)
    prefs = UserPreferences(id=1)
    session.add(prefs)
    session.commit()

    yield session

    # Cleanup
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client_with_db(test_db):
    """
    FastAPI test client with test database

    Yields:
        TestClient instance with database dependency overridden
    """
    from app.core.database_sqlite import get_db
    from app.main import app

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def db_session(test_db):
    """
    Alias for test_db for backwards compatibility
    """
    return test_db


# =============================================================================
# Utility Fixtures
# =============================================================================

@pytest.fixture
def tolerance():
    """
    Default tolerance for floating point comparisons
    Swiss Ephemeris precision is sub-arcsecond (< 0.001°)
    """
    return {
        "high_precision": 0.001,  # For planetary positions
        "medium_precision": 0.01,  # For house cusps
        "low_precision": 0.1,  # For general comparisons
    }


@pytest.fixture
def valid_longitude_range():
    """Valid range for ecliptic longitude (0-360°)"""
    return (0.0, 360.0)


@pytest.fixture
def valid_latitude_range():
    """Valid range for geographic latitude (-90 to +90)"""
    return (-90.0, 90.0)


# =============================================================================
# Test Data Cleanup
# =============================================================================

@pytest.fixture(autouse=True)
def cleanup_test_data():
    """
    Automatically cleanup any test data after each test
    """
    yield
    # Cleanup code here (if needed)
    pass


# =============================================================================
# Performance Tracking
# =============================================================================

@pytest.fixture(autouse=True)
def track_performance(request):
    """
    Track performance of each test
    """
    import time
    start_time = time.time()
    yield
    duration = time.time() - start_time

    # Log slow tests (> 1 second)
    if duration > 1.0:
        print(f"\n⚠️  SLOW TEST: {request.node.name} took {duration:.2f}s")


# =============================================================================
# Markers for Conditional Skipping
# =============================================================================

def pytest_configure(config):
    """
    Register custom markers
    """
    config.addinivalue_line(
        "markers", "ephemeris: mark test as requiring ephemeris files"
    )
    config.addinivalue_line(
        "markers", "database: mark test as requiring database connection"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )


def pytest_collection_modifyitems(config, items):
    """
    Automatically skip tests based on available resources
    """
    ephemeris_path = os.path.join(os.path.dirname(__file__), '..', 'ephemeris')
    skip_ephemeris = pytest.mark.skip(reason="Swiss Ephemeris files not available")

    for item in items:
        if "ephemeris" in item.keywords:
            if not os.path.exists(ephemeris_path):
                item.add_marker(skip_ephemeris)
