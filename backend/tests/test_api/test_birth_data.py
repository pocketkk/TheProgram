"""
Tests for birth data management endpoints
"""
import pytest
from fastapi.testclient import TestClient
from datetime import date, time

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_user(client):
    """Create and return test user with client"""
    user_data = {"email": "testuser@example.com", "password": "TestPass123"}
    user_response = client.post("/api/auth/register", json=user_data)
    user = user_response.json()

    # Create a client for this user
    client_data = {"first_name": "Jane", "last_name": "Doe"}
    client_response = client.post(
        "/api/clients/",
        json=client_data,
        headers={"Authorization": f"Bearer {user['access_token']}"}
    )
    user["client_id"] = client_response.json()["id"]

    return user


@pytest.fixture
def auth_headers(test_user):
    """Get authentication headers"""
    return {"Authorization": f"Bearer {test_user['access_token']}"}


@pytest.fixture
def sample_birth_data(test_user):
    """Sample birth data for testing"""
    return {
        "client_id": test_user["client_id"],
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
        "gender": "female"
    }


# =============================================================================
# Create Birth Data Tests
# =============================================================================

class TestCreateBirthData:
    """Test POST /api/birth-data/ endpoint"""

    @pytest.mark.api
    def test_create_birth_data(self, client, auth_headers, sample_birth_data):
        """Test creating birth data"""
        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert data["birth_date"] == sample_birth_data["birth_date"]
        assert data["birth_time"] == sample_birth_data["birth_time"]
        assert data["city"] == sample_birth_data["city"]
        assert data["country"] == sample_birth_data["country"]
        assert data["rodden_rating"] == sample_birth_data["rodden_rating"]

    @pytest.mark.api
    def test_create_birth_data_time_unknown(self, client, auth_headers, sample_birth_data):
        """Test creating birth data with unknown time"""
        sample_birth_data["time_unknown"] = True
        sample_birth_data["birth_time"] = None

        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["time_unknown"] is True

    @pytest.mark.api
    def test_create_birth_data_invalid_coordinates(self, client, auth_headers, sample_birth_data):
        """Test creating birth data with invalid coordinates fails"""
        # Invalid latitude (> 90)
        sample_birth_data["latitude"] = 100
        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        assert response.status_code == 400

        # Invalid longitude (< -180)
        sample_birth_data["latitude"] = 40
        sample_birth_data["longitude"] = -200
        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        assert response.status_code == 400

    @pytest.mark.api
    def test_create_birth_data_invalid_rodden_rating(self, client, auth_headers, sample_birth_data):
        """Test creating birth data with invalid Rodden rating fails"""
        sample_birth_data["rodden_rating"] = "INVALID"
        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    @pytest.mark.api
    def test_create_birth_data_valid_rodden_ratings(self, client, auth_headers, sample_birth_data):
        """Test all valid Rodden ratings"""
        valid_ratings = ["AA", "A", "B", "C", "DD", "X"]

        for rating in valid_ratings:
            sample_birth_data["rodden_rating"] = rating
            response = client.post(
                "/api/birth-data/",
                json=sample_birth_data,
                headers=auth_headers
            )
            assert response.status_code == 201

    @pytest.mark.api
    def test_create_birth_data_nonexistent_client(self, client, auth_headers, sample_birth_data):
        """Test creating birth data for non-existent client fails"""
        sample_birth_data["client_id"] = "00000000-0000-0000-0000-000000000000"
        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.api
    def test_create_birth_data_other_users_client(self, client, sample_birth_data):
        """Test creating birth data for other user's client fails"""
        # Create second user with their own client
        user2_data = {"email": "user2@example.com", "password": "Pass123"}
        user2_response = client.post("/api/auth/register", json=user2_data)
        user2_token = user2_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Try to create birth data for first user's client
        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=user2_headers
        )

        assert response.status_code == 403


# =============================================================================
# List Birth Data Tests
# =============================================================================

class TestListBirthData:
    """Test GET /api/birth-data/client/{client_id} endpoint"""

    @pytest.mark.api
    def test_list_birth_data_for_client(self, client, auth_headers, sample_birth_data):
        """Test listing birth data for a client"""
        client_id = sample_birth_data["client_id"]

        # Create multiple birth data records
        for i in range(3):
            data = sample_birth_data.copy()
            data["city"] = f"City{i}"
            client.post("/api/birth-data/", json=data, headers=auth_headers)

        # List birth data
        response = client.get(
            f"/api/birth-data/client/{client_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        birth_data_list = response.json()
        assert isinstance(birth_data_list, list)
        assert len(birth_data_list) >= 3

    @pytest.mark.api
    def test_list_birth_data_nonexistent_client(self, client, auth_headers):
        """Test listing birth data for non-existent client"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/birth-data/client/{fake_id}", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.api
    def test_list_birth_data_other_users_client(self, client, sample_birth_data):
        """Test listing birth data for other user's client fails"""
        # Create birth data for first user
        user1_data = {"email": "user1@example.com", "password": "Pass123"}
        user1_response = client.post("/api/auth/register", json=user1_data)
        user1_token = user1_response.json()["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        client_data = {"first_name": "User1Client"}
        client_response = client.post("/api/clients/", json=client_data, headers=user1_headers)
        client_id = client_response.json()["id"]

        # Create second user
        user2_data = {"email": "user2@example.com", "password": "Pass123"}
        user2_response = client.post("/api/auth/register", json=user2_data)
        user2_token = user2_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Try to list first user's client's birth data
        response = client.get(
            f"/api/birth-data/client/{client_id}",
            headers=user2_headers
        )

        assert response.status_code == 403


# =============================================================================
# Get Birth Data Tests
# =============================================================================

class TestGetBirthData:
    """Test GET /api/birth-data/{birth_data_id} endpoint"""

    @pytest.mark.api
    def test_get_birth_data(self, client, auth_headers, sample_birth_data):
        """Test getting specific birth data"""
        # Create birth data
        create_response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        birth_data_id = create_response.json()["id"]

        # Get birth data
        response = client.get(
            f"/api/birth-data/{birth_data_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == birth_data_id
        # Should include computed fields
        assert "location_string" in data
        assert "is_time_known" in data
        assert "data_quality" in data
        assert data["is_time_known"] is True

    @pytest.mark.api
    def test_get_birth_data_location_string(self, client, auth_headers, sample_birth_data):
        """Test that location_string is properly formatted"""
        create_response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        birth_data_id = create_response.json()["id"]

        response = client.get(f"/api/birth-data/{birth_data_id}", headers=auth_headers)
        data = response.json()

        location = data["location_string"]
        assert "New York" in location
        assert "USA" in location

    @pytest.mark.api
    def test_get_nonexistent_birth_data(self, client, auth_headers):
        """Test getting non-existent birth data"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/birth-data/{fake_id}", headers=auth_headers)

        assert response.status_code == 404


# =============================================================================
# Update Birth Data Tests
# =============================================================================

class TestUpdateBirthData:
    """Test PUT /api/birth-data/{birth_data_id} endpoint"""

    @pytest.mark.api
    def test_update_birth_data(self, client, auth_headers, sample_birth_data):
        """Test updating birth data"""
        # Create birth data
        create_response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        birth_data_id = create_response.json()["id"]

        # Update birth data
        update_data = {
            "city": "Los Angeles",
            "state_province": "CA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "timezone": "America/Los_Angeles"
        }
        response = client.put(
            f"/api/birth-data/{birth_data_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["city"] == "Los Angeles"
        assert data["state_province"] == "CA"
        assert float(data["latitude"]) == 34.0522
        assert data["country"] == sample_birth_data["country"]  # Unchanged

    @pytest.mark.api
    def test_update_birth_data_invalid_coordinates(self, client, auth_headers, sample_birth_data):
        """Test updating with invalid coordinates fails"""
        # Create birth data
        create_response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        birth_data_id = create_response.json()["id"]

        # Try to update with invalid latitude
        update_data = {"latitude": 100}
        response = client.put(
            f"/api/birth-data/{birth_data_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 400

    @pytest.mark.api
    def test_update_partial(self, client, auth_headers, sample_birth_data):
        """Test partial update of birth data"""
        # Create birth data
        create_response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        birth_data_id = create_response.json()["id"]

        # Update only rodden rating
        update_data = {"rodden_rating": "B"}
        response = client.put(
            f"/api/birth-data/{birth_data_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["rodden_rating"] == "B"
        assert data["city"] == sample_birth_data["city"]  # Unchanged


# =============================================================================
# Delete Birth Data Tests
# =============================================================================

class TestDeleteBirthData:
    """Test DELETE /api/birth-data/{birth_data_id} endpoint"""

    @pytest.mark.api
    def test_delete_birth_data(self, client, auth_headers, sample_birth_data, db_session):
        """Test deleting birth data"""
        from uuid import UUID
        from app.models import BirthData

        # Create birth data
        create_response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        birth_data_id = create_response.json()["id"]

        # Delete birth data
        response = client.delete(
            f"/api/birth-data/{birth_data_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"].lower()

        # Verify deletion
        deleted = db_session.query(BirthData).filter(
            BirthData.id == UUID(birth_data_id)
        ).first()
        assert deleted is None

    @pytest.mark.api
    def test_delete_nonexistent_birth_data(self, client, auth_headers):
        """Test deleting non-existent birth data"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.delete(f"/api/birth-data/{fake_id}", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.api
    def test_delete_without_auth(self, client, auth_headers, sample_birth_data):
        """Test deleting birth data without authentication fails"""
        # Create birth data
        create_response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )
        birth_data_id = create_response.json()["id"]

        # Try to delete without auth
        response = client.delete(f"/api/birth-data/{birth_data_id}")

        assert response.status_code == 401


# =============================================================================
# Data Quality Tests
# =============================================================================

class TestDataQuality:
    """Test data quality and validation"""

    @pytest.mark.api
    def test_rodden_rating_uppercase(self, client, auth_headers, sample_birth_data):
        """Test that Rodden ratings are converted to uppercase"""
        sample_birth_data["rodden_rating"] = "aa"  # lowercase
        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["rodden_rating"] == "AA"  # Should be uppercase

    @pytest.mark.api
    def test_coordinate_precision(self, client, auth_headers, sample_birth_data):
        """Test that coordinates maintain precision"""
        sample_birth_data["latitude"] = 40.7127837
        sample_birth_data["longitude"] = -74.0059413

        response = client.post(
            "/api/birth-data/",
            json=sample_birth_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        # Should maintain 7 decimal places
        assert len(str(data["latitude"]).split(".")[-1]) <= 7
        assert len(str(data["longitude"]).split(".")[-1]) <= 7
