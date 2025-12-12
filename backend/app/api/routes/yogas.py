"""
Yogas API Routes

Endpoints for detecting planetary yogas (combinations) in Vedic astrology.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.birth_data import BirthData
from app.models.chart import Chart
from app.services.yogas_calculator import YogasCalculator
from app.services.vedic_calculator import VedicChartCalculator
from app.schemas.yogas import (
    YogasRequest,
    YogasFromChartRequest,
    YogasResponse,
)

router = APIRouter()


@router.post("/calculate", response_model=YogasResponse)
async def calculate_yogas(request: YogasRequest, db: Session = Depends(get_db)):
    """
    Calculate and detect yogas from birth data.

    This endpoint:
    1. Retrieves birth data from the database
    2. Calculates the Vedic chart if needed
    3. Detects all applicable yogas
    """
    # Get birth data
    birth_data = db.query(BirthData).filter(BirthData.id == request.birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Check for existing Vedic chart
    chart = db.query(Chart).filter(
        Chart.birth_data_id == request.birth_data_id,
        Chart.chart_type == 'vedic'
    ).first()

    if chart and chart.chart_data:
        chart_data = chart.chart_data
    else:
        # Calculate Vedic chart
        try:
            from datetime import datetime, date, time
            # Handle date/time that may be stored as strings in SQLite
            if isinstance(birth_data.birth_date, str):
                bd = datetime.strptime(birth_data.birth_date, "%Y-%m-%d").date()
            else:
                bd = birth_data.birth_date

            if isinstance(birth_data.birth_time, str):
                bt = datetime.strptime(birth_data.birth_time, "%H:%M:%S").time()
            else:
                bt = birth_data.birth_time

            birth_datetime = datetime.combine(bd, bt)

            calculator = VedicChartCalculator()
            chart_data = calculator.calculate_vedic_chart(
                birth_datetime=birth_datetime,
                latitude=birth_data.latitude,
                longitude=birth_data.longitude,
                ayanamsa=request.ayanamsa
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to calculate chart: {str(e)}"
            )

    # Extract planet and ascendant data
    d1_data = chart_data.get('d1', chart_data)
    planets = d1_data.get('planets', {})
    ascendant = d1_data.get('houses', {}).get('ascendant', 0)
    dignities = d1_data.get('dignities', {})

    # Detect yogas
    try:
        result = YogasCalculator.detect_all_yogas(
            planets=planets,
            ascendant=ascendant,
            dignities=dignities,
            include_weak=request.include_weak
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to detect yogas: {str(e)}"
        )


@router.post("/calculate-from-chart", response_model=YogasResponse)
async def calculate_yogas_from_chart(request: YogasFromChartRequest, db: Session = Depends(get_db)):
    """
    Calculate yogas from an existing chart.
    """
    # Get chart
    chart = db.query(Chart).filter(Chart.id == request.chart_id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    if not chart.chart_data:
        raise HTTPException(status_code=400, detail="Chart has no calculation data")

    # Extract planet and ascendant data
    chart_data = chart.chart_data
    d1_data = chart_data.get('d1', chart_data)
    planets = d1_data.get('planets', {})
    ascendant = d1_data.get('houses', {}).get('ascendant', 0)
    dignities = d1_data.get('dignities', {})

    # Detect yogas
    try:
        result = YogasCalculator.detect_all_yogas(
            planets=planets,
            ascendant=ascendant,
            dignities=dignities,
            include_weak=request.include_weak
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to detect yogas: {str(e)}"
        )


@router.get("/birth-data/{birth_data_id}")
async def get_yogas_for_birth_data(
    birth_data_id: str,
    ayanamsa: str = "lahiri",
    include_weak: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get yogas for a birth data record (convenience GET endpoint).
    """
    request = YogasRequest(
        birth_data_id=birth_data_id,
        ayanamsa=ayanamsa,
        include_weak=include_weak
    )
    return await calculate_yogas(request, db)
