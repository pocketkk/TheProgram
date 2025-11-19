"""
Interpretation model for reusable astrological interpretation templates

Stores library of interpretation texts that can be reused across charts.
Supports Western, Vedic, and Human Design traditions.
"""
from sqlalchemy import Column, String, Boolean, Index
from app.models_sqlite.base import BaseModel


class Interpretation(BaseModel):
    """
    Interpretation template model

    Stores reusable interpretation texts for astrological elements.
    In single-user mode, all interpretations are available to the user.

    Fields:
        id: UUID primary key (inherited)
        interpretation_type: Type of interpretation
        key_identifier: Unique identifier for lookup
        tradition: Astrological tradition (western, vedic, human_design)
        text_content: Interpretation text
        source: Attribution/source
        is_user_custom: Flag for user customizations
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Interpretation Types:
        - planet_in_sign: "sun_in_aries", "moon_in_taurus"
        - planet_in_house: "sun_in_house_1", "moon_in_house_4"
        - aspect: "sun_trine_moon", "mars_square_saturn"
        - house: "house_1", "house_10"
        - nakshatra: "moon_in_rohini", "sun_in_ashwini" (Vedic)
        - gate: "gate_1", "gate_64" (Human Design)

    Example:
        interp = Interpretation(
            interpretation_type="planet_in_sign",
            key_identifier="sun_in_aries",
            tradition="western",
            text_content="Sun in Aries people are bold, pioneering...",
            source="Modern Astrology Textbook",
            is_user_custom=False
        )
    """
    __tablename__ = 'interpretations'

    # Type and identifier
    interpretation_type = Column(
        String,
        nullable=False,
        index=True,
        comment="Type: planet_in_sign, planet_in_house, aspect, house, nakshatra, gate, etc."
    )

    key_identifier = Column(
        String,
        nullable=False,
        index=True,
        comment="Unique identifier: 'sun_in_aries', 'sun_trine_moon', 'gate_1', etc."
    )

    # Tradition/system
    tradition = Column(
        String,
        nullable=True,
        comment="Astrological tradition: western, vedic, human_design"
    )

    # Interpretation text
    text_content = Column(
        String,
        nullable=False,
        comment="The interpretation text content"
    )

    # Source attribution
    source = Column(
        String,
        nullable=True,
        comment="Source: book title, author, or 'custom'"
    )

    # Customization flag
    is_user_custom = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if user-customized (0=default, 1=custom)"
    )

    # Table indexes for efficient lookups
    __table_args__ = (
        Index('idx_interpretations_type', 'interpretation_type'),
        Index('idx_interpretations_key', 'key_identifier'),
        Index('idx_interpretations_lookup', 'interpretation_type', 'key_identifier'),
    )

    def __repr__(self):
        """String representation"""
        custom = " (custom)" if self.is_user_custom else ""
        return (
            f"<Interpretation("
            f"type={self.interpretation_type}, "
            f"key={self.key_identifier}, "
            f"tradition={self.tradition}{custom}"
            f")>"
        )

    @property
    def preview_text(self) -> str:
        """
        Get preview text (first 100 characters)

        Returns:
            Truncated text for previews
        """
        if not self.text_content:
            return ""
        if len(self.text_content) <= 100:
            return self.text_content
        return self.text_content[:97] + "..."

    @property
    def is_default(self) -> bool:
        """Check if this is a default (non-custom) interpretation"""
        return not self.is_user_custom

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with preview and flags
        """
        result = super().to_dict()
        result['preview_text'] = self.preview_text
        result['is_default'] = self.is_default
        return result
