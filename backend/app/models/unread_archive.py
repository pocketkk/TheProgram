"""
UnreadArchive model for the "Not Ready Yet" reading list

Some information arrives before we're ready to receive it.
This model stores articles the user wants to revisit later,
honoring the timing of understanding.
"""
from sqlalchemy import Column, String, Text, Boolean, Index, Integer
from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList, JSONEncodedDict


class UnreadArchiveItem(BaseModel):
    """
    Saved article for the Unread Archive feature.

    Sometimes we encounter information before we're ready to receive it.
    The Unread Archive lets users save articles with a note about why
    they're not ready, creating a personal "someday maybe" reading list
    that honors the timing of understanding.

    Fields:
        # Article data
        article_id: Original article identifier (if any)
        source: News source
        source_date: Original article date (YYYY-MM-DD)
        headline: Article headline
        content: Full article content
        url: Original URL if applicable
        section: Which section it was from

        # User context
        saved_date: When user saved it
        reason: Why user saved it for later
        feelings: How user felt encountering this
        not_ready_note: Why they're not ready yet

        # Readiness
        revisit_after: Date to surface again (YYYY-MM-DD)
        revisit_count: How many times user has revisited
        last_revisited: Last time user looked at this
        ready_now: User has marked as ready to fully engage
        engaged_date: When user fully engaged with content

        # Reflection
        initial_reaction: First reaction when saved
        later_reaction: Reaction upon revisiting
        insights: What user learned from the delay

    Example:
        item = UnreadArchiveItem(
            headline="Scientists Discover New Form of Life",
            source="The Guardian",
            source_date="2025-01-15",
            saved_date="2025-01-16",
            not_ready_note="This feels too big to process right now. Need to sit with it.",
            revisit_after="2025-02-01"
        )
    """
    __tablename__ = 'unread_archive'

    # Article identification
    article_id = Column(
        String(255),
        nullable=True,
        comment="Original article identifier"
    )

    source = Column(
        String(100),
        nullable=True,
        comment="News source name"
    )

    source_date = Column(
        String(10),
        nullable=True,
        index=True,
        comment="Original article date (YYYY-MM-DD)"
    )

    # Article content
    headline = Column(
        String(500),
        nullable=False,
        comment="Article headline"
    )

    content = Column(
        Text,
        nullable=True,
        comment="Article content or summary"
    )

    url = Column(
        String(500),
        nullable=True,
        comment="Original article URL"
    )

    section = Column(
        String(100),
        nullable=True,
        comment="Which newspaper section it was from"
    )

    # Metadata
    tags = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Tags for categorization'
    )

    article_metadata = Column(
        JSONEncodedDict,
        nullable=True,
        default=dict,
        comment='Additional article metadata'
    )

    # User context when saving
    saved_date = Column(
        String(10),
        nullable=False,
        index=True,
        comment="When user saved this (YYYY-MM-DD)"
    )

    reason = Column(
        Text,
        nullable=True,
        comment="Why user saved this for later"
    )

    feelings = Column(
        String(255),
        nullable=True,
        comment="How user felt when encountering this"
    )

    not_ready_note = Column(
        Text,
        nullable=True,
        comment="Why they're not ready to engage with this yet"
    )

    # Timing for revisit
    revisit_after = Column(
        String(10),
        nullable=True,
        index=True,
        comment="Date to resurface this (YYYY-MM-DD)"
    )

    # Engagement tracking
    revisit_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="How many times user has revisited"
    )

    last_revisited = Column(
        String(10),
        nullable=True,
        comment="Last revisit date (YYYY-MM-DD)"
    )

    ready_now = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="User has marked as ready to engage"
    )

    engaged_date = Column(
        String(10),
        nullable=True,
        comment="When user fully engaged with content"
    )

    # Reflection on the delay
    initial_reaction = Column(
        Text,
        nullable=True,
        comment="First reaction when saved"
    )

    later_reaction = Column(
        Text,
        nullable=True,
        comment="Reaction upon revisiting"
    )

    insights = Column(
        Text,
        nullable=True,
        comment="What user learned from delaying engagement"
    )

    # Archival status
    is_archived = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether item is fully processed and archived"
    )

    # Indexes
    __table_args__ = (
        Index('idx_unread_saved_date', 'saved_date'),
        Index('idx_unread_source_date', 'source_date'),
        Index('idx_unread_revisit_after', 'revisit_after'),
        Index('idx_unread_ready', 'ready_now'),
        Index('idx_unread_archived', 'is_archived'),
    )

    def __repr__(self):
        headline_preview = self.headline[:40] + "..." if len(self.headline) > 40 else self.headline
        return f"<UnreadArchiveItem(headline='{headline_preview}', saved={self.saved_date})>"

    @property
    def waiting_days(self) -> int | None:
        """Calculate days since saving (if saved_date is set)"""
        if not self.saved_date:
            return None
        from datetime import datetime
        try:
            saved = datetime.strptime(self.saved_date, '%Y-%m-%d')
            return (datetime.now() - saved).days
        except ValueError:
            return None

    @property
    def is_due_for_revisit(self) -> bool:
        """Check if item is due for revisiting based on revisit_after date"""
        if not self.revisit_after or self.ready_now or self.is_archived:
            return False
        from datetime import datetime
        try:
            revisit_date = datetime.strptime(self.revisit_after, '%Y-%m-%d')
            return datetime.now() >= revisit_date
        except ValueError:
            return False

    def mark_revisited(self):
        """Update revisit tracking"""
        from app.core.datetime_helpers import now_iso
        self.revisit_count += 1
        self.last_revisited = now_iso()[:10]  # Just the date part

    def mark_ready(self):
        """Mark as ready to engage"""
        from app.core.datetime_helpers import now_iso
        self.ready_now = True
        self.engaged_date = now_iso()[:10]

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['waiting_days'] = self.waiting_days
        result['is_due_for_revisit'] = self.is_due_for_revisit
        return result

    def to_list_dict(self) -> dict:
        """Compact format for list display"""
        return {
            "id": self.id,
            "headline": self.headline,
            "source": self.source,
            "source_date": self.source_date,
            "saved_date": self.saved_date,
            "waiting_days": self.waiting_days,
            "revisit_after": self.revisit_after,
            "is_due": self.is_due_for_revisit,
            "revisit_count": self.revisit_count,
            "not_ready_note": self.not_ready_note,
            "ready_now": self.ready_now
        }
