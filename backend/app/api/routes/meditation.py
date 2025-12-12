"""
Meditation API Routes

Handles meditation presets, sessions, and audio generation.
Part of the Meditation feature.
"""
import logging
import re
from datetime import datetime, timedelta
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database_sqlite import get_db
from app.models.meditation import MeditationPreset, MeditationSession, GeneratedMeditationAudio
from app.models.app_config import AppConfig
from app.schemas.meditation import (
    MeditationPresetCreate,
    MeditationPresetUpdate,
    MeditationPresetResponse,
    MeditationSessionCreate,
    MeditationSessionResponse,
    MeditationSessionListResponse,
    MeditationStats,
    AudioGenerateRequest,
    AudioGenerateResponse,
    AudioInfo,
    PRESET_TEMPLATES,
)
from app.services.meditation_audio_service import MeditationAudioService

logger = logging.getLogger(__name__)

# =============================================================================
# Audio Storage Configuration
# =============================================================================

# Centralized audio storage path
BACKEND_DIR = Path(__file__).parent.parent.parent.parent
AUDIO_STORAGE_DIR = BACKEND_DIR / "data" / "meditation_audio"

# Maximum audio file size (50MB)
MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024


def get_audio_storage_path() -> Path:
    """Get the audio storage directory, creating it if it doesn't exist."""
    AUDIO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return AUDIO_STORAGE_DIR


def validate_audio_filename(filename: str) -> bool:
    """
    Validate audio filename to prevent path traversal attacks.

    Args:
        filename: The filename to validate

    Returns:
        True if filename is safe, False otherwise
    """
    # Only allow alphanumeric characters, hyphens, underscores, and .wav extension
    pattern = r'^[a-zA-Z0-9_-]+\.wav$'
    return bool(re.match(pattern, filename))

router = APIRouter()


# =============================================================================
# Preset Routes
# =============================================================================


@router.get("/presets", response_model=List[MeditationPresetResponse])
async def list_presets(
    favorites_only: bool = Query(False, description="Only return favorite presets"),
    db: Session = Depends(get_db),
):
    """List all meditation presets"""
    query = db.query(MeditationPreset)

    if favorites_only:
        query = query.filter(MeditationPreset.is_favorite == True)

    presets = query.order_by(
        desc(MeditationPreset.is_default),
        desc(MeditationPreset.is_favorite),
        desc(MeditationPreset.times_used),
    ).all()

    return [MeditationPresetResponse(**p.to_dict()) for p in presets]


@router.post("/presets", response_model=MeditationPresetResponse)
async def create_preset(
    request: MeditationPresetCreate,
    db: Session = Depends(get_db),
):
    """Create a new meditation preset"""
    # If setting as default, unset other defaults
    if request.is_default:
        db.query(MeditationPreset).filter(
            MeditationPreset.is_default == True
        ).update({"is_default": False})

    preset = MeditationPreset(
        name=request.name,
        description=request.description,
        duration_minutes=request.duration_minutes,
        interval_bell_minutes=request.interval_bell_minutes,
        warm_up_seconds=request.warm_up_seconds,
        cool_down_seconds=request.cool_down_seconds,
        music_enabled=request.music_enabled,
        music_prompt=request.music_prompt,
        music_style=request.music_style,
        music_tempo=request.music_tempo,
        music_mood=request.music_mood,
        binaural_frequency=request.binaural_frequency,
        visualization_enabled=request.visualization_enabled,
        visualization_type=request.visualization_type,
        visualization_colors=request.visualization_colors,
        visualization_intensity=request.visualization_intensity,
        is_favorite=request.is_favorite,
        is_default=request.is_default,
    )

    db.add(preset)
    db.commit()
    db.refresh(preset)

    return MeditationPresetResponse(**preset.to_dict())


@router.get("/presets/templates")
async def get_preset_templates():
    """Get built-in preset templates"""
    return PRESET_TEMPLATES


@router.get("/presets/{preset_id}", response_model=MeditationPresetResponse)
async def get_preset(
    preset_id: str,
    db: Session = Depends(get_db),
):
    """Get a specific preset"""
    preset = db.query(MeditationPreset).filter(MeditationPreset.id == preset_id).first()

    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    return MeditationPresetResponse(**preset.to_dict())


@router.put("/presets/{preset_id}", response_model=MeditationPresetResponse)
async def update_preset(
    preset_id: str,
    request: MeditationPresetUpdate,
    db: Session = Depends(get_db),
):
    """Update a meditation preset"""
    preset = db.query(MeditationPreset).filter(MeditationPreset.id == preset_id).first()

    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    # If setting as default, unset other defaults
    if request.is_default:
        db.query(MeditationPreset).filter(
            MeditationPreset.is_default == True,
            MeditationPreset.id != preset_id,
        ).update({"is_default": False})

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preset, field, value)

    db.commit()
    db.refresh(preset)

    return MeditationPresetResponse(**preset.to_dict())


@router.delete("/presets/{preset_id}")
async def delete_preset(
    preset_id: str,
    db: Session = Depends(get_db),
):
    """Delete a meditation preset"""
    preset = db.query(MeditationPreset).filter(MeditationPreset.id == preset_id).first()

    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    db.delete(preset)
    db.commit()

    return {"success": True, "message": "Preset deleted"}


@router.post("/presets/{preset_id}/use")
async def mark_preset_used(
    preset_id: str,
    db: Session = Depends(get_db),
):
    """Mark a preset as used (increment usage counter)"""
    preset = db.query(MeditationPreset).filter(MeditationPreset.id == preset_id).first()

    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    preset.times_used += 1
    db.commit()

    return {"success": True, "times_used": preset.times_used}


# =============================================================================
# Session Routes
# =============================================================================


@router.get("/sessions", response_model=MeditationSessionListResponse)
async def list_sessions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    db: Session = Depends(get_db),
):
    """List meditation sessions with pagination"""
    query = db.query(MeditationSession)

    if date_from:
        query = query.filter(MeditationSession.session_date >= date_from)
    if date_to:
        query = query.filter(MeditationSession.session_date <= date_to)

    total = query.count()

    sessions = query.order_by(
        desc(MeditationSession.created_at)
    ).offset(offset).limit(limit).all()

    return MeditationSessionListResponse(
        sessions=[MeditationSessionResponse(**s.to_dict()) for s in sessions],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/sessions", response_model=MeditationSessionResponse)
async def create_session(
    request: MeditationSessionCreate,
    db: Session = Depends(get_db),
):
    """Record a completed meditation session"""
    session = MeditationSession(
        preset_id=request.preset_id,
        preset_name=request.preset_name,
        planned_duration_minutes=request.planned_duration_minutes,
        actual_duration_seconds=request.actual_duration_seconds,
        completed=request.completed,
        mood_before=request.mood_before,
        mood_after=request.mood_after,
        notes=request.notes,
        music_prompt_used=request.music_prompt_used,
        session_date=request.session_date,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return MeditationSessionResponse(**session.to_dict())


@router.get("/sessions/{session_id}", response_model=MeditationSessionResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get a specific session"""
    session = db.query(MeditationSession).filter(MeditationSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return MeditationSessionResponse(**session.to_dict())


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Delete a meditation session"""
    session = db.query(MeditationSession).filter(MeditationSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()

    return {"success": True, "message": "Session deleted"}


@router.get("/stats", response_model=MeditationStats)
async def get_stats(
    db: Session = Depends(get_db),
):
    """Get meditation statistics"""
    # Total sessions
    total_sessions = db.query(MeditationSession).count()

    # Total minutes
    total_seconds = db.query(func.sum(MeditationSession.actual_duration_seconds)).scalar() or 0
    total_minutes = total_seconds // 60

    # Completed sessions
    completed_sessions = db.query(MeditationSession).filter(
        MeditationSession.completed == True
    ).count()

    # Calculate streak
    streak_days = _calculate_streak(db)

    # Average session length
    avg_seconds = db.query(func.avg(MeditationSession.actual_duration_seconds)).scalar() or 0
    average_session_minutes = round(avg_seconds / 60, 1)

    # Most used preset
    favorite_preset = None
    top_preset = db.query(MeditationPreset).order_by(
        desc(MeditationPreset.times_used)
    ).first()
    if top_preset and top_preset.times_used > 0:
        favorite_preset = top_preset.name

    # Sessions this week
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    sessions_this_week = db.query(MeditationSession).filter(
        MeditationSession.session_date >= week_ago
    ).count()

    # Sessions this month
    month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    sessions_this_month = db.query(MeditationSession).filter(
        MeditationSession.session_date >= month_ago
    ).count()

    return MeditationStats(
        total_sessions=total_sessions,
        total_minutes=total_minutes,
        completed_sessions=completed_sessions,
        streak_days=streak_days,
        average_session_minutes=average_session_minutes,
        favorite_preset=favorite_preset,
        sessions_this_week=sessions_this_week,
        sessions_this_month=sessions_this_month,
    )


def _calculate_streak(db: Session) -> int:
    """Calculate current meditation streak in days"""
    # Get all unique session dates, ordered by most recent
    dates = db.query(MeditationSession.session_date).distinct().order_by(
        desc(MeditationSession.session_date)
    ).all()

    if not dates:
        return 0

    dates = [d[0] for d in dates]
    today = datetime.now().strftime("%Y-%m-%d")

    # If no session today or yesterday, streak is 0
    if dates[0] != today and dates[0] != (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"):
        return 0

    # Count consecutive days
    streak = 0
    current_date = datetime.strptime(dates[0], "%Y-%m-%d")

    for date_str in dates:
        date = datetime.strptime(date_str, "%Y-%m-%d")
        if (current_date - date).days <= 1:
            streak += 1
            current_date = date
        else:
            break

    return streak


# =============================================================================
# Audio Generation Routes
# =============================================================================


@router.post("/audio/generate", response_model=AudioGenerateResponse)
async def generate_audio(
    request: AudioGenerateRequest,
    db: Session = Depends(get_db),
):
    """Generate meditation audio using Gemini"""
    # Get API key from config
    config = db.query(AppConfig).first()

    if not config:
        raise HTTPException(status_code=400, detail="App not configured")

    google_api_key = getattr(config, 'google_api_key', None)
    if not google_api_key:
        raise HTTPException(status_code=400, detail="Google API key not configured")

    try:
        service = MeditationAudioService(api_key=google_api_key)

        result = await service.generate_audio(
            style=request.style,
            mood=request.mood,
            duration_seconds=request.duration_seconds,
            custom_prompt=request.prompt,
            binaural_frequency=request.binaural_frequency,
        )

        if not result.success:
            return AudioGenerateResponse(
                success=False,
                error=result.error,
                prompt_used=result.prompt,
            )

        # Validate file size
        audio_size = len(result.audio_data)
        if audio_size > MAX_AUDIO_FILE_SIZE:
            logger.warning(f"Generated audio exceeds max size: {audio_size} bytes")
            return AudioGenerateResponse(
                success=False,
                error=f"Generated audio file too large ({audio_size // (1024*1024)}MB). Maximum size is {MAX_AUDIO_FILE_SIZE // (1024*1024)}MB.",
                prompt_used=result.prompt,
            )

        # Ensure storage directory exists
        get_audio_storage_path()

        # Save audio to storage
        file_path = await service.save_audio(
            audio_data=result.audio_data,
            audio_id=result.audio_id,
            metadata={
                "style": request.style,
                "mood": request.mood,
                "duration_seconds": request.duration_seconds,
                "prompt": result.prompt,
            },
        )

        # Save to database
        audio_record = GeneratedMeditationAudio(
            id=result.audio_id,
            prompt=result.prompt,
            music_style=request.style,
            music_mood=request.mood,
            duration_seconds=result.duration_seconds,
            file_path=file_path,
            file_size_bytes=len(result.audio_data),
            mime_type=result.mime_type,
            generation_model="gemini-2.0-flash-exp",
        )

        db.add(audio_record)
        db.commit()

        return AudioGenerateResponse(
            success=True,
            audio_id=result.audio_id,
            audio_url=f"/api/meditation/audio/{result.audio_id}",
            duration_seconds=result.duration_seconds,
            file_size_bytes=len(result.audio_data),
            prompt_used=result.prompt,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating audio: {e}")
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {str(e)}")


@router.get("/audio/{audio_id}")
async def get_audio(
    audio_id: str,
    db: Session = Depends(get_db),
):
    """Get generated audio file"""
    audio = db.query(GeneratedMeditationAudio).filter(
        GeneratedMeditationAudio.id == audio_id
    ).first()

    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    # Validate filename to prevent path traversal attacks
    if not audio.file_path or not validate_audio_filename(audio.file_path):
        logger.warning(f"Invalid audio file path detected: {audio.file_path}")
        raise HTTPException(status_code=400, detail="Invalid audio file path")

    # Build full path using centralized storage directory
    storage_dir = get_audio_storage_path()
    audio_path = storage_dir / audio.file_path

    # Additional path traversal protection: ensure resolved path is within storage directory
    try:
        resolved_path = audio_path.resolve()
        if not str(resolved_path).startswith(str(storage_dir.resolve())):
            logger.warning(f"Path traversal attempt detected: {audio.file_path}")
            raise HTTPException(status_code=400, detail="Invalid audio file path")
    except (ValueError, OSError) as e:
        logger.error(f"Error resolving audio path: {e}")
        raise HTTPException(status_code=400, detail="Invalid audio file path")

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Increment usage counter
    audio.times_used += 1
    db.commit()

    return FileResponse(
        path=str(audio_path),
        media_type=audio.mime_type,
        filename=f"meditation_{audio_id}.wav",
    )


@router.get("/audio", response_model=List[AudioInfo])
async def list_audio(
    style: Optional[str] = Query(None, description="Filter by style"),
    mood: Optional[str] = Query(None, description="Filter by mood"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List generated audio files"""
    query = db.query(GeneratedMeditationAudio)

    if style:
        query = query.filter(GeneratedMeditationAudio.music_style == style)
    if mood:
        query = query.filter(GeneratedMeditationAudio.music_mood == mood)

    audio_files = query.order_by(
        desc(GeneratedMeditationAudio.times_used),
        desc(GeneratedMeditationAudio.created_at),
    ).limit(limit).all()

    return [
        AudioInfo(
            id=a.id,
            prompt=a.prompt,
            music_style=a.music_style,
            music_mood=a.music_mood,
            duration_seconds=a.duration_seconds,
            file_path=a.file_path,
            url=f"/api/meditation/audio/{a.id}",
            file_size_bytes=a.file_size_bytes,
            times_used=a.times_used,
            created_at=a.created_at,
        )
        for a in audio_files
    ]


@router.delete("/audio/{audio_id}")
async def delete_audio(
    audio_id: str,
    db: Session = Depends(get_db),
):
    """Delete generated audio"""
    audio = db.query(GeneratedMeditationAudio).filter(
        GeneratedMeditationAudio.id == audio_id
    ).first()

    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    # Delete file
    backend_dir = Path(__file__).parent.parent.parent.parent
    audio_path = backend_dir / "data" / "meditation_audio" / audio.file_path

    if audio_path.exists():
        audio_path.unlink()

    # Delete record
    db.delete(audio)
    db.commit()

    return {"success": True, "message": "Audio deleted"}
