"""
Database connection and session management
Handles PostgreSQL connection with SQLAlchemy
"""
from typing import Generator
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import Pool

from app.core.config import settings

# Create database engine (only if DATABASE_URL is configured)
# For SQLite-only setups, use database_sqlite.py instead
if settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,  # Verify connections before using
        echo=settings.DB_ECHO,  # Log SQL queries if enabled
    )
else:
    # Dummy engine for SQLite-only setups
    # This allows imports to work without PostgreSQL configured
    engine = None

# Create SessionLocal class (only if engine exists)
if engine:
    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine
    )
else:
    SessionLocal = None

# Create declarative base for models
Base = declarative_base()


# Database dependency for FastAPI
def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI endpoints

    Yields:
        Database session

    Usage:
        @app.get("/items/")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Event listeners for connection pool
@event.listens_for(Pool, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """
    Set pragmas for SQLite (if using SQLite for testing)
    This is a no-op for PostgreSQL
    """
    if hasattr(dbapi_conn, 'execute'):
        # Only for SQLite
        try:
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            pass  # Not SQLite or already set


@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """
    Called when connection is checked out from pool
    Can be used for connection validation or setup
    """
    pass


# Database initialization
def init_db() -> None:
    """
    Initialize database tables
    Creates all tables defined in models

    Note: In production, use Alembic migrations instead
    """
    Base.metadata.create_all(bind=engine)


def drop_db() -> None:
    """
    Drop all database tables
    WARNING: This will delete all data!
    Only use in development/testing
    """
    Base.metadata.drop_all(bind=engine)


# Context manager for database sessions
class DatabaseSession:
    """
    Context manager for database sessions

    Usage:
        with DatabaseSession() as db:
            user = db.query(User).first()
    """

    def __enter__(self) -> Session:
        self.db = SessionLocal()
        return self.db

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Rollback on exception
            self.db.rollback()
        self.db.close()


# Utility functions
def get_session() -> Session:
    """
    Get a new database session
    Caller is responsible for closing

    Returns:
        Database session
    """
    return SessionLocal()


def close_session(db: Session) -> None:
    """
    Close a database session

    Args:
        db: Database session to close
    """
    db.close()


# Health check
def check_db_connection() -> bool:
    """
    Check if database connection is healthy

    Returns:
        True if connection is healthy, False otherwise
    """
    try:
        db = SessionLocal()
        # Try to execute a simple query
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        print(f"Database connection check failed: {e}")
        return False
