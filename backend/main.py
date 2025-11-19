#!/usr/bin/env python3
"""
Main entry point for The Program backend (PyInstaller bundle)
Starts the FastAPI application with uvicorn server
"""

import sys
import os
import uvicorn
from pathlib import Path


def get_base_path() -> Path:
    """
    Get the base path for the application
    In development: returns the backend directory
    In bundled mode: returns the temporary extraction directory
    """
    if getattr(sys, 'frozen', False):
        # Running in PyInstaller bundle
        return Path(sys._MEIPASS)
    else:
        # Running in development
        return Path(__file__).parent


def main():
    """
    Main entry point for the backend server
    """
    # Get base path and set up environment
    base_path = get_base_path()

    # Set environment variables if not already set
    if 'USER_DATA_DIR' not in os.environ:
        # Use home directory for user data in bundled mode
        user_data = Path.home() / '.theprogram'
        user_data.mkdir(parents=True, exist_ok=True)
        os.environ['USER_DATA_DIR'] = str(user_data)

    # Set ephemeris path to bundled location
    if 'EPHEMERIS_PATH' not in os.environ:
        ephemeris_path = base_path / 'ephemeris'
        if ephemeris_path.exists():
            os.environ['EPHEMERIS_PATH'] = str(ephemeris_path)
        else:
            # Use pyswisseph's built-in ephemeris
            os.environ['EPHEMERIS_PATH'] = ''

    # Set database path if not set
    if 'DATABASE_URL' not in os.environ:
        db_path = Path(os.environ['USER_DATA_DIR']) / 'theprogram.db'
        os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'

    # Parse command line arguments
    port = int(os.environ.get('PORT', 8000))
    host = os.environ.get('HOST', '0.0.0.0')

    # Check if running from command line with arguments
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg == '--port' and i + 1 < len(sys.argv):
                port = int(sys.argv[i + 1])
            elif arg == '--host' and i + 1 < len(sys.argv):
                host = sys.argv[i + 1]

    print(f"Starting The Program backend...")
    print(f"Server: http://{host}:{port}")
    print(f"User data directory: {os.environ['USER_DATA_DIR']}")
    print(f"Database: {os.environ.get('DATABASE_URL', 'Not set')}")
    print(f"Ephemeris path: {os.environ.get('EPHEMERIS_PATH', 'Built-in')}")

    # Start uvicorn server
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    main()
