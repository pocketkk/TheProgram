"""
SportsFavorite model for storing favorite teams/leagues

Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from sqlalchemy import Column, String, Index, Text

from app.models.base import BaseModel


class SportsFavorite(BaseModel):
    """
    Sports favorites model

    Stores user's favorite teams and leagues for personalized sports content.

    Fields:
        id: UUID primary key (inherited)
        entity_type: Type of favorite (team, league, sport)
        entity_id: External ID of the team/league (from sports API)
        name: Display name
        sport: Sport type (football, basketball, baseball, hockey, soccer)
        league: League name (NFL, NBA, MLB, NHL, etc.)
        logo_url: URL to team/league logo
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        favorite = SportsFavorite(
            entity_type="team",
            entity_id="nfl-sf-49ers",
            name="San Francisco 49ers",
            sport="football",
            league="NFL"
        )
    """
    __tablename__ = 'sports_favorites'

    # Entity identification
    entity_type = Column(
        String(20),
        nullable=False,
        comment="Type: team, league, or sport"
    )

    entity_id = Column(
        String(100),
        nullable=False,
        comment="External ID from sports API"
    )

    # Display info
    name = Column(
        String(255),
        nullable=False,
        comment="Display name"
    )

    sport = Column(
        String(50),
        nullable=False,
        comment="Sport type (football, basketball, etc.)"
    )

    league = Column(
        String(50),
        nullable=True,
        comment="League name (NFL, NBA, etc.)"
    )

    logo_url = Column(
        Text,
        nullable=True,
        comment="URL to team/league logo"
    )

    # Table indexes
    __table_args__ = (
        Index('idx_sports_favorite_entity', 'entity_type', 'entity_id'),
        Index('idx_sports_favorite_sport', 'sport'),
    )

    def __repr__(self):
        """String representation"""
        return f"<SportsFavorite(id={self.id[:8]}..., name='{self.name}', sport='{self.sport}')>"

    def to_dict(self):
        """Convert to dictionary"""
        result = super().to_dict()
        return result
