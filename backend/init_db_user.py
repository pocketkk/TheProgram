#!/usr/bin/env python3
"""
Quick script to initialize the SQLite database with all tables
for the user data directory
"""
import sys
import os
from pathlib import Path

# Set the database path to user data directory
os.environ['USER_DATA_DIR'] = '/home/sylvia/.config/theprogram'

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def initialize_database():
    """Create all database tables"""
    try:
        # Import config first to set up paths
        from app.core.config_sqlite import sqlite_settings

        # Ensure database directory exists
        sqlite_settings.ensure_database_dir()
        db_path = sqlite_settings.database_path

        print(f"Database path: {db_path}")

        # Import engine and Base - this must be after config is loaded
        from app.core.database_sqlite import engine, Base

        # Import all models so they're registered with Base
        from app import models

        print("Creating all tables...")

        # Create all tables
        Base.metadata.create_all(bind=engine)

        print(f"✓ Database initialized successfully at: {db_path}")

        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\nCreated {len(tables)} tables:")
        for table in sorted(tables):
            print(f"  - {table}")

        return True

    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = initialize_database()
    sys.exit(0 if success else 1)
