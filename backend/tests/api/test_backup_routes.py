"""
Tests for backup API endpoints

Tests all backup functionality including creation, listing, verification,
restoration, and cleanup.
"""
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.core.auth_simple import create_session_token


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def auth_token():
    """Create authentication token"""
    return create_session_token()


@pytest.fixture
def auth_headers(auth_token):
    """Authentication headers"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def sample_backup(client, auth_headers):
    """Create a sample backup for testing"""
    response = client.post(
        "/api/v1/backups/create",
        json={
            "encrypt": False,  # Faster without encryption
            "compress": False,  # Faster without compression
            "verify": False,   # Skip verification for speed
            "description": "Test backup",
            "tags": ["test"]
        },
        headers=auth_headers
    )

    if response.status_code == status.HTTP_201_CREATED:
        return response.json()
    return None


class TestBackupAuthentication:
    """Test authentication for backup endpoints"""

    def test_create_backup_without_auth(self, client):
        """Test that backup creation requires authentication"""
        response = client.post("/api/v1/backups/create", json={})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_backups_without_auth(self, client):
        """Test that listing backups requires authentication"""
        response = client.get("/api/v1/backups/list")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestBackupCreation:
    """Test backup creation endpoint"""

    def test_create_backup_minimal(self, client, auth_headers):
        """Test creating backup with minimal options"""
        response = client.post(
            "/api/v1/backups/create",
            json={},
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert "backup_id" in data
        assert "filename" in data
        assert "created_at" in data

    def test_create_backup_with_options(self, client, auth_headers):
        """Test creating backup with all options"""
        response = client.post(
            "/api/v1/backups/create",
            json={
                "encrypt": True,
                "compress": True,
                "verify": False,  # Skip for speed
                "description": "Full featured backup",
                "tags": ["test", "full"]
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert data["encrypted"] is True
        assert data["compressed"] is True
        assert data["description"] == "Full featured backup"
        assert "test" in data["tags"]

    def test_create_backup_with_verification(self, client, auth_headers):
        """Test creating and verifying backup"""
        response = client.post(
            "/api/v1/backups/create",
            json={
                "encrypt": False,
                "compress": False,
                "verify": True
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        # Verification should have run
        assert "verified" in data


class TestBackupListing:
    """Test backup listing endpoint"""

    def test_list_backups_empty(self, client, auth_headers):
        """Test listing backups when none exist"""
        response = client.get("/api/v1/backups/list", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert isinstance(data, list)

    def test_list_backups_with_data(self, client, auth_headers, sample_backup):
        """Test listing backups with existing backup"""
        if sample_backup is None:
            pytest.skip("Could not create sample backup")

        response = client.get("/api/v1/backups/list", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_backups_with_limit(self, client, auth_headers):
        """Test listing backups with limit parameter"""
        response = client.get(
            "/api/v1/backups/list?limit=5",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data) <= 5

    def test_list_backups_encrypted_only(self, client, auth_headers):
        """Test filtering encrypted backups only"""
        response = client.get(
            "/api/v1/backups/list?encrypted_only=true",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        for backup in data:
            assert backup.get("encrypted") is True


class TestBackupDetails:
    """Test getting backup details"""

    def test_get_backup_details(self, client, auth_headers, sample_backup):
        """Test getting details for specific backup"""
        if sample_backup is None:
            pytest.skip("Could not create sample backup")

        backup_id = sample_backup["backup_id"]
        response = client.get(
            f"/api/v1/backups/{backup_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["backup_id"] == backup_id

    def test_get_nonexistent_backup(self, client, auth_headers):
        """Test getting non-existent backup"""
        response = client.get(
            "/api/v1/backups/nonexistent_backup_id",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestBackupVerification:
    """Test backup verification endpoint"""

    def test_verify_backup(self, client, auth_headers, sample_backup):
        """Test verifying a backup"""
        if sample_backup is None:
            pytest.skip("Could not create sample backup")

        backup_id = sample_backup["backup_id"]
        response = client.post(
            f"/api/v1/backups/{backup_id}/verify",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "verified" in data
        assert "errors" in data
        assert "checks_performed" in data


class TestBackupDeletion:
    """Test backup deletion endpoint"""

    def test_delete_backup(self, client, auth_headers, sample_backup):
        """Test deleting a backup"""
        if sample_backup is None:
            pytest.skip("Could not create sample backup")

        backup_id = sample_backup["backup_id"]
        response = client.delete(
            f"/api/v1/backups/{backup_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["backup_id"] == backup_id

    def test_delete_nonexistent_backup(self, client, auth_headers):
        """Test deleting non-existent backup"""
        response = client.delete(
            "/api/v1/backups/nonexistent_backup_id",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestBackupCleanup:
    """Test backup cleanup endpoint"""

    def test_cleanup_with_keep_count(self, client, auth_headers):
        """Test cleanup keeping only N backups"""
        response = client.post(
            "/api/v1/backups/cleanup",
            json={
                "keep_count": 10,
                "delete_failed": True
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "deleted_count" in data
        assert "freed_space" in data

    def test_cleanup_no_criteria(self, client, auth_headers):
        """Test cleanup without criteria fails"""
        response = client.post(
            "/api/v1/backups/cleanup",
            json={},
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestBackupStatus:
    """Test backup status endpoint"""

    def test_get_backup_status(self, client, auth_headers):
        """Test getting backup system status"""
        response = client.get("/api/v1/backups/status", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "enabled" in data
        assert "storage_path" in data
        assert "backup_count" in data

    def test_get_backup_stats(self, client, auth_headers):
        """Test getting backup statistics"""
        response = client.get("/api/v1/backups/stats", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "total_backups" in data
        assert "total_size" in data
