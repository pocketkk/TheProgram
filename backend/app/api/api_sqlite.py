"""
API Router for SQLite single-user mode

All routes are refactored to remove user authentication and user_id filtering.
All data belongs to "the user" implicitly.
"""
from fastapi import APIRouter

from app.api.routes_sqlite import (
    clients,
    birth_data,
    charts,
    chart_interpretations,
    websocket,
    interpretations_ws
)

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(
    clients.router,
    prefix="/clients",
    tags=["clients"]
)

api_router.include_router(
    birth_data.router,
    prefix="/birth-data",
    tags=["birth-data"]
)

api_router.include_router(
    charts.router,
    prefix="/charts",
    tags=["charts"]
)

api_router.include_router(
    chart_interpretations.router,
    prefix="/charts",
    tags=["interpretations"]
)

# WebSocket routes
api_router.include_router(
    websocket.router,
    tags=["websocket"]
)

api_router.include_router(
    interpretations_ws.router,
    tags=["websocket", "interpretations"]
)
