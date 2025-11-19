"""
WebSocket-based chart interpretation generation

Real-time progress updates via WebSocket
"""
from typing import Optional
from fastapi import APIRouter, Depends, WebSocketDisconnect, WebSocket, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
import logging
import json

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models import User, Chart, ChartInterpretation
from app.services.ai_interpreter import AIInterpreter
from app.core.websocket import manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/interpretations/{chart_id}")
async def generate_interpretations_ws(
    websocket: WebSocket,
    chart_id: UUID,
):
    """
    WebSocket endpoint for generating chart interpretations with real-time progress

    Client sends:
    {
        "type": "generate",
        "element_types": ["planet", "house", "aspect", "pattern"],
        "regenerate_existing": true,
        "ai_model": "claude-haiku-4-5-20251001"
    }

    Server sends progress updates:
    {
        "type": "progress",
        "element_type": "planet",
        "element_key": "sun",
        "description": "...",
        "completed": 5,
        "total": 25
    }

    Final message:
    {
        "type": "complete",
        "generated_count": 25,
        "skipped_count": 0
    }
    """
    connection_id = f"interp_{chart_id}"

    try:
        # Accept WebSocket connection
        await manager.connect(websocket, connection_id)

        # Wait for generation request
        data = await websocket.receive_text()
        request = json.loads(data)

        if request.get("type") != "generate":
            await manager.send_message(connection_id, {
                "type": "error",
                "message": "Expected 'generate' message type"
            })
            return

        element_types = request.get("element_types", ["planet", "house", "aspect", "pattern"])
        regenerate_existing = request.get("regenerate_existing", False)
        ai_model = request.get("ai_model", "claude-haiku-4-5-20251001")

        # Get chart from database (we'll need DB access via dependency injection in real implementation)
        # For now, we'll simulate this

        # Initialize AI interpreter
        try:
            ai_interpreter = AIInterpreter(model=ai_model)
        except ValueError as e:
            await manager.send_message(connection_id, {
                "type": "error",
                "message": str(e)
            })
            return

        # Track progress
        total_interpretations = 0
        completed_count = 0
        skipped_count = 0

        # Progress callback that sends WebSocket updates
        async def progress_callback(element_type: str, element_key: str, description: str):
            nonlocal completed_count
            completed_count += 1

            await manager.send_message(connection_id, {
                "type": "progress",
                "element_type": element_type,
                "element_key": element_key,
                "description": description[:100] + "..." if len(description) > 100 else description,
                "completed": completed_count,
                "total": total_interpretations
            })

        # Note: This is a simplified version
        # In real implementation, you'd:
        # 1. Get chart from database using Depends(get_db)
        # 2. Verify user has access to chart
        # 3. Store interpretations in database
        # 4. Handle all error cases properly

        await manager.send_message(connection_id, {
            "type": "complete",
            "generated_count": completed_count,
            "skipped_count": skipped_count,
            "message": "Generation complete!"
        })

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        logger.info(f"Client disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await manager.send_message(connection_id, {
                "type": "error",
                "message": str(e)
            })
        except:
            pass
        manager.disconnect(connection_id)
