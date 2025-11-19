"""
Tests for user management endpoints
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create test user and return auth data"""
    client = TestClient(app)
    user_data = {
        "email": "testuser@example.com",
        "password": "TestPass123",
        "full_name": "Test User",
        "business_name": "Test Business"
    }
    response = client.post("/api/auth/register", json=user_data)
    user = response.json()
    user["password"] = user_data["password"]  # Save for later use
    return user


@pytest.fixture
def auth_headers(test_user):
    """Get authentication headers with token"""
    return {"Authorization": f"Bearer {test_user['access_token']}"}


# =============================================================================
# Get Current User Tests
# =============================================================================

class TestGetCurrentUser:
    """Test GET /api/users/me endpoint"""

    @pytest.mark.api
    def test_get_current_user(self, client, test_user, auth_headers):
        """Test getting current user information"""
        response = client.get("/api/users/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == test_user["id"]
        assert data["email"] == test_user["email"]
        assert data["full_name"] == test_user["full_name"]
        assert data["business_name"] == test_user["business_name"]
        assert "password" not in data
        assert "password_hash" not in data

    @pytest.mark.api
    def test_get_current_user_without_auth(self, client):
        """Test getting current user without authentication fails"""
        response = client.get("/api/users/me")

        assert response.status_code == 401

    @pytest.mark.api
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token fails"""
        response = client.get(
            "/api/users/me",
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401


# =============================================================================
# Update Current User Tests
# =============================================================================

class TestUpdateCurrentUser:
    """Test PUT /api/users/me endpoint"""

    @pytest.mark.api
    def test_update_full_name(self, client, test_user, auth_headers):
        """Test updating user's full name"""
        update_data = {"full_name": "Updated Name"}
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["email"] == test_user["email"]  # Email unchanged

    @pytest.mark.api
    def test_update_business_name(self, client, test_user, auth_headers):
        """Test updating business name"""
        update_data = {"business_name": "New Business"}
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["business_name"] == "New Business"

    @pytest.mark.api
    def test_update_email(self, client, test_user, auth_headers):
        """Test updating email"""
        update_data = {"email": "newemail@example.com"}
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newemail@example.com"

    @pytest.mark.api
    def test_update_email_duplicate(self, client, auth_headers):
        """Test updating to duplicate email fails"""
        # Create another user
        other_user_data = {
            "email": "other@example.com",
            "password": "OtherPass123"
        }
        client.post("/api/auth/register", json=other_user_data)

        # Try to update to existing email
        update_data = {"email": "other@example.com"}
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    @pytest.mark.api
    def test_update_password(self, client, test_user, auth_headers):
        """Test updating password"""
        new_password = "NewSecurePass123"
        update_data = {"password": new_password}
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)

        assert response.status_code == 200

        # Try logging in with new password
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": test_user["email"],
                "password": new_password
            }
        )

        assert login_response.status_code == 200

    @pytest.mark.api
    def test_update_multiple_fields(self, client, test_user, auth_headers):
        """Test updating multiple fields at once"""
        update_data = {
            "full_name": "Multi Update",
            "business_name": "Multi Business",
            "email": "multiupdate@example.com"
        }
        response = client.put("/api/users/me", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == update_data["full_name"]
        assert data["business_name"] == update_data["business_name"]
        assert data["email"] == update_data["email"]

    @pytest.mark.api
    def test_update_without_auth(self, client):
        """Test updating user without authentication fails"""
        update_data = {"full_name": "Should Fail"}
        response = client.put("/api/users/me", json=update_data)

        assert response.status_code == 401


# =============================================================================
# Delete Current User Tests
# =============================================================================

class TestDeleteCurrentUser:
    """Test DELETE /api/users/me endpoint"""

    @pytest.mark.api
    def test_delete_current_user(self, client, test_user, auth_headers, db_session):
        """Test deleting current user account"""
        from uuid import UUID
        from app.models import User

        user_id = test_user["id"]

        response = client.delete("/api/users/me", headers=auth_headers)

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"].lower()

        # Verify user was deleted
        deleted_user = db_session.query(User).filter(User.id == UUID(user_id)).first()
        assert deleted_user is None

    @pytest.mark.api
    def test_delete_cascades_to_related_data(self, client, test_user, auth_headers, db_session):
        """Test that deleting user cascades to related data"""
        from uuid import UUID
        from app.models import UserPreferences

        user_id = test_user["id"]

        # Verify preferences exist
        prefs = db_session.query(UserPreferences).filter(
            UserPreferences.user_id == UUID(user_id)
        ).first()
        assert prefs is not None

        # Delete user
        response = client.delete("/api/users/me", headers=auth_headers)
        assert response.status_code == 200

        # Verify preferences were deleted
        prefs = db_session.query(UserPreferences).filter(
            UserPreferences.user_id == UUID(user_id)
        ).first()
        assert prefs is None

    @pytest.mark.api
    def test_delete_without_auth(self, client):
        """Test deleting user without authentication fails"""
        response = client.delete("/api/users/me")

        assert response.status_code == 401

    @pytest.mark.api
    def test_cannot_use_token_after_delete(self, client, test_user, auth_headers):
        """Test that token cannot be used after user is deleted"""
        # Delete user
        response = client.delete("/api/users/me", headers=auth_headers)
        assert response.status_code == 200

        # Try to use same token
        response = client.get("/api/users/me", headers=auth_headers)
        assert response.status_code == 401


# =============================================================================
# User Preferences Tests
# =============================================================================

class TestUserPreferences:
    """Test user preferences endpoints"""

    @pytest.mark.api
    def test_get_preferences(self, client, test_user, auth_headers):
        """Test getting user preferences"""
        response = client.get("/api/users/me/preferences", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert data["user_id"] == test_user["id"]
        assert data["default_house_system"] == "placidus"
        assert data["default_zodiac"] == "tropical"
        assert data["default_ayanamsa"] == "lahiri"
        assert data["color_scheme"] == "light"

    @pytest.mark.api
    def test_update_preferences(self, client, test_user, auth_headers):
        """Test updating user preferences"""
        update_data = {
            "default_house_system": "koch",
            "default_zodiac": "sidereal",
            "color_scheme": "dark"
        }
        response = client.put(
            "/api/users/me/preferences",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["default_house_system"] == "koch"
        assert data["default_zodiac"] == "sidereal"
        assert data["color_scheme"] == "dark"
        assert data["default_ayanamsa"] == "lahiri"  # Unchanged

    @pytest.mark.api
    def test_update_aspect_orbs(self, client, test_user, auth_headers):
        """Test updating custom aspect orbs"""
        update_data = {
            "aspect_orbs": {
                "conjunction": 12,
                "trine": 10,
                "square": 8
            }
        }
        response = client.put(
            "/api/users/me/preferences",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["aspect_orbs"]["conjunction"] == 12
        assert data["aspect_orbs"]["trine"] == 10
        assert data["aspect_orbs"]["square"] == 8

    @pytest.mark.api
    def test_update_displayed_points(self, client, test_user, auth_headers):
        """Test updating displayed points list"""
        update_data = {
            "displayed_points": ["sun", "moon", "mercury", "venus", "mars"]
        }
        response = client.put(
            "/api/users/me/preferences",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["displayed_points"]) == 5
        assert "sun" in data["displayed_points"]
        assert "moon" in data["displayed_points"]

    @pytest.mark.api
    def test_preferences_without_auth(self, client):
        """Test getting preferences without authentication fails"""
        response = client.get("/api/users/me/preferences")

        assert response.status_code == 401


# =============================================================================
# Admin Endpoints Tests
# =============================================================================

class TestAdminEndpoints:
    """Test admin-only user management endpoints"""

    @pytest.fixture
    def admin_user(self, client, db_session):
        """Create admin user"""
        from uuid import UUID
        from app.models import User

        admin_data = {
            "email": "admin@example.com",
            "password": "AdminPass123"
        }
        response = client.post("/api/auth/register", json=admin_data)
        admin = response.json()

        # Make user superuser
        user = db_session.query(User).filter(User.id == UUID(admin["id"])).first()
        user.is_superuser = True
        db_session.commit()

        return admin

    @pytest.fixture
    def admin_headers(self, admin_user):
        """Get admin authentication headers"""
        return {"Authorization": f"Bearer {admin_user['access_token']}"}

    @pytest.mark.api
    def test_list_all_users_as_admin(self, client, admin_headers, test_user):
        """Test listing all users as admin"""
        response = client.get("/api/users/", headers=admin_headers)

        assert response.status_code == 200
        users = response.json()

        assert isinstance(users, list)
        assert len(users) >= 2  # At least admin and test_user

    @pytest.mark.api
    def test_list_users_as_regular_user(self, client, auth_headers):
        """Test that regular users cannot list all users"""
        response = client.get("/api/users/", headers=auth_headers)

        assert response.status_code == 403

    @pytest.mark.api
    def test_get_user_by_id_as_admin(self, client, admin_headers, test_user):
        """Test getting specific user as admin"""
        response = client.get(f"/api/users/{test_user['id']}", headers=admin_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user["id"]

    @pytest.mark.api
    def test_get_user_by_id_as_regular_user(self, client, auth_headers, test_user):
        """Test that regular users cannot get other users by ID"""
        # Create another user
        other_client = TestClient(app)
        other_data = {"email": "other@example.com", "password": "OtherPass123"}
        other_response = other_client.post("/api/auth/register", json=other_data)
        other_id = other_response.json()["id"]

        # Try to get other user
        response = client.get(f"/api/users/{other_id}", headers=auth_headers)

        assert response.status_code == 403

    @pytest.mark.api
    def test_delete_user_as_admin(self, client, admin_headers, db_session):
        """Test deleting user as admin"""
        from uuid import UUID
        from app.models import User

        # Create user to delete
        victim_data = {"email": "victim@example.com", "password": "VictimPass123"}
        victim_response = client.post("/api/auth/register", json=victim_data)
        victim_id = victim_response.json()["id"]

        # Delete as admin
        response = client.delete(f"/api/users/{victim_id}", headers=admin_headers)

        assert response.status_code == 200

        # Verify deletion
        deleted = db_session.query(User).filter(User.id == UUID(victim_id)).first()
        assert deleted is None

    @pytest.mark.api
    def test_pagination(self, client, admin_headers):
        """Test user list pagination"""
        # Create several users
        for i in range(5):
            user_data = {
                "email": f"user{i}@example.com",
                "password": "TestPass123"
            }
            client.post("/api/auth/register", json=user_data)

        # Test pagination
        response = client.get("/api/users/?skip=0&limit=2", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert len(users) <= 2

        response = client.get("/api/users/?skip=2&limit=2", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert len(users) <= 2
