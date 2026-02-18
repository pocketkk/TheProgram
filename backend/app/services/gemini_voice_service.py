"""
Gemini Voice Service

Real-time voice conversation using Google Gemini Live API.
Supports bidirectional audio streaming with customizable voice and personality.
"""
import os
import asyncio
import base64
import json
import logging
from typing import Dict, Any, Optional, AsyncGenerator, Callable, Awaitable, List
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


def convert_claude_tools_to_gemini(claude_tools: List[Dict[str, Any]]) -> List[Any]:
    """
    Convert Claude tool format to Gemini Tool objects.

    Claude format:
        {"name": "...", "description": "...", "input_schema": {...}}

    Gemini format:
        types.Tool(function_declarations=[types.FunctionDeclaration(...)])

    Args:
        claude_tools: List of tools in Claude format

    Returns:
        List containing types.Tool objects
    """
    from google.genai import types

    function_declarations = []

    for tool in claude_tools:
        # Create FunctionDeclaration for each tool
        fd = types.FunctionDeclaration(
            name=tool["name"],
            description=tool.get("description", ""),
            parameters=tool.get("input_schema"),
        )
        function_declarations.append(fd)

    # Log for debugging
    logger.info(f"[VOICE] Converting {len(claude_tools)} Claude tools to Gemini format")
    if function_declarations:
        logger.info(f"[VOICE] Sample tool: {function_declarations[0].name} - {function_declarations[0].description[:50] if function_declarations[0].description else 'no desc'}...")

    # Gemini expects: [types.Tool(function_declarations=[...])]
    return [types.Tool(function_declarations=function_declarations)]


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
        on_turn_complete: Optional[Callable[[], Awaitable[None]]] = None,
        on_tool_call: Optional[Callable[[str, Dict[str, Any]], Awaitable[Dict[str, Any]]]] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        astrological_context: Optional[Dict[str, Any]] = None,
    ) -> "LiveSession":
        """
        Start a live voice session.

        Args:
            on_audio: Callback for audio output chunks
            on_text: Callback for text response (transcript)
            on_transcript: Callback for both user and model transcripts (role, text)
            on_turn_complete: Callback when model finishes speaking
            on_tool_call: Callback to execute a tool (name, args) -> result
            tools: List of tools in Claude format (will be converted to Gemini format)
            astrological_context: Current chart context to include in system prompt

        Returns:
            LiveSession object for managing the conversation
        """
        client = self._get_client()

        # Build system instruction with personality and context
        system_instruction = self.voice_settings.to_system_instruction()

        # Add tool usage instructions if tools are provided
        if tools:
            system_instruction += """

IMPORTANT - SINGLE-USER APPLICATION:
This is a single-user desktop astrology application. The user's chart is already loaded and visible.
- NEVER ask the user for chart IDs, UUIDs, or technical identifiers
- When the user says "my chart" or "the chart", use the active chart shown in the context
- For tools that need a chart_id, use the active chart ID from the context
- Only ask about chart selection if the user explicitly wants to switch to a different person's chart

You have access to tools that allow you to interact with the astrology application.
When the user asks you to do something that requires a tool (like navigating to a page,
selecting a planet, or getting chart data), use the appropriate tool with the active chart.
After using a tool, explain what you did in a natural, conversational way.
"""

        if astrological_context:
            context_str = self._format_astrological_context(astrological_context)
            system_instruction += f"\n\nCurrent astrological context:\n{context_str}"

        # Add conversation history context if any
        if self._conversation_history:
            history_summary = self._summarize_history()
            system_instruction += f"\n\nConversation so far:\n{history_summary}"

        # Create live session configuration
        from google.genai import types

        # Convert tools to Gemini format if provided
        gemini_tools = convert_claude_tools_to_gemini(tools) if tools else None

        # Log tool configuration
        logger.info(f"[VOICE] Tools provided: {len(tools) if tools else 0}")
        if gemini_tools and len(gemini_tools) > 0:
            tool_obj = gemini_tools[0]
            num_funcs = len(tool_obj.function_declarations) if hasattr(tool_obj, 'function_declarations') else 0
            logger.info(f"[VOICE] Gemini Tool with {num_funcs} function declarations")
        else:
            logger.info("[VOICE] No Gemini tools configured")

        # Log system instruction (truncated)
        logger.info(f"[VOICE] System instruction length: {len(system_instruction)} chars")
        logger.info(f"[VOICE] System instruction (first 500 chars): {system_instruction[:500]}")

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
            tools=gemini_tools,
        )

        # Log the config for debugging
        logger.info(f"[VOICE] LiveConnectConfig created with response_modalities={config.response_modalities}")
        logger.info(f"[VOICE] Tools in config: {config.tools is not None}")

        session = LiveSession(
            client=client,
            config=config,
            on_audio=on_audio,
            on_text=on_text,
            on_transcript=on_transcript,
            on_turn_complete=on_turn_complete,
            on_tool_call=on_tool_call,
            conversation_history=self._conversation_history,
        )

        self._session = session
        return session

    def _format_astrological_context(self, context: Dict[str, Any]) -> str:
        """Format astrological context for system prompt"""
        parts = []

        # Include chart identification (important for single-user context)
        chart_id = context.get("chart_id", "")
        chart_name = context.get("chart_name", "")
        chart_type = context.get("chart_type", "natal")

        if chart_id:
            # Note: chart_name may be generic "Current Chart" from frontend
            # The important thing is the ID for tool calls
            parts.append(f"Active chart ID: {chart_id} (Type: {chart_type})")
            parts.append("Use this chart_id for any tool calls that need it.")

        if planets := context.get("planets"):
            planet_str = ", ".join(
                f"{name.title()} in {data.get('sign_name', 'Unknown')}"
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

    Handles bidirectional audio streaming, transcription, and tool execution.
    """

    def __init__(
        self,
        client,
        config,
        on_audio: Optional[Callable[[bytes], Awaitable[None]]] = None,
        on_text: Optional[Callable[[str], Awaitable[None]]] = None,
        on_transcript: Optional[Callable[[str, str], Awaitable[None]]] = None,
        on_turn_complete: Optional[Callable[[], Awaitable[None]]] = None,
        on_tool_call: Optional[Callable[[str, Dict[str, Any]], Awaitable[Dict[str, Any]]]] = None,
        conversation_history: Optional[List[VoiceMessage]] = None,
    ):
        self.client = client
        self.config = config
        self.on_audio = on_audio
        self.on_text = on_text
        self.on_transcript = on_transcript
        self.on_turn_complete = on_turn_complete
        self.on_tool_call = on_tool_call
        self.conversation_history = conversation_history or []

        self._session = None
        self._context_manager = None  # Keep reference to prevent GC
        self._is_connected = False
        self._receive_task = None
        self._accumulated_text = ""
        self._accumulated_audio = bytearray()

    async def connect(self):
        """Connect to the Gemini Live API"""
        try:
            # Use the async context manager for live connect
            logger.info("Creating Gemini Live connection...")
            self._context_manager = self.client.aio.live.connect(
                model="gemini-2.0-flash",
                config=self.config
            )
            # Enter the context manager
            logger.info("Entering async context manager...")
            self._session = await self._context_manager.__aenter__()
            logger.info(f"Session created: {type(self._session).__name__}")
            self._is_connected = True

            # Start receiving responses
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Send a brief greeting to initialize the session and confirm connection
            # Using send_client_content for the initial setup message
            from google.genai import types
            logger.info("Sending initial greeting to Gemini...")
            await self._session.send_client_content(
                turns=[
                    types.Content(
                        role="user",
                        parts=[types.Part(text="Hello, I'm ready to chat.")]
                    )
                ],
                turn_complete=True
            )

            logger.info("Connected to Gemini Live API - greeting sent")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Gemini Live API: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            self._is_connected = False
            raise

    async def disconnect(self):
        """Disconnect from the Gemini Live API"""
        logger.info("Disconnecting from Gemini Live API...")
        self._is_connected = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self._context_manager:
            try:
                await self._context_manager.__aexit__(None, None, None)
            except Exception as e:
                logger.warning(f"Error closing session: {e}")
            self._context_manager = None
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

        # Log audio chunk info periodically for debugging
        if not hasattr(self, '_audio_chunk_count'):
            self._audio_chunk_count = 0
        self._audio_chunk_count += 1
        if self._audio_chunk_count % 25 == 0:  # Log every 25 chunks
            logger.info(f"Sent {self._audio_chunk_count} audio chunks to Gemini (latest: {len(audio_data)} bytes)")

        # Use send_realtime_input with proper mime type including sample rate
        await self._session.send_realtime_input(
            audio=types.Blob(
                data=audio_data,
                mime_type="audio/pcm;rate=16000"
            )
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

        # With send_realtime_input, VAD automatically detects when user stops speaking
        # No explicit end_of_turn signal needed - Gemini will respond after detecting
        # a pause in the audio stream (typically > 1 second of silence)
        logger.debug("End turn signaled - relying on VAD for response trigger")

    async def _receive_loop(self):
        """Background task to receive responses from Gemini"""
        logger.info("Starting receive loop...")
        response_count = 0
        try:
            while self._is_connected and self._session:
                try:
                    logger.info("Waiting for Gemini responses...")
                    async for response in self._session.receive():
                        try:
                            response_count += 1
                            logger.info(f"Received response #{response_count}: {type(response).__name__}")
                            # Log response structure for debugging
                            if hasattr(response, 'server_content') and response.server_content:
                                sc = response.server_content
                                logger.info(f"  server_content: model_turn={hasattr(sc, 'model_turn') and sc.model_turn is not None}, turn_complete={getattr(sc, 'turn_complete', None)}")
                            await self._handle_response(response)
                        except IndexError as ie:
                            # Transient error from Gemini library, ignore
                            logger.debug(f"IndexError in response handling (ignoring): {ie}")
                            continue
                        except Exception as he:
                            logger.warning(f"Error handling response: {he}")
                            continue
                    logger.warning("Receive iterator completed unexpectedly")
                except asyncio.CancelledError:
                    raise
                except IndexError as ie:
                    # IndexError can occur at iterator level too - transient, continue
                    logger.debug(f"IndexError in receive iterator (ignoring): {ie}")
                    continue
                except Exception as e:
                    error_str = str(e)
                    # Ignore "connection closed OK" - that's normal
                    if "1000 (OK)" in error_str:
                        logger.info("Gemini connection closed normally")
                    # Ignore "list index out of range" - transient Gemini library issue
                    elif "list index out of range" in error_str:
                        logger.debug(f"Transient IndexError (ignoring): {e}")
                        continue
                    elif self._is_connected:
                        logger.error(f"Error receiving from Gemini: {e}")
                        import traceback
                        logger.error(f"Traceback: {traceback.format_exc()}")
                    break
        except asyncio.CancelledError:
            logger.info("Receive loop cancelled")
        logger.info("Receive loop exited")

    async def _handle_response(self, response):
        """Handle a response from Gemini"""
        from google.genai import types

        # Log ALL response attributes to understand what Gemini is sending
        response_attrs = [attr for attr in dir(response) if not attr.startswith('_')]
        logger.info(f"[VOICE] Response attributes: {response_attrs}")

        # Check each attribute to see what's populated
        for attr in response_attrs:
            try:
                val = getattr(response, attr)
                if val is not None and not callable(val):
                    logger.info(f"[VOICE] {attr} = {type(val).__name__}: {str(val)[:200]}")
            except Exception:
                pass

        # Check for tool_call at response level (print to console for immediate visibility)
        if hasattr(response, 'tool_call') and response.tool_call:
            logger.info(f"[VOICE] TOOL CALL DETECTED at response level: {response.tool_call}")

        # Handle server content (model responses)
        if hasattr(response, 'server_content') and response.server_content:
            content = response.server_content

            # Check for model turn
            if hasattr(content, 'model_turn') and content.model_turn:
                logger.info(f"Model turn with {len(content.model_turn.parts)} parts")
                for part in content.model_turn.parts:
                    # Handle audio output
                    if hasattr(part, 'inline_data') and part.inline_data:
                        audio_data = part.inline_data.data
                        if isinstance(audio_data, str):
                            audio_data = base64.b64decode(audio_data)

                        logger.info(f"Received audio chunk: {len(audio_data)} bytes")
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
                logger.info("Turn complete received from Gemini")
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

                # Always signal turn complete (even if no text)
                if self.on_turn_complete:
                    logger.info("Calling on_turn_complete callback")
                    await self.on_turn_complete()

        # Handle tool calls from Gemini
        if hasattr(response, 'tool_call') and response.tool_call:
            await self._handle_tool_calls(response.tool_call)

    async def _handle_tool_calls(self, tool_call):
        """
        Handle tool calls from Gemini and send responses back.

        Args:
            tool_call: The tool_call object from Gemini response
        """
        from google.genai import types

        if not hasattr(tool_call, 'function_calls') or not tool_call.function_calls:
            logger.warning("Tool call received but no function_calls found")
            return

        function_responses = []

        for fc in tool_call.function_calls:
            tool_name = fc.name
            tool_args = dict(fc.args) if hasattr(fc, 'args') and fc.args else {}

            logger.info(f"Tool call received: {tool_name} with args: {tool_args}")

            # Execute the tool via callback
            if self.on_tool_call:
                try:
                    result = await self.on_tool_call(tool_name, tool_args)
                    logger.info(f"Tool {tool_name} executed successfully: {result}")
                except Exception as e:
                    logger.error(f"Error executing tool {tool_name}: {e}")
                    result = {"success": False, "error": str(e)}
            else:
                logger.warning(f"No tool callback configured, skipping tool: {tool_name}")
                result = {"success": False, "error": "Tool execution not configured"}

            # Create function response
            function_response = types.FunctionResponse(
                id=fc.id if hasattr(fc, 'id') else None,
                name=tool_name,
                response=result
            )
            function_responses.append(function_response)

        # Send tool responses back to Gemini
        if function_responses and self._session:
            logger.info(f"Sending {len(function_responses)} function response(s) to Gemini")
            try:
                await self._session.send_tool_response(function_responses=function_responses)
            except Exception as e:
                logger.error(f"Error sending tool response: {e}")

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
