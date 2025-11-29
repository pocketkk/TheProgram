"""
Pytest configuration for service tests (SQLite-based)

This conftest provides SQLite database fixtures for testing Phase 2 services
without requiring PostgreSQL connection.
"""
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.models import Base


@pytest.fixture(scope="function")
def db_engine():
    """
    Create in-memory SQLite engine for testing

    Uses function scope so each test gets a fresh database.
    """
    # Create in-memory SQLite database
    engine = create_engine(
        'sqlite:///:memory:',
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )

    # Enable foreign keys for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create all tables
    Base.metadata.create_all(engine)

    yield engine

    # Drop all tables after test
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """
    Create database session for testing

    Automatically rolls back after each test.
    """
    SessionLocal = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)
    session = SessionLocal()

    yield session

    session.rollback()
    session.close()
