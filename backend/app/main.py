"""
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.api import api_router
from app.core.database import check_db_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Professional Astrology Application - Western, Vedic, and Human Design",
    version="0.1.0",
    docs_url=settings.DOCS_URL,
    redoc_url=settings.REDOC_URL,
    openapi_url=settings.OPENAPI_URL,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "status": "operational",
        "environment": settings.APP_ENV,
        "docs": f"{settings.DOCS_URL}",
        "message": "Welcome to The Program - Professional Astrology API"
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    # Check database connection
    db_status = "connected" if check_db_connection() else "disconnected"

    # Check Swiss Ephemeris
    eph_status = "loaded"
    try:
        from app.utils.ephemeris import EphemerisCalculator
        # Test a simple calculation
        from datetime import datetime
        jd = EphemerisCalculator.datetime_to_julian_day(datetime(2000, 1, 1, 12, 0))
        if jd > 0:
            eph_status = "loaded"
        else:
            eph_status = "error"
    except Exception as e:
        eph_status = f"error: {str(e)}"

    overall_status = "healthy" if db_status == "connected" and eph_status == "loaded" else "degraded"

    return {
        "status": overall_status,
        "environment": settings.APP_ENV,
        "database": db_status,
        "ephemeris": eph_status
    }


# Include API routers
# app.include_router(api_router, prefix=settings.API_V1_STR)  # Disabled - using SQLite only

# Include SQLite-based routes (simple auth system)
from app.api.routes_sqlite import sqlite_router
app.include_router(sqlite_router, prefix=settings.API_V1_STR)

# Include WebSocket routes (no prefix - WebSockets use different protocol)
# from app.api.routes import websocket  # Disabled for single-user mode
# app.include_router(websocket.router)  # Disabled for single-user mode


# Exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle ValueError exceptions"""
    logger.error(f"ValueError: {exc}")
    return JSONResponse(
        status_code=400,
        content={"error": {"code": "VALIDATION_ERROR", "message": str(exc)}}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}}
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode")

    # Initialize database connection
    try:
        if check_db_connection():
            logger.info("Database connection established")
        else:
            logger.warning("Database connection failed - some features may not work")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

    # Initialize Swiss Ephemeris
    try:
        from app.utils.ephemeris import EphemerisCalculator
        import os
        # Ephemeris path is set at module import time in ephemeris.py
        # Just verify the import worked and log the path
        ephemeris_path = settings.EPHEMERIS_PATH if settings.EPHEMERIS_PATH else "Built-in"
        if settings.EPHEMERIS_PATH and not os.path.exists(settings.EPHEMERIS_PATH):
            logger.warning(f"Ephemeris path {settings.EPHEMERIS_PATH} does not exist, using built-in ephemeris")
        logger.info(f"Swiss Ephemeris initialized (path: {ephemeris_path})")
    except Exception as e:
        logger.error(f"Swiss Ephemeris initialization error: {e}")

    logger.info("Application startup complete")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down application")
    # TODO: Close database connections
    # TODO: Close Redis connection
    logger.info("Application shutdown complete")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
