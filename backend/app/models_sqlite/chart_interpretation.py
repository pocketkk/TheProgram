"""
ChartInterpretation model for AI-generated chart element interpretations

Stores AI-generated interpretations for specific chart elements
(planets, houses, aspects, patterns).
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models_sqlite.base import BaseModel


class ChartInterpretation(BaseModel):
    """
    Chart interpretation model

    Stores AI-generated interpretations for chart elements.
    Each interpretation is specific to one chart and one element.

    Fields:
        id: UUID primary key (inherited)
        chart_id: Foreign key to Chart
        element_type: Type of element (planet, house, aspect, pattern)
        element_key: Unique identifier for element
        astro_system: Astrological system (western, vedic, human_design)
        ai_description: AI-generated interpretation text
        ai_model: AI model used (e.g., "gpt-4", "claude-3-opus")
        ai_prompt_version: Prompt template version used
        version: Version number (increment on regeneration)
        is_approved: Approval status (pending, approved, rejected, needs_review)
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        chart: Parent chart

    Element Types and Keys:
        - planet: "sun", "moon", "mercury", etc.
        - house: "house_1", "house_2", etc.
        - aspect: "sun_trine_moon", "mars_square_saturn", etc.
        - pattern: "grand_trine_1", "t_square_1", etc.

    Example:
        interp = ChartInterpretation(
            chart_id=chart.id,
            element_type="planet",
            element_key="sun",
            ai_description="Your Sun in Aries indicates...",
            ai_model="claude-3-opus",
            ai_prompt_version="v1.2",
            version=1,
            is_approved="pending"
        )
    """
    __tablename__ = 'chart_interpretations'

    # Foreign key to chart
    chart_id = Column(
        String,
        ForeignKey('charts.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Foreign key to charts table"
    )

    # Element identification
    element_type = Column(
        String,
        nullable=False,
        index=True,
        comment="Element type: planet, house, aspect, pattern"
    )

    element_key = Column(
        String,
        nullable=False,
        comment="Element identifier: 'sun', 'house_1', 'sun_trine_moon', etc."
    )

    # Astrological system - for separating Western vs Vedic interpretations
    astro_system = Column(
        String,
        nullable=False,
        default='western',
        index=True,
        comment="Astrological system: western, vedic, human_design"
    )

    # AI-generated content
    ai_description = Column(
        String,
        nullable=False,
        comment="AI-generated interpretation text"
    )

    # AI metadata
    ai_model = Column(
        String,
        nullable=True,
        comment="AI model used: 'gpt-4', 'claude-3-opus', 'custom', etc."
    )

    ai_prompt_version = Column(
        String,
        nullable=True,
        comment="Prompt template version (for tracking changes)"
    )

    # Versioning
    version = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Version number (increment when regenerating)"
    )

    # Quality/validation
    is_approved = Column(
        String,
        default='pending',
        comment="Status: pending, approved, rejected, needs_review"
    )

    # Relationships
    chart = relationship(
        'Chart',
        back_populates='interpretations'
    )

    # Table constraints and indexes
    __table_args__ = (
        Index('idx_chart_interpretations_chart_id', 'chart_id'),
        Index('idx_chart_interpretations_element_type', 'element_type'),
        Index('idx_chart_interpretations_astro_system', 'astro_system'),
        # Updated lookup index to include astro_system for efficient queries
        Index('idx_chart_interpretations_lookup_v2', 'chart_id', 'astro_system', 'element_type', 'element_key'),
    )

    def __repr__(self):
        """String representation"""
        return (
            f"<ChartInterpretation("
            f"chart={self.chart_id[:8]}..., "
            f"type={self.element_type}, "
            f"key={self.element_key}, "
            f"v{self.version}"
            f")>"
        )

    @property
    def is_pending(self) -> bool:
        """Check if interpretation is pending approval"""
        return self.is_approved == 'pending'

    @property
    def is_approved_status(self) -> bool:
        """Check if interpretation is approved"""
        return self.is_approved == 'approved'

    @property
    def preview_text(self) -> str:
        """
        Get preview text (first 100 characters)

        Returns:
            Truncated description for previews
        """
        if not self.ai_description:
            return ""
        if len(self.ai_description) <= 100:
            return self.ai_description
        return self.ai_description[:97] + "..."

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with approval flags
        """
        result = super().to_dict()
        result['is_pending'] = self.is_pending
        result['is_approved_status'] = self.is_approved_status
        result['preview_text'] = self.preview_text
        return result
