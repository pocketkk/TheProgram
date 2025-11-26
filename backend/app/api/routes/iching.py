"""
I-Ching API Routes

Provides endpoints for I-Ching readings, hexagrams, and interpretations.
Part of Phase 3: Multi-Paradigm Integration
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.iching_service import get_iching_service

router = APIRouter()


# Request/Response schemas
class ReadingRequest(BaseModel):
    question: Optional[str] = Field(default=None, description="Question for the oracle")
    method: str = Field(default="coins", pattern="^(coins|yarrow)$", description="Casting method")


class LineInfo(BaseModel):
    position: int
    value: int
    type: str
    changing: bool


class HexagramInfo(BaseModel):
    number: int
    name: str
    english: str
    keywords: List[str]
    meaning: str


class ReadingResponse(BaseModel):
    timestamp: str
    question: Optional[str]
    method: str
    lines: List[LineInfo]
    primary_hexagram: dict
    changing_lines: List[int]
    relating_hexagram: Optional[dict]
    interpretation: str


@router.get("/hexagrams")
async def get_all_hexagrams():
    """
    Get all 64 hexagrams.

    Returns the complete collection of I-Ching hexagrams
    with their meanings and attributes.
    """
    service = get_iching_service()
    hexagrams = service.get_all_hexagrams()

    return {
        "count": len(hexagrams),
        "hexagrams": hexagrams
    }


@router.get("/hexagrams/{number}")
async def get_hexagram(number: int):
    """
    Get a specific hexagram by number (1-64).
    """
    if not 1 <= number <= 64:
        raise HTTPException(
            status_code=400,
            detail="Hexagram number must be between 1 and 64"
        )

    service = get_iching_service()
    hexagram = service.get_hexagram(number)

    if not hexagram:
        raise HTTPException(status_code=404, detail="Hexagram not found")

    return {
        "number": number,
        **hexagram
    }


@router.get("/trigrams")
async def get_trigrams():
    """
    Get all 8 trigrams.

    The trigrams are the building blocks of hexagrams,
    each representing fundamental natural forces.
    """
    service = get_iching_service()
    trigrams = service.get_trigrams()

    return {
        "count": len(trigrams),
        "trigrams": trigrams
    }


@router.post("/reading", response_model=ReadingResponse)
async def perform_reading(request: ReadingRequest):
    """
    Perform an I-Ching reading.

    Casts a hexagram using the specified method and
    provides interpretation including any changing lines.
    """
    service = get_iching_service()

    reading = service.perform_reading(
        question=request.question,
        method=request.method
    )

    return reading


@router.get("/cast")
async def quick_cast(
    method: str = Query(default="coins", pattern="^(coins|yarrow)$")
):
    """
    Quick hexagram cast without a specific question.

    Returns a simple reading for general guidance.
    """
    service = get_iching_service()

    reading = service.perform_reading(
        question=None,
        method=method
    )

    return reading


@router.get("/daily")
async def get_daily_hexagram():
    """
    Get the hexagram of the day.

    Uses the date as a seed for consistency -
    everyone gets the same hexagram on a given day.
    """
    from datetime import date
    import random

    today = date.today()
    seed = today.year * 10000 + today.month * 100 + today.day

    service = get_iching_service()

    # Generate consistent hexagram for the day
    random.seed(seed)
    lines = [random.choice([6, 7, 8, 9]) for _ in range(6)]
    random.seed()

    primary_number = service.lines_to_hexagram_number(lines)
    hexagram = service.get_hexagram(primary_number)

    return {
        "date": today.isoformat(),
        "hexagram_number": primary_number,
        "hexagram": hexagram,
        "daily_guidance": _generate_daily_guidance(hexagram)
    }


def _generate_daily_guidance(hexagram: dict) -> str:
    """Generate daily guidance based on the hexagram"""
    if not hexagram:
        return "Contemplate the changes around you."

    name = hexagram.get("english", "")
    keywords = hexagram.get("keywords", [])
    meaning = hexagram.get("meaning", "")

    return (
        f"Today's energy is {name}. "
        f"Focus on {', '.join(keywords[:2]) if keywords else 'balance and awareness'}. "
        f"{meaning}"
    )


@router.get("/search")
async def search_hexagrams(
    keyword: str = Query(..., min_length=2, description="Keyword to search")
):
    """
    Search hexagrams by keyword.

    Searches through names, meanings, and keywords.
    """
    service = get_iching_service()
    hexagrams = service.get_all_hexagrams()

    keyword_lower = keyword.lower()
    matches = []

    for number, hexagram in hexagrams.items():
        # Search in various fields
        searchable = " ".join([
            hexagram.get("name", ""),
            hexagram.get("english", ""),
            hexagram.get("meaning", ""),
            " ".join(hexagram.get("keywords", []))
        ]).lower()

        if keyword_lower in searchable:
            matches.append({
                "number": number,
                **hexagram
            })

    return {
        "keyword": keyword,
        "count": len(matches),
        "matches": matches
    }
