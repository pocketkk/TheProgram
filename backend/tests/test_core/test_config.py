"""
Tests for configuration module
Validates settings and environment variable handling
"""
import pytest
import os
from app.core.config import Settings


class TestSettings:
    """Test Settings configuration"""

    @pytest.mark.unit
    def test_settings_instance_created(self):
        """Test that settings instance can be created"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings is not None
        assert settings.APP_NAME == "The Program"

    @pytest.mark.unit
    @pytest.mark.skip(reason="TODO: Needs env var isolation - affected by real environment")
    def test_default_values(self):
        """Test default configuration values"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.APP_ENV == "development"
        assert settings.DEBUG is True
        assert settings.HOST == "0.0.0.0"
        assert settings.PORT == 8000
        assert settings.API_V1_STR == "/api"

    @pytest.mark.unit
    def test_database_configuration(self):
        """Test database configuration"""
        db_url = "postgresql://user:pass@localhost:5432/theprogram"
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL=db_url
        )

        assert settings.DATABASE_URL == db_url
        assert settings.DB_POOL_SIZE == 20
        assert settings.DB_MAX_OVERFLOW == 10

    @pytest.mark.unit
    def test_security_configuration(self):
        """Test security settings"""
        secret_key = "test-super-secret-key-12345"
        settings = Settings(
            SECRET_KEY=secret_key,
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.SECRET_KEY == secret_key
        assert settings.JWT_ALGORITHM == "HS256"
        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 30
        assert settings.REFRESH_TOKEN_EXPIRE_DAYS == 7

    @pytest.mark.unit
    def test_password_requirements(self):
        """Test password requirement settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.PASSWORD_MIN_LENGTH == 8
        assert settings.PASSWORD_REQUIRE_UPPERCASE is True
        assert settings.PASSWORD_REQUIRE_LOWERCASE is True
        assert settings.PASSWORD_REQUIRE_DIGIT is True

    @pytest.mark.unit
    @pytest.mark.skip(reason="TODO: Needs env var isolation - affected by real environment")
    def test_cors_origins_parsing_from_string(self):
        """Test CORS origins parsing from comma-separated string"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            CORS_ORIGINS="http://localhost:3000,http://localhost:5173,https://example.com"
        )

        assert len(settings.CORS_ORIGINS) == 3
        assert "http://localhost:3000" in settings.CORS_ORIGINS
        assert "http://localhost:5173" in settings.CORS_ORIGINS
        assert "https://example.com" in settings.CORS_ORIGINS

    @pytest.mark.unit
    @pytest.mark.skip(reason="TODO: Needs env var isolation - affected by real environment")
    def test_cors_origins_from_list(self):
        """Test CORS origins as list"""
        origins = ["http://localhost:3000", "http://localhost:5173"]
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            CORS_ORIGINS=origins
        )

        assert settings.CORS_ORIGINS == origins

    @pytest.mark.unit
    def test_ephemeris_configuration(self):
        """Test Swiss Ephemeris configuration"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            EPHEMERIS_PATH="/custom/path/to/ephemeris"
        )

        assert settings.EPHEMERIS_PATH == "/custom/path/to/ephemeris"

    @pytest.mark.unit
    def test_chart_calculation_defaults(self):
        """Test default chart calculation settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.DEFAULT_HOUSE_SYSTEM == "placidus"
        assert settings.DEFAULT_ZODIAC == "tropical"
        assert settings.DEFAULT_AYANAMSA == "lahiri"
        assert settings.DEFAULT_NODE_TYPE == "true"

    @pytest.mark.unit
    def test_aspect_orbs_configuration(self):
        """Test aspect orb settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.ASPECT_ORB_CONJUNCTION == 10.0
        assert settings.ASPECT_ORB_OPPOSITION == 10.0
        assert settings.ASPECT_ORB_TRINE == 8.0
        assert settings.ASPECT_ORB_SQUARE == 7.0
        assert settings.ASPECT_ORB_SEXTILE == 6.0
        assert settings.ASPECT_ORB_QUINCUNX == 3.0

    @pytest.mark.unit
    def test_redis_configuration(self):
        """Test Redis configuration"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            REDIS_ENABLED=True,
            REDIS_URL="redis://localhost:6379/1"
        )

        assert settings.REDIS_ENABLED is True
        assert settings.REDIS_URL == "redis://localhost:6379/1"
        assert settings.REDIS_TTL == 3600

    @pytest.mark.unit
    def test_rate_limiting_configuration(self):
        """Test rate limiting settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        # Rate limiting disabled for single-user desktop app (set in .env)
        assert settings.RATE_LIMIT_ENABLED is False
        assert settings.RATE_LIMIT_CHARTS_PER_HOUR == 100
        assert settings.RATE_LIMIT_API_PER_MINUTE == 60

    @pytest.mark.unit
    def test_geonames_configuration(self):
        """Test GeoNames API configuration"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            GEONAMES_USERNAME="test_user"
        )

        assert settings.GEONAMES_USERNAME == "test_user"
        assert settings.GEONAMES_API_URL == "http://api.geonames.org"

    @pytest.mark.unit
    def test_human_design_configuration(self):
        """Test Human Design settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.HD_DESIGN_CALCULATION_DAYS == 88

    @pytest.mark.unit
    def test_pagination_configuration(self):
        """Test pagination settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.DEFAULT_PAGE_SIZE == 20
        assert settings.MAX_PAGE_SIZE == 100

    @pytest.mark.unit
    def test_logging_configuration(self):
        """Test logging settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            LOG_LEVEL="DEBUG",
            LOG_FORMAT="json"
        )

        assert settings.LOG_LEVEL == "DEBUG"
        assert settings.LOG_FORMAT == "json"

    @pytest.mark.unit
    def test_api_documentation_configuration(self):
        """Test API documentation settings"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test"
        )

        assert settings.DOCS_URL == "/docs"
        assert settings.REDOC_URL == "/redoc"
        assert settings.OPENAPI_URL == "/openapi.json"

    @pytest.mark.unit
    def test_custom_orbs(self):
        """Test custom aspect orb configuration"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            ASPECT_ORB_CONJUNCTION=12.0,
            ASPECT_ORB_TRINE=10.0
        )

        assert settings.ASPECT_ORB_CONJUNCTION == 12.0
        assert settings.ASPECT_ORB_TRINE == 10.0

    @pytest.mark.unit
    def test_environment_specific_settings(self):
        """Test environment-specific configurations"""
        # Development
        dev_settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            APP_ENV="development",
            DEBUG=True
        )

        assert dev_settings.APP_ENV == "development"
        assert dev_settings.DEBUG is True

        # Production
        prod_settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            APP_ENV="production",
            DEBUG=False
        )

        assert prod_settings.APP_ENV == "production"
        assert prod_settings.DEBUG is False


class TestSettingsValidation:
    """Test settings validation"""

    @pytest.mark.unit
    @pytest.mark.skip(reason="TODO: Needs env var isolation - real env has these values")
    def test_missing_required_secret_key(self):
        """Test that missing SECRET_KEY raises error"""
        with pytest.raises(Exception):  # Pydantic ValidationError
            Settings(DATABASE_URL="postgresql://test:test@localhost/test")

    @pytest.mark.unit
    @pytest.mark.skip(reason="TODO: Needs env var isolation - real env has these values")
    def test_missing_required_database_url(self):
        """Test that missing DATABASE_URL raises error"""
        with pytest.raises(Exception):  # Pydantic ValidationError
            Settings(SECRET_KEY="test-secret-key")

    @pytest.mark.unit
    def test_invalid_log_level(self):
        """Test setting invalid log level"""
        # This should still work, just might not be a valid Python log level
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            LOG_LEVEL="INVALID"
        )

        # Pydantic accepts it, but app should validate
        assert settings.LOG_LEVEL == "INVALID"

    @pytest.mark.unit
    def test_negative_port(self):
        """Test that negative port is accepted (validation happens elsewhere)"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            PORT=-1
        )

        # Pydantic accepts it as an int
        assert settings.PORT == -1

    @pytest.mark.unit
    def test_zero_token_expire_time(self):
        """Test zero token expiration time"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            ACCESS_TOKEN_EXPIRE_MINUTES=0
        )

        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 0


class TestConfigurationInheritance:
    """Test configuration inheritance and overrides"""

    @pytest.mark.unit
    def test_override_defaults(self):
        """Test that custom values override defaults"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            APP_NAME="Custom App Name",
            PORT=9000,
            DEFAULT_HOUSE_SYSTEM="koch"
        )

        assert settings.APP_NAME == "Custom App Name"
        assert settings.PORT == 9000
        assert settings.DEFAULT_HOUSE_SYSTEM == "koch"

    @pytest.mark.unit
    def test_partial_override(self):
        """Test partial configuration override"""
        settings = Settings(
            SECRET_KEY="test-secret-key",
            DATABASE_URL="postgresql://test:test@localhost/test",
            ASPECT_ORB_CONJUNCTION=15.0,  # Override one orb
            # Others should use defaults
        )

        assert settings.ASPECT_ORB_CONJUNCTION == 15.0
        assert settings.ASPECT_ORB_TRINE == 8.0  # Default
        assert settings.ASPECT_ORB_SQUARE == 7.0  # Default
