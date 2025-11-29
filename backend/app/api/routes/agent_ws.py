"""
WebSocket endpoint for AI Agent conversations

Real-time streaming conversation with tool use for UI control.
The agent can navigate the app, select chart elements, and provide
multi-paradigm consciousness exploration guidance.
"""
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import json
import uuid
import asyncio

from app.services.agent_service import AgentService
from app.core.websocket import manager
from app.core.database_sqlite import SessionLocal

router = APIRouter()
logger = logging.getLogger(__name__)

# Store conversation histories by session (in-memory for now)
# In production, this could be persisted to database
conversation_sessions: Dict[str, List[Dict[str, Any]]] = {}

# Store pending tool results that we're waiting for from the frontend
# Key: tool_use_id, Value: {"event": asyncio.Event, "result": Any}
pending_tool_results: Dict[str, Dict[str, Any]] = {}


@router.websocket("/ws/agent")
async def agent_conversation(websocket: WebSocket):
    """
    WebSocket endpoint for AI Agent conversations with streaming responses.

    Connection flow:
    1. Client connects
    2. Server sends connected message with session_id
    3. Client sends messages, server streams responses
    4. Either side can close connection

    Client -> Server messages:
    {
        "type": "chat_message",
        "content": "Tell me about my Sun placement",
        "chart_context": {
            "planets": {...},
            "houses": {...},
            "aspects": [...],
            "patterns": [...]
        },
        "user_preferences": {
            "enabled_paradigms": ["astrology", "tarot", "jungian"],
            "synthesis_depth": "balanced"
        },
        "session_id": "optional-existing-session"
    }

    {
        "type": "tool_result",
        "tool_call_id": "tool_use_123",
        "tool_name": "capture_screenshot",
        "result": {"success": true, "image": "base64...", ...}
    }

    Server -> Client messages:
    {"type": "connected", "session_id": "uuid"}
    {"type": "text_delta", "content": "Your Sun is..."}
    {"type": "tool_call", "id": "tool_use_123", "name": "select_planet", "input": {"planet": "Sun"}, "execute_on": "frontend"}
    {"type": "tool_result", "id": "tool_use_123", "name": "get_chart_data", "result": {...}}
    {"type": "complete", "full_response": "...", "tool_calls": [...]}
    {"type": "error", "error": "..."}
    {"type": "thinking", "message": "Analyzing your chart..."}
    """
    connection_id = f"agent_{uuid.uuid4().hex[:8]}"
    session_id = None
    message_queue: asyncio.Queue = asyncio.Queue()
    receiver_task = None

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
                    logger.info(f"Frontend tool {tool_name} ({tool_id}) completed")

                    # Signal any waiting coroutine
                    if tool_id and tool_id in pending_tool_results:
                        pending_tool_results[tool_id]["result"] = result
                        pending_tool_results[tool_id]["event"].set()
                        logger.info(f"Signaled pending tool result for {tool_id}")
                else:
                    # Queue other messages for main handler
                    await message_queue.put(request)
        except WebSocketDisconnect:
            await message_queue.put({"type": "_disconnect"})
        except Exception as e:
            logger.error(f"Receiver task error: {e}")
            await message_queue.put({"type": "_error", "error": str(e)})

    try:
        # Accept WebSocket connection
        await manager.connect(websocket, connection_id)

        # Initialize agent service
        try:
            agent_service = AgentService()
        except ValueError as e:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": str(e),
                "code": "api_key_missing"
            })
            return

        # Generate session ID and send connected message
        session_id = uuid.uuid4().hex
        conversation_sessions[session_id] = []

        await manager.send_message(connection_id, {
            "type": "connected",
            "session_id": session_id,
            "message": "Connected to consciousness exploration guide"
        })

        # Start background receiver task
        receiver_task = asyncio.create_task(receive_messages())

        # Main message loop (processes queued messages)
        while True:
            try:
                request = await message_queue.get()
                message_type = request.get("type")

                if message_type == "_disconnect":
                    break
                elif message_type == "_error":
                    raise Exception(request.get("error"))

                if message_type == "chat_message":
                    await handle_chat_message(
                        connection_id=connection_id,
                        websocket=websocket,
                        session_id=request.get("session_id", session_id),
                        content=request.get("content", ""),
                        app_context=request.get("app_context"),
                        chart_context=request.get("chart_context"),
                        user_preferences=request.get("user_preferences"),
                        agent_service=agent_service
                    )

                elif message_type == "ping":
                    await manager.send_message(connection_id, {"type": "pong"})

                elif message_type == "clear_history":
                    # Clear conversation history for this session
                    clear_session = request.get("session_id", session_id)
                    if clear_session in conversation_sessions:
                        conversation_sessions[clear_session] = []
                    await manager.send_message(connection_id, {
                        "type": "history_cleared",
                        "session_id": clear_session
                    })

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
        logger.info(f"Agent WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"Agent WebSocket error: {e}")
        try:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": str(e)
            })
        except:
            pass
    finally:
        if receiver_task:
            receiver_task.cancel()
            try:
                await receiver_task
            except asyncio.CancelledError:
                pass
        manager.disconnect(connection_id)
        # Clean up any pending tool results for this connection
        # (in production, might want more sophisticated cleanup)


async def handle_chat_message(
    connection_id: str,
    websocket: WebSocket,
    session_id: str,
    content: str,
    app_context: Optional[Dict[str, Any]],
    chart_context: Optional[Dict[str, Any]],
    user_preferences: Optional[Dict[str, Any]],
    agent_service: AgentService
):
    """
    Handle a chat message from the user, streaming the agent's response.

    Args:
        connection_id: WebSocket connection identifier
        websocket: WebSocket connection for sending/receiving
        session_id: Conversation session identifier
        content: User's message content
        app_context: Current app state (page, chart_id, zodiac_system, etc.)
        chart_context: Current chart data from frontend
        user_preferences: User's paradigm preferences
        agent_service: Agent service instance
    """
    if not content.strip():
        await manager.send_message(connection_id, {
            "type": "error",
            "error": "Empty message"
        })
        return

    # Get or create conversation history
    if session_id not in conversation_sessions:
        conversation_sessions[session_id] = []

    conversation_history = conversation_sessions[session_id]

    # Send thinking indicator
    await manager.send_message(connection_id, {
        "type": "thinking",
        "message": "Contemplating your question..."
    })

    async def wait_for_tool_result(tool_id: str, timeout: float = 30.0) -> Dict[str, Any]:
        """
        Wait for a frontend tool result to be received via WebSocket.

        Sets up an asyncio.Event and waits for the background receiver task
        to signal when the result arrives.

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
            logger.info(f"Received tool result for {tool_id}: success={result.get('success')}")
            return result
        except asyncio.TimeoutError:
            logger.warning(f"Timeout waiting for tool result: {tool_id}")
            return {"success": False, "error": "Timeout waiting for frontend response"}
        finally:
            # Clean up
            pending_tool_results.pop(tool_id, None)

    # Create database session for backend tools
    db = SessionLocal()
    try:
        # Stream response from agent
        async for chunk in agent_service.process_message(
            message=content,
            conversation_history=conversation_history,
            app_context=app_context,
            chart_context=chart_context,
            user_preferences=user_preferences,
            db_session=db,
            wait_for_tool_result=wait_for_tool_result
        ):
            await manager.send_message(connection_id, chunk)

            # When complete, update conversation history
            if chunk.get("type") == "complete":
                # Add user message to history
                conversation_history.append({
                    "role": "user",
                    "content": content
                })

                # Add assistant response to history
                full_response = chunk.get("full_response", "")
                if full_response:
                    conversation_history.append({
                        "role": "assistant",
                        "content": full_response
                    })

                # Keep history manageable (last 20 exchanges = 40 messages)
                if len(conversation_history) > 40:
                    conversation_sessions[session_id] = conversation_history[-40:]

    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        await manager.send_message(connection_id, {
            "type": "error",
            "error": f"Failed to process message: {str(e)}"
        })
    finally:
        db.close()


@router.websocket("/ws/agent/proactive")
async def proactive_insights(websocket: WebSocket):
    """
    WebSocket endpoint for receiving proactive insights from the guide.

    The client sends context updates, and the server may send insights
    when appropriate (not too frequently).

    Client -> Server:
    {
        "type": "context_update",
        "trigger": "page_change" | "element_hover" | "pattern_detected" | "inactivity",
        "context": {...}
    }

    Server -> Client:
    {
        "type": "insight",
        "message": "I notice you have a Grand Trine in Fire signs...",
        "trigger": "pattern_detected"
    }
    """
    connection_id = f"proactive_{uuid.uuid4().hex[:8]}"

    try:
        await manager.connect(websocket, connection_id)

        try:
            agent_service = AgentService()
        except ValueError as e:
            await manager.send_message(connection_id, {
                "type": "error",
                "error": str(e)
            })
            return

        await manager.send_message(connection_id, {
            "type": "connected",
            "message": "Proactive insights channel ready"
        })

        while True:
            try:
                data = await websocket.receive_text()
                request = json.loads(data)

                if request.get("type") == "context_update":
                    trigger = request.get("trigger")
                    context = request.get("context", {})
                    user_preferences = request.get("user_preferences")

                    # Generate proactive insight
                    insight = await agent_service.get_proactive_insight(
                        trigger=trigger,
                        context=context,
                        user_preferences=user_preferences
                    )

                    if insight:
                        await manager.send_message(connection_id, {
                            "type": "insight",
                            "message": insight,
                            "trigger": trigger
                        })

                elif request.get("type") == "ping":
                    await manager.send_message(connection_id, {"type": "pong"})

            except json.JSONDecodeError:
                pass  # Silently ignore malformed messages on proactive channel

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        logger.info(f"Proactive WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"Proactive WebSocket error: {e}")
        manager.disconnect(connection_id)
