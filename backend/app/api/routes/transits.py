"""
Transit API Routes
Provides endpoints for transit calculations and analysis
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database_sqlite import get_db
from app.models.birth_data import BirthData
from app.models.chart import Chart
from app.services.transit_calculator import TransitCalculator, TransitInterpreter
from app.services.chart_calculator import NatalChartCalculator

router = APIRouter()


# Request/Response schemas
class TransitRequest(BaseModel):
    birth_data_id: str
    transit_date: Optional[str] = None  # ISO format, defaults to now
    zodiac: str = "tropical"
    orb_multiplier: float = Field(default=1.0, ge=0.5, le=2.0)


class TransitTimelineRequest(BaseModel):
    birth_data_id: str
    start_date: str  # ISO format
    end_date: str    # ISO format
    zodiac: str = "tropical"
    interval_days: int = Field(default=1, ge=1, le=7)


class ExactTransitRequest(BaseModel):
    birth_data_id: str
    transit_planet: str
    natal_planet: str
    aspect: str
    start_date: str
    end_date: str
    zodiac: str = "tropical"


class TransitAspect(BaseModel):
    transit_planet: str
    natal_planet: str
    aspect: str
    orb: float
    is_applying: bool
    significance: str
    estimated_duration: str
    transit_sign: str
    transit_degree: float
    natal_sign: str
    natal_degree: float
    transit_retrograde: bool


class TransitSummary(BaseModel):
    total_transits: int
    major_count: int
    significant_count: int
    aspect_counts: dict
    themes: List[str]
    most_significant: Optional[TransitAspect] = None


class TransitResponse(BaseModel):
    transit_datetime: str
    current_positions: dict
    transits: List[TransitAspect]
    summary: TransitSummary


def get_natal_chart_data(birth_data_id: str, db: Session, zodiac: str = "tropical") -> dict:
    """Helper to get natal chart data for transit calculations."""
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Parse birth datetime
    birth_dt = datetime.strptime(
        f"{birth_data.birth_date} {birth_data.birth_time or '12:00:00'}",
        "%Y-%m-%d %H:%M:%S"
    )

    # Calculate natal chart
    chart_data = NatalChartCalculator.calculate_natal_chart(
        birth_datetime=birth_dt,
        latitude=birth_data.latitude,
        longitude=birth_data.longitude,
        timezone_offset_minutes=birth_data.utc_offset or 0,
        zodiac=zodiac
    )

    return chart_data


@router.post("/current", response_model=TransitResponse)
async def get_current_transits(
    request: TransitRequest,
    db: Session = Depends(get_db)
):
    """
    Get current transits for a birth chart.

    Returns all transiting planets' aspects to natal positions,
    sorted by significance.
    """
    # Get natal chart
    chart_data = get_natal_chart_data(request.birth_data_id, db, request.zodiac)

    # Parse transit date
    transit_dt = None
    if request.transit_date:
        transit_dt = datetime.fromisoformat(request.transit_date.replace('Z', '+00:00'))

    # Calculate transits
    transits = TransitCalculator.calculate_current_transits(
        natal_planets=chart_data['planets'],
        transit_datetime=transit_dt,
        zodiac=request.zodiac,
        orb_multiplier=request.orb_multiplier
    )

    return transits


@router.get("/current/{birth_data_id}")
async def get_current_transits_simple(
    birth_data_id: str,
    zodiac: str = Query(default="tropical"),
    db: Session = Depends(get_db)
):
    """Simple GET endpoint for current transits."""
    chart_data = get_natal_chart_data(birth_data_id, db, zodiac)

    transits = TransitCalculator.calculate_current_transits(
        natal_planets=chart_data['planets'],
        zodiac=zodiac
    )

    return transits


@router.post("/timeline")
async def get_transit_timeline(
    request: TransitTimelineRequest,
    db: Session = Depends(get_db)
):
    """
    Get transit timeline over a date range.

    Returns significant transits for each day in the range,
    useful for visualization and planning.
    """
    chart_data = get_natal_chart_data(request.birth_data_id, db, request.zodiac)

    start = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))

    # Limit range to prevent abuse
    if (end - start).days > 365:
        raise HTTPException(
            status_code=400,
            detail="Date range cannot exceed 365 days"
        )

    timeline = TransitCalculator.calculate_transit_timeline(
        natal_planets=chart_data['planets'],
        start_date=start,
        end_date=end,
        zodiac=request.zodiac,
        interval_days=request.interval_days
    )

    return {
        "start_date": request.start_date,
        "end_date": request.end_date,
        "timeline": timeline,
        "total_days": len(timeline)
    }


@router.get("/upcoming/{birth_data_id}")
async def get_upcoming_transits(
    birth_data_id: str,
    days: int = Query(default=30, ge=7, le=90),
    zodiac: str = Query(default="tropical"),
    db: Session = Depends(get_db)
):
    """
    Get upcoming significant transits.

    Returns major and significant transits approaching
    over the next N days.
    """
    chart_data = get_natal_chart_data(birth_data_id, db, zodiac)

    upcoming = TransitCalculator.get_upcoming_significant_transits(
        natal_planets=chart_data['planets'],
        days_ahead=days,
        zodiac=zodiac
    )

    return {
        "days_ahead": days,
        "upcoming_transits": upcoming,
        "count": len(upcoming)
    }


@router.post("/exact-dates")
async def find_exact_transit_dates(
    request: ExactTransitRequest,
    db: Session = Depends(get_db)
):
    """
    Find exact dates for a specific transit aspect.

    Useful for planning around significant transits
    like Saturn conjunct Sun, etc.
    """
    chart_data = get_natal_chart_data(request.birth_data_id, db, request.zodiac)

    start = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))

    # Limit range
    if (end - start).days > 730:
        raise HTTPException(
            status_code=400,
            detail="Date range cannot exceed 2 years"
        )

    exact_dates = TransitCalculator.find_exact_transit_dates(
        natal_planets=chart_data['planets'],
        transit_planet=request.transit_planet,
        natal_planet=request.natal_planet,
        aspect=request.aspect,
        start_date=start,
        end_date=end,
        zodiac=request.zodiac
    )

    return {
        "transit_planet": request.transit_planet,
        "natal_planet": request.natal_planet,
        "aspect": request.aspect,
        "exact_dates": exact_dates,
        "count": len(exact_dates)
    }


@router.get("/interpret/{transit_planet}/{natal_planet}/{aspect}")
async def get_transit_interpretation(
    transit_planet: str,
    natal_planet: str,
    aspect: str
):
    """
    Get interpretation for a specific transit aspect.

    Returns theme, description, duration, and advice.
    """
    interpretation = TransitInterpreter.get_interpretation(
        transit_planet, natal_planet, aspect
    )

    return interpretation


@router.get("/report/{birth_data_id}")
async def get_transit_report(
    birth_data_id: str,
    zodiac: str = Query(default="tropical"),
    db: Session = Depends(get_db)
):
    """
    Get a text report of current transits.

    Provides a summary suitable for display or AI interpretation.
    """
    chart_data = get_natal_chart_data(birth_data_id, db, zodiac)

    transits = TransitCalculator.calculate_current_transits(
        natal_planets=chart_data['planets'],
        zodiac=zodiac
    )

    report = TransitInterpreter.get_transit_report(transits['transits'])

    return {
        "transit_datetime": transits['transit_datetime'],
        "report": report,
        "summary": transits['summary']
    }


@router.get("/daily-snapshot/{birth_data_id}")
async def get_daily_transit_snapshot(
    birth_data_id: str,
    date: Optional[str] = Query(default=None),
    zodiac: str = Query(default="tropical"),
    db: Session = Depends(get_db)
):
    """
    Get a snapshot of transits for a specific day.

    Includes current positions, active transits, and themes.
    Useful for daily transit updates.
    """
    chart_data = get_natal_chart_data(birth_data_id, db, zodiac)

    transit_dt = None
    if date:
        transit_dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
    else:
        transit_dt = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)

    transits = TransitCalculator.calculate_current_transits(
        natal_planets=chart_data['planets'],
        transit_datetime=transit_dt,
        zodiac=zodiac
    )

    # Get Moon phase (simplified)
    moon_lon = transits['current_positions'].get('Moon', {}).get('longitude', 0)
    sun_lon = transits['current_positions'].get('Sun', {}).get('longitude', 0)
    moon_phase_angle = (moon_lon - sun_lon) % 360

    moon_phase = "New Moon"
    if 45 < moon_phase_angle <= 90:
        moon_phase = "Waxing Crescent"
    elif 90 < moon_phase_angle <= 135:
        moon_phase = "First Quarter"
    elif 135 < moon_phase_angle <= 180:
        moon_phase = "Waxing Gibbous"
    elif 180 < moon_phase_angle <= 225:
        moon_phase = "Full Moon"
    elif 225 < moon_phase_angle <= 270:
        moon_phase = "Waning Gibbous"
    elif 270 < moon_phase_angle <= 315:
        moon_phase = "Last Quarter"
    elif 315 < moon_phase_angle <= 360:
        moon_phase = "Waning Crescent"

    return {
        "date": transit_dt.date().isoformat(),
        "moon_phase": moon_phase,
        "moon_sign": transits['current_positions'].get('Moon', {}).get('sign_name', ''),
        "sun_sign": transits['current_positions'].get('Sun', {}).get('sign_name', ''),
        "active_transits": transits['transits'][:10],  # Top 10
        "themes": transits['summary']['themes'],
        "major_transit": transits['summary']['most_significant']
    }


# ==================== AI Transit Interpretation Endpoints ====================

@router.post("/ai/interpret-transit")
async def ai_interpret_transit(
    transit_data: dict,
    db: Session = Depends(get_db)
):
    """
    Get AI-generated interpretation for a specific transit.

    Requires ANTHROPIC_API_KEY to be set.
    """
    from app.services.ai_interpreter import AIInterpreter

    try:
        interpreter = AIInterpreter()
        interpretation = await interpreter.generate_transit_interpretation_async(transit_data)

        return {
            "transit": f"{transit_data.get('transit_planet')} {transit_data.get('aspect')} {transit_data.get('natal_planet')}",
            "interpretation": interpretation
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI interpretation failed: {str(e)}")


@router.get("/ai/daily-forecast/{birth_data_id}")
async def ai_daily_forecast(
    birth_data_id: str,
    date: Optional[str] = Query(default=None),
    zodiac: str = Query(default="tropical"),
    db: Session = Depends(get_db)
):
    """
    Get AI-generated daily transit forecast.

    Combines the daily snapshot with AI interpretation
    for a personalized daily horoscope.
    """
    from app.services.ai_interpreter import AIInterpreter

    # Get daily snapshot
    chart_data = get_natal_chart_data(birth_data_id, db, zodiac)

    transit_dt = None
    if date:
        transit_dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
    else:
        transit_dt = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)

    transits = TransitCalculator.calculate_current_transits(
        natal_planets=chart_data['planets'],
        transit_datetime=transit_dt,
        zodiac=zodiac
    )

    # Calculate moon phase
    moon_lon = transits['current_positions'].get('Moon', {}).get('longitude', 0)
    sun_lon = transits['current_positions'].get('Sun', {}).get('longitude', 0)
    moon_phase_angle = (moon_lon - sun_lon) % 360

    moon_phase = "New Moon"
    if 45 < moon_phase_angle <= 90:
        moon_phase = "Waxing Crescent"
    elif 90 < moon_phase_angle <= 135:
        moon_phase = "First Quarter"
    elif 135 < moon_phase_angle <= 180:
        moon_phase = "Waxing Gibbous"
    elif 180 < moon_phase_angle <= 225:
        moon_phase = "Full Moon"
    elif 225 < moon_phase_angle <= 270:
        moon_phase = "Waning Gibbous"
    elif 270 < moon_phase_angle <= 315:
        moon_phase = "Last Quarter"
    elif 315 < moon_phase_angle <= 360:
        moon_phase = "Waning Crescent"

    daily_snapshot = {
        "date": transit_dt.date().isoformat(),
        "moon_phase": moon_phase,
        "moon_sign": transits['current_positions'].get('Moon', {}).get('sign_name', ''),
        "sun_sign": transits['current_positions'].get('Sun', {}).get('sign_name', ''),
        "active_transits": transits['transits'][:10],
        "themes": transits['summary']['themes'],
        "major_transit": transits['summary']['most_significant']
    }

    try:
        interpreter = AIInterpreter()
        forecast = await interpreter.generate_daily_transit_forecast_async(daily_snapshot)

        return {
            "date": daily_snapshot["date"],
            "moon_phase": moon_phase,
            "moon_sign": daily_snapshot["moon_sign"],
            "sun_sign": daily_snapshot["sun_sign"],
            "themes": daily_snapshot["themes"],
            "major_transit": daily_snapshot["major_transit"],
            "forecast": forecast,
            "active_transit_count": len(transits['transits'])
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI forecast generation failed: {str(e)}")


@router.get("/ai/transit-report/{birth_data_id}")
async def ai_transit_report(
    birth_data_id: str,
    report_type: str = Query(default="comprehensive", pattern="^(comprehensive|highlights|brief)$"),
    zodiac: str = Query(default="tropical"),
    db: Session = Depends(get_db)
):
    """
    Get AI-generated comprehensive transit report.

    Report types:
    - comprehensive: Full detailed analysis
    - highlights: Key transits focus
    - brief: Quick summary
    """
    from app.services.ai_interpreter import AIInterpreter

    chart_data = get_natal_chart_data(birth_data_id, db, zodiac)

    transits = TransitCalculator.calculate_current_transits(
        natal_planets=chart_data['planets'],
        zodiac=zodiac
    )

    try:
        interpreter = AIInterpreter()
        report = await interpreter.generate_transit_report_async(transits, report_type=report_type)

        return {
            "transit_datetime": transits['transit_datetime'],
            "report_type": report_type,
            "summary": transits['summary'],
            "report": report
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI report generation failed: {str(e)}")
