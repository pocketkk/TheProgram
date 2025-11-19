"""
Interpretation model for storing astrological interpretations
"""
from sqlalchemy import Column, String, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Interpretation(BaseModel):
    """
    Interpretation model

    Stores astrological interpretation texts
    Can be default (system-wide) or custom (user-specific)
    """
    __tablename__ = "interpretations"

    # Type and identifier
    interpretation_type = Column(String(100), nullable=False, index=True)
    # Types: planet_in_sign, planet_in_house, aspect, house, nakshatra, gate, etc.

    key_identifier = Column(String(255), nullable=False, index=True)
    # Examples: "sun_in_aries", "sun_trine_moon", "gate_1", "moon_in_rohini"

    # Tradition/system
    tradition = Column(String(50), nullable=True)
    # western, vedic, human_design

    # Interpretation text
    text_content = Column(Text, nullable=False)

    # Source attribution
    source = Column(String(255), nullable=True)
    # Book title, author, or "custom"

    # Customization
    is_user_custom = Column(Boolean, default=False, nullable=False)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,  # NULL for default interpretations
        index=True
    )

    # Relationships
    user = relationship("User", back_populates="custom_interpretations")

    def __repr__(self):
        return f"<Interpretation(id={self.id}, type={self.interpretation_type}, key={self.key_identifier})>"

    @property
    def is_default(self) -> bool:
        """Check if this is a default (system-wide) interpretation"""
        return not self.is_user_custom and self.user_id is None
