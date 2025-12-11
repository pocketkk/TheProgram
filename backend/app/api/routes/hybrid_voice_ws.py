"""
Hybrid Voice WebSocket Endpoint

Combines:
- Whisper STT for speech-to-text (local, offline)
- Claude Agent for AI processing (with all tools)
- Gemini TTS for text-to-speech (via speak_text tool)

Architecture:
1. User speaks -> Frontend captures audio -> Backend
2. Backend -> Whisper STT -> Transcription
3. Transcription -> Claude Agent (all tools available)
4. Claude uses speak_text tool -> Gemini TTS -> Audio back to frontend
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import json
import uuid
import asyncio
import base64
import time

from app.services.agent_service import AgentService, FRONTEND_TOOLS
from app.services.whisper_stt_service import WhisperSTTService, get_whisper_stt_service
from app.services.tts_service import get_tts_provider, TTSVoice, TTSProvider
from app.core.websocket import manager
from app.core.database_sqlite import SessionLocal
from app.models.app_config import AppConfig

router = APIRouter()
logger = logging.getLogger(__name__)

# Active sessions
hybrid_voice_sessions: Dict[str, Dict[str, Any]] = {}

# Pending tool results (for async frontend tools like capture_screenshot)
pending_tool_results: Dict[str, Dict[str, Any]] = {}

# Session cleanup constants
SESSION_TTL_SECONDS = 3600  # 1 hour
CLEANUP_INTERVAL_SECONDS = 300  # 5 minutes
_last_cleanup_time = 0


def cleanup_stale_sessions():
    """Remove stale sessions to prevent memory leaks"""
    global _last_cleanup_time
    current_time = time.time()

    if current_time - _last_cleanup_time < CLEANUP_INTERVAL_SECONDS:
        return

    _last_cleanup_time = current_time
    stale_threshold = current_time - SESSION_TTL_SECONDS

    stale_connections = [
        conn_id for conn_id, session in hybrid_voice_sessions.items()
        if session.get("last_activity", 0) < stale_threshold
    ]
    for conn_id in stale_connections:
        logger.info(f"Cleaning up stale hybrid voice session: {conn_id}")
        del hybrid_voice_sessions[conn_id]


@router.websocket("/ws/hybrid-voice")
async def hybrid_voice_conversation(websocket: WebSocket):
    """
    Hybrid Voice WebSocket: Whisper STT + Claude Agent + Gemini TTS

    Protocol:

    Client -> Server:
    - {"type": "start_session", "voice_settings": {...}, "astrological_context": {...}}
    - {"type": "audio_chunk", "data": "base64-pcm-16khz"}
    - {"type": "end_speech"}  // User finished speaking
    - {"type": "text_message", "content": "..."}  // Fallback to text
    - {"type": "tool_result", "tool_call_id": "...", "tool_name": "...", "result": {...}}
    - {"type": "stop_session"}
    - {"type": "ping"}

    Server -> Client:
    - {"type": "connected", "session_id": "...", "stt_ready": bool, "tts_ready": bool}
    - {"type": "session_started"}
    - {"type": "transcription", "text": "...", "is_final": true}
    - {"type": "thinking"}  // Claude is processing
    - {"type": "text_delta", "content": "..."}  // Claude's text response
    - {"type": "audio_chunk", "data": "base64-pcm-24khz"}  // TTS output
    - {"type": "speech_start"}  // TTS starting
    - {"type": "speech_complete"}  // TTS finished
    - {"type": "tool_call", "id": "...", "name": "...", "input": {...}, "await_result": bool}
    - {"type": "complete", "full_response": "..."}
    - {"type": "error", "error": "..."}
    - {"type": "pong"}
    """
    connection_id = f"hybrid_voice_{uuid.uuid4().hex[:8]}"
    session_id = None
    stt_service: Optional[WhisperSTTService] = None
    tts_provider: Optional[TTSProvider] = None
    agent_service: Optional[AgentService] = None
    audio_buffer = bytearray()
    message_queue: asyncio.Queue = asyncio.Queue()
    receiver_task = None

    cleanup_stale_sessions()

    async def receive_messages():
        """Background task to receive websocket messages and route them."""
        try:
            while True:
                data = await websocket.receive_text()
                request = json.loads(data)
                message_type = request.get("type")

                if message_type == "tool_result":
                    # Handle frontend tool execution result immediately
                    tool_id = request.get("tool_call_id") or request.get("tool_id")
                    tool_name = request.get("tool_name")
                    result = request.get("result")
                    logger.info(f"[HYBRID] Frontend tool {tool_name} ({tool_id}) completed")

                    # Signal any waiting coroutine
                    if tool_id and tool_id in pending_tool_results:
                        pending_tool_results[tool_id]["result"] = result
                        pending_tool_results[tool_id]["event"].set()
                        logger.info(f"[HYBRID] Signaled pending tool result for {tool_id}")
                else:
                    # Queue other messages for main handler
                    await message_queue.put(request)
        except WebSocketDisconnect:
            await message_queue.put({"type": "_disconnect"})
        except Exception as e:
            logger.error(f"[HYBRID] Receiver task error: {e}")
            await message_queue.put({"type": "_error", "error": str(e)})

    try:
        await manager.connect(websocket, connection_id)

        # Get API keys from database
        db = SessionLocal()
        try:
            config = db.query(AppConfig).filter_by(id=1).first()
            anthropic_key = config.anthropic_api_key if config else None
            google_key = config.google_api_key if config else None
        finally:
            db.close()

        # Validate required API key
        if not anthropic_key:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": "Anthropic API key required for Claude agent",
                "code": "api_key_missing"
            })
            return

        # Initialize services
        stt_ready = False
        tts_ready = False

        try:
            # Initialize Claude agent (required)
            agent_service = AgentService(api_key=anthropic_key)
            logger.info(f"[HYBRID] Claude agent initialized for {connection_id}")

            # Initialize Whisper STT (optional but recommended)
            try:
                stt_service = get_whisper_stt_service(model_size="base")
                # Preload model in background
                asyncio.create_task(stt_service.preload_model())
                stt_ready = True
                logger.info(f"[HYBRID] Whisper STT initialized for {connection_id}")
            except Exception as e:
                logger.warning(f"[HYBRID] Whisper STT not available: {e}. Voice input disabled.")

            # Initialize TTS (optional)
            if google_key:
                try:
                    tts_provider = get_tts_provider("gemini", api_key=google_key)
                    tts_ready = True
                    logger.info(f"[HYBRID] Gemini TTS initialized for {connection_id}")
                except Exception as e:
                    logger.warning(f"[HYBRID] Gemini TTS not available: {e}. Voice output disabled.")

        except Exception as e:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": f"Failed to initialize services: {str(e)}"
            })
            return

        # Generate session ID
        session_id = uuid.uuid4().hex
        hybrid_voice_sessions[connection_id] = {
            "session_id": session_id,
            "conversation_history": [],
            "chart_context": None,
            "user_preferences": None,
            "voice_settings": {},
            "last_activity": time.time(),
        }

        await manager.send_message(connection_id, {
            "type": "connected",
            "session_id": session_id,
            "stt_ready": stt_ready,
            "tts_ready": tts_ready,
            "message": "Hybrid voice ready"
        })

        # Start background receiver task
        receiver_task = asyncio.create_task(receive_messages())

        # Message handling loop
        while True:
            try:
                request = await message_queue.get()
                msg_type = request.get("type")

                # Handle disconnect/error from receiver
                if msg_type == "_disconnect":
                    logger.info(f"[HYBRID] WebSocket disconnected: {connection_id}")
                    break
                if msg_type == "_error":
                    logger.error(f"[HYBRID] Receiver error: {request.get('error')}")
                    break

                # Update activity timestamp
                if connection_id in hybrid_voice_sessions:
                    hybrid_voice_sessions[connection_id]["last_activity"] = time.time()

                if msg_type == "start_session":
                    session = hybrid_voice_sessions[connection_id]
                    session["chart_context"] = request.get("astrological_context")
                    session["user_preferences"] = request.get("user_preferences")
                    session["voice_settings"] = request.get("voice_settings", {})

                    await manager.send_message(connection_id, {
                        "type": "session_started",
                        "session_id": session_id
                    })

                elif msg_type == "audio_chunk":
                    # Accumulate audio for STT
                    audio_b64 = request.get("data", "")
                    if audio_b64:
                        try:
                            audio_bytes = base64.b64decode(audio_b64)
                            audio_buffer.extend(audio_bytes)
                        except Exception as e:
                            logger.warning(f"[HYBRID] Error decoding audio: {e}")

                elif msg_type == "end_speech":
                    # User finished speaking - transcribe and process
                    # Screenshot is captured by frontend and sent with this message
                    screenshot = request.get("screenshot")  # {image: base64, mimeType: string}

                    if len(audio_buffer) > 0 and stt_service:
                        await handle_user_speech(
                            connection_id=connection_id,
                            audio_data=bytes(audio_buffer),
                            stt_service=stt_service,
                            agent_service=agent_service,
                            tts_provider=tts_provider,
                            session=hybrid_voice_sessions[connection_id],
                            screenshot=screenshot
                        )
                    elif len(audio_buffer) > 0 and not stt_service:
                        await manager.send_message(connection_id, {
                            "type": "error",
                            "error": "Speech-to-text not available. Please use text input."
                        })
                    audio_buffer = bytearray()

                elif msg_type == "text_message":
                    # Text input (fallback or primary)
                    content = request.get("content", "").strip()
                    if content:
                        await process_user_message(
                            connection_id=connection_id,
                            message=content,
                            agent_service=agent_service,
                            tts_provider=tts_provider,
                            session=hybrid_voice_sessions[connection_id]
                        )

                elif msg_type == "stop_session":
                    await manager.send_message(connection_id, {
                        "type": "session_stopped"
                    })
                    break

                elif msg_type == "ping":
                    await manager.send_message(connection_id, {"type": "pong"})

                else:
                    await manager.send_message(connection_id, {
                        "type": "error",
                        "error": f"Unknown message type: {msg_type}"
                    })

            except json.JSONDecodeError as e:
                await manager.send_message(connection_id, {
                    "type": "error",
                    "error": f"Invalid JSON: {e}"
                })

    except WebSocketDisconnect:
        logger.info(f"[HYBRID] WebSocket disconnected: {connection_id}")
    except Exception as e:
        import traceback
        logger.error(f"[HYBRID] WebSocket error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        try:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": str(e)
            })
        except:
            pass
    finally:
        # Cancel receiver task
        if receiver_task:
            receiver_task.cancel()
            try:
                await receiver_task
            except asyncio.CancelledError:
                pass
        if connection_id in hybrid_voice_sessions:
            del hybrid_voice_sessions[connection_id]
        manager.disconnect(connection_id)


async def handle_user_speech(
    connection_id: str,
    audio_data: bytes,
    stt_service: WhisperSTTService,
    agent_service: AgentService,
    tts_provider: Optional[TTSProvider],
    session: Dict[str, Any],
    screenshot: Optional[Dict[str, str]] = None
):
    """Handle user speech: STT -> Claude -> TTS"""

    # Step 1: Transcribe with Whisper
    logger.info(f"[HYBRID] Transcribing {len(audio_data)} bytes of audio")

    result = await stt_service.transcribe_audio(audio_data)

    if not result or not result.text.strip():
        await manager.send_message(connection_id, {
            "type": "transcription",
            "text": "",
            "is_final": True,
            "message": "No speech detected"
        })
        return

    # Send transcription to frontend
    await manager.send_message(connection_id, {
        "type": "transcription",
        "text": result.text,
        "language": result.language,
        "confidence": result.confidence,
        "is_final": True
    })

    logger.info(f"[HYBRID] Transcribed: {result.text[:100]}...")
    if screenshot:
        logger.info(f"[HYBRID] Screenshot included with message")

    # Step 2: Process with Claude (screenshot passed upfront)
    await process_user_message(
        connection_id=connection_id,
        message=result.text,
        agent_service=agent_service,
        tts_provider=tts_provider,
        session=session,
        screenshot=screenshot
    )


async def process_user_message(
    connection_id: str,
    message: str,
    agent_service: AgentService,
    tts_provider: Optional[TTSProvider],
    session: Dict[str, Any],
    screenshot: Optional[Dict[str, str]] = None
):
    """Process user message through Claude and handle speak_text calls"""

    await manager.send_message(connection_id, {"type": "thinking"})

    db = SessionLocal()

    # Define wait_for_tool_result callback for async frontend tools
    async def wait_for_tool_result(tool_id: str, timeout: float = 30.0) -> Dict[str, Any]:
        """
        Wait for a frontend tool result to be received via WebSocket.

        Args:
            tool_id: The tool_use_id to wait for
            timeout: Maximum seconds to wait (default 30s for screenshot capture)

        Returns:
            The tool result dict from the frontend
        """
        event = asyncio.Event()
        pending_tool_results[tool_id] = {"event": event, "result": None}

        try:
            # Wait for the event to be set (by the receiver task)
            await asyncio.wait_for(event.wait(), timeout=timeout)
            result = pending_tool_results[tool_id].get("result", {})
            logger.info(f"[HYBRID] Received tool result for {tool_id}: success={result.get('success')}")
            return result
        except asyncio.TimeoutError:
            logger.warning(f"[HYBRID] Timeout waiting for tool result: {tool_id}")
            return {"success": False, "error": "Timeout waiting for frontend response"}
        finally:
            # Clean up
            pending_tool_results.pop(tool_id, None)

    try:
        # Track background TTS tasks so we can await them at end
        tts_tasks: List[asyncio.Task] = []
        full_response = ""

        # Build app context with voice_mode flag
        chart_ctx = session.get("chart_context") or {}
        app_context = {
            "voice_mode": True,  # Enable voice mode instructions
            "current_page": chart_ctx.get("current_page", "unknown"),
        }

        async for chunk in agent_service.process_message(
            message=message,
            conversation_history=session["conversation_history"],
            app_context=app_context,
            chart_context=session.get("chart_context"),
            user_preferences=session.get("user_preferences"),
            db_session=db,
            wait_for_tool_result=wait_for_tool_result,
            image=screenshot  # Screenshot captured by frontend when user finished speaking
        ):
            chunk_type = chunk.get("type")

            if chunk_type == "text_delta":
                # Stream text to frontend immediately
                await manager.send_message(connection_id, chunk)
                full_response += chunk.get("content", "")

            elif chunk_type == "tool_call":
                tool_name = chunk.get("name")
                tool_input = chunk.get("input", {})

                if tool_name == "speak_text":
                    # Fire TTS immediately in background (non-blocking)
                    # This allows Claude to keep generating while TTS runs
                    if tts_provider:
                        text = tool_input.get("text", "")
                        style = tool_input.get("style", "warm")
                        logger.info(f"[HYBRID] Firing TTS immediately: {text[:50]}...")
                        task = asyncio.create_task(
                            generate_tts_audio(connection_id, text, style, tts_provider)
                        )
                        tts_tasks.append(task)
                else:
                    # Other frontend tools (including capture_screenshot)
                    # Send to frontend - agent_service handles await_result flag
                    await manager.send_message(connection_id, chunk)

            elif chunk_type == "tool_result":
                # Don't send tool results for speak_text
                if chunk.get("name") != "speak_text":
                    await manager.send_message(connection_id, chunk)

            elif chunk_type == "complete":
                # Update conversation history
                session["conversation_history"].append({
                    "role": "user",
                    "content": message
                })
                if full_response:
                    session["conversation_history"].append({
                        "role": "assistant",
                        "content": full_response
                    })

                # Keep history manageable
                if len(session["conversation_history"]) > 40:
                    session["conversation_history"] = session["conversation_history"][-40:]

                await manager.send_message(connection_id, {
                    "type": "complete",
                    "full_response": full_response
                })

                # Wait for any pending TTS tasks to complete
                if tts_tasks:
                    logger.info(f"[HYBRID] Waiting for {len(tts_tasks)} TTS tasks to complete...")
                    await asyncio.gather(*tts_tasks, return_exceptions=True)

            elif chunk_type == "error":
                await manager.send_message(connection_id, chunk)

    except Exception as e:
        logger.error(f"[HYBRID] Error processing message: {e}")
        import traceback
        logger.error(traceback.format_exc())
        await manager.send_message(connection_id, {
            "type": "error",
            "error": str(e)
        })
    finally:
        db.close()


async def generate_tts_audio(
    connection_id: str,
    text: str,
    style: str,
    tts_provider: TTSProvider
):
    """Generate TTS audio and stream chunks to frontend as they arrive"""

    if not text.strip():
        return

    # Map style to voice
    style_voice_map = {
        "warm": TTSVoice.WARM,
        "calm": TTSVoice.CALM,
        "excited": TTSVoice.BOLD,
        "contemplative": TTSVoice.CALM,
        "serious": TTSVoice.DEEP,
    }
    voice = style_voice_map.get(style, TTSVoice.WARM)

    logger.info(f"[HYBRID] Streaming TTS for: {text[:50]}... (style={style})")

    try:
        await manager.send_message(connection_id, {"type": "speech_start"})

        # Stream audio chunks as they arrive from Gemini
        total_bytes = 0
        chunk_count = 0
        async for audio_chunk in tts_provider.stream_speech(text, voice, style):
            if audio_chunk:
                audio_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                await manager.send_message(connection_id, {
                    "type": "audio_chunk",
                    "data": audio_b64
                })
                total_bytes += len(audio_chunk)
                chunk_count += 1

        await manager.send_message(connection_id, {"type": "speech_complete"})
        logger.info(f"[HYBRID] TTS complete: {chunk_count} chunks, {total_bytes} bytes")

    except Exception as e:
        logger.error(f"[HYBRID] TTS error: {e}")
        await manager.send_message(connection_id, {
            "type": "error",
            "error": f"Speech generation failed: {str(e)}"
        })
