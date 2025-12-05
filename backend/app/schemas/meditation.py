"""
Pydantic schemas for meditation feature

Request/response validation for meditation presets, sessions, and audio generation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# =============================================================================
# Preset Schemas
# =============================================================================


class MeditationPresetCreate(BaseModel):
    """Request to create a meditation preset"""
    name: str = Field(..., min_length=1, max_length=255, description="Preset name")
    description: Optional[str] = Field(default=None, description="Preset description")

    # Timer settings
    duration_minutes: int = Field(default=10, ge=1, le=180, description="Duration in minutes")
    interval_bell_minutes: Optional[int] = Field(default=None, ge=1, description="Interval bell frequency")
    warm_up_seconds: Optional[int] = Field(default=10, ge=0, le=60, description="Warm-up seconds")
    cool_down_seconds: Optional[int] = Field(default=10, ge=0, le=60, description="Cool-down seconds")

    # Music settings
    music_enabled: bool = Field(default=True, description="Enable music generation")
    music_prompt: Optional[str] = Field(default=None, description="Custom prompt for music generation")
    music_style: Optional[str] = Field(default="ambient", description="Music style")
    music_tempo: Optional[str] = Field(default="slow", description="Music tempo")
    music_mood: Optional[str] = Field(default="calming", description="Music mood")
    binaural_frequency: Optional[float] = Field(default=None, ge=0.5, le=40, description="Binaural frequency in Hz")

    # Visualization settings
    visualization_enabled: bool = Field(default=True, description="Enable visualization")
    visualization_type: Optional[str] = Field(default="waveform", description="Visualization type")
    visualization_colors: Optional[Dict[str, Any]] = Field(default=None, description="Color palette")
    visualization_intensity: Optional[float] = Field(default=0.5, ge=0, le=1, description="Visualization intensity")

    is_favorite: bool = Field(default=False, description="Mark as favorite")
    is_default: bool = Field(default=False, description="Set as default preset")


class MeditationPresetUpdate(BaseModel):
    """Request to update a meditation preset"""
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None)

    duration_minutes: Optional[int] = Field(default=None, ge=1, le=180)
    interval_bell_minutes: Optional[int] = Field(default=None, ge=1)
    warm_up_seconds: Optional[int] = Field(default=None, ge=0, le=60)
    cool_down_seconds: Optional[int] = Field(default=None, ge=0, le=60)

    music_enabled: Optional[bool] = Field(default=None)
    music_prompt: Optional[str] = Field(default=None)
    music_style: Optional[str] = Field(default=None)
    music_tempo: Optional[str] = Field(default=None)
    music_mood: Optional[str] = Field(default=None)
    binaural_frequency: Optional[float] = Field(default=None, ge=0.5, le=40)

    visualization_enabled: Optional[bool] = Field(default=None)
    visualization_type: Optional[str] = Field(default=None)
    visualization_colors: Optional[Dict[str, Any]] = Field(default=None)
    visualization_intensity: Optional[float] = Field(default=None, ge=0, le=1)

    is_favorite: Optional[bool] = Field(default=None)
    is_default: Optional[bool] = Field(default=None)


class MeditationPresetResponse(BaseModel):
    """Response with meditation preset data"""
    id: str
    name: str
    description: Optional[str]

    duration_minutes: int
    interval_bell_minutes: Optional[int]
    warm_up_seconds: Optional[int]
    cool_down_seconds: Optional[int]

    music_enabled: bool
    music_prompt: Optional[str]
    music_style: Optional[str]
    music_tempo: Optional[str]
    music_mood: Optional[str]
    binaural_frequency: Optional[float]

    visualization_enabled: bool
    visualization_type: Optional[str]
    visualization_colors: Optional[Dict[str, Any]]
    visualization_intensity: Optional[float]

    times_used: int
    is_favorite: bool
    is_default: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# =============================================================================
# Session Schemas
# =============================================================================


class MeditationSessionCreate(BaseModel):
    """Request to create a meditation session record"""
    preset_id: Optional[str] = Field(default=None, description="Preset used")
    preset_name: Optional[str] = Field(default=None, description="Preset name (cached)")

    planned_duration_minutes: int = Field(..., ge=1, description="Planned duration")
    actual_duration_seconds: int = Field(..., ge=0, description="Actual duration completed")
    completed: bool = Field(default=False, description="Session completed fully")

    mood_before: Optional[str] = Field(default=None, description="Mood before session")
    mood_after: Optional[str] = Field(default=None, description="Mood after session")
    notes: Optional[str] = Field(default=None, description="Session notes")

    music_prompt_used: Optional[str] = Field(default=None, description="Music prompt used")
    session_date: str = Field(..., description="Session date in ISO format")


class MeditationSessionResponse(BaseModel):
    """Response with meditation session data"""
    id: str
    preset_id: Optional[str]
    preset_name: Optional[str]

    planned_duration_minutes: int
    actual_duration_seconds: int
    completed: bool

    mood_before: Optional[str]
    mood_after: Optional[str]
    notes: Optional[str]

    music_prompt_used: Optional[str]
    session_date: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MeditationSessionListResponse(BaseModel):
    """Response for listing sessions"""
    sessions: List[MeditationSessionResponse]
    total: int
    limit: int
    offset: int


class MeditationStats(BaseModel):
    """Meditation statistics"""
    total_sessions: int
    total_minutes: int
    completed_sessions: int
    streak_days: int
    average_session_minutes: float
    favorite_preset: Optional[str]
    sessions_this_week: int
    sessions_this_month: int


# =============================================================================
# Audio Generation Schemas
# =============================================================================


class AudioGenerateRequest(BaseModel):
    """Request to generate meditation audio"""
    prompt: Optional[str] = Field(
        default=None,
        description="Custom prompt for audio generation"
    )
    style: str = Field(
        default="ambient",
        description="Audio style: ambient, nature, cosmic, binaural, tibetan"
    )
    mood: str = Field(
        default="calming",
        description="Mood: calming, focused, energizing, peaceful, transcendent"
    )
    duration_seconds: int = Field(
        default=300,
        ge=30,
        le=3600,
        description="Audio duration in seconds"
    )
    binaural_frequency: Optional[float] = Field(
        default=None,
        ge=0.5,
        le=40,
        description="Binaural beat frequency in Hz"
    )


class AudioGenerateResponse(BaseModel):
    """Response from audio generation"""
    success: bool
    audio_id: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: int = 0
    file_size_bytes: Optional[int] = None
    prompt_used: str = ""
    error: Optional[str] = None


class AudioInfo(BaseModel):
    """Audio file information"""
    id: str
    prompt: str
    music_style: Optional[str]
    music_mood: Optional[str]
    duration_seconds: int
    file_path: str
    url: str
    file_size_bytes: Optional[int]
    times_used: int
    created_at: str

    class Config:
        from_attributes = True


# =============================================================================
# WebSocket Message Schemas
# =============================================================================


class TimerState(BaseModel):
    """Timer state for WebSocket updates"""
    phase: str = Field(..., description="current, warmup, cooldown, paused, stopped")
    elapsed_seconds: int
    remaining_seconds: int
    total_seconds: int
    is_running: bool


class SessionProgress(BaseModel):
    """Session progress update"""
    type: str = "progress"
    timer: TimerState
    audio_ready: bool = False
    audio_url: Optional[str] = None


# =============================================================================
# Preset Templates
# =============================================================================

PRESET_TEMPLATES = {
    "quick_calm": {
        "name": "Quick Calm",
        "description": "A brief 5-minute session to reset and refocus",
        "duration_minutes": 5,
        "music_style": "ambient",
        "music_mood": "calming",
        "visualization_type": "waveform",
    },
    "morning_focus": {
        "name": "Morning Focus",
        "description": "Energizing 10-minute session to start your day",
        "duration_minutes": 10,
        "music_style": "nature",
        "music_mood": "energizing",
        "visualization_type": "particles",
    },
    "deep_relaxation": {
        "name": "Deep Relaxation",
        "description": "Extended 20-minute session for deep relaxation",
        "duration_minutes": 20,
        "music_style": "ambient",
        "music_mood": "peaceful",
        "visualization_type": "mandala",
        "interval_bell_minutes": 5,
    },
    "cosmic_journey": {
        "name": "Cosmic Journey",
        "description": "30-minute transcendent experience with cosmic soundscapes",
        "duration_minutes": 30,
        "music_style": "cosmic",
        "music_mood": "transcendent",
        "visualization_type": "cosmos",
    },
    "binaural_focus": {
        "name": "Binaural Focus",
        "description": "15-minute session with binaural beats for concentration",
        "duration_minutes": 15,
        "music_style": "binaural",
        "music_mood": "focused",
        "binaural_frequency": 14.0,  # Beta wave for focus
        "visualization_type": "waveform",
    },
    "tibetan_meditation": {
        "name": "Tibetan Meditation",
        "description": "25-minute session with singing bowl tones",
        "duration_minutes": 25,
        "music_style": "tibetan",
        "music_mood": "transcendent",
        "visualization_type": "mandala",
        "interval_bell_minutes": 5,
    },
}
