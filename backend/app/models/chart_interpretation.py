"""
ChartInterpretation model for storing AI-generated chart descriptions
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ChartInterpretation(BaseModel):
    """
    ChartInterpretation model

    Stores AI-generated interpretations for specific chart elements
    Each interpretation is tied to a specific chart and element
    """
    __tablename__ = "chart_interpretations"

    # Foreign key to chart
    chart_id = Column(
        UUID(as_uuid=True),
        ForeignKey("charts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Element identification
    element_type = Column(String(50), nullable=False, index=True)
    # Types: 'planet', 'house', 'aspect', 'pattern'

    element_key = Column(String(255), nullable=False)
    # Examples:
    #   planet: "sun", "moon", "mercury"
    #   house: "house_1", "house_2"
    #   aspect: "sun_trine_moon", "mars_square_saturn"
    #   pattern: "grand_trine_1", "t_square_1"

    # AI-generated content
    ai_description = Column(Text, nullable=False)

    # AI metadata
    ai_model = Column(String(100), nullable=True)
    # Examples: "gpt-4", "claude-3-opus", "custom"

    ai_prompt_version = Column(String(50), nullable=True)
    # Track which prompt template version was used

    # Versioning
    version = Column(Integer, default=1, nullable=False)
    # Increment when regenerating for the same element

    # Quality/validation
    is_approved = Column(String(20), nullable=True, default="pending")
    # Status: "pending", "approved", "rejected", "needs_review"

    # Relationships
    chart = relationship("Chart", back_populates="ai_interpretations")

    # Composite index for efficient lookups
    __table_args__ = (
        Index('ix_chart_interp_lookup', 'chart_id', 'element_type', 'element_key'),
    )

    def __repr__(self):
        return f"<ChartInterpretation(id={self.id}, chart={self.chart_id}, element={self.element_type}:{self.element_key})>"

    @property
    def is_latest_version(self) -> bool:
        """Check if this is the latest version for this element"""
        # This would need to query the database to verify
        # For now, we'll assume version tracking is manual
        return True

    def get_summary(self, max_length: int = 100) -> str:
        """
        Get a truncated summary of the description

        Args:
            max_length: Maximum length of summary

        Returns:
            Truncated description with ellipsis if needed
        """
        if len(self.ai_description) <= max_length:
            return self.ai_description
        return self.ai_description[:max_length].rsplit(' ', 1)[0] + '...'
