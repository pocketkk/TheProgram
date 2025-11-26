"""
Numerology API Routes

Provides endpoints for numerological calculations and interpretations.
Part of Phase 3: Multi-Paradigm Integration
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.numerology_service import get_numerology_service

router = APIRouter()


# Request/Response schemas
class ProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Full birth name")
    birth_date: date = Field(..., description="Birth date")


class NameRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Name or word to analyze")


class CompatibilityRequest(BaseModel):
    number1: int = Field(..., ge=1, le=33, description="First Life Path number")
    number2: int = Field(..., ge=1, le=33, description="Second Life Path number")


class PersonalCycleRequest(BaseModel):
    birth_date: date = Field(..., description="Birth date")
    target_date: Optional[date] = Field(default=None, description="Date to calculate for (defaults to today)")


@router.get("/meanings")
async def get_all_meanings():
    """
    Get meanings for all numerology numbers (1-9 and master numbers).
    """
    service = get_numerology_service()
    meanings = service.get_all_meanings()

    return {
        "count": len(meanings),
        "meanings": meanings
    }


@router.get("/meanings/{number}")
async def get_number_meaning(number: int):
    """
    Get the meaning for a specific number.
    """
    if not (1 <= number <= 9 or number in {11, 22, 33}):
        raise HTTPException(
            status_code=400,
            detail="Number must be 1-9 or a master number (11, 22, 33)"
        )

    service = get_numerology_service()
    meaning = service.get_number_meaning(number)

    if not meaning:
        raise HTTPException(status_code=404, detail="Number meaning not found")

    return {
        "number": number,
        **meaning
    }


@router.post("/profile")
async def calculate_full_profile(request: ProfileRequest):
    """
    Calculate a complete numerology profile from name and birth date.

    Returns all core numbers (Life Path, Expression, Soul Urge,
    Personality, Birthday) and current cycles (Personal Year/Month/Day).
    """
    service = get_numerology_service()

    profile = service.calculate_full_profile(
        full_name=request.full_name,
        birth_date=request.birth_date
    )

    return profile


@router.post("/life-path")
async def calculate_life_path(request: ProfileRequest):
    """
    Calculate Life Path Number from birth date.

    The most important number in numerology, revealing your life purpose.
    """
    service = get_numerology_service()

    return service.calculate_life_path(request.birth_date)


@router.post("/expression")
async def calculate_expression(request: ProfileRequest):
    """
    Calculate Expression (Destiny) Number from full name.

    Reveals your natural talents, abilities, and goals.
    """
    service = get_numerology_service()

    return service.calculate_expression(request.full_name)


@router.post("/soul-urge")
async def calculate_soul_urge(request: ProfileRequest):
    """
    Calculate Soul Urge (Heart's Desire) Number from vowels in name.

    Reveals your inner motivations and what drives you.
    """
    service = get_numerology_service()

    return service.calculate_soul_urge(request.full_name)


@router.post("/personality")
async def calculate_personality(request: ProfileRequest):
    """
    Calculate Personality Number from consonants in name.

    Reveals how others perceive you.
    """
    service = get_numerology_service()

    return service.calculate_personality(request.full_name)


@router.post("/birthday")
async def calculate_birthday(request: ProfileRequest):
    """
    Calculate Birthday Number.

    A secondary number indicating special talents.
    """
    service = get_numerology_service()

    return service.calculate_birthday_number(request.birth_date)


@router.post("/name")
async def analyze_name(request: NameRequest):
    """
    Calculate the numerological value of any name or word.

    Useful for business names, baby names, etc.
    """
    service = get_numerology_service()

    return service.calculate_name_number(request.name)


@router.post("/personal-year")
async def calculate_personal_year(request: PersonalCycleRequest):
    """
    Calculate Personal Year Number.

    Shows the theme and energy of a specific year in your life.
    """
    service = get_numerology_service()

    return service.calculate_personal_year(
        birth_date=request.birth_date,
        current_date=request.target_date
    )


@router.post("/personal-month")
async def calculate_personal_month(request: PersonalCycleRequest):
    """
    Calculate Personal Month Number.
    """
    service = get_numerology_service()

    return service.calculate_personal_month(
        birth_date=request.birth_date,
        current_date=request.target_date
    )


@router.post("/personal-day")
async def calculate_personal_day(request: PersonalCycleRequest):
    """
    Calculate Personal Day Number.
    """
    service = get_numerology_service()

    return service.calculate_personal_day(
        birth_date=request.birth_date,
        current_date=request.target_date
    )


@router.post("/compatibility")
async def calculate_compatibility(request: CompatibilityRequest):
    """
    Calculate compatibility between two Life Path numbers.

    Useful for understanding relationship dynamics.
    """
    service = get_numerology_service()

    return service.get_compatibility(request.number1, request.number2)


@router.get("/daily")
async def get_daily_number():
    """
    Get today's Universal Day Number.

    A number that influences the collective energy of the day.
    """
    from datetime import date

    today = date.today()
    service = get_numerology_service()

    # Calculate Universal Day
    day_sum = sum(int(d) for d in today.strftime("%Y%m%d"))
    universal_day = service.reduce_to_single_digit(day_sum)

    meaning = service.get_number_meaning(universal_day)

    return {
        "date": today.isoformat(),
        "universal_day": universal_day,
        "guidance": _generate_daily_guidance(universal_day, meaning),
        **meaning
    }


def _generate_daily_guidance(number: int, meaning: dict) -> str:
    """Generate daily guidance based on the universal day number."""
    if not meaning:
        return "Embrace the energy of today with mindfulness."

    keywords = meaning.get("keywords", [])
    name = meaning.get("name", "")

    return (
        f"Today carries the energy of {number} - {name}. "
        f"Focus on {', '.join(keywords[:2]) if keywords else 'balance and awareness'} "
        f"to align with the day's vibration."
    )
