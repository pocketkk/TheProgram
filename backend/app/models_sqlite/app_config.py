"""
AppConfig model for application-level configuration

Singleton table - contains exactly ONE row (id=1)
Stores password hash and application metadata
"""
from sqlalchemy import Column, String, Integer

from app.models_sqlite.base import SingletonModel


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

    def __repr__(self):
        """String representation"""
        has_password = "with password" if self.password_hash else "no password"
        return f"<AppConfig(version={self.app_version}, {has_password})>"

    @property
    def has_password(self) -> bool:
        """Check if password is set"""
        return self.password_hash is not None

    def to_dict(self):
        """
        Convert to dictionary (excludes password_hash for security)

        Returns:
            Dictionary with all fields except password_hash
        """
        result = super().to_dict()
        # Remove password hash for security
        result.pop('password_hash', None)
        result['has_password'] = self.has_password
        return result
