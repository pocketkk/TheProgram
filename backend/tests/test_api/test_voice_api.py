"""
Tests for Voice Chat API Endpoints

Tests the REST API endpoints for voice settings and status.
Note: WebSocket tests require special handling.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


class TestVoiceOptionsEndpoint:
    """Tests for GET /voice/options endpoint"""

    def test_get_voice_options(self, client):
        """Should return available voice options"""
        response = client.get("/api/voice/options")

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "voices" in data
        assert "default_settings" in data
        assert "response_lengths" in data

        # Check voices
        voices = data["voices"]
        assert len(voices) == 5
        voice_names = [v["name"] for v in voices]
        assert "Puck" in voice_names
        assert "Charon" in voice_names
        assert "Kore" in voice_names
        assert "Fenrir" in voice_names
        assert "Aoede" in voice_names

        # Check each voice has description
        for voice in voices:
            assert "name" in voice
            assert "description" in voice
            assert len(voice["description"]) > 0

        # Check default settings
        defaults = data["default_settings"]
        assert defaults["voice_name"] == "Kore"
        assert defaults["personality"] == "mystical guide"
        assert defaults["speaking_style"] == "warm and contemplative"
        assert defaults["response_length"] == "medium"

        # Check response lengths
        assert data["response_lengths"] == ["brief", "medium", "detailed"]


class TestVoiceSettingsEndpoint:
    """Tests for GET/PUT /voice/settings endpoints"""

    def test_get_voice_settings_defaults(self, client_with_db):
        """Should return default voice settings"""
        response = client_with_db.get("/api/voice/settings")

        assert response.status_code == 200
        data = response.json()

        assert data["voice_name"] == "Kore"
        assert data["personality"] == "mystical guide"
        assert data["speaking_style"] == "warm and contemplative"
        assert data["response_length"] == "medium"
        assert data["custom_personality"] is None

    def test_update_voice_settings(self, client_with_db):
        """Should update voice settings"""
        new_settings = {
            "voice_name": "Charon",
            "personality": "wise oracle",
            "speaking_style": "deep and mysterious",
            "response_length": "detailed",
        }

        response = client_with_db.put("/api/voice/settings", json=new_settings)

        assert response.status_code == 200
        data = response.json()

        assert data["voice_name"] == "Charon"
        assert data["personality"] == "wise oracle"
        assert data["speaking_style"] == "deep and mysterious"
        assert data["response_length"] == "detailed"

    def test_update_partial_voice_settings(self, client_with_db):
        """Should update only specified settings"""
        # Update just the voice
        response = client_with_db.put("/api/voice/settings", json={"voice_name": "Puck"})

        assert response.status_code == 200
        data = response.json()

        assert data["voice_name"] == "Puck"
        # Other settings should remain at defaults
        assert data["personality"] == "mystical guide"

    def test_update_custom_personality(self, client_with_db):
        """Should update custom personality"""
        custom = "You are a cosmic oracle with ancient wisdom."

        response = client_with_db.put(
            "/api/voice/settings",
            json={"custom_personality": custom}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["custom_personality"] == custom

    def test_settings_persist_after_update(self, client_with_db):
        """Settings should persist after update"""
        # Update settings
        client_with_db.put("/api/voice/settings", json={"voice_name": "Fenrir"})

        # Get settings again
        response = client_with_db.get("/api/voice/settings")
        data = response.json()

        assert data["voice_name"] == "Fenrir"


class TestVoiceStatusEndpoint:
    """Tests for GET /voice/status endpoint"""

    def test_voice_status_no_api_key(self, client_with_db):
        """Should report unavailable when no API key"""
        response = client_with_db.get("/api/voice/status")

        assert response.status_code == 200
        data = response.json()

        assert data["available"] is False
        assert "Google API key required" in data["message"]

    def test_voice_status_with_api_key(self, client_with_db, test_db):
        """Should report available when API key is configured"""
        from app.models.app_config import AppConfig

        # Set API key in database
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.google_api_key = "test_api_key"
        test_db.commit()

        response = client_with_db.get("/api/voice/status")

        assert response.status_code == 200
        data = response.json()

        assert data["available"] is True
        assert "ready" in data["message"].lower()


class TestVoiceAPIIntegration:
    """Integration tests for voice API flow"""

    def test_full_settings_flow(self, client_with_db):
        """Test complete settings update flow"""
        # 1. Get initial settings
        response = client_with_db.get("/api/voice/settings")
        initial = response.json()
        assert initial["voice_name"] == "Kore"

        # 2. Update all settings
        new_settings = {
            "voice_name": "Aoede",
            "personality": "calm mentor",
            "speaking_style": "soft and melodic",
            "response_length": "brief",
            "custom_personality": "A peaceful guide."
        }
        response = client_with_db.put("/api/voice/settings", json=new_settings)
        updated = response.json()

        # 3. Verify all changes
        assert updated["voice_name"] == "Aoede"
        assert updated["personality"] == "calm mentor"
        assert updated["speaking_style"] == "soft and melodic"
        assert updated["response_length"] == "brief"
        assert updated["custom_personality"] == "A peaceful guide."

        # 4. Get settings again to verify persistence
        response = client_with_db.get("/api/voice/settings")
        persisted = response.json()

        assert persisted == updated

    def test_options_include_all_voices_from_settings(self, client):
        """Verify options endpoint returns all configurable voices"""
        options = client.get("/api/voice/options").json()

        # Each voice in options should be selectable in settings
        for voice in options["voices"]:
            voice_name = voice["name"]
            # This voice should be valid for settings
            assert voice_name in ["Puck", "Charon", "Kore", "Fenrir", "Aoede"]
