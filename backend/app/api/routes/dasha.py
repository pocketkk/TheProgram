"""
Vimsottari Dasha API Routes

Endpoints for calculating and retrieving Dasha (planetary period) data.
The Vimsottari Dasha is a 120-year cycle used in Vedic astrology.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends

from app.services.dasha_calculator import VimshottariDashaCalculator
from app.utils.ephemeris import EphemerisCalculator
from app.schemas.dasha import (
    DashaRequest,
    DashaFromChartRequest,
    DashaFromPositionRequest,
    DashaResponse,
    DashaSummary,
)
from app.models.birth_data import BirthData
from app.models.chart import Chart
from app.core.database_sqlite import get_db


router = APIRouter()


def _convert_dasha_dates_to_strings(dasha_data: dict) -> dict:
    """Convert datetime objects to ISO strings for JSON serialization"""
    import copy
    result = copy.deepcopy(dasha_data)

    def convert_dates(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, datetime):
                    obj[key] = value.isoformat()
                elif isinstance(value, (list, dict)):
                    convert_dates(value)
        elif isinstance(obj, list):
            for item in obj:
                convert_dates(item)
        return obj

    return convert_dates(result)


@router.post("/calculate", response_model=DashaResponse)
async def calculate_dasha_from_birth_data(request: DashaRequest, db=Depends(get_db)):
    """
    Calculate Vimsottari Dasha periods from birth data.

    This endpoint:
    1. Retrieves birth data from the database
    2. Calculates Moon's sidereal position using the specified ayanamsa
    3. Generates the full Dasha timeline from birth
    """
    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == request.birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Parse birth datetime
    birth_date = datetime.strptime(birth_data.birth_date, "%Y-%m-%d").date()
    birth_time = (
        datetime.strptime(birth_data.birth_time, "%H:%M:%S").time()
        if birth_data.birth_time
        else datetime.min.time()
    )
    birth_datetime = datetime.combine(birth_date, birth_time)

    # Calculate Moon's sidereal position
    jd = EphemerisCalculator.datetime_to_julian_day(
        birth_datetime,
        birth_data.utc_offset or 0
    )

    moon_position = EphemerisCalculator.calculate_planet_position(
        'moon', jd, zodiac='sidereal', ayanamsa=request.ayanamsa
    )

    moon_longitude = moon_position['longitude']

    # Calculate Dasha
    calculate_to_date = birth_datetime + timedelta(days=365.25 * request.calculate_years)

    dasha_data = VimshottariDashaCalculator.calculate(
        moon_longitude=moon_longitude,
        birth_datetime=birth_datetime,
        calculate_to_date=calculate_to_date,
        include_antardashas=request.include_antardashas,
        include_pratyantardashas=request.include_pratyantardashas
    )

    # Add summary
    dasha_data['summary'] = VimshottariDashaCalculator.get_dasha_summary(dasha_data)

    # Convert dates to strings for JSON serialization
    return _convert_dasha_dates_to_strings(dasha_data)


@router.post("/calculate-from-chart", response_model=DashaResponse)
async def calculate_dasha_from_chart(request: DashaFromChartRequest, db=Depends(get_db)):
    """
    Calculate Vimsottari Dasha from an existing chart.

    Uses the Moon position already calculated in the chart data.
    """
    # Get chart
    chart = db.query(Chart).filter(Chart.id == request.chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Get chart data
    chart_data = chart.chart_data
    if not chart_data:
        raise HTTPException(status_code=400, detail="Chart has no calculation data")

    # Extract Moon longitude
    # Handle both Western and Vedic chart structures
    planets = None
    if 'd1' in chart_data and 'planets' in chart_data['d1']:
        # Vedic chart structure
        planets = chart_data['d1']['planets']
    elif 'planets' in chart_data:
        # Western chart structure
        planets = chart_data['planets']

    if not planets or 'moon' not in planets:
        raise HTTPException(status_code=400, detail="Moon position not found in chart")

    moon_longitude = planets['moon']['longitude']

    # Get birth data for datetime
    birth_data = db.query(BirthData).filter(BirthData.id == chart.birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found for chart")

    birth_date = datetime.strptime(birth_data.birth_date, "%Y-%m-%d").date()
    birth_time = (
        datetime.strptime(birth_data.birth_time, "%H:%M:%S").time()
        if birth_data.birth_time
        else datetime.min.time()
    )
    birth_datetime = datetime.combine(birth_date, birth_time)

    # Calculate Dasha
    dasha_data = VimshottariDashaCalculator.calculate(
        moon_longitude=moon_longitude,
        birth_datetime=birth_datetime,
        include_antardashas=request.include_antardashas,
        include_pratyantardashas=request.include_pratyantardashas
    )

    # Add summary
    dasha_data['summary'] = VimshottariDashaCalculator.get_dasha_summary(dasha_data)

    return _convert_dasha_dates_to_strings(dasha_data)


@router.post("/calculate-direct", response_model=DashaResponse)
async def calculate_dasha_direct(request: DashaFromPositionRequest):
    """
    Calculate Vimsottari Dasha directly from Moon position.

    Useful for testing or when you already have the Moon's sidereal longitude.
    """
    calculate_to_date = request.birth_datetime + timedelta(days=365.25 * request.calculate_years)

    dasha_data = VimshottariDashaCalculator.calculate(
        moon_longitude=request.moon_longitude,
        birth_datetime=request.birth_datetime,
        calculate_to_date=calculate_to_date,
        include_antardashas=request.include_antardashas,
        include_pratyantardashas=request.include_pratyantardashas
    )

    # Add summary
    dasha_data['summary'] = VimshottariDashaCalculator.get_dasha_summary(dasha_data)

    return _convert_dasha_dates_to_strings(dasha_data)


@router.get("/current/{birth_data_id}")
async def get_current_dasha(
    birth_data_id: str,
    ayanamsa: str = "lahiri",
    db=Depends(get_db)
):
    """
    Get just the current Dasha periods for a birth data record.

    Returns a simplified summary of what periods are currently active.
    """
    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Parse birth datetime
    birth_date = datetime.strptime(birth_data.birth_date, "%Y-%m-%d").date()
    birth_time = (
        datetime.strptime(birth_data.birth_time, "%H:%M:%S").time()
        if birth_data.birth_time
        else datetime.min.time()
    )
    birth_datetime = datetime.combine(birth_date, birth_time)

    # Calculate Moon's sidereal position
    jd = EphemerisCalculator.datetime_to_julian_day(
        birth_datetime,
        birth_data.utc_offset or 0
    )

    moon_position = EphemerisCalculator.calculate_planet_position(
        'moon', jd, zodiac='sidereal', ayanamsa=ayanamsa
    )

    # Calculate Dasha (only need current periods)
    dasha_data = VimshottariDashaCalculator.calculate(
        moon_longitude=moon_position['longitude'],
        birth_datetime=birth_datetime,
        include_antardashas=True,
        include_pratyantardashas=True
    )

    summary = VimshottariDashaCalculator.get_dasha_summary(dasha_data)

    # Add current period details
    current_maha = dasha_data.get('current_mahadasha')
    current_antar = dasha_data.get('current_antardasha')
    current_pratyantar = dasha_data.get('current_pratyantardasha')

    return {
        'current_period': summary['current_period_string'],
        'mahadasha': {
            'planet': current_maha['planet'] if current_maha else None,
            'planet_name': current_maha['planet_name'] if current_maha else None,
            'start_date': current_maha['start_date'].isoformat() if current_maha else None,
            'end_date': current_maha['end_date'].isoformat() if current_maha else None,
            'remaining_years': summary['time_remaining_in_mahadasha']['years'] if summary.get('time_remaining_in_mahadasha') else None,
        } if current_maha else None,
        'antardasha': {
            'planet': current_antar['planet'] if current_antar else None,
            'planet_name': current_antar['planet_name'] if current_antar else None,
            'start_date': current_antar['start_date'].isoformat() if current_antar else None,
            'end_date': current_antar['end_date'].isoformat() if current_antar else None,
        } if current_antar else None,
        'pratyantardasha': {
            'planet': current_pratyantar['planet'] if current_pratyantar else None,
            'planet_name': current_pratyantar['planet_name'] if current_pratyantar else None,
            'start_date': current_pratyantar['start_date'].isoformat() if current_pratyantar else None,
            'end_date': current_pratyantar['end_date'].isoformat() if current_pratyantar else None,
        } if current_pratyantar else None,
    }


@router.get("/nakshatra-info/{longitude}")
async def get_nakshatra_info(longitude: float):
    """
    Get nakshatra information for a given sidereal longitude.

    Useful for debugging or understanding nakshatra positions.
    """
    if not 0 <= longitude < 360:
        raise HTTPException(status_code=400, detail="Longitude must be between 0 and 360")

    nakshatra_info = VimshottariDashaCalculator._get_nakshatra_info(longitude)

    return {
        'longitude': longitude,
        'nakshatra': nakshatra_info,
        'dasha_lord': nakshatra_info['lord'],
        'planet_info': VimshottariDashaCalculator.PLANET_INFO[nakshatra_info['lord']],
    }
