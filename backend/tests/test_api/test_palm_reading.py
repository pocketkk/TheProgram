"""
Tests for Palm Reading API Routes

Integration tests for palm reading endpoints.
"""
import pytest
import json
from unittest.mock import patch, Mock, AsyncMock
from fastapi import status
from io import BytesIO


class TestPalmReadingAnalyzeEndpoint:
    """Test /palm-reading/analyze endpoint"""

    @pytest.fixture
    def mock_palm_service_result(self):
        """Mock successful palm reading result"""
        return {
            "success": True,
            "full_reading": "Your palm shows Earth element characteristics...",
            "sections": {
                "hand_shape": "Earth Hand with square palm",
                "heart_line": "Deep and clear",
                "head_line": "Long and analytical",
                "life_line": "Strong vitality",
                "astrological_synthesis": "Strong Earth energy",
                "guidance": "Focus on practical matters"
            },
            "hand_type": "both",
            "model_used": "claude-sonnet-4-20250514",
            "tokens_used": {"input": 1500, "output": 800}
        }

    @pytest.fixture
    def sample_image_file(self):
        """Create a sample image file for upload"""
        # Minimal JPEG bytes
        image_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        return ("test_palm.jpg", BytesIO(image_bytes), "image/jpeg")

    @pytest.mark.integration
    @patch('app.api.routes.palm_reading.PalmReadingService')
    @patch('app.api.routes.palm_reading.get_image_storage_service')
    def test_analyze_palm_success(
        self, mock_storage, mock_service_class,
        client_with_db, mock_palm_service_result, sample_image_file
    ):
        """Test successful palm analysis"""
        # Setup mocks
        mock_service = AsyncMock()
        mock_service.analyze_palm_async.return_value = mock_palm_service_result
        mock_service_class.return_value = mock_service

        mock_storage_instance = Mock()
        mock_storage_instance.save_image.return_value = "/images/palm/test.jpg"
        mock_storage.return_value = mock_storage_instance

        # Make request
        response = client_with_db.post(
            "/api/palm-reading/analyze",
            files={"image": sample_image_file},
            data={"hand_type": "both", "save_reading": "true"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["full_reading"] is not None
        assert "sections" in data

    @pytest.mark.integration
    def test_analyze_palm_invalid_image_type(self, client_with_db):
        """Test rejection of invalid image types"""
        # Create a text file instead of image
        text_file = ("test.txt", BytesIO(b"not an image"), "text/plain")

        response = client_with_db.post(
            "/api/palm-reading/analyze",
            files={"image": text_file},
            data={"hand_type": "both"}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid image type" in response.json()["detail"]

    @pytest.mark.integration
    def test_analyze_palm_invalid_hand_type(self, client_with_db):
        """Test rejection of invalid hand type"""
        image_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00'
        image_file = ("test.jpg", BytesIO(image_bytes), "image/jpeg")

        response = client_with_db.post(
            "/api/palm-reading/analyze",
            files={"image": image_file},
            data={"hand_type": "invalid"}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid hand type" in response.json()["detail"]

    @pytest.mark.integration
    def test_analyze_palm_missing_image(self, client_with_db):
        """Test error when image is missing"""
        response = client_with_db.post(
            "/api/palm-reading/analyze",
            data={"hand_type": "both"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestPalmReadingQuickInsightEndpoint:
    """Test /palm-reading/quick-insight endpoint"""

    @pytest.mark.integration
    @patch('app.api.routes.palm_reading.PalmReadingService')
    def test_quick_insight_success(self, mock_service_class, client_with_db):
        """Test successful quick insight"""
        mock_service = AsyncMock()
        mock_service.generate_quick_insight_async.return_value = {
            "success": True,
            "insight": "Your palm shows creative energy and leadership abilities.",
            "model_used": "claude-sonnet-4-20250514"
        }
        mock_service_class.return_value = mock_service

        image_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00'
        image_file = ("test.jpg", BytesIO(image_bytes), "image/jpeg")

        response = client_with_db.post(
            "/api/palm-reading/quick-insight",
            files={"image": image_file}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "insight" in data


class TestPalmReadingHistoryEndpoint:
    """Test /palm-reading/history endpoint"""

    @pytest.mark.integration
    def test_list_empty_history(self, client_with_db):
        """Test listing empty reading history"""
        response = client_with_db.get("/api/palm-reading/history")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["readings"] == []
        assert data["total"] == 0

    @pytest.mark.integration
    def test_list_history_with_pagination(self, client_with_db, test_db):
        """Test history pagination parameters"""
        response = client_with_db.get(
            "/api/palm-reading/history",
            params={"limit": 10, "offset": 0}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "readings" in data
        assert "total" in data

    @pytest.mark.integration
    def test_list_history_favorites_only(self, client_with_db):
        """Test filtering by favorites"""
        response = client_with_db.get(
            "/api/palm-reading/history",
            params={"favorites_only": True}
        )

        assert response.status_code == status.HTTP_200_OK


class TestPalmReadingCRUDEndpoints:
    """Test CRUD operations for palm readings"""

    @pytest.fixture
    def create_test_reading(self, test_db):
        """Create a test reading in the database"""
        from app.models.palm_reading import PalmReading

        reading = PalmReading(
            hand_type="both",
            full_reading="Test reading content",
            sections_json=json.dumps({"hand_shape": "Earth hand"}),
            model_used="test-model"
        )
        test_db.add(reading)
        test_db.commit()
        test_db.refresh(reading)
        return reading

    @pytest.mark.integration
    def test_get_reading_by_id(self, client_with_db, create_test_reading):
        """Test getting a reading by ID"""
        reading = create_test_reading

        response = client_with_db.get(f"/api/palm-reading/{reading.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == reading.id
        assert data["hand_type"] == "both"

    @pytest.mark.integration
    def test_get_nonexistent_reading(self, client_with_db):
        """Test getting a non-existent reading"""
        response = client_with_db.get("/api/palm-reading/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.integration
    def test_update_reading_notes(self, client_with_db, create_test_reading):
        """Test updating reading notes"""
        reading = create_test_reading

        response = client_with_db.patch(
            f"/api/palm-reading/{reading.id}",
            json={"notes": "My personal notes"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["notes"] == "My personal notes"

    @pytest.mark.integration
    def test_update_reading_favorite(self, client_with_db, create_test_reading):
        """Test toggling favorite status"""
        reading = create_test_reading

        response = client_with_db.patch(
            f"/api/palm-reading/{reading.id}",
            json={"is_favorite": True}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_favorite"] is True

    @pytest.mark.integration
    def test_delete_reading(self, client_with_db, create_test_reading):
        """Test deleting a reading"""
        reading = create_test_reading

        response = client_with_db.delete(f"/api/palm-reading/{reading.id}")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True

        # Verify it's deleted
        response = client_with_db.get(f"/api/palm-reading/{reading.id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.integration
    def test_delete_nonexistent_reading(self, client_with_db):
        """Test deleting a non-existent reading"""
        response = client_with_db.delete("/api/palm-reading/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestPalmReadingModel:
    """Test PalmReading model"""

    def test_model_creation(self, test_db):
        """Test creating a palm reading record"""
        from app.models.palm_reading import PalmReading

        reading = PalmReading(
            hand_type="left",
            full_reading="Test reading for left hand",
            sections_json=json.dumps({"heart_line": "Deep and clear"}),
            model_used="claude-sonnet-4-20250514",
            tokens_input=1000,
            tokens_output=500
        )
        test_db.add(reading)
        test_db.commit()
        test_db.refresh(reading)

        assert reading.id is not None
        assert reading.hand_type == "left"
        assert reading.is_favorite is False
        assert reading.created_at is not None

    def test_model_defaults(self, test_db):
        """Test model default values"""
        from app.models.palm_reading import PalmReading

        reading = PalmReading(
            hand_type="both",
            full_reading="Test reading"
        )
        test_db.add(reading)
        test_db.commit()
        test_db.refresh(reading)

        assert reading.is_favorite is False
        assert reading.notes is None
        assert reading.image_path is None

    def test_model_update(self, test_db):
        """Test updating a palm reading"""
        from app.models.palm_reading import PalmReading

        reading = PalmReading(
            hand_type="both",
            full_reading="Original reading"
        )
        test_db.add(reading)
        test_db.commit()

        reading.notes = "Updated notes"
        reading.is_favorite = True
        test_db.commit()
        test_db.refresh(reading)

        assert reading.notes == "Updated notes"
        assert reading.is_favorite is True
