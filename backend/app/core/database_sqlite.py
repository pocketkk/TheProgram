"""
SQLite database connection and session management

Handles SQLite-specific configuration including foreign keys,
WAL mode, and proper session management for FastAPI.
"""
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.core.config_sqlite import sqlite_settings

# Ensure database directory exists
sqlite_settings.ensure_database_dir()

# Create SQLite engine with proper configuration
engine = create_engine(
    sqlite_settings.database_url,
    # SQLite-specific connection args
    connect_args={
        "check_same_thread": False,  # Allow multithreading with FastAPI
    },
    # Use StaticPool for SQLite (better for single-file DB)
    poolclass=StaticPool,
    # Echo SQL queries if debugging enabled
    echo=sqlite_settings.SQLITE_ECHO,
)


# CRITICAL: Enable foreign keys and configure SQLite for every connection
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """
    Configure SQLite PRAGMAs for every new connection

    This is ESSENTIAL for SQLite to work correctly:
    - Foreign keys are OFF by default in SQLite
    - WAL mode must be set per connection
    - Other performance settings

    Called automatically when SQLAlchemy creates a new connection
    """
    cursor = dbapi_conn.cursor()

    # Execute all configured PRAGMAs
    for pragma in sqlite_settings.get_pragma_statements():
        cursor.execute(pragma)

    cursor.close()


# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create declarative base for SQLite models
Base = declarative_base()


# FastAPI dependency for database sessions
def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI endpoints

    Automatically manages session lifecycle:
    - Creates new session for each request
    - Yields session to endpoint
    - Closes session after request completes
    - Handles rollback on exceptions

    Usage:
        @app.get("/clients")
        def get_clients(db: Session = Depends(get_db)):
            return db.query(Client).all()

    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # Rollback on error
        db.rollback()
        raise
    finally:
        db.close()


# Database initialization
def init_db(drop_existing: bool = False) -> None:
    """
    Initialize database tables and singleton records

    Creates all tables defined in models and initializes
    the singleton tables (app_config, user_preferences)

    Args:
        drop_existing: If True, drop all tables first (DESTRUCTIVE!)

    Note:
        This is for development. In production, use migrations.
    """
    from app.models_sqlite import Base as ModelsBase
    from app.models_sqlite.app_config import AppConfig
    from app.models_sqlite.user_preferences import UserPreferences

    # Drop tables if requested
    if drop_existing:
        ModelsBase.metadata.drop_all(bind=engine)

    # Create all tables
    ModelsBase.metadata.create_all(bind=engine)

    # Initialize singleton tables
    db = SessionLocal()
    try:
        # Check if app_config exists, create if not
        config = db.query(AppConfig).filter_by(id=1).first()
        if not config:
            config = AppConfig(id=1)
            db.add(config)

        # Check if user_preferences exists, create if not
        prefs = db.query(UserPreferences).filter_by(id=1).first()
        if not prefs:
            prefs = UserPreferences(id=1)
            db.add(prefs)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def drop_db() -> None:
    """
    Drop all database tables

    WARNING: This will delete ALL data!
    Only use in development/testing

    For production, use proper migrations.
    """
    from app.models_sqlite import Base as ModelsBase
    ModelsBase.metadata.drop_all(bind=engine)


# Context manager for database sessions
class DatabaseSession:
    """
    Context manager for database sessions outside of FastAPI

    Usage:
        with DatabaseSession() as db:
            client = db.query(Client).first()
            print(client.full_name)
    """

    def __enter__(self) -> Session:
        """Create and return database session"""
        self.db = SessionLocal()
        return self.db

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close session, rollback on exception"""
        if exc_type is not None:
            # Rollback on exception
            self.db.rollback()
        self.db.close()


# Utility functions
def get_session() -> Session:
    """
    Get a new database session

    Caller is responsible for closing the session.

    Returns:
        Database session

    Example:
        db = get_session()
        try:
            clients = db.query(Client).all()
        finally:
            db.close()
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

    Verifies:
    - Database file is accessible
    - Can create a session
    - Can execute a simple query
    - Foreign keys are enabled

    Returns:
        True if connection is healthy, False otherwise

    Example:
        if check_db_connection():
            print("Database is ready!")
        else:
            print("Database connection failed!")
    """
    try:
        db = SessionLocal()

        # Test basic query
        result = db.execute("SELECT 1").fetchone()
        if result[0] != 1:
            return False

        # Verify foreign keys are enabled
        fk_result = db.execute("PRAGMA foreign_keys").fetchone()
        if fk_result[0] != 1:
            print("WARNING: Foreign keys are not enabled!")
            return False

        db.close()
        return True

    except Exception as e:
        print(f"Database connection check failed: {e}")
        return False


def get_db_info() -> dict:
    """
    Get database information and statistics

    Returns:
        Dictionary with database info including:
        - Database path
        - File size
        - Foreign keys status
        - Journal mode
        - Page count
        - Encoding

    Example:
        info = get_db_info()
        print(f"Database: {info['path']}")
        print(f"Size: {info['size_mb']} MB")
    """
    from pathlib import Path

    db = SessionLocal()
    try:
        info = {
            'path': str(sqlite_settings.database_path.absolute()),
            'exists': sqlite_settings.database_path.exists(),
        }

        if info['exists']:
            # File size
            size_bytes = sqlite_settings.database_path.stat().st_size
            info['size_bytes'] = size_bytes
            info['size_mb'] = round(size_bytes / (1024 * 1024), 2)

            # Database pragmas
            info['foreign_keys'] = db.execute("PRAGMA foreign_keys").fetchone()[0] == 1
            info['journal_mode'] = db.execute("PRAGMA journal_mode").fetchone()[0]
            info['page_count'] = db.execute("PRAGMA page_count").fetchone()[0]
            info['page_size'] = db.execute("PRAGMA page_size").fetchone()[0]
            info['encoding'] = db.execute("PRAGMA encoding").fetchone()[0]

        return info

    except Exception as e:
        return {'error': str(e)}
    finally:
        db.close()
