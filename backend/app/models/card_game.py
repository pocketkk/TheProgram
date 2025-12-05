"""
Card Game models for playing card games with tarot decks

CardGame model for tracking game state, scores, and history.
Part of Phase 6: Cards Module
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedDict


class CardGame(BaseModel):
    """
    Card game model for solitaire, cribbage, and other card games

    Tracks game state, moves, scores, and history using tarot decks.

    Fields:
        id: UUID primary key (inherited)
        collection_id: Optional link to tarot deck (ImageCollection)
        game_type: Type of game (solitaire, cribbage)
        player_count: Number of players (1 or 2)
        status: Game status (in_progress, won, lost, draw)
        player_score: Player's current score
        opponent_score: Opponent's score (for 2-player games)
        current_turn: Whose turn (player, opponent)
        game_state: JSON game state (board, hands, deck, etc.)
        move_history: JSON list of moves made
        ai_personality: Optional AI opponent personality
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        collection: Optional linked tarot deck

    Example:
        game = CardGame(
            game_type="solitaire",
            player_count=1,
            status="in_progress",
            game_state={...}
        )
    """
    __tablename__ = 'card_games'

    # Foreign keys (optional)
    collection_id = Column(
        String,
        ForeignKey('image_collections.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
        comment="Optional link to tarot deck for card images"
    )

    # Game metadata
    game_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Game type: solitaire, cribbage"
    )

    player_count = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Number of players (1 or 2)"
    )

    status = Column(
        String(50),
        nullable=False,
        default='in_progress',
        comment="Game status: in_progress, won, lost, draw"
    )

    # Scoring
    player_score = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Player's current score"
    )

    opponent_score = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Opponent's score (for 2-player games)"
    )

    # Turn tracking
    current_turn = Column(
        String(20),
        nullable=False,
        default='player',
        comment="Whose turn: player, opponent"
    )

    # Game state stored as JSON
    game_state = Column(
        JSONEncodedDict,
        nullable=False,
        comment="JSON game state (board, hands, deck, etc.)"
    )

    # Move history
    move_history = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON list of moves made"
    )

    # AI opponent settings
    ai_personality = Column(
        String(50),
        nullable=True,
        comment="AI opponent personality: easy, medium, hard, guide"
    )

    # Relationships
    collection = relationship(
        'ImageCollection',
        foreign_keys=[collection_id],
        lazy='select'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_card_game_collection', 'collection_id'),
        Index('idx_card_game_type', 'game_type'),
        Index('idx_card_game_status', 'status'),
        Index('idx_card_game_created', 'created_at'),
    )

    def __repr__(self):
        """String representation"""
        return f"<CardGame(id={self.id[:8]}..., type='{self.game_type}', status='{self.status}')>"

    @property
    def is_finished(self) -> bool:
        """Check if game has ended"""
        return self.status in ('won', 'lost', 'draw')

    @property
    def move_count(self) -> int:
        """Get number of moves made"""
        if isinstance(self.move_history, list):
            return len(self.move_history)
        return 0

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['is_finished'] = self.is_finished
        result['move_count'] = self.move_count
        return result
