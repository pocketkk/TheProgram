"""
Main FastAPI application entry point
"""
import warnings
# Suppress passlib warning about bcrypt version detection (harmless compatibility issue)
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from sqlalchemy import text

from app.core.config import settings
# Use SQLite database for desktop app
from app.core.database_sqlite import engine as db_engine

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


# API info endpoint (root is reserved for SPA in web mode)
@app.get("/api/info")
async def root():
    """API information"""
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
    try:
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except:
        db_status = "disconnected"

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
from app.api.routes import router as api_routes
app.include_router(api_routes, prefix=settings.API_V1_STR)


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

    # Initialize database connection and sync schema
    try:
        # Test database connection
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection established")

        # Auto-sync schema: creates missing tables and adds missing columns
        from app.core.database_sqlite import sync_schema, SessionLocal
        from app.models.app_config import AppConfig

        changes = sync_schema()
        if changes:
            logger.info(f"Schema sync made {len(changes)} changes")

        # Ensure AppConfig singleton exists
        db = SessionLocal()
        try:
            config = db.query(AppConfig).filter_by(id=1).first()
            if not config:
                config = AppConfig(
                    id=1,
                    password_hash=None,
                    app_version='1.0.0',
                    database_version=1
                )
                db.add(config)
                db.commit()
                logger.info("Created initial application configuration")

            # Data migration: mark existing birth data as primary if none are marked
            from app.models.birth_data import BirthData
            has_primary = db.query(BirthData).filter(BirthData.is_primary == True).first()
            if not has_primary:
                # Mark the most recent birth data as primary (user's own chart)
                most_recent = db.query(BirthData).order_by(BirthData.created_at.desc()).first()
                if most_recent:
                    most_recent.is_primary = True
                    db.commit()
                    logger.info(f"Marked birth data {most_recent.id[:8]}... as primary")
        finally:
            db.close()

        logger.info("Database ready")
    except Exception as e:
        logger.error(f"Database initialization error: {e}", exc_info=True)

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


# ── Static frontend serving (web/Docker mode) ─────────────────────────────────
# When FRONTEND_DIST is set and the directory exists, FastAPI serves the built
# React app. Requests to /api/* are handled by routes above; everything else
# falls through to the SPA index.html.
import os as _os
from pathlib import Path as _Path

_frontend_dist = _Path(_os.getenv("FRONTEND_DIST", "")) if _os.getenv("FRONTEND_DIST") else None

if _frontend_dist and _frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse as _FileResponse

    _assets_dir = _frontend_dist / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="static-assets")

    # Serve any other static files at root (favicon, manifest, etc.)
    _extra_static = [f for f in _frontend_dist.iterdir()
                     if f.is_file() and f.name != "index.html"]
    if _extra_static:
        app.mount("/static-root", StaticFiles(directory=str(_frontend_dist)), name="static-root")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Catch-all: return index.html so React Router handles routing."""
        return _FileResponse(str(_frontend_dist / "index.html"))

    logger.info(f"Serving frontend from {_frontend_dist}")


if __name__ == "__main__":
    import uvicorn
    # Pass the app object directly to avoid import issues in frozen app
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=False, # Reload not supported with app instance
        log_level="info"
    )
