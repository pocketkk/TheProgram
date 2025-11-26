"""
Insights API Routes

Provides endpoints for proactive AI-generated insights.
Part of Phase 3: AI Proactive Intelligence
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models_sqlite.chart import BirthData, Chart
from app.services.daily_insights_service import get_daily_insights_service

router = APIRouter()


@router.get("/daily/{birth_data_id}")
async def get_daily_insights(
    birth_data_id: str,
    target_date: Optional[str] = Query(default=None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """
    Get personalized daily insights based on current transits.

    Returns day energy, key transits, AI-generated guidance, and recommendations.
    """
    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Get natal chart
    chart = db.query(Chart).filter(Chart.birth_data_id == birth_data_id).first()
    if not chart or not chart.chart_data:
        raise HTTPException(
            status_code=404,
            detail="No calculated chart found. Please calculate chart first."
        )

    # Parse target date
    parsed_date = None
    if target_date:
        try:
            parsed_date = date.fromisoformat(target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Prepare birth data dict
    birth_info = {
        "name": birth_data.name,
        "birth_date": birth_data.birth_date.isoformat() if birth_data.birth_date else None,
    }

    # Generate insights
    insights_service = get_daily_insights_service()

    try:
        insights = insights_service.generate_daily_insights(
            natal_chart=chart.chart_data,
            birth_data=birth_info,
            target_date=parsed_date
        )
        return insights
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insights: {str(e)}"
        )


@router.get("/week-preview/{birth_data_id}")
async def get_week_preview(
    birth_data_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a preview of the coming week's cosmic influences.

    Returns energy levels and key transits for the next 7 days.
    """
    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Get natal chart
    chart = db.query(Chart).filter(Chart.birth_data_id == birth_data_id).first()
    if not chart or not chart.chart_data:
        raise HTTPException(
            status_code=404,
            detail="No calculated chart found. Please calculate chart first."
        )

    # Prepare birth data dict
    birth_info = {
        "name": birth_data.name,
        "birth_date": birth_data.birth_date.isoformat() if birth_data.birth_date else None,
    }

    # Generate week preview
    insights_service = get_daily_insights_service()

    try:
        preview = insights_service.get_week_preview(
            natal_chart=chart.chart_data,
            birth_data=birth_info
        )
        return {
            "name": birth_data.name,
            "week_preview": preview
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate week preview: {str(e)}"
        )


@router.get("/moon-phase")
async def get_current_moon_phase():
    """
    Get the current moon phase information.
    """
    from app.services.daily_insights_service import DailyInsightsService

    service = DailyInsightsService()
    moon_phase = service._get_moon_phase(date.today())

    return {
        "date": date.today().isoformat(),
        **moon_phase
    }


@router.get("/today-summary")
async def get_today_summary(db: Session = Depends(get_db)):
    """
    Get a general summary of today's cosmic influences.

    This endpoint doesn't require a specific birth chart and provides
    universal daily insights.
    """
    from app.services.daily_insights_service import DailyInsightsService

    service = DailyInsightsService()
    today = date.today()

    # Moon phase
    moon_phase = service._get_moon_phase(today)

    # Get current planetary positions (simplified)
    from app.services.transit_calculator import get_transit_calculator
    from datetime import datetime

    transit_calc = get_transit_calculator()
    current_positions = transit_calc.get_current_positions(datetime.now())

    return {
        "date": today.isoformat(),
        "day_name": today.strftime("%A"),
        "moon_phase": moon_phase,
        "current_positions": current_positions,
        "universal_guidance": _get_universal_guidance(moon_phase, today)
    }


@router.get("/journal-patterns")
async def analyze_journal_patterns(
    birth_data_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Analyze patterns across journal entries.

    Returns mood trends, themes, temporal patterns, and AI-generated insights.
    """
    from app.models_sqlite.journal import JournalEntry
    from app.services.journal_pattern_service import get_journal_pattern_service

    # Get all journal entries
    entries = db.query(JournalEntry).order_by(JournalEntry.created_at.desc()).all()

    if not entries:
        return {
            "status": "no_data",
            "message": "No journal entries found. Start journaling to see patterns emerge."
        }

    # Convert to dict format
    entry_dicts = []
    for entry in entries:
        entry_dicts.append({
            "id": str(entry.id),
            "title": entry.title,
            "content": entry.content,
            "mood": entry.mood,
            "tags": entry.tags or [],
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        })

    # Get natal chart if birth_data_id provided
    natal_chart = None
    if birth_data_id:
        chart = db.query(Chart).filter(Chart.birth_data_id == birth_data_id).first()
        if chart:
            natal_chart = chart.chart_data

    # Analyze patterns
    pattern_service = get_journal_pattern_service()
    analysis = pattern_service.analyze_patterns(
        entries=entry_dicts,
        natal_chart=natal_chart
    )

    return analysis


@router.get("/dashboard/{birth_data_id}")
async def get_insights_dashboard(
    birth_data_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a comprehensive insights dashboard combining daily insights,
    journal patterns, and week preview.
    """
    from app.models_sqlite.journal import JournalEntry
    from app.services.journal_pattern_service import get_journal_pattern_service

    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Get natal chart
    chart = db.query(Chart).filter(Chart.birth_data_id == birth_data_id).first()

    # Prepare response
    dashboard = {
        "name": birth_data.name,
        "date": date.today().isoformat(),
    }

    # Daily insights (if chart exists)
    if chart and chart.chart_data:
        insights_service = get_daily_insights_service()
        birth_info = {
            "name": birth_data.name,
            "birth_date": birth_data.birth_date.isoformat() if birth_data.birth_date else None,
        }

        try:
            daily = insights_service.generate_daily_insights(chart.chart_data, birth_info)
            dashboard["daily_insights"] = {
                "day_energy": daily["day_energy"],
                "moon_phase": daily["moon_phase"],
                "key_transits_count": len(daily.get("key_transits", [])),
                "ai_insight": daily.get("ai_insight"),
                "recommendations": daily.get("recommendations", {}),
            }
        except Exception:
            dashboard["daily_insights"] = None
    else:
        dashboard["daily_insights"] = None

    # Journal patterns
    entries = db.query(JournalEntry).order_by(JournalEntry.created_at.desc()).limit(50).all()
    if entries:
        entry_dicts = [{
            "id": str(e.id),
            "title": e.title,
            "content": e.content,
            "mood": e.mood,
            "tags": e.tags or [],
            "created_at": e.created_at.isoformat() if e.created_at else None,
        } for e in entries]

        pattern_service = get_journal_pattern_service()
        patterns = pattern_service.analyze_patterns(entry_dicts)

        dashboard["journal_summary"] = {
            "total_entries": patterns.get("summary", {}).get("total_entries", 0),
            "mood_trend": patterns.get("mood_analysis", {}).get("trend", "stable"),
            "sentiment": patterns.get("content_analysis", {}).get("sentiment", {}).get("overall", "neutral"),
            "consistency": patterns.get("temporal_patterns", {}).get("journaling_consistency", {}),
            "top_themes": [t["theme"] for t in patterns.get("themes", [])[:3]],
        }
    else:
        dashboard["journal_summary"] = None

    return dashboard


def _get_universal_guidance(moon_phase: dict, today: date) -> str:
    """Generate universal guidance based on moon phase and day."""
    phase = moon_phase.get("phase", "")
    day_name = today.strftime("%A")

    guidance_map = {
        "New Moon": f"This {day_name}'s New Moon energy supports fresh starts and planting seeds for future growth.",
        "Waxing Crescent": f"Use this {day_name} to build momentum on projects initiated during the New Moon.",
        "First Quarter": f"This {day_name}'s First Quarter moon calls for decisive action and overcoming obstacles.",
        "Waxing Gibbous": f"Fine-tune your efforts this {day_name} as the moon builds toward fullness.",
        "Full Moon": f"This {day_name}'s Full Moon brings culmination, illumination, and heightened awareness.",
        "Waning Gibbous": f"This {day_name} is ideal for sharing insights and expressing gratitude.",
        "Last Quarter": f"Use this {day_name} to release what no longer serves you.",
        "Waning Crescent": f"This {day_name} calls for rest, reflection, and spiritual renewal.",
    }

    return guidance_map.get(phase, f"Embrace the cosmic flow this {day_name}.")
