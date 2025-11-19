"""
Tests for export API endpoints

Tests all export functionality including full database export,
selective export, and various export formats.
"""
import json
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database_sqlite import get_db
from app.core.auth_simple import create_session_token
from app.models_sqlite import Client, Chart, BirthData
from datetime import datetime


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
def sample_clients(db: Session):
    """Create sample clients for testing"""
    clients = []
    for i in range(3):
        client = Client(
            first_name=f"Test{i}",
            last_name=f"User{i}",
            email=f"test{i}@example.com",
            phone=f"555-000{i}",
            notes=f"Test client {i}"
        )
        db.add(client)
        clients.append(client)

    db.commit()
    for client in clients:
        db.refresh(client)

    return clients


@pytest.fixture
def sample_charts(db: Session, sample_clients):
    """Create sample charts for testing"""
    charts = []
    for i, client in enumerate(sample_clients[:2]):
        # Create birth data first
        birth_data = BirthData(
            client_id=client.id,
            birth_date=datetime(1990, 1, 1 + i),
            birth_time=datetime(1990, 1, 1, 12, 0).time(),
            latitude=40.7128,
            longitude=-74.0060,
            timezone="America/New_York",
            location_name="New York, NY"
        )
        db.add(birth_data)
        db.commit()
        db.refresh(birth_data)

        # Create chart
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_type="natal",
            chart_data={"planets": [], "houses": []},
            calculation_method="tropical"
        )
        db.add(chart)
        charts.append(chart)

    db.commit()
    for chart in charts:
        db.refresh(chart)

    return charts


class TestExportAuthentication:
    """Test authentication for export endpoints"""

    def test_export_full_without_auth(self, client):
        """Test that export requires authentication"""
        response = client.post("/api/v1/export/full", json={})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_full_with_invalid_token(self, client):
        """Test that invalid token is rejected"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.post("/api/v1/export/full", json={}, headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_full_with_valid_token(self, client, auth_headers):
        """Test that valid token is accepted"""
        response = client.post("/api/v1/export/full", json={}, headers=auth_headers)
        # Should succeed (200) or have validation error (400), but not auth error (401)
        assert response.status_code != status.HTTP_401_UNAUTHORIZED


class TestExportFull:
    """Test full database export"""

    def test_export_full_json(self, client, auth_headers, sample_clients):
        """Test full database export in JSON format"""
        response = client.post(
            "/api/v1/export/full",
            json={
                "format": "json",
                "include_metadata": True,
                "compress": False,
                "pretty": True
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["format"] == "json"
        assert "data" in data or "download_filename" in data
        assert data["record_count"] >= len(sample_clients)

    def test_export_full_with_compression(self, client, auth_headers, sample_clients):
        """Test full database export with compression"""
        response = client.post(
            "/api/v1/export/full",
            json={
                "format": "json",
                "compress": True
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["compressed"] is True
        assert "download_filename" in data

    def test_export_full_with_table_filters(self, client, auth_headers, sample_clients):
        """Test export with include/exclude tables"""
        response = client.post(
            "/api/v1/export/full",
            json={
                "format": "json",
                "include_tables": ["clients"],
                "include_metadata": True
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        # Should only include clients table
        if "table_counts" in data:
            assert "clients" in data["table_counts"]

    def test_export_full_exclude_tables(self, client, auth_headers, sample_clients):
        """Test export excluding specific tables"""
        response = client.post(
            "/api/v1/export/full",
            json={
                "format": "json",
                "exclude_tables": ["location_cache"]
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        if "table_counts" in data:
            assert "location_cache" not in data["table_counts"]


class TestExportDownload:
    """Test export download endpoints"""

    def test_download_full_database_json(self, client, auth_headers, sample_clients):
        """Test downloading full database as JSON file"""
        response = client.get(
            "/api/v1/export/full/download?format=json&compress=false",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        assert "application/json" in response.headers["content-type"]
        assert "attachment" in response.headers["content-disposition"]

        # Verify it's valid JSON
        data = json.loads(response.content)
        assert isinstance(data, dict)

    def test_download_full_database_compressed(self, client, auth_headers, sample_clients):
        """Test downloading compressed database export"""
        response = client.get(
            "/api/v1/export/full/download?format=json&compress=true",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        assert "gzip" in response.headers["content-type"]


class TestExportClients:
    """Test client export endpoints"""

    def test_export_clients_success(self, client, auth_headers, sample_clients):
        """Test exporting specific clients"""
        client_ids = [str(c.id) for c in sample_clients[:2]]

        response = client.post(
            "/api/v1/export/clients",
            json={
                "client_ids": client_ids,
                "format": "json",
                "include_related": True
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["record_count"] >= len(client_ids)
        assert "data" in data

    def test_export_clients_not_found(self, client, auth_headers):
        """Test exporting non-existent clients"""
        response = client.post(
            "/api/v1/export/clients",
            json={
                "client_ids": ["00000000-0000-0000-0000-000000000000"],
                "format": "json"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_export_clients_without_related(self, client, auth_headers, sample_clients):
        """Test exporting clients without related data"""
        client_ids = [str(sample_clients[0].id)]

        response = client.post(
            "/api/v1/export/clients",
            json={
                "client_ids": client_ids,
                "format": "json",
                "include_related": False
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True

    def test_export_clients_invalid_uuid(self, client, auth_headers):
        """Test export with invalid UUID format"""
        response = client.post(
            "/api/v1/export/clients",
            json={
                "client_ids": ["invalid-uuid"],
                "format": "json"
            },
            headers=auth_headers
        )

        # Should return error (400 or 404)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_422_UNPROCESSABLE_ENTITY
        ]


class TestExportCharts:
    """Test chart export endpoints"""

    def test_export_charts_success(self, client, auth_headers, sample_charts):
        """Test exporting specific charts"""
        chart_ids = [str(c.id) for c in sample_charts]

        response = client.post(
            "/api/v1/export/charts",
            json={
                "chart_ids": chart_ids,
                "format": "json",
                "include_interpretations": True
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["record_count"] >= len(chart_ids)

    def test_export_charts_not_found(self, client, auth_headers):
        """Test exporting non-existent charts"""
        response = client.post(
            "/api/v1/export/charts",
            json={
                "chart_ids": ["00000000-0000-0000-0000-000000000000"],
                "format": "json"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_export_charts_without_interpretations(self, client, auth_headers, sample_charts):
        """Test exporting charts without interpretations"""
        chart_ids = [str(sample_charts[0].id)]

        response = client.post(
            "/api/v1/export/charts",
            json={
                "chart_ids": chart_ids,
                "format": "json",
                "include_interpretations": False
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True


class TestExportTable:
    """Test table export endpoints"""

    def test_export_table_success(self, client, auth_headers, sample_clients):
        """Test exporting specific table"""
        response = client.post(
            "/api/v1/export/table",
            json={
                "table_name": "clients",
                "format": "json",
                "limit": 10
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["record_count"] <= 10

    def test_export_table_with_filters(self, client, auth_headers, sample_clients):
        """Test exporting table with filters"""
        response = client.post(
            "/api/v1/export/table",
            json={
                "table_name": "clients",
                "format": "json",
                "filters": {"first_name": sample_clients[0].first_name}
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True

    def test_export_table_invalid_table(self, client, auth_headers):
        """Test export with invalid table name"""
        response = client.post(
            "/api/v1/export/table",
            json={
                "table_name": "invalid_table_name",
                "format": "json"
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_export_table_with_pagination(self, client, auth_headers, sample_clients):
        """Test table export with limit and offset"""
        response = client.post(
            "/api/v1/export/table",
            json={
                "table_name": "clients",
                "format": "json",
                "limit": 2,
                "offset": 1
            },
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["success"] is True
        assert data["record_count"] <= 2


class TestListTables:
    """Test list exportable tables endpoint"""

    def test_list_tables(self, client, auth_headers):
        """Test listing available tables"""
        response = client.get("/api/v1/export/tables", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "tables" in data
        assert "default_tables" in data
        assert len(data["tables"]) > 0

        # Verify table structure
        table = data["tables"][0]
        assert "name" in table
        assert "description" in table
