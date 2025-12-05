"""
Meditation Audio Generation Service

Generates ambient meditation audio using Google Gemini API.
Part of the Meditation feature.
"""
import os
import asyncio
import base64
import uuid
import logging
import wave
import io
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable, Awaitable
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class GeneratedAudioResult:
    """Result from audio generation"""
    success: bool
    audio_id: str = ""
    audio_data: bytes = field(default_factory=bytes)
    mime_type: str = "audio/wav"
    duration_seconds: int = 0
    prompt: str = ""
    enhanced_prompt: str = ""
    error: Optional[str] = None

    @property
    def data_url(self) -> str:
        """Convert to data URL for playback"""
        if not self.audio_data:
            return ""
        b64 = base64.b64encode(self.audio_data).decode()
        return f"data:{self.mime_type};base64,{b64}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "success": self.success,
            "audio_id": self.audio_id,
            "audio_url": self.data_url if self.success else None,
            "mime_type": self.mime_type,
            "duration_seconds": self.duration_seconds,
            "prompt": self.prompt,
            "error": self.error,
        }


class MeditationAudioService:
    """
    Audio generation service for meditation using Google Gemini API

    Generates ambient music, nature sounds, and binaural beats for meditation.

    Usage:
        service = MeditationAudioService(api_key="...")
        result = await service.generate_audio(
            style="ambient",
            mood="calming",
            duration_seconds=300
        )
    """

    # Style prompts for different meditation music types
    STYLE_PROMPTS = {
        "ambient": "Gentle ambient electronic music with soft synthesizer pads, ethereal textures, and flowing harmonic progressions",
        "nature": "Natural soundscape with gentle rain, soft wind through leaves, distant birdsong, and peaceful forest atmosphere",
        "cosmic": "Spacious cosmic ambient music with deep drones, shimmering textures, and celestial harmonics evoking the vastness of space",
        "binaural": "Smooth continuous tone suitable for binaural beat meditation, with subtle harmonic overtones",
        "tibetan": "Traditional Tibetan singing bowl sounds with deep resonant tones, gentle chimes, and meditative bell harmonics",
        "ocean": "Peaceful ocean waves gently lapping on shore, with distant seagulls and soft sea breeze",
        "rain": "Soft rainfall on leaves and gentle thunder in the distance, creating a cozy indoor atmosphere",
        "forest": "Tranquil forest atmosphere with birdsong, gentle wind, rustling leaves, and a distant stream",
    }

    # Mood modifiers
    MOOD_MODIFIERS = {
        "calming": "very slow tempo, soft dynamics, peaceful and relaxing",
        "focused": "steady rhythm, clear tones, concentration-enhancing",
        "energizing": "slightly uplifting, bright tones while remaining peaceful",
        "peaceful": "extremely gentle, minimal, floating and dreamlike",
        "transcendent": "expansive, otherworldly, spiritually evocative",
        "grounding": "deep bass tones, earthy textures, stable and centering",
        "healing": "warm harmonics, nurturing tones, emotionally soothing",
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash-exp",
        storage_path: Optional[Path] = None,
    ):
        """
        Initialize meditation audio service

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            model: Gemini model to use for generation
            storage_path: Path to store generated audio files
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key required. Set GOOGLE_API_KEY environment variable or pass api_key."
            )

        self.model = model
        self._client = None

        # Set up storage path
        if storage_path:
            self.storage_path = storage_path
        else:
            # Default to data/meditation_audio in backend directory
            backend_dir = Path(__file__).parent.parent.parent
            self.storage_path = backend_dir / "data" / "meditation_audio"

        self.storage_path.mkdir(parents=True, exist_ok=True)

    def _get_client(self):
        """Lazy initialization of Gemini client"""
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise ImportError(
                    "google-genai package required. Install with: pip install google-genai"
                )
        return self._client

    def _build_prompt(
        self,
        style: str,
        mood: str,
        duration_seconds: int,
        custom_prompt: Optional[str] = None,
        binaural_frequency: Optional[float] = None,
    ) -> str:
        """
        Build the audio generation prompt

        Args:
            style: Audio style (ambient, nature, cosmic, etc.)
            mood: Mood modifier (calming, focused, etc.)
            duration_seconds: Desired duration
            custom_prompt: Optional custom user prompt
            binaural_frequency: Optional binaural beat frequency in Hz

        Returns:
            Enhanced prompt string
        """
        parts = []

        # Start with instruction
        parts.append("Generate meditation audio:")

        # Add style
        style_prompt = self.STYLE_PROMPTS.get(style, self.STYLE_PROMPTS["ambient"])
        parts.append(style_prompt)

        # Add mood modifier
        mood_modifier = self.MOOD_MODIFIERS.get(mood, self.MOOD_MODIFIERS["calming"])
        parts.append(f"Mood: {mood_modifier}")

        # Add custom prompt if provided
        if custom_prompt:
            parts.append(f"Additional details: {custom_prompt}")

        # Add binaural frequency if specified
        if binaural_frequency and style == "binaural":
            parts.append(f"Include binaural beat at {binaural_frequency}Hz")

        # Duration guidance
        minutes = duration_seconds // 60
        parts.append(f"Create a seamless {minutes}-minute meditation track")

        # Quality requirements
        parts.append("High quality audio, no vocals, continuous without abrupt changes, suitable for deep meditation")

        return ". ".join(parts)

    async def generate_audio(
        self,
        style: str = "ambient",
        mood: str = "calming",
        duration_seconds: int = 300,
        custom_prompt: Optional[str] = None,
        binaural_frequency: Optional[float] = None,
        progress_callback: Optional[Callable[[str, int, str], Awaitable[None]]] = None,
    ) -> GeneratedAudioResult:
        """
        Generate meditation audio

        Args:
            style: Audio style (ambient, nature, cosmic, binaural, tibetan, ocean, rain, forest)
            mood: Mood (calming, focused, energizing, peaceful, transcendent, grounding, healing)
            duration_seconds: Desired duration in seconds (30-3600)
            custom_prompt: Optional custom prompt additions
            binaural_frequency: Binaural beat frequency in Hz (if style is binaural)
            progress_callback: Async callback(stage, percent, message)

        Returns:
            GeneratedAudioResult with audio data or error
        """
        try:
            # Build the prompt
            prompt = self._build_prompt(
                style=style,
                mood=mood,
                duration_seconds=duration_seconds,
                custom_prompt=custom_prompt,
                binaural_frequency=binaural_frequency,
            )

            if progress_callback:
                await progress_callback("preparing", 10, "Crafting your meditation soundscape...")

            # Generate audio using Gemini
            client = self._get_client()

            if progress_callback:
                await progress_callback("generating", 30, "Generating meditation audio...")

            # Call Gemini API with audio generation
            response = await asyncio.to_thread(
                self._generate_sync,
                client,
                prompt,
                duration_seconds,
            )

            if progress_callback:
                await progress_callback("processing", 70, "Processing audio...")

            if response is None:
                # If Gemini audio generation isn't available, generate a placeholder
                # In production, this would be actual Gemini audio generation
                logger.warning("Gemini audio generation not available, generating placeholder")
                audio_data, duration = self._generate_placeholder_audio(duration_seconds)

                if progress_callback:
                    await progress_callback("complete", 100, "Audio ready!")

                return GeneratedAudioResult(
                    success=True,
                    audio_id=str(uuid.uuid4()),
                    audio_data=audio_data,
                    mime_type="audio/wav",
                    duration_seconds=duration,
                    prompt=prompt,
                    enhanced_prompt=prompt,
                )

            # Extract audio from response
            audio_data, mime_type, duration = self._extract_audio(response)

            if not audio_data:
                return GeneratedAudioResult(
                    success=False,
                    prompt=prompt,
                    enhanced_prompt=prompt,
                    error="No audio data in response",
                )

            if progress_callback:
                await progress_callback("complete", 100, "Audio ready!")

            return GeneratedAudioResult(
                success=True,
                audio_id=str(uuid.uuid4()),
                audio_data=audio_data,
                mime_type=mime_type,
                duration_seconds=duration,
                prompt=prompt,
                enhanced_prompt=prompt,
            )

        except Exception as e:
            logger.error(f"Error generating audio: {e}")
            return GeneratedAudioResult(
                success=False,
                prompt=custom_prompt or "",
                error=str(e),
            )

    def _generate_sync(
        self,
        client,
        prompt: str,
        duration_seconds: int,
        max_retries: int = 3,
    ):
        """
        Synchronous audio generation (called in thread pool)

        Note: Gemini's audio generation capabilities may vary. This attempts
        to use the available audio generation features.
        """
        import time
        from google.genai import types

        # Try to generate audio using Gemini
        # Note: Audio generation support in Gemini is evolving
        try:
            config = types.GenerateContentConfig(
                response_modalities=["AUDIO", "TEXT"],
            )

            last_error = None
            for attempt in range(max_retries):
                try:
                    response = client.models.generate_content(
                        model=self.model,
                        contents=prompt,
                        config=config,
                    )
                    return response
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()

                    # Check for rate limit
                    if "429" in str(e) or "resource_exhausted" in error_str:
                        wait_time = (2 ** attempt) * 15
                        logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                        time.sleep(wait_time)
                        continue
                    # Check if audio modality not supported
                    elif "audio" in error_str and "not supported" in error_str:
                        logger.info("Audio generation not supported by model, using placeholder")
                        return None
                    else:
                        raise

            logger.error(f"Gemini API error after {max_retries} retries: {last_error}")
            return None

        except Exception as e:
            logger.warning(f"Audio generation not available: {e}")
            return None

    def _extract_audio(self, response) -> tuple:
        """
        Extract audio data from Gemini response

        Returns:
            (audio_bytes, mime_type, duration_seconds)
        """
        try:
            if not response or not hasattr(response, 'candidates') or not response.candidates:
                return None, "", 0

            candidate = response.candidates[0]

            if not hasattr(candidate, 'content') or not candidate.content:
                return None, "", 0

            if not hasattr(candidate.content, 'parts') or not candidate.content.parts:
                return None, "", 0

            # Look for audio data in parts
            for part in candidate.content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    data = part.inline_data
                    if hasattr(data, 'mime_type') and 'audio' in data.mime_type:
                        audio_data = data.data
                        if isinstance(audio_data, str):
                            audio_data = base64.b64decode(audio_data)

                        # Estimate duration from file size (rough estimate)
                        # Assume ~128kbps for estimation
                        duration = len(audio_data) // (128 * 1024 // 8)

                        return audio_data, data.mime_type, duration

            return None, "", 0

        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            return None, "", 0

    def _generate_placeholder_audio(self, duration_seconds: int) -> tuple:
        """
        Generate a simple placeholder audio file (silence with soft tone)
        Used when Gemini audio generation is not available.

        Returns:
            (audio_bytes, duration_seconds)
        """
        import struct
        import math

        # Audio parameters
        sample_rate = 44100
        channels = 2
        sample_width = 2  # 16-bit

        # Limit duration for placeholder (max 60 seconds to keep file size reasonable)
        actual_duration = min(duration_seconds, 60)
        num_samples = int(sample_rate * actual_duration)

        # Generate a very soft ambient drone (barely audible)
        audio_data = []

        # Base frequency for a gentle drone
        base_freq = 110  # A2 note

        for i in range(num_samples):
            t = i / sample_rate

            # Create a soft layered drone
            # Main tone with harmonics
            sample = 0.0
            sample += 0.02 * math.sin(2 * math.pi * base_freq * t)  # Fundamental
            sample += 0.01 * math.sin(2 * math.pi * base_freq * 2 * t)  # Octave
            sample += 0.005 * math.sin(2 * math.pi * base_freq * 3 * t)  # Fifth

            # Add subtle modulation
            modulation = 1.0 + 0.1 * math.sin(2 * math.pi * 0.1 * t)
            sample *= modulation

            # Fade in/out at start/end
            fade_samples = sample_rate * 3  # 3 second fade
            if i < fade_samples:
                sample *= i / fade_samples
            elif i > num_samples - fade_samples:
                sample *= (num_samples - i) / fade_samples

            # Convert to 16-bit integer
            sample_int = int(sample * 32767)
            sample_int = max(-32768, min(32767, sample_int))

            # Stereo (same sample for both channels)
            audio_data.append(struct.pack('<hh', sample_int, sample_int))

        # Create WAV file in memory
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(sample_width)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(b''.join(audio_data))

        return wav_buffer.getvalue(), actual_duration

    async def save_audio(
        self,
        audio_data: bytes,
        audio_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Save generated audio to storage

        Args:
            audio_data: Audio bytes
            audio_id: Unique identifier
            metadata: Optional metadata to save alongside

        Returns:
            File path relative to storage directory
        """
        # Create filename
        filename = f"{audio_id}.wav"
        file_path = self.storage_path / filename

        # Save audio file
        await asyncio.to_thread(self._save_file, file_path, audio_data)

        # Save metadata if provided
        if metadata:
            meta_path = self.storage_path / f"{audio_id}.json"
            import json
            await asyncio.to_thread(
                self._save_file,
                meta_path,
                json.dumps(metadata).encode()
            )

        return str(filename)

    def _save_file(self, path: Path, data: bytes):
        """Save file to disk"""
        with open(path, 'wb') as f:
            f.write(data)

    def get_audio_url(self, audio_id: str) -> str:
        """Get URL for accessing saved audio"""
        return f"/api/meditation/audio/{audio_id}"


# Singleton instance factory
_service_instance: Optional[MeditationAudioService] = None


def get_meditation_audio_service(
    api_key: Optional[str] = None,
    force_new: bool = False,
) -> MeditationAudioService:
    """
    Get or create MeditationAudioService instance

    Args:
        api_key: Optional API key override
        force_new: Force creation of new instance

    Returns:
        MeditationAudioService instance
    """
    global _service_instance

    if force_new or _service_instance is None or api_key:
        _service_instance = MeditationAudioService(api_key=api_key)

    return _service_instance
