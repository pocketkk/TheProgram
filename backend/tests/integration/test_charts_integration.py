"""
Integration tests for Chart endpoints

Tests CRUD operations, chart calculations, filtering,
and validation for the /api/charts endpoints.

Note: Some tests are marked with @pytest.mark.skip if they require
ephemeris files that may not be available in CI/CD environments.
"""
import pytest
from datetime import datetime
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
    SAMPLE_CHART_REQUEST,
)


# =============================================================================
# Create Chart (Pre-calculated) Tests
# =============================================================================

class TestCreateChart:
    """Test POST /api/charts/ (with pre-calculated data)"""

    def test_create_chart_success(self, client_with_db: TestClient, test_db: Session):
        """Test creating chart with pre-calculated data"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        chart_payload = {
            "client_id": str(client.id),
            "birth_data_id": str(birth_data.id),
            "chart_name": "Test Chart",
            "chart_type": "natal",
            "astro_system": "western",
            "house_system": "placidus",
            "zodiac_type": "tropical",
            "calculation_params": {},
            "chart_data": {
                "planets": {},
                "houses": {},
                "aspects": []
            }
        }

        response = client_with_db.post("/api/charts/", json=chart_payload)

        assert response.status_code == 201
        data = response.json()

        assert_valid_uuid(data["id"])
        assert data["chart_name"] == "Test Chart"
        assert data["chart_type"] == "natal"
        assert data["astro_system"] == "western"

    def test_create_chart_birth_data_not_found(self, client_with_db: TestClient, test_db: Session):
        """Test creating chart with non-existent birth data"""
        client = create_test_client(test_db)
        fake_birth_data_id = uuid4()

        chart_payload = {
            "client_id": str(client.id),
            "birth_data_id": str(fake_birth_data_id),
            "chart_name": "Test Chart",
            "chart_type": "natal",
            "astro_system": "western",
            "chart_data": {}
        }

        response = client_with_db.post("/api/charts/", json=chart_payload)

        assert_error_response(response, 404, "birth data not found")

    def test_create_chart_client_mismatch(self, client_with_db: TestClient, test_db: Session):
        """Test creating chart with mismatched client ID"""
        client_1 = create_test_client(test_db, first_name="Client1")
        client_2 = create_test_client(test_db, first_name="Client2")
        birth_data = create_test_birth_data(test_db, client_1.id)

        chart_payload = {
            "client_id": str(client_2.id),  # Different client
            "birth_data_id": str(birth_data.id),
            "chart_name": "Test Chart",
            "chart_type": "natal",
            "astro_system": "western",
            "chart_data": {}
        }

        response = client_with_db.post("/api/charts/", json=chart_payload)

        assert response.status_code == 400

    def test_create_chart_minimal(self, client_with_db: TestClient, test_db: Session):
        """Test creating chart with minimal required fields"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        minimal_payload = {
            "birth_data_id": str(birth_data.id),
            "chart_name": "Minimal Chart",
            "chart_type": "natal",
            "astro_system": "western",
            "chart_data": {}
        }

        response = client_with_db.post("/api/charts/", json=minimal_payload)

        assert response.status_code == 201


# =============================================================================
# List Charts Tests
# =============================================================================

class TestListCharts:
    """Test GET /api/charts/"""

    def test_list_charts_empty(self, client_with_db: TestClient):
        """Test listing charts when database is empty"""
        response = client_with_db.get("/api/charts/")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 0

    def test_list_charts_multiple(self, client_with_db: TestClient, test_db: Session):
        """Test listing multiple charts"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        # Create multiple charts
        create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 1")
        create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 2")
        create_test_chart(test_db, client.id, birth_data.id, chart_name="Chart 3")

        response = client_with_db.get("/api/charts/")

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 3

        for chart in data:
            assert_valid_uuid(chart["id"])
            assert "chart_name" in chart

    def test_list_charts_pagination(self, client_with_db: TestClient, test_db: Session):
        """Test chart list pagination"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        # Create 10 charts
        for i in range(10):
            create_test_chart(test_db, client.id, birth_data.id, chart_name=f"Chart {i}")

        # Get first 5
        response = client_with_db.get("/api/charts/?skip=0&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5

        # Get next 5
        response = client_with_db.get("/api/charts/?skip=5&limit=5")
        assert response.status_code == 200
        assert len(response.json()) == 5

    def test_list_charts_filter_by_type(self, client_with_db: TestClient, test_db: Session):
        """Test filtering charts by type"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        # Create different types
        create_test_chart(test_db, client.id, birth_data.id, chart_type="natal")
        create_test_chart(test_db, client.id, birth_data.id, chart_type="natal")
        create_test_chart(test_db, client.id, birth_data.id, chart_type="transit")

        response = client_with_db.get("/api/charts/?chart_type=natal")

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 2
        for chart in data:
            assert chart["chart_type"] == "natal"

    def test_list_charts_filter_by_system(self, client_with_db: TestClient, test_db: Session):
        """Test filtering charts by astrological system"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        # Create different systems
        create_test_chart(test_db, client.id, birth_data.id, astro_system="western")
        create_test_chart(test_db, client.id, birth_data.id, astro_system="vedic")
        create_test_chart(test_db, client.id, birth_data.id, astro_system="western")

        response = client_with_db.get("/api/charts/?astro_system=vedic")

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 1
        assert data[0]["astro_system"] == "vedic"

    def test_list_charts_filter_by_client(self, client_with_db: TestClient, test_db: Session):
        """Test filtering charts by client ID"""
        client_1 = create_test_client(test_db, first_name="Client1")
        client_2 = create_test_client(test_db, first_name="Client2")
        birth_data_1 = create_test_birth_data(test_db, client_1.id)
        birth_data_2 = create_test_birth_data(test_db, client_2.id)

        # Create charts for different clients
        create_test_chart(test_db, client_1.id, birth_data_1.id)
        create_test_chart(test_db, client_1.id, birth_data_1.id)
        create_test_chart(test_db, client_2.id, birth_data_2.id)

        response = client_with_db.get(f"/api/charts/?client_id={client_1.id}")

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 2
        for chart in data:
            assert str(chart["client_id"]) == str(client_1.id)


# =============================================================================
# Get Chart Tests
# =============================================================================

class TestGetChart:
    """Test GET /api/charts/{chart_id}"""

    def test_get_chart_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful chart retrieval"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        response = client_with_db.get(f"/api/charts/{chart.id}")

        assert response.status_code == 200
        data = response.json()

        assert str(data["id"]) == str(chart.id)
        assert str(data["client_id"]) == str(client.id)
        assert "chart_data" in data
        assert "last_viewed" in data

    def test_get_chart_updates_last_viewed(self, client_with_db: TestClient, test_db: Session):
        """Test that getting chart updates last_viewed timestamp"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        original_last_viewed = chart.last_viewed

        # Get chart
        response = client_with_db.get(f"/api/charts/{chart.id}")
        assert response.status_code == 200

        # Refresh chart from database
        test_db.refresh(chart)

        # last_viewed should be updated
        assert chart.last_viewed > original_last_viewed

    def test_get_chart_not_found(self, client_with_db: TestClient):
        """Test getting non-existent chart"""
        fake_uuid = uuid4()

        response = client_with_db.get(f"/api/charts/{fake_uuid}")

        assert_error_response(response, 404, "not found")


# =============================================================================
# Update Chart Tests
# =============================================================================

class TestUpdateChart:
    """Test PUT /api/charts/{chart_id}"""

    def test_update_chart_metadata(self, client_with_db: TestClient, test_db: Session):
        """Test updating chart metadata"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id, chart_name="Old Name")

        update_data = {
            "chart_name": "New Name",
            "house_system": "koch"
        }

        response = client_with_db.put(f"/api/charts/{chart.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        assert data["chart_name"] == "New Name"
        assert data["house_system"] == "koch"

    def test_update_chart_partial(self, client_with_db: TestClient, test_db: Session):
        """Test partial chart update"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(
            test_db,
            client.id,
            birth_data.id,
            chart_name="Original Name",
            chart_type="natal",
            house_system="placidus"
        )

        # Only update chart_name
        update_data = {"chart_name": "Updated Name"}

        response = client_with_db.put(f"/api/charts/{chart.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()

        # Only chart_name changed
        assert data["chart_name"] == "Updated Name"
        assert data["chart_type"] == "natal"
        assert data["house_system"] == "placidus"

    def test_update_chart_not_found(self, client_with_db: TestClient):
        """Test updating non-existent chart"""
        fake_uuid = uuid4()
        update_data = {"chart_name": "Test"}

        response = client_with_db.put(f"/api/charts/{fake_uuid}", json=update_data)

        assert_error_response(response, 404, "not found")


# =============================================================================
# Delete Chart Tests
# =============================================================================

class TestDeleteChart:
    """Test DELETE /api/charts/{chart_id}"""

    def test_delete_chart_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful chart deletion"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        response = client_with_db.delete(f"/api/charts/{chart.id}")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Verify deletion
        get_response = client_with_db.get(f"/api/charts/{chart.id}")
        assert get_response.status_code == 404

    def test_delete_chart_not_found(self, client_with_db: TestClient):
        """Test deleting non-existent chart"""
        fake_uuid = uuid4()

        response = client_with_db.delete(f"/api/charts/{fake_uuid}")

        assert_error_response(response, 404, "not found")


# =============================================================================
# Chart Calculation Tests
# =============================================================================

class TestChartCalculation:
    """Test POST /api/charts/calculate"""

    @pytest.mark.skip(reason="Requires ephemeris files and chart calculation services")
    def test_calculate_natal_chart_western(self, client_with_db: TestClient, test_db: Session):
        """Test calculating Western natal chart"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        calc_request = {
            **SAMPLE_CHART_REQUEST,
            "birth_data_id": str(birth_data.id),
            "astro_system": "western"
        }

        response = client_with_db.post("/api/charts/calculate", json=calc_request)

        assert response.status_code == 201
        data = response.json()

        # Check calculation response
        assert "id" in data
        assert "chart_data" in data
        assert "calculation_time_ms" in data
        assert data["calculation_time_ms"] > 0

        # Check chart data structure
        chart_data = data["chart_data"]
        assert "planets" in chart_data
        assert "houses" in chart_data
        assert "aspects" in chart_data

    @pytest.mark.skip(reason="Requires ephemeris files and chart calculation services")
    def test_calculate_natal_chart_vedic(self, client_with_db: TestClient, test_db: Session):
        """Test calculating Vedic natal chart"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        calc_request = {
            **SAMPLE_CHART_REQUEST,
            "birth_data_id": str(birth_data.id),
            "astro_system": "vedic",
            "ayanamsa": "lahiri"
        }

        response = client_with_db.post("/api/charts/calculate", json=calc_request)

        assert response.status_code == 201
        data = response.json()

        assert data["astro_system"] == "vedic"
        assert "ayanamsa" in data

    def test_calculate_chart_birth_data_not_found(self, client_with_db: TestClient):
        """Test calculating chart with non-existent birth data"""
        fake_birth_data_id = uuid4()

        calc_request = {
            **SAMPLE_CHART_REQUEST,
            "birth_data_id": str(fake_birth_data_id)
        }

        response = client_with_db.post("/api/charts/calculate", json=calc_request)

        assert_error_response(response, 404, "birth data not found")

    def test_calculate_chart_missing_birth_data_id(self, client_with_db: TestClient):
        """Test calculating chart without birth_data_id"""
        calc_request = {
            "chart_name": "Test Chart",
            "chart_type": "natal",
            "astro_system": "western"
        }

        response = client_with_db.post("/api/charts/calculate", json=calc_request)

        assert response.status_code == 422

    @pytest.mark.skip(reason="Requires ephemeris files")
    def test_calculate_chart_with_custom_orbs(self, client_with_db: TestClient, test_db: Session):
        """Test calculating chart with custom orbs"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        calc_request = {
            **SAMPLE_CHART_REQUEST,
            "birth_data_id": str(birth_data.id),
            "custom_orbs": {
                "conjunction": 8.0,
                "opposition": 8.0,
                "trine": 6.0,
                "square": 6.0,
                "sextile": 4.0
            }
        }

        response = client_with_db.post("/api/charts/calculate", json=calc_request)

        assert response.status_code == 201
        data = response.json()

        assert "calculation_params" in data
        assert data["calculation_params"]["custom_orbs"] is not None

    @pytest.mark.skip(reason="Requires ephemeris files and transit implementation")
    def test_calculate_transit_chart(self, client_with_db: TestClient, test_db: Session):
        """Test calculating transit chart"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        calc_request = {
            "birth_data_id": str(birth_data.id),
            "chart_name": "Transit Chart",
            "chart_type": "transit",
            "astro_system": "western",
            "house_system": "placidus",
            "zodiac_type": "tropical",
            "transit_date": datetime.now().isoformat()
        }

        response = client_with_db.post("/api/charts/calculate", json=calc_request)

        assert response.status_code == 201
        data = response.json()

        assert data["chart_type"] == "transit"
        chart_data = data["chart_data"]
        assert "natal" in chart_data
        assert "transit_planets" in chart_data
        assert "transit_aspects" in chart_data


# =============================================================================
# House System Tests
# =============================================================================

class TestHouseSystems:
    """Test different house systems"""

    def test_create_chart_with_different_house_systems(self, client_with_db: TestClient, test_db: Session):
        """Test creating charts with various house systems"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        house_systems = ["placidus", "koch", "equal", "whole_sign", "porphyry", "regiomontanus"]

        for house_system in house_systems:
            chart = create_test_chart(
                test_db,
                client.id,
                birth_data.id,
                chart_name=f"{house_system.title()} Chart",
                house_system=house_system
            )

            response = client_with_db.get(f"/api/charts/{chart.id}")
            assert response.status_code == 200
            data = response.json()
            assert data["house_system"] == house_system


# =============================================================================
# Chart Type Tests
# =============================================================================

class TestChartTypes:
    """Test different chart types"""

    def test_create_different_chart_types(self, client_with_db: TestClient, test_db: Session):
        """Test creating charts of different types"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        chart_types = ["natal", "transit", "progression", "synastry", "composite"]

        for chart_type in chart_types:
            chart = create_test_chart(
                test_db,
                client.id,
                birth_data.id,
                chart_name=f"{chart_type.title()} Chart",
                chart_type=chart_type
            )

            response = client_with_db.get(f"/api/charts/{chart.id}")
            assert response.status_code == 200
            data = response.json()
            assert data["chart_type"] == chart_type
