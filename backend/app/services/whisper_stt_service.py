"""
Whisper Speech-to-Text Service

Uses faster-whisper for low-latency local transcription.
Provides offline, free, high-quality speech recognition.
"""
import asyncio
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionResult:
    """Result from speech transcription"""
    text: str
    language: str
    confidence: float
    duration_seconds: float


class WhisperSTTService:
    """
    Local speech-to-text using faster-whisper.

    Supports:
    - Real-time transcription from audio chunks
    - Multiple model sizes (tiny, base, small, medium)
    - Language detection
    - VAD filtering to ignore silence

    Usage:
        service = WhisperSTTService(model_size="base")
        result = await service.transcribe_audio(audio_bytes)
        print(result.text)
    """

    def __init__(
        self,
        model_size: str = "base",  # tiny, base, small, medium, large-v3
        device: str = "auto",  # auto, cpu, cuda
        compute_type: str = "int8"  # int8, float16, float32
    ):
        """
        Initialize Whisper STT service.

        Args:
            model_size: Whisper model size. Options:
                - tiny: ~75MB, fastest, lower accuracy
                - base: ~150MB, good balance (recommended)
                - small: ~500MB, better accuracy
                - medium: ~1.5GB, high accuracy
                - large-v3: ~3GB, best accuracy
            device: Compute device (auto detects GPU if available)
            compute_type: Precision for inference
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model = None
        self._audio_buffer = bytearray()
        self._is_loading = False

    def _get_model(self):
        """Lazy load the Whisper model"""
        if self._model is None:
            try:
                from faster_whisper import WhisperModel

                logger.info(f"Loading Whisper model: {self.model_size} (device={self.device}, compute_type={self.compute_type})")

                self._model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=self.compute_type
                )

                logger.info(f"Whisper model loaded successfully")

            except ImportError:
                raise ImportError(
                    "faster-whisper required. Install with: pip install faster-whisper"
                )
        return self._model

    async def preload_model(self):
        """
        Preload the model in the background.
        Call this at startup to avoid first-request latency.
        """
        if self._model is not None or self._is_loading:
            return

        self._is_loading = True
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._get_model)
        self._is_loading = False

    async def transcribe_audio(
        self,
        audio_data: bytes,
        sample_rate: int = 16000,
        language: Optional[str] = None
    ) -> Optional[TranscriptionResult]:
        """
        Transcribe audio data to text.

        Args:
            audio_data: PCM audio bytes (16-bit signed, mono)
            sample_rate: Audio sample rate (default 16kHz)
            language: Optional language code (e.g., "en", "es"). Auto-detects if None.

        Returns:
            TranscriptionResult or None if no speech detected
        """
        if len(audio_data) < 3200:  # Less than 0.1 second at 16kHz
            logger.debug("Audio too short, skipping transcription")
            return None

        # Run transcription in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._transcribe_sync,
            audio_data,
            sample_rate,
            language
        )

    def _transcribe_sync(
        self,
        audio_data: bytes,
        sample_rate: int,
        language: Optional[str] = None
    ) -> Optional[TranscriptionResult]:
        """Synchronous transcription (runs in thread pool)"""
        import numpy as np

        model = self._get_model()

        # Convert bytes to numpy array (16-bit PCM)
        try:
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            # Normalize to float32 in range [-1, 1]
            audio_float = audio_array.astype(np.float32) / 32768.0
        except Exception as e:
            logger.error(f"Error converting audio data: {e}")
            return None

        # Check if audio is too quiet (likely silence)
        if np.abs(audio_float).max() < 0.01:
            logger.debug("Audio appears to be silence")
            return None

        try:
            # Run transcription with VAD filtering
            segments, info = model.transcribe(
                audio_float,
                beam_size=5,
                language=language,
                vad_filter=True,  # Filter out non-speech
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    speech_pad_ms=200
                )
            )

            # Collect all text
            text_parts = []
            total_duration = 0.0

            for segment in segments:
                text_parts.append(segment.text)
                total_duration = max(total_duration, segment.end)

            if not text_parts:
                logger.debug("No speech detected in audio")
                return None

            full_text = " ".join(text_parts).strip()

            if not full_text:
                return None

            return TranscriptionResult(
                text=full_text,
                language=info.language,
                confidence=info.language_probability,
                duration_seconds=total_duration
            )

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return None

    def add_audio_chunk(self, chunk: bytes):
        """
        Add audio chunk to internal buffer for streaming transcription.

        Args:
            chunk: PCM audio chunk (16-bit signed, mono, 16kHz)
        """
        self._audio_buffer.extend(chunk)

    async def transcribe_buffer(
        self,
        language: Optional[str] = None
    ) -> Optional[TranscriptionResult]:
        """
        Transcribe accumulated audio buffer and clear it.

        Returns:
            TranscriptionResult or None if no speech detected
        """
        if len(self._audio_buffer) < 16000:  # Less than 0.5 second
            logger.debug("Buffer too short for transcription")
            return None

        audio_data = bytes(self._audio_buffer)
        self._audio_buffer = bytearray()

        return await self.transcribe_audio(audio_data, language=language)

    def clear_buffer(self):
        """Clear the audio buffer"""
        self._audio_buffer = bytearray()

    def get_buffer_duration(self, sample_rate: int = 16000) -> float:
        """
        Get current buffer duration in seconds.

        Args:
            sample_rate: Audio sample rate

        Returns:
            Duration in seconds
        """
        # 16-bit audio = 2 bytes per sample
        num_samples = len(self._audio_buffer) // 2
        return num_samples / sample_rate


# Singleton instance
_stt_service: Optional[WhisperSTTService] = None


def get_whisper_stt_service(
    model_size: str = "base",
    force_new: bool = False
) -> WhisperSTTService:
    """
    Get or create WhisperSTTService instance.

    Args:
        model_size: Whisper model size
        force_new: Force creation of new instance

    Returns:
        WhisperSTTService instance
    """
    global _stt_service

    if force_new or _stt_service is None:
        _stt_service = WhisperSTTService(model_size=model_size)

    return _stt_service
