"""
Contemplative Cosmic Paper API Routes

API endpoints for the contemplative newspaper features including
lineage tracking, dream journal, synchronicity, witness log,
and the unified contemplative newspaper generation.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.services.lineage_service import get_lineage_service
from app.services.dream_service import get_dream_service
from app.services.synchronicity_service import get_synchronicity_service
from app.services.chart_weather_service import get_chart_weather_service
from app.services.contemplative_newspaper_service import get_contemplative_newspaper_service
from app.models.unread_archive import UnreadArchiveItem
from app.models.witness_entry import WitnessEntry

router = APIRouter(prefix="/contemplative", tags=["Contemplative"])


# =============================================================================
# Schemas
# =============================================================================

class LineageMemberCreate(BaseModel):
    name: str
    relationship: str
    birth_date: Optional[str] = None
    birth_year: Optional[int] = None
    death_date: Optional[str] = None
    death_year: Optional[int] = None
    birth_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    notes: Optional[str] = None
    life_events: Optional[List[dict]] = None
    generation: Optional[int] = 0
    is_ancestor: bool = True


class LineageMemberUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    birth_date: Optional[str] = None
    birth_year: Optional[int] = None
    death_date: Optional[str] = None
    death_year: Optional[int] = None
    birth_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    notes: Optional[str] = None
    life_events: Optional[List[dict]] = None
    generation: Optional[int] = None
    is_ancestor: Optional[bool] = None


class LifeEventCreate(BaseModel):
    date: str
    event: str
    age: Optional[int] = None


class DreamCreate(BaseModel):
    dream_date: str
    narrative: str
    title: Optional[str] = None
    symbols: Optional[List[str]] = None
    themes: Optional[List[str]] = None
    emotions: Optional[List[str]] = None
    characters: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    lucidity_level: Optional[int] = None
    vividness: Optional[int] = None
    emotional_intensity: Optional[int] = None
    recurring: bool = False
    recurring_pattern: Optional[str] = None
    interpretation: Optional[str] = None
    mood_before_sleep: Optional[str] = None
    mood_upon_waking: Optional[str] = None
    sleep_quality: Optional[int] = None
    moon_phase: Optional[str] = None


class DreamUpdate(BaseModel):
    title: Optional[str] = None
    narrative: Optional[str] = None
    symbols: Optional[List[str]] = None
    themes: Optional[List[str]] = None
    emotions: Optional[List[str]] = None
    interpretation: Optional[str] = None
    ai_interpretation: Optional[str] = None
    recurring: Optional[bool] = None
    recurring_pattern: Optional[str] = None


class SynchronicityCreate(BaseModel):
    theme: str
    description: Optional[str] = None
    pattern_type: str = "recurring_symbol"
    keywords: Optional[List[str]] = None
    occurrences: Optional[List[dict]] = None
    significance: int = 5


class SynchronicityUpdate(BaseModel):
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    significance: Optional[int] = None
    user_interpretation: Optional[str] = None
    questions_raised: Optional[List[str]] = None
    active: Optional[bool] = None


class OccurrenceCreate(BaseModel):
    occurrence_type: str  # dream, event, news
    note: str
    date: Optional[str] = None


class UnreadArchiveCreate(BaseModel):
    headline: str
    source: Optional[str] = None
    source_date: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    section: Optional[str] = None
    saved_date: str
    not_ready_note: Optional[str] = None
    revisit_after: Optional[str] = None
    initial_reaction: Optional[str] = None


class WitnessCreate(BaseModel):
    witness_date: str
    article_headline: Optional[str] = None
    article_source: Optional[str] = None
    article_date: Optional[str] = None
    initial_reaction: Optional[str] = None
    body_sensations: Optional[List[str]] = None
    emotions: Optional[List[str]] = None
    thoughts: Optional[List[str]] = None
    judgments: Optional[List[str]] = None
    personal_connection: Optional[str] = None
    breath_count: Optional[int] = None
    action_impulse: Optional[str] = None
    chosen_response: Optional[str] = None
    gratitude_found: Optional[str] = None
    lesson: Optional[str] = None
    intensity: Optional[int] = None
    category: Optional[str] = None


# =============================================================================
# Lineage Endpoints
# =============================================================================

@router.get("/lineage")
async def get_all_lineage_members(db: Session = Depends(get_db)):
    """Get all lineage members"""
    service = get_lineage_service(db)
    members = service.get_all_members()
    return {"members": [m.to_dict() for m in members], "total": len(members)}


@router.get("/lineage/{member_id}")
async def get_lineage_member(member_id: str, db: Session = Depends(get_db)):
    """Get a specific lineage member"""
    service = get_lineage_service(db)
    member = service.get_member(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member.to_dict()


@router.post("/lineage")
async def create_lineage_member(
    member: LineageMemberCreate,
    db: Session = Depends(get_db)
):
    """Create a new lineage member"""
    service = get_lineage_service(db)
    new_member = service.create_member(**member.model_dump(exclude_none=True))
    return new_member.to_dict()


@router.patch("/lineage/{member_id}")
async def update_lineage_member(
    member_id: str,
    updates: LineageMemberUpdate,
    db: Session = Depends(get_db)
):
    """Update a lineage member"""
    service = get_lineage_service(db)
    member = service.update_member(member_id, **updates.model_dump(exclude_none=True))
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member.to_dict()


@router.delete("/lineage/{member_id}")
async def delete_lineage_member(member_id: str, db: Session = Depends(get_db)):
    """Delete a lineage member"""
    service = get_lineage_service(db)
    success = service.delete_member(member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True, "message": "Member deleted"}


@router.post("/lineage/{member_id}/events")
async def add_life_event(
    member_id: str,
    event: LifeEventCreate,
    db: Session = Depends(get_db)
):
    """Add a life event to a lineage member"""
    service = get_lineage_service(db)
    member = service.add_life_event(
        member_id,
        event.date,
        event.event,
        event.age
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member.to_dict()


@router.get("/lineage/snapshot/{year}/{month}/{day}")
async def get_lineage_snapshot(
    year: int,
    month: int,
    day: int,
    db: Session = Depends(get_db)
):
    """Get lineage snapshot for a specific date"""
    service = get_lineage_service(db)
    snapshot = service.get_lineage_snapshot(year, month, day)
    return snapshot.to_dict()


# =============================================================================
# Dream Journal Endpoints
# =============================================================================

@router.get("/dreams")
async def get_all_dreams(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    recurring_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get all dream entries"""
    service = get_dream_service(db)
    dreams = service.get_all_dreams(limit, offset, recurring_only)
    return {"dreams": [d.to_dict() for d in dreams], "count": len(dreams)}


@router.get("/dreams/{dream_id}")
async def get_dream(dream_id: str, db: Session = Depends(get_db)):
    """Get a specific dream"""
    service = get_dream_service(db)
    dream = service.get_dream(dream_id)
    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found")
    return dream.to_dict()


@router.post("/dreams")
async def create_dream(
    dream: DreamCreate,
    db: Session = Depends(get_db)
):
    """Create a new dream entry"""
    service = get_dream_service(db)
    new_dream = service.create_dream(**dream.model_dump(exclude_none=True))
    return new_dream.to_dict()


@router.patch("/dreams/{dream_id}")
async def update_dream(
    dream_id: str,
    updates: DreamUpdate,
    db: Session = Depends(get_db)
):
    """Update a dream entry"""
    service = get_dream_service(db)
    dream = service.update_dream(dream_id, **updates.model_dump(exclude_none=True))
    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found")
    return dream.to_dict()


@router.delete("/dreams/{dream_id}")
async def delete_dream(dream_id: str, db: Session = Depends(get_db)):
    """Delete a dream entry"""
    service = get_dream_service(db)
    success = service.delete_dream(dream_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dream not found")
    return {"success": True, "message": "Dream deleted"}


@router.get("/dreams/themes/recurring")
async def get_recurring_themes(db: Session = Depends(get_db)):
    """Get most common dream themes"""
    service = get_dream_service(db)
    themes = service.get_recurring_themes()
    return {"themes": themes}


@router.get("/dreams/search/{theme}")
async def search_dreams_by_theme(theme: str, db: Session = Depends(get_db)):
    """Search dreams by theme/symbol"""
    service = get_dream_service(db)
    dreams = service.search_dreams_by_theme(theme)
    return {"dreams": [d.to_dict() for d in dreams], "count": len(dreams)}


# =============================================================================
# Synchronicity Endpoints
# =============================================================================

@router.get("/synchronicities")
async def get_all_synchronicities(
    active_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all synchronicity patterns"""
    service = get_synchronicity_service(db)
    syncs = service.get_all_synchronicities(active_only, limit)
    return {"synchronicities": [s.to_dict() for s in syncs], "count": len(syncs)}


@router.get("/synchronicities/stats")
async def get_synchronicity_stats(db: Session = Depends(get_db)):
    """Get synchronicity statistics"""
    service = get_synchronicity_service(db)
    stats = service.get_pattern_statistics()
    return stats


@router.get("/synchronicities/{sync_id}")
async def get_synchronicity(sync_id: str, db: Session = Depends(get_db)):
    """Get a specific synchronicity"""
    service = get_synchronicity_service(db)
    sync = service.get_synchronicity(sync_id)
    if not sync:
        raise HTTPException(status_code=404, detail="Synchronicity not found")
    return sync.to_dict()


@router.post("/synchronicities")
async def create_synchronicity(
    sync: SynchronicityCreate,
    db: Session = Depends(get_db)
):
    """Create a new synchronicity pattern"""
    service = get_synchronicity_service(db)
    new_sync = service.create_synchronicity(**sync.model_dump(exclude_none=True))
    return new_sync.to_dict()


@router.patch("/synchronicities/{sync_id}")
async def update_synchronicity(
    sync_id: str,
    updates: SynchronicityUpdate,
    db: Session = Depends(get_db)
):
    """Update a synchronicity"""
    service = get_synchronicity_service(db)
    sync = service.update_synchronicity(sync_id, **updates.model_dump(exclude_none=True))
    if not sync:
        raise HTTPException(status_code=404, detail="Synchronicity not found")
    return sync.to_dict()


@router.delete("/synchronicities/{sync_id}")
async def delete_synchronicity(sync_id: str, db: Session = Depends(get_db)):
    """Delete a synchronicity"""
    service = get_synchronicity_service(db)
    success = service.delete_synchronicity(sync_id)
    if not success:
        raise HTTPException(status_code=404, detail="Synchronicity not found")
    return {"success": True, "message": "Synchronicity deleted"}


@router.post("/synchronicities/{sync_id}/occurrences")
async def add_occurrence(
    sync_id: str,
    occurrence: OccurrenceCreate,
    db: Session = Depends(get_db)
):
    """Add an occurrence to a synchronicity pattern"""
    service = get_synchronicity_service(db)
    sync = service.add_occurrence(
        sync_id,
        occurrence.occurrence_type,
        occurrence.note,
        occurrence.date
    )
    if not sync:
        raise HTTPException(status_code=404, detail="Synchronicity not found")
    return sync.to_dict()


@router.post("/synchronicities/{sync_id}/resolve")
async def resolve_synchronicity(
    sync_id: str,
    resolution_note: str = Query(..., description="How the synchronicity was understood"),
    db: Session = Depends(get_db)
):
    """Mark a synchronicity as resolved"""
    service = get_synchronicity_service(db)
    sync = service.resolve_synchronicity(sync_id, resolution_note)
    if not sync:
        raise HTTPException(status_code=404, detail="Synchronicity not found")
    return sync.to_dict()


# =============================================================================
# Chart Weather Endpoints
# =============================================================================

@router.get("/chart-weather/{year}/{month}/{day}")
async def get_chart_weather(
    year: int,
    month: int,
    day: int,
    birth_data_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get astrological weather for a specific date"""
    service = get_chart_weather_service(db)
    weather = service.get_chart_weather(year, month, day, birth_data_id)
    if not weather:
        return {
            "message": "No birth data available for chart weather calculation",
            "has_data": False
        }
    return weather.to_dict()


# =============================================================================
# Unread Archive Endpoints
# =============================================================================

@router.get("/unread-archive")
async def get_unread_archive(
    due_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get unread archive items"""
    query = db.query(UnreadArchiveItem).filter_by(is_archived=False)
    if due_only:
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        query = query.filter(UnreadArchiveItem.revisit_after <= today)

    items = query.order_by(UnreadArchiveItem.saved_date.desc()).limit(limit).all()
    return {"items": [i.to_dict() for i in items], "count": len(items)}


@router.post("/unread-archive")
async def add_to_unread_archive(
    item: UnreadArchiveCreate,
    db: Session = Depends(get_db)
):
    """Add an item to the unread archive"""
    new_item = UnreadArchiveItem(**item.model_dump(exclude_none=True))
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item.to_dict()


@router.post("/unread-archive/{item_id}/revisit")
async def mark_revisited(item_id: str, db: Session = Depends(get_db)):
    """Mark an item as revisited"""
    item = db.query(UnreadArchiveItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.mark_revisited()
    db.commit()
    return item.to_dict()


@router.post("/unread-archive/{item_id}/ready")
async def mark_ready(item_id: str, db: Session = Depends(get_db)):
    """Mark an item as ready to engage"""
    item = db.query(UnreadArchiveItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.mark_ready()
    db.commit()
    return item.to_dict()


@router.delete("/unread-archive/{item_id}")
async def delete_unread_item(item_id: str, db: Session = Depends(get_db)):
    """Delete an unread archive item"""
    item = db.query(UnreadArchiveItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"success": True}


# =============================================================================
# Witness Log Endpoints
# =============================================================================

@router.get("/witness-log")
async def get_witness_entries(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get witness log entries"""
    entries = db.query(WitnessEntry).order_by(
        WitnessEntry.witness_date.desc()
    ).limit(limit).all()
    return {"entries": [e.to_dict() for e in entries], "count": len(entries)}


@router.get("/witness-log/{entry_id}")
async def get_witness_entry(entry_id: str, db: Session = Depends(get_db)):
    """Get a specific witness entry"""
    entry = db.query(WitnessEntry).filter_by(id=entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry.to_dict()


@router.post("/witness-log")
async def create_witness_entry(
    entry: WitnessCreate,
    db: Session = Depends(get_db)
):
    """Create a new witness log entry"""
    new_entry = WitnessEntry(**entry.model_dump(exclude_none=True))
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry.to_dict()


@router.delete("/witness-log/{entry_id}")
async def delete_witness_entry(entry_id: str, db: Session = Depends(get_db)):
    """Delete a witness entry"""
    entry = db.query(WitnessEntry).filter_by(id=entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"success": True}


# =============================================================================
# Unified Contemplative Newspaper
# =============================================================================

@router.get("/newspaper/{year}/{month}/{day}")
async def generate_contemplative_newspaper(
    year: int,
    month: int,
    day: int,
    depth: str = Query("balanced", regex="^(light|balanced|deep)$"),
    include_sections: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Generate a contemplative newspaper for a specific date.

    Args:
        year: Target year
        month: Target month
        day: Target day
        depth: Contemplative depth (light, balanced, deep)
        include_sections: Comma-separated list of sections to include

    Returns:
        Complete contemplative newspaper with all sections
    """
    service = get_contemplative_newspaper_service(db)

    sections_list = None
    if include_sections:
        sections_list = [s.strip() for s in include_sections.split(",")]

    newspaper = await service.generate_contemplative_newspaper(
        year=year,
        month=month,
        day=day,
        depth=depth,
        include_sections=sections_list
    )

    return newspaper.to_dict()
