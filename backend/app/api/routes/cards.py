"""
Card Games API Routes

Endpoints for playing card games (solitaire, cribbage) with tarot decks.
Part of Phase 6: Cards Module
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.card_game import CardGame
from app.schemas.card_game import (
    CardGameCreate,
    CardGameResponse,
    CardGameListResponse,
    MakeMoveRequest,
    MakeMoveResponse,
    GameHintResponse,
    ValidMovesResponse,
    DeckMappingResponse,
    GameStats,
)
from app.services.card_game_service import CardGameService

router = APIRouter(prefix="/cards", tags=["Cards"])

# Service instance
game_service = CardGameService()


def game_to_response(game: CardGame) -> CardGameResponse:
    """Convert CardGame model to response schema"""
    return CardGameResponse(
        id=game.id,
        game_type=game.game_type,
        player_count=game.player_count,
        status=game.status,
        player_score=game.player_score,
        opponent_score=game.opponent_score,
        current_turn=game.current_turn,
        game_state=game.game_state,
        move_count=game.move_count,
        is_finished=game.is_finished,
        collection_id=game.collection_id,
        ai_personality=game.ai_personality,
        created_at=game.created_at,
        updated_at=game.updated_at
    )


# ============= Deck Mapping =============

@router.get("/deck-mapping", response_model=DeckMappingResponse)
def get_deck_mapping():
    """
    Get the mapping from tarot cards to playing cards.

    Shows how the 56 Minor Arcana cards map to a standard 52-card deck.
    """
    mapping = game_service.get_deck_mapping()
    return DeckMappingResponse(**mapping)


# ============= Game CRUD =============

@router.get("/games", response_model=CardGameListResponse)
def list_games(
    game_type: Optional[str] = Query(None, description="Filter by game type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all card games"""
    query = db.query(CardGame)

    if game_type:
        query = query.filter(CardGame.game_type == game_type)
    if status:
        query = query.filter(CardGame.status == status)

    total = query.count()
    games = query.order_by(CardGame.updated_at.desc()).offset(offset).limit(limit).all()

    return CardGameListResponse(
        games=[game_to_response(g) for g in games],
        total=total
    )


@router.post("/games", response_model=CardGameResponse)
def create_game(
    request: CardGameCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new card game.

    - **solitaire**: Single-player Klondike solitaire
    - **cribbage**: Two-player cribbage with AI opponent
    """
    game_type = request.game_type.value

    if game_type == "solitaire":
        game_state = game_service.create_solitaire_game(
            draw_count=request.draw_count or 1
        )
        player_count = 1
    elif game_type == "cribbage":
        game_state = game_service.create_cribbage_game(dealer="opponent")
        player_count = 2
    else:
        raise HTTPException(status_code=400, detail=f"Unknown game type: {game_type}")

    game = CardGame(
        collection_id=request.collection_id,
        game_type=game_type,
        player_count=player_count,
        status="in_progress",
        game_state=game_state,
        move_history=[],
        ai_personality=request.ai_difficulty.value if request.ai_difficulty else "medium"
    )

    db.add(game)
    db.commit()
    db.refresh(game)

    return game_to_response(game)


@router.get("/games/{game_id}", response_model=CardGameResponse)
def get_game(
    game_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific game by ID"""
    game = db.query(CardGame).filter(CardGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    return game_to_response(game)


@router.delete("/games/{game_id}")
def delete_game(
    game_id: str,
    db: Session = Depends(get_db)
):
    """Delete a game"""
    game = db.query(CardGame).filter(CardGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    db.delete(game)
    db.commit()

    return {"message": "Game deleted"}


# ============= Game Actions =============

@router.get("/games/{game_id}/valid-moves", response_model=ValidMovesResponse)
def get_valid_moves(
    game_id: str,
    db: Session = Depends(get_db)
):
    """Get all valid moves for the current game state"""
    game = db.query(CardGame).filter(CardGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.is_finished:
        return ValidMovesResponse(moves=[])

    if game.game_type == "solitaire":
        moves = game_service.get_solitaire_valid_moves(game.game_state)
    else:
        # For cribbage, moves depend on phase
        moves = []  # TODO: Implement cribbage valid moves

    return ValidMovesResponse(moves=moves)


@router.post("/games/{game_id}/move", response_model=MakeMoveResponse)
def make_move(
    game_id: str,
    request: MakeMoveRequest,
    db: Session = Depends(get_db)
):
    """
    Make a move in the game.

    For solitaire:
    - `{"move_type": "draw"}` - Draw from stock
    - `{"move_type": "reset_stock"}` - Reset stock from waste
    - `{"move_type": "waste_to_tableau", "to_pile": "tableau_0"}` - Move waste card to tableau
    - `{"move_type": "waste_to_foundation", "to_pile": "foundation_0"}` - Move waste to foundation
    - `{"move_type": "tableau_move", "from_pile": "tableau_0", "to_pile": "tableau_1"}` - Move tableau cards
    - `{"move_type": "tableau_to_foundation", "from_pile": "tableau_0", "to_pile": "foundation_0"}` - Move to foundation

    For cribbage:
    - `{"move_type": "discard", "cards": ["wands_1", "cups_5"]}` - Discard to crib
    - `{"move_type": "peg", "card_id": "wands_1"}` - Play a card during pegging
    - `{"move_type": "say_go"}` - Say "Go" when unable to play
    """
    game = db.query(CardGame).filter(CardGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.is_finished:
        raise HTTPException(status_code=400, detail="Game is already finished")

    move = request.move
    points_earned = 0
    opponent_move = None
    opponent_points = 0

    if game.game_type == "solitaire":
        new_state, success, message = game_service.make_solitaire_move(
            game.game_state, move
        )

        if not success:
            raise HTTPException(status_code=400, detail=message)

        game.game_state = new_state

        # Check for win
        if game_service.check_solitaire_win(new_state):
            game.status = "won"
            message = "Congratulations! You won!"

    elif game.game_type == "cribbage":
        move_type = move.get("move_type")
        state = game.game_state

        if move_type == "discard":
            new_state, success, message = game_service.cribbage_discard(
                state, move.get("cards", []), is_player=True
            )

            if not success:
                raise HTTPException(status_code=400, detail=message)

            game.game_state = new_state

            # AI discards if both players discarded
            if new_state["phase"] == "discard" and len(new_state["player_hand"]) == 4:
                # AI needs to discard
                ai_discards = game_service.get_ai_cribbage_discard(
                    new_state["opponent_hand"],
                    is_dealer=(new_state["dealer"] == "opponent"),
                    difficulty=game.ai_personality or "medium"
                )
                new_state, _, _ = game_service.cribbage_discard(
                    new_state, ai_discards, is_player=False
                )
                game.game_state = new_state
                opponent_move = {"move_type": "discard", "cards": ai_discards}

            # Auto-cut if in cut phase
            if new_state["phase"] == "cut":
                new_state, _, cut_msg = game_service.cribbage_cut(new_state)
                game.game_state = new_state
                if "heels" in cut_msg:
                    if new_state["dealer"] == "player":
                        game.player_score += 2
                        points_earned = 2
                    else:
                        game.opponent_score += 2
                        opponent_points = 2

        elif move_type == "peg":
            card_id = move.get("card_id")
            if not card_id:
                raise HTTPException(status_code=400, detail="card_id required")

            new_state, success, message, points = game_service.cribbage_peg(
                state, card_id, is_player=True
            )

            if not success:
                raise HTTPException(status_code=400, detail=message)

            game.game_state = new_state
            game.player_score += points
            points_earned = points

            # Check for win
            winner = game_service.check_cribbage_win(game.player_score, game.opponent_score)
            if winner:
                game.status = "won" if winner == "player" else "lost"
            else:
                # AI's turn to peg
                if new_state["phase"] == "pegging" and new_state.get("current_turn") == "opponent":
                    ai_card = game_service.get_ai_cribbage_peg(
                        new_state["opponent_hand"],
                        new_state["pegging_count"],
                        new_state["pegging_pile"],
                        difficulty=game.ai_personality or "medium"
                    )

                    if ai_card:
                        new_state, _, ai_msg, ai_pts = game_service.cribbage_peg(
                            new_state, ai_card, is_player=False
                        )
                        game.game_state = new_state
                        game.opponent_score += ai_pts
                        opponent_points = ai_pts
                        opponent_move = {"move_type": "peg", "card_id": ai_card, "message": ai_msg}
                    else:
                        # AI says go
                        new_state, _, _, go_pts = game_service.cribbage_say_go(new_state, is_player=False)
                        game.game_state = new_state
                        game.opponent_score += go_pts
                        opponent_points = go_pts
                        opponent_move = {"move_type": "say_go"}

        elif move_type == "say_go":
            new_state, success, message, points = game_service.cribbage_say_go(
                state, is_player=True
            )

            if not success:
                raise HTTPException(status_code=400, detail=message)

            game.game_state = new_state
            game.player_score += points
            points_earned = points

        else:
            raise HTTPException(status_code=400, detail=f"Unknown move type: {move_type}")

        # Handle counting phase
        if game.game_state.get("phase") == "counting":
            cut_card = game.game_state["cut_card"]

            # Non-dealer counts first
            if game.game_state["dealer"] == "player":
                # Opponent counts first
                opp_score = game_service.calculate_cribbage_hand(
                    game.game_state["opponent_pegging_played"], cut_card
                )
                game.opponent_score += opp_score["total"]
                opponent_points += opp_score["total"]

                player_score = game_service.calculate_cribbage_hand(
                    game.game_state["player_pegging_played"], cut_card
                )
                game.player_score += player_score["total"]
                points_earned += player_score["total"]

                # Dealer's crib
                crib_score = game_service.calculate_cribbage_hand(
                    game.game_state["crib"], cut_card, is_crib=True
                )
                game.player_score += crib_score["total"]
                points_earned += crib_score["total"]
            else:
                # Player counts first
                player_score = game_service.calculate_cribbage_hand(
                    game.game_state["player_pegging_played"], cut_card
                )
                game.player_score += player_score["total"]
                points_earned += player_score["total"]

                opp_score = game_service.calculate_cribbage_hand(
                    game.game_state["opponent_pegging_played"], cut_card
                )
                game.opponent_score += opp_score["total"]
                opponent_points += opp_score["total"]

                # Dealer's crib
                crib_score = game_service.calculate_cribbage_hand(
                    game.game_state["crib"], cut_card, is_crib=True
                )
                game.opponent_score += crib_score["total"]
                opponent_points += crib_score["total"]

            # Check for win after counting
            winner = game_service.check_cribbage_win(game.player_score, game.opponent_score)
            if winner:
                game.status = "won" if winner == "player" else "lost"
            else:
                # Start new hand
                new_dealer = "player" if game.game_state["dealer"] == "opponent" else "opponent"
                game.game_state = game_service.create_cribbage_game(dealer=new_dealer)

    # Record move in history
    move_record = {
        "move": move,
        "points": points_earned,
        "opponent_move": opponent_move,
        "opponent_points": opponent_points
    }
    if game.move_history is None:
        game.move_history = []
    game.move_history.append(move_record)

    db.commit()
    db.refresh(game)

    return MakeMoveResponse(
        success=True,
        message=message if 'message' in dir() else "Move completed",
        game=game_to_response(game),
        points_earned=points_earned,
        opponent_move=opponent_move,
        opponent_points=opponent_points
    )


@router.get("/games/{game_id}/hint", response_model=GameHintResponse)
def get_hint(
    game_id: str,
    db: Session = Depends(get_db)
):
    """Get a hint for the current game state"""
    game = db.query(CardGame).filter(CardGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.is_finished:
        return GameHintResponse(
            hint_type="finished",
            message="The game is already finished",
            suggested_move=None
        )

    if game.game_type == "solitaire":
        hint = game_service.get_solitaire_hint(game.game_state)
    else:
        hint = {
            "hint_type": "general",
            "message": "Try to create fifteens and runs",
            "suggested_move": None
        }

    return GameHintResponse(**hint)


@router.post("/games/{game_id}/undo", response_model=CardGameResponse)
def undo_move(
    game_id: str,
    db: Session = Depends(get_db)
):
    """Undo the last move (solitaire only)"""
    game = db.query(CardGame).filter(CardGame.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.game_type != "solitaire":
        raise HTTPException(status_code=400, detail="Undo only available for solitaire")

    # TODO: Implement undo by storing previous states
    raise HTTPException(status_code=501, detail="Undo not yet implemented")


# ============= Statistics =============

@router.get("/stats/{game_type}", response_model=GameStats)
def get_game_stats(
    game_type: str,
    db: Session = Depends(get_db)
):
    """Get statistics for a game type"""
    games = db.query(CardGame).filter(CardGame.game_type == game_type).all()

    if not games:
        return GameStats(
            game_type=game_type,
            games_played=0,
            games_won=0,
            games_lost=0,
            win_rate=0.0,
            best_score=0,
            average_score=0.0,
            total_moves=0
        )

    games_played = len(games)
    games_won = sum(1 for g in games if g.status == "won")
    games_lost = sum(1 for g in games if g.status == "lost")
    win_rate = games_won / games_played if games_played > 0 else 0.0

    scores = [g.player_score for g in games]
    best_score = max(scores) if scores else 0
    average_score = sum(scores) / len(scores) if scores else 0.0

    total_moves = sum(g.move_count for g in games)

    return GameStats(
        game_type=game_type,
        games_played=games_played,
        games_won=games_won,
        games_lost=games_lost,
        win_rate=win_rate,
        best_score=best_score,
        average_score=average_score,
        total_moves=total_moves
    )
