"""
WebSocket Connection Manager

Manages WebSocket connections for real-time communication
Optimized for single-user app but built extensibly
"""
from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections

    For single-user app: typically one connection at a time
    But built to handle multiple connections for extensibility
    """

    def __init__(self):
        # Active connections by connection ID
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, connection_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket connected: {connection_id}")

    def disconnect(self, connection_id: str):
        """Unregister a WebSocket connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_message(self, connection_id: str, message: dict):
        """Send JSON message to a specific connection"""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)

    async def broadcast(self, message: dict):
        """Broadcast JSON message to all active connections"""
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                disconnected.append(connection_id)

        # Clean up disconnected connections
        for connection_id in disconnected:
            self.disconnect(connection_id)

    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()
