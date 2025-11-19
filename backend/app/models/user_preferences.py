"""
UserPreferences model for storing user default settings
"""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base, UUIDMixin


class UserPreferences(Base, UUIDMixin):
    """
    User preferences model

    Stores user's default chart calculation preferences
    One-to-one relationship with User
    """
    __tablename__ = "user_preferences"

    # Foreign key to user (unique - one-to-one)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # Default chart settings
    default_house_system = Column(String(50), default="placidus", nullable=False)
    default_ayanamsa = Column(String(50), default="lahiri", nullable=False)
    default_zodiac = Column(String(50), default="tropical", nullable=False)

    # Aspect orbs (stored as JSON)
    aspect_orbs = Column(JSONB, nullable=True)
    # Example: {"conjunction": 10, "opposition": 10, "trine": 8, ...}

    # Display preferences
    color_scheme = Column(String(50), default="light", nullable=False)

    # Points to display (stored as JSON array)
    displayed_points = Column(JSONB, nullable=True)
    # Example: ["sun", "moon", "mercury", ..., "chiron", "true_node"]

    # Timestamp
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="preferences")

    def __repr__(self):
        return f"<UserPreferences(id={self.id}, user_id={self.user_id})>"

    def get_aspect_orb(self, aspect_type: str) -> float:
        """
        Get orb for specific aspect type

        Args:
            aspect_type: Aspect type (conjunction, trine, etc.)

        Returns:
            Orb in degrees, or None if not set
        """
        if self.aspect_orbs and aspect_type in self.aspect_orbs:
            return float(self.aspect_orbs[aspect_type])
        return None

    def set_aspect_orb(self, aspect_type: str, orb: float):
        """
        Set orb for specific aspect type

        Args:
            aspect_type: Aspect type
            orb: Orb in degrees
        """
        if self.aspect_orbs is None:
            self.aspect_orbs = {}
        self.aspect_orbs[aspect_type] = orb
