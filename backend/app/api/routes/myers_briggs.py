"""
Myers-Briggs API Routes

Provides endpoints for Myers-Briggs personality type calculations,
reference data, and AI-powered interpretations.
"""

from datetime import datetime, date, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models import BirthData
from app.services.myers_briggs_calculator import MyersBriggsCalculator
from app.schemas.myers_briggs import (
    MBCalculationRequest,
    MBTypeResponse,
    MBTypeInfo,
    MBTypesListResponse,
    MBDichotomyInfo,
    MBDichotomiesListResponse,
    MBTypeInterpretationResponse,
    MBFullReadingResponse,
    DichotomyScore,
    CognitiveFunction,
)

router = APIRouter()


def _parse_birth_datetime(birth_data) -> datetime:
    """Parse birth date/time from SQLite storage (strings) to datetime."""
    # Handle date - could be date object or string
    if isinstance(birth_data.birth_date, str):
        birth_date = date.fromisoformat(birth_data.birth_date)
    else:
        birth_date = birth_data.birth_date

    # Handle time - could be time object or string
    if birth_data.birth_time:
        if isinstance(birth_data.birth_time, str):
            birth_time = time.fromisoformat(birth_data.birth_time)
        else:
            birth_time = birth_data.birth_time
    else:
        # Default to noon if time unknown
        birth_time = time(12, 0, 0)

    return datetime.combine(birth_date, birth_time)


def _get_timezone_offset(birth_data) -> int:
    """Get timezone offset in minutes from birth data."""
    # Check for explicit offset first
    if hasattr(birth_data, 'utc_offset') and birth_data.utc_offset is not None:
        return birth_data.utc_offset

    # Try to derive from timezone string (basic implementation)
    if hasattr(birth_data, 'timezone') and birth_data.timezone:
        # Common US timezone offsets
        tz_offsets = {
            'America/Los_Angeles': -480,  # -8 hours (PST)
            'America/Denver': -420,  # -7 hours (MST)
            'America/Chicago': -360,  # -6 hours (CST)
            'America/New_York': -300,  # -5 hours (EST)
        }
        return tz_offsets.get(birth_data.timezone, 0)

    return 0


# ==============================================================================
# TYPE CALCULATION ENDPOINTS
# ==============================================================================

@router.post("/calculate", response_model=MBTypeResponse)
async def calculate_myers_briggs_type(
    request: MBCalculationRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate Myers-Briggs personality type from birth data.

    Uses astrological correspondences to derive personality type:
    - E/I: Fire/Air (E) vs Earth/Water (I) emphasis
    - S/N: Earth/Fixed (S) vs Water/Mutable (N) emphasis
    - T/F: Saturn/Mars (T) vs Venus/Moon (F) emphasis
    - J/P: Cardinal/Fixed (J) vs Mutable (P) emphasis
    """
    try:
        # Fetch birth data
        birth_data = db.query(BirthData).filter(
            BirthData.id == request.birth_data_id
        ).first()

        if not birth_data:
            raise HTTPException(
                status_code=404,
                detail=f"Birth data not found: {request.birth_data_id}"
            )

        # Build datetime from birth data
        birth_datetime = _parse_birth_datetime(birth_data)
        timezone_offset = _get_timezone_offset(birth_data)

        # Calculate type
        type_data = MyersBriggsCalculator.calculate_type(
            birth_datetime=birth_datetime,
            latitude=float(birth_data.latitude),
            longitude=float(birth_data.longitude),
            timezone_offset_minutes=timezone_offset,
            include_cognitive_stack=request.include_cognitive_stack,
            include_correlations=request.include_correlations
        )

        # Build response
        return _build_type_response(type_data, request.birth_data_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calculate/{birth_data_id}", response_model=MBTypeResponse)
async def calculate_myers_briggs_type_simple(
    birth_data_id: str,
    db: Session = Depends(get_db),
    include_cognitive_stack: bool = Query(True, description="Include cognitive function stack"),
    include_correlations: bool = Query(False, description="Include astrological correlations")
):
    """
    Simple GET endpoint to calculate Myers-Briggs type.

    Useful for quick calculations with default settings.
    """
    try:
        # Fetch birth data
        birth_data = db.query(BirthData).filter(
            BirthData.id == birth_data_id
        ).first()

        if not birth_data:
            raise HTTPException(
                status_code=404,
                detail=f"Birth data not found: {birth_data_id}"
            )

        # Build datetime
        birth_datetime = _parse_birth_datetime(birth_data)
        timezone_offset = _get_timezone_offset(birth_data)

        # Calculate type
        type_data = MyersBriggsCalculator.calculate_type(
            birth_datetime=birth_datetime,
            latitude=float(birth_data.latitude),
            longitude=float(birth_data.longitude),
            timezone_offset_minutes=timezone_offset,
            include_cognitive_stack=include_cognitive_stack,
            include_correlations=include_correlations
        )

        return _build_type_response(type_data, birth_data_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# REFERENCE DATA ENDPOINTS
# ==============================================================================

@router.get("/types", response_model=MBTypesListResponse)
async def get_all_types():
    """Get information about all 16 Myers-Briggs types."""
    types = MyersBriggsCalculator.get_all_types()
    return MBTypesListResponse(
        types=[MBTypeInfo(**t) for t in types],
        count=16
    )


@router.get("/types/{type_code}", response_model=MBTypeInfo)
async def get_type_info(type_code: str):
    """Get detailed information about a specific Myers-Briggs type."""
    type_code = type_code.upper()

    # Validate type code
    valid_codes = [
        'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
        'ISTP', 'ISFP', 'INFP', 'INTP',
        'ESTP', 'ESFP', 'ENFP', 'ENTP',
        'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
    ]

    if type_code not in valid_codes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type code: {type_code}. Must be one of {valid_codes}"
        )

    type_info = MyersBriggsCalculator.get_type_info(type_code)
    if not type_info:
        raise HTTPException(status_code=404, detail=f"Type {type_code} not found")

    return MBTypeInfo(**type_info)


@router.get("/dichotomies", response_model=MBDichotomiesListResponse)
async def get_all_dichotomies():
    """Get information about all 4 Myers-Briggs dichotomies."""
    dichotomies = MyersBriggsCalculator.get_all_dichotomies()
    return MBDichotomiesListResponse(
        dichotomies=[MBDichotomyInfo(**d) for d in dichotomies],
        count=4
    )


# ==============================================================================
# AI INTERPRETATION ENDPOINTS
# ==============================================================================

@router.post("/ai/interpret-type", response_model=MBTypeInterpretationResponse)
async def interpret_type(
    type_code: str = Body(..., embed=True),
    temperament: str = Body(..., embed=True),
    strengths: list = Body(default=[], embed=True),
    challenges: list = Body(default=[], embed=True)
):
    """
    Get AI interpretation for a Myers-Briggs type.
    """
    try:
        # Import AI interpreter
        from app.services.ai_interpreter import AIInterpreter

        # Get type profile for context
        type_info = MyersBriggsCalculator.get_type_info(type_code)
        if not type_info:
            raise HTTPException(status_code=404, detail=f"Type {type_code} not found")

        # Generate interpretation
        interpretation = await AIInterpreter.generate_mb_type_interpretation_async(
            type_code=type_code,
            type_name=type_info['name'],
            temperament=temperament,
            description=type_info['description'],
            strengths=strengths or type_info['strengths'],
            challenges=challenges or type_info['challenges']
        )

        return MBTypeInterpretationResponse(
            type_code=type_code,
            interpretation=interpretation
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating interpretation: {str(e)}"
        )


@router.post("/ai/full-reading", response_model=MBFullReadingResponse)
async def generate_full_reading(
    birth_data_id: str = Body(..., embed=True),
    include_correlations: bool = Body(False, embed=True)
):
    """
    Generate a comprehensive AI-powered Myers-Briggs reading.

    This includes interpretations for:
    - Personality type overview
    - Cognitive function stack
    - Strengths and growth areas
    - Relationship tendencies
    - Career alignment
    """
    # Get database session
    db = next(get_db())

    try:
        # Fetch birth data
        birth_data = db.query(BirthData).filter(
            BirthData.id == birth_data_id
        ).first()

        if not birth_data:
            raise HTTPException(
                status_code=404,
                detail=f"Birth data not found: {birth_data_id}"
            )

        # Calculate type first
        birth_datetime = _parse_birth_datetime(birth_data)
        timezone_offset = _get_timezone_offset(birth_data)

        type_data = MyersBriggsCalculator.calculate_type(
            birth_datetime=birth_datetime,
            latitude=birth_data.latitude,
            longitude=birth_data.longitude,
            timezone_offset_minutes=timezone_offset,
            include_cognitive_stack=True,
            include_correlations=include_correlations
        )

        # Generate full reading
        from app.services.ai_interpreter import AIInterpreter

        reading, sections = await AIInterpreter.generate_mb_full_reading_async(
            type_data=type_data
        )

        return MBFullReadingResponse(
            birth_data_id=birth_data_id,
            type_code=type_data['type_code'],
            reading=reading,
            sections=sections,
            generated_at=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating reading: {str(e)}"
        )
    finally:
        db.close()


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def _build_type_response(
    type_data: dict,
    birth_data_id: str
) -> MBTypeResponse:
    """Build a properly typed MBTypeResponse from raw type data."""

    # Build dichotomy scores
    dichotomies = []
    for d in type_data.get('dichotomies', []):
        dichotomies.append(DichotomyScore(
            dichotomy=d['dichotomy'],
            preference=d['preference'],
            strength=d['strength'],
            first_option=d['first_option'],
            second_option=d['second_option'],
            first_score=d['first_score'],
            second_score=d['second_score'],
            contributing_factors=d.get('contributing_factors', [])
        ))

    # Build cognitive stack if present
    cognitive_stack = None
    if type_data.get('cognitive_stack'):
        cognitive_stack = []
        for cf in type_data['cognitive_stack']:
            cognitive_stack.append(CognitiveFunction(
                function=cf['function'],
                name=cf['name'],
                position=cf['position'],
                description=cf['description']
            ))

    return MBTypeResponse(
        id=None,
        birth_data_id=birth_data_id,
        type_code=type_data['type_code'],
        type_name=type_data['type_name'],
        temperament=type_data['temperament'],
        dichotomies=dichotomies,
        preference_strengths=type_data.get('preference_strengths', {}),
        description=type_data.get('description', ''),
        strengths=type_data.get('strengths', []),
        challenges=type_data.get('challenges', []),
        cognitive_stack=cognitive_stack,
        correlations=type_data.get('correlations'),
        calculation_info=type_data.get('calculation_info', {}),
        created_at=datetime.utcnow()
    )
