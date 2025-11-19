"""
Chart interpretation endpoints for AI-generated descriptions (single-user mode)

No user authentication - all interpretations belong to "the user"
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
import logging

from app.core.database_sqlite import get_db
from app.models_sqlite import Chart, ChartInterpretation
from app.schemas_sqlite import (
    ChartInterpretationCreate,
    ChartInterpretationUpdate,
    ChartInterpretationResponse,
    GenerateInterpretationRequest,
    GenerateInterpretationResponse,
    Message,
)
from app.services.ai_interpreter import AIInterpreter

router = APIRouter()
logger = logging.getLogger(__name__)


# =============================================================================
# Chart Interpretation Operations
# =============================================================================

@router.get("/{chart_id}/interpretations", response_model=List[ChartInterpretationResponse])
async def get_chart_interpretations(
    chart_id: UUID,
    element_type: Optional[str] = Query(None, description="Filter by element type"),
    db: Session = Depends(get_db)
):
    """
    Get all AI interpretations for a chart

    No user ownership check needed.

    Args:
        chart_id: Chart ID
        element_type: Optional filter by element type (planet, house, aspect, pattern)
        db: Database session

    Returns:
        List of chart interpretations

    Raises:
        HTTPException 404: If chart not found
    """
    # Verify chart exists (convert UUID to string for SQLite)
    chart = db.query(Chart).filter(Chart.id == str(chart_id)).first()
    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    # Query interpretations (convert UUID to string for SQLite)
    query = db.query(ChartInterpretation).filter(ChartInterpretation.chart_id == str(chart_id))

    if element_type:
        query = query.filter(ChartInterpretation.element_type == element_type.lower())

    interpretations = query.order_by(
        ChartInterpretation.element_type,
        ChartInterpretation.element_key
    ).all()

    return interpretations


@router.post("/{chart_id}/interpretations/generate", response_model=GenerateInterpretationResponse)
async def generate_chart_interpretations(
    chart_id: UUID,
    request: GenerateInterpretationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate AI interpretations for chart elements with parallel processing

    Now with ASYNC PARALLEL PROCESSING - 10x faster
    - Processes 10 interpretations at a time concurrently
    - 100+ interpretations in ~1-2 minutes instead of 10+ minutes

    No user ownership check needed.

    Args:
        chart_id: Chart ID
        request: Generation request parameters
        db: Database session

    Returns:
        Generation response with created interpretations

    Raises:
        HTTPException 404: If chart not found
        HTTPException 500: If AI generation fails
    """
    # Verify chart exists (convert UUID to string for SQLite)
    chart = db.query(Chart).filter(Chart.id == str(chart_id)).first()
    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    # Initialize AI interpreter
    try:
        ai_interpreter = AIInterpreter(model=request.ai_model or "claude-haiku-4-5-20251001")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

    # Generate interpretations
    element_types = request.element_types or ["planet", "house", "aspect", "pattern"]
    errors = []
    generated_count = 0
    skipped_count = 0
    created_interpretations = []

    try:
        # Generate batch interpretations with async/parallel processing
        logger.info(f"Starting parallel interpretation generation for {len(element_types)} element types")

        results = await ai_interpreter.generate_batch_interpretations_async(
            chart.chart_data,
            element_types=element_types
        )

        logger.info(f"Completed generation, processing results...")

        # Store in database
        for element_type, interpretations in results.items():
            for interp in interpretations:
                element_key = interp["element_key"]

                # Check if interpretation already exists (convert UUID to string for SQLite)
                existing = db.query(ChartInterpretation).filter(
                    and_(
                        ChartInterpretation.chart_id == str(chart_id),
                        ChartInterpretation.element_type == element_type,
                        ChartInterpretation.element_key == element_key
                    )
                ).first()

                if existing and not request.regenerate_existing:
                    skipped_count += 1
                    continue

                if existing:
                    # Update existing (create new version)
                    existing.ai_description = interp["description"]
                    existing.ai_model = request.ai_model or "claude-3-5-sonnet-20241022"
                    existing.version += 1
                    db.commit()
                    db.refresh(existing)
                    created_interpretations.append(existing)
                    generated_count += 1
                else:
                    # Create new interpretation (convert UUID to string for SQLite)
                    new_interp = ChartInterpretation(
                        chart_id=str(chart_id),
                        element_type=element_type,
                        element_key=element_key,
                        ai_description=interp["description"],
                        ai_model=request.ai_model or "claude-3-5-sonnet-20241022",
                        ai_prompt_version="v1.0",
                        version=1,
                        is_approved="pending"
                    )
                    db.add(new_interp)
                    db.commit()
                    db.refresh(new_interp)
                    created_interpretations.append(new_interp)
                    generated_count += 1

    except Exception as e:
        logger.error(f"Error generating interpretations: {e}")
        errors.append(str(e))

    return GenerateInterpretationResponse(
        chart_id=chart_id,
        generated_count=generated_count,
        skipped_count=skipped_count,
        interpretations=created_interpretations,
        errors=errors if errors else None
    )


@router.get("/interpretations/{interpretation_id}", response_model=ChartInterpretationResponse)
async def get_interpretation(
    interpretation_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get a specific interpretation

    No user ownership check needed.

    Args:
        interpretation_id: Interpretation ID
        db: Database session

    Returns:
        Chart interpretation

    Raises:
        HTTPException 404: If interpretation not found
    """
    # Convert UUID to string for SQLite query
    interp = db.query(ChartInterpretation).filter(
        ChartInterpretation.id == str(interpretation_id)
    ).first()

    if not interp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpretation not found"
        )

    return interp


@router.patch("/interpretations/{interpretation_id}", response_model=ChartInterpretationResponse)
async def update_interpretation(
    interpretation_id: UUID,
    update_data: ChartInterpretationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an interpretation

    No user ownership check needed.

    Args:
        interpretation_id: Interpretation ID
        update_data: Update data
        db: Database session

    Returns:
        Updated interpretation

    Raises:
        HTTPException 404: If interpretation not found
    """
    # Convert UUID to string for SQLite query
    interp = db.query(ChartInterpretation).filter(
        ChartInterpretation.id == str(interpretation_id)
    ).first()

    if not interp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpretation not found"
        )

    # Update fields
    if update_data.ai_description is not None:
        interp.ai_description = update_data.ai_description

    if update_data.is_approved is not None:
        interp.is_approved = update_data.is_approved

    db.commit()
    db.refresh(interp)

    return interp


@router.delete("/interpretations/{interpretation_id}", response_model=Message)
async def delete_interpretation(
    interpretation_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete an interpretation

    No user ownership check needed.

    Args:
        interpretation_id: Interpretation ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If interpretation not found
    """
    # Convert UUID to string for SQLite query
    interp = db.query(ChartInterpretation).filter(
        ChartInterpretation.id == str(interpretation_id)
    ).first()

    if not interp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interpretation not found"
        )

    db.delete(interp)
    db.commit()

    return Message(message="Interpretation deleted successfully")
