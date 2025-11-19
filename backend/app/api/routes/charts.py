"""
Chart management and calculation endpoints
"""
from typing import List, Dict, Any
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models import User, BirthData, Chart
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a chart with pre-calculated data

    Creates a new chart record with pre-calculated chart data.
    For calculating a chart from birth data, use POST /charts/calculate

    Args:
        chart_in: Chart creation data (includes calculated chart_data)
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created chart

    Raises:
        HTTPException 404: If birth data or client not found
        HTTPException 403: If resources don't belong to user
    """
    # Verify birth data exists and belongs to user
    birth_data = db.query(BirthData).filter(BirthData.id == chart_in.birth_data_id).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Check ownership through client
    client = db.query(Client).filter(Client.id == birth_data.client_id).first()
    if not client or client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create chart for this birth data"
        )

    # Verify client_id if provided
    if chart_in.client_id and chart_in.client_id != birth_data.client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client ID does not match birth data's client"
        )

    # Create chart
    chart = Chart(
        user_id=current_user.id,
        client_id=chart_in.client_id or birth_data.client_id,
        birth_data_id=chart_in.birth_data_id,
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
    chart_type: str = None,
    astro_system: str = None,
    client_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List charts for current user

    Returns a paginated list of charts with optional filtering.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        chart_type: Filter by chart type (optional)
        astro_system: Filter by astrological system (optional)
        client_id: Filter by client ID (optional)
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of charts
    """
    query = db.query(Chart).filter(Chart.user_id == current_user.id)

    if chart_type:
        query = query.filter(Chart.chart_type == chart_type)

    if astro_system:
        query = query.filter(Chart.astro_system == astro_system)

    if client_id:
        query = query.filter(Chart.client_id == client_id)

    charts = query.offset(skip).limit(limit).all()

    return charts


@router.get("/{chart_id}", response_model=ChartResponse)
async def get_chart(
    chart_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get chart by ID

    Returns a specific chart's information and data.

    Args:
        chart_id: Chart ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Chart information and calculated data

    Raises:
        HTTPException 404: If chart not found
        HTTPException 403: If chart doesn't belong to user
    """
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    # Check ownership
    if chart.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this chart"
        )

    # Update last viewed
    chart.update_last_viewed()
    db.commit()

    return chart


@router.put("/{chart_id}", response_model=ChartResponse)
async def update_chart(
    chart_id: UUID,
    chart_update: ChartUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update chart metadata

    Updates chart metadata (name, type, etc.) but not calculation data.
    To recalculate a chart, use POST /charts/calculate

    Args:
        chart_id: Chart ID
        chart_update: Chart update data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated chart

    Raises:
        HTTPException 404: If chart not found
        HTTPException 403: If chart doesn't belong to user
    """
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    # Check ownership
    if chart.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this chart"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete chart

    Permanently deletes a chart record.

    Args:
        chart_id: Chart ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Success message

    Raises:
        HTTPException 404: If chart not found
        HTTPException 403: If chart doesn't belong to user
    """
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    # Check ownership
    if chart.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this chart"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate a new chart from birth data

    Calculates planetary positions, houses, and aspects from birth data
    and creates a new chart record.

    Args:
        calc_request: Chart calculation request with birth data and options
        db: Database session
        current_user: Current authenticated user

    Returns:
        Calculated chart with timing information

    Raises:
        HTTPException 404: If birth data not found
        HTTPException 403: If birth data doesn't belong to user
        HTTPException 400: If calculation fails
    """
    start_time = time.time()

    # Verify birth data exists and belongs to user
    birth_data = db.query(BirthData).filter(
        BirthData.id == calc_request.birth_data_id
    ).first()

    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Check ownership through client
    client = db.query(Client).filter(Client.id == birth_data.client_id).first()
    if not client or client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to calculate chart for this birth data"
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

    # Create chart record
    chart = Chart(
        user_id=current_user.id,
        client_id=birth_data.client_id,
        birth_data_id=birth_data.id,
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
            "custom_orbs": calc_request.custom_orbs
        },
        chart_data=chart_data
    )

    db.add(chart)
    db.commit()
    db.refresh(chart)

    # Calculate timing
    end_time = time.time()
    calculation_time_ms = (end_time - start_time) * 1000

    # Create response
    response_dict = {
        "id": chart.id,
        "user_id": chart.user_id,
        "client_id": chart.client_id,
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

    # Convert birth datetime
    birth_datetime = datetime.combine(
        birth_data.birth_date,
        birth_data.birth_time or datetime.min.time()
    )

    # Route to appropriate calculator based on astro_system
    if calc_request.astro_system == "vedic":
        # Calculate Vedic chart
        chart_data = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=birth_datetime,
            latitude=float(birth_data.latitude),
            longitude=float(birth_data.longitude),
            timezone_offset_minutes=birth_data.utc_offset or 0,
            ayanamsa=calc_request.ayanamsa or 'lahiri',
            include_divisional=[1, 9]  # D-1 (Rasi) and D-9 (Navamsa) by default
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
            include_minor_aspects=True,
            custom_orbs=calc_request.custom_orbs
        )

    # Add metadata
    chart_data['calculation_method'] = "Swiss Ephemeris"
    chart_data['ephemeris_version'] = "SE 2.10"
    chart_data['astro_system'] = calc_request.astro_system

    return chart_data


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
