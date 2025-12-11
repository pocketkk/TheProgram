"""
WebSocket endpoint for Voice Chat with Gemini Live API

Real-time bidirectional audio streaming for voice conversations.
Supports switching between voice and text modes while preserving context.
"""
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import logging
import json
import uuid
import asyncio
import base64
import time

from app.services.gemini_voice_service import (
    GeminiVoiceService,
    VoiceSettings,
    GeminiVoice,
    get_gemini_voice_service,
)
from app.services.agent_service import ALL_TOOLS, BACKEND_TOOLS
from app.core.websocket import manager
from app.core.database_sqlite import SessionLocal, get_db
from app.models.app_config import AppConfig


@contextmanager
def get_db_context():
    """Context manager for database access in WebSocket handlers"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()
logger = logging.getLogger(__name__)

# Store voice sessions by connection ID
voice_sessions: Dict[str, Dict[str, Any]] = {}

# Store conversation history that can be shared between voice and text modes
# Key: session_id, Value: list of messages (both voice and text)
shared_conversation_history: Dict[str, List[Dict[str, Any]]] = {}

# Session cleanup constants
SESSION_TTL_SECONDS = 3600  # 1 hour
CLEANUP_INTERVAL_SECONDS = 300  # 5 minutes
_last_cleanup_time = 0


# Pydantic models for input validation
class VoiceSettingsUpdate(BaseModel):
    """Schema for updating voice settings"""
    voice_name: Optional[str] = Field(None, min_length=1, max_length=50)
    personality: Optional[str] = Field(None, min_length=1, max_length=200)
    speaking_style: Optional[str] = Field(None, min_length=1, max_length=200)
    response_length: Optional[str] = Field(None, pattern="^(brief|medium|detailed)$")
    custom_personality: Optional[str] = Field(None, max_length=2000)


def cleanup_stale_sessions():
    """Remove stale sessions to prevent memory leaks"""
    global _last_cleanup_time
    current_time = time.time()

    # Only run cleanup periodically
    if current_time - _last_cleanup_time < CLEANUP_INTERVAL_SECONDS:
        return

    _last_cleanup_time = current_time
    stale_threshold = current_time - SESSION_TTL_SECONDS

    # Clean up voice sessions
    stale_connections = [
        conn_id for conn_id, session in voice_sessions.items()
        if session.get("last_activity", 0) < stale_threshold
    ]
    for conn_id in stale_connections:
        logger.info(f"Cleaning up stale voice session: {conn_id}")
        del voice_sessions[conn_id]

    # Clean up conversation history
    stale_sessions = [
        session_id for session_id, history in shared_conversation_history.items()
        if not any(
            conn.get("session_id") == session_id
            for conn in voice_sessions.values()
        )
    ]
    # Keep max 100 orphaned histories, remove oldest
    if len(stale_sessions) > 100:
        for session_id in stale_sessions[:-100]:
            del shared_conversation_history[session_id]


async def execute_backend_tool(
    tool_name: str,
    tool_args: Dict[str, Any],
    chart_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Execute a backend tool and return its result.

    This is a subset of the tools that can execute on the server side.
    More complex tools may need additional context.

    Args:
        tool_name: Name of the tool to execute
        tool_args: Input parameters for the tool
        chart_context: Current chart context (planets, houses, aspects, chart_id)

    Returns:
        Tool execution result
    """
    # Extract active chart ID from context (single-user app - use this as default)
    active_chart_id = chart_context.get("chart_id") if chart_context else None

    try:
        if tool_name == "get_chart_data":
            if not chart_context:
                return {"success": False, "error": "No chart currently loaded"}

            result = {"success": True}
            if tool_args.get("include_aspects", True):
                result["aspects"] = chart_context.get("aspects", [])
            if tool_args.get("include_patterns", True):
                result["patterns"] = chart_context.get("patterns", [])
            result["planets"] = chart_context.get("planets", {})
            result["houses"] = chart_context.get("houses", {})
            return result

        elif tool_name == "get_planet_info":
            planet_name = tool_args.get("planet", "").lower()
            if not chart_context or not chart_context.get("planets"):
                return {"success": False, "error": "No chart data available"}

            planet_data = chart_context["planets"].get(planet_name)
            if not planet_data:
                return {"success": False, "error": f"Planet '{planet_name}' not found in chart"}

            return {"success": True, "planet": planet_data}

        elif tool_name == "get_house_info":
            house_num = tool_args.get("house_number", 1)
            if not chart_context or not chart_context.get("houses"):
                return {"success": False, "error": "No chart data available"}

            houses = chart_context.get("houses", {})
            cusps = houses.get("cusps", [])

            if house_num < 1 or house_num > len(cusps):
                return {"success": False, "error": f"House {house_num} not found"}

            # Find planets in this house
            planets_in_house = []
            for name, data in chart_context.get("planets", {}).items():
                if data.get("house") == house_num:
                    planets_in_house.append(name)

            return {
                "success": True,
                "house": {
                    "number": house_num,
                    "cusp": cusps[house_num - 1] if cusps else None,
                    "planets": planets_in_house
                }
            }

        elif tool_name == "list_available_charts":
            with get_db_context() as db:
                from app.models.chart import Chart
                from app.models.birth_data import BirthData

                charts = db.query(Chart).join(
                    BirthData, Chart.birth_data_id == BirthData.id
                ).order_by(Chart.updated_at.desc()).limit(20).all()

                chart_list = []
                for chart in charts:
                    birth_data = db.query(BirthData).filter(
                        BirthData.id == chart.birth_data_id
                    ).first()
                    # Mark which chart is currently active
                    is_active = str(chart.id) == active_chart_id
                    chart_list.append({
                        "id": str(chart.id),
                        "name": chart.chart_name,
                        "type": chart.chart_type,
                        "location": birth_data.location_string if birth_data else "Unknown",
                        "is_active": is_active,
                    })

                return {
                    "success": True,
                    "charts": chart_list,
                    "count": len(chart_list),
                    "active_chart_id": active_chart_id
                }

        elif tool_name == "get_active_chart_info":
            # Return info about the currently active chart (no ID needed)
            if not chart_context:
                return {"success": False, "error": "No chart currently loaded"}

            return {
                "success": True,
                "chart_id": active_chart_id,
                "chart_name": chart_context.get("chart_name", "Unknown"),
                "chart_type": chart_context.get("chart_type", "natal"),
                "message": "This is the currently active chart - no need to ask for IDs"
            }

        else:
            # Tool not implemented for voice - return helpful message
            return {
                "success": False,
                "error": f"Tool '{tool_name}' is not yet available in voice mode"
            }

    except Exception as e:
        logger.error(f"Error executing backend tool {tool_name}: {e}")
        return {"success": False, "error": str(e)}


@router.websocket("/ws/voice")
async def voice_conversation(websocket: WebSocket):
    """
    WebSocket endpoint for voice conversations with Gemini Live API.

    Connection flow:
    1. Client connects
    2. Server sends connected message with session_id
    3. Client sends voice settings and starts session
    4. Client streams audio, server streams audio responses
    5. Either side can close connection

    Client -> Server messages:
    {
        "type": "start_session",
        "voice_settings": {
            "voice_name": "Kore",
            "personality": "mystical guide",
            "speaking_style": "warm and contemplative",
            "response_length": "medium",
            "custom_personality": null
        },
        "session_id": "optional-existing-session-id",
        "astrological_context": {...}
    }

    {
        "type": "audio_chunk",
        "data": "base64-encoded-pcm-audio"
    }

    {
        "type": "end_turn"
    }

    {
        "type": "text_message",
        "content": "User typed message"
    }

    {
        "type": "stop_session"
    }

    {
        "type": "get_history"
    }

    {
        "type": "clear_history"
    }

    {
        "type": "sync_history",
        "history": [{"role": "user", "content": "..."}]
    }

    Server -> Client messages:
    {"type": "connected", "session_id": "uuid"}
    {"type": "session_started", "voice_name": "Kore"}
    {"type": "audio_chunk", "data": "base64-encoded-pcm-audio"}
    {"type": "transcript", "role": "model", "text": "..."}
    {"type": "turn_complete"}
    {"type": "session_stopped"}
    {"type": "history", "messages": [...]}
    {"type": "error", "error": "..."}
    """
    connection_id = f"voice_{uuid.uuid4().hex[:8]}"
    session_id: Optional[str] = None
    live_session = None

    # Run cleanup on new connections
    cleanup_stale_sessions()

    try:
        # Accept WebSocket connection
        await manager.connect(websocket, connection_id)

        # Get API key from database
        with get_db_context() as db:
            config = db.query(AppConfig).filter_by(id=1).first()
            api_key = config.google_api_key if config else None

        if not api_key:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": "Google API key not configured",
                "code": "api_key_missing"
            })
            return

        # Generate session ID and send connected message
        session_id = uuid.uuid4().hex
        voice_sessions[connection_id] = {
            "session_id": session_id,
            "service": None,
            "live_session": None,
            "last_activity": time.time(),
        }

        await manager.send_message(connection_id, {
            "type": "connected",
            "session_id": session_id,
            "message": "Voice chat ready"
        })

        # Main message loop
        while True:
            try:
                data = await websocket.receive_text()
                request = json.loads(data)
                message_type = request.get("type")

                # Update last activity timestamp
                if connection_id in voice_sessions:
                    voice_sessions[connection_id]["last_activity"] = time.time()

                if message_type == "start_session":
                    # Start a new voice session
                    logger.info(f"Starting voice session for {connection_id}")
                    live_session = await handle_start_session(
                        connection_id=connection_id,
                        api_key=api_key,
                        request=request,
                        session_id=session_id,
                    )
                    logger.info(f"Voice session started, live_session: {live_session is not None}")

                elif message_type == "audio_chunk":
                    # Forward audio to Gemini
                    if live_session and live_session.is_connected:
                        audio_b64 = request.get("data", "")
                        if audio_b64:
                            audio_data = base64.b64decode(audio_b64)
                            await live_session.send_audio(audio_data)
                    else:
                        logger.warning(f"Audio chunk received but session not ready: live_session={live_session is not None}, connected={live_session.is_connected if live_session else 'N/A'}")

                elif message_type == "end_turn":
                    # Signal end of user's speaking turn
                    if live_session and live_session.is_connected:
                        await live_session.end_turn()

                elif message_type == "text_message":
                    # Handle text input while in voice mode
                    content = request.get("content", "")
                    if live_session and live_session.is_connected and content:
                        await live_session.send_text(content)

                elif message_type == "stop_session":
                    # Stop the voice session
                    if live_session:
                        await live_session.disconnect()
                        live_session = None
                        voice_sessions[connection_id]["live_session"] = None

                    await manager.send_message(connection_id, {
                        "type": "session_stopped"
                    })

                elif message_type == "get_history":
                    # Return conversation history
                    history = shared_conversation_history.get(session_id, [])
                    await manager.send_message(connection_id, {
                        "type": "history",
                        "messages": history
                    })

                elif message_type == "clear_history":
                    # Clear conversation history
                    if session_id in shared_conversation_history:
                        shared_conversation_history[session_id] = []
                    if voice_sessions.get(connection_id, {}).get("service"):
                        voice_sessions[connection_id]["service"].clear_history()
                    await manager.send_message(connection_id, {
                        "type": "history_cleared"
                    })

                elif message_type == "sync_history":
                    # Sync history from text chat
                    history = request.get("history", [])
                    shared_conversation_history[session_id] = history
                    if voice_sessions.get(connection_id, {}).get("service"):
                        voice_sessions[connection_id]["service"].set_conversation_history(history)
                    await manager.send_message(connection_id, {
                        "type": "history_synced"
                    })

                elif message_type == "ping":
                    await manager.send_message(connection_id, {"type": "pong"})

                else:
                    await manager.send_message(connection_id, {
                        "type": "error",
                        "error": f"Unknown message type: {message_type}"
                    })

            except json.JSONDecodeError as e:
                await manager.send_message(connection_id, {
                    "type": "error",
                    "error": f"Invalid JSON: {e}"
                })

    except WebSocketDisconnect:
        logger.info(f"Voice WebSocket disconnected: {connection_id}")
    except Exception as e:
        import traceback
        logger.error(f"Voice WebSocket error: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        try:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": str(e)
            })
        except:
            pass
    finally:
        # Clean up
        if live_session:
            try:
                await live_session.disconnect()
            except:
                pass

        if connection_id in voice_sessions:
            del voice_sessions[connection_id]

        manager.disconnect(connection_id)


async def handle_start_session(
    connection_id: str,
    api_key: str,
    request: Dict[str, Any],
    session_id: str,
):
    """
    Handle starting a new voice session.

    Args:
        connection_id: WebSocket connection identifier
        api_key: Google API key
        request: Start session request with voice settings
        session_id: Conversation session identifier

    Returns:
        LiveSession object
    """
    # Parse voice settings
    settings_dict = request.get("voice_settings", {})
    voice_settings = VoiceSettings(
        voice_name=settings_dict.get("voice_name", GeminiVoice.KORE.value),
        personality=settings_dict.get("personality", "mystical guide"),
        speaking_style=settings_dict.get("speaking_style", "warm and contemplative"),
        response_length=settings_dict.get("response_length", "medium"),
        custom_personality=settings_dict.get("custom_personality"),
    )

    # Get astrological context
    astro_context = request.get("astrological_context")

    # Use provided session_id if given (for history continuity)
    provided_session_id = request.get("session_id")
    if provided_session_id and provided_session_id in shared_conversation_history:
        effective_session_id = provided_session_id
    else:
        effective_session_id = session_id
        if effective_session_id not in shared_conversation_history:
            shared_conversation_history[effective_session_id] = []

    # Create voice service
    try:
        logger.info(f"Creating voice service for connection {connection_id}")
        service = get_gemini_voice_service(
            api_key=api_key,
            voice_settings=voice_settings,
            force_new=True,
        )
        logger.info("Voice service created successfully")

        # Sync existing history
        if shared_conversation_history.get(effective_session_id):
            service.set_conversation_history(
                shared_conversation_history[effective_session_id]
            )

        # Callbacks for streaming responses
        async def on_audio(audio_data: bytes):
            """Send audio chunk to client"""
            audio_b64 = base64.b64encode(audio_data).decode('utf-8')
            await manager.send_message(connection_id, {
                "type": "audio_chunk",
                "data": audio_b64
            })

        async def on_text(text: str):
            """Send text delta to client"""
            await manager.send_message(connection_id, {
                "type": "text_delta",
                "content": text
            })

        async def on_transcript(role: str, text: str):
            """Send transcript to client and update shared history"""
            await manager.send_message(connection_id, {
                "type": "transcript",
                "role": role,
                "text": text
            })

            # Update shared history
            shared_conversation_history[effective_session_id].append({
                "role": "assistant" if role == "model" else "user",
                "content": text,
                "mode": "voice"
            })

        async def on_turn_complete():
            """Signal turn complete to client (model finished speaking)"""
            logger.info("Sending turn_complete to frontend")
            await manager.send_message(connection_id, {
                "type": "turn_complete"
            })

        async def on_tool_call(tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
            """Execute a tool and return the result"""
            logger.info(f"Voice tool call: {tool_name} with args: {tool_args}")

            # Check if this is a backend tool (executes on server) or frontend tool (sends command to UI)
            if tool_name in BACKEND_TOOLS:
                # Execute backend tools directly
                return await execute_backend_tool(tool_name, tool_args, astro_context)
            else:
                # Frontend tools - send command to frontend and return success
                await manager.send_message(connection_id, {
                    "type": "tool_command",
                    "tool_name": tool_name,
                    "tool_args": tool_args
                })
                return {"success": True, "message": f"Command {tool_name} sent to application"}

        # Start live session with tools
        logger.info("Starting live session...")
        live_session = await service.start_session(
            on_audio=on_audio,
            on_text=on_text,
            on_transcript=on_transcript,
            on_turn_complete=on_turn_complete,
            on_tool_call=on_tool_call,
            tools=ALL_TOOLS,
            astrological_context=astro_context,
        )
        logger.info("Live session created, connecting to Gemini...")

        await live_session.connect()
        logger.info("Connected to Gemini Live API!")

        # Store references
        voice_sessions[connection_id] = {
            "session_id": effective_session_id,
            "service": service,
            "live_session": live_session,
        }

        await manager.send_message(connection_id, {
            "type": "session_started",
            "voice_name": voice_settings.voice_name,
            "session_id": effective_session_id,
        })

        return live_session

    except Exception as e:
        import traceback
        logger.error(f"Failed to start voice session: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        await manager.send_message(connection_id, {
            "type": "error",
            "error": f"Failed to start voice session: {str(e)}"
        })
        return None


@router.get("/voice/options")
async def get_available_voices():
    """Get available voice options and default settings"""
    return {
        "voices": [
            {"name": v.value, "description": desc}
            for v, desc in [
                (GeminiVoice.PUCK, "Upbeat and playful"),
                (GeminiVoice.CHARON, "Deep and authoritative"),
                (GeminiVoice.KORE, "Warm and nurturing"),
                (GeminiVoice.FENRIR, "Bold and energetic"),
                (GeminiVoice.AOEDE, "Calm and melodic"),
            ]
        ],
        "default_settings": {
            "voice_name": GeminiVoice.KORE.value,
            "personality": "mystical guide",
            "speaking_style": "warm and contemplative",
            "response_length": "medium",
        },
        "response_lengths": ["brief", "medium", "detailed"],
    }


@router.get("/voice/settings")
async def get_voice_settings(db: Session = Depends(get_db)):
    """Get current voice settings from app config"""
    config = db.query(AppConfig).filter_by(id=1).first()
    if not config:
        return {
            "voice_name": "Kore",
            "personality": "mystical guide",
            "speaking_style": "warm and contemplative",
            "response_length": "medium",
            "custom_personality": None,
        }

    return {
        "voice_name": config.voice_name or "Kore",
        "personality": config.voice_personality or "mystical guide",
        "speaking_style": config.voice_speaking_style or "warm and contemplative",
        "response_length": config.voice_response_length or "medium",
        "custom_personality": config.voice_custom_personality,
    }


@router.put("/voice/settings")
async def update_voice_settings(settings: VoiceSettingsUpdate, db: Session = Depends(get_db)):
    """Update voice settings in app config"""
    config = db.query(AppConfig).filter_by(id=1).first()
    if not config:
        raise HTTPException(status_code=404, detail="App config not found")

    # Update only provided fields
    if settings.voice_name is not None:
        config.voice_name = settings.voice_name
    if settings.personality is not None:
        config.voice_personality = settings.personality
    if settings.speaking_style is not None:
        config.voice_speaking_style = settings.speaking_style
    if settings.response_length is not None:
        config.voice_response_length = settings.response_length
    if settings.custom_personality is not None:
        config.voice_custom_personality = settings.custom_personality

    db.commit()

    return {
        "voice_name": config.voice_name,
        "personality": config.voice_personality,
        "speaking_style": config.voice_speaking_style,
        "response_length": config.voice_response_length,
        "custom_personality": config.voice_custom_personality,
    }


@router.get("/voice/status")
async def get_voice_status(db: Session = Depends(get_db)):
    """Check if voice chat is available (Google API key configured)"""
    config = db.query(AppConfig).filter_by(id=1).first()
    has_key = config and config.has_google_api_key

    return {
        "available": has_key,
        "message": "Voice chat ready" if has_key else "Google API key required for voice chat"
    }
