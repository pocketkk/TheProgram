"""
Test helper functions for integration tests

Provides utilities for creating test data, authentication,
and common assertion helpers.
"""
from datetime import datetime, date, time
from typing import Dict, Any, Optional
from uuid import UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models_sqlite import Client, BirthData, Chart
from app.core.auth_simple import hash_password


# =============================================================================
# Test Data Creation Helpers
# =============================================================================

def create_test_client(
    db: Session,
    first_name: str = "Test",
    last_name: str = "Client",
    email: Optional[str] = "test@example.com",
    phone: Optional[str] = None,
    notes: Optional[str] = None
) -> Client:
    """
    Create a test client in the database

    Args:
        db: Database session
        first_name: Client first name
        last_name: Client last name
        email: Client email
        phone: Client phone
        notes: Client notes

    Returns:
        Created client instance
    """
    client = Client(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        notes=notes
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def create_test_birth_data(
    db: Session,
    client_id: UUID,
    birth_date: Optional[date] = None,
    birth_time: Optional[time] = None,
    latitude: float = 40.7128,
    longitude: float = -74.0060,
    timezone: str = "America/New_York",
    utc_offset: int = -300,  # -5 hours in minutes
    city: str = "New York",
    country: str = "USA",
    **kwargs
) -> BirthData:
    """
    Create test birth data in the database

    Args:
        db: Database session
        client_id: Client ID to associate with
        birth_date: Birth date (defaults to 1990-01-15)
        birth_time: Birth time (defaults to 14:30)
        latitude: Birth latitude
        longitude: Birth longitude
        timezone: Timezone string
        utc_offset: UTC offset in minutes
        city: Birth city
        country: Birth country
        **kwargs: Additional birth data fields

    Returns:
        Created birth data instance
    """
    if birth_date is None:
        birth_date = date(1990, 1, 15)

    if birth_time is None:
        birth_time = time(14, 30)

    birth_data = BirthData(
        client_id=client_id,
        birth_date=birth_date,
        birth_time=birth_time,
        time_unknown=kwargs.get('time_unknown', False),
        latitude=latitude,
        longitude=longitude,
        timezone=timezone,
        utc_offset=utc_offset,
        city=city,
        state_province=kwargs.get('state_province'),
        country=country,
        rodden_rating=kwargs.get('rodden_rating', 'A'),
        gender=kwargs.get('gender')
    )

    db.add(birth_data)
    db.commit()
    db.refresh(birth_data)
    return birth_data


def create_test_chart(
    db: Session,
    client_id: UUID,
    birth_data_id: UUID,
    chart_name: str = "Test Chart",
    chart_type: str = "natal",
    astro_system: str = "western",
    chart_data: Optional[Dict[str, Any]] = None,
    **kwargs
) -> Chart:
    """
    Create test chart in the database

    Args:
        db: Database session
        client_id: Client ID
        birth_data_id: Birth data ID
        chart_name: Chart name
        chart_type: Chart type (natal, transit, etc.)
        astro_system: Astrological system (western, vedic)
        chart_data: Chart calculation data
        **kwargs: Additional chart fields

    Returns:
        Created chart instance
    """
    if chart_data is None:
        chart_data = {
            "planets": {},
            "houses": {},
            "aspects": []
        }

    chart = Chart(
        client_id=client_id,
        birth_data_id=birth_data_id,
        chart_name=chart_name,
        chart_type=chart_type,
        astro_system=astro_system,
        house_system=kwargs.get('house_system', 'placidus'),
        ayanamsa=kwargs.get('ayanamsa'),
        zodiac_type=kwargs.get('zodiac_type', 'tropical'),
        calculation_params=kwargs.get('calculation_params', {}),
        chart_data=chart_data
    )

    db.add(chart)
    db.commit()
    db.refresh(chart)
    return chart


# =============================================================================
# Authentication Helpers
# =============================================================================

def setup_test_password(db: Session, password: str = "test_password") -> str:
    """
    Set up a test password in app_config

    Args:
        db: Database session
        password: Password to set

    Returns:
        The password (for convenience)
    """
    from app.models_sqlite.app_config import AppConfig

    config = db.query(AppConfig).filter_by(id=1).first()
    if not config:
        config = AppConfig(id=1)
        db.add(config)

    config.password_hash = hash_password(password)
    db.commit()

    return password


def get_auth_headers(client: TestClient, password: str = "test_password") -> Dict[str, str]:
    """
    Get authentication headers with valid token

    Performs login and returns headers with Bearer token.

    Args:
        client: FastAPI test client
        password: Password to login with

    Returns:
        Dictionary with Authorization header
    """
    response = client.post("/api/auth/login", json={"password": password})

    if response.status_code != 200:
        raise ValueError(f"Login failed: {response.json()}")

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# Sample Data Fixtures
# =============================================================================

SAMPLE_CLIENT_DATA = {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0100",
    "notes": "Test client for integration tests"
}

SAMPLE_BIRTH_DATA = {
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
    "gender": "M"
}

SAMPLE_BIRTH_DATA_NO_TIME = {
    "birth_date": "1985-07-04",
    "birth_time": None,
    "time_unknown": True,
    "latitude": 34.0522,
    "longitude": -118.2437,
    "timezone": "America/Los_Angeles",
    "utc_offset": -480,
    "city": "Los Angeles",
    "state_province": "CA",
    "country": "USA",
    "rodden_rating": "C"
}

SAMPLE_CHART_REQUEST = {
    "chart_name": "Test Natal Chart",
    "chart_type": "natal",
    "astro_system": "western",
    "house_system": "placidus",
    "zodiac_type": "tropical",
    "include_asteroids": False,
    "include_fixed_stars": False,
    "include_arabic_parts": False,
    "custom_orbs": None
}


# =============================================================================
# Assertion Helpers
# =============================================================================

def assert_valid_uuid(value: Any) -> None:
    """Assert that value is a valid UUID"""
    assert isinstance(value, (str, UUID)), f"Expected UUID, got {type(value)}"
    if isinstance(value, str):
        try:
            UUID(value)
        except ValueError:
            raise AssertionError(f"Invalid UUID string: {value}")


def assert_valid_timestamp(value: Any) -> None:
    """Assert that value is a valid ISO timestamp"""
    assert isinstance(value, (str, datetime)), f"Expected timestamp, got {type(value)}"
    if isinstance(value, str):
        try:
            datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            raise AssertionError(f"Invalid timestamp: {value}")


def assert_response_has_fields(data: Dict, required_fields: list) -> None:
    """Assert that response data has all required fields"""
    missing = [field for field in required_fields if field not in data]
    if missing:
        raise AssertionError(f"Missing required fields: {missing}")


def assert_error_response(response, expected_status: int, expected_detail_contains: Optional[str] = None) -> None:
    """
    Assert that response is an error with expected status and detail

    Args:
        response: Response object
        expected_status: Expected HTTP status code
        expected_detail_contains: Optional string that should be in error detail
    """
    assert response.status_code == expected_status, \
        f"Expected status {expected_status}, got {response.status_code}: {response.json()}"

    data = response.json()
    assert "detail" in data, "Error response missing 'detail' field"

    if expected_detail_contains:
        detail = str(data["detail"]).lower()
        expected = expected_detail_contains.lower()
        assert expected in detail, \
            f"Expected '{expected}' in error detail, got: {data['detail']}"
