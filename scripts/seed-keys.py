#!/usr/bin/env python3
"""
Seed API keys into the database for development.

Usage:
    ./scripts/seed-keys.py                    # Uses default paths
    ./scripts/seed-keys.py --keys keys.json   # Custom keys file
    ./scripts/seed-keys.py --db path/to.db    # Custom database

Setup:
    1. Copy seed-keys.example.json to seed-keys.json
    2. Fill in your API keys
    3. Run this script

The keys file is git-ignored for security.
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

# Default paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_KEYS_FILE = SCRIPT_DIR / "seed-keys.json"
DEFAULT_DB_PATH = Path.home() / ".config/theprogram/data/theprogram.db"
DEV_DB_PATH = PROJECT_ROOT / "backend/data/theprogram.db"

# Valid key fields in AppConfig
VALID_KEYS = {
    "anthropic_api_key",
    "google_api_key",
    "guardian_api_key",
    "nyt_api_key",
    "newsapi_api_key",
}


def find_database() -> Path:
    """Find the database file, checking common locations.

    Priority order for development workflow:
    1. $SQLITE_DB_PATH environment variable
    2. Dev database (backend/data/) - preferred for local dev
    3. User data directory (~/.config/theprogram/) - Electron app
    """
    # Check environment variable first
    env_path = os.environ.get("SQLITE_DB_PATH")
    if env_path:
        path = Path(env_path)
        if path.exists():
            return path

    # Check development path first (most common for dev workflow)
    if DEV_DB_PATH.exists():
        return DEV_DB_PATH

    # Check user data directory (Electron app)
    if DEFAULT_DB_PATH.exists():
        return DEFAULT_DB_PATH

    # Return dev path for creation (dev workflow default)
    return DEV_DB_PATH


def load_keys(keys_file: Path) -> dict:
    """Load API keys from JSON file."""
    if not keys_file.exists():
        print(f"Error: Keys file not found: {keys_file}")
        print(f"\nTo get started:")
        print(f"  1. cp {SCRIPT_DIR}/seed-keys.example.json {keys_file}")
        print(f"  2. Edit {keys_file} with your API keys")
        print(f"  3. Run this script again")
        sys.exit(1)

    with open(keys_file) as f:
        keys = json.load(f)

    # Validate keys
    invalid_keys = set(keys.keys()) - VALID_KEYS
    if invalid_keys:
        print(f"Warning: Unknown keys will be ignored: {invalid_keys}")

    # Filter to valid keys only
    return {k: v for k, v in keys.items() if k in VALID_KEYS and v}


def seed_keys(db_path: Path, keys: dict) -> None:
    """Insert or update API keys in the database."""
    if not db_path.exists():
        print(f"Error: Database not found: {db_path}")
        print("\nMake sure the app has been started at least once to create the database.")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if app_config table exists
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='app_config'"
    )
    if not cursor.fetchone():
        print("Error: app_config table not found. Has the app been initialized?")
        conn.close()
        sys.exit(1)

    # Check if config row exists
    cursor.execute("SELECT id FROM app_config WHERE id = '1'")
    if not cursor.fetchone():
        print("Error: No app_config row found. Has the app been initialized?")
        conn.close()
        sys.exit(1)

    # Build UPDATE statement dynamically
    set_clauses = ", ".join(f"{key} = ?" for key in keys.keys())
    values = list(keys.values())

    cursor.execute(
        f"UPDATE app_config SET {set_clauses}, updated_at = datetime('now') WHERE id = '1'",
        values
    )

    conn.commit()
    conn.close()

    print(f"Successfully seeded {len(keys)} API key(s) into {db_path}")
    for key in keys:
        # Show masked key value
        value = keys[key]
        masked = value[:8] + "..." + value[-4:] if len(value) > 16 else "***"
        print(f"  - {key}: {masked}")


def main():
    parser = argparse.ArgumentParser(
        description="Seed API keys into The Program database for development"
    )
    parser.add_argument(
        "--keys", "-k",
        type=Path,
        default=DEFAULT_KEYS_FILE,
        help=f"Path to keys JSON file (default: {DEFAULT_KEYS_FILE})"
    )
    parser.add_argument(
        "--db", "-d",
        type=Path,
        default=None,
        help="Path to SQLite database (auto-detected if not specified)"
    )
    parser.add_argument(
        "--show-paths",
        action="store_true",
        help="Show where the script looks for files and exit"
    )

    args = parser.parse_args()

    if args.show_paths:
        print("Keys file locations checked:")
        print(f"  - {DEFAULT_KEYS_FILE}")
        print("\nDatabase locations checked:")
        print(f"  - $SQLITE_DB_PATH (if set)")
        print(f"  - {DEFAULT_DB_PATH}")
        print(f"  - {DEV_DB_PATH}")
        return

    # Find database
    db_path = args.db or find_database()

    # Load and validate keys
    keys = load_keys(args.keys)

    if not keys:
        print("No valid API keys found in the keys file.")
        sys.exit(1)

    # Seed the database
    seed_keys(db_path, keys)


if __name__ == "__main__":
    main()
