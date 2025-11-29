"""
Chart management and calculation endpoints (single-user mode)

No user authentication - all charts belong to "the user"
"""
from typing import List, Dict, Any, Optional
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models import BirthData, Chart
from app.schemas import (
    ChartCreate,
    ChartUpdate,
    ChartResponse,
    ChartCalculationRequest,
    ChartCalculationResponse,
    Message,
)
from app.utils.ephemeris import EphemerisCalculator
from app.services.chart_calculator import NatalChartCalculator
from app.services.vedic_calculator import VedicChartCalculator
from app.core.config import settings

router = APIRouter()


# =============================================================================
# Chart CRUD Operations
# =============================================================================

@router.post("/", response_model=ChartResponse, status_code=status.HTTP_201_CREATED)
async def create_chart(
    chart_in: ChartCreate,
    db: Session = Depends(get_db)
):
    """
    Create a chart with pre-calculated data

    Creates a new chart record with pre-calculated chart data.
    For calculating a chart from birth data, use POST /charts/calculate
    No user ownership check needed.

    Args:
        chart_in: Chart creation data (includes calculated chart_data)
        db: Database session

    Returns:
        Created chart

    Raises:
        HTTPException 404: If birth data or client not found
    """
    # Verify birth data exists (convert UUID to string for SQLite)
    birth_data = db.query(BirthData).filter(BirthData.id == str(chart_in.birth_data_id)).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Create chart (no client_id in single-user mode)
    # Convert UUID to string for SQLite
    chart = Chart(
        birth_data_id=str(chart_in.birth_data_id),
        chart_name=chart_in.chart_name,
        chart_type=chart_in.chart_type,
        astro_system=chart_in.astro_system,
        house_system=chart_in.house_system,
        ayanamsa=chart_in.ayanamsa,
        zodiac_type=chart_in.zodiac_type,
        calculation_params=chart_in.calculation_params,
        chart_data=chart_in.chart_data
    )

    db.add(chart)
    db.commit()
    db.refresh(chart)

    return chart


@router.get("/", response_model=List[ChartResponse])
async def list_charts(
    skip: int = 0,
    limit: int = 100,
    chart_type: Optional[str] = Query(None, description="Filter by chart type"),
    astro_system: Optional[str] = Query(None, description="Filter by astrological system"),
    db: Session = Depends(get_db)
):
    """
    List all charts (single-user mode)

    Returns a paginated list of charts with optional filtering.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        chart_type: Filter by chart type (optional)
        astro_system: Filter by astrological system (optional)
        db: Database session

    Returns:
        List of charts
    """
    query = db.query(Chart)

    if chart_type:
        query = query.filter(Chart.chart_type == chart_type)

    if astro_system:
        query = query.filter(Chart.astro_system == astro_system)

    charts = query.offset(skip).limit(limit).all()

    return charts


@router.get("/{chart_id}", response_model=ChartResponse)
async def get_chart(
    chart_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get chart by ID

    Returns a specific chart's information and data.
    No user ownership check needed.

    Args:
        chart_id: Chart ID
        db: Database session

    Returns:
        Chart information and calculated data

    Raises:
        HTTPException 404: If chart not found
    """
    # Convert UUID to string for SQLite query (IDs stored as TEXT)
    chart = db.query(Chart).filter(Chart.id == str(chart_id)).first()

    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    # Update last viewed
    chart.update_last_viewed()
    db.commit()

    return chart


@router.put("/{chart_id}", response_model=ChartResponse)
async def update_chart(
    chart_id: UUID,
    chart_update: ChartUpdate,
    db: Session = Depends(get_db)
):
    """
    Update chart metadata

    Updates chart metadata (name, type, etc.) but not calculation data.
    To recalculate a chart, use POST /charts/calculate
    No user ownership check needed.

    Args:
        chart_id: Chart ID
        chart_update: Chart update data
        db: Database session

    Returns:
        Updated chart

    Raises:
        HTTPException 404: If chart not found
    """
    # Convert UUID to string for SQLite query (IDs stored as TEXT)
    chart = db.query(Chart).filter(Chart.id == str(chart_id)).first()

    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    # Update fields
    if chart_update.chart_name is not None:
        chart.chart_name = chart_update.chart_name

    if chart_update.chart_type is not None:
        chart.chart_type = chart_update.chart_type

    if chart_update.astro_system is not None:
        chart.astro_system = chart_update.astro_system

    if chart_update.house_system is not None:
        chart.house_system = chart_update.house_system

    if chart_update.ayanamsa is not None:
        chart.ayanamsa = chart_update.ayanamsa

    if chart_update.zodiac_type is not None:
        chart.zodiac_type = chart_update.zodiac_type

    if chart_update.calculation_params is not None:
        chart.calculation_params = chart_update.calculation_params

    db.commit()
    db.refresh(chart)

    return chart


@router.delete("/{chart_id}", response_model=Message)
async def delete_chart(
    chart_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete chart

    Permanently deletes a chart record.
    No user ownership check needed.

    Args:
        chart_id: Chart ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If chart not found
    """
    # Convert UUID to string for SQLite query (IDs stored as TEXT)
    chart = db.query(Chart).filter(Chart.id == str(chart_id)).first()

    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    db.delete(chart)
    db.commit()

    return {
        "message": "Chart deleted successfully",
        "detail": "Chart has been permanently removed"
    }


# =============================================================================
# Chart Calculation Endpoint
# =============================================================================

@router.post("/calculate", response_model=ChartCalculationResponse, status_code=status.HTTP_201_CREATED)
async def calculate_chart(
    calc_request: ChartCalculationRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate a new chart from birth data

    Calculates planetary positions, houses, and aspects from birth data
    and creates a new chart record. No user ownership check needed.

    Args:
        calc_request: Chart calculation request with birth data and options
        db: Database session

    Returns:
        Calculated chart with timing information

    Raises:
        HTTPException 404: If birth data not found
        HTTPException 400: If calculation fails
    """
    start_time = time.time()

    # Verify birth data exists (convert UUID to string for SQLite)
    birth_data = db.query(BirthData).filter(
        BirthData.id == str(calc_request.birth_data_id)
    ).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    try:
        # Calculate chart based on type
        if calc_request.chart_type == "natal":
            chart_data = await _calculate_natal_chart(
                birth_data,
                calc_request,
                settings
            )
        elif calc_request.chart_type == "transit":
            chart_data = await _calculate_transit_chart(
                birth_data,
                calc_request,
                settings
            )
        # Add more chart types here as needed
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chart type '{calc_request.chart_type}' not yet implemented"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chart calculation failed: {str(e)}"
        )

    # Create chart record (no client_id in single-user mode)
    # birth_data.id is already a string in SQLite
    chart = Chart(
        birth_data_id=birth_data.id,  # Already a string from SQLite
        chart_name=calc_request.chart_name,
        chart_type=calc_request.chart_type,
        astro_system=calc_request.astro_system,
        house_system=calc_request.house_system or "placidus",
        ayanamsa=calc_request.ayanamsa,
        zodiac_type=calc_request.zodiac_type,
        calculation_params={
            "include_asteroids": calc_request.include_asteroids,
            "include_fixed_stars": calc_request.include_fixed_stars,
            "include_arabic_parts": calc_request.include_arabic_parts,
            "custom_orbs": calc_request.custom_orbs,
            "include_nakshatras": calc_request.include_nakshatras,
            "include_western_aspects": calc_request.include_western_aspects,
            "include_minor_aspects": calc_request.include_minor_aspects
        },
        chart_data=chart_data
    )

    db.add(chart)
    db.commit()
    db.refresh(chart)

    # Calculate timing
    end_time = time.time()
    calculation_time_ms = (end_time - start_time) * 1000

    # Create response (single-user mode, no client_id)
    response_dict = {
        "id": chart.id,
        "birth_data_id": chart.birth_data_id,
        "chart_name": chart.chart_name,
        "chart_type": chart.chart_type,
        "astro_system": chart.astro_system,
        "house_system": chart.house_system,
        "ayanamsa": chart.ayanamsa,
        "zodiac_type": chart.zodiac_type,
        "calculation_params": chart.calculation_params,
        "chart_data": chart.chart_data,
        "last_viewed": chart.last_viewed,
        "created_at": chart.created_at,
        "updated_at": chart.updated_at,
        "calculation_time_ms": calculation_time_ms
    }

    return response_dict


# =============================================================================
# Helper Functions for Chart Calculations
# =============================================================================

async def _calculate_natal_chart(
    birth_data: BirthData,
    calc_request: ChartCalculationRequest,
    settings
) -> Dict[str, Any]:
    """Calculate natal chart using appropriate system (Western or Vedic)"""

    # Convert birth datetime (SQLite stores as strings)
    from datetime import datetime as dt, time as dt_time, date as dt_date

    # Parse date string to date object
    if isinstance(birth_data.birth_date, str):
        birth_date = dt.fromisoformat(birth_data.birth_date).date()
    else:
        birth_date = birth_data.birth_date

    # Parse time string to time object
    if birth_data.birth_time:
        if isinstance(birth_data.birth_time, str):
            birth_time = dt.fromisoformat(f"2000-01-01T{birth_data.birth_time}").time()
        else:
            birth_time = birth_data.birth_time
    else:
        birth_time = datetime.min.time()

    birth_datetime = datetime.combine(birth_date, birth_time)

    # Route to appropriate calculator based on astro_system
    if calc_request.astro_system == "vedic":
        # Calculate Vedic chart
        chart_data = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=birth_datetime,
            latitude=float(birth_data.latitude),
            longitude=float(birth_data.longitude),
            timezone_offset_minutes=birth_data.utc_offset or 0,
            ayanamsa=calc_request.ayanamsa or 'lahiri',
            house_system=calc_request.house_system or 'whole_sign',
            include_divisional=[1, 9],  # D-1 (Rasi) and D-9 (Navamsa) by default
            include_western_aspects=calc_request.include_western_aspects,
            include_minor_aspects=calc_request.include_minor_aspects,
            custom_orbs=calc_request.custom_orbs
        )
    else:
        # Calculate Western chart
        chart_data = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=birth_datetime,
            latitude=float(birth_data.latitude),
            longitude=float(birth_data.longitude),
            timezone_offset_minutes=birth_data.utc_offset or 0,
            house_system=calc_request.house_system or 'placidus',
            zodiac=calc_request.zodiac_type or 'tropical',
            ayanamsa=calc_request.ayanamsa or 'lahiri',
            include_minor_aspects=calc_request.include_minor_aspects,
            custom_orbs=calc_request.custom_orbs,
            include_nakshatras=calc_request.include_nakshatras
        )

    # Add metadata
    chart_data['calculation_method'] = "Swiss Ephemeris"
    chart_data['ephemeris_version'] = "SE 2.10"
    chart_data['astro_system'] = calc_request.astro_system

    return chart_data


# =============================================================================
# Get or Create Chart (for caching transit/progressed charts)
# =============================================================================

@router.post("/get-or-create", response_model=ChartCalculationResponse)
async def get_or_create_chart(
    calc_request: ChartCalculationRequest,
    db: Session = Depends(get_db)
):
    """
    Get an existing chart or create a new one if not found.

    This is useful for transit charts - it will find an existing transit chart
    for today, or create a new one. This enables caching and allows
    interpretations to be associated with specific chart instances.

    For transit charts:
    - If transit_date is not provided, uses current UTC time
    - Looks for existing chart calculated on the same day
    - Returns existing chart if found, otherwise calculates new one

    For natal charts:
    - Looks for existing natal chart with matching parameters
    - Returns existing if found, otherwise calculates new one
    """
    from datetime import datetime, date
    import time

    start_time = time.time()

    # Verify birth data exists
    birth_data = db.query(BirthData).filter(
        BirthData.id == str(calc_request.birth_data_id)
    ).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # For transit charts, default to current time if not provided
    if calc_request.chart_type == "transit" and not calc_request.transit_date:
        calc_request.transit_date = datetime.utcnow()

    # Try to find existing chart
    query = db.query(Chart).filter(
        Chart.birth_data_id == str(calc_request.birth_data_id),
        Chart.chart_type == calc_request.chart_type,
        Chart.astro_system == calc_request.astro_system
    )

    existing_chart = None

    if calc_request.chart_type == "transit" and calc_request.transit_date:
        # For transit charts, look for one calculated on the same day
        transit_date_str = calc_request.transit_date.date().isoformat()
        charts = query.all()

        for chart in charts:
            if chart.chart_data and "transit_date" in chart.chart_data:
                # Parse the stored transit date
                stored_date_str = chart.chart_data["transit_date"][:10]  # Get YYYY-MM-DD
                if stored_date_str == transit_date_str:
                    existing_chart = chart
                    break
    elif calc_request.chart_type == "natal":
        # For natal charts, just find any existing natal chart
        existing_chart = query.first()

    if existing_chart:
        # Return existing chart
        existing_chart.update_last_viewed()
        db.commit()

        end_time = time.time()
        calculation_time_ms = (end_time - start_time) * 1000

        return {
            "id": existing_chart.id,
            "birth_data_id": existing_chart.birth_data_id,
            "chart_name": existing_chart.chart_name,
            "chart_type": existing_chart.chart_type,
            "astro_system": existing_chart.astro_system,
            "house_system": existing_chart.house_system,
            "ayanamsa": existing_chart.ayanamsa,
            "zodiac_type": existing_chart.zodiac_type,
            "calculation_params": existing_chart.calculation_params,
            "chart_data": existing_chart.chart_data,
            "last_viewed": existing_chart.last_viewed,
            "created_at": existing_chart.created_at,
            "updated_at": existing_chart.updated_at,
            "calculation_time_ms": calculation_time_ms
        }

    # No existing chart found - calculate a new one
    try:
        if calc_request.chart_type == "natal":
            chart_data = await _calculate_natal_chart(birth_data, calc_request, settings)
        elif calc_request.chart_type == "transit":
            chart_data = await _calculate_transit_chart(birth_data, calc_request, settings)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chart type '{calc_request.chart_type}' not yet implemented for get-or-create"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chart calculation failed: {str(e)}"
        )

    # Create and save the new chart
    chart = Chart(
        birth_data_id=birth_data.id,
        chart_name=calc_request.chart_name or f"{calc_request.chart_type.title()} Chart",
        chart_type=calc_request.chart_type,
        astro_system=calc_request.astro_system,
        house_system=calc_request.house_system or "placidus",
        ayanamsa=calc_request.ayanamsa,
        zodiac_type=calc_request.zodiac_type,
        calculation_params={
            "include_asteroids": calc_request.include_asteroids,
            "include_fixed_stars": calc_request.include_fixed_stars,
            "include_arabic_parts": calc_request.include_arabic_parts,
            "custom_orbs": calc_request.custom_orbs,
            "include_nakshatras": calc_request.include_nakshatras,
            "include_western_aspects": calc_request.include_western_aspects,
            "include_minor_aspects": calc_request.include_minor_aspects
        },
        chart_data=chart_data
    )

    db.add(chart)
    db.commit()
    db.refresh(chart)

    end_time = time.time()
    calculation_time_ms = (end_time - start_time) * 1000

    return {
        "id": chart.id,
        "birth_data_id": chart.birth_data_id,
        "chart_name": chart.chart_name,
        "chart_type": chart.chart_type,
        "astro_system": chart.astro_system,
        "house_system": chart.house_system,
        "ayanamsa": chart.ayanamsa,
        "zodiac_type": chart.zodiac_type,
        "calculation_params": chart.calculation_params,
        "chart_data": chart.chart_data,
        "last_viewed": chart.last_viewed,
        "created_at": chart.created_at,
        "updated_at": chart.updated_at,
        "calculation_time_ms": calculation_time_ms
    }


async def _calculate_transit_chart(
    birth_data: BirthData,
    calc_request: ChartCalculationRequest,
    settings
) -> Dict[str, Any]:
    """Calculate transit chart"""

    if not calc_request.transit_date:
        raise ValueError("Transit date is required for transit chart calculation")

    # Calculate natal chart first
    natal_data = await _calculate_natal_chart(birth_data, calc_request, settings)

    # Calculate transiting planet positions
    transit_jd = EphemerisCalculator.datetime_to_julian_day(
        calc_request.transit_date,
        0  # Transits in UTC
    )

    flags = EphemerisCalculator.get_calc_flags(calc_request.zodiac_type)

    transit_planets = {}
    planet_list = list(EphemerisCalculator.PLANETS.keys())

    for planet_name in planet_list:
        try:
            planet_data = EphemerisCalculator.calculate_planet_position(
                planet_name,
                transit_jd,
                flags,
                calc_request.zodiac_type
            )
            transit_planets[planet_name] = planet_data
        except Exception as e:
            print(f"Error calculating transit {planet_name}: {e}")
            continue

    # Calculate aspects between transits and natal planets
    transit_aspects = []
    for transit_planet, transit_pos in transit_planets.items():
        for natal_planet, natal_pos in natal_data["planets"].items():
            aspect = EphemerisCalculator.calculate_aspect_between_planets(
                transit_pos["longitude"],
                natal_pos["longitude"],
                custom_orbs=calc_request.custom_orbs
            )
            if aspect:
                transit_aspects.append({
                    "transiting_planet": transit_planet,
                    "natal_planet": natal_planet,
                    "aspect_type": aspect["type"],
                    "orb": aspect["orb"],
                    "exact": aspect["exact"]
                })

    # Assemble transit chart data
    chart_data = {
        "natal": natal_data,
        "transit_planets": transit_planets,
        "transit_date": calc_request.transit_date.isoformat(),
        "transit_julian_day": transit_jd,
        "transit_aspects": transit_aspects,
        "calculation_method": "Swiss Ephemeris",
        "ephemeris_version": "SE 2.10"
    }

    return chart_data
