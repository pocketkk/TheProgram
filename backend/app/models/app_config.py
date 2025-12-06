"""
AppConfig model for application-level configuration

Singleton table - contains exactly ONE row (id=1)
Stores password hash and application metadata
"""
from sqlalchemy import Column, String, Integer

from app.models.base import SingletonModel


class AppConfig(SingletonModel):
    """
    Application configuration singleton

    This table contains exactly one row with id=1.
    Stores application-level settings including password.

    Fields:
        id: Always 1 (singleton)
        password_hash: Hashed password (NULL = no password set)
        app_version: Current application version
        database_version: Database schema version
        created_at: When config was created
        updated_at: Last update time (auto-updated by trigger)

    Example:
        # Get app config (there's always exactly one)
        config = db.query(AppConfig).filter_by(id='1').first()

        # Update password
        config.password_hash = bcrypt.hashpw(password, bcrypt.gensalt())
        db.commit()

        # Check version
        print(f"App version: {config.app_version}")
    """
    __tablename__ = 'app_config'

    # Authentication
    password_hash = Column(
        String,
        nullable=True,
        comment="Bcrypt password hash (NULL if no password set)"
    )

    # Application metadata
    app_version = Column(
        String,
        nullable=False,
        default='1.0.0',
        comment="Current application version"
    )

    database_version = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Database schema version for migrations"
    )

    # AI/API Configuration
    anthropic_api_key = Column(
        String,
        nullable=True,
        comment="Anthropic API key for AI interpretations (encrypted)"
    )

    google_api_key = Column(
        String,
        nullable=True,
        comment="Google API key for Gemini image generation"
    )

    # News API Keys (for multi-source newspaper)
    guardian_api_key = Column(
        String,
        nullable=True,
        comment="The Guardian API key for news content (free signup at open-platform.theguardian.com)"
    )

    nyt_api_key = Column(
        String,
        nullable=True,
        comment="New York Times API key for Archive API (free signup at developer.nytimes.com)"
    )

    newsapi_api_key = Column(
        String,
        nullable=True,
        comment="NewsAPI.org API key for recent news (free tier available)"
    )

    # The Game Crafter API Configuration (for printing tarot decks)
    tgc_api_key_id = Column(
        String,
        nullable=True,
        comment="The Game Crafter API Key ID"
    )

    tgc_username = Column(
        String,
        nullable=True,
        comment="The Game Crafter username"
    )

    tgc_password = Column(
        String,
        nullable=True,
        comment="The Game Crafter password (encrypted)"
    )

    # User Preferences
    newspaper_style = Column(
        String,
        nullable=False,
        default='modern',
        comment="Preferred newspaper style for Timeline feature: 'victorian' or 'modern'"
    )

    newspaper_sources_priority = Column(
        String,
        nullable=False,
        default='guardian,nyt,wikipedia',
        comment="Comma-separated priority order for news sources"
    )

    def __repr__(self):
        """String representation"""
        has_password = "with password" if self.password_hash else "no password"
        return f"<AppConfig(version={self.app_version}, {has_password})>"

    @property
    def has_password(self) -> bool:
        """Check if password is set"""
        return self.password_hash is not None

    @property
    def has_api_key(self) -> bool:
        """Check if Anthropic API key is set"""
        return self.anthropic_api_key is not None and len(self.anthropic_api_key.strip()) > 0

    @property
    def has_google_api_key(self) -> bool:
        """Check if Google API key is set"""
        return self.google_api_key is not None and len(self.google_api_key.strip()) > 0

    @property
    def has_guardian_api_key(self) -> bool:
        """Check if Guardian API key is set"""
        return self.guardian_api_key is not None and len(self.guardian_api_key.strip()) > 0

    @property
    def has_nyt_api_key(self) -> bool:
        """Check if NYT API key is set"""
        return self.nyt_api_key is not None and len(self.nyt_api_key.strip()) > 0

    @property
    def has_newsapi_api_key(self) -> bool:
        """Check if NewsAPI.org API key is set"""
        return self.newsapi_api_key is not None and len(self.newsapi_api_key.strip()) > 0

    @property
    def has_tgc_credentials(self) -> bool:
        """Check if The Game Crafter credentials are configured"""
        return (
            self.tgc_api_key_id is not None and len(self.tgc_api_key_id.strip()) > 0
            and self.tgc_username is not None and len(self.tgc_username.strip()) > 0
            and self.tgc_password is not None and len(self.tgc_password.strip()) > 0
        )

    def to_dict(self):
        """
        Convert to dictionary (excludes sensitive fields for security)

        Returns:
            Dictionary with all fields except password_hash and API keys
        """
        result = super().to_dict()
        # Remove sensitive fields for security
        result.pop('password_hash', None)
        result.pop('anthropic_api_key', None)
        result.pop('google_api_key', None)
        result.pop('guardian_api_key', None)
        result.pop('nyt_api_key', None)
        result.pop('newsapi_api_key', None)
        result.pop('tgc_api_key_id', None)
        result.pop('tgc_username', None)
        result.pop('tgc_password', None)
        # Add has_* properties
        result['has_password'] = self.has_password
        result['has_api_key'] = self.has_api_key
        result['has_google_api_key'] = self.has_google_api_key
        result['has_guardian_api_key'] = self.has_guardian_api_key
        result['has_nyt_api_key'] = self.has_nyt_api_key
        result['has_newsapi_api_key'] = self.has_newsapi_api_key
        result['has_tgc_credentials'] = self.has_tgc_credentials
        result['newspaper_style'] = self.newspaper_style or 'modern'
        result['newspaper_sources_priority'] = self.newspaper_sources_priority or 'guardian,nyt,wikipedia'
        return result
