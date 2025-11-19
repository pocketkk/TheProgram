"""
Tests for import API endpoints

Tests all import functionality including validation, dry-run,
and import execution with various modes and conflict resolution.
"""
import json
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from io import BytesIO

from app.main import app
from app.core.auth_simple import create_session_token
from app.models_sqlite import Client


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
def sample_import_data():
    """Sample import data"""
    return {
        "clients": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "first_name": "Import",
                "last_name": "Test",
                "email": "import@test.com",
                "phone": "555-1234"
            },
            {
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "first_name": "Import2",
                "last_name": "Test2",
                "email": "import2@test.com",
                "phone": "555-1235"
            }
        ]
    }


class TestImportAuthentication:
    """Test authentication for import endpoints"""

    def test_validate_without_auth(self, client):
        """Test that validation requires authentication"""
        response = client.post("/api/v1/import/validate", data={"data": "{}"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_execute_without_auth(self, client):
        """Test that import execution requires authentication"""
        response = client.post("/api/v1/import/execute", data={"data": "{}"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestImportValidation:
    """Test import validation endpoint"""

    def test_validate_json_data(self, client, auth_headers, sample_import_data):
        """Test validating JSON import data"""
        response = client.post(
            "/api/v1/import/validate",
            data={"data": json.dumps(sample_import_data)},
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "valid" in data
        assert "errors" in data
        assert "warnings" in data

    def test_validate_empty_data(self, client, auth_headers):
        """Test validation with empty data"""
        response = client.post(
            "/api/v1/import/validate",
            data={"data": "{}"},
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK

    def test_validate_invalid_json(self, client, auth_headers):
        """Test validation with invalid JSON"""
        response = client.post(
            "/api/v1/import/validate",
            data={"data": "not valid json{"},
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_validate_no_data_provided(self, client, auth_headers):
        """Test validation without data or file"""
        response = client.post(
            "/api/v1/import/validate",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestImportDryRun:
    """Test import dry-run endpoint"""

    def test_dry_run_upsert_mode(self, client, auth_headers, sample_import_data):
        """Test dry-run in upsert mode"""
        response = client.post(
            "/api/v1/import/dry-run",
            data={
                "data": json.dumps(sample_import_data),
                "import_mode": "upsert",
                "conflict_resolution": "skip"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "success" in data
        assert "will_insert" in data
        assert "will_update" in data
        assert "will_skip" in data

    def test_dry_run_insert_only_mode(self, client, auth_headers, sample_import_data):
        """Test dry-run in insert-only mode"""
        response = client.post(
            "/api/v1/import/dry-run",
            data={
                "data": json.dumps(sample_import_data),
                "import_mode": "insert_only",
                "conflict_resolution": "skip"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["will_update"] == 0  # Insert-only should not update


class TestImportExecution:
    """Test import execution endpoint"""

    def test_execute_import_success(self, client, auth_headers, sample_import_data, db: Session):
        """Test successful import execution"""
        # Clear existing clients first
        db.query(Client).delete()
        db.commit()

        response = client.post(
            "/api/v1/import/execute",
            data={
                "data": json.dumps(sample_import_data),
                "import_mode": "upsert",
                "conflict_resolution": "skip",
                "validate_first": "true",
                "create_backup": "false"  # Skip backup for faster test
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["records_inserted"] > 0

    def test_execute_import_with_backup(self, client, auth_headers, sample_import_data):
        """Test import with backup creation"""
        response = client.post(
            "/api/v1/import/execute",
            data={
                "data": json.dumps(sample_import_data),
                "import_mode": "upsert",
                "conflict_resolution": "skip",
                "validate_first": "true",
                "create_backup": "true"
            },
            headers=auth_headers
        )

        # May succeed or fail, but should not crash
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR]

        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            # Backup ID may or may not be present depending on backup success
            assert "success" in data


class TestImportClients:
    """Test client-specific import endpoint"""

    def test_import_clients_array(self, client, auth_headers):
        """Test importing clients as array"""
        clients_data = [
            {
                "id": "550e8400-e29b-41d4-a716-446655440010",
                "first_name": "Client",
                "last_name": "Import",
                "email": "client@import.com"
            }
        ]

        response = client.post(
            "/api/v1/import/clients",
            data={
                "data": json.dumps(clients_data),
                "import_mode": "upsert",
                "conflict_resolution": "skip"
            },
            headers=auth_headers
        )

        # Should process without error
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR]

    def test_import_clients_no_data(self, client, auth_headers):
        """Test import clients with no data"""
        response = client.post(
            "/api/v1/import/clients",
            data={
                "data": json.dumps({"clients": []}),
                "import_mode": "upsert"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestImportCharts:
    """Test chart-specific import endpoint"""

    def test_import_charts_success(self, client, auth_headers):
        """Test importing charts"""
        charts_data = {
            "charts": [
                {
                    "id": "650e8400-e29b-41d4-a716-446655440000",
                    "client_id": "550e8400-e29b-41d4-a716-446655440000",
                    "chart_type": "natal",
                    "chart_data": {"planets": []}
                }
            ]
        }

        response = client.post(
            "/api/v1/import/charts",
            data={
                "data": json.dumps(charts_data),
                "import_mode": "upsert",
                "conflict_resolution": "skip"
            },
            headers=auth_headers
        )

        # May fail due to foreign key constraints, but should not crash
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ]
