"""
Tests for meditation API routes

Tests for presets, sessions, stats, and audio generation.
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database_sqlite import get_db, Base
from app.models.app_config import AppConfig
from app.models.user_preferences import UserPreferences
from app.models.meditation import MeditationPreset, MeditationSession, GeneratedMeditationAudio


# =============================================================================
# Test Database Setup
# =============================================================================

@pytest.fixture(scope="function")
def test_db():
    """
    Create a fresh test database for each test
    Uses in-memory SQLite database
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Initialize singleton tables
    config = AppConfig(id="1")
    session.add(config)
    prefs = UserPreferences(id="1")
    session.add(prefs)
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client_with_db(test_db):
    """
    FastAPI test client with test database
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_preset_data():
    """Sample preset creation data"""
    return {
        "name": "Test Preset",
        "description": "A test meditation preset",
        "duration_minutes": 15,
        "interval_bell_minutes": 5,
        "warm_up_seconds": 10,
        "cool_down_seconds": 10,
        "music_enabled": True,
        "music_style": "ambient",
        "music_mood": "calming",
        "visualization_enabled": True,
        "visualization_type": "waveform",
        "visualization_intensity": 0.5,
        "is_favorite": False,
        "is_default": False,
    }


@pytest.fixture
def sample_session_data():
    """Sample session creation data"""
    return {
        "preset_id": None,
        "preset_name": "Quick Session",
        "planned_duration_minutes": 10,
        "actual_duration_seconds": 600,
        "completed": True,
        "mood_before": "anxious",
        "mood_after": "calm",
        "notes": "Great session!",
        "session_date": datetime.now().strftime("%Y-%m-%d"),
    }


# =============================================================================
# Model Tests
# =============================================================================

class TestMeditationModels:
    """Test meditation models"""

    def test_create_preset(self, test_db):
        """Test creating a meditation preset"""
        preset = MeditationPreset(
            name="Test Preset",
            description="Test description",
            duration_minutes=10,
            music_enabled=True,
            music_style="ambient",
            visualization_enabled=True,
            visualization_type="waveform",
        )
        test_db.add(preset)
        test_db.commit()
        test_db.refresh(preset)

        assert preset.id is not None
        assert preset.name == "Test Preset"
        assert preset.duration_minutes == 10
        assert preset.times_used == 0
        assert preset.is_favorite is False

    def test_create_session(self, test_db):
        """Test creating a meditation session"""
        session = MeditationSession(
            planned_duration_minutes=15,
            actual_duration_seconds=900,
            completed=True,
            session_date="2024-01-15",
        )
        test_db.add(session)
        test_db.commit()
        test_db.refresh(session)

        assert session.id is not None
        assert session.planned_duration_minutes == 15
        assert session.actual_duration_seconds == 900
        assert session.completed is True

    def test_preset_to_dict(self, test_db):
        """Test preset to_dict method"""
        preset = MeditationPreset(
            name="Dict Test",
            duration_minutes=20,
            music_enabled=False,
            visualization_enabled=True,
        )
        test_db.add(preset)
        test_db.commit()

        data = preset.to_dict()

        assert data["name"] == "Dict Test"
        assert data["duration_minutes"] == 20
        assert data["music_enabled"] is False
        assert "id" in data
        assert "created_at" in data


# =============================================================================
# Preset API Tests
# =============================================================================

class TestPresetEndpoints:
    """Test preset API endpoints"""

    def test_list_presets_empty(self, client_with_db):
        """Test listing presets when none exist"""
        response = client_with_db.get("/api/meditation/presets")

        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_create_preset(self, client_with_db, sample_preset_data):
        """Test creating a preset"""
        response = client_with_db.post(
            "/api/meditation/presets",
            json=sample_preset_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == sample_preset_data["name"]
        assert data["duration_minutes"] == sample_preset_data["duration_minutes"]
        assert data["music_style"] == sample_preset_data["music_style"]
        assert "id" in data
        assert data["times_used"] == 0

    def test_create_preset_minimal(self, client_with_db):
        """Test creating preset with minimal data"""
        response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Minimal Preset"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "Minimal Preset"
        assert data["duration_minutes"] == 10  # Default
        assert data["music_enabled"] is True  # Default

    def test_get_preset(self, client_with_db, sample_preset_data):
        """Test getting a specific preset"""
        # Create preset first
        create_response = client_with_db.post(
            "/api/meditation/presets",
            json=sample_preset_data
        )
        preset_id = create_response.json()["id"]

        # Get the preset
        response = client_with_db.get(f"/api/meditation/presets/{preset_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == preset_id
        assert data["name"] == sample_preset_data["name"]

    def test_get_preset_not_found(self, client_with_db):
        """Test getting non-existent preset"""
        response = client_with_db.get("/api/meditation/presets/nonexistent-id")

        assert response.status_code == 404

    def test_update_preset(self, client_with_db, sample_preset_data):
        """Test updating a preset"""
        # Create preset
        create_response = client_with_db.post(
            "/api/meditation/presets",
            json=sample_preset_data
        )
        preset_id = create_response.json()["id"]

        # Update it
        response = client_with_db.put(
            f"/api/meditation/presets/{preset_id}",
            json={
                "name": "Updated Name",
                "duration_minutes": 30,
                "is_favorite": True,
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["duration_minutes"] == 30
        assert data["is_favorite"] is True

    def test_delete_preset(self, client_with_db, sample_preset_data):
        """Test deleting a preset"""
        # Create preset
        create_response = client_with_db.post(
            "/api/meditation/presets",
            json=sample_preset_data
        )
        preset_id = create_response.json()["id"]

        # Delete it
        response = client_with_db.delete(f"/api/meditation/presets/{preset_id}")

        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify it's gone
        get_response = client_with_db.get(f"/api/meditation/presets/{preset_id}")
        assert get_response.status_code == 404

    def test_mark_preset_used(self, client_with_db, sample_preset_data):
        """Test marking a preset as used"""
        # Create preset
        create_response = client_with_db.post(
            "/api/meditation/presets",
            json=sample_preset_data
        )
        preset_id = create_response.json()["id"]

        # Mark as used
        response = client_with_db.post(f"/api/meditation/presets/{preset_id}/use")

        assert response.status_code == 200
        assert response.json()["times_used"] == 1

        # Mark as used again
        response = client_with_db.post(f"/api/meditation/presets/{preset_id}/use")
        assert response.json()["times_used"] == 2

    def test_list_presets_favorites_only(self, client_with_db):
        """Test filtering presets by favorites"""
        # Create regular preset
        client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Regular", "is_favorite": False}
        )

        # Create favorite preset
        client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Favorite", "is_favorite": True}
        )

        # Get favorites only
        response = client_with_db.get("/api/meditation/presets?favorites_only=true")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Favorite"

    def test_get_preset_templates(self, client_with_db):
        """Test getting built-in preset templates"""
        response = client_with_db.get("/api/meditation/presets/templates")

        assert response.status_code == 200
        data = response.json()

        # Should have several templates
        assert len(data) > 0
        assert "quick_calm" in data
        assert "deep_relaxation" in data

    def test_set_default_preset(self, client_with_db):
        """Test setting a preset as default"""
        # Create first preset as default
        response1 = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "First", "is_default": True}
        )
        preset1_id = response1.json()["id"]

        # Create second preset as default
        response2 = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Second", "is_default": True}
        )

        # Verify second is default
        assert response2.json()["is_default"] is True

        # Verify first is no longer default
        get_response = client_with_db.get(f"/api/meditation/presets/{preset1_id}")
        assert get_response.json()["is_default"] is False


# =============================================================================
# Session API Tests
# =============================================================================

class TestSessionEndpoints:
    """Test session API endpoints"""

    def test_list_sessions_empty(self, client_with_db):
        """Test listing sessions when none exist"""
        response = client_with_db.get("/api/meditation/sessions")

        assert response.status_code == 200
        data = response.json()
        assert data["sessions"] == []
        assert data["total"] == 0

    def test_create_session(self, client_with_db, sample_session_data):
        """Test creating a session"""
        response = client_with_db.post(
            "/api/meditation/sessions",
            json=sample_session_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["planned_duration_minutes"] == sample_session_data["planned_duration_minutes"]
        assert data["actual_duration_seconds"] == sample_session_data["actual_duration_seconds"]
        assert data["completed"] is True
        assert data["mood_before"] == "anxious"
        assert data["mood_after"] == "calm"

    def test_get_session(self, client_with_db, sample_session_data):
        """Test getting a specific session"""
        # Create session first
        create_response = client_with_db.post(
            "/api/meditation/sessions",
            json=sample_session_data
        )
        session_id = create_response.json()["id"]

        # Get the session
        response = client_with_db.get(f"/api/meditation/sessions/{session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id

    def test_delete_session(self, client_with_db, sample_session_data):
        """Test deleting a session"""
        # Create session
        create_response = client_with_db.post(
            "/api/meditation/sessions",
            json=sample_session_data
        )
        session_id = create_response.json()["id"]

        # Delete it
        response = client_with_db.delete(f"/api/meditation/sessions/{session_id}")

        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_list_sessions_pagination(self, client_with_db):
        """Test session pagination"""
        # Create multiple sessions
        for i in range(15):
            client_with_db.post(
                "/api/meditation/sessions",
                json={
                    "planned_duration_minutes": 10,
                    "actual_duration_seconds": 600,
                    "completed": True,
                    "session_date": f"2024-01-{i+1:02d}",
                }
            )

        # Get first page
        response = client_with_db.get("/api/meditation/sessions?limit=10&offset=0")

        assert response.status_code == 200
        data = response.json()
        assert len(data["sessions"]) == 10
        assert data["total"] == 15

        # Get second page
        response = client_with_db.get("/api/meditation/sessions?limit=10&offset=10")
        data = response.json()
        assert len(data["sessions"]) == 5

    def test_list_sessions_date_filter(self, client_with_db):
        """Test filtering sessions by date"""
        # Create sessions on different dates
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": "2024-01-01",
            }
        )
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": "2024-01-15",
            }
        )

        # Filter by date range
        response = client_with_db.get(
            "/api/meditation/sessions?date_from=2024-01-10&date_to=2024-01-20"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["sessions"]) == 1


# =============================================================================
# Stats API Tests
# =============================================================================

class TestStatsEndpoints:
    """Test stats API endpoints"""

    def test_get_stats_empty(self, client_with_db):
        """Test getting stats with no sessions"""
        response = client_with_db.get("/api/meditation/stats")

        assert response.status_code == 200
        data = response.json()

        assert data["total_sessions"] == 0
        assert data["total_minutes"] == 0
        assert data["streak_days"] == 0
        assert data["average_session_minutes"] == 0

    def test_get_stats_with_sessions(self, client_with_db):
        """Test getting stats with sessions"""
        # Create some sessions
        for i in range(3):
            client_with_db.post(
                "/api/meditation/sessions",
                json={
                    "planned_duration_minutes": 10,
                    "actual_duration_seconds": 600,  # 10 minutes
                    "completed": True,
                    "session_date": "2024-01-15",
                }
            )

        response = client_with_db.get("/api/meditation/stats")

        assert response.status_code == 200
        data = response.json()

        assert data["total_sessions"] == 3
        assert data["total_minutes"] == 30  # 3 * 10 minutes
        assert data["completed_sessions"] == 3
        assert data["average_session_minutes"] == 10.0

    def test_get_stats_with_favorite_preset(self, client_with_db):
        """Test stats includes favorite preset"""
        # Create preset and use it
        preset_response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Favorite Preset"}
        )
        preset_id = preset_response.json()["id"]

        # Mark as used multiple times
        for _ in range(5):
            client_with_db.post(f"/api/meditation/presets/{preset_id}/use")

        response = client_with_db.get("/api/meditation/stats")

        assert response.status_code == 200
        data = response.json()
        assert data["favorite_preset"] == "Favorite Preset"


# =============================================================================
# Streak Edge Case Tests
# =============================================================================

class TestStreakCalculation:
    """Test streak calculation edge cases"""

    def test_streak_no_sessions(self, client_with_db):
        """Streak should be 0 with no sessions"""
        response = client_with_db.get("/api/meditation/stats")
        assert response.json()["streak_days"] == 0

    def test_streak_session_today(self, client_with_db):
        """Streak should be 1 with only today's session"""
        today = datetime.now().strftime("%Y-%m-%d")
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": today,
            }
        )

        response = client_with_db.get("/api/meditation/stats")
        assert response.json()["streak_days"] == 1

    def test_streak_session_yesterday(self, client_with_db):
        """Streak should be 1 with only yesterday's session (haven't meditated today yet)"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": yesterday,
            }
        )

        response = client_with_db.get("/api/meditation/stats")
        assert response.json()["streak_days"] == 1

    def test_streak_session_two_days_ago(self, client_with_db):
        """Streak should be 0 if most recent session is 2+ days ago"""
        two_days_ago = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": two_days_ago,
            }
        )

        response = client_with_db.get("/api/meditation/stats")
        assert response.json()["streak_days"] == 0

    def test_streak_consecutive_days(self, client_with_db):
        """Streak should count consecutive days"""
        today = datetime.now()

        # Create sessions for today and the past 4 days (5 day streak)
        for i in range(5):
            session_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            client_with_db.post(
                "/api/meditation/sessions",
                json={
                    "planned_duration_minutes": 10,
                    "actual_duration_seconds": 600,
                    "completed": True,
                    "session_date": session_date,
                }
            )

        response = client_with_db.get("/api/meditation/stats")
        assert response.json()["streak_days"] == 5

    def test_streak_gap_breaks_streak(self, client_with_db):
        """Gap in sessions should break the streak"""
        today = datetime.now()

        # Session today
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": today.strftime("%Y-%m-%d"),
            }
        )

        # Session yesterday
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            }
        )

        # Skip a day (day before yesterday)
        # Session 3 days ago
        client_with_db.post(
            "/api/meditation/sessions",
            json={
                "planned_duration_minutes": 10,
                "actual_duration_seconds": 600,
                "completed": True,
                "session_date": (today - timedelta(days=3)).strftime("%Y-%m-%d"),
            }
        )

        response = client_with_db.get("/api/meditation/stats")
        # Streak should be 2 (today + yesterday), not 3
        assert response.json()["streak_days"] == 2

    def test_streak_multiple_sessions_same_day(self, client_with_db):
        """Multiple sessions on same day should count as 1 day"""
        today = datetime.now().strftime("%Y-%m-%d")

        # Create 3 sessions on the same day
        for _ in range(3):
            client_with_db.post(
                "/api/meditation/sessions",
                json={
                    "planned_duration_minutes": 10,
                    "actual_duration_seconds": 600,
                    "completed": True,
                    "session_date": today,
                }
            )

        response = client_with_db.get("/api/meditation/stats")
        # Should still be 1 day streak, not 3
        assert response.json()["streak_days"] == 1

    def test_streak_starting_from_yesterday(self, client_with_db):
        """Streak starting from yesterday should still count"""
        today = datetime.now()

        # Sessions: yesterday, day before, 3 days ago (3 day streak starting yesterday)
        for i in range(1, 4):  # 1, 2, 3 days ago
            session_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            client_with_db.post(
                "/api/meditation/sessions",
                json={
                    "planned_duration_minutes": 10,
                    "actual_duration_seconds": 600,
                    "completed": True,
                    "session_date": session_date,
                }
            )

        response = client_with_db.get("/api/meditation/stats")
        assert response.json()["streak_days"] == 3


# =============================================================================
# Validation Tests
# =============================================================================

class TestValidation:
    """Test input validation"""

    def test_preset_name_required(self, client_with_db):
        """Test that preset name is required"""
        response = client_with_db.post(
            "/api/meditation/presets",
            json={"duration_minutes": 10}
        )

        assert response.status_code == 422

    def test_preset_duration_bounds(self, client_with_db):
        """Test preset duration bounds"""
        # Too short
        response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Test", "duration_minutes": 0}
        )
        assert response.status_code == 422

        # Too long
        response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Test", "duration_minutes": 200}
        )
        assert response.status_code == 422

    def test_session_required_fields(self, client_with_db):
        """Test session required fields"""
        response = client_with_db.post(
            "/api/meditation/sessions",
            json={"notes": "Missing required fields"}
        )

        assert response.status_code == 422

    def test_binaural_frequency_bounds(self, client_with_db):
        """Test binaural frequency bounds"""
        # Too low
        response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Test", "binaural_frequency": 0.1}
        )
        assert response.status_code == 422

        # Too high
        response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Test", "binaural_frequency": 50}
        )
        assert response.status_code == 422

        # Valid
        response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Test", "binaural_frequency": 10.0}
        )
        assert response.status_code == 200


# =============================================================================
# Integration Tests
# =============================================================================

class TestMeditationWorkflow:
    """Test complete meditation workflows"""

    def test_complete_session_workflow(self, client_with_db):
        """Test complete meditation workflow: create preset -> use -> record session"""
        # 1. Create a preset
        preset_response = client_with_db.post(
            "/api/meditation/presets",
            json={
                "name": "Morning Calm",
                "duration_minutes": 15,
                "music_style": "ambient",
                "visualization_type": "mandala",
            }
        )
        assert preset_response.status_code == 200
        preset_id = preset_response.json()["id"]

        # 2. Mark preset as used
        use_response = client_with_db.post(f"/api/meditation/presets/{preset_id}/use")
        assert use_response.status_code == 200
        assert use_response.json()["times_used"] == 1

        # 3. Record the session
        session_response = client_with_db.post(
            "/api/meditation/sessions",
            json={
                "preset_id": preset_id,
                "preset_name": "Morning Calm",
                "planned_duration_minutes": 15,
                "actual_duration_seconds": 900,
                "completed": True,
                "mood_before": "anxious",
                "mood_after": "peaceful",
                "session_date": datetime.now().strftime("%Y-%m-%d"),
            }
        )
        assert session_response.status_code == 200

        # 4. Check stats updated
        stats_response = client_with_db.get("/api/meditation/stats")
        stats = stats_response.json()

        assert stats["total_sessions"] == 1
        assert stats["total_minutes"] == 15
        assert stats["completed_sessions"] == 1

    def test_preset_management_workflow(self, client_with_db):
        """Test preset management: create -> update -> favorite -> delete"""
        # 1. Create preset
        create_response = client_with_db.post(
            "/api/meditation/presets",
            json={"name": "Test Preset", "duration_minutes": 10}
        )
        preset_id = create_response.json()["id"]

        # 2. Update preset
        update_response = client_with_db.put(
            f"/api/meditation/presets/{preset_id}",
            json={"duration_minutes": 20, "description": "Updated description"}
        )
        assert update_response.json()["duration_minutes"] == 20

        # 3. Add to favorites
        fav_response = client_with_db.put(
            f"/api/meditation/presets/{preset_id}",
            json={"is_favorite": True}
        )
        assert fav_response.json()["is_favorite"] is True

        # 4. Verify in favorites list
        list_response = client_with_db.get("/api/meditation/presets?favorites_only=true")
        assert len(list_response.json()) == 1

        # 5. Delete preset
        delete_response = client_with_db.delete(f"/api/meditation/presets/{preset_id}")
        assert delete_response.status_code == 200

        # 6. Verify deleted
        list_response = client_with_db.get("/api/meditation/presets")
        assert len(list_response.json()) == 0
