"""
User model for authentication and user management
"""
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class User(BaseModel):
    """
    User model for authentication

    Represents user accounts in the system
    """
    __tablename__ = "users"

    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    # Profile information
    full_name = Column(String(255), nullable=True)
    business_name = Column(String(255), nullable=True)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    # Subscription information
    subscription_tier = Column(
        String(50),
        default="free",
        nullable=False
    )  # free, pro, professional

    # Login tracking
    last_login = Column(DateTime, nullable=True)

    # Relationships
    clients = relationship(
        "Client",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    charts = relationship(
        "Chart",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    session_notes = relationship(
        "SessionNote",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    preferences = relationship(
        "UserPreferences",
        back_populates="user",
        uselist=False,  # One-to-one relationship
        cascade="all, delete-orphan"
    )

    custom_interpretations = relationship(
        "Interpretation",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"

    @property
    def is_premium(self) -> bool:
        """Check if user has premium subscription"""
        return self.subscription_tier in ["pro", "professional"]

    def update_last_login(self):
        """Update last login timestamp"""
        from datetime import datetime
        self.last_login = datetime.utcnow()
