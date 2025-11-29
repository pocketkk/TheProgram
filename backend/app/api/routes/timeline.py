"""
Timeline management endpoints (single-user mode)

User events and transit context for timeline visualization.
Part of Phase 2: Transit Timeline.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, timedelta

from app.core.database_sqlite import get_db
from app.models import UserEvent, TransitContext, BirthData
from app.schemas.timeline import (
    UserEventCreate,
    UserEventUpdate,
    UserEventResponse,
    UserEventWithTransits,
    TransitContextCreate,
    TransitContextUpdate,
    TransitContextResponse,
    TimelineRangeRequest,
    TimelineRangeResponse,
    TimelineDataPoint,
)
from app.schemas.common import Message

router = APIRouter()


# =============================================================================
# User Event Endpoints
# =============================================================================

@router.post("/events", response_model=UserEventResponse, status_code=status.HTTP_201_CREATED)
async def create_user_event(
    event_in: UserEventCreate,
    db: Session = Depends(get_db)
):
    """
    Create new user event

    Creates a new life event for timeline tracking.

    Args:
        event_in: Event creation data
        db: Database session

    Returns:
        Created user event

    Raises:
        HTTPException 404: If birth_data not found
    """
    # Validate birth_data_id
    birth_data = db.query(BirthData).filter(BirthData.id == str(event_in.birth_data_id)).first()
    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Create event
    event = UserEvent(
        birth_data_id=str(event_in.birth_data_id),
        event_date=str(event_in.event_date),
        event_time=event_in.event_time,
        title=event_in.title,
        description=event_in.description,
        category=event_in.category,
        importance=event_in.importance,
        tags=event_in.tags or [],
        is_recurring=event_in.is_recurring,
        recurrence_pattern=event_in.recurrence_pattern,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


@router.get("/events", response_model=List[UserEventResponse])
async def list_user_events(
    birth_data_id: Optional[UUID] = Query(None, description="Filter by birth data"),
    category: Optional[str] = Query(None, description="Filter by category"),
    importance: Optional[str] = Query(None, description="Filter by importance"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    List user events with optional filters

    Returns user events matching the specified filters.

    Args:
        birth_data_id: Optional birth data filter
        category: Optional category filter
        importance: Optional importance filter
        date_from: Optional start date
        date_to: Optional end date
        limit: Maximum results
        offset: Pagination offset
        db: Database session

    Returns:
        List of user events
    """
    query = db.query(UserEvent)

    # Apply filters
    if birth_data_id:
        query = query.filter(UserEvent.birth_data_id == str(birth_data_id))
    if category:
        query = query.filter(UserEvent.category == category.lower())
    if importance:
        query = query.filter(UserEvent.importance == importance.lower())
    if date_from:
        query = query.filter(UserEvent.event_date >= str(date_from))
    if date_to:
        query = query.filter(UserEvent.event_date <= str(date_to))

    # Order by date
    query = query.order_by(UserEvent.event_date.desc())

    # Apply pagination
    events = query.offset(offset).limit(limit).all()

    return events


@router.get("/events/{event_id}", response_model=UserEventWithTransits)
async def get_user_event(
    event_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get user event by ID

    Returns a specific user event with transit context.

    Args:
        event_id: Event ID
        db: Database session

    Returns:
        User event with transit context

    Raises:
        HTTPException 404: If event not found
    """
    event = db.query(UserEvent).filter(UserEvent.id == str(event_id)).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User event not found"
        )

    # Get transit context if exists
    transit_context = db.query(TransitContext).filter(
        TransitContext.user_event_id == str(event_id)
    ).first()

    response = event.to_dict()
    if transit_context:
        response['transit_context'] = transit_context.to_dict()

    return response


@router.put("/events/{event_id}", response_model=UserEventResponse)
async def update_user_event(
    event_id: UUID,
    event_in: UserEventUpdate,
    db: Session = Depends(get_db)
):
    """
    Update user event

    Updates an existing user event.

    Args:
        event_id: Event ID
        event_in: Update data
        db: Database session

    Returns:
        Updated user event

    Raises:
        HTTPException 404: If event not found
    """
    event = db.query(UserEvent).filter(UserEvent.id == str(event_id)).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User event not found"
        )

    # Update fields
    update_data = event_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'event_date' and value:
            value = str(value)
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    return event


@router.delete("/events/{event_id}", response_model=Message)
async def delete_user_event(
    event_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete user event

    Permanently deletes a user event and associated transit context.

    Args:
        event_id: Event ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If event not found
    """
    event = db.query(UserEvent).filter(UserEvent.id == str(event_id)).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User event not found"
        )

    db.delete(event)
    db.commit()

    return Message(message="User event deleted successfully")


# =============================================================================
# Transit Context Endpoints
# =============================================================================

@router.post("/transit-context", response_model=TransitContextResponse, status_code=status.HTTP_201_CREATED)
async def create_transit_context(
    context_in: TransitContextCreate,
    db: Session = Depends(get_db)
):
    """
    Create transit context for a date

    Creates a new transit context record.

    Args:
        context_in: Transit context data
        db: Database session

    Returns:
        Created transit context

    Raises:
        HTTPException 404: If birth_data or event not found
    """
    # Validate birth_data_id
    birth_data = db.query(BirthData).filter(BirthData.id == str(context_in.birth_data_id)).first()
    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Validate user_event_id if provided
    if context_in.user_event_id:
        event = db.query(UserEvent).filter(UserEvent.id == str(context_in.user_event_id)).first()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User event not found"
            )

    # Create context
    context = TransitContext(
        birth_data_id=str(context_in.birth_data_id),
        user_event_id=str(context_in.user_event_id) if context_in.user_event_id else None,
        context_date=str(context_in.context_date),
        transit_data=context_in.transit_data,
        significant_transits=context_in.significant_transits,
    )

    db.add(context)
    db.commit()
    db.refresh(context)

    return context


@router.get("/transit-context/{context_id}", response_model=TransitContextResponse)
async def get_transit_context(
    context_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get transit context by ID

    Returns a specific transit context.

    Args:
        context_id: Context ID
        db: Database session

    Returns:
        Transit context

    Raises:
        HTTPException 404: If context not found
    """
    context = db.query(TransitContext).filter(TransitContext.id == str(context_id)).first()
    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transit context not found"
        )

    return context


@router.get("/transit-context/date/{birth_data_id}/{context_date}", response_model=TransitContextResponse)
async def get_transit_context_by_date(
    birth_data_id: UUID,
    context_date: date,
    db: Session = Depends(get_db)
):
    """
    Get or create transit context for a specific date

    Returns existing transit context or creates a new one.

    Args:
        birth_data_id: Birth data ID
        context_date: Date for context
        db: Database session

    Returns:
        Transit context

    Raises:
        HTTPException 404: If birth_data not found
    """
    # Validate birth_data
    birth_data = db.query(BirthData).filter(BirthData.id == str(birth_data_id)).first()
    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    # Look for existing context
    context = db.query(TransitContext).filter(
        TransitContext.birth_data_id == str(birth_data_id),
        TransitContext.context_date == str(context_date)
    ).first()

    if not context:
        # Create new context (transit calculation would happen in service layer)
        context = TransitContext(
            birth_data_id=str(birth_data_id),
            context_date=str(context_date),
        )
        db.add(context)
        db.commit()
        db.refresh(context)

    return context


@router.put("/transit-context/{context_id}", response_model=TransitContextResponse)
async def update_transit_context(
    context_id: UUID,
    context_in: TransitContextUpdate,
    db: Session = Depends(get_db)
):
    """
    Update transit context

    Updates an existing transit context with new data.

    Args:
        context_id: Context ID
        context_in: Update data
        db: Database session

    Returns:
        Updated transit context

    Raises:
        HTTPException 404: If context not found
    """
    context = db.query(TransitContext).filter(TransitContext.id == str(context_id)).first()
    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transit context not found"
        )

    # Update fields
    update_data = context_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(context, field, value)

    db.commit()
    db.refresh(context)

    return context


# =============================================================================
# Timeline View Endpoints
# =============================================================================

@router.post("/range", response_model=TimelineRangeResponse)
async def get_timeline_range(
    request: TimelineRangeRequest,
    db: Session = Depends(get_db)
):
    """
    Get timeline data for a date range

    Returns events and transit contexts for the specified range.

    Args:
        request: Timeline range request
        db: Database session

    Returns:
        Timeline data with events and transits

    Raises:
        HTTPException 404: If birth_data not found
    """
    # Validate birth_data
    birth_data = db.query(BirthData).filter(BirthData.id == str(request.birth_data_id)).first()
    if not birth_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth data not found"
        )

    data_points = []
    current_date = request.start_date

    while current_date <= request.end_date:
        # Get events for this date
        events = []
        if request.include_events:
            event_query = db.query(UserEvent).filter(
                UserEvent.birth_data_id == str(request.birth_data_id),
                UserEvent.event_date == str(current_date)
            )
            if request.event_categories:
                event_query = event_query.filter(UserEvent.category.in_(request.event_categories))
            events = event_query.all()

        # Get transit context for this date
        transit_context = None
        if request.include_transits:
            transit_context = db.query(TransitContext).filter(
                TransitContext.birth_data_id == str(request.birth_data_id),
                TransitContext.context_date == str(current_date)
            ).first()

        # Create data point
        data_point = TimelineDataPoint(
            date=current_date,
            events=events,
            transit_context=transit_context,
            significant_transits=transit_context.significant_transits if transit_context and transit_context.significant_transits else [],
            lunar_phase=None  # Would be calculated by transit service
        )
        data_points.append(data_point)

        current_date += timedelta(days=1)

    return TimelineRangeResponse(
        birth_data_id=request.birth_data_id,
        start_date=request.start_date,
        end_date=request.end_date,
        data_points=data_points,
        upcoming_significant_transits=[],  # Would be populated by transit service
        active_long_term_transits=[]  # Would be populated by transit service
    )


@router.get("/categories", response_model=List[str])
async def get_event_categories(db: Session = Depends(get_db)):
    """
    Get all unique event categories

    Returns a list of all categories used in events.

    Args:
        db: Database session

    Returns:
        List of unique categories
    """
    categories = db.query(UserEvent.category).distinct().all()
    return sorted([cat for (cat,) in categories if cat])


@router.get("/importance-levels", response_model=List[str])
async def get_importance_levels():
    """
    Get valid importance levels

    Returns the list of valid importance levels.

    Returns:
        List of importance levels
    """
    return ["minor", "moderate", "major", "transformative"]
