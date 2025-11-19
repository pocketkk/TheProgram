"""
Import data from JSON files into SQLite database.

This script reads the exported JSON files and imports them into a new SQLite
database, handling all type conversions and transformations according to the
migration mapping.
"""
import json
import logging
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import (
    SQLITE_PATH,
    SCHEMA_PATH,
    MIGRATION_DATA_DIR,
    LOG_LEVEL,
    LOG_FORMAT,
)

# Configure logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)


class SQLiteImporter:
    """Import JSON data into SQLite database."""

    def __init__(self, sqlite_path: Path, schema_path: Path):
        """
        Initialize the importer.

        Args:
            sqlite_path: Path to SQLite database file
            schema_path: Path to SQL schema file
        """
        self.sqlite_path = sqlite_path
        self.schema_path = schema_path
        self.conn: Optional[sqlite3.Connection] = None
        self.stats: Dict[str, int] = {}

    def create_database(self) -> None:
        """Create new SQLite database from schema file."""
        logger.info(f"Creating SQLite database: {self.sqlite_path}")

        # Check if database already exists
        if self.sqlite_path.exists():
            backup_path = self.sqlite_path.parent / f"{self.sqlite_path.stem}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            logger.warning(f"Database already exists, backing up to: {backup_path}")
            import shutil
            shutil.copy2(self.sqlite_path, backup_path)
            self.sqlite_path.unlink()

        # Create new database
        self.conn = sqlite3.connect(self.sqlite_path)
        self.conn.execute("PRAGMA foreign_keys = ON")

        # Read and execute schema
        logger.info(f"Loading schema from: {self.schema_path}")
        with open(self.schema_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()

        # Execute schema (may contain multiple statements)
        self.conn.executescript(schema_sql)
        self.conn.commit()

        logger.info("Database created successfully")

    def connect(self) -> None:
        """Connect to SQLite database."""
        logger.info(f"Connecting to SQLite database: {self.sqlite_path}")
        self.conn = sqlite3.connect(self.sqlite_path)
        self.conn.execute("PRAGMA foreign_keys = ON")
        logger.info("Connected successfully")

    def disconnect(self) -> None:
        """Close SQLite connection."""
        if self.conn:
            self.conn.close()
            logger.info("Disconnected from SQLite")

    def load_json(self, filename: str) -> Any:
        """
        Load data from JSON file.

        Args:
            filename: Name of the JSON file

        Returns:
            Loaded data
        """
        filepath = MIGRATION_DATA_DIR / filename
        logger.info(f"Loading {filename}...")

        if not filepath.exists():
            logger.warning(f"File not found: {filename}")
            return None

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        logger.info(f"Loaded {filename}")
        return data

    def import_user_data(self, user_data: Dict[str, Any]) -> None:
        """
        Import user data into app_config and user_preferences.

        Args:
            user_data: Dictionary with user and preferences data
        """
        logger.info("Importing user data to app_config...")

        user = user_data.get("user")
        if not user:
            logger.error("No user data found")
            return

        # Update app_config with password hash
        cursor = self.conn.cursor()
        cursor.execute(
            "UPDATE app_config SET password_hash = ?, updated_at = ? WHERE id = 1",
            (user.get("password_hash"), datetime.utcnow().isoformat())
        )
        self.conn.commit()
        logger.info(f"Updated app_config with password hash")

        # Import user preferences
        preferences = user_data.get("preferences")
        if preferences:
            logger.info("Importing user preferences...")
            cursor.execute(
                """
                UPDATE user_preferences SET
                    default_house_system = ?,
                    default_ayanamsa = ?,
                    default_zodiac = ?,
                    aspect_orbs = ?,
                    color_scheme = ?,
                    displayed_points = ?,
                    updated_at = ?
                WHERE id = 1
                """,
                (
                    preferences.get("default_house_system"),
                    preferences.get("default_ayanamsa"),
                    preferences.get("default_zodiac"),
                    json.dumps(preferences["aspect_orbs"]) if preferences.get("aspect_orbs") else None,
                    preferences.get("color_scheme"),
                    json.dumps(preferences["displayed_points"]) if preferences.get("displayed_points") else None,
                    datetime.utcnow().isoformat(),
                ),
            )
            self.conn.commit()
            logger.info("Updated user_preferences")

    def import_clients(self, clients: List[Dict[str, Any]]) -> None:
        """
        Import clients.

        Args:
            clients: List of client records
        """
        if not clients:
            logger.warning("No clients to import")
            return

        logger.info(f"Importing {len(clients)} clients...")
        cursor = self.conn.cursor()

        for client in clients:
            cursor.execute(
                """
                INSERT INTO clients (
                    id, first_name, last_name, email, phone, notes,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    client["id"],  # Already a string from export
                    client.get("first_name"),
                    client.get("last_name"),
                    client.get("email"),
                    client.get("phone"),
                    client.get("notes"),
                    client["created_at"],
                    client["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["clients"] = len(clients)
        logger.info(f"Imported {len(clients)} clients")

    def import_birth_data(self, birth_data_list: List[Dict[str, Any]]) -> None:
        """
        Import birth data.

        Args:
            birth_data_list: List of birth_data records
        """
        if not birth_data_list:
            logger.warning("No birth_data to import")
            return

        logger.info(f"Importing {len(birth_data_list)} birth_data records...")
        cursor = self.conn.cursor()

        for bd in birth_data_list:
            cursor.execute(
                """
                INSERT INTO birth_data (
                    id, client_id, birth_date, birth_time, time_unknown,
                    latitude, longitude, timezone, utc_offset,
                    city, state_province, country, rodden_rating, gender,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    bd["id"],
                    bd["client_id"],
                    bd["birth_date"],
                    bd.get("birth_time"),
                    1 if bd.get("time_unknown") else 0,
                    bd["latitude"],
                    bd["longitude"],
                    bd["timezone"],
                    bd.get("utc_offset"),
                    bd.get("city"),
                    bd.get("state_province"),
                    bd.get("country"),
                    bd.get("rodden_rating"),
                    bd.get("gender"),
                    bd["created_at"],
                    bd["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["birth_data"] = len(birth_data_list)
        logger.info(f"Imported {len(birth_data_list)} birth_data records")

    def import_charts(self, charts: List[Dict[str, Any]]) -> None:
        """
        Import charts.

        Args:
            charts: List of chart records
        """
        if not charts:
            logger.warning("No charts to import")
            return

        logger.info(f"Importing {len(charts)} charts...")
        cursor = self.conn.cursor()

        for chart in charts:
            # Serialize JSON fields
            calculation_params = None
            if chart.get("calculation_params"):
                calculation_params = json.dumps(chart["calculation_params"])

            chart_data = json.dumps(chart["chart_data"])

            cursor.execute(
                """
                INSERT INTO charts (
                    id, client_id, birth_data_id, chart_name, chart_type,
                    astro_system, house_system, ayanamsa, zodiac_type,
                    calculation_params, chart_data, last_viewed,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    chart["id"],
                    chart.get("client_id"),
                    chart["birth_data_id"],
                    chart.get("chart_name"),
                    chart["chart_type"],
                    chart["astro_system"],
                    chart.get("house_system"),
                    chart.get("ayanamsa"),
                    chart.get("zodiac_type", "tropical"),
                    calculation_params,
                    chart_data,
                    chart.get("last_viewed"),
                    chart["created_at"],
                    chart["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["charts"] = len(charts)
        logger.info(f"Imported {len(charts)} charts")

    def import_chart_interpretations(self, interpretations: List[Dict[str, Any]]) -> None:
        """
        Import chart interpretations.

        Args:
            interpretations: List of chart_interpretation records
        """
        if not interpretations:
            logger.warning("No chart_interpretations to import")
            return

        logger.info(f"Importing {len(interpretations)} chart_interpretations...")
        cursor = self.conn.cursor()

        for interp in interpretations:
            cursor.execute(
                """
                INSERT INTO chart_interpretations (
                    id, chart_id, element_type, element_key, ai_description,
                    ai_model, ai_prompt_version, version, is_approved,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    interp["id"],
                    interp["chart_id"],
                    interp["element_type"],
                    interp["element_key"],
                    interp["ai_description"],
                    interp.get("ai_model"),
                    interp.get("ai_prompt_version"),
                    interp.get("version", 1),
                    interp.get("is_approved", "pending"),
                    interp["created_at"],
                    interp["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["chart_interpretations"] = len(interpretations)
        logger.info(f"Imported {len(interpretations)} chart_interpretations")

    def import_interpretations(self, interpretations: List[Dict[str, Any]]) -> None:
        """
        Import interpretations.

        Args:
            interpretations: List of interpretation records
        """
        if not interpretations:
            logger.warning("No interpretations to import")
            return

        logger.info(f"Importing {len(interpretations)} interpretations...")
        cursor = self.conn.cursor()

        for interp in interpretations:
            cursor.execute(
                """
                INSERT INTO interpretations (
                    id, interpretation_type, key_identifier, tradition,
                    text_content, source, is_user_custom, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    interp["id"],
                    interp["interpretation_type"],
                    interp["key_identifier"],
                    interp.get("tradition"),
                    interp["text_content"],
                    interp.get("source"),
                    1 if interp.get("is_user_custom") else 0,
                    interp["created_at"],
                    interp["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["interpretations"] = len(interpretations)
        logger.info(f"Imported {len(interpretations)} interpretations")

    def import_aspect_patterns(self, patterns: List[Dict[str, Any]]) -> None:
        """
        Import aspect patterns.

        Args:
            patterns: List of aspect_pattern records
        """
        if not patterns:
            logger.warning("No aspect_patterns to import")
            return

        logger.info(f"Importing {len(patterns)} aspect_patterns...")
        cursor = self.conn.cursor()

        for pattern in patterns:
            planets_involved = json.dumps(pattern["planets_involved"])

            cursor.execute(
                """
                INSERT INTO aspect_patterns (
                    id, chart_id, pattern_type, planets_involved, description,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    pattern["id"],
                    pattern["chart_id"],
                    pattern["pattern_type"],
                    planets_involved,
                    pattern.get("description"),
                    pattern["created_at"],
                    pattern["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["aspect_patterns"] = len(patterns)
        logger.info(f"Imported {len(patterns)} aspect_patterns")

    def import_transit_events(self, transits: List[Dict[str, Any]]) -> None:
        """
        Import transit events.

        Args:
            transits: List of transit_event records
        """
        if not transits:
            logger.warning("No transit_events to import")
            return

        logger.info(f"Importing {len(transits)} transit_events...")
        cursor = self.conn.cursor()

        for transit in transits:
            # Handle is_applying (can be True, False, or None)
            is_applying = transit.get("is_applying")
            if is_applying is not None:
                is_applying = 1 if is_applying else 0

            cursor.execute(
                """
                INSERT INTO transit_events (
                    id, chart_id, event_date, transiting_planet, natal_planet,
                    aspect_type, orb, is_applying, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    transit["id"],
                    transit["chart_id"],
                    transit["event_date"],
                    transit["transiting_planet"],
                    transit["natal_planet"],
                    transit["aspect_type"],
                    transit.get("orb"),
                    is_applying,
                    transit["created_at"],
                    transit["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["transit_events"] = len(transits)
        logger.info(f"Imported {len(transits)} transit_events")

    def import_session_notes(self, notes: List[Dict[str, Any]]) -> None:
        """
        Import session notes.

        Args:
            notes: List of session_note records
        """
        if not notes:
            logger.warning("No session_notes to import")
            return

        logger.info(f"Importing {len(notes)} session_notes...")
        cursor = self.conn.cursor()

        for note in notes:
            cursor.execute(
                """
                INSERT INTO session_notes (
                    id, client_id, note_date, note_content, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    note["id"],
                    note["client_id"],
                    note["note_date"],
                    note.get("note_content"),
                    note["created_at"],
                    note["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["session_notes"] = len(notes)
        logger.info(f"Imported {len(notes)} session_notes")

    def import_location_cache(self, locations: List[Dict[str, Any]]) -> None:
        """
        Import location cache.

        Args:
            locations: List of location_cache records
        """
        if not locations:
            logger.warning("No location_cache to import")
            return

        logger.info(f"Importing {len(locations)} location_cache records...")
        cursor = self.conn.cursor()

        for loc in locations:
            cursor.execute(
                """
                INSERT OR IGNORE INTO location_cache (
                    id, city_name, state_province, country,
                    latitude, longitude, timezone, geonames_id,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    loc["id"],
                    loc["city_name"],
                    loc.get("state_province"),
                    loc["country"],
                    loc["latitude"],
                    loc["longitude"],
                    loc["timezone"],
                    loc.get("geonames_id"),
                    loc["created_at"],
                    loc["updated_at"],
                ),
            )

        self.conn.commit()
        self.stats["location_cache"] = len(locations)
        logger.info(f"Imported {len(locations)} location_cache records")

    def import_all(self) -> None:
        """Import all data from JSON files."""
        try:
            # Load manifest
            manifest = self.load_json("manifest.json")
            if not manifest:
                raise ValueError("Manifest file not found")

            logger.info(f"Migration manifest loaded")
            logger.info(f"  Export timestamp: {manifest['export_timestamp']}")
            logger.info(f"  User: {manifest['user_email']}")

            # Create database
            self.create_database()

            # Start transaction
            self.conn.execute("BEGIN TRANSACTION")

            try:
                # Import data in dependency order
                user_data = self.load_json("user_data.json")
                if user_data:
                    self.import_user_data(user_data)

                clients = self.load_json("clients.json")
                if clients:
                    self.import_clients(clients)

                birth_data = self.load_json("birth_data.json")
                if birth_data:
                    self.import_birth_data(birth_data)

                charts = self.load_json("charts.json")
                if charts:
                    self.import_charts(charts)

                chart_interpretations = self.load_json("chart_interpretations.json")
                if chart_interpretations:
                    self.import_chart_interpretations(chart_interpretations)

                interpretations = self.load_json("interpretations.json")
                if interpretations:
                    self.import_interpretations(interpretations)

                aspect_patterns = self.load_json("aspect_patterns.json")
                if aspect_patterns:
                    self.import_aspect_patterns(aspect_patterns)

                transit_events = self.load_json("transit_events.json")
                if transit_events:
                    self.import_transit_events(transit_events)

                session_notes = self.load_json("session_notes.json")
                if session_notes:
                    self.import_session_notes(session_notes)

                location_cache = self.load_json("location_cache.json")
                if location_cache:
                    self.import_location_cache(location_cache)

                # Commit transaction
                self.conn.commit()
                logger.info("Transaction committed successfully")

                # Print summary
                logger.info("\n" + "=" * 60)
                logger.info("Import Summary")
                logger.info("=" * 60)
                for table, count in self.stats.items():
                    logger.info(f"  {table}: {count} rows")
                logger.info("=" * 60)

            except Exception as e:
                logger.error(f"Import failed, rolling back: {e}")
                self.conn.rollback()
                raise

        except Exception as e:
            logger.error(f"Import failed: {e}")
            raise
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Import JSON data into SQLite")
    parser.add_argument(
        "--sqlite-path",
        type=Path,
        default=SQLITE_PATH,
        help=f"Path to SQLite database (default: {SQLITE_PATH})",
    )
    parser.add_argument(
        "--schema-path",
        type=Path,
        default=SCHEMA_PATH,
        help=f"Path to SQL schema file (default: {SCHEMA_PATH})",
    )

    args = parser.parse_args()

    logger.info("Starting SQLite import...")
    logger.info(f"Database: {args.sqlite_path}")
    logger.info(f"Schema: {args.schema_path}")
    logger.info(f"Data directory: {MIGRATION_DATA_DIR}")

    importer = SQLiteImporter(args.sqlite_path, args.schema_path)

    try:
        importer.import_all()
        logger.info("\nImport completed successfully!")
        logger.info(f"Database saved to: {args.sqlite_path}")
        return 0
    except Exception as e:
        logger.error(f"\nImport failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
