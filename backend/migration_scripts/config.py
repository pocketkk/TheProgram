"""
Configuration for PostgreSQL to SQLite migration.
"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
MIGRATION_DATA_DIR = BASE_DIR / "migration_data"
BACKUP_DIR = BASE_DIR / "backups"

# PostgreSQL configuration
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5433")
POSTGRES_DB = os.getenv("POSTGRES_DB", "theprogram_db")
POSTGRES_USER = os.getenv("POSTGRES_USER", "theprogram")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "459f03d39342fb8369af91cd04385ff79c5ac2b0f11ea9d4832dd4e56d9cea84")

POSTGRES_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# SQLite configuration
SQLITE_PATH = BASE_DIR.parent / "app.db"
SCHEMA_PATH = BASE_DIR.parent / "schema_design" / "sqlite_schema.sql"

# Migration settings
DEFAULT_USER_EMAIL = os.getenv("MIGRATION_USER_EMAIL", "pocketkk@gmail.com")

# Logging configuration
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Validation thresholds
MIN_CLIENTS = 1
MIN_CHARTS = 1

# Tables to migrate (in order of dependencies)
TABLES_TO_MIGRATE = [
    "clients",
    "birth_data",
    "charts",
    "chart_interpretations",
    "interpretations",
    "aspect_patterns",
    "transit_events",
    "session_notes",
    "location_cache",
]

# Ensure directories exist
MIGRATION_DATA_DIR.mkdir(exist_ok=True)
BACKUP_DIR.mkdir(exist_ok=True)
