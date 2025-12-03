"""
Journal entry management endpoints (single-user mode)

Personal journal entries with tags, mood, and AI integration.
Part of Phase 2: Journal System.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from uuid import UUID
from datetime import date

from app.core.database_sqlite import get_db
from app.models import JournalEntry, BirthData, Chart
from app.schemas.journal import (
    JournalEntryCreate,
    JournalEntryUpdate,
    JournalEntryResponse,
    JournalEntryWithContext,
    JournalSearchRequest,
    JournalSearchResponse,
)
from app.schemas.common import Message

router = APIRouter()


@router.post("/", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    entry_in: JournalEntryCreate,
    db: Session = Depends(get_db)
):
    """
    Create new journal entry

    Creates a new journal entry with optional links to birth data and charts.

    Args:
        entry_in: Journal entry creation data
        db: Database session

    Returns:
        Created journal entry

    Raises:
        HTTPException 404: If linked birth_data or chart not found
    """
    # Validate birth_data_id if provided
    if entry_in.birth_data_id:
        birth_data = db.query(BirthData).filter(BirthData.id == str(entry_in.birth_data_id)).first()
        if not birth_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Birth data not found"
            )

    # Validate chart_id if provided
    if entry_in.chart_id:
        chart = db.query(Chart).filter(Chart.id == str(entry_in.chart_id)).first()
        if not chart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chart not found"
            )

    # Create entry
    entry = JournalEntry(
        birth_data_id=str(entry_in.birth_data_id) if entry_in.birth_data_id else None,
        chart_id=str(entry_in.chart_id) if entry_in.chart_id else None,
        entry_date=str(entry_in.entry_date),
        title=entry_in.title,
        content=entry_in.content,
        tags=entry_in.tags or [],
        mood=entry_in.mood,
        mood_score=str(entry_in.mood_score) if entry_in.mood_score else None,
        transit_context=str(entry_in.transit_context) if entry_in.transit_context else None,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


@router.get("/", response_model=List[JournalEntryResponse])
async def list_journal_entries(
    birth_data_id: Optional[UUID] = Query(None, description="Filter by birth data"),
    chart_id: Optional[UUID] = Query(None, description="Filter by chart"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    mood: Optional[str] = Query(None, description="Filter by mood"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    List journal entries with optional filters

    Returns journal entries matching the specified filters.

    Args:
        birth_data_id: Optional birth data filter
        chart_id: Optional chart filter
        tag: Optional tag filter
        mood: Optional mood filter
        date_from: Optional start date
        date_to: Optional end date
        limit: Maximum results
        offset: Pagination offset
        db: Database session

    Returns:
        List of journal entries
    """
    query = db.query(JournalEntry)

    # Apply filters
    if birth_data_id:
        query = query.filter(JournalEntry.birth_data_id == str(birth_data_id))
    if chart_id:
        query = query.filter(JournalEntry.chart_id == str(chart_id))
    if mood:
        query = query.filter(JournalEntry.mood == mood.lower())
    if date_from:
        query = query.filter(JournalEntry.entry_date >= str(date_from))
    if date_to:
        query = query.filter(JournalEntry.entry_date <= str(date_to))

    # Tag filtering (JSON array stored as TEXT in SQLite)
    if tag:
        # SQLite stores JSON arrays as strings like '["tag1","tag2"]'
        # Search for the quoted tag within the JSON string
        query = query.filter(JournalEntry.tags.like(f'%"{tag}"%'))

    # Order by date descending
    query = query.order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc())

    # Apply pagination
    entries = query.offset(offset).limit(limit).all()

    return entries


@router.get("/{entry_id}", response_model=JournalEntryWithContext)
async def get_journal_entry(
    entry_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get journal entry by ID

    Returns a specific journal entry with context.

    Args:
        entry_id: Journal entry ID
        db: Database session

    Returns:
        Journal entry with context

    Raises:
        HTTPException 404: If entry not found
    """
    entry = db.query(JournalEntry).filter(JournalEntry.id == str(entry_id)).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )

    # Build response with context
    response = entry.to_dict()
    response['preview'] = entry.preview

    # Add context from related objects
    if entry.chart:
        response['chart_name'] = entry.chart.display_name
    if entry.birth_data:
        response['birth_data_label'] = entry.birth_data.location_string or f"Birth Data {entry.birth_data.birth_date}"

    return response


@router.put("/{entry_id}", response_model=JournalEntryResponse)
async def update_journal_entry(
    entry_id: UUID,
    entry_in: JournalEntryUpdate,
    db: Session = Depends(get_db)
):
    """
    Update journal entry

    Updates an existing journal entry.

    Args:
        entry_id: Journal entry ID
        entry_in: Update data
        db: Database session

    Returns:
        Updated journal entry

    Raises:
        HTTPException 404: If entry not found
    """
    entry = db.query(JournalEntry).filter(JournalEntry.id == str(entry_id)).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )

    # Update fields
    update_data = entry_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'entry_date' and value:
            value = str(value)
        elif field == 'mood_score' and value:
            value = str(value)
        elif field in ('birth_data_id', 'chart_id') and value:
            value = str(value)
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)

    return entry


@router.delete("/{entry_id}", response_model=Message)
async def delete_journal_entry(
    entry_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete journal entry

    Permanently deletes a journal entry.

    Args:
        entry_id: Journal entry ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If entry not found
    """
    entry = db.query(JournalEntry).filter(JournalEntry.id == str(entry_id)).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )

    db.delete(entry)
    db.commit()

    return Message(message="Journal entry deleted successfully")


@router.post("/search", response_model=JournalSearchResponse)
async def search_journal_entries(
    search: JournalSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Search journal entries

    Full-text search across journal entries with filters.

    Args:
        search: Search parameters
        db: Database session

    Returns:
        Search results with pagination
    """
    query = db.query(JournalEntry)

    # Full-text search on content and title
    if search.query:
        search_term = f"%{search.query}%"
        query = query.filter(
            or_(
                JournalEntry.content.ilike(search_term),
                JournalEntry.title.ilike(search_term)
            )
        )

    # Apply filters
    if search.birth_data_id:
        query = query.filter(JournalEntry.birth_data_id == str(search.birth_data_id))
    if search.chart_id:
        query = query.filter(JournalEntry.chart_id == str(search.chart_id))
    if search.mood:
        query = query.filter(JournalEntry.mood == search.mood.lower())
    if search.date_from:
        query = query.filter(JournalEntry.entry_date >= str(search.date_from))
    if search.date_to:
        query = query.filter(JournalEntry.entry_date <= str(search.date_to))

    # Mood score range
    if search.mood_score_min:
        query = query.filter(JournalEntry.mood_score >= str(search.mood_score_min))
    if search.mood_score_max:
        query = query.filter(JournalEntry.mood_score <= str(search.mood_score_max))

    # Tag filtering (JSON array stored as TEXT in SQLite)
    if search.tags:
        for tag in search.tags:
            query = query.filter(JournalEntry.tags.like(f'%"{tag}"%'))

    # Get total count
    total = query.count()

    # Order and paginate
    query = query.order_by(JournalEntry.entry_date.desc())
    entries = query.offset(search.offset).limit(search.limit).all()

    return JournalSearchResponse(
        entries=entries,
        total=total,
        limit=search.limit,
        offset=search.offset
    )


@router.get("/tags/all", response_model=List[str])
async def get_all_tags(db: Session = Depends(get_db)):
    """
    Get all unique tags

    Returns a list of all unique tags used in journal entries.

    Args:
        db: Database session

    Returns:
        List of unique tags
    """
    entries = db.query(JournalEntry.tags).all()
    all_tags = set()
    for (tags,) in entries:
        if tags:
            all_tags.update(tags)
    return sorted(list(all_tags))


@router.get("/moods/all", response_model=List[str])
async def get_all_moods(db: Session = Depends(get_db)):
    """
    Get all unique moods

    Returns a list of all unique moods used in journal entries.

    Args:
        db: Database session

    Returns:
        List of unique moods
    """
    entries = db.query(JournalEntry.mood).distinct().all()
    return sorted([mood for (mood,) in entries if mood])
