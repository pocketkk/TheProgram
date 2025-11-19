"""
Tests for authentication endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import User, UserPreferences
from app.core.security import verify_password


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_user_data():
    """Sample user data for testing"""
    return {
        "email": "test@example.com",
        "password": "Test123!Pass",
        "full_name": "Test User",
        "business_name": "Test Business"
    }


@pytest.fixture
def registered_user(client, test_user_data):
    """Create and return a registered user"""
    response = client.post("/api/auth/register", json=test_user_data)
    return response.json()


# =============================================================================
# Registration Tests
# =============================================================================

class TestRegistration:
    """Test user registration endpoint"""

    @pytest.mark.api
    def test_register_new_user(self, client, test_user_data):
        """Test registering a new user"""
        response = client.post("/api/auth/register", json=test_user_data)

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == test_user_data["full_name"]
        assert data["business_name"] == test_user_data["business_name"]
        assert data["is_active"] is True
        assert data["is_verified"] is False
        assert data["subscription_tier"] == "free"
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "password" not in data
        assert "password_hash" not in data

    @pytest.mark.api
    def test_register_duplicate_email(self, client, test_user_data, registered_user):
        """Test registering with duplicate email fails"""
        response = client.post("/api/auth/register", json=test_user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    @pytest.mark.api
    def test_register_invalid_email(self, client, test_user_data):
        """Test registration with invalid email fails"""
        test_user_data["email"] = "not-an-email"
        response = client.post("/api/auth/register", json=test_user_data)

        assert response.status_code == 422

    @pytest.mark.api
    def test_register_weak_password(self, client, test_user_data):
        """Test registration with weak password fails"""
        # No uppercase
        test_user_data["password"] = "test123!"
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 422

        # No lowercase
        test_user_data["password"] = "TEST123!"
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 422

        # No digit
        test_user_data["password"] = "TestPass!"
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 422

        # Too short
        test_user_data["password"] = "Test1!"
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 422

    @pytest.mark.api
    def test_register_creates_preferences(self, client, test_user_data, db_session):
        """Test that registration creates default user preferences"""
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 201

        user_id = response.json()["id"]

        # Check preferences were created
        from uuid import UUID
        preferences = db_session.query(UserPreferences).filter(
            UserPreferences.user_id == UUID(user_id)
        ).first()

        assert preferences is not None
        assert preferences.default_house_system == "placidus"
        assert preferences.default_zodiac == "tropical"

    @pytest.mark.api
    def test_register_minimal_data(self, client):
        """Test registration with minimal required data"""
        minimal_data = {
            "email": "minimal@example.com",
            "password": "MinimalPass123"
        }
        response = client.post("/api/auth/register", json=minimal_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == minimal_data["email"]
        assert data["full_name"] is None
        assert data["business_name"] is None


# =============================================================================
# Login Tests
# =============================================================================

class TestLogin:
    """Test user login endpoints"""

    @pytest.mark.api
    def test_login_oauth2_form(self, client, test_user_data, registered_user):
        """Test login with OAuth2 form data"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["expires_in"] == 1800  # 30 minutes

    @pytest.mark.api
    def test_login_json(self, client, test_user_data, registered_user):
        """Test login with JSON body"""
        response = client.post(
            "/api/auth/login/json",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    @pytest.mark.api
    def test_login_wrong_password(self, client, test_user_data, registered_user):
        """Test login with wrong password fails"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user_data["email"],
                "password": "WrongPassword123"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.api
    def test_login_wrong_email(self, client):
        """Test login with non-existent email fails"""
        response = client.post(
            "/api/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "SomePassword123"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.api
    def test_login_inactive_user(self, client, test_user_data, db_session):
        """Test login with inactive user account fails"""
        # Register user
        response = client.post("/api/auth/register", json=test_user_data)
        user_id = response.json()["id"]

        # Deactivate user
        from uuid import UUID
        user = db_session.query(User).filter(User.id == UUID(user_id)).first()
        user.is_active = False
        db_session.commit()

        # Try to login
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )

        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()

    @pytest.mark.api
    def test_login_updates_last_login(self, client, test_user_data, registered_user, db_session):
        """Test that login updates last_login timestamp"""
        from uuid import UUID
        from datetime import datetime

        user_id = registered_user["id"]
        initial_last_login = registered_user["last_login"]

        # Wait a moment
        import time
        time.sleep(1)

        # Login again
        response = client.post(
            "/api/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )

        assert response.status_code == 200

        # Check last_login was updated
        user = db_session.query(User).filter(User.id == UUID(user_id)).first()
        assert user.last_login is not None
        if initial_last_login:
            assert user.last_login > datetime.fromisoformat(initial_last_login.replace('Z', '+00:00'))


# =============================================================================
# Token Refresh Tests
# =============================================================================

class TestTokenRefresh:
    """Test token refresh endpoint"""

    @pytest.mark.api
    def test_refresh_token(self, client, registered_user):
        """Test refreshing access token"""
        token = registered_user["access_token"]

        response = client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["access_token"] != token  # New token should be different

    @pytest.mark.api
    def test_refresh_without_token(self, client):
        """Test refresh without token fails"""
        response = client.post("/api/auth/refresh")

        assert response.status_code == 401

    @pytest.mark.api
    def test_refresh_with_invalid_token(self, client):
        """Test refresh with invalid token fails"""
        response = client.post(
            "/api/auth/refresh",
            headers={"Authorization": "Bearer invalid_token_here"}
        )

        assert response.status_code == 401


# =============================================================================
# Token Validation Tests
# =============================================================================

class TestTokenValidation:
    """Test JWT token validation"""

    @pytest.mark.api
    def test_token_contains_user_id(self, client, registered_user):
        """Test that token contains user ID in payload"""
        from app.core.security import decode_access_token

        token = registered_user["access_token"]
        payload = decode_access_token(token)

        assert payload is not None
        assert "sub" in payload
        assert payload["sub"] == registered_user["id"]

    @pytest.mark.api
    def test_token_contains_expiration(self, client, registered_user):
        """Test that token contains expiration time"""
        from app.core.security import decode_access_token

        token = registered_user["access_token"]
        payload = decode_access_token(token)

        assert "exp" in payload
        assert "iat" in payload
        assert payload["exp"] > payload["iat"]

    @pytest.mark.api
    def test_expired_token_rejected(self, client, registered_user):
        """Test that expired token is rejected"""
        from app.core.security import create_access_token
        from datetime import timedelta

        # Create token that expires immediately
        expired_token = create_access_token(
            data={"sub": registered_user["id"]},
            expires_delta=timedelta(seconds=-1)
        )

        # Try to use expired token
        response = client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )

        assert response.status_code == 401


# =============================================================================
# Password Security Tests
# =============================================================================

class TestPasswordSecurity:
    """Test password hashing and verification"""

    @pytest.mark.api
    def test_password_is_hashed(self, client, test_user_data, db_session):
        """Test that password is stored as hash, not plain text"""
        from uuid import UUID

        response = client.post("/api/auth/register", json=test_user_data)
        user_id = response.json()["id"]

        user = db_session.query(User).filter(User.id == UUID(user_id)).first()

        # Password hash should not equal plain password
        assert user.password_hash != test_user_data["password"]

        # Password hash should be verifiable
        assert verify_password(test_user_data["password"], user.password_hash)

    @pytest.mark.api
    def test_password_not_in_response(self, client, test_user_data):
        """Test that password is never returned in responses"""
        response = client.post("/api/auth/register", json=test_user_data)
        data = response.json()

        assert "password" not in data
        assert "password_hash" not in data

        # Also check login response
        response = client.post(
            "/api/auth/login/json",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        data = response.json()

        assert "password" not in data
        assert "password_hash" not in data
