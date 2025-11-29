"""
Main FastAPI application entry point
"""
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

    # Initialize database connection and ensure tables exist
    try:
        # Test database connection
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection established")

        # Auto-initialize database tables if they don't exist
        from app.core.database_sqlite import engine, Base
        from app.models_sqlite.app_config import AppConfig
        from app.core.database_sqlite import SessionLocal
        from sqlalchemy import inspect

        # Check if tables exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        if not existing_tables or 'app_config' not in existing_tables:
            logger.info("Database tables not found - initializing database...")

            # Import all models so they're registered with Base
            import app.models_sqlite  # This imports all models

            # Create all tables
            Base.metadata.create_all(bind=engine)
            logger.info(f"Created {len(Base.metadata.tables)} database tables")

            # Create initial AppConfig if it doesn't exist
            db = SessionLocal()
            try:
                config = db.query(AppConfig).filter_by(id=1).first()
                if not config:
                    config = AppConfig(
                        id=1,
                        password_hash=None,  # No password initially
                        app_version='1.0.0',
                        database_version=1
                    )
                    db.add(config)
                    db.commit()
                    logger.info("Created initial application configuration")
                else:
                    logger.info("Application configuration already exists")
            finally:
                db.close()

            logger.info("Database initialization complete")
        else:
            logger.info(f"Database ready ({len(existing_tables)} tables found)")
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


if __name__ == "__main__":
    import uvicorn
    import uvicorn
    # Pass the app object directly to avoid import issues in frozen app
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=False, # Reload not supported with app instance
        log_level="info"
    )
