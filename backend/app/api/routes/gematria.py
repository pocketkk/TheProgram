"""
Gematria API Routes

Provides endpoints for gematria calculations across Hebrew and English systems.
"""
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.gematria_service import get_gematria_service
from app.models.birth_data import BirthData

router = APIRouter()


# Request/Response schemas
class CalculateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to calculate gematria for")
    system: Optional[Literal["hebrew", "english_ordinal", "english_reduction", "transliteration", "all"]] = Field(
        default="all",
        description="Which gematria system to use"
    )


class AnalyzeNameRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Name to analyze")


@router.post("/calculate")
async def calculate_gematria(request: CalculateRequest):
    """
    Calculate gematria value for text.

    Supports multiple systems:
    - hebrew: Traditional Hebrew letter values
    - english_ordinal: A=1, B=2...Z=26
    - english_reduction: Each letter reduced to 1-9
    - transliteration: English converted to Hebrew phonetics
    - all: Returns all applicable systems (default)
    """
    service = get_gematria_service()

    if request.system == "all":
        result = service.calculate_all(request.text)
    elif request.system == "hebrew":
        result = service.calculate_hebrew(request.text)
    elif request.system == "english_ordinal":
        result = service.calculate_english_ordinal(request.text)
    elif request.system == "english_reduction":
        result = service.calculate_english_reduction(request.text)
    elif request.system == "transliteration":
        result = service.transliterate(request.text)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown system: {request.system}")

    return result


@router.post("/analyze")
async def analyze_name(request: AnalyzeNameRequest):
    """
    Perform comprehensive gematria analysis on a name.

    Returns gematria values across all systems plus equivalences
    and spiritual meanings for each value.
    """
    service = get_gematria_service()
    return service.analyze_name(request.name)


@router.get("/equivalences/{value}")
async def get_equivalences(
    value: int,
    system: Literal["hebrew", "english"] = "hebrew",
    limit: int = 20
):
    """
    Find words with the same gematria value.

    Args:
        value: The gematria value to search for
        system: Which word database to search (hebrew or english)
        limit: Maximum number of results (default 20)
    """
    if value < 1:
        raise HTTPException(status_code=400, detail="Value must be positive")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")

    service = get_gematria_service()
    equivalences = service.find_equivalences(value, system, limit)

    return {
        "value": value,
        "system": system,
        "count": len(equivalences),
        "words": equivalences
    }


@router.get("/meanings/{value}")
async def get_number_meaning(value: int):
    """
    Get the spiritual/kabbalistic meaning for a specific number.

    Returns the gematria-specific significance of the number,
    which differs from general numerology meanings.
    """
    if value < 1:
        raise HTTPException(status_code=400, detail="Value must be positive")

    service = get_gematria_service()
    meaning = service.get_number_meaning(value)

    if not meaning:
        return {
            "value": value,
            "has_known_meaning": False,
            "message": f"No specific gematria meaning recorded for {value}"
        }

    return {
        "value": value,
        "has_known_meaning": True,
        **meaning
    }


@router.get("/meanings")
async def get_all_meanings():
    """
    Get all known gematria number meanings.

    Returns meanings for spiritually significant numbers
    in the Kabbalistic tradition.
    """
    service = get_gematria_service()
    meanings = service.get_all_meanings()

    return {
        "count": len(meanings),
        "meanings": meanings
    }


@router.get("/profile/{profile_id}/gematria")
async def get_profile_gematria(profile_id: str, db: Session = Depends(get_db)):
    """
    Calculate gematria analysis for a saved birth profile's name.

    Args:
        profile_id: UUID of the birth data profile
    """
    # Look up the profile
    profile = db.query(BirthData).filter(BirthData.id == profile_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not profile.name:
        raise HTTPException(status_code=400, detail="Profile has no name to analyze")

    service = get_gematria_service()
    analysis = service.analyze_name(profile.name)

    return {
        "profile_id": profile_id,
        "profile_name": profile.name,
        "analysis": analysis
    }


@router.get("/transliterate")
async def transliterate_text(text: str):
    """
    Transliterate English text to Hebrew letters and calculate gematria.

    Converts English phonetics to approximate Hebrew letters,
    then calculates the Hebrew gematria value.
    """
    if not text or len(text) < 1:
        raise HTTPException(status_code=400, detail="Text is required")

    service = get_gematria_service()
    return service.transliterate(text)


@router.get("/systems")
async def get_available_systems():
    """
    Get information about available gematria calculation systems.
    """
    return {
        "systems": [
            {
                "id": "hebrew",
                "name": "Hebrew (Standard)",
                "description": "Traditional Kabbalistic values where each Hebrew letter has a fixed numeric value",
                "example": "א=1, ב=2, ג=3...ת=400"
            },
            {
                "id": "english_ordinal",
                "name": "English Ordinal",
                "description": "Simple ordinal values for English letters",
                "example": "A=1, B=2, C=3...Z=26"
            },
            {
                "id": "english_reduction",
                "name": "English Reduction",
                "description": "English values reduced to single digits (1-9)",
                "example": "A=1, J=1, S=1 (all reduce to 1)"
            },
            {
                "id": "transliteration",
                "name": "English to Hebrew",
                "description": "Converts English text to approximate Hebrew phonetics, then calculates Hebrew gematria",
                "example": "David → דויד → 24"
            }
        ]
    }
