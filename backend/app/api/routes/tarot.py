"""
Tarot API Routes

Provides endpoints for Tarot readings, card data, and spreads.
Part of Phase 3: Multi-Paradigm Integration
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.tarot_service import get_tarot_service

router = APIRouter()


# Request/Response schemas
class ReadingRequest(BaseModel):
    spread_type: str = Field(default="three_card", description="Type of spread to use")
    question: Optional[str] = Field(default=None, description="Question for the reading")
    allow_reversed: bool = Field(default=True, description="Allow reversed cards")


class CardPosition(BaseModel):
    position: int
    position_name: str
    position_meaning: str
    card: dict
    interpretation: str


class ReadingResponse(BaseModel):
    spread_type: str
    spread_name: str
    question: Optional[str]
    timestamp: str
    positions: List[CardPosition]
    summary: str


@router.get("/deck")
async def get_deck():
    """
    Get the complete 78-card Tarot deck.

    Returns all cards with their meanings, keywords, and associations.
    """
    service = get_tarot_service()
    return {
        "total_cards": len(service.get_deck()),
        "major_arcana": 22,
        "minor_arcana": 56,
        "deck": service.get_deck()
    }


@router.get("/deck/major")
async def get_major_arcana():
    """
    Get only the Major Arcana cards (0-21).
    """
    service = get_tarot_service()
    major = [c for c in service.get_deck() if c["suit"] == "major"]
    return {
        "count": len(major),
        "cards": major
    }


@router.get("/deck/minor/{suit}")
async def get_minor_arcana_suit(suit: str):
    """
    Get Minor Arcana cards for a specific suit.

    Suits: wands, cups, swords, pentacles
    """
    valid_suits = ["wands", "cups", "swords", "pentacles"]
    if suit.lower() not in valid_suits:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid suit. Must be one of: {', '.join(valid_suits)}"
        )

    service = get_tarot_service()
    cards = [c for c in service.get_deck() if c["suit"] == suit.lower()]
    return {
        "suit": suit.lower(),
        "count": len(cards),
        "cards": cards
    }


@router.get("/card/{card_id}")
async def get_card(card_id: str):
    """
    Get a specific card by ID.

    Card IDs are formatted as:
    - major_{number} (e.g., major_0 for The Fool)
    - {suit}_{number} (e.g., wands_1 for Ace of Wands)
    - {suit}_{court} (e.g., cups_queen for Queen of Cups)
    """
    service = get_tarot_service()
    card = service.get_card_by_id(card_id)

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    return card


@router.get("/spreads")
async def get_spreads():
    """
    Get all available Tarot spreads.

    Returns spread configurations with position meanings.
    """
    service = get_tarot_service()
    spreads = service.get_spreads()

    return {
        "count": len(spreads),
        "spreads": spreads
    }


@router.get("/spreads/{spread_type}")
async def get_spread(spread_type: str):
    """
    Get a specific spread configuration.

    Available spreads: single, three_card, celtic_cross, relationship, decision
    """
    service = get_tarot_service()
    spread = service.get_spread(spread_type)

    if not spread:
        raise HTTPException(
            status_code=404,
            detail=f"Spread '{spread_type}' not found"
        )

    return spread


@router.get("/draw")
async def draw_cards(
    count: int = Query(default=1, ge=1, le=10, description="Number of cards to draw"),
    allow_reversed: bool = Query(default=True, description="Allow reversed cards")
):
    """
    Draw random cards from the deck.

    Useful for single card draws or custom spreads.
    """
    service = get_tarot_service()
    cards = service.draw_cards(count, allow_reversed)

    return {
        "count": len(cards),
        "cards": cards
    }


@router.post("/reading", response_model=ReadingResponse)
async def perform_reading(request: ReadingRequest):
    """
    Perform a complete Tarot reading.

    Draws cards according to the selected spread and provides
    interpretations for each position.
    """
    service = get_tarot_service()

    try:
        reading = service.perform_reading(
            spread_type=request.spread_type,
            question=request.question,
            allow_reversed=request.allow_reversed
        )
        return reading
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/daily")
async def get_daily_card(allow_reversed: bool = Query(default=True)):
    """
    Draw a daily guidance card.

    A single card reading for daily reflection.
    """
    service = get_tarot_service()

    reading = service.perform_reading(
        spread_type="single",
        question="What energy should I focus on today?",
        allow_reversed=allow_reversed
    )

    card = reading["positions"][0]["card"]

    return {
        "date": reading["timestamp"][:10],
        "card": card,
        "interpretation": reading["positions"][0]["interpretation"],
        "daily_guidance": _generate_daily_guidance(card)
    }


def _generate_daily_guidance(card: dict) -> str:
    """Generate specific daily guidance based on the card drawn"""
    name = card["name"]
    reversed = card.get("reversed", False)
    keywords = card.get("keywords", [])

    if reversed:
        return (
            f"Today, {name} reversed invites you to look inward. "
            f"Consider where {', '.join(keywords[:2])} might be blocked or need attention. "
            f"Take time for self-reflection and gentle self-care."
        )
    else:
        return (
            f"Today, {name} brings energy of {', '.join(keywords[:2])}. "
            f"Embrace opportunities that align with this card's message. "
            f"Trust the guidance that comes through your intuition."
        )


@router.get("/card-of-the-day")
async def get_card_of_day_seeded():
    """
    Get the card of the day (seeded by date).

    Returns the same card for everyone on a given day.
    Uses the date as a seed for consistency.
    """
    from datetime import date
    import random

    today = date.today()
    seed = today.year * 10000 + today.month * 100 + today.day

    service = get_tarot_service()
    deck = service.get_deck()

    random.seed(seed)
    card = random.choice(deck).copy()
    card["reversed"] = random.choice([True, False])
    random.seed()  # Reset seed

    return {
        "date": today.isoformat(),
        "card": card,
        "interpretation": card["reversed_meaning"] if card["reversed"] else card["upright_meaning"],
        "guidance": _generate_daily_guidance(card)
    }
