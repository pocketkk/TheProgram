"""
Human Design API Routes

Provides endpoints for Human Design chart calculations, reference data,
and AI-powered interpretations.
"""

from datetime import datetime, date, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models import BirthData
from app.models.app_config import AppConfig
from app.services.human_design_calculator import HumanDesignCalculator
from app.schemas.human_design import (
    HDCalculationRequest,
    HDChartResponse,
    HDInterpretationRequest,
    GateActivation,
    ChannelDefinition,
    CenterDefinition,
    ProfileInfo,
    IncarnationCross,
    Variables,
    HDGateInfo,
    HDChannelInfo,
    HDCenterInfo,
    HDTypeInfo,
    HDGatesListResponse,
    HDChannelsListResponse,
    HDCentersListResponse,
    HDTypesListResponse,
    HDTypeInterpretationResponse,
    HDProfileInterpretationResponse,
    HDChannelInterpretationResponse,
    HDGateInterpretationResponse,
    HDFullReadingResponse,
    ZodiacType,
    SiderealMethod,
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
# CHART CALCULATION ENDPOINTS
# ==============================================================================

@router.post("/calculate", response_model=HDChartResponse)
async def calculate_human_design_chart(
    request: HDCalculationRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate a complete Human Design chart.

    This endpoint calculates:
    - Type, Strategy, Authority
    - Profile and Definition
    - All planetary activations (Personality and Design)
    - Defined channels and centers
    - Incarnation Cross
    - Variables (if requested)

    Supports both tropical and sidereal zodiac systems with two
    sidereal methods:
    - shift_positions: Apply ayanamsa to planet positions
    - shift_wheel: Keep tropical positions, rotate gate wheel
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

        # Calculate chart
        chart_data = HumanDesignCalculator.calculate_chart(
            birth_datetime=birth_datetime,
            latitude=float(birth_data.latitude),
            longitude=float(birth_data.longitude),
            timezone_offset_minutes=timezone_offset,
            zodiac_type=request.zodiac_type.value,
            sidereal_method=request.sidereal_method.value,
            ayanamsa=request.ayanamsa,
            include_variables=request.include_variables
        )

        # Build response
        return _build_chart_response(
            chart_data,
            request.birth_data_id,
            request.chart_name
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calculate/{birth_data_id}", response_model=HDChartResponse)
async def calculate_human_design_chart_simple(
    birth_data_id: str,
    db: Session = Depends(get_db),
    zodiac: str = Query("tropical", description="Zodiac type: tropical or sidereal"),
    sidereal_method: str = Query("shift_positions", description="Sidereal method"),
    ayanamsa: str = Query("lahiri", description="Ayanamsa for sidereal"),
    include_variables: bool = Query(True, description="Include Variables calculation")
):
    """
    Simple GET endpoint to calculate Human Design chart.

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

        # Calculate chart
        chart_data = HumanDesignCalculator.calculate_chart(
            birth_datetime=birth_datetime,
            latitude=float(birth_data.latitude),
            longitude=float(birth_data.longitude),
            timezone_offset_minutes=timezone_offset,
            zodiac_type=zodiac,
            sidereal_method=sidereal_method,
            ayanamsa=ayanamsa,
            include_variables=include_variables
        )

        return _build_chart_response(chart_data, birth_data_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# REFERENCE DATA ENDPOINTS
# ==============================================================================

@router.get("/gates", response_model=HDGatesListResponse)
async def get_all_gates():
    """Get information about all 64 Human Design gates."""
    gates = HumanDesignCalculator.get_all_gates()
    return HDGatesListResponse(
        gates=[HDGateInfo(**g) for g in gates],
        count=64
    )


@router.get("/gates/{gate_number}", response_model=HDGateInfo)
async def get_gate_info(gate_number: int):
    """Get detailed information about a specific gate."""
    if not 1 <= gate_number <= 64:
        raise HTTPException(
            status_code=400,
            detail="Gate number must be between 1 and 64"
        )

    gates = HumanDesignCalculator.get_all_gates()
    gate = next((g for g in gates if g['number'] == gate_number), None)

    if not gate:
        raise HTTPException(status_code=404, detail=f"Gate {gate_number} not found")

    return HDGateInfo(**gate)


@router.get("/channels", response_model=HDChannelsListResponse)
async def get_all_channels():
    """Get information about all 36 Human Design channels."""
    channels = HumanDesignCalculator.get_all_channels()
    return HDChannelsListResponse(
        channels=[HDChannelInfo(**c) for c in channels],
        count=36
    )


@router.get("/channels/{channel_id}", response_model=HDChannelInfo)
async def get_channel_info(channel_id: str):
    """
    Get information about a specific Human Design channel.

    channel_id can be in format "46-29" (gate numbers) or just the channel name.
    """
    channels = HumanDesignCalculator.get_all_channels()

    # Parse channel_id - could be "46-29" format
    if "-" in channel_id:
        parts = channel_id.split("-")
        if len(parts) == 2:
            try:
                gate1, gate2 = int(parts[0]), int(parts[1])
                # Find channel with these gates (in either order)
                # Channel data uses gate1/gate2 keys, not a gates array
                for channel in channels:
                    ch_gate1 = channel.get("gate1")
                    ch_gate2 = channel.get("gate2")
                    if ((gate1 == ch_gate1 and gate2 == ch_gate2) or
                        (gate1 == ch_gate2 and gate2 == ch_gate1)):
                        return HDChannelInfo(**channel)
            except ValueError:
                pass

    # Try to find by channel_id directly
    for channel in channels:
        if channel.get("channel_id") == channel_id or channel.get("name") == channel_id:
            return HDChannelInfo(**channel)

    raise HTTPException(
        status_code=404,
        detail=f"Channel not found: {channel_id}"
    )


@router.get("/centers", response_model=HDCentersListResponse)
async def get_all_centers():
    """Get information about all 9 Human Design centers."""
    centers = HumanDesignCalculator.get_all_centers()
    return HDCentersListResponse(
        centers=[HDCenterInfo(**c) for c in centers],
        count=9
    )


@router.get("/centers/{center_name}", response_model=HDCenterInfo)
async def get_center(center_name: str):
    """Get information about a specific Human Design center."""
    centers = HumanDesignCalculator.get_all_centers()

    # Normalize the input for matching
    normalized = center_name.lower().replace('-', '_').replace(' ', '_')

    # Map short names to full names
    short_name_map = {
        'head': 'head center',
        'ajna': 'ajna center',
        'throat': 'throat center',
        'g': 'g center (identity)',
        'g_center': 'g center (identity)',
        'heart': 'heart/ego center',
        'ego': 'heart/ego center',
        'sacral': 'sacral center',
        'solar_plexus': 'solar plexus center',
        'spleen': 'splenic center',
        'splenic': 'splenic center',
        'root': 'root center',
    }

    # Try short name mapping first
    target_name = short_name_map.get(normalized, normalized)

    for center in centers:
        center_lower = center['name'].lower()
        center_key = center_lower.replace(' ', '_').replace('/', '_')
        if (center_key == normalized or
            center_lower == target_name or
            center_lower.startswith(normalized)):
            return HDCenterInfo(**center)

    raise HTTPException(
        status_code=404,
        detail=f"Center not found: {center_name}"
    )


@router.get("/types", response_model=HDTypesListResponse)
async def get_all_types():
    """Get information about all 5 Human Design types."""
    types = HumanDesignCalculator.get_all_types()
    return HDTypesListResponse(
        types=[HDTypeInfo(**t) for t in types],
        count=5
    )


# ==============================================================================
# AI INTERPRETATION ENDPOINTS
# ==============================================================================

@router.post("/ai/interpret-type", response_model=HDTypeInterpretationResponse)
async def interpret_type(
    hd_type: str = Body(..., embed=True),
    strategy: str = Body(..., embed=True),
    authority: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Get AI interpretation for Type, Strategy, and Authority combination.
    """
    try:
        # Import AI interpreter
        from app.services.ai_interpreter import AIInterpreter

        config = db.query(AppConfig).filter_by(id=1).first()
        api_key = config.anthropic_api_key if config else None

        # Generate interpretation
        interpretation = await AIInterpreter.generate_hd_type_interpretation_async(
            hd_type=hd_type,
            strategy=strategy,
            authority=authority,
            api_key=api_key
        )

        return HDTypeInterpretationResponse(
            hd_type=hd_type,
            strategy=strategy,
            authority=authority,
            interpretation=interpretation
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating interpretation: {str(e)}"
        )


@router.post("/ai/interpret-profile", response_model=HDProfileInterpretationResponse)
async def interpret_profile(
    profile: str = Body(..., embed=True),
    personality_line: int = Body(..., embed=True),
    design_line: int = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Get AI interpretation for a Profile.
    """
    try:
        from app.services.ai_interpreter import AIInterpreter

        config = db.query(AppConfig).filter_by(id=1).first()
        api_key = config.anthropic_api_key if config else None

        interpretation = await AIInterpreter.generate_hd_profile_interpretation_async(
            profile=profile,
            personality_line=personality_line,
            design_line=design_line,
            api_key=api_key
        )

        return HDProfileInterpretationResponse(
            profile=profile,
            interpretation=interpretation
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating interpretation: {str(e)}"
        )


@router.post("/ai/interpret-channel", response_model=HDChannelInterpretationResponse)
async def interpret_channel(
    channel_name: str = Body(..., embed=True),
    gate1: int = Body(..., embed=True),
    gate2: int = Body(..., embed=True),
    activation_type: str = Body("both", embed=True),
    db: Session = Depends(get_db)
):
    """
    Get AI interpretation for a defined channel.
    """
    try:
        from app.services.ai_interpreter import AIInterpreter

        config = db.query(AppConfig).filter_by(id=1).first()
        api_key = config.anthropic_api_key if config else None

        interpretation = await AIInterpreter.generate_hd_channel_interpretation_async(
            channel_name=channel_name,
            gate1=gate1,
            gate2=gate2,
            activation_type=activation_type,
            api_key=api_key
        )

        return HDChannelInterpretationResponse(
            channel_name=channel_name,
            gates=[gate1, gate2],
            interpretation=interpretation
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating interpretation: {str(e)}"
        )


@router.post("/ai/interpret-gate", response_model=HDGateInterpretationResponse)
async def interpret_gate(
    gate: int = Body(..., embed=True),
    gate_name: str = Body(..., embed=True),
    planet: str = Body(..., embed=True),
    line: int = Body(..., embed=True),
    is_personality: bool = Body(True, embed=True),
    db: Session = Depends(get_db)
):
    """
    Get AI interpretation for a gate activation.
    """
    try:
        from app.services.ai_interpreter import AIInterpreter

        config = db.query(AppConfig).filter_by(id=1).first()
        api_key = config.anthropic_api_key if config else None

        interpretation = await AIInterpreter.generate_hd_gate_interpretation_async(
            gate=gate,
            gate_name=gate_name,
            planet=planet,
            line=line,
            is_personality=is_personality,
            api_key=api_key
        )

        return HDGateInterpretationResponse(
            gate=gate,
            gate_name=gate_name,
            planet=planet,
            line=line,
            is_personality=is_personality,
            interpretation=interpretation
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating interpretation: {str(e)}"
        )


@router.post("/ai/full-reading", response_model=HDFullReadingResponse)
async def generate_full_reading(
    birth_data_id: str = Body(..., embed=True),
    zodiac: str = Body("tropical", embed=True),
    sidereal_method: str = Body("shift_positions", embed=True),
    ayanamsa: str = Body("lahiri", embed=True)
):
    """
    Generate a comprehensive AI-powered Human Design reading.

    This includes interpretations for:
    - Type, Strategy, and Authority
    - Profile
    - Definition type
    - Defined channels
    - Key gates
    - Incarnation Cross
    - Practical guidance
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

        # Calculate chart first
        birth_datetime = _parse_birth_datetime(birth_data)
        timezone_offset = _get_timezone_offset(birth_data)

        chart_data = HumanDesignCalculator.calculate_chart(
            birth_datetime=birth_datetime,
            latitude=birth_data.latitude,
            longitude=birth_data.longitude,
            timezone_offset_minutes=timezone_offset,
            zodiac_type=zodiac,
            sidereal_method=sidereal_method,
            ayanamsa=ayanamsa,
            include_variables=True
        )

        # Generate full reading
        from app.services.ai_interpreter import AIInterpreter

        config = db.query(AppConfig).filter_by(id=1).first()
        api_key = config.anthropic_api_key if config else None

        reading, sections = await AIInterpreter.generate_hd_full_reading_async(
            chart_data=chart_data,
            api_key=api_key
        )

        return HDFullReadingResponse(
            chart_id=None,  # Not saved
            hd_type=chart_data['hd_type'],
            profile=chart_data['profile']['name'],
            authority=chart_data['authority'],
            definition=chart_data['definition'],
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

def _build_chart_response(
    chart_data: dict,
    birth_data_id: str,
    chart_name: Optional[str] = None
) -> HDChartResponse:
    """Build a properly typed HDChartResponse from raw chart data."""

    # Build personality activations
    personality_activations = {}
    for planet, act in chart_data['personality_activations'].items():
        personality_activations[planet] = GateActivation(
            gate=act['gate'],
            line=act['line'],
            color=act.get('color', 1),
            tone=act.get('tone', 1),
            base=act.get('base', 1),
            planet=act['planet'],
            longitude=act['longitude'],
            sign=act['sign'],
            degree_in_sign=act['degree_in_sign'],
            gate_name=act['gate_name'],
            gate_keyword=act['gate_keyword']
        )

    # Build design activations
    design_activations = {}
    for planet, act in chart_data['design_activations'].items():
        design_activations[planet] = GateActivation(
            gate=act['gate'],
            line=act['line'],
            color=act.get('color', 1),
            tone=act.get('tone', 1),
            base=act.get('base', 1),
            planet=act['planet'],
            longitude=act['longitude'],
            sign=act['sign'],
            degree_in_sign=act['degree_in_sign'],
            gate_name=act['gate_name'],
            gate_keyword=act['gate_keyword']
        )

    # Build channels
    channels = []
    for ch in chart_data['channels']:
        channels.append(ChannelDefinition(
            gate1=ch['gate1'],
            gate2=ch['gate2'],
            name=ch['name'],
            center1=ch['center1'],
            center2=ch['center2'],
            circuit=ch['circuit'],
            description=ch['description'],
            gate1_activations=ch['gate1_activations'],
            gate2_activations=ch['gate2_activations'],
            activation_type=ch['activation_type']
        ))

    # Build centers
    centers = {}
    for center_key, center_data in chart_data['centers'].items():
        centers[center_key] = CenterDefinition(
            name=center_data['name'],
            defined=center_data['defined'],
            activated_gates=center_data['activated_gates'],
            defining_channels=center_data['defining_channels'],
            theme=center_data['theme'],
            biological_correlation=center_data['biological_correlation'],
            not_self_theme=center_data['not_self_theme']
        )

    # Build profile
    profile_data = chart_data['profile']
    profile = ProfileInfo(
        personality_line=profile_data['personality_line'],
        design_line=profile_data['design_line'],
        name=profile_data['name'],
        angle=profile_data['angle'],
        description=profile_data['description']
    )

    # Build incarnation cross
    cross_data = chart_data['incarnation_cross']
    incarnation_cross = IncarnationCross(
        name=cross_data['name'],
        cross_type=cross_data['cross_type'],
        quarter=cross_data['quarter'],
        personality_sun_gate=cross_data['personality_sun_gate'],
        personality_earth_gate=cross_data['personality_earth_gate'],
        design_sun_gate=cross_data['design_sun_gate'],
        design_earth_gate=cross_data['design_earth_gate'],
        description=cross_data['description']
    )

    # Build variables if present
    variables = None
    if chart_data.get('variables'):
        var_data = chart_data['variables']
        variables = Variables(
            design_sun_color=var_data['design_sun_color'],
            design_sun_tone=var_data['design_sun_tone'],
            digestion=var_data['digestion'],
            personality_sun_color=var_data['personality_sun_color'],
            personality_sun_tone=var_data['personality_sun_tone'],
            cognition=var_data['cognition'],
            design_node_color=var_data['design_node_color'],
            design_node_tone=var_data['design_node_tone'],
            environment=var_data['environment'],
            personality_node_color=var_data['personality_node_color'],
            personality_node_tone=var_data['personality_node_tone'],
            perspective=var_data['perspective'],
            left_arrow_1=var_data['left_arrow_1'],
            left_arrow_2=var_data['left_arrow_2'],
            right_arrow_1=var_data['right_arrow_1'],
            right_arrow_2=var_data['right_arrow_2']
        )

    # Parse datetimes
    personality_dt = datetime.fromisoformat(chart_data['personality_datetime'])
    design_dt = datetime.fromisoformat(chart_data['design_datetime'])

    return HDChartResponse(
        id=None,
        birth_data_id=birth_data_id,
        hd_type=chart_data['hd_type'],
        strategy=chart_data['strategy'],
        authority=chart_data['authority'],
        authority_description=chart_data['authority_description'],
        signature=chart_data['signature'],
        not_self=chart_data['not_self'],
        profile=profile,
        definition=chart_data['definition'],
        definition_description=chart_data['definition_description'],
        personality_activations=personality_activations,
        design_activations=design_activations,
        centers=centers,
        defined_centers=chart_data['defined_centers'],
        undefined_centers=chart_data['undefined_centers'],
        channels=channels,
        all_activated_gates=chart_data['all_activated_gates'],
        personality_gates=chart_data['personality_gates'],
        design_gates=chart_data['design_gates'],
        incarnation_cross=incarnation_cross,
        variables=variables,
        personality_datetime=personality_dt,
        design_datetime=design_dt,
        design_days_before=chart_data['design_days_before'],
        calculation_info=chart_data['calculation_info'],
        created_at=datetime.utcnow()
    )
