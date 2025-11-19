"""
SQLite-based API routers

These routers use the SQLite database with simple authentication.
Import and include in main app to enable.
"""
from fastapi import APIRouter
from app.api.routes_sqlite import (
    auth_simple,
    export,
    import_routes,
    backup,
    birth_data,
    charts,
    chart_interpretations
)

# Create SQLite API router
sqlite_router = APIRouter()

# Include all SQLite routers
sqlite_router.include_router(auth_simple.router)
sqlite_router.include_router(export.router)
sqlite_router.include_router(import_routes.router)
sqlite_router.include_router(backup.router)
sqlite_router.include_router(birth_data.router, prefix="/birth-data", tags=["Birth Data"])
sqlite_router.include_router(charts.router, prefix="/charts", tags=["Charts"])
sqlite_router.include_router(chart_interpretations.router, prefix="/charts", tags=["Interpretations"])

__all__ = ["sqlite_router"]
