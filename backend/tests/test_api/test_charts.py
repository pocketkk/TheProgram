"""
Tests for chart management and calculation endpoints
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_user_with_birth_data(client):
    """Create test user, client, and birth data"""
    # Create user
    user_data = {"email": "testuser@example.com", "password": "TestPass123"}
    user_response = client.post("/api/auth/register", json=user_data)
    user = user_response.json()

    # Create client
    client_data = {"first_name": "Jane", "last_name": "Doe"}
    client_response = client.post(
        "/api/clients/",
        json=client_data,
        headers={"Authorization": f"Bearer {user['access_token']}"}
    )
    user["client_id"] = client_response.json()["id"]

    # Create birth data
    birth_data = {
        "client_id": user["client_id"],
        "birth_date": "1990-01-15",
        "birth_time": "14:30:00",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "timezone": "America/New_York",
        "city": "New York",
        "country": "USA"
    }
    birth_response = client.post(
        "/api/birth-data/",
        json=birth_data,
        headers={"Authorization": f"Bearer {user['access_token']}"}
    )
    user["birth_data_id"] = birth_response.json()["id"]

    return user


@pytest.fixture
def auth_headers(test_user_with_birth_data):
    """Get authentication headers"""
    return {"Authorization": f"Bearer {test_user_with_birth_data['access_token']}"}


# =============================================================================
# Chart Calculation Tests
# =============================================================================

class TestCalculateChart:
    """Test POST /api/charts/calculate endpoint"""

    @pytest.mark.api
    @pytest.mark.slow
    def test_calculate_natal_chart(self, client, auth_headers, test_user_with_birth_data):
        """Test calculating a natal chart"""
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western",
            "house_system": "placidus",
            "zodiac_type": "tropical",
            "chart_name": "Test Natal Chart"
        }

        response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert data["chart_type"] == "natal"
        assert data["astro_system"] == "western"
        assert data["house_system"] == "placidus"
        assert data["zodiac_type"] == "tropical"
        assert data["chart_name"] == "Test Natal Chart"

        # Check calculation timing
        assert "calculation_time_ms" in data
        assert data["calculation_time_ms"] > 0

        # Check chart_data structure
        chart_data = data["chart_data"]
        assert "planets" in chart_data
        assert "houses" in chart_data
        assert "aspects" in chart_data
        assert "julian_day" in chart_data

    @pytest.mark.api
    @pytest.mark.slow
    def test_calculated_chart_contains_planets(self, client, auth_headers, test_user_with_birth_data):
        """Test that calculated chart contains planet positions"""
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }

        response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )

        assert response.status_code == 201
        chart_data = response.json()["chart_data"]

        planets = chart_data["planets"]
        expected_planets = ["sun", "moon", "mercury", "venus", "mars",
                          "jupiter", "saturn", "uranus", "neptune", "pluto"]

        for planet in expected_planets:
            assert planet in planets
            planet_data = planets[planet]
            assert "longitude" in planet_data
            assert "latitude" in planet_data
            assert "sign" in planet_data
            assert "sign_name" in planet_data
            assert 0 <= planet_data["longitude"] < 360

    @pytest.mark.api
    @pytest.mark.slow
    def test_calculated_chart_contains_houses(self, client, auth_headers, test_user_with_birth_data):
        """Test that calculated chart contains house cusps"""
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western",
            "house_system": "placidus"
        }

        response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )

        assert response.status_code == 201
        chart_data = response.json()["chart_data"]

        houses = chart_data["houses"]
        assert "cusps" in houses
        assert len(houses["cusps"]) == 12
        assert "ascendant" in houses
        assert "mc" in houses

        # All cusps should be valid longitudes
        for cusp in houses["cusps"]:
            assert 0 <= cusp < 360

    @pytest.mark.api
    @pytest.mark.slow
    def test_calculate_with_different_house_systems(self, client, auth_headers, test_user_with_birth_data):
        """Test calculating charts with different house systems"""
        house_systems = ["placidus", "koch", "equal", "whole_sign"]

        for house_system in house_systems:
            calc_request = {
                "birth_data_id": test_user_with_birth_data["birth_data_id"],
                "chart_type": "natal",
                "astro_system": "western",
                "house_system": house_system
            }

            response = client.post(
                "/api/charts/calculate",
                json=calc_request,
                headers=auth_headers
            )

            assert response.status_code == 201
            data = response.json()
            assert data["house_system"] == house_system

    @pytest.mark.api
    @pytest.mark.slow
    def test_calculate_tropical_vs_sidereal(self, client, auth_headers, test_user_with_birth_data):
        """Test calculating tropical vs sidereal charts"""
        # Calculate tropical chart
        tropical_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western",
            "zodiac_type": "tropical"
        }
        tropical_response = client.post(
            "/api/charts/calculate",
            json=tropical_request,
            headers=auth_headers
        )

        # Calculate sidereal chart
        sidereal_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "vedic",
            "zodiac_type": "sidereal",
            "ayanamsa": "lahiri"
        }
        sidereal_response = client.post(
            "/api/charts/calculate",
            json=sidereal_request,
            headers=auth_headers
        )

        assert tropical_response.status_code == 201
        assert sidereal_response.status_code == 201

        # Planet positions should differ due to ayanamsa
        tropical_sun = tropical_response.json()["chart_data"]["planets"]["sun"]["longitude"]
        sidereal_sun = sidereal_response.json()["chart_data"]["planets"]["sun"]["longitude"]

        # They should be different (about 24 degrees difference)
        assert abs(tropical_sun - sidereal_sun) > 10

    @pytest.mark.api
    def test_calculate_invalid_birth_data(self, client, auth_headers):
        """Test calculating with non-existent birth data fails"""
        calc_request = {
            "birth_data_id": "00000000-0000-0000-0000-000000000000",
            "chart_type": "natal",
            "astro_system": "western"
        }

        response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.api
    def test_calculate_invalid_chart_type(self, client, auth_headers, test_user_with_birth_data):
        """Test calculating with invalid chart type fails"""
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "invalid_type",
            "astro_system": "western"
        }

        response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )

        assert response.status_code == 422

    @pytest.mark.api
    def test_calculate_other_users_birth_data(self, client, test_user_with_birth_data):
        """Test that users cannot calculate charts for other users' birth data"""
        # Create second user
        user2_data = {"email": "user2@example.com", "password": "Pass123"}
        user2_response = client.post("/api/auth/register", json=user2_data)
        user2_token = user2_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Try to calculate chart for first user's birth data
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }

        response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=user2_headers
        )

        assert response.status_code == 403


# =============================================================================
# Create Chart Tests (Pre-calculated)
# =============================================================================

class TestCreateChart:
    """Test POST /api/charts/ endpoint"""

    @pytest.mark.api
    def test_create_chart_with_data(self, client, auth_headers, test_user_with_birth_data):
        """Test creating chart with pre-calculated data"""
        chart_data = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western",
            "house_system": "placidus",
            "zodiac_type": "tropical",
            "chart_name": "Pre-calculated Chart",
            "chart_data": {
                "planets": {"sun": {"longitude": 294.5}},
                "houses": {"cusps": [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]}
            }
        }

        response = client.post(
            "/api/charts/",
            json=chart_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["chart_name"] == "Pre-calculated Chart"
        assert data["chart_data"]["planets"]["sun"]["longitude"] == 294.5


# =============================================================================
# List Charts Tests
# =============================================================================

class TestListCharts:
    """Test GET /api/charts/ endpoint"""

    @pytest.mark.api
    def test_list_charts(self, client, auth_headers, test_user_with_birth_data):
        """Test listing charts"""
        # Calculate a chart
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        client.post("/api/charts/calculate", json=calc_request, headers=auth_headers)

        # List charts
        response = client.get("/api/charts/", headers=auth_headers)

        assert response.status_code == 200
        charts = response.json()
        assert isinstance(charts, list)
        assert len(charts) >= 1

    @pytest.mark.api
    def test_list_charts_filter_by_type(self, client, auth_headers, test_user_with_birth_data):
        """Test filtering charts by type"""
        # Calculate natal chart
        natal_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        client.post("/api/charts/calculate", json=natal_request, headers=auth_headers)

        # Filter by natal
        response = client.get("/api/charts/?chart_type=natal", headers=auth_headers)

        assert response.status_code == 200
        charts = response.json()
        assert all(chart["chart_type"] == "natal" for chart in charts)

    @pytest.mark.api
    def test_list_charts_filter_by_system(self, client, auth_headers, test_user_with_birth_data):
        """Test filtering charts by astrological system"""
        # Calculate western chart
        request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        client.post("/api/charts/calculate", json=request, headers=auth_headers)

        # Filter by western
        response = client.get("/api/charts/?astro_system=western", headers=auth_headers)

        assert response.status_code == 200
        charts = response.json()
        assert all(chart["astro_system"] == "western" for chart in charts)

    @pytest.mark.api
    def test_list_charts_pagination(self, client, auth_headers, test_user_with_birth_data):
        """Test chart list pagination"""
        # Create multiple charts
        for i in range(5):
            calc_request = {
                "birth_data_id": test_user_with_birth_data["birth_data_id"],
                "chart_type": "natal",
                "astro_system": "western",
                "chart_name": f"Chart {i}"
            }
            client.post("/api/charts/calculate", json=calc_request, headers=auth_headers)

        # Test pagination
        response = client.get("/api/charts/?skip=0&limit=2", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) <= 2


# =============================================================================
# Get Chart Tests
# =============================================================================

class TestGetChart:
    """Test GET /api/charts/{chart_id} endpoint"""

    @pytest.mark.api
    def test_get_chart(self, client, auth_headers, test_user_with_birth_data):
        """Test getting specific chart"""
        # Calculate chart
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        calc_response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )
        chart_id = calc_response.json()["id"]

        # Get chart
        response = client.get(f"/api/charts/{chart_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == chart_id

    @pytest.mark.api
    def test_get_chart_updates_last_viewed(self, client, auth_headers, test_user_with_birth_data):
        """Test that getting a chart updates last_viewed"""
        # Calculate chart
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        calc_response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )
        chart_id = calc_response.json()["id"]

        # Get chart
        response = client.get(f"/api/charts/{chart_id}", headers=auth_headers)
        data = response.json()

        # last_viewed should now be set
        assert data["last_viewed"] is not None

    @pytest.mark.api
    def test_get_nonexistent_chart(self, client, auth_headers):
        """Test getting non-existent chart"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/charts/{fake_id}", headers=auth_headers)

        assert response.status_code == 404


# =============================================================================
# Update Chart Tests
# =============================================================================

class TestUpdateChart:
    """Test PUT /api/charts/{chart_id} endpoint"""

    @pytest.mark.api
    def test_update_chart_name(self, client, auth_headers, test_user_with_birth_data):
        """Test updating chart name"""
        # Calculate chart
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        calc_response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )
        chart_id = calc_response.json()["id"]

        # Update chart name
        update_data = {"chart_name": "Updated Chart Name"}
        response = client.put(
            f"/api/charts/{chart_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["chart_name"] == "Updated Chart Name"

    @pytest.mark.api
    def test_update_chart_metadata(self, client, auth_headers, test_user_with_birth_data):
        """Test updating chart metadata"""
        # Calculate chart
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        calc_response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )
        chart_id = calc_response.json()["id"]

        # Update metadata
        update_data = {
            "chart_name": "New Name",
            "calculation_params": {"custom": "params"}
        }
        response = client.put(
            f"/api/charts/{chart_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200


# =============================================================================
# Delete Chart Tests
# =============================================================================

class TestDeleteChart:
    """Test DELETE /api/charts/{chart_id} endpoint"""

    @pytest.mark.api
    def test_delete_chart(self, client, auth_headers, test_user_with_birth_data, db_session):
        """Test deleting chart"""
        from uuid import UUID
        from app.models import Chart

        # Calculate chart
        calc_request = {
            "birth_data_id": test_user_with_birth_data["birth_data_id"],
            "chart_type": "natal",
            "astro_system": "western"
        }
        calc_response = client.post(
            "/api/charts/calculate",
            json=calc_request,
            headers=auth_headers
        )
        chart_id = calc_response.json()["id"]

        # Delete chart
        response = client.delete(f"/api/charts/{chart_id}", headers=auth_headers)

        assert response.status_code == 200

        # Verify deletion
        deleted = db_session.query(Chart).filter(Chart.id == UUID(chart_id)).first()
        assert deleted is None

    @pytest.mark.api
    def test_delete_nonexistent_chart(self, client, auth_headers):
        """Test deleting non-existent chart"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.delete(f"/api/charts/{fake_id}", headers=auth_headers)

        assert response.status_code == 404
