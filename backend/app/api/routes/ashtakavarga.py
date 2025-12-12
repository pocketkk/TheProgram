"""
Ashtakavarga API Routes

Endpoints for calculating Ashtakavarga (8-fold strength) in Vedic astrology.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.birth_data import BirthData
from app.models.chart import Chart
from app.services.ashtakavarga_calculator import AshtakavargaCalculator
from app.services.vedic_calculator import VedicChartCalculator
from app.schemas.ashtakavarga import (
    AshtakavargaRequest,
    AshtakavargaFromChartRequest,
    AshtakavargaResponse,
    TransitScoreRequest,
    TransitScoreResponse,
)

router = APIRouter()


@router.post("/calculate", response_model=AshtakavargaResponse)
async def calculate_ashtakavarga(request: AshtakavargaRequest, db: Session = Depends(get_db)):
    """
    Calculate Ashtakavarga from birth data.

    Returns both Bhinnashtakavarga (individual planets) and
    Sarvashtakavarga (combined totals) with analysis.
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

    # Calculate Ashtakavarga
    try:
        result = AshtakavargaCalculator.calculate(
            planets=planets,
            ascendant=ascendant
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate Ashtakavarga: {str(e)}"
        )


@router.post("/calculate-from-chart", response_model=AshtakavargaResponse)
async def calculate_ashtakavarga_from_chart(request: AshtakavargaFromChartRequest, db: Session = Depends(get_db)):
    """
    Calculate Ashtakavarga from an existing chart.
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

    # Calculate Ashtakavarga
    try:
        result = AshtakavargaCalculator.calculate(
            planets=planets,
            ascendant=ascendant
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate Ashtakavarga: {str(e)}"
        )


@router.get("/birth-data/{birth_data_id}")
async def get_ashtakavarga_for_birth_data(
    birth_data_id: str,
    ayanamsa: str = "lahiri",
    db: Session = Depends(get_db)
):
    """
    Get Ashtakavarga for a birth data record (convenience GET endpoint).
    """
    request = AshtakavargaRequest(
        birth_data_id=birth_data_id,
        ayanamsa=ayanamsa
    )
    return await calculate_ashtakavarga(request, db)


@router.post("/transit-score", response_model=TransitScoreResponse)
async def get_transit_score(request: TransitScoreRequest, db: Session = Depends(get_db)):
    """
    Get transit quality score for a planet transiting a specific sign.

    Useful for timing analysis and transit predictions.
    """
    # First calculate Ashtakavarga
    av_request = AshtakavargaRequest(
        birth_data_id=request.birth_data_id,
        ayanamsa=request.ayanamsa
    )

    # Get birth data and calculate
    birth_data = db.query(BirthData).filter(BirthData.id == request.birth_data_id).first()
    if not birth_data:
        raise HTTPException(status_code=404, detail="Birth data not found")

    # Get or calculate chart data
    chart = db.query(Chart).filter(
        Chart.birth_data_id == request.birth_data_id,
        Chart.chart_type == 'vedic'
    ).first()

    if chart and chart.chart_data:
        chart_data = chart.chart_data
    else:
        try:
            from datetime import datetime
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

    # Calculate Ashtakavarga
    d1_data = chart_data.get('d1', chart_data)
    planets = d1_data.get('planets', {})
    ascendant = d1_data.get('houses', {}).get('ascendant', 0)

    av_result = AshtakavargaCalculator.calculate(planets, ascendant)
    sarva_bindus = av_result['sarvashtakavarga']['bindus_by_sign']

    # Get transit score
    transit_score = AshtakavargaCalculator.get_transit_score(
        sarva_bindus,
        request.transit_sign
    )

    return transit_score
