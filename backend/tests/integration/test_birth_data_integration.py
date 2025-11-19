"""
Integration tests for Birth Data endpoints

Tests all CRUD operations, validation, coordinate validation,
and cascade deletes for the /api/birth-data endpoints.
"""
import pytest
from datetime import date, time
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from tests.utils.test_helpers import (
    create_test_client,
    create_test_birth_data,
    create_test_chart,
    assert_valid_uuid,
    assert_valid_timestamp,
    assert_response_has_fields,
    assert_error_response,
    SAMPLE_BIRTH_DATA,
    SAMPLE_BIRTH_DATA_NO_TIME,
)


# =============================================================================
# Create Birth Data Tests
# =============================================================================

class TestCreateBirthData:
    """Test POST /api/birth-data/"""

    def test_create_birth_data_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful birth data creation"""
        client = create_test_client(test_db)

        birth_data_payload = {
            **SAMPLE_BIRTH_DATA,
            "client_id": str(client.id)
        }

        response = client_with_db.post("/api/birth-data/", json=birth_data_payload)

        assert response.status_code == 201
        data = response.json()

        assert_response_has_fields(data, [
            "id", "client_id", "birth_date", "birth_time",
            "latitude", "longitude", "city", "country"
        ])
        assert_valid_uuid(data["id"])
        assert str(data["client_id"]) == str(client.id)
        assert data["city"] == "New York"
        assert data["country"] == "USA"

    def test_create_birth_data_no_time(self, client_with_db: TestClient, test_db: Session):
        """Test creating birth data without time"""
        client = create_test_client(test_db)

        birth_data_payload = {
            **SAMPLE_BIRTH_DATA_NO_TIME,
            "client_id": str(client.id)
        }

        response = client_with_db.post("/api/birth-data/", json=birth_data_payload)

        assert response.status_code == 201
        data = response.json()

        assert data["time_unknown"] is True
        assert data["birth_time"] is None

    def test_create_birth_data_client_not_found(self, client_with_db: TestClient):
        """Test creating birth data for non-existent client"""
        fake_client_id = uuid4()

        birth_data_payload = {
            **SAMPLE_BIRTH_DATA,
            "client_id": str(fake_client_id)
        }

        response = client_with_db.post("/api/birth-data/", json=birth_data_payload)

        assert_error_response(response, 404, "client not found")

    def test_create_birth_data_invalid_coordinates_lat(self, client_with_db: TestClient, test_db: Session):
        """Test creating birth data with invalid latitude"""
        client = create_test_client(test_db)

        # Latitude > 90
        invalid_data = {
            **SAMPLE_BIRTH_DATA,
            "client_id": str(client.id),
            "latitude": 95.0
        }

        response = client_with_db.post("/api/birth-data/", json=invalid_data)

        assert response.status_code in [400, 422]

        # Latitude < -90
        invalid_data["latitude"] = -95.0

        response = client_with_db.post("/api/birth-data/", json=invalid_data)

        assert response.status_code in [400, 422]

    def test_create_birth_data_invalid_coordinates_lon(self, client_with_db: TestClient, test_db: Session):
        """Test creating birth data with invalid longitude"""
        client = create_test_client(test_db)

        # Longitude > 180
        invalid_data = {
            **SAMPLE_BIRTH_DATA,
            "client_id": str(client.id),
            "longitude": 185.0
        }

        response = client_with_db.post("/api/birth-data/", json=invalid_data)

        assert response.status_code in [400, 422]

        # Longitude < -180
        invalid_data["longitude"] = -185.0

        response = client_with_db.post("/api/birth-data/", json=invalid_data)

        assert response.status_code in [400, 422]

    def test_create_birth_data_missing_required_fields(self, client_with_db: TestClient, test_db: Session):
        """Test creating birth data without required fields"""
        client = create_test_client(test_db)

        # Missing birth_date
        incomplete_data = {
            "client_id": str(client.id),
            "latitude": 40.7128,
            "longitude": -74.0060
        }

        response = client_with_db.post("/api/birth-data/", json=incomplete_data)

        assert response.status_code == 422

    def test_create_birth_data_edge_coordinates(self, client_with_db: TestClient, test_db: Session):
        """Test creating birth data at edge coordinate values"""
        client = create_test_client(test_db)

        # North Pole
        north_pole_data = {
            **SAMPLE_BIRTH_DATA,
            "client_id": str(client.id),
            "latitude": 90.0,
            "longitude": 0.0,
            "city": "North Pole",
            "country": "Arctic"
        }

        response = client_with_db.post("/api/birth-data/", json=north_pole_data)
        assert response.status_code == 201

        # South Pole
        south_pole_data = {
            **SAMPLE_BIRTH_DATA,
            "client_id": str(client.id),
            "latitude": -90.0,
            "longitude": 0.0,
            "city": "South Pole",
            "country": "Antarctica"
        }

        response = client_with_db.post("/api/birth-data/", json=south_pole_data)
        assert response.status_code == 201

    def test_create_birth_data_minimal(self, client_with_db: TestClient, test_db: Session):
        """Test creating birth data with minimal required fields"""
        client = create_test_client(test_db)

        minimal_data = {
            "client_id": str(client.id),
            "birth_date": "1990-01-15",
            "latitude": 40.0,
            "longitude": -74.0,
            "timezone": "America/New_York",
            "city": "Test City",
            "country": "Test Country"
        }

        response = client_with_db.post("/api/birth-data/", json=minimal_data)

        assert response.status_code == 201


# =============================================================================
# List Birth Data Tests
# =============================================================================

class TestListBirthData:
    """Test GET /api/birth-data/client/{client_id}"""

    def test_list_birth_data_empty(self, client_with_db: TestClient, test_db: Session):
        """Test listing birth data for client with no data"""
        client = create_test_client(test_db)

        response = client_with_db.get(f"/api/birth-data/client/{client.id}")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 0

    def test_list_birth_data_multiple(self, client_with_db: TestClient, test_db: Session):
        """Test listing multiple birth data for a client"""
        client = create_test_client(test_db)

        # Create multiple birth data
        create_test_birth_data(test_db, client.id, city="New York")
        create_test_birth_data(test_db, client.id, city="Los Angeles")
        create_test_birth_data(test_db, client.id, city="Chicago")

        response = client_with_db.get(f"/api/birth-data/client/{client.id}")

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 3

        # Check all have valid structure
        for bd in data:
            assert_valid_uuid(bd["id"])
            assert str(bd["client_id"]) == str(client.id)

    def test_list_birth_data_client_not_found(self, client_with_db: TestClient):
        """Test listing birth data for non-existent client"""
        fake_client_id = uuid4()

        response = client_with_db.get(f"/api/birth-data/client/{fake_client_id}")

        assert_error_response(response, 404, "client not found")


# =============================================================================
# Get Birth Data Tests
# =============================================================================

class TestGetBirthData:
    """Test GET /api/birth-data/{birth_data_id}"""

    def test_get_birth_data_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful birth data retrieval"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        response = client_with_db.get(f"/api/birth-data/{birth_data.id}")

        assert response.status_code == 200
        data = response.json()

        assert str(data["id"]) == str(birth_data.id)
        assert str(data["client_id"]) == str(client.id)

        # Check computed properties
        assert "location_string" in data
        assert "is_time_known" in data
        assert "data_quality" in data

    def test_get_birth_data_computed_properties(self, client_with_db: TestClient, test_db: Session):
        """Test that computed properties are included"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(
            test_db,
            client.id,
            city="New York",
            state_province="NY",
            country="USA"
        )

        response = client_with_db.get(f"/api/birth-data/{birth_data.id}")

        assert response.status_code == 200
        data = response.json()

        # Location string should be formatted
        assert data["location_string"] is not None
        assert "New York" in data["location_string"]

        # Time known should be true (we provided a time)
        assert data["is_time_known"] is True

    def test_get_birth_data_not_found(self, client_with_db: TestClient):
        """Test getting non-existent birth data"""
        fake_uuid = uuid4()

        response = client_with_db.get(f"/api/birth-data/{fake_uuid}")

        assert_error_response(response, 404, "not found")


# =============================================================================
# Update Birth Data Tests
# =============================================================================

class TestUpdateBirthData:
    """Test PUT /api/birth-data/{birth_data_id}"""

    def test_update_birth_data_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful birth data update"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id, city="Old City")

        update_data = {
            "city": "New City",
            "country": "New Country"
        }

        response = client_with_db.put(f"/api/birth-data/{birth_data.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        assert data["city"] == "New City"
        assert data["country"] == "New Country"

    def test_update_birth_data_coordinates(self, client_with_db: TestClient, test_db: Session):
        """Test updating birth data coordinates"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        update_data = {
            "latitude": 51.5074,
            "longitude": -0.1278,
            "city": "London",
            "country": "UK"
        }

        response = client_with_db.put(f"/api/birth-data/{birth_data.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        assert data["latitude"] == 51.5074
        assert data["longitude"] == -0.1278
        assert data["city"] == "London"

    def test_update_birth_data_invalid_coordinates(self, client_with_db: TestClient, test_db: Session):
        """Test updating birth data with invalid coordinates"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        # Invalid latitude
        update_data = {"latitude": 95.0}

        response = client_with_db.put(f"/api/birth-data/{birth_data.id}", json=update_data)

        assert response.status_code in [400, 422]

    def test_update_birth_data_partial(self, client_with_db: TestClient, test_db: Session):
        """Test partial birth data update"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(
            test_db,
            client.id,
            city="Original City",
            country="Original Country",
            rodden_rating="A"
        )

        # Only update rodden_rating
        update_data = {"rodden_rating": "AA"}

        response = client_with_db.put(f"/api/birth-data/{birth_data.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        assert data["rodden_rating"] == "AA"
        assert data["city"] == "Original City"
        assert data["country"] == "Original Country"

    def test_update_birth_data_not_found(self, client_with_db: TestClient):
        """Test updating non-existent birth data"""
        fake_uuid = uuid4()
        update_data = {"city": "Test"}

        response = client_with_db.put(f"/api/birth-data/{fake_uuid}", json=update_data)

        assert_error_response(response, 404, "not found")


# =============================================================================
# Delete Birth Data Tests
# =============================================================================

class TestDeleteBirthData:
    """Test DELETE /api/birth-data/{birth_data_id}"""

    def test_delete_birth_data_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful birth data deletion"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        response = client_with_db.delete(f"/api/birth-data/{birth_data.id}")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Verify deletion
        get_response = client_with_db.get(f"/api/birth-data/{birth_data.id}")
        assert get_response.status_code == 404

    def test_delete_birth_data_not_found(self, client_with_db: TestClient):
        """Test deleting non-existent birth data"""
        fake_uuid = uuid4()

        response = client_with_db.delete(f"/api/birth-data/{fake_uuid}")

        assert_error_response(response, 404, "not found")

    def test_delete_birth_data_cascade_charts(self, client_with_db: TestClient, test_db: Session):
        """Test that deleting birth data cascades to charts"""
        from app.models_sqlite import Chart

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)
        chart_id = chart.id

        # Delete birth data
        response = client_with_db.delete(f"/api/birth-data/{birth_data.id}")
        assert response.status_code == 200

        # Verify chart is also deleted
        deleted_chart = test_db.query(Chart).filter(Chart.id == chart_id).first()
        assert deleted_chart is None

    def test_delete_birth_data_cascade_multiple_charts(self, client_with_db: TestClient, test_db: Session):
        """Test cascading delete with multiple charts"""
        from app.models_sqlite import Chart

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        # Create multiple charts
        chart_1 = create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 1")
        chart_2 = create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 2")
        chart_3 = create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 3")

        # Verify charts exist
        assert test_db.query(Chart).filter(Chart.birth_data_id == birth_data.id).count() == 3

        # Delete birth data
        response = client_with_db.delete(f"/api/birth-data/{birth_data.id}")
        assert response.status_code == 200

        # Verify all charts are deleted
        assert test_db.query(Chart).filter(Chart.birth_data_id == birth_data.id).count() == 0


# =============================================================================
# Validation Tests
# =============================================================================

class TestBirthDataValidation:
    """Test birth data validation rules"""

    def test_rodden_rating_valid_values(self, client_with_db: TestClient, test_db: Session):
        """Test valid Rodden ratings"""
        client = create_test_client(test_db)

        valid_ratings = ["AA", "A", "B", "C", "DD", "X"]

        for rating in valid_ratings:
            birth_data_payload = {
                **SAMPLE_BIRTH_DATA,
                "client_id": str(client.id),
                "rodden_rating": rating
            }

            response = client_with_db.post("/api/birth-data/", json=birth_data_payload)
            assert response.status_code == 201, f"Rating {rating} should be valid"

    def test_timezone_offset_ranges(self, client_with_db: TestClient, test_db: Session):
        """Test timezone offset ranges"""
        client = create_test_client(test_db)

        # Valid offsets
        valid_offsets = [-720, -300, 0, 330, 720]  # -12 to +12 hours in minutes

        for offset in valid_offsets:
            birth_data_payload = {
                **SAMPLE_BIRTH_DATA,
                "client_id": str(client.id),
                "utc_offset": offset
            }

            response = client_with_db.post("/api/birth-data/", json=birth_data_payload)
            assert response.status_code == 201, f"Offset {offset} should be valid"

    def test_future_birth_date(self, client_with_db: TestClient, test_db: Session):
        """Test birth date in the future"""
        client = create_test_client(test_db)

        future_data = {
            **SAMPLE_BIRTH_DATA,
            "client_id": str(client.id),
            "birth_date": "2099-12-31"
        }

        response = client_with_db.post("/api/birth-data/", json=future_data)

        # Should either accept or reject gracefully
        assert response.status_code in [201, 422]
