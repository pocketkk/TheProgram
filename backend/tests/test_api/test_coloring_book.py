"""
Tests for Coloring Book / Art Therapy API endpoints
"""
import pytest
import base64
from fastapi import status


class TestColoringBookTemplates:
    """Test coloring book template endpoints"""

    @pytest.mark.integration
    def test_list_templates(self, client):
        """Test listing all templates"""
        response = client.get("/api/coloring-book/templates")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "templates" in data
        assert "total" in data
        assert isinstance(data["templates"], list)
        assert data["total"] > 0

    @pytest.mark.integration
    def test_list_templates_with_theme_filter(self, client):
        """Test filtering templates by theme"""
        response = client.get("/api/coloring-book/templates?theme=mandala")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "templates" in data
        # All returned templates should have mandala theme
        for template in data["templates"]:
            assert template["theme"] == "mandala"

    @pytest.mark.integration
    def test_template_structure(self, client):
        """Test that templates have required fields"""
        response = client.get("/api/coloring-book/templates")

        data = response.json()
        assert len(data["templates"]) > 0

        template = data["templates"][0]
        required_fields = ["id", "name", "description", "theme", "thumbnail_url", "prompt"]

        for field in required_fields:
            assert field in template, f"Missing required field: {field}"


class TestColoringBookImages:
    """Test coloring book image listing"""

    @pytest.mark.integration
    def test_list_coloring_book_images(self, client_with_db):
        """Test listing generated coloring book images"""
        response = client_with_db.get("/api/coloring-book/images")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.integration
    def test_list_images_with_pagination(self, client_with_db):
        """Test image listing with pagination"""
        response = client_with_db.get("/api/coloring-book/images?limit=10&offset=0")

        assert response.status_code == status.HTTP_200_OK


class TestArtworkCRUD:
    """Test artwork CRUD operations"""

    @pytest.fixture
    def sample_artwork_data(self):
        """Sample artwork data for testing"""
        # Create a small white PNG image (1x1 pixel)
        # PNG header + IHDR + IDAT + IEND for 1x1 white pixel
        png_data = base64.b64encode(
            bytes([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk length + type
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # width=1, height=1
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # bit depth, color type, CRC
                0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
                0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF,
                0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
                0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND
                0x44, 0xAE, 0x42, 0x60, 0x82
            ])
        ).decode('utf-8')

        return {
            "name": "Test Artwork",
            "image_data": f"data:image/png;base64,{png_data}",
            "tags": ["test", "unit-test"]
        }

    @pytest.mark.integration
    def test_save_artwork(self, client_with_db, sample_artwork_data):
        """Test saving new artwork"""
        response = client_with_db.post(
            "/api/coloring-book/artwork",
            json=sample_artwork_data
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["name"] == sample_artwork_data["name"]
        assert "id" in data
        assert "url" in data
        assert data["tags"] == sample_artwork_data["tags"]

    @pytest.mark.integration
    def test_list_artwork(self, client_with_db):
        """Test listing artwork"""
        response = client_with_db.get("/api/coloring-book/artwork")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "artworks" in data
        assert "total" in data
        assert isinstance(data["artworks"], list)

    @pytest.mark.integration
    def test_artwork_pagination(self, client_with_db):
        """Test artwork pagination"""
        response = client_with_db.get("/api/coloring-book/artwork?limit=5&offset=0")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 0

    @pytest.mark.integration
    def test_get_nonexistent_artwork(self, client_with_db):
        """Test getting artwork that doesn't exist"""
        response = client_with_db.get("/api/coloring-book/artwork/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.integration
    def test_delete_nonexistent_artwork(self, client_with_db):
        """Test deleting artwork that doesn't exist"""
        response = client_with_db.delete("/api/coloring-book/artwork/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestColoringBookGeneration:
    """Test coloring book image generation (requires Google API key)"""

    @pytest.mark.integration
    def test_generate_without_api_key(self, client_with_db):
        """Test generation fails gracefully without API key"""
        response = client_with_db.post(
            "/api/coloring-book/generate",
            json={
                "prompt": "A beautiful mandala",
                "theme": "mandala",
                "complexity": "medium"
            }
        )

        # Should return 400 because API key is not configured
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "API key" in data["detail"]

    @pytest.mark.integration
    def test_generate_from_template_without_api_key(self, client_with_db):
        """Test template generation fails gracefully without API key"""
        response = client_with_db.post(
            "/api/coloring-book/generate-from-template/mandala_cosmic?complexity=medium"
        )

        # Should return 400 because API key is not configured
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.integration
    def test_generate_from_invalid_template(self, client_with_db):
        """Test generation from non-existent template"""
        response = client_with_db.post(
            "/api/coloring-book/generate-from-template/nonexistent_template"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestRequestValidation:
    """Test request validation"""

    @pytest.mark.integration
    def test_save_artwork_missing_name(self, client_with_db):
        """Test saving artwork without required name field"""
        response = client_with_db.post(
            "/api/coloring-book/artwork",
            json={
                "image_data": "data:image/png;base64,iVBORw0KGgo=",
                "tags": []
            }
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.integration
    def test_save_artwork_missing_image_data(self, client_with_db):
        """Test saving artwork without image data"""
        response = client_with_db.post(
            "/api/coloring-book/artwork",
            json={
                "name": "Test",
                "tags": []
            }
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.integration
    def test_generate_short_prompt(self, client_with_db):
        """Test generation with too short prompt"""
        response = client_with_db.post(
            "/api/coloring-book/generate",
            json={
                "prompt": "ab",  # Too short (min 3 chars)
                "theme": "mandala",
                "complexity": "medium"
            }
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestArtworkWorkflow:
    """Test complete artwork workflow"""

    @pytest.fixture
    def sample_png_base64(self):
        """Generate a valid base64 PNG for testing"""
        # Minimal valid 1x1 white PNG
        png_bytes = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        return base64.b64encode(png_bytes).decode('utf-8')

    @pytest.mark.integration
    def test_full_artwork_crud_workflow(self, client_with_db, sample_png_base64):
        """Test complete create-read-update-delete workflow"""
        # 1. Create artwork
        create_response = client_with_db.post(
            "/api/coloring-book/artwork",
            json={
                "name": "Workflow Test",
                "image_data": f"data:image/png;base64,{sample_png_base64}",
                "tags": ["workflow", "test"]
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        artwork = create_response.json()
        artwork_id = artwork["id"]

        # 2. Read artwork
        get_response = client_with_db.get(f"/api/coloring-book/artwork/{artwork_id}")
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["name"] == "Workflow Test"

        # 3. Update artwork
        update_response = client_with_db.patch(
            f"/api/coloring-book/artwork/{artwork_id}",
            json={"name": "Updated Name", "tags": ["updated"]}
        )
        assert update_response.status_code == status.HTTP_200_OK
        assert update_response.json()["name"] == "Updated Name"
        assert update_response.json()["tags"] == ["updated"]

        # 4. Delete artwork
        delete_response = client_with_db.delete(f"/api/coloring-book/artwork/{artwork_id}")
        assert delete_response.status_code == status.HTTP_200_OK

        # 5. Verify deletion
        verify_response = client_with_db.get(f"/api/coloring-book/artwork/{artwork_id}")
        assert verify_response.status_code == status.HTTP_404_NOT_FOUND
