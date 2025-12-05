"""
Gemini Voice Service

Real-time voice conversation using Google Gemini Live API.
Supports bidirectional audio streaming with customizable voice and personality.
"""
import os
import asyncio
import base64
import logging
from typing import Dict, Any, Optional, AsyncGenerator, Callable, Awaitable, List
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class GeminiVoice(str, Enum):
    """Available Gemini voices"""
    PUCK = "Puck"       # Upbeat, playful
    CHARON = "Charon"   # Deep, authoritative
    KORE = "Kore"       # Warm, nurturing
    FENRIR = "Fenrir"   # Bold, energetic
    AOEDE = "Aoede"     # Calm, melodic


@dataclass
class VoiceSettings:
    """Voice configuration settings"""
    voice_name: str = GeminiVoice.KORE.value
    personality: str = "mystical guide"
    speaking_style: str = "warm and contemplative"
    response_length: str = "medium"  # brief, medium, detailed

    # Custom personality description
    custom_personality: Optional[str] = None

    def to_system_instruction(self) -> str:
        """Convert settings to system instruction for Gemini"""
        base_personality = self.custom_personality or f"""
You are a {self.personality} who speaks in a {self.speaking_style} manner.
You help users explore consciousness through astrology, tarot, and various wisdom traditions.
You provide insights about birth charts, transits, and life patterns.
Keep responses {self.response_length} in length - conversational and engaging for voice.
Speak naturally as if having a thoughtful conversation.
"""
        return base_personality.strip()


@dataclass
class VoiceMessage:
    """A message in the voice conversation"""
    role: str  # "user" or "model"
    content: str
    audio_data: Optional[bytes] = None
    timestamp: float = field(default_factory=lambda: asyncio.get_event_loop().time())


class GeminiVoiceService:
    """
    Real-time voice conversation service using Gemini Live API.

    Supports:
    - Bidirectional audio streaming
    - Customizable voices and personality
    - Conversation context persistence
    - Integration with text chat history

    Usage:
        service = GeminiVoiceService(api_key="...")
        async for response in service.stream_voice_conversation(audio_chunks):
            # Handle audio response chunks
            pass
    """

    # Supported audio formats
    INPUT_SAMPLE_RATE = 16000  # 16kHz for input
    OUTPUT_SAMPLE_RATE = 24000  # 24kHz for output

    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_settings: Optional[VoiceSettings] = None,
    ):
        """
        Initialize Gemini voice service

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            voice_settings: Voice configuration settings
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key required. Set GOOGLE_API_KEY environment variable or pass api_key."
            )

        self.voice_settings = voice_settings or VoiceSettings()
        self._client = None
        self._session = None
        self._conversation_history: List[VoiceMessage] = []

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

    def update_voice_settings(self, settings: VoiceSettings):
        """Update voice settings"""
        self.voice_settings = settings
        # If we have an active session, it will use new settings on next interaction

    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """
        Get conversation history in a format compatible with text chat.
        This allows context to be shared between voice and text modes.
        """
        return [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp,
                "mode": "voice"
            }
            for msg in self._conversation_history
        ]

    def set_conversation_history(self, history: List[Dict[str, Any]]):
        """
        Set conversation history from text chat.
        This allows voice chat to continue from text conversation.
        """
        self._conversation_history = [
            VoiceMessage(
                role=msg.get("role", "user"),
                content=msg.get("content", ""),
                timestamp=msg.get("timestamp", 0)
            )
            for msg in history
        ]

    def clear_history(self):
        """Clear conversation history"""
        self._conversation_history = []

    async def start_session(
        self,
        on_audio: Optional[Callable[[bytes], Awaitable[None]]] = None,
        on_text: Optional[Callable[[str], Awaitable[None]]] = None,
        on_transcript: Optional[Callable[[str, str], Awaitable[None]]] = None,
        astrological_context: Optional[Dict[str, Any]] = None,
    ) -> "LiveSession":
        """
        Start a live voice session.

        Args:
            on_audio: Callback for audio output chunks
            on_text: Callback for text response (transcript)
            on_transcript: Callback for both user and model transcripts (role, text)
            astrological_context: Current chart context to include in system prompt

        Returns:
            LiveSession object for managing the conversation
        """
        client = self._get_client()

        # Build system instruction with personality and context
        system_instruction = self.voice_settings.to_system_instruction()

        if astrological_context:
            context_str = self._format_astrological_context(astrological_context)
            system_instruction += f"\n\nCurrent astrological context:\n{context_str}"

        # Add conversation history context if any
        if self._conversation_history:
            history_summary = self._summarize_history()
            system_instruction += f"\n\nConversation so far:\n{history_summary}"

        # Create live session configuration
        from google.genai import types

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=self.voice_settings.voice_name
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text=system_instruction)]
            ),
        )

        session = LiveSession(
            client=client,
            config=config,
            on_audio=on_audio,
            on_text=on_text,
            on_transcript=on_transcript,
            conversation_history=self._conversation_history,
        )

        self._session = session
        return session

    def _format_astrological_context(self, context: Dict[str, Any]) -> str:
        """Format astrological context for system prompt"""
        parts = []

        if planets := context.get("planets"):
            planet_str = ", ".join(
                f"{name} in {data.get('sign_name', 'Unknown')}"
                for name, data in planets.items()
                if isinstance(data, dict)
            )
            parts.append(f"Planets: {planet_str}")

        if houses := context.get("houses"):
            if asc := houses.get("ascendant"):
                parts.append(f"Ascendant: {asc}°")
            if mc := houses.get("midheaven"):
                parts.append(f"Midheaven: {mc}°")

        if aspects := context.get("aspects"):
            major_aspects = [
                a for a in aspects
                if a.get("type") in ["conjunction", "opposition", "trine", "square", "sextile"]
            ][:5]  # Limit to 5 major aspects
            if major_aspects:
                aspect_str = ", ".join(
                    f"{a.get('planet1')}-{a.get('planet2')} {a.get('type')}"
                    for a in major_aspects
                )
                parts.append(f"Key aspects: {aspect_str}")

        return "\n".join(parts) if parts else "No chart currently loaded."

    def _summarize_history(self) -> str:
        """Summarize conversation history for context"""
        if not self._conversation_history:
            return ""

        # Take last 5 exchanges
        recent = self._conversation_history[-10:]
        lines = []
        for msg in recent:
            role = "User" if msg.role == "user" else "Guide"
            # Truncate long messages
            content = msg.content[:200] + "..." if len(msg.content) > 200 else msg.content
            lines.append(f"{role}: {content}")

        return "\n".join(lines)


class LiveSession:
    """
    Manages an active live voice session with Gemini.

    Handles bidirectional audio streaming and transcription.
    """

    def __init__(
        self,
        client,
        config,
        on_audio: Optional[Callable[[bytes], Awaitable[None]]] = None,
        on_text: Optional[Callable[[str], Awaitable[None]]] = None,
        on_transcript: Optional[Callable[[str, str], Awaitable[None]]] = None,
        conversation_history: Optional[List[VoiceMessage]] = None,
    ):
        self.client = client
        self.config = config
        self.on_audio = on_audio
        self.on_text = on_text
        self.on_transcript = on_transcript
        self.conversation_history = conversation_history or []

        self._session = None
        self._is_connected = False
        self._receive_task = None
        self._accumulated_text = ""
        self._accumulated_audio = bytearray()

    async def connect(self):
        """Connect to the Gemini Live API"""
        try:
            # Use the async context manager for live connect
            self._session = self.client.aio.live.connect(
                model="gemini-2.0-flash-exp",
                config=self.config
            )
            # Enter the context manager
            self._session = await self._session.__aenter__()
            self._is_connected = True

            # Start receiving responses
            self._receive_task = asyncio.create_task(self._receive_loop())

            logger.info("Connected to Gemini Live API")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Gemini Live API: {e}")
            self._is_connected = False
            raise

    async def disconnect(self):
        """Disconnect from the Gemini Live API"""
        self._is_connected = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self._session:
            try:
                await self._session.__aexit__(None, None, None)
            except Exception as e:
                logger.warning(f"Error closing session: {e}")
            self._session = None

        logger.info("Disconnected from Gemini Live API")

    async def send_audio(self, audio_data: bytes):
        """
        Send audio data to Gemini.

        Args:
            audio_data: PCM audio data (16-bit, 16kHz, mono)
        """
        if not self._is_connected or not self._session:
            raise RuntimeError("Not connected to Gemini Live API")

        from google.genai import types

        # Create blob for audio data
        blob = types.Blob(
            mime_type="audio/pcm",
            data=audio_data
        )

        await self._session.send(
            input=types.LiveClientRealtimeInput(
                media_chunks=[blob]
            ),
            end_of_turn=False
        )

    async def send_text(self, text: str):
        """
        Send text message to Gemini (for interruption or text input).

        Args:
            text: Text message to send
        """
        if not self._is_connected or not self._session:
            raise RuntimeError("Not connected to Gemini Live API")

        from google.genai import types

        await self._session.send(
            input=types.LiveClientContent(
                turns=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text=text)]
                    )
                ]
            ),
            end_of_turn=True
        )

        # Add to history
        self.conversation_history.append(
            VoiceMessage(role="user", content=text)
        )

    async def end_turn(self):
        """Signal end of user's turn (finished speaking)"""
        if not self._is_connected or not self._session:
            return

        from google.genai import types

        # Send empty input with end_of_turn=True
        await self._session.send(
            input=types.LiveClientRealtimeInput(media_chunks=[]),
            end_of_turn=True
        )

    async def _receive_loop(self):
        """Background task to receive responses from Gemini"""
        try:
            while self._is_connected and self._session:
                try:
                    async for response in self._session.receive():
                        await self._handle_response(response)
                except Exception as e:
                    if self._is_connected:
                        logger.error(f"Error receiving from Gemini: {e}")
                    break
        except asyncio.CancelledError:
            pass

    async def _handle_response(self, response):
        """Handle a response from Gemini"""
        from google.genai import types

        # Handle server content (model responses)
        if hasattr(response, 'server_content') and response.server_content:
            content = response.server_content

            # Check for model turn
            if hasattr(content, 'model_turn') and content.model_turn:
                for part in content.model_turn.parts:
                    # Handle audio output
                    if hasattr(part, 'inline_data') and part.inline_data:
                        audio_data = part.inline_data.data
                        if isinstance(audio_data, str):
                            audio_data = base64.b64decode(audio_data)

                        self._accumulated_audio.extend(audio_data)

                        if self.on_audio:
                            await self.on_audio(audio_data)

                    # Handle text output
                    if hasattr(part, 'text') and part.text:
                        self._accumulated_text += part.text

                        if self.on_text:
                            await self.on_text(part.text)

            # Check for turn completion
            if hasattr(content, 'turn_complete') and content.turn_complete:
                # Save model response to history
                if self._accumulated_text:
                    self.conversation_history.append(
                        VoiceMessage(
                            role="model",
                            content=self._accumulated_text,
                            audio_data=bytes(self._accumulated_audio) if self._accumulated_audio else None
                        )
                    )

                    if self.on_transcript:
                        await self.on_transcript("model", self._accumulated_text)

                # Reset accumulators
                self._accumulated_text = ""
                self._accumulated_audio = bytearray()

        # Handle input transcription (what user said)
        if hasattr(response, 'tool_call'):
            # Tool calls would go here if we implement them
            pass

    @property
    def is_connected(self) -> bool:
        """Check if session is connected"""
        return self._is_connected


# Singleton factory
_voice_service_instance: Optional[GeminiVoiceService] = None


def get_gemini_voice_service(
    api_key: Optional[str] = None,
    voice_settings: Optional[VoiceSettings] = None,
    force_new: bool = False,
) -> GeminiVoiceService:
    """
    Get or create GeminiVoiceService instance.

    Args:
        api_key: Optional API key override
        voice_settings: Optional voice settings
        force_new: Force creation of new instance

    Returns:
        GeminiVoiceService instance
    """
    global _voice_service_instance

    if force_new or _voice_service_instance is None or api_key:
        _voice_service_instance = GeminiVoiceService(
            api_key=api_key,
            voice_settings=voice_settings
        )
    elif voice_settings:
        _voice_service_instance.update_voice_settings(voice_settings)

    return _voice_service_instance
