"""
Integration tests for Chart Interpretation endpoints

Tests AI-generated interpretations, CRUD operations,
and validation for the /api/charts/{chart_id}/interpretations endpoints.

Note: Tests that require AI API calls are marked with @pytest.mark.skip
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
)


# =============================================================================
# Get Chart Interpretations Tests
# =============================================================================

class TestGetChartInterpretations:
    """Test GET /api/charts/{chart_id}/interpretations"""

    def test_get_interpretations_empty(self, client_with_db: TestClient, test_db: Session):
        """Test getting interpretations for chart with none"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        response = client_with_db.get(f"/api/charts/{chart.id}/interpretations")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_interpretations_chart_not_found(self, client_with_db: TestClient):
        """Test getting interpretations for non-existent chart"""
        fake_chart_id = uuid4()

        response = client_with_db.get(f"/api/charts/{fake_chart_id}/interpretations")

        assert_error_response(response, 404, "chart not found")

    def test_get_interpretations_with_filter(self, client_with_db: TestClient, test_db: Session):
        """Test filtering interpretations by element type"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        # Create different types of interpretations
        planet_interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Sun interpretation",
            ai_model="test-model"
        )
        house_interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="house",
            element_key="1",
            ai_description="House 1 interpretation",
            ai_model="test-model"
        )

        test_db.add(planet_interp)
        test_db.add(house_interp)
        test_db.commit()

        # Filter by planet
        response = client_with_db.get(
            f"/api/charts/{chart.id}/interpretations?element_type=planet"
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data) == 1
        assert data[0]["element_type"] == "planet"


# =============================================================================
# Generate Interpretations Tests
# =============================================================================

class TestGenerateInterpretations:
    """Test POST /api/charts/{chart_id}/interpretations/generate"""

    @pytest.mark.skip(reason="Requires AI API access and real chart data")
    def test_generate_interpretations_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful interpretation generation"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)

        # Create chart with realistic data
        chart = create_test_chart(
            test_db,
            client.id,
            birth_data.id,
            chart_data={
                "planets": {
                    "sun": {"longitude": 294.5, "sign": "Capricorn"},
                    "moon": {"longitude": 120.0, "sign": "Cancer"}
                },
                "houses": {
                    "1": {"cusp": 15.0}
                },
                "aspects": [
                    {"planet1": "sun", "planet2": "moon", "type": "trine", "orb": 1.5}
                ]
            }
        )

        generate_request = {
            "element_types": ["planet", "house", "aspect"],
            "ai_model": "claude-haiku-4-5-20251001",
            "regenerate_existing": False
        }

        response = client_with_db.post(
            f"/api/charts/{chart.id}/interpretations/generate",
            json=generate_request
        )

        assert response.status_code == 200
        data = response.json()

        assert "generated_count" in data
        assert "skipped_count" in data
        assert "interpretations" in data
        assert isinstance(data["interpretations"], list)

    def test_generate_interpretations_chart_not_found(self, client_with_db: TestClient):
        """Test generating interpretations for non-existent chart"""
        fake_chart_id = uuid4()

        generate_request = {
            "element_types": ["planet"],
            "ai_model": "claude-haiku-4-5-20251001"
        }

        response = client_with_db.post(
            f"/api/charts/{fake_chart_id}/interpretations/generate",
            json=generate_request
        )

        assert_error_response(response, 404, "chart not found")

    def test_generate_interpretations_invalid_model(self, client_with_db: TestClient, test_db: Session):
        """Test generating interpretations with invalid AI model"""
        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        generate_request = {
            "element_types": ["planet"],
            "ai_model": "invalid-model-name"
        }

        response = client_with_db.post(
            f"/api/charts/{chart.id}/interpretations/generate",
            json=generate_request
        )

        # Should fail with 500 due to invalid model
        assert response.status_code == 500

    @pytest.mark.skip(reason="Requires AI API access")
    def test_generate_interpretations_skip_existing(self, client_with_db: TestClient, test_db: Session):
        """Test that existing interpretations are skipped by default"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(
            test_db,
            client.id,
            birth_data.id,
            chart_data={"planets": {"sun": {"longitude": 294.5}}}
        )

        # Create existing interpretation
        existing_interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Existing interpretation",
            ai_model="test-model"
        )
        test_db.add(existing_interp)
        test_db.commit()

        generate_request = {
            "element_types": ["planet"],
            "regenerate_existing": False
        }

        response = client_with_db.post(
            f"/api/charts/{chart.id}/interpretations/generate",
            json=generate_request
        )

        assert response.status_code == 200
        data = response.json()

        assert data["skipped_count"] > 0

    @pytest.mark.skip(reason="Requires AI API access")
    def test_generate_interpretations_regenerate(self, client_with_db: TestClient, test_db: Session):
        """Test regenerating existing interpretations"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(
            test_db,
            client.id,
            birth_data.id,
            chart_data={"planets": {"sun": {"longitude": 294.5}}}
        )

        # Create existing interpretation
        existing_interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Old interpretation",
            ai_model="test-model",
            version=1
        )
        test_db.add(existing_interp)
        test_db.commit()

        original_description = existing_interp.ai_description

        generate_request = {
            "element_types": ["planet"],
            "regenerate_existing": True
        }

        response = client_with_db.post(
            f"/api/charts/{chart.id}/interpretations/generate",
            json=generate_request
        )

        assert response.status_code == 200
        data = response.json()

        # Should regenerate, not skip
        assert data["generated_count"] > 0

        # Version should increment
        test_db.refresh(existing_interp)
        assert existing_interp.version == 2


# =============================================================================
# Get Single Interpretation Tests
# =============================================================================

class TestGetInterpretation:
    """Test GET /api/interpretations/{interpretation_id}"""

    def test_get_interpretation_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful interpretation retrieval"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Test description",
            ai_model="test-model"
        )
        test_db.add(interp)
        test_db.commit()
        test_db.refresh(interp)

        response = client_with_db.get(f"/api/interpretations/{interp.id}")

        assert response.status_code == 200
        data = response.json()

        assert str(data["id"]) == str(interp.id)
        assert data["element_type"] == "planet"
        assert data["element_key"] == "sun"
        assert data["ai_description"] == "Test description"

    def test_get_interpretation_not_found(self, client_with_db: TestClient):
        """Test getting non-existent interpretation"""
        fake_uuid = uuid4()

        response = client_with_db.get(f"/api/interpretations/{fake_uuid}")

        assert_error_response(response, 404, "interpretation not found")


# =============================================================================
# Update Interpretation Tests
# =============================================================================

class TestUpdateInterpretation:
    """Test PATCH /api/interpretations/{interpretation_id}"""

    def test_update_interpretation_description(self, client_with_db: TestClient, test_db: Session):
        """Test updating interpretation description"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Original description",
            ai_model="test-model"
        )
        test_db.add(interp)
        test_db.commit()

        update_data = {
            "ai_description": "Updated description"
        }

        response = client_with_db.patch(
            f"/api/interpretations/{interp.id}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["ai_description"] == "Updated description"

    def test_update_interpretation_approval_status(self, client_with_db: TestClient, test_db: Session):
        """Test updating interpretation approval status"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Test",
            ai_model="test-model",
            is_approved="pending"
        )
        test_db.add(interp)
        test_db.commit()

        # Approve
        update_data = {"is_approved": "approved"}

        response = client_with_db.patch(
            f"/api/interpretations/{interp.id}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["is_approved"] == "approved"

        # Reject
        update_data = {"is_approved": "rejected"}

        response = client_with_db.patch(
            f"/api/interpretations/{interp.id}",
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["is_approved"] == "rejected"

    def test_update_interpretation_not_found(self, client_with_db: TestClient):
        """Test updating non-existent interpretation"""
        fake_uuid = uuid4()
        update_data = {"ai_description": "Test"}

        response = client_with_db.patch(
            f"/api/interpretations/{fake_uuid}",
            json=update_data
        )

        assert_error_response(response, 404, "interpretation not found")


# =============================================================================
# Delete Interpretation Tests
# =============================================================================

class TestDeleteInterpretation:
    """Test DELETE /api/interpretations/{interpretation_id}"""

    def test_delete_interpretation_success(self, client_with_db: TestClient, test_db: Session):
        """Test successful interpretation deletion"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Test",
            ai_model="test-model"
        )
        test_db.add(interp)
        test_db.commit()
        interp_id = interp.id

        response = client_with_db.delete(f"/api/interpretations/{interp_id}")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

        # Verify deletion
        get_response = client_with_db.get(f"/api/interpretations/{interp_id}")
        assert get_response.status_code == 404

    def test_delete_interpretation_not_found(self, client_with_db: TestClient):
        """Test deleting non-existent interpretation"""
        fake_uuid = uuid4()

        response = client_with_db.delete(f"/api/interpretations/{fake_uuid}")

        assert_error_response(response, 404, "interpretation not found")


# =============================================================================
# Interpretation Cascade Tests
# =============================================================================

class TestInterpretationCascade:
    """Test cascade deletion of interpretations"""

    def test_delete_chart_cascades_interpretations(self, client_with_db: TestClient, test_db: Session):
        """Test that deleting chart cascades to interpretations"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        # Create interpretations
        interp_1 = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Test 1",
            ai_model="test-model"
        )
        interp_2 = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="moon",
            ai_description="Test 2",
            ai_model="test-model"
        )

        test_db.add(interp_1)
        test_db.add(interp_2)
        test_db.commit()

        # Verify interpretations exist
        interp_count = test_db.query(ChartInterpretation).filter(
            ChartInterpretation.chart_id == chart.id
        ).count()
        assert interp_count == 2

        # Delete chart
        response = client_with_db.delete(f"/api/charts/{chart.id}")
        assert response.status_code == 200

        # Verify interpretations are deleted
        interp_count = test_db.query(ChartInterpretation).filter(
            ChartInterpretation.chart_id == chart.id
        ).count()
        assert interp_count == 0


# =============================================================================
# Interpretation Validation Tests
# =============================================================================

class TestInterpretationValidation:
    """Test interpretation data validation"""

    def test_valid_element_types(self, client_with_db: TestClient, test_db: Session):
        """Test valid element types"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        valid_types = ["planet", "house", "aspect", "pattern"]

        for element_type in valid_types:
            interp = ChartInterpretation(
                chart_id=chart.id,
                element_type=element_type,
                element_key="test_key",
                ai_description="Test",
                ai_model="test-model"
            )
            test_db.add(interp)
            test_db.commit()

            response = client_with_db.get(f"/api/interpretations/{interp.id}")
            assert response.status_code == 200

    def test_valid_approval_statuses(self, client_with_db: TestClient, test_db: Session):
        """Test valid approval statuses"""
        from app.models_sqlite import ChartInterpretation

        client = create_test_client(test_db)
        birth_data = create_test_birth_data(test_db, client.id)
        chart = create_test_chart(test_db, client.id, birth_data.id)

        valid_statuses = ["pending", "approved", "rejected"]

        for status in valid_statuses:
            interp = ChartInterpretation(
                chart_id=chart.id,
                element_type="planet",
                element_key="test",
                ai_description="Test",
                ai_model="test-model",
                is_approved=status
            )
            test_db.add(interp)
            test_db.commit()

            response = client_with_db.get(f"/api/interpretations/{interp.id}")
            assert response.status_code == 200
            assert response.json()["is_approved"] == status
