"""
Application configuration settings
Loads environment variables and provides application settings
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application Settings
    APP_NAME: str = "The Program"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database Configuration
    DATABASE_URL: str | None = None  # Optional for SQLite-only setups
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # Redis Configuration
    REDIS_ENABLED: bool = True
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: str | None = None
    REDIS_TTL: int = 3600

    # Security
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Password Requirements
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = False

    # CORS Settings
    _CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    CORS_ALLOW_CREDENTIALS: bool = True

    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS_ORIGINS from comma-separated string"""
        if isinstance(self._CORS_ORIGINS, str):
            return [origin.strip() for origin in self._CORS_ORIGINS.split(",") if origin.strip()]
        return ["http://localhost:3000", "http://localhost:5173"]

    # Swiss Ephemeris Configuration
    EPHEMERIS_PATH: str = "./ephemeris"

    # GeoNames API
    GEONAMES_USERNAME: str | None = None
    GEONAMES_API_URL: str = "http://api.geonames.org"

    # Timezone Database
    TIMEZONE_DATA_PATH: str = "./data/timezones"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_CHARTS_PER_HOUR: int = 100
    RATE_LIMIT_API_PER_MINUTE: int = 60

    # File Storage
    DATA_DIR: str = "./data"
    STORAGE_TYPE: str = "local"
    LOCAL_STORAGE_PATH: str = "./storage/reports"

    # Email Configuration (optional)
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: str | None = None
    EMAILS_FROM_NAME: str | None = None

    # Sentry (Error Tracking)
    SENTRY_DSN: str | None = None
    SENTRY_ENVIRONMENT: str = "development"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: str = "./logs/app.log"

    # API Documentation
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
    OPENAPI_URL: str = "/openapi.json"

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Chart Calculation Defaults
    DEFAULT_HOUSE_SYSTEM: str = "placidus"
    DEFAULT_ZODIAC: str = "tropical"
    DEFAULT_AYANAMSA: str = "lahiri"
    DEFAULT_NODE_TYPE: str = "true"

    # Aspect Orbs (in degrees)
    ASPECT_ORB_CONJUNCTION: float = 10.0
    ASPECT_ORB_OPPOSITION: float = 10.0
    ASPECT_ORB_TRINE: float = 8.0
    ASPECT_ORB_SQUARE: float = 7.0
    ASPECT_ORB_SEXTILE: float = 6.0
    ASPECT_ORB_QUINCUNX: float = 3.0
    ASPECT_ORB_SEMISEXTILE: float = 3.0
    ASPECT_ORB_SEMISQUARE: float = 3.0
    ASPECT_ORB_SESQUISQUARE: float = 3.0
    ASPECT_ORB_QUINTILE: float = 2.0
    ASPECT_ORB_BIQUINTILE: float = 2.0

    # Human Design
    HD_DESIGN_CALCULATION_DAYS: int = 88

    # Interpretations
    INTERPRETATIONS_ENABLED: bool = True
    INTERPRETATIONS_DB_PATH: str = "./data/interpretations"

    # Performance
    ENABLE_GZIP: bool = True
    ENABLE_CACHE: bool = True
    CACHE_BACKEND: str = "redis"

    # Development
    ENABLE_PROFILING: bool = False
    ENABLE_SQL_ECHO: bool = False

    # Testing
    TEST_DATABASE_URL: str | None = None

    class Config:
        """Pydantic config"""
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields from .env file


# Create settings instance
settings = Settings()
