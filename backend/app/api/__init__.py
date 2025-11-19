"""
API routers for The Program
"""
from fastapi import APIRouter
from app.api.routes import auth, users, clients, birth_data, charts, chart_interpretations
from app.core.config import settings

# Create main API router
api_router = APIRouter()

# Include all sub-routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(birth_data.router, prefix="/birth-data", tags=["Birth Data"])
api_router.include_router(charts.router, prefix="/charts", tags=["Charts"])
api_router.include_router(chart_interpretations.router, prefix="/charts", tags=["Chart Interpretations"])

__all__ = ["api_router"]
