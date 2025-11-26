"""
WebSocket endpoint for real-time communication (single-user mode)

No user authentication needed
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket import manager
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates

    No user authentication needed - single user mode

    Handles:
    - interpretation_progress: Real-time interpretation generation updates
    - chat_message: Interactive chat (future)
    - transit_update: Transit notifications (future)
    - news_item: Historical news (future)
    """
    # Generate connection ID (for single-user app, could be simple)
    connection_id = f"user_{id(websocket)}"

    try:
        # Accept connection
        await manager.connect(websocket, connection_id)

        # Send welcome message
        await manager.send_message(connection_id, {
            "type": "connection_established",
            "connection_id": connection_id,
            "message": "WebSocket connected successfully"
        })

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Receive messages from client
                data = await websocket.receive_text()
                message = json.loads(data)

                # Handle different message types
                message_type = message.get("type")

                if message_type == "ping":
                    # Respond to ping with pong
                    await manager.send_message(connection_id, {
                        "type": "pong",
                        "timestamp": message.get("timestamp")
                    })

                elif message_type == "subscribe":
                    # Handle subscription requests (future feature)
                    topic = message.get("topic")
                    await manager.send_message(connection_id, {
                        "type": "subscribed",
                        "topic": topic
                    })

                else:
                    logger.warning(f"Unknown message type: {message_type}")

            except json.JSONDecodeError:
                logger.error("Received invalid JSON")
                await manager.send_message(connection_id, {
                    "type": "error",
                    "message": "Invalid JSON format"
                })

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        logger.info(f"Client disconnected: {connection_id}")

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(connection_id)
