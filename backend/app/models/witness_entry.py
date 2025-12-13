"""
WitnessEntry model for the Witness Log

The Witness Log is a space for documenting our inner response
to outer events. Not judgment, but awareness - watching how
the news of the world moves through us.
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, Index
from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class WitnessEntry(BaseModel):
    """
    Witness Log entry - documenting inner response to outer events.

    The Witness Log creates space between stimulus and response.
    When we encounter news that moves us, we can pause to document
    our inner experience - not to judge or analyze, but to witness.

    This practice:
    - Builds self-awareness around information consumption
    - Creates a record of how world events affect us
    - Helps identify patterns in our reactions
    - Transforms passive consumption into active witnessing

    Fields:
        # Context
        witness_date: When this witnessing occurred
        article_date: Date of the triggering article/event
        article_headline: What triggered this entry
        article_source: Source of the triggering content
        article_url: Link to source if available

        # The witnessing
        initial_reaction: First unfiltered response
        body_sensations: Physical feelings in the body
        emotions: Named emotions that arose
        thoughts: Thoughts that came up
        judgments: Judgments noticed (with awareness)

        # Deeper reflection
        personal_connection: Why this might resonate personally
        memories_triggered: Memories this brought up
        beliefs_questioned: Beliefs this challenged or confirmed
        growth_edge: Where this touches personal growth

        # Integration
        breath_count: Breaths taken before responding (mindfulness metric)
        action_impulse: What action did you want to take?
        chosen_response: What did you actually do?
        gratitude_found: Any gratitude found in the experience
        lesson: What might be learned here

        # Pattern tracking
        similar_entries: IDs of similar past entries
        recurring_theme: Is this a pattern?
        intensity: 1-10 emotional intensity

    Example:
        entry = WitnessEntry(
            witness_date="2025-01-15",
            article_headline="Climate Report Shows Accelerating Change",
            initial_reaction="Felt a wave of despair wash over me",
            body_sensations=["tight chest", "shallow breathing"],
            emotions=["grief", "fear", "anger"],
            thoughts=["It's too late", "Why aren't people doing more?"],
            breath_count=10,
            gratitude_found="Grateful for my children's generation who are fighting"
        )
    """
    __tablename__ = 'witness_entries'

    # Context - what triggered this
    witness_date = Column(
        String(10),
        nullable=False,
        index=True,
        comment="Date of witnessing (YYYY-MM-DD)"
    )

    article_date = Column(
        String(10),
        nullable=True,
        comment="Date of triggering article (YYYY-MM-DD)"
    )

    article_headline = Column(
        String(500),
        nullable=True,
        comment="Headline that triggered this entry"
    )

    article_source = Column(
        String(100),
        nullable=True,
        comment="Source of triggering content"
    )

    article_url = Column(
        String(500),
        nullable=True,
        comment="URL of source if available"
    )

    article_section = Column(
        String(100),
        nullable=True,
        comment="Newspaper section the article was from"
    )

    # Initial response (unfiltered)
    initial_reaction = Column(
        Text,
        nullable=True,
        comment="First unfiltered response to the content"
    )

    body_sensations = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Physical sensations: ["tight chest", "tension in shoulders"]'
    )

    emotions = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Named emotions: ["grief", "anger", "hope"]'
    )

    thoughts = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Thoughts that arose'
    )

    judgments = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Judgments noticed (without judgment about having them)'
    )

    # Deeper reflection
    personal_connection = Column(
        Text,
        nullable=True,
        comment="Why this might resonate personally"
    )

    memories_triggered = Column(
        Text,
        nullable=True,
        comment="Memories this brought up"
    )

    beliefs_questioned = Column(
        Text,
        nullable=True,
        comment="Beliefs this challenged or confirmed"
    )

    growth_edge = Column(
        Text,
        nullable=True,
        comment="Where this touches personal growth"
    )

    # Mindfulness integration
    breath_count = Column(
        Integer,
        nullable=True,
        comment="Breaths taken before responding (0 = immediate reaction)"
    )

    pause_taken = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Did user pause before responding?"
    )

    action_impulse = Column(
        Text,
        nullable=True,
        comment="What action did you want to take?"
    )

    chosen_response = Column(
        Text,
        nullable=True,
        comment="What did you actually do?"
    )

    # Finding light
    gratitude_found = Column(
        Text,
        nullable=True,
        comment="Any gratitude found in the experience"
    )

    lesson = Column(
        Text,
        nullable=True,
        comment="What might be learned here"
    )

    blessing = Column(
        Text,
        nullable=True,
        comment="A blessing or prayer in response"
    )

    # Pattern tracking
    similar_entries = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='IDs of similar past witness entries'
    )

    recurring_theme = Column(
        String(100),
        nullable=True,
        comment="If this is part of a pattern, what theme?"
    )

    intensity = Column(
        Integer,
        nullable=True,
        comment="1-10 emotional intensity rating"
    )

    # Category
    category = Column(
        String(50),
        nullable=True,
        comment="Category: political, environmental, social, personal, spiritual"
    )

    # Transit context
    transit_context = Column(
        Text,
        nullable=True,
        comment="Astrological transits at time of witnessing"
    )

    # Indexes
    __table_args__ = (
        Index('idx_witness_date', 'witness_date'),
        Index('idx_witness_article_date', 'article_date'),
        Index('idx_witness_intensity', 'intensity'),
        Index('idx_witness_category', 'category'),
        Index('idx_witness_theme', 'recurring_theme'),
    )

    def __repr__(self):
        headline = self.article_headline[:30] + "..." if self.article_headline and len(self.article_headline) > 30 else self.article_headline
        return f"<WitnessEntry(date={self.witness_date}, trigger='{headline}')>"

    @property
    def emotion_summary(self) -> str:
        """Get comma-separated list of emotions"""
        return ", ".join(self.emotions or [])

    @property
    def has_reflection(self) -> bool:
        """Check if entry has deeper reflection"""
        return bool(
            self.personal_connection or
            self.memories_triggered or
            self.beliefs_questioned or
            self.growth_edge
        )

    @property
    def has_integration(self) -> bool:
        """Check if entry has integration elements"""
        return bool(
            self.gratitude_found or
            self.lesson or
            self.blessing or
            self.chosen_response
        )

    @property
    def mindfulness_score(self) -> int:
        """Calculate a mindfulness score 0-10 based on entry quality"""
        score = 0
        if self.pause_taken:
            score += 2
        if self.breath_count and self.breath_count >= 3:
            score += 2
        if self.body_sensations:
            score += 1
        if self.emotions:
            score += 1
        if self.has_reflection:
            score += 2
        if self.has_integration:
            score += 2
        return min(score, 10)

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['emotion_summary'] = self.emotion_summary
        result['has_reflection'] = self.has_reflection
        result['has_integration'] = self.has_integration
        result['mindfulness_score'] = self.mindfulness_score
        return result

    def to_summary_dict(self) -> dict:
        """Compact format for list display"""
        return {
            "id": self.id,
            "witness_date": self.witness_date,
            "article_headline": self.article_headline,
            "article_source": self.article_source,
            "emotions": self.emotions or [],
            "intensity": self.intensity,
            "has_reflection": self.has_reflection,
            "has_integration": self.has_integration,
            "mindfulness_score": self.mindfulness_score,
            "recurring_theme": self.recurring_theme
        }
