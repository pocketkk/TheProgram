"""
Export data from PostgreSQL database to JSON files for migration.

This script connects to the PostgreSQL database, exports all tables to JSON,
and creates a manifest file with metadata about the export.
"""
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import hashlib

import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as PGConnection

from config import (
    POSTGRES_URL,
    MIGRATION_DATA_DIR,
    DEFAULT_USER_EMAIL,
    LOG_LEVEL,
    LOG_FORMAT,
)

# Configure logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)


class PostgreSQLExporter:
    """Export PostgreSQL data to JSON files."""

    def __init__(self, postgres_url: str, user_email: str):
        """
        Initialize the exporter.

        Args:
            postgres_url: PostgreSQL connection URL
            user_email: Email of the user whose data to export
        """
        self.postgres_url = postgres_url
        self.user_email = user_email
        self.user_id: Optional[str] = None
        self.conn: Optional[PGConnection] = None
        self.stats: Dict[str, int] = {}

    def connect(self) -> None:
        """Establish connection to PostgreSQL database."""
        logger.info("Connecting to PostgreSQL database...")
        try:
            self.conn = psycopg2.connect(self.postgres_url)
            logger.info("Connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    def disconnect(self) -> None:
        """Close PostgreSQL connection."""
        if self.conn:
            self.conn.close()
            logger.info("Disconnected from PostgreSQL")

    def get_user_id(self) -> str:
        """
        Get the user ID for the specified email.

        Returns:
            User UUID as string

        Raises:
            ValueError: If user not found
        """
        logger.info(f"Looking up user: {self.user_email}")
        cursor = self.conn.cursor()
        cursor.execute("SELECT id, full_name FROM users WHERE email = %s", (self.user_email,))
        result = cursor.fetchone()

        if not result:
            raise ValueError(f"User not found: {self.user_email}")

        user_id, full_name = result
        logger.info(f"Found user: {full_name} (ID: {user_id})")
        return str(user_id)

    def export_user_and_preferences(self) -> Dict[str, Any]:
        """
        Export user data and preferences.

        Returns:
            Dictionary with user and preference data
        """
        logger.info("Exporting user and preferences...")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get user data
        cursor.execute("SELECT * FROM users WHERE id = %s", (self.user_id,))
        user = cursor.fetchone()

        if not user:
            raise ValueError(f"User not found: {self.user_id}")

        # Get user preferences
        cursor.execute("SELECT * FROM user_preferences WHERE user_id = %s", (self.user_id,))
        preferences = cursor.fetchone()

        user_data = {
            "user": self._serialize_row(dict(user)),
            "preferences": self._serialize_row(dict(preferences)) if preferences else None,
        }

        self.stats["users"] = 1
        self.stats["user_preferences"] = 1 if preferences else 0

        logger.info(f"Exported user and preferences")
        return user_data

    def export_table(
        self, table_name: str, user_filter: bool = True, additional_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Export data from a specific table.

        Args:
            table_name: Name of the table to export
            user_filter: Whether to filter by user_id
            additional_filter: Additional WHERE clause filter

        Returns:
            List of rows as dictionaries
        """
        logger.info(f"Exporting table: {table_name}")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Build query
        query = f"SELECT * FROM {table_name}"
        params = []

        if user_filter:
            query += " WHERE user_id = %s"
            params.append(self.user_id)

        if additional_filter:
            query += f" AND {additional_filter}" if user_filter else f" WHERE {additional_filter}"

        logger.debug(f"Query: {query}")
        cursor.execute(query, params)
        rows = cursor.fetchall()

        # Serialize rows
        data = [self._serialize_row(dict(row)) for row in rows]
        self.stats[table_name] = len(data)

        logger.info(f"Exported {len(data)} rows from {table_name}")
        return data

    def export_clients(self) -> List[Dict[str, Any]]:
        """Export clients for the user."""
        return self.export_table("clients", user_filter=True)

    def export_birth_data(self, client_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Export birth data for the user's clients.

        Args:
            client_ids: List of client IDs to export birth data for

        Returns:
            List of birth_data records
        """
        if not client_ids:
            logger.warning("No client IDs provided, skipping birth_data export")
            return []

        logger.info(f"Exporting birth_data for {len(client_ids)} clients")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Use IN clause for client_ids
        placeholders = ",".join(["%s"] * len(client_ids))
        query = f"SELECT * FROM birth_data WHERE client_id IN ({placeholders})"

        cursor.execute(query, client_ids)
        rows = cursor.fetchall()

        data = [self._serialize_row(dict(row)) for row in rows]
        self.stats["birth_data"] = len(data)

        logger.info(f"Exported {len(data)} birth_data records")
        return data

    def export_charts(self) -> List[Dict[str, Any]]:
        """Export charts for the user."""
        return self.export_table("charts", user_filter=True)

    def export_chart_interpretations(self, chart_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Export chart interpretations for the user's charts.

        Args:
            chart_ids: List of chart IDs

        Returns:
            List of chart_interpretation records
        """
        if not chart_ids:
            logger.warning("No chart IDs provided, skipping chart_interpretations export")
            return []

        logger.info(f"Exporting chart_interpretations for {len(chart_ids)} charts")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        placeholders = ",".join(["%s"] * len(chart_ids))
        query = f"SELECT * FROM chart_interpretations WHERE chart_id IN ({placeholders})"

        cursor.execute(query, chart_ids)
        rows = cursor.fetchall()

        data = [self._serialize_row(dict(row)) for row in rows]
        self.stats["chart_interpretations"] = len(data)

        logger.info(f"Exported {len(data)} chart_interpretations")
        return data

    def export_interpretations(self) -> List[Dict[str, Any]]:
        """
        Export interpretations (default + user custom).

        Returns:
            List of interpretation records
        """
        logger.info("Exporting interpretations (default + user custom)")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get default interpretations (user_id IS NULL) and user's custom interpretations
        query = """
            SELECT * FROM interpretations
            WHERE user_id IS NULL OR user_id = %s
        """
        cursor.execute(query, (self.user_id,))
        rows = cursor.fetchall()

        data = [self._serialize_row(dict(row)) for row in rows]
        self.stats["interpretations"] = len(data)

        logger.info(f"Exported {len(data)} interpretations")
        return data

    def export_aspect_patterns(self, chart_ids: List[str]) -> List[Dict[str, Any]]:
        """Export aspect patterns for the user's charts."""
        if not chart_ids:
            return []

        logger.info(f"Exporting aspect_patterns for {len(chart_ids)} charts")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        placeholders = ",".join(["%s"] * len(chart_ids))
        query = f"SELECT * FROM aspect_patterns WHERE chart_id IN ({placeholders})"

        cursor.execute(query, chart_ids)
        rows = cursor.fetchall()

        data = [self._serialize_row(dict(row)) for row in rows]
        self.stats["aspect_patterns"] = len(data)

        logger.info(f"Exported {len(data)} aspect_patterns")
        return data

    def export_transit_events(self, chart_ids: List[str]) -> List[Dict[str, Any]]:
        """Export transit events for the user's charts."""
        if not chart_ids:
            return []

        logger.info(f"Exporting transit_events for {len(chart_ids)} charts")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        placeholders = ",".join(["%s"] * len(chart_ids))
        query = f"SELECT * FROM transit_events WHERE chart_id IN ({placeholders})"

        cursor.execute(query, chart_ids)
        rows = cursor.fetchall()

        data = [self._serialize_row(dict(row)) for row in rows]
        self.stats["transit_events"] = len(data)

        logger.info(f"Exported {len(data)} transit_events")
        return data

    def export_session_notes(self) -> List[Dict[str, Any]]:
        """Export session notes for the user."""
        return self.export_table("session_notes", user_filter=True)

    def export_location_cache(self) -> List[Dict[str, Any]]:
        """
        Export location cache (shared resource, no user filter).

        Returns:
            List of location_cache records
        """
        logger.info("Exporting location_cache (shared resource)")
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("SELECT * FROM location_cache")
        rows = cursor.fetchall()

        data = [self._serialize_row(dict(row)) for row in rows]
        self.stats["location_cache"] = len(data)

        logger.info(f"Exported {len(data)} locations")
        return data

    def _serialize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serialize a database row to JSON-compatible format.

        Args:
            row: Database row as dictionary

        Returns:
            Serialized row
        """
        from datetime import date, datetime, time
        from decimal import Decimal
        from uuid import UUID

        serialized = {}
        for key, value in row.items():
            if value is None:
                serialized[key] = None
            elif isinstance(value, UUID):
                serialized[key] = str(value)
            elif isinstance(value, (datetime, date, time)):
                serialized[key] = value.isoformat()
            elif isinstance(value, Decimal):
                serialized[key] = float(value)
            elif isinstance(value, (dict, list)):
                # Already JSON-compatible from JSONB
                serialized[key] = value
            else:
                serialized[key] = value

        return serialized

    def save_json(self, filename: str, data: Any) -> str:
        """
        Save data to JSON file.

        Args:
            filename: Name of the file
            data: Data to save

        Returns:
            SHA256 checksum of the file
        """
        filepath = MIGRATION_DATA_DIR / filename
        logger.info(f"Saving {filename}...")

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Calculate checksum
        with open(filepath, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        logger.info(f"Saved {filename} (checksum: {checksum[:16]}...)")
        return checksum

    def export_all(self) -> Dict[str, str]:
        """
        Export all data from PostgreSQL.

        Returns:
            Dictionary mapping filenames to checksums
        """
        checksums = {}

        try:
            self.connect()
            self.user_id = self.get_user_id()

            # Export user and preferences
            user_data = self.export_user_and_preferences()
            checksums["user_data.json"] = self.save_json("user_data.json", user_data)

            # Export clients
            clients = self.export_clients()
            checksums["clients.json"] = self.save_json("clients.json", clients)
            client_ids = [c["id"] for c in clients]

            # Export birth data
            birth_data = self.export_birth_data(client_ids)
            checksums["birth_data.json"] = self.save_json("birth_data.json", birth_data)

            # Export charts
            charts = self.export_charts()
            checksums["charts.json"] = self.save_json("charts.json", charts)
            chart_ids = [c["id"] for c in charts]

            # Export chart interpretations
            chart_interpretations = self.export_chart_interpretations(chart_ids)
            checksums["chart_interpretations.json"] = self.save_json(
                "chart_interpretations.json", chart_interpretations
            )

            # Export interpretations
            interpretations = self.export_interpretations()
            checksums["interpretations.json"] = self.save_json(
                "interpretations.json", interpretations
            )

            # Export aspect patterns
            aspect_patterns = self.export_aspect_patterns(chart_ids)
            checksums["aspect_patterns.json"] = self.save_json(
                "aspect_patterns.json", aspect_patterns
            )

            # Export transit events
            transit_events = self.export_transit_events(chart_ids)
            checksums["transit_events.json"] = self.save_json(
                "transit_events.json", transit_events
            )

            # Export session notes
            session_notes = self.export_session_notes()
            checksums["session_notes.json"] = self.save_json(
                "session_notes.json", session_notes
            )

            # Export location cache
            location_cache = self.export_location_cache()
            checksums["location_cache.json"] = self.save_json(
                "location_cache.json", location_cache
            )

            # Create manifest
            manifest = {
                "export_timestamp": datetime.utcnow().isoformat(),
                "user_email": self.user_email,
                "user_id": self.user_id,
                "row_counts": self.stats,
                "checksums": checksums,
            }
            manifest_checksum = self.save_json("manifest.json", manifest)

            logger.info("\n" + "=" * 60)
            logger.info("Export Summary")
            logger.info("=" * 60)
            for table, count in self.stats.items():
                logger.info(f"  {table}: {count} rows")
            logger.info("=" * 60)

            return checksums

        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Export PostgreSQL data to JSON")
    parser.add_argument(
        "--user-email",
        default=DEFAULT_USER_EMAIL,
        help=f"Email of user to export (default: {DEFAULT_USER_EMAIL})",
    )
    parser.add_argument(
        "--postgres-url",
        default=POSTGRES_URL,
        help="PostgreSQL connection URL",
    )

    args = parser.parse_args()

    logger.info("Starting PostgreSQL export...")
    logger.info(f"User: {args.user_email}")
    logger.info(f"Output directory: {MIGRATION_DATA_DIR}")

    exporter = PostgreSQLExporter(args.postgres_url, args.user_email)

    try:
        checksums = exporter.export_all()
        logger.info("\nExport completed successfully!")
        logger.info(f"Data saved to: {MIGRATION_DATA_DIR}")
        return 0
    except Exception as e:
        logger.error(f"\nExport failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
