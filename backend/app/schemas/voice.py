"""
Voice Chat Schemas

Pydantic schemas for voice chat settings and state.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class GeminiVoice(str, Enum):
    """Available Gemini voices"""
    PUCK = "Puck"
    CHARON = "Charon"
    KORE = "Kore"
    FENRIR = "Fenrir"
    AOEDE = "Aoede"


class ResponseLength(str, Enum):
    """Voice response length options"""
    BRIEF = "brief"
    MEDIUM = "medium"
    DETAILED = "detailed"


class VoiceSettingsBase(BaseModel):
    """Base voice settings schema"""
    voice_name: str = Field(default="Kore", description="Gemini voice to use")
    personality: str = Field(default="mystical guide", description="Personality description")
    speaking_style: str = Field(
        default="warm and contemplative",
        description="Speaking style description"
    )
    response_length: ResponseLength = Field(
        default=ResponseLength.MEDIUM,
        description="Preferred response length"
    )
    custom_personality: Optional[str] = Field(
        default=None,
        description="Custom personality prompt (overrides default)"
    )


class VoiceSettingsCreate(VoiceSettingsBase):
    """Schema for creating/updating voice settings"""
    pass


class VoiceSettingsResponse(VoiceSettingsBase):
    """Schema for voice settings response"""

    class Config:
        from_attributes = True


class VoiceInfo(BaseModel):
    """Information about a voice option"""
    name: str
    description: str


class VoiceOptionsResponse(BaseModel):
    """Available voice options and defaults"""
    voices: List[VoiceInfo]
    default_settings: VoiceSettingsBase
    response_lengths: List[str]


class VoiceSessionStart(BaseModel):
    """Request to start a voice session"""
    voice_settings: Optional[VoiceSettingsBase] = None
    session_id: Optional[str] = Field(
        default=None,
        description="Existing session ID to continue conversation"
    )
    astrological_context: Optional[dict] = Field(
        default=None,
        description="Current chart context for the guide"
    )


class VoiceMessage(BaseModel):
    """A message in voice conversation history"""
    role: str  # "user" or "assistant"
    content: str
    mode: str = "voice"  # "voice" or "text"
    timestamp: Optional[float] = None


class VoiceHistorySync(BaseModel):
    """Sync conversation history between voice and text modes"""
    history: List[VoiceMessage]
