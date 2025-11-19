"""
Tests for client management endpoints
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_user(client):
    """Create and return test user"""
    user_data = {
        "email": "testuser@example.com",
        "password": "TestPass123"
    }
    response = client.post("/api/auth/register", json=user_data)
    return response.json()


@pytest.fixture
def auth_headers(test_user):
    """Get authentication headers"""
    return {"Authorization": f"Bearer {test_user['access_token']}"}


@pytest.fixture
def sample_client_data():
    """Sample client data for testing"""
    return {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane.doe@example.com",
        "phone": "+1-555-0123",
        "notes": "Sample consultation notes"
    }


# =============================================================================
# Create Client Tests
# =============================================================================

class TestCreateClient:
    """Test POST /api/clients/ endpoint"""

    @pytest.mark.api
    def test_create_client(self, client, auth_headers, sample_client_data):
        """Test creating a new client"""
        response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert data["first_name"] == sample_client_data["first_name"]
        assert data["last_name"] == sample_client_data["last_name"]
        assert data["email"] == sample_client_data["email"]
        assert data["phone"] == sample_client_data["phone"]
        assert data["notes"] == sample_client_data["notes"]
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.api
    def test_create_client_minimal_data(self, client, auth_headers):
        """Test creating client with minimal data"""
        minimal_data = {
            "first_name": "John"
        }
        response = client.post(
            "/api/clients/",
            json=minimal_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "John"
        assert data["last_name"] is None

    @pytest.mark.api
    def test_create_client_without_auth(self, client, sample_client_data):
        """Test creating client without authentication fails"""
        response = client.post("/api/clients/", json=sample_client_data)

        assert response.status_code == 401

    @pytest.mark.api
    def test_create_client_empty_data(self, client, auth_headers):
        """Test creating client with empty data"""
        response = client.post(
            "/api/clients/",
            json={},
            headers=auth_headers
        )

        assert response.status_code == 201  # Should succeed with all None values


# =============================================================================
# List Clients Tests
# =============================================================================

class TestListClients:
    """Test GET /api/clients/ endpoint"""

    @pytest.mark.api
    def test_list_clients(self, client, auth_headers, sample_client_data):
        """Test listing clients"""
        # Create a few clients
        for i in range(3):
            client_data = sample_client_data.copy()
            client_data["first_name"] = f"Client{i}"
            client.post("/api/clients/", json=client_data, headers=auth_headers)

        # List clients
        response = client.get("/api/clients/", headers=auth_headers)

        assert response.status_code == 200
        clients = response.json()

        assert isinstance(clients, list)
        assert len(clients) >= 3

    @pytest.mark.api
    def test_list_clients_pagination(self, client, auth_headers, sample_client_data):
        """Test client list pagination"""
        # Create several clients
        for i in range(5):
            client_data = sample_client_data.copy()
            client_data["first_name"] = f"Pagination{i}"
            client.post("/api/clients/", json=client_data, headers=auth_headers)

        # Test pagination
        response = client.get("/api/clients/?skip=0&limit=2", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        assert len(clients) <= 2

        response = client.get("/api/clients/?skip=2&limit=2", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        assert len(clients) <= 2

    @pytest.mark.api
    def test_list_clients_only_own(self, client, sample_client_data):
        """Test that users only see their own clients"""
        # Create first user and client
        user1_data = {"email": "user1@example.com", "password": "Pass123"}
        user1_response = client.post("/api/auth/register", json=user1_data)
        user1_token = user1_response.json()["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        client_data_1 = sample_client_data.copy()
        client_data_1["first_name"] = "User1Client"
        client.post("/api/clients/", json=client_data_1, headers=user1_headers)

        # Create second user and client
        user2_data = {"email": "user2@example.com", "password": "Pass123"}
        user2_response = client.post("/api/auth/register", json=user2_data)
        user2_token = user2_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        client_data_2 = sample_client_data.copy()
        client_data_2["first_name"] = "User2Client"
        client.post("/api/clients/", json=client_data_2, headers=user2_headers)

        # User 1 should only see their client
        response = client.get("/api/clients/", headers=user1_headers)
        assert response.status_code == 200
        user1_clients = response.json()
        assert all(c["first_name"] == "User1Client" for c in user1_clients if c["first_name"] in ["User1Client", "User2Client"])

    @pytest.mark.api
    def test_list_clients_without_auth(self, client):
        """Test listing clients without authentication fails"""
        response = client.get("/api/clients/")

        assert response.status_code == 401


# =============================================================================
# Get Client Tests
# =============================================================================

class TestGetClient:
    """Test GET /api/clients/{client_id} endpoint"""

    @pytest.mark.api
    def test_get_client(self, client, auth_headers, sample_client_data):
        """Test getting specific client"""
        # Create client
        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=auth_headers
        )
        client_id = create_response.json()["id"]

        # Get client
        response = client.get(f"/api/clients/{client_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == client_id
        assert data["first_name"] == sample_client_data["first_name"]
        # Should include statistics
        assert "birth_data_count" in data
        assert "chart_count" in data
        assert "session_notes_count" in data

    @pytest.mark.api
    def test_get_nonexistent_client(self, client, auth_headers):
        """Test getting non-existent client returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/clients/{fake_id}", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.api
    def test_get_other_users_client(self, client, sample_client_data):
        """Test that users cannot get other users' clients"""
        # Create first user and client
        user1_data = {"email": "owner@example.com", "password": "Pass123"}
        user1_response = client.post("/api/auth/register", json=user1_data)
        user1_token = user1_response.json()["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=user1_headers
        )
        client_id = create_response.json()["id"]

        # Create second user
        user2_data = {"email": "intruder@example.com", "password": "Pass123"}
        user2_response = client.post("/api/auth/register", json=user2_data)
        user2_token = user2_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Try to get first user's client
        response = client.get(f"/api/clients/{client_id}", headers=user2_headers)

        assert response.status_code == 403


# =============================================================================
# Update Client Tests
# =============================================================================

class TestUpdateClient:
    """Test PUT /api/clients/{client_id} endpoint"""

    @pytest.mark.api
    def test_update_client(self, client, auth_headers, sample_client_data):
        """Test updating client information"""
        # Create client
        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=auth_headers
        )
        client_id = create_response.json()["id"]

        # Update client
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "phone": "+1-555-9999"
        }
        response = client.put(
            f"/api/clients/{client_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
        assert data["phone"] == "+1-555-9999"
        assert data["email"] == sample_client_data["email"]  # Unchanged

    @pytest.mark.api
    def test_update_partial(self, client, auth_headers, sample_client_data):
        """Test partial update of client"""
        # Create client
        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=auth_headers
        )
        client_id = create_response.json()["id"]

        # Update only one field
        update_data = {"notes": "Updated notes only"}
        response = client.put(
            f"/api/clients/{client_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["notes"] == "Updated notes only"
        assert data["first_name"] == sample_client_data["first_name"]  # Unchanged

    @pytest.mark.api
    def test_update_nonexistent_client(self, client, auth_headers):
        """Test updating non-existent client returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        update_data = {"first_name": "Should Fail"}
        response = client.put(
            f"/api/clients/{fake_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.api
    def test_update_other_users_client(self, client, sample_client_data):
        """Test that users cannot update other users' clients"""
        # Create first user and client
        user1_data = {"email": "owner@example.com", "password": "Pass123"}
        user1_response = client.post("/api/auth/register", json=user1_data)
        user1_token = user1_response.json()["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=user1_headers
        )
        client_id = create_response.json()["id"]

        # Create second user
        user2_data = {"email": "intruder@example.com", "password": "Pass123"}
        user2_response = client.post("/api/auth/register", json=user2_data)
        user2_token = user2_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Try to update first user's client
        update_data = {"first_name": "Hacked"}
        response = client.put(
            f"/api/clients/{client_id}",
            json=update_data,
            headers=user2_headers
        )

        assert response.status_code == 403


# =============================================================================
# Delete Client Tests
# =============================================================================

class TestDeleteClient:
    """Test DELETE /api/clients/{client_id} endpoint"""

    @pytest.mark.api
    def test_delete_client(self, client, auth_headers, sample_client_data, db_session):
        """Test deleting client"""
        from uuid import UUID
        from app.models import Client

        # Create client
        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=auth_headers
        )
        client_id = create_response.json()["id"]

        # Delete client
        response = client.delete(f"/api/clients/{client_id}", headers=auth_headers)

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"].lower()

        # Verify deletion
        deleted = db_session.query(Client).filter(Client.id == UUID(client_id)).first()
        assert deleted is None

    @pytest.mark.api
    def test_delete_nonexistent_client(self, client, auth_headers):
        """Test deleting non-existent client returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.delete(f"/api/clients/{fake_id}", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.api
    def test_delete_other_users_client(self, client, sample_client_data):
        """Test that users cannot delete other users' clients"""
        # Create first user and client
        user1_data = {"email": "owner@example.com", "password": "Pass123"}
        user1_response = client.post("/api/auth/register", json=user1_data)
        user1_token = user1_response.json()["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=user1_headers
        )
        client_id = create_response.json()["id"]

        # Create second user
        user2_data = {"email": "intruder@example.com", "password": "Pass123"}
        user2_response = client.post("/api/auth/register", json=user2_data)
        user2_token = user2_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Try to delete first user's client
        response = client.delete(f"/api/clients/{client_id}", headers=user2_headers)

        assert response.status_code == 403

    @pytest.mark.api
    def test_delete_without_auth(self, client, auth_headers, sample_client_data):
        """Test deleting client without authentication fails"""
        # Create client
        create_response = client.post(
            "/api/clients/",
            json=sample_client_data,
            headers=auth_headers
        )
        client_id = create_response.json()["id"]

        # Try to delete without auth
        response = client.delete(f"/api/clients/{client_id}")

        assert response.status_code == 401
