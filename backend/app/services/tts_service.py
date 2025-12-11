"""
Text-to-Speech Service Interface and Providers

Modular design allows swapping TTS backends.
Currently implements GeminiTTSProvider using Google Gemini's audio capabilities.
"""
from abc import ABC, abstractmethod
from typing import Optional, AsyncGenerator, Any
from dataclasses import dataclass
from enum import Enum
import os
import logging
import asyncio

logger = logging.getLogger(__name__)


class TTSVoice(str, Enum):
    """Standard voice options (mapped to provider-specific voices)"""
    WARM = "warm"        # Warm, nurturing (Kore)
    CALM = "calm"        # Calm, melodic (Aoede)
    BOLD = "bold"        # Bold, energetic (Fenrir)
    PLAYFUL = "playful"  # Upbeat, playful (Puck)
    DEEP = "deep"        # Deep, authoritative (Charon)


class TTSStyle(str, Enum):
    """Speaking styles"""
    CONVERSATIONAL = "conversational"
    CONTEMPLATIVE = "contemplative"
    EXCITED = "excited"
    SERIOUS = "serious"
    WARM = "warm"


@dataclass
class TTSResult:
    """Result from TTS generation"""
    audio_data: bytes
    sample_rate: int
    mime_type: str
    duration_seconds: Optional[float] = None


class TTSProvider(ABC):
    """Abstract base class for TTS providers"""

    @abstractmethod
    async def generate_speech(
        self,
        text: str,
        voice: TTSVoice = TTSVoice.WARM,
        style: Optional[str] = None
    ) -> TTSResult:
        """
        Generate speech from text.

        Args:
            text: Text to convert to speech
            voice: Voice to use
            style: Optional speaking style

        Returns:
            TTSResult with audio data
        """
        pass

    @abstractmethod
    async def stream_speech(
        self,
        text: str,
        voice: TTSVoice = TTSVoice.WARM,
        style: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream speech audio chunks as they're generated.

        Args:
            text: Text to convert to speech
            voice: Voice to use
            style: Optional speaking style

        Yields:
            Audio chunks (PCM bytes)
        """
        pass

    @property
    @abstractmethod
    def sample_rate(self) -> int:
        """Output audio sample rate"""
        pass

    @property
    @abstractmethod
    def mime_type(self) -> str:
        """Output audio MIME type"""
        pass


class GeminiTTSProvider(TTSProvider):
    """
    TTS provider using Google Gemini's audio capabilities.

    Uses Gemini Live API to generate natural-sounding speech
    with various voice personalities.
    """

    # Map standard voices to Gemini voice names
    VOICE_MAP = {
        TTSVoice.WARM: "Kore",
        TTSVoice.CALM: "Aoede",
        TTSVoice.BOLD: "Fenrir",
        TTSVoice.PLAYFUL: "Puck",
        TTSVoice.DEEP: "Charon",
    }

    # Output format
    OUTPUT_SAMPLE_RATE = 24000
    OUTPUT_MIME_TYPE = "audio/pcm"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini TTS provider.

        Args:
            api_key: Google API key. Falls back to GOOGLE_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key required for Gemini TTS. "
                "Set GOOGLE_API_KEY environment variable or pass api_key."
            )
        self._client = None

    def _get_client(self):
        """Lazy initialize the Gemini client"""
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("Gemini TTS client initialized")
            except ImportError:
                raise ImportError(
                    "google-genai package required. Install with: pip install google-genai"
                )
        return self._client

    @property
    def sample_rate(self) -> int:
        return self.OUTPUT_SAMPLE_RATE

    @property
    def mime_type(self) -> str:
        return self.OUTPUT_MIME_TYPE

    async def generate_speech(
        self,
        text: str,
        voice: TTSVoice = TTSVoice.WARM,
        style: Optional[str] = None
    ) -> TTSResult:
        """
        Generate complete speech audio from text.

        Uses Gemini Live API for high-quality voice synthesis.
        """
        if not text.strip():
            return TTSResult(
                audio_data=b"",
                sample_rate=self.OUTPUT_SAMPLE_RATE,
                mime_type=self.OUTPUT_MIME_TYPE
            )

        audio_chunks = []
        async for chunk in self.stream_speech(text, voice, style):
            audio_chunks.append(chunk)

        combined_audio = b"".join(audio_chunks)

        # Estimate duration (24kHz, 16-bit = 48000 bytes/second)
        duration = len(combined_audio) / 48000 if combined_audio else 0

        return TTSResult(
            audio_data=combined_audio,
            sample_rate=self.OUTPUT_SAMPLE_RATE,
            mime_type=self.OUTPUT_MIME_TYPE,
            duration_seconds=duration
        )

    async def stream_speech(
        self,
        text: str,
        voice: TTSVoice = TTSVoice.WARM,
        style: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream speech audio chunks as they're generated by Gemini.
        """
        if not text.strip():
            return

        from google.genai import types

        client = self._get_client()
        gemini_voice = self.VOICE_MAP.get(voice, "Kore")

        # Build system instruction for speaking style
        style_instruction = style or "warm and conversational"
        system_text = (
            f"You are a text-to-speech system. Read the exact text provided by the user "
            f"in a {style_instruction} tone. IMPORTANT: Do NOT add any preamble, greeting, "
            f"acknowledgment, or extra words. Do NOT say 'Sure', 'Okay', 'Here you go', etc. "
            f"Simply read the provided text verbatim with natural intonation."
        )

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=gemini_voice
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text=system_text)]
            ),
        )

        try:
            async with client.aio.live.connect(
                model="gemini-2.0-flash-exp",
                config=config
            ) as session:
                # Send the text to speak
                await session.send_client_content(
                    turns=[
                        types.Content(
                            role="user",
                            parts=[types.Part(text=text)]
                        )
                    ],
                    turn_complete=True
                )

                # Stream audio response
                async for response in session.receive():
                    if hasattr(response, 'server_content') and response.server_content:
                        content = response.server_content

                        if hasattr(content, 'model_turn') and content.model_turn:
                            for part in content.model_turn.parts:
                                if hasattr(part, 'inline_data') and part.inline_data:
                                    audio_data = part.inline_data.data
                                    # Handle both bytes and base64 string
                                    if isinstance(audio_data, str):
                                        import base64
                                        audio_data = base64.b64decode(audio_data)
                                    yield audio_data

                        # Check for turn completion
                        if hasattr(content, 'turn_complete') and content.turn_complete:
                            break

        except Exception as e:
            logger.error(f"Gemini TTS error: {e}")
            raise


# Future providers can be added here:
# class ElevenLabsTTSProvider(TTSProvider): ...
# class GoogleCloudTTSProvider(TTSProvider): ...


def get_tts_provider(
    provider: str = "gemini",
    api_key: Optional[str] = None
) -> TTSProvider:
    """
    Factory function to get a TTS provider by name.

    Args:
        provider: Provider name ("gemini", future: "elevenlabs", "google-cloud")
        api_key: API key for the provider

    Returns:
        TTSProvider instance

    Raises:
        ValueError: If provider is unknown
    """
    if provider == "gemini":
        return GeminiTTSProvider(api_key=api_key)
    # Future providers:
    # elif provider == "elevenlabs":
    #     return ElevenLabsTTSProvider(api_key=api_key)
    # elif provider == "google-cloud":
    #     return GoogleCloudTTSProvider(api_key=api_key)
    else:
        raise ValueError(f"Unknown TTS provider: {provider}. Available: gemini")


# Singleton instance for reuse
_tts_provider: Optional[TTSProvider] = None


def get_default_tts_provider(api_key: Optional[str] = None) -> Optional[TTSProvider]:
    """
    Get or create the default TTS provider.

    Returns None if API key is not available (TTS disabled).

    Args:
        api_key: Optional API key override

    Returns:
        TTSProvider or None if not configured
    """
    global _tts_provider

    # Check for API key
    key = api_key or os.getenv("GOOGLE_API_KEY")
    if not key:
        logger.warning("No Google API key - TTS will be disabled")
        return None

    if _tts_provider is None:
        try:
            _tts_provider = get_tts_provider("gemini", api_key=key)
        except Exception as e:
            logger.error(f"Failed to initialize TTS provider: {e}")
            return None

    return _tts_provider
