"""
SQLite-specific configuration settings

Defines database path, connection settings, and SQLite-specific PRAGMAs
"""
from typing import Optional
from pydantic_settings import BaseSettings
from pathlib import Path


class SQLiteSettings(BaseSettings):
    """
    Configuration for SQLite database

    All settings can be overridden via environment variables
    with SQLITE_ prefix (e.g., SQLITE_DB_PATH)
    """

    # Database file path
    SQLITE_DB_PATH: str = "./data/theprogram.db"

    # Foreign key constraints (CRITICAL for data integrity)
    SQLITE_ENABLE_FOREIGN_KEYS: bool = True

    # Journal mode (WAL = Write-Ahead Logging, better concurrency)
    # Options: DELETE, TRUNCATE, PERSIST, MEMORY, WAL, OFF
    SQLITE_JOURNAL_MODE: str = "WAL"

    # Synchronous mode (NORMAL is good balance of safety/speed)
    # Options: OFF, NORMAL, FULL, EXTRA
    SQLITE_SYNCHRONOUS: str = "NORMAL"

    # Cache size in KB (negative = KB, positive = pages)
    # -2000 = 2MB cache
    SQLITE_CACHE_SIZE: int = -2000

    # Page size in bytes (default 4096)
    SQLITE_PAGE_SIZE: int = 4096

    # Temp store (MEMORY is faster for temp tables)
    # Options: DEFAULT, FILE, MEMORY
    SQLITE_TEMP_STORE: str = "MEMORY"

    # Enable query logging (useful for debugging)
    SQLITE_ECHO: bool = False

    # Connection pool settings (for SQLAlchemy)
    SQLITE_POOL_SIZE: int = 5
    SQLITE_MAX_OVERFLOW: int = 10
    SQLITE_POOL_PRE_PING: bool = True

    # Auto-create database directory if missing
    SQLITE_AUTO_CREATE_DIR: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields from .env file

    @property
    def database_path(self) -> Path:
        """Get database path as Path object"""
        return Path(self.SQLITE_DB_PATH)

    @property
    def database_url(self) -> str:
        """
        Get SQLAlchemy database URL

        Returns:
            SQLite connection URL (e.g., 'sqlite:///./data/theprogram.db')
        """
        # Ensure absolute path for SQLite
        db_path = self.database_path.absolute()
        return f"sqlite:///{db_path}"

    def ensure_database_dir(self) -> None:
        """
        Create database directory if it doesn't exist

        Raises:
            OSError: If directory creation fails
        """
        if self.SQLITE_AUTO_CREATE_DIR:
            db_dir = self.database_path.parent
            db_dir.mkdir(parents=True, exist_ok=True)

    def get_pragma_statements(self) -> list[str]:
        """
        Get list of PRAGMA statements to execute on connection

        Returns:
            List of SQL PRAGMA statements
        """
        pragmas = []

        if self.SQLITE_ENABLE_FOREIGN_KEYS:
            pragmas.append("PRAGMA foreign_keys = ON")

        pragmas.append(f"PRAGMA journal_mode = {self.SQLITE_JOURNAL_MODE}")
        pragmas.append(f"PRAGMA synchronous = {self.SQLITE_SYNCHRONOUS}")
        pragmas.append(f"PRAGMA cache_size = {self.SQLITE_CACHE_SIZE}")
        pragmas.append(f"PRAGMA temp_store = {self.SQLITE_TEMP_STORE}")

        return pragmas


# Global settings instance
sqlite_settings = SQLiteSettings()
