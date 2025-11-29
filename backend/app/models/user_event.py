"""
UserEvent model for storing user-defined life events

Personal events mapped onto the transit timeline with optional AI context.
Part of Phase 2: Transit Timeline.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Text, Boolean
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class UserEvent(BaseModel):
    """
    User event model for timeline tracking

    Stores significant life events that can be correlated with astrological
    transits. Events appear on the transit timeline and can have AI-generated
    context about relevant transits at that time.

    Fields:
        id: UUID primary key (inherited)
        birth_data_id: Link to birth data for transit calculation
        event_date: ISO 8601 date of the event (YYYY-MM-DD)
        event_time: Optional ISO 8601 time (HH:MM:SS)
        title: Event title/name
        description: Optional detailed description
        category: Event category (career, relationship, health, spiritual, etc.)
        importance: Importance level (minor, moderate, major, transformative)
        tags: JSON list of tags
        is_recurring: Whether this is a recurring event
        recurrence_pattern: Recurrence pattern if recurring (yearly, monthly, etc.)
        transit_analysis: AI-generated analysis of transits at event time
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        birth_data: Birth data for transit calculations
        transit_context: Calculated transit context for this event

    Categories:
        - career: Job changes, promotions, projects
        - relationship: Meetings, breakups, marriages
        - health: Illness, recovery, wellness milestones
        - spiritual: Insights, practices, awakenings
        - travel: Moves, trips, relocations
        - financial: Major purchases, investments, changes
        - creative: Projects, performances, publications
        - education: Schools, courses, certifications
        - family: Births, deaths, reunions
        - personal: Personal milestones and growth

    Example:
        event = UserEvent(
            birth_data_id=birth_data.id,
            event_date="2024-03-15",
            title="Started New Job",
            description="Began role as Senior Developer...",
            category="career",
            importance="major",
            tags=["saturn-return", "10th-house"]
        )
    """
    __tablename__ = 'user_events'

    # Foreign keys
    birth_data_id = Column(
        String,
        ForeignKey('birth_data.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Link to birth data for transit calculations"
    )

    # Event timing
    event_date = Column(
        String,
        nullable=False,
        index=True,
        comment="Event date in ISO 8601 format (YYYY-MM-DD)"
    )

    event_time = Column(
        String,
        nullable=True,
        comment="Optional event time in ISO 8601 format (HH:MM:SS)"
    )

    # Event details
    title = Column(
        String(255),
        nullable=False,
        comment="Event title/name"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Detailed event description"
    )

    # Categorization
    category = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Event category: career, relationship, health, spiritual, etc."
    )

    importance = Column(
        String(20),
        nullable=False,
        default='moderate',
        comment="Importance: minor, moderate, major, transformative"
    )

    tags = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment="JSON list of tags"
    )

    # Recurrence
    is_recurring = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether this is a recurring event"
    )

    recurrence_pattern = Column(
        String(50),
        nullable=True,
        comment="Recurrence pattern: yearly, monthly, weekly"
    )

    # AI integration
    transit_analysis = Column(
        Text,
        nullable=True,
        comment="AI-generated analysis of transits at event time"
    )

    # Relationships
    birth_data = relationship(
        'BirthData',
        foreign_keys=[birth_data_id],
        lazy='select'
    )

    # Related transit context
    transit_contexts = relationship(
        'TransitContext',
        back_populates='user_event',
        cascade='all, delete-orphan',
        lazy='select'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_user_event_date', 'event_date'),
        Index('idx_user_event_birth_data', 'birth_data_id'),
        Index('idx_user_event_category', 'category'),
        Index('idx_user_event_importance', 'importance'),
    )

    def __repr__(self):
        """String representation"""
        return f"<UserEvent(id={self.id[:8]}..., date={self.event_date}, title='{self.title}')>"

    @property
    def tag_list(self) -> list:
        """
        Get tags as Python list

        Returns:
            List of tags or empty list
        """
        return self.tags or []

    @property
    def datetime_string(self) -> str:
        """
        Get combined date/time string

        Returns:
            Date with time if available
        """
        if self.event_time:
            return f"{self.event_date} {self.event_time}"
        return self.event_date

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation
        """
        result = super().to_dict()
        result['tag_list'] = self.tag_list
        result['datetime_string'] = self.datetime_string
        return result
