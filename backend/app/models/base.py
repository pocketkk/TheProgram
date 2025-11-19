"""
Base model and mixins for common database fields
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base as SQLAlchemyBase


# Export Base for other models
Base = SQLAlchemyBase


class UUIDMixin:
    """
    Mixin for UUID primary key
    Uses PostgreSQL UUID type with Python uuid generation
    """
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True
    )


class TimestampMixin:
    """
    Mixin for created_at and updated_at timestamp fields
    Automatically manages timestamps
    """
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class BaseModel(Base, UUIDMixin, TimestampMixin):
    """
    Base model with UUID primary key and timestamps
    Abstract class - not created as a table

    All models should inherit from this for consistency
    """
    __abstract__ = True

    def __repr__(self):
        """String representation of model"""
        return f"<{self.__class__.__name__}(id={self.id})>"

    def to_dict(self):
        """
        Convert model to dictionary
        Useful for serialization

        Returns:
            Dictionary representation of model
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            # Handle UUID serialization
            if isinstance(value, uuid.UUID):
                value = str(value)
            # Handle datetime serialization
            elif isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result
