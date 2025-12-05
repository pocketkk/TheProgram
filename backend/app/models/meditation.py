"""
Meditation models for SQLite

Part of the Meditation feature with Gemini-powered ambient music generation.
"""
from sqlalchemy import Column, String, Integer, Boolean, Float, Text
from sqlalchemy.ext.mutable import MutableDict
from app.models.base import BaseModel
from app.core.database_sqlite import JSONEncodedDict


class MeditationPreset(BaseModel):
    """
    Meditation preset configuration

    Stores user-defined presets with timer settings, music preferences,
    and visualization options.
    """
    __tablename__ = 'meditation_presets'

    # Basic info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Timer settings
    duration_minutes = Column(Integer, nullable=False, default=10)
    interval_bell_minutes = Column(Integer, nullable=True)  # Optional interval bell
    warm_up_seconds = Column(Integer, nullable=True, default=10)  # Warm-up before timer starts
    cool_down_seconds = Column(Integer, nullable=True, default=10)  # Cool-down after timer ends

    # Music generation settings (for Gemini)
    music_enabled = Column(Boolean, nullable=False, default=True)
    music_prompt = Column(Text, nullable=True)  # AI prompt for music generation
    music_style = Column(String(100), nullable=True)  # ambient, nature, cosmic, binaural, etc.
    music_tempo = Column(String(50), nullable=True)  # slow, medium, etc.
    music_mood = Column(String(100), nullable=True)  # calming, focused, energizing, etc.
    binaural_frequency = Column(Float, nullable=True)  # Hz for binaural beats (if applicable)

    # Visualization settings
    visualization_enabled = Column(Boolean, nullable=False, default=True)
    visualization_type = Column(String(50), nullable=True)  # waveform, particles, mandala, cosmos
    visualization_colors = Column(MutableDict.as_mutable(JSONEncodedDict), nullable=True)  # Color palette
    visualization_intensity = Column(Float, nullable=True, default=0.5)  # 0.0 to 1.0

    # Usage tracking
    times_used = Column(Integer, nullable=False, default=0)
    is_favorite = Column(Boolean, nullable=False, default=False)
    is_default = Column(Boolean, nullable=False, default=False)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'duration_minutes': self.duration_minutes,
            'interval_bell_minutes': self.interval_bell_minutes,
            'warm_up_seconds': self.warm_up_seconds,
            'cool_down_seconds': self.cool_down_seconds,
            'music_enabled': self.music_enabled,
            'music_prompt': self.music_prompt,
            'music_style': self.music_style,
            'music_tempo': self.music_tempo,
            'music_mood': self.music_mood,
            'binaural_frequency': self.binaural_frequency,
            'visualization_enabled': self.visualization_enabled,
            'visualization_type': self.visualization_type,
            'visualization_colors': self.visualization_colors,
            'visualization_intensity': self.visualization_intensity,
            'times_used': self.times_used,
            'is_favorite': self.is_favorite,
            'is_default': self.is_default,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class MeditationSession(BaseModel):
    """
    Completed meditation session record

    Tracks actual meditation sessions with duration and notes.
    """
    __tablename__ = 'meditation_sessions'

    # Reference to preset used (if any)
    preset_id = Column(String, nullable=True)
    preset_name = Column(String(255), nullable=True)  # Cached for history even if preset is deleted

    # Session details
    planned_duration_minutes = Column(Integer, nullable=False)
    actual_duration_seconds = Column(Integer, nullable=False)  # How long user actually meditated
    completed = Column(Boolean, nullable=False, default=False)  # Did they finish the full session?

    # Experience tracking
    mood_before = Column(String(50), nullable=True)
    mood_after = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Music that was generated/used
    music_prompt_used = Column(Text, nullable=True)

    # Session metadata
    session_date = Column(String, nullable=False)  # ISO date

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'preset_id': self.preset_id,
            'preset_name': self.preset_name,
            'planned_duration_minutes': self.planned_duration_minutes,
            'actual_duration_seconds': self.actual_duration_seconds,
            'completed': self.completed,
            'mood_before': self.mood_before,
            'mood_after': self.mood_after,
            'notes': self.notes,
            'music_prompt_used': self.music_prompt_used,
            'session_date': self.session_date,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class GeneratedMeditationAudio(BaseModel):
    """
    Cached generated meditation audio

    Stores generated audio files for reuse and to avoid regeneration costs.
    """
    __tablename__ = 'generated_meditation_audio'

    # Generation parameters (for caching/matching)
    prompt = Column(Text, nullable=False)
    music_style = Column(String(100), nullable=True)
    music_mood = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, nullable=False)

    # Audio file info
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=False, default='audio/wav')

    # Metadata
    generation_model = Column(String(100), nullable=True)
    times_used = Column(Integer, nullable=False, default=0)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'prompt': self.prompt,
            'music_style': self.music_style,
            'music_mood': self.music_mood,
            'duration_seconds': self.duration_seconds,
            'file_path': self.file_path,
            'file_size_bytes': self.file_size_bytes,
            'mime_type': self.mime_type,
            'generation_model': self.generation_model,
            'times_used': self.times_used,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
