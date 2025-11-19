"""
Base model and mixins for SQLite models

Provides common functionality for all SQLite models including:
- String-based UUID primary keys
- ISO 8601 timestamp fields
- Automatic timestamp updates
- Base model class
"""
from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declared_attr

from app.core.database_sqlite import Base as SQLAlchemyBase
from app.core.uuid_helpers import generate_uuid
from app.core.datetime_helpers import now_iso


# Export Base for other models
Base = SQLAlchemyBase


class UUIDMixin:
    """
    Mixin for string-based UUID primary key

    SQLite stores UUIDs as TEXT strings.
    Automatically generates UUID on creation.
    """
    id = Column(
        String,
        primary_key=True,
        default=generate_uuid,
        nullable=False
    )


class TimestampMixin:
    """
    Mixin for ISO 8601 timestamp fields

    Provides created_at and updated_at fields.
    SQLite stores timestamps as TEXT in ISO 8601 format.

    Note: SQLite doesn't have automatic updated_at triggers in SQLAlchemy,
    so we use default/onupdate callables. The schema SQL file has triggers
    for direct SQL access.
    """
    created_at = Column(
        String,
        default=now_iso,
        nullable=False
    )

    updated_at = Column(
        String,
        default=now_iso,
        onupdate=now_iso,
        nullable=False
    )


class BaseModel(Base, UUIDMixin, TimestampMixin):
    """
    Base model with UUID primary key and timestamps

    Abstract class - not created as a table.
    All data models should inherit from this for consistency.

    Provides:
    - id: String UUID primary key
    - created_at: ISO 8601 timestamp
    - updated_at: ISO 8601 timestamp (auto-updated)
    - __repr__: String representation
    - to_dict: Dictionary serialization
    """
    __abstract__ = True

    def __repr__(self):
        """
        String representation of model

        Example:
            <Client(id='550e8400-e29b-41d4-a716-446655440000')>
        """
        return f"<{self.__class__.__name__}(id={self.id})>"

    def to_dict(self):
        """
        Convert model to dictionary for serialization

        Returns:
            Dictionary representation of model with all column values

        Example:
            client = Client(first_name="John", last_name="Doe")
            data = client.to_dict()
            # {'id': '550e8400-...', 'first_name': 'John', ...}
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            result[column.name] = value
        return result

    def update_from_dict(self, data: dict) -> None:
        """
        Update model from dictionary

        Only updates attributes that exist in the model.
        Skips id, created_at (immutable fields).

        Args:
            data: Dictionary of field names and values

        Example:
            client.update_from_dict({'first_name': 'Jane', 'email': 'jane@example.com'})
        """
        for key, value in data.items():
            # Skip immutable fields
            if key in ('id', 'created_at'):
                continue
            # Only update existing columns
            if hasattr(self, key):
                setattr(self, key, value)


class SingletonMixin:
    """
    Mixin for singleton tables (app_config, user_preferences)

    Enforces single row with id=1.
    These tables only ever have one record.
    """
    id = Column(
        String,
        primary_key=True,
        default=lambda: "1",
        nullable=False
    )

    @declared_attr
    def __table_args__(cls):
        """Add CHECK constraint to enforce id=1"""
        from sqlalchemy import CheckConstraint
        return (
            CheckConstraint("id = '1'", name=f"ck_{cls.__tablename__}_singleton"),
        )


class SingletonModel(Base, SingletonMixin, TimestampMixin):
    """
    Base model for singleton tables

    Used for app_config and user_preferences tables.
    These tables only ever contain a single row with id=1.

    Abstract class - not created as a table.
    """
    __abstract__ = True

    def __repr__(self):
        """String representation"""
        return f"<{self.__class__.__name__}(singleton)>"

    def to_dict(self):
        """Convert to dictionary"""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            result[column.name] = value
        return result

    def update_from_dict(self, data: dict) -> None:
        """
        Update model from dictionary

        Args:
            data: Dictionary of field names and values
        """
        for key, value in data.items():
            # Skip immutable fields
            if key in ('id', 'created_at'):
                continue
            # Only update existing columns
            if hasattr(self, key):
                setattr(self, key, value)
