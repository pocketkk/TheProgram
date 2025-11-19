"""
Integration tests for Client endpoints

Tests all CRUD operations, validation, error handling,
and cascade deletes for the /api/clients endpoints.
"""
import pytest
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
    SAMPLE_CLIENT_DATA,
)


# =============================================================================
# Create Client Tests
# =============================================================================

class TestCreateClient:
    """Test POST /api/clients/"""

    def test_create_client_success(self, client_with_db: TestClient):
        """Test successful client creation"""
        response = client_with_db.post("/api/clients/", json=SAMPLE_CLIENT_DATA)

        assert response.status_code == 201
        data = response.json()

        # Check all required fields
        assert_response_has_fields(data, ["id", "first_name", "last_name", "created_at"])
        assert_valid_uuid(data["id"])
        assert_valid_timestamp(data["created_at"])

        # Check data matches
        assert data["first_name"] == SAMPLE_CLIENT_DATA["first_name"]
        assert data["last_name"] == SAMPLE_CLIENT_DATA["last_name"]
        assert data["email"] == SAMPLE_CLIENT_DATA["email"]
        assert data["phone"] == SAMPLE_CLIENT_DATA["phone"]

    def test_create_client_minimal_data(self, client_with_db: TestClient):
        """Test client creation with only required fields"""
        minimal_data = {
            "first_name": "Jane",
            "last_name": "Smith"
        }

        response = client_with_db.post("/api/clients/", json=minimal_data)

        assert response.status_code == 201
        data = response.json()

        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Smith"
        assert data["email"] is None
        assert data["phone"] is None
        assert data["notes"] is None

    def test_create_client_missing_first_name(self, client_with_db: TestClient):
        """Test client creation fails without first_name"""
        invalid_data = {"last_name": "Doe"}

        response = client_with_db.post("/api/clients/", json=invalid_data)

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_create_client_missing_last_name(self, client_with_db: TestClient):
        """Test client creation fails without last_name"""
        invalid_data = {"first_name": "John"}

        response = client_with_db.post("/api/clients/", json=invalid_data)

        assert response.status_code == 422

    def test_create_client_empty_strings(self, client_with_db: TestClient):
        """Test client creation with empty strings"""
        # Empty first/last name should fail validation
        invalid_data = {
            "first_name": "",
            "last_name": ""
        }

        response = client_with_db.post("/api/clients/", json=invalid_data)

        assert response.status_code == 422

    def test_create_client_whitespace_only(self, client_with_db: TestClient):
        """Test client creation with whitespace-only names"""
        invalid_data = {
            "first_name": "   ",
            "last_name": "   "
        }

        response = client_with_db.post("/api/clients/", json=invalid_data)

        assert response.status_code == 422

    def test_create_client_long_name(self, client_with_db: TestClient):
        """Test client creation with very long name"""
        long_name_data = {
            "first_name": "A" * 255,
            "last_name": "B" * 255
        }

        response = client_with_db.post("/api/clients/", json=long_name_data)

        # Should succeed or fail gracefully with 422
        assert response.status_code in [201, 422]

    def test_create_client_invalid_email(self, client_with_db: TestClient):
        """Test client creation with invalid email format"""
        invalid_email_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "not-an-email"
        }

        response = client_with_db.post("/api/clients/", json=invalid_email_data)

        # Should fail validation
        assert response.status_code == 422


# =============================================================================
# List Clients Tests
# =============================================================================

class TestListClients:
    """Test GET /api/clients/"""

    def test_list_clients_empty(self, client_with_db: TestClient):
        """Test listing clients when database is empty"""
        response = client_with_db.get("/api/clients/")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 0

    def test_list_clients_multiple(self, client_with_db: TestClient, test_db: Session):
        """Test listing multiple clients"""
        # Create multiple clients
        create_test_client(test_db, first_name="Alice", last_name="Anderson")
        create_test_client(test_db, first_name="Bob", last_name="Brown")
        create_test_client(test_db, first_name="Charlie", last_name="Chen")

        response = client_with_db.get("/api/clients/")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 3

        # Check each client has required fields
        for client in data:
            assert_valid_uuid(client["id"])
            assert "first_name" in client
            assert "last_name" in client

    def test_list_clients_pagination(self, client_with_db: TestClient, test_db: Session):
        """Test client list pagination"""
        # Create 10 clients
        for i in range(10):
            create_test_client(test_db, first_name=f"Client{i}", last_name="Test")

        # Get first 5
        response = client_with_db.get("/api/clients/?skip=0&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

        # Get next 5
        response = client_with_db.get("/api/clients/?skip=5&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

        # Skip past end
        response = client_with_db.get("/api/clients/?skip=20&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_list_clients_invalid_pagination(self, client_with_db: TestClient):
        """Test client list with invalid pagination params"""
        # Negative skip
        response = client_with_db.get("/api/clients/?skip=-1")
        assert response.status_code == 422

        # Negative limit
        response = client_with_db.get("/api/clients/?limit=-1")
        assert response.status_code == 422


# =============================================================================
# Get Client Tests
# =============================================================================

class TestGetClient:
    """Test GET /api/clients/{client_id}"""

    def test_get_client_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful client retrieval"""
        # Create client
        client = create_test_client(
            test_db,
            first_name="Test",
            last_name="User",
            email="test@example.com"
        )

        response = client_with_db.get(f"/api/clients/{client.id}")

        assert response.status_code == 200
        data = response.json()

        assert str(data["id"]) == str(client.id)
        assert data["first_name"] == "Test"
        assert data["last_name"] == "User"
        assert data["email"] == "test@example.com"

        # Check stats fields
        assert "birth_data_count" in data
        assert "chart_count" in data
        assert "session_notes_count" in data
        assert data["birth_data_count"] == 0
        assert data["chart_count"] == 0

    def test_get_client_with_stats(self, client_with_db: TestClient, test_db: Session):
        """Test client retrieval includes correct stats"""
        # Create client
        client = create_test_client(test_db)

        # Add birth data
        birth_data = create_test_birth_data(test_db, client.id)

        # Add charts
        create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 1")
        create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 2")

        response = client_with_db.get(f"/api/clients/{client.id}")

        assert response.status_code == 200
        data = response.json()

        assert data["birth_data_count"] == 1
        assert data["chart_count"] == 2

    def test_get_client_not_found(self, client_with_db: TestClient):
        """Test getting non-existent client"""
        fake_uuid = uuid4()
        response = client_with_db.get(f"/api/clients/{fake_uuid}")

        assert_error_response(response, 404, "not found")

    def test_get_client_invalid_uuid(self, client_with_db: TestClient):
        """Test getting client with invalid UUID"""
        response = client_with_db.get("/api/clients/not-a-uuid")

        assert response.status_code == 422


# =============================================================================
# Update Client Tests
# =============================================================================

class TestUpdateClient:
    """Test PUT /api/clients/{client_id}"""

    def test_update_client_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful client update"""
        # Create client
        client = create_test_client(
            test_db,
            first_name="John",
            last_name="Doe",
            email="old@example.com"
        )

        # Update client
        update_data = {
            "first_name": "Jane",
            "email": "new@example.com"
        }

        response = client_with_db.put(f"/api/clients/{client.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Doe"  # Unchanged
        assert data["email"] == "new@example.com"

    def test_update_client_partial(self, client_with_db: TestClient, test_db: Session):
        """Test partial client update"""
        client = create_test_client(
            test_db,
            first_name="John",
            last_name="Doe",
            email="test@example.com",
            phone="555-0100"
        )

        # Only update phone
        update_data = {"phone": "555-9999"}

        response = client_with_db.put(f"/api/clients/{client.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        # Only phone changed
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["email"] == "test@example.com"
        assert data["phone"] == "555-9999"

    def test_update_client_clear_optional_fields(self, client_with_db: TestClient, test_db: Session):
        """Test clearing optional fields by setting to null"""
        client = create_test_client(
            test_db,
            first_name="John",
            last_name="Doe",
            email="test@example.com",
            phone="555-0100",
            notes="Some notes"
        )

        # Clear email, phone, notes
        update_data = {
            "email": None,
            "phone": None,
            "notes": None
        }

        response = client_with_db.put(f"/api/clients/{client.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        assert data["email"] is None
        assert data["phone"] is None
        assert data["notes"] is None

    def test_update_client_not_found(self, client_with_db: TestClient):
        """Test updating non-existent client"""
        fake_uuid = uuid4()
        update_data = {"first_name": "Test"}

        response = client_with_db.put(f"/api/clients/{fake_uuid}", json=update_data)

        assert_error_response(response, 404, "not found")

    def test_update_client_invalid_data(self, client_with_db: TestClient, test_db: Session):
        """Test updating client with invalid data"""
        client = create_test_client(test_db)

        # Invalid email
        update_data = {"email": "not-an-email"}

        response = client_with_db.put(f"/api/clients/{client.id}", json=update_data)

        assert response.status_code == 422


# =============================================================================
# Delete Client Tests
# =============================================================================

class TestDeleteClient:
    """Test DELETE /api/clients/{client_id}"""

    def test_delete_client_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful client deletion"""
        client = create_test_client(test_db)

        response = client_with_db.delete(f"/api/clients/{client.id}")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Verify client is deleted
        get_response = client_with_db.get(f"/api/clients/{client.id}")
        assert get_response.status_code == 404

    def test_delete_client_not_found(self, client_with_db: TestClient):
        """Test deleting non-existent client"""
        fake_uuid = uuid4()

        response = client_with_db.delete(f"/api/clients/{fake_uuid}")

        assert_error_response(response, 404, "not found")

    def test_delete_client_cascade_birth_data(self, client_with_db: TestClient, test_db: Session):
        """Test that deleting client cascades to birth data"""
        from app.models_sqlite import BirthData

        # Create client and birth data
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        birth_data_id = birth_data.id

        # Delete client
        response = client_with_db.delete(f"/api/clients/{client.id}")
        assert response.status_code == 200

        # Verify birth data is also deleted
        deleted_birth_data = test_db.query(BirthData).filter(
            BirthData.id == birth_data_id
        ).first()
        assert deleted_birth_data is None

    def test_delete_client_cascade_charts(self, client_with_db: TestClient, test_db: Session):
        """Test that deleting client cascades to charts"""
        from app.models_sqlite import Chart

        # Create client, birth data, and chart
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)
        chart_id = chart.id

        # Delete client
        response = client_with_db.delete(f"/api/clients/{client.id}")
        assert response.status_code == 200

        # Verify chart is also deleted
        deleted_chart = test_db.query(Chart).filter(Chart.id == chart_id).first()
        assert deleted_chart is None

    def test_delete_client_cascade_complex(self, client_with_db: TestClient, test_db: Session):
        """Test cascading delete with multiple related records"""
        from app.models_sqlite import Client, BirthData, Chart

        # Create complex structure
        client = create_test_client(test_db)
        birth_data_1 = create_test_birth_data(test_db, client.id)
        birth_data_2 = create_test_birth_data(
            test_db,
            client.id,
            city="Los Angeles"
        )
        chart_1 = create_test_chart(test_db, client.id, birth_data_1.id)
        chart_2 = create_test_chart(test_db, client.id, birth_data_2.id)

        # Verify all created
        assert test_db.query(BirthData).filter(BirthData.client_id == client.id).count() == 2
        assert test_db.query(Chart).filter(Chart.client_id == client.id).count() == 2

        # Delete client
        response = client_with_db.delete(f"/api/clients/{client.id}")
        assert response.status_code == 200

        # Verify everything is deleted
        assert test_db.query(Client).filter(Client.id == client.id).first() is None
        assert test_db.query(BirthData).filter(BirthData.client_id == client.id).count() == 0
        assert test_db.query(Chart).filter(Chart.client_id == client.id).count() == 0
