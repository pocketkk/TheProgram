"""
JournalEntry model for storing consciousness exploration journal entries

Personal journal entries tied to charts with tags, mood, and AI context.
Part of Phase 2: Journal System.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class JournalEntry(BaseModel):
    """
    Journal entry model for consciousness exploration

    Stores personal reflections, insights, and notes tied to specific
    charts and moments. Supports tagging, mood tracking, and AI context.

    Fields:
        id: UUID primary key (inherited)
        birth_data_id: Optional link to birth data (can be general entry)
        chart_id: Optional link to specific chart
        entry_date: ISO 8601 date of the entry (YYYY-MM-DD)
        title: Optional title for the entry
        content: Full journal entry content (supports markdown)
        tags: JSON list of tags (e.g., ["dreams", "saturn-return", "meditation"])
        mood: Mood indicator (e.g., "reflective", "anxious", "inspired")
        mood_score: Optional 1-10 numeric mood rating
        transit_context: JSON snapshot of significant transits at entry time
        ai_summary: AI-generated summary of the entry
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        birth_data: Optional birth data this entry relates to
        chart: Optional specific chart this entry relates to

    Example:
        entry = JournalEntry(
            birth_data_id=birth_data.id,
            entry_date="2025-01-15",
            title="Saturn Return Reflections",
            content="Today I noticed how the themes of...",
            tags=["saturn-return", "career", "reflection"],
            mood="contemplative",
            mood_score=6
        )
    """
    __tablename__ = 'journal_entries'

    # Foreign keys (optional - entries can be standalone)
    birth_data_id = Column(
        String,
        ForeignKey('birth_data.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
        comment="Optional link to birth data"
    )

    chart_id = Column(
        String,
        ForeignKey('charts.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
        comment="Optional link to specific chart"
    )

    # Entry metadata
    entry_date = Column(
        String,
        nullable=False,
        index=True,
        comment="Entry date in ISO 8601 format (YYYY-MM-DD)"
    )

    target_date = Column(
        String(10),
        nullable=True,
        index=True,
        comment="Target date for timeline linking (YYYY-MM-DD). Null for regular journal entries."
    )

    title = Column(
        String(255),
        nullable=True,
        comment="Optional entry title"
    )

    # Content
    content = Column(
        Text,
        nullable=False,
        comment="Full journal entry content (markdown supported)"
    )

    # Categorization
    tags = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment="JSON list of tags for categorization"
    )

    mood = Column(
        String(50),
        nullable=True,
        comment="Mood indicator: reflective, anxious, inspired, peaceful, etc."
    )

    mood_score = Column(
        String,
        nullable=True,
        comment="Optional 1-10 numeric mood rating"
    )

    # Astrological context
    transit_context = Column(
        Text,
        nullable=True,
        comment="JSON snapshot of significant transits at entry time"
    )

    # AI integration
    ai_summary = Column(
        Text,
        nullable=True,
        comment="AI-generated summary of the entry"
    )

    # Relationships
    birth_data = relationship(
        'BirthData',
        foreign_keys=[birth_data_id],
        lazy='select'
    )

    chart = relationship(
        'Chart',
        foreign_keys=[chart_id],
        lazy='select'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_journal_entry_date', 'entry_date'),
        Index('idx_journal_target_date', 'target_date'),
        Index('idx_journal_birth_data_id', 'birth_data_id'),
        Index('idx_journal_chart_id', 'chart_id'),
        Index('idx_journal_created_at', 'created_at'),
    )

    def __repr__(self):
        """String representation"""
        title_preview = self.title or self.content[:30] + "..."
        return f"<JournalEntry(id={self.id[:8]}..., date={self.entry_date}, title='{title_preview}')>"

    @property
    def preview(self) -> str:
        """
        Get preview of entry content

        Returns:
            First 150 characters of content
        """
        if len(self.content) <= 150:
            return self.content
        return self.content[:150] + "..."

    @property
    def tag_list(self) -> list:
        """
        Get tags as Python list

        Returns:
            List of tags or empty list
        """
        return self.tags or []

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with preview
        """
        result = super().to_dict()
        result['preview'] = self.preview
        result['tag_list'] = self.tag_list
        return result
