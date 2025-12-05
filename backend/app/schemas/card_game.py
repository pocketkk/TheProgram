"""
Pydantic schemas for Card Games

Schemas for card game creation, updates, and responses.
Part of Phase 6: Cards Module
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class GameType(str, Enum):
    """Supported game types"""
    SOLITAIRE = "solitaire"
    CRIBBAGE = "cribbage"


class GameStatus(str, Enum):
    """Game status options"""
    IN_PROGRESS = "in_progress"
    WON = "won"
    LOST = "lost"
    DRAW = "draw"


class AIDifficulty(str, Enum):
    """AI opponent difficulty"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    GUIDE = "guide"  # Uses the guide agent for personality


class Turn(str, Enum):
    """Turn indicator"""
    PLAYER = "player"
    OPPONENT = "opponent"


# ============= Card Schemas =============

class PlayingCard(BaseModel):
    """A playing card mapped from tarot"""
    id: str = Field(..., description="Card ID (e.g., 'wands_1', 'cups_king')")
    tarot_name: str = Field(..., description="Original tarot card name")
    suit: str = Field(..., description="Playing card suit (hearts, diamonds, clubs, spades)")
    rank: str = Field(..., description="Playing card rank (A, 2-10, J, Q, K)")
    value: int = Field(..., description="Numeric value for scoring")
    face_up: bool = Field(default=True, description="Is the card face up")
    image_url: Optional[str] = Field(None, description="URL to card image if available")


class CardPosition(BaseModel):
    """Position of a card in the game"""
    card: PlayingCard
    pile: str = Field(..., description="Which pile (tableau_0, foundation_0, stock, waste, hand, crib)")
    index: int = Field(..., description="Position within the pile")


# ============= Solitaire Schemas =============

class SolitaireState(BaseModel):
    """State of a solitaire game (Klondike)"""
    tableau: List[List[PlayingCard]] = Field(..., description="7 tableau piles")
    foundations: List[List[PlayingCard]] = Field(..., description="4 foundation piles (one per suit)")
    stock: List[PlayingCard] = Field(..., description="Draw pile")
    waste: List[PlayingCard] = Field(..., description="Discard pile from stock")
    draw_count: int = Field(default=1, description="Cards to draw (1 or 3)")


class SolitaireMove(BaseModel):
    """A move in solitaire"""
    move_type: str = Field(..., description="Type: draw, waste_to_tableau, waste_to_foundation, tableau_move, tableau_to_foundation")
    from_pile: Optional[str] = Field(None, description="Source pile")
    to_pile: Optional[str] = Field(None, description="Destination pile")
    card_count: int = Field(default=1, description="Number of cards to move")


# ============= Cribbage Schemas =============

class CribbageState(BaseModel):
    """State of a cribbage game"""
    player_hand: List[PlayingCard] = Field(..., description="Player's current hand")
    opponent_hand: List[PlayingCard] = Field(..., description="Opponent's hand (hidden until scoring)")
    crib: List[PlayingCard] = Field(..., description="The crib (4 discarded cards)")
    cut_card: Optional[PlayingCard] = Field(None, description="The cut/starter card")
    pegging_pile: List[PlayingCard] = Field(default=[], description="Cards played during pegging")
    pegging_count: int = Field(default=0, description="Current pegging count (0-31)")
    dealer: str = Field(..., description="Who is dealer: player or opponent")
    phase: str = Field(default="discard", description="Game phase: discard, pegging, counting, done")
    is_go: bool = Field(default=False, description="If opponent said 'Go'")


class CribbageMove(BaseModel):
    """A move in cribbage"""
    move_type: str = Field(..., description="Type: discard, peg, say_go")
    cards: Optional[List[str]] = Field(None, description="Card IDs for the move")


class CribbageScore(BaseModel):
    """Scoring breakdown for cribbage"""
    fifteens: int = Field(default=0, description="Points from fifteens (2 each)")
    pairs: int = Field(default=0, description="Points from pairs (2, 6, 12)")
    runs: int = Field(default=0, description="Points from runs")
    flush: int = Field(default=0, description="Points from flush")
    nobs: int = Field(default=0, description="Point for jack of cut suit")
    total: int = Field(default=0, description="Total points")


# ============= Game Request/Response Schemas =============

class CardGameCreate(BaseModel):
    """Request to create a new game"""
    game_type: GameType
    collection_id: Optional[str] = Field(None, description="Tarot deck to use for card images")
    ai_difficulty: Optional[AIDifficulty] = Field(AIDifficulty.MEDIUM, description="AI difficulty for 2-player games")
    draw_count: Optional[int] = Field(1, description="Cards to draw in solitaire (1 or 3)")


class CardGameResponse(BaseModel):
    """Response with game data"""
    id: str
    game_type: str
    player_count: int
    status: str
    player_score: int
    opponent_score: int
    current_turn: str
    game_state: Dict[str, Any]
    move_count: int
    is_finished: bool
    collection_id: Optional[str]
    ai_personality: Optional[str]
    created_at: str
    updated_at: str


class CardGameListResponse(BaseModel):
    """List of games"""
    games: List[CardGameResponse]
    total: int


class MakeMoveRequest(BaseModel):
    """Request to make a move"""
    move: Dict[str, Any] = Field(..., description="Move data (type-specific)")


class MakeMoveResponse(BaseModel):
    """Response after making a move"""
    success: bool
    message: str
    game: CardGameResponse
    points_earned: int = Field(default=0, description="Points earned from this move")
    opponent_move: Optional[Dict[str, Any]] = Field(None, description="Opponent's response move (for 2-player)")
    opponent_points: int = Field(default=0, description="Points opponent earned")


class GameHintResponse(BaseModel):
    """Hint for the current game state"""
    hint_type: str = Field(..., description="Type of hint")
    message: str = Field(..., description="Human-readable hint")
    suggested_move: Optional[Dict[str, Any]] = Field(None, description="Suggested move")


class ValidMovesResponse(BaseModel):
    """List of valid moves for current state"""
    moves: List[Dict[str, Any]]


class DeckMappingResponse(BaseModel):
    """How tarot cards map to playing cards"""
    mappings: List[Dict[str, Any]]
    description: str


# ============= Statistics =============

class GameStats(BaseModel):
    """Player statistics for a game type"""
    game_type: str
    games_played: int
    games_won: int
    games_lost: int
    win_rate: float
    best_score: int
    average_score: float
    total_moves: int
