"""
Tests for simple authentication system

Tests password setup, login, token verification, password changes,
and authentication dependencies.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database_sqlite import get_db, Base
from app.core.auth_simple import (
    hash_password,
    verify_password,
    create_session_token,
    verify_session_token,
    extract_token_from_header,
)
from app.models_sqlite.app_config import AppConfig


# =============================================================================
# Test Database Setup
# =============================================================================

@pytest.fixture(scope="function")
def test_db():
    """
    Create a fresh test database for each test
    Uses in-memory SQLite database
    """
    # Create in-memory database
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Initialize app_config singleton
    config = AppConfig(id=1)
    session.add(config)
    session.commit()

    yield session

    # Cleanup
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


# =============================================================================
# Helper Function Tests
# =============================================================================

class TestPasswordHashing:
    """Test password hashing functions"""

    def test_hash_password(self):
        """Test password hashing"""
        password = "test_password123"
        hashed = hash_password(password)

        # Hash should be different from password
        assert hashed != password

        # Hash should start with bcrypt identifier
        assert hashed.startswith("$2b$")

        # Hash should be long enough
        assert len(hashed) > 50

    def test_hash_same_password_different_hashes(self):
        """Test that same password produces different hashes (due to salt)"""
        password = "test_password123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        # Hashes should be different (different salts)
        assert hash1 != hash2

    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "test_password123"
        hashed = hash_password(password)

        # Verification should succeed
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "test_password123"
        hashed = hash_password(password)

        # Verification should fail
        assert verify_password("wrong_password", hashed) is False

    def test_verify_password_case_sensitive(self):
        """Test that password verification is case-sensitive"""
        password = "TestPassword123"
        hashed = hash_password(password)

        # Different case should fail
        assert verify_password("testpassword123", hashed) is False


class TestSessionTokens:
    """Test session token creation and verification"""

    def test_create_session_token(self):
        """Test session token creation"""
        token = create_session_token()

        # Token should be a string
        assert isinstance(token, str)

        # Token should be long enough (JWT tokens are long)
        assert len(token) > 50

    def test_verify_session_token_valid(self):
        """Test verification of valid token"""
        token = create_session_token()
        is_valid, error = verify_session_token(token)

        # Should be valid
        assert is_valid is True
        assert error is None

    def test_verify_session_token_invalid(self):
        """Test verification of invalid token"""
        invalid_token = "invalid.token.here"
        is_valid, error = verify_session_token(invalid_token)

        # Should be invalid
        assert is_valid is False
        assert error is not None
        assert "Invalid token" in error

    def test_verify_session_token_malformed(self):
        """Test verification of malformed token"""
        is_valid, error = verify_session_token("not_a_jwt_token")

        # Should be invalid
        assert is_valid is False
        assert error is not None

    def test_extract_token_from_header_valid(self):
        """Test extracting token from valid Authorization header"""
        token = "abc123xyz"
        header = f"Bearer {token}"

        extracted = extract_token_from_header(header)
        assert extracted == token

    def test_extract_token_from_header_case_insensitive(self):
        """Test that Bearer keyword is case insensitive"""
        token = "abc123xyz"

        # Test lowercase
        assert extract_token_from_header(f"bearer {token}") == token

        # Test mixed case
        assert extract_token_from_header(f"BeArEr {token}") == token

    def test_extract_token_from_header_invalid(self):
        """Test extracting token from invalid header"""
        # No Bearer keyword
        assert extract_token_from_header("abc123xyz") is None

        # Wrong keyword
        assert extract_token_from_header("Basic abc123xyz") is None

        # Empty header
        assert extract_token_from_header("") is None

        # None header
        assert extract_token_from_header(None) is None


# =============================================================================
# API Endpoint Tests
# =============================================================================

class TestAuthStatus:
    """Test GET /auth/status endpoint"""

    def test_auth_status_no_password(self, client_with_db):
        """Test auth status when no password is set"""
        response = client_with_db.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()

        assert data["password_set"] is False
        assert data["require_password"] is False
        assert "No password set" in data["message"]

    def test_auth_status_with_password(self, client_with_db, test_db):
        """Test auth status when password is set"""
        # Set a password
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password("test_password")
        test_db.commit()

        response = client_with_db.get("/api/auth/status")

        assert response.status_code == 200
        data = response.json()

        assert data["password_set"] is True
        assert data["require_password"] is True
        assert "configured" in data["message"].lower()


class TestPasswordSetup:
    """Test POST /auth/setup endpoint"""

    def test_setup_password_success(self, client_with_db, test_db):
        """Test successful password setup"""
        response = client_with_db.post(
            "/api/auth/setup",
            json={"password": "my_secure_password"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "successfully" in data["message"].lower()

        # Verify password is stored in database
        config = test_db.query(AppConfig).filter_by(id=1).first()
        assert config.password_hash is not None
        assert verify_password("my_secure_password", config.password_hash)

    def test_setup_password_too_short(self, client_with_db):
        """Test password setup with too short password"""
        response = client_with_db.post(
            "/api/auth/setup",
            json={"password": "123"}  # Less than 4 characters
        )

        # Should fail validation
        assert response.status_code == 422

    def test_setup_password_empty(self, client_with_db):
        """Test password setup with empty password"""
        response = client_with_db.post(
            "/api/auth/setup",
            json={"password": "   "}  # Just whitespace
        )

        # Should fail validation
        assert response.status_code == 422

    def test_setup_password_already_set(self, client_with_db, test_db):
        """Test password setup when password already exists"""
        # Set initial password
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password("existing_password")
        test_db.commit()

        # Try to set again
        response = client_with_db.post(
            "/api/auth/setup",
            json={"password": "new_password"}
        )

        assert response.status_code == 400
        assert "already set" in response.json()["detail"].lower()


class TestLogin:
    """Test POST /auth/login endpoint"""

    def test_login_success(self, client_with_db, test_db):
        """Test successful login"""
        # Setup password
        password = "my_password123"
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(password)
        test_db.commit()

        # Login
        response = client_with_db.post(
            "/api/auth/login",
            json={"password": password}
        )

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["expires_in"] > 0

        # Verify token is valid
        token = data["access_token"]
        is_valid, _ = verify_session_token(token)
        assert is_valid is True

    def test_login_wrong_password(self, client_with_db, test_db):
        """Test login with incorrect password"""
        # Setup password
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password("correct_password")
        test_db.commit()

        # Login with wrong password
        response = client_with_db.post(
            "/api/auth/login",
            json={"password": "wrong_password"}
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_no_password_set(self, client_with_db):
        """Test login when no password is configured"""
        response = client_with_db.post(
            "/api/auth/login",
            json={"password": "any_password"}
        )

        assert response.status_code == 401
        assert "no password configured" in response.json()["detail"].lower()


class TestTokenVerification:
    """Test POST /auth/verify endpoint"""

    def test_verify_valid_token(self, client_with_db):
        """Test verification of valid token"""
        token = create_session_token()

        response = client_with_db.post(
            "/api/auth/verify",
            json={"token": token}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["valid"] is True
        assert "valid" in data["message"].lower()

    def test_verify_invalid_token(self, client_with_db):
        """Test verification of invalid token"""
        response = client_with_db.post(
            "/api/auth/verify",
            json={"token": "invalid.token.here"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["valid"] is False
        assert data["message"] is not None


class TestChangePassword:
    """Test POST /auth/change-password endpoint"""

    def test_change_password_success(self, client_with_db, test_db):
        """Test successful password change"""
        # Setup initial password
        old_password = "old_password123"
        new_password = "new_password456"

        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(old_password)
        test_db.commit()

        # Change password
        response = client_with_db.post(
            "/api/auth/change-password",
            json={
                "old_password": old_password,
                "new_password": new_password
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify new password works
        test_db.refresh(config)
        assert verify_password(new_password, config.password_hash)
        assert not verify_password(old_password, config.password_hash)

    def test_change_password_wrong_old_password(self, client_with_db, test_db):
        """Test password change with incorrect old password"""
        # Setup password
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password("correct_password")
        test_db.commit()

        # Try to change with wrong old password
        response = client_with_db.post(
            "/api/auth/change-password",
            json={
                "old_password": "wrong_password",
                "new_password": "new_password"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_change_password_same_as_old(self, client_with_db, test_db):
        """Test password change with new password same as old"""
        password = "same_password"

        # Setup password
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(password)
        test_db.commit()

        # Try to change to same password
        response = client_with_db.post(
            "/api/auth/change-password",
            json={
                "old_password": password,
                "new_password": password
            }
        )

        # Should fail validation
        assert response.status_code == 422


class TestDisablePassword:
    """Test POST /auth/disable-password endpoint"""

    def test_disable_password_success(self, client_with_db, test_db):
        """Test successfully disabling password"""
        # Setup password
        password = "my_password"
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(password)
        test_db.commit()

        # Disable password
        response = client_with_db.post(
            "/api/auth/disable-password",
            json={
                "current_password": password,
                "confirm": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify password is removed
        test_db.refresh(config)
        assert config.password_hash is None

    def test_disable_password_wrong_password(self, client_with_db, test_db):
        """Test disabling password with wrong current password"""
        # Setup password
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password("correct_password")
        test_db.commit()

        # Try to disable with wrong password
        response = client_with_db.post(
            "/api/auth/disable-password",
            json={
                "current_password": "wrong_password",
                "confirm": True
            }
        )

        assert response.status_code == 401

    def test_disable_password_no_confirmation(self, client_with_db, test_db):
        """Test disabling password without confirmation"""
        # Setup password
        password = "my_password"
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(password)
        test_db.commit()

        # Try to disable without confirmation
        response = client_with_db.post(
            "/api/auth/disable-password",
            json={
                "current_password": password,
                "confirm": False
            }
        )

        assert response.status_code == 400


class TestLogout:
    """Test POST /auth/logout endpoint"""

    def test_logout(self, client_with_db):
        """Test logout endpoint"""
        response = client_with_db.post("/api/auth/logout")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "logged out" in data["message"].lower()


# =============================================================================
# Authentication Dependency Tests
# =============================================================================

class TestAuthDependencies:
    """Test authentication dependencies"""

    def test_protected_route_with_valid_token(self, client_with_db, test_db):
        """Test accessing protected route with valid token"""
        # Setup password and get token
        password = "test_password"
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(password)
        test_db.commit()

        # Login to get token
        login_response = client_with_db.post(
            "/api/auth/login",
            json={"password": password}
        )
        token = login_response.json()["access_token"]

        # Note: We can't test protected routes without setting them up first
        # This is a placeholder for when protected routes are added

    def test_protected_route_without_token(self, client_with_db, test_db):
        """Test accessing protected route without token"""
        # Setup password
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password("test_password")
        test_db.commit()

        # Note: Placeholder for protected route tests


# =============================================================================
# Integration Tests
# =============================================================================

class TestAuthWorkflow:
    """Test complete authentication workflows"""

    def test_first_run_setup_and_login(self, client_with_db):
        """Test complete first-run workflow: check status -> setup -> login"""
        # 1. Check initial status
        status_response = client_with_db.get("/api/auth/status")
        assert status_response.json()["password_set"] is False

        # 2. Setup password
        password = "my_secure_password"
        setup_response = client_with_db.post(
            "/api/auth/setup",
            json={"password": password}
        )
        assert setup_response.status_code == 200

        # 3. Check status after setup
        status_response = client_with_db.get("/api/auth/status")
        assert status_response.json()["password_set"] is True

        # 4. Login
        login_response = client_with_db.post(
            "/api/auth/login",
            json={"password": password}
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()

    def test_change_password_workflow(self, client_with_db, test_db):
        """Test complete password change workflow"""
        # 1. Setup initial password
        old_password = "old_password"
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(old_password)
        test_db.commit()

        # 2. Login with old password
        login_response = client_with_db.post(
            "/api/auth/login",
            json={"password": old_password}
        )
        assert login_response.status_code == 200

        # 3. Change password
        new_password = "new_password"
        change_response = client_with_db.post(
            "/api/auth/change-password",
            json={
                "old_password": old_password,
                "new_password": new_password
            }
        )
        assert change_response.status_code == 200

        # 4. Verify old password no longer works
        login_response = client_with_db.post(
            "/api/auth/login",
            json={"password": old_password}
        )
        assert login_response.status_code == 401

        # 5. Verify new password works
        login_response = client_with_db.post(
            "/api/auth/login",
            json={"password": new_password}
        )
        assert login_response.status_code == 200

    def test_disable_password_workflow(self, client_with_db, test_db):
        """Test disabling password workflow"""
        # 1. Setup password
        password = "my_password"
        config = test_db.query(AppConfig).filter_by(id=1).first()
        config.password_hash = hash_password(password)
        test_db.commit()

        # 2. Check status - password required
        status_response = client_with_db.get("/api/auth/status")
        assert status_response.json()["require_password"] is True

        # 3. Disable password
        disable_response = client_with_db.post(
            "/api/auth/disable-password",
            json={
                "current_password": password,
                "confirm": True
            }
        )
        assert disable_response.status_code == 200

        # 4. Check status - password not required
        status_response = client_with_db.get("/api/auth/status")
        assert status_response.json()["password_set"] is False
        assert status_response.json()["require_password"] is False
