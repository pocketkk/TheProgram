"""
InterestProfile model for tracking topic interests

Part of Cosmic Chronicle - privacy-first personal news hub.
All data stored locally, never transmitted without consent.
"""
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Float, Integer, Index

from app.models.base import BaseModel


class InterestProfile(BaseModel):
    """
    Interest profile model for personal algorithm

    Tracks interest levels in different topics over time.
    Interests decay naturally to reflect changing preferences.

    Fields:
        id: UUID primary key (inherited)
        topic: The topic/keyword being tracked
        category: Optional category (tech, sports, politics, etc.)
        score: Current interest score (0-1)
        article_count: Number of articles read on this topic
        total_time_seconds: Total reading time on this topic
        positive_feedback: Count of "more like this" feedback
        negative_feedback: Count of "less like this" feedback
        decay_rate: How fast interest decays (default 0.1 = 10% per week)
        last_seen: When topic was last encountered
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        interest = InterestProfile(
            topic="artificial intelligence",
            category="tech",
            score=0.75,
            article_count=15
        )
    """
    __tablename__ = 'interest_profiles'

    # Topic identification
    topic = Column(
        String(255),
        nullable=False,
        unique=True,
        comment="Topic or keyword being tracked"
    )

    category = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Topic category (tech, sports, etc.)"
    )

    # Interest metrics
    score = Column(
        Float,
        nullable=False,
        default=0.5,
        comment="Current interest score (0-1)"
    )

    article_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of articles read on this topic"
    )

    total_time_seconds = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Total reading time on this topic"
    )

    # User feedback counts
    positive_feedback = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Count of 'more like this' feedback"
    )

    negative_feedback = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Count of 'less like this' feedback"
    )

    # Decay configuration
    decay_rate = Column(
        Float,
        nullable=False,
        default=0.1,
        comment="Weekly decay rate (0-1, default 0.1 = 10% per week)"
    )

    # Last activity
    last_seen = Column(
        String,
        nullable=True,
        comment="ISO timestamp of last encounter"
    )

    # Table indexes
    __table_args__ = (
        Index('idx_interest_profile_topic', 'topic'),
        Index('idx_interest_profile_score', 'score'),
        Index('idx_interest_profile_category', 'category'),
    )

    def __repr__(self):
        """String representation"""
        return f"<InterestProfile(topic='{self.topic}', score={self.score:.2f}, articles={self.article_count})>"

    def to_dict(self):
        """Convert to dictionary"""
        result = super().to_dict()
        # Add computed fields
        result['decayed_score'] = self.get_decayed_score()
        return result

    def get_decayed_score(self) -> float:
        """
        Calculate score with time decay applied.

        Score decays exponentially based on time since last seen.
        Half-life is approximately 7 weeks with default decay_rate.
        """
        if not self.last_seen:
            return self.score

        try:
            last_seen_dt = datetime.fromisoformat(self.last_seen.replace('Z', '+00:00'))
            now = datetime.utcnow()

            # Calculate weeks since last seen
            days_elapsed = (now - last_seen_dt.replace(tzinfo=None)).days
            weeks_elapsed = days_elapsed / 7.0

            # Apply exponential decay
            decay_factor = (1 - self.decay_rate) ** weeks_elapsed

            return round(self.score * decay_factor, 4)
        except (ValueError, TypeError):
            return self.score

    def update_from_reading(
        self,
        engagement_score: float,
        time_spent: int,
        feedback: str = None
    ):
        """
        Update interest based on reading behavior.

        Args:
            engagement_score: Score from 0-1 based on reading behavior
            time_spent: Time spent reading in seconds
            feedback: Optional explicit feedback (more/less)
        """
        # Update counts
        self.article_count += 1
        self.total_time_seconds += time_spent
        self.last_seen = datetime.utcnow().isoformat()

        # Calculate score adjustment
        # Start with engagement contribution
        adjustment = (engagement_score - 0.5) * 0.1  # -0.05 to +0.05

        # Apply feedback multiplier
        if feedback == 'more':
            self.positive_feedback += 1
            adjustment += 0.1
        elif feedback == 'less':
            self.negative_feedback += 1
            adjustment -= 0.15  # Negative feedback has more weight

        # Update score with bounds
        self.score = max(0.0, min(1.0, self.score + adjustment))

    @classmethod
    def get_or_create(cls, db, topic: str, category: str = None):
        """
        Get existing profile or create new one for a topic.

        Args:
            db: Database session
            topic: Topic string (will be lowercased)
            category: Optional category

        Returns:
            InterestProfile instance
        """
        topic_lower = topic.lower().strip()

        profile = db.query(cls).filter(cls.topic == topic_lower).first()
        if not profile:
            profile = cls(
                topic=topic_lower,
                category=category,
                score=0.5,  # Neutral starting score
                article_count=0,
                total_time_seconds=0
            )
            db.add(profile)

        return profile
