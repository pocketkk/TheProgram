"""
Validate data migration from PostgreSQL to SQLite.

This script performs comprehensive validation to ensure all data was migrated
correctly, including row counts, foreign key integrity, JSON structure, and
data quality checks.
"""
import json
import logging
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
import psycopg2.extras

from config import (
    POSTGRES_URL,
    SQLITE_PATH,
    MIGRATION_DATA_DIR,
    DEFAULT_USER_EMAIL,
    LOG_LEVEL,
    LOG_FORMAT,
)

# Configure logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)


class MigrationValidator:
    """Validate PostgreSQL to SQLite migration."""

    def __init__(self, postgres_url: str, sqlite_path: Path, user_email: str):
        """
        Initialize the validator.

        Args:
            postgres_url: PostgreSQL connection URL
            sqlite_path: Path to SQLite database
            user_email: Email of the migrated user
        """
        self.postgres_url = postgres_url
        self.sqlite_path = sqlite_path
        self.user_email = user_email
        self.pg_conn: Optional[Any] = None
        self.sqlite_conn: Optional[sqlite3.Connection] = None
        self.user_id: Optional[str] = None
        self.validation_results: Dict[str, Dict[str, Any]] = {}
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def connect(self) -> None:
        """Establish connections to both databases."""
        logger.info("Connecting to PostgreSQL...")
        self.pg_conn = psycopg2.connect(self.postgres_url)
        logger.info("Connected to PostgreSQL")

        logger.info(f"Connecting to SQLite: {self.sqlite_path}")
        self.sqlite_conn = sqlite3.connect(self.sqlite_path)
        self.sqlite_conn.execute("PRAGMA foreign_keys = ON")
        logger.info("Connected to SQLite")

    def disconnect(self) -> None:
        """Close database connections."""
        if self.pg_conn:
            self.pg_conn.close()
            logger.info("Disconnected from PostgreSQL")
        if self.sqlite_conn:
            self.sqlite_conn.close()
            logger.info("Disconnected from SQLite")

    def get_user_id(self) -> str:
        """Get the user ID for the specified email."""
        cursor = self.pg_conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (self.user_email,))
        result = cursor.fetchone()

        if not result:
            raise ValueError(f"User not found: {self.user_email}")

        user_id = str(result[0])
        logger.info(f"Found user ID: {user_id}")
        return user_id

    def validate_row_counts(self) -> bool:
        """
        Validate row counts match between PostgreSQL and SQLite.

        Returns:
            True if all counts match, False otherwise
        """
        logger.info("\n" + "=" * 60)
        logger.info("Validating Row Counts")
        logger.info("=" * 60)

        all_match = True
        pg_cursor = self.pg_conn.cursor()
        sqlite_cursor = self.sqlite_conn.cursor()

        # Tables to validate
        tables_to_check = [
            ("clients", True, None),  # (table_name, has_user_filter, additional_filter)
            ("birth_data", False, f"client_id IN (SELECT id FROM clients WHERE user_id = '{self.user_id}')"),
            ("charts", True, None),
            ("chart_interpretations", False, f"chart_id IN (SELECT id FROM charts WHERE user_id = '{self.user_id}')"),
            ("aspect_patterns", False, f"chart_id IN (SELECT id FROM charts WHERE user_id = '{self.user_id}')"),
            ("transit_events", False, f"chart_id IN (SELECT id FROM charts WHERE user_id = '{self.user_id}')"),
            ("session_notes", True, None),
        ]

        for table_name, has_user_filter, additional_filter in tables_to_check:
            # Count in PostgreSQL
            pg_query = f"SELECT COUNT(*) FROM {table_name}"
            pg_params = []

            if has_user_filter:
                pg_query += " WHERE user_id = %s"
                pg_params.append(self.user_id)

            if additional_filter:
                pg_query += f" AND {additional_filter}" if has_user_filter else f" WHERE {additional_filter}"

            pg_cursor.execute(pg_query, pg_params)
            pg_count = pg_cursor.fetchone()[0]

            # Count in SQLite
            sqlite_query = f"SELECT COUNT(*) FROM {table_name}"
            sqlite_cursor.execute(sqlite_query)
            sqlite_count = sqlite_cursor.fetchone()[0]

            match = pg_count == sqlite_count
            self.validation_results[table_name] = {
                "pg_count": pg_count,
                "sqlite_count": sqlite_count,
                "match": match,
            }

            status = "✓ MATCH" if match else "✗ MISMATCH"
            logger.info(f"  {table_name:25} PG: {pg_count:5} | SQLite: {sqlite_count:5} | {status}")

            if not match:
                all_match = False
                self.errors.append(f"Row count mismatch in {table_name}: PG={pg_count}, SQLite={sqlite_count}")

        # Special check: interpretations (includes default + user custom)
        pg_cursor.execute(
            "SELECT COUNT(*) FROM interpretations WHERE user_id IS NULL OR user_id = %s",
            (self.user_id,)
        )
        pg_interp_count = pg_cursor.fetchone()[0]

        sqlite_cursor.execute("SELECT COUNT(*) FROM interpretations")
        sqlite_interp_count = sqlite_cursor.fetchone()[0]

        match = pg_interp_count == sqlite_interp_count
        self.validation_results["interpretations"] = {
            "pg_count": pg_interp_count,
            "sqlite_count": sqlite_interp_count,
            "match": match,
        }

        status = "✓ MATCH" if match else "✗ MISMATCH"
        logger.info(f"  interpretations          PG: {pg_interp_count:5} | SQLite: {sqlite_interp_count:5} | {status}")

        if not match:
            all_match = False
            self.errors.append(f"Row count mismatch in interpretations: PG={pg_interp_count}, SQLite={sqlite_interp_count}")

        # Location cache (shared resource, no user filter)
        pg_cursor.execute("SELECT COUNT(*) FROM location_cache")
        pg_loc_count = pg_cursor.fetchone()[0]

        sqlite_cursor.execute("SELECT COUNT(*) FROM location_cache")
        sqlite_loc_count = sqlite_cursor.fetchone()[0]

        # SQLite might have same or fewer (due to INSERT OR IGNORE)
        match = sqlite_loc_count <= pg_loc_count
        self.validation_results["location_cache"] = {
            "pg_count": pg_loc_count,
            "sqlite_count": sqlite_loc_count,
            "match": match,
        }

        status = "✓ MATCH" if match else "✗ MISMATCH"
        logger.info(f"  location_cache           PG: {pg_loc_count:5} | SQLite: {sqlite_loc_count:5} | {status}")

        if not match:
            all_match = False
            self.errors.append(f"Location cache count issue: PG={pg_loc_count}, SQLite={sqlite_loc_count}")

        logger.info("=" * 60)
        return all_match

    def validate_foreign_keys(self) -> bool:
        """
        Validate foreign key integrity in SQLite.

        Returns:
            True if all foreign keys are valid, False otherwise
        """
        logger.info("\n" + "=" * 60)
        logger.info("Validating Foreign Key Integrity")
        logger.info("=" * 60)

        cursor = self.sqlite_conn.cursor()
        all_valid = True

        # Check foreign key violations
        cursor.execute("PRAGMA foreign_key_check")
        violations = cursor.fetchall()

        if violations:
            all_valid = False
            logger.error(f"  ✗ Found {len(violations)} foreign key violations:")
            for violation in violations[:10]:  # Show first 10
                logger.error(f"    {violation}")
                self.errors.append(f"Foreign key violation: {violation}")

            if len(violations) > 10:
                logger.error(f"    ... and {len(violations) - 10} more")
        else:
            logger.info("  ✓ No foreign key violations found")

        # Check specific relationships
        fk_checks = [
            ("birth_data", "client_id", "clients", "id"),
            ("charts", "client_id", "clients", "id"),
            ("charts", "birth_data_id", "birth_data", "id"),
            ("chart_interpretations", "chart_id", "charts", "id"),
            ("aspect_patterns", "chart_id", "charts", "id"),
            ("transit_events", "chart_id", "charts", "id"),
            ("session_notes", "client_id", "clients", "id"),
        ]

        for child_table, fk_column, parent_table, pk_column in fk_checks:
            # Check for orphaned records
            query = f"""
                SELECT COUNT(*)
                FROM {child_table}
                WHERE {fk_column} IS NOT NULL
                  AND {fk_column} NOT IN (SELECT {pk_column} FROM {parent_table})
            """
            cursor.execute(query)
            orphaned_count = cursor.fetchone()[0]

            if orphaned_count > 0:
                all_valid = False
                msg = f"  ✗ {child_table}.{fk_column} has {orphaned_count} orphaned records"
                logger.error(msg)
                self.errors.append(msg)
            else:
                logger.info(f"  ✓ {child_table}.{fk_column} → {parent_table}.{pk_column}")

        logger.info("=" * 60)
        return all_valid

    def validate_json_fields(self) -> bool:
        """
        Validate JSON fields can be parsed correctly.

        Returns:
            True if all JSON is valid, False otherwise
        """
        logger.info("\n" + "=" * 60)
        logger.info("Validating JSON Fields")
        logger.info("=" * 60)

        cursor = self.sqlite_conn.cursor()
        all_valid = True

        # Check charts.chart_data (required JSON field)
        cursor.execute("SELECT id, chart_data FROM charts")
        charts = cursor.fetchall()
        invalid_chart_data = 0

        for chart_id, chart_data in charts:
            if not chart_data:
                invalid_chart_data += 1
                self.errors.append(f"Chart {chart_id} has NULL chart_data")
                continue

            try:
                json.loads(chart_data)
            except json.JSONDecodeError as e:
                invalid_chart_data += 1
                self.errors.append(f"Chart {chart_id} has invalid chart_data JSON: {e}")

        if invalid_chart_data == 0:
            logger.info(f"  ✓ charts.chart_data: All {len(charts)} records have valid JSON")
        else:
            all_valid = False
            logger.error(f"  ✗ charts.chart_data: {invalid_chart_data}/{len(charts)} records have invalid JSON")

        # Check charts.calculation_params (nullable JSON field)
        cursor.execute("SELECT id, calculation_params FROM charts WHERE calculation_params IS NOT NULL")
        calc_params = cursor.fetchall()
        invalid_calc_params = 0

        for chart_id, calc_param_json in calc_params:
            try:
                json.loads(calc_param_json)
            except json.JSONDecodeError as e:
                invalid_calc_params += 1
                self.errors.append(f"Chart {chart_id} has invalid calculation_params JSON: {e}")

        if invalid_calc_params == 0:
            logger.info(f"  ✓ charts.calculation_params: All {len(calc_params)} non-null records have valid JSON")
        else:
            all_valid = False
            logger.error(f"  ✗ charts.calculation_params: {invalid_calc_params}/{len(calc_params)} records have invalid JSON")

        # Check aspect_patterns.planets_involved
        cursor.execute("SELECT id, planets_involved FROM aspect_patterns")
        patterns = cursor.fetchall()
        invalid_patterns = 0

        for pattern_id, planets_json in patterns:
            try:
                planets = json.loads(planets_json)
                if not isinstance(planets, list):
                    invalid_patterns += 1
                    self.errors.append(f"Pattern {pattern_id} planets_involved is not a list")
            except json.JSONDecodeError as e:
                invalid_patterns += 1
                self.errors.append(f"Pattern {pattern_id} has invalid planets_involved JSON: {e}")

        if invalid_patterns == 0:
            logger.info(f"  ✓ aspect_patterns.planets_involved: All {len(patterns)} records have valid JSON")
        else:
            all_valid = False
            logger.error(f"  ✗ aspect_patterns.planets_involved: {invalid_patterns}/{len(patterns)} records have invalid JSON")

        # Check user_preferences JSON fields
        cursor.execute("SELECT aspect_orbs, displayed_points FROM user_preferences WHERE id = 1")
        result = cursor.fetchone()
        if result:
            aspect_orbs, displayed_points = result

            if aspect_orbs:
                try:
                    json.loads(aspect_orbs)
                    logger.info("  ✓ user_preferences.aspect_orbs: Valid JSON")
                except json.JSONDecodeError as e:
                    all_valid = False
                    logger.error(f"  ✗ user_preferences.aspect_orbs: Invalid JSON: {e}")
                    self.errors.append(f"user_preferences.aspect_orbs has invalid JSON: {e}")

            if displayed_points:
                try:
                    json.loads(displayed_points)
                    logger.info("  ✓ user_preferences.displayed_points: Valid JSON")
                except json.JSONDecodeError as e:
                    all_valid = False
                    logger.error(f"  ✗ user_preferences.displayed_points: Invalid JSON: {e}")
                    self.errors.append(f"user_preferences.displayed_points has invalid JSON: {e}")

        logger.info("=" * 60)
        return all_valid

    def validate_data_types(self) -> bool:
        """
        Validate data types and format conversions.

        Returns:
            True if all data types are correct, False otherwise
        """
        logger.info("\n" + "=" * 60)
        logger.info("Validating Data Types and Formats")
        logger.info("=" * 60)

        cursor = self.sqlite_conn.cursor()
        all_valid = True

        # Check UUIDs are valid format (36 characters with hyphens)
        cursor.execute("SELECT id FROM clients WHERE length(id) != 36 OR id NOT LIKE '%-%'")
        invalid_uuids = cursor.fetchall()

        if len(invalid_uuids) == 0:
            logger.info("  ✓ All UUIDs are properly formatted")
        else:
            all_valid = False
            logger.error(f"  ✗ Found {len(invalid_uuids)} invalid UUIDs in clients table")
            self.errors.append(f"Found {len(invalid_uuids)} invalid UUIDs in clients table")

        # Check date formats (should be YYYY-MM-DD)
        cursor.execute("SELECT id, birth_date FROM birth_data")
        birth_dates = cursor.fetchall()
        invalid_dates = 0

        for bd_id, birth_date in birth_dates:
            if birth_date and len(birth_date) != 10:
                invalid_dates += 1
                self.warnings.append(f"birth_data {bd_id} has unusual date format: {birth_date}")

        if invalid_dates == 0:
            logger.info(f"  ✓ All {len(birth_dates)} birth dates are properly formatted")
        else:
            logger.warning(f"  ⚠ {invalid_dates} birth dates have unusual format")

        # Check boolean conversions (should be 0 or 1)
        cursor.execute("SELECT id, time_unknown FROM birth_data WHERE time_unknown NOT IN (0, 1)")
        invalid_booleans = cursor.fetchall()

        if len(invalid_booleans) == 0:
            logger.info("  ✓ All boolean fields properly converted to 0/1")
        else:
            all_valid = False
            logger.error(f"  ✗ Found {len(invalid_booleans)} invalid boolean values")
            self.errors.append(f"Found {len(invalid_booleans)} invalid boolean values in time_unknown")

        # Check latitude/longitude ranges
        cursor.execute("SELECT id, latitude, longitude FROM birth_data WHERE latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180")
        invalid_coords = cursor.fetchall()

        if len(invalid_coords) == 0:
            logger.info("  ✓ All coordinates within valid ranges")
        else:
            all_valid = False
            logger.error(f"  ✗ Found {len(invalid_coords)} records with invalid coordinates")
            self.errors.append(f"Found {len(invalid_coords)} records with invalid coordinates")

        logger.info("=" * 60)
        return all_valid

    def validate_user_data_migration(self) -> bool:
        """
        Validate user data was properly migrated to app_config.

        Returns:
            True if user data migration is valid, False otherwise
        """
        logger.info("\n" + "=" * 60)
        logger.info("Validating User Data Migration")
        logger.info("=" * 60)

        all_valid = True

        # Get PostgreSQL user data
        pg_cursor = self.pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        pg_cursor.execute("SELECT password_hash FROM users WHERE id = %s", (self.user_id,))
        pg_user = pg_cursor.fetchone()

        if not pg_user:
            all_valid = False
            logger.error("  ✗ User not found in PostgreSQL")
            self.errors.append("User not found in PostgreSQL")
            return all_valid

        # Get SQLite app_config data
        sqlite_cursor = self.sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT password_hash FROM app_config WHERE id = 1")
        sqlite_config = sqlite_cursor.fetchone()

        if not sqlite_config:
            all_valid = False
            logger.error("  ✗ app_config record not found in SQLite")
            self.errors.append("app_config record not found in SQLite")
            return all_valid

        # Compare password hashes
        if pg_user["password_hash"] == sqlite_config[0]:
            logger.info("  ✓ Password hash migrated correctly")
        else:
            all_valid = False
            logger.error("  ✗ Password hash mismatch")
            self.errors.append("Password hash not migrated correctly")

        logger.info("=" * 60)
        return all_valid

    def generate_report(self) -> Dict[str, Any]:
        """
        Generate a comprehensive validation report.

        Returns:
            Dictionary containing validation results
        """
        report = {
            "timestamp": str(Path(MIGRATION_DATA_DIR / "manifest.json").stat().st_mtime) if (MIGRATION_DATA_DIR / "manifest.json").exists() else None,
            "user_email": self.user_email,
            "user_id": self.user_id,
            "validation_results": self.validation_results,
            "errors": self.errors,
            "warnings": self.warnings,
            "overall_status": "PASS" if len(self.errors) == 0 else "FAIL",
        }

        # Save report to JSON
        report_path = MIGRATION_DATA_DIR / "validation_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        logger.info(f"\nValidation report saved to: {report_path}")
        return report

    def validate_all(self) -> bool:
        """
        Run all validation checks.

        Returns:
            True if all validations pass, False otherwise
        """
        try:
            self.connect()
            self.user_id = self.get_user_id()

            # Run all validations
            results = []
            results.append(("Row Counts", self.validate_row_counts()))
            results.append(("Foreign Keys", self.validate_foreign_keys()))
            results.append(("JSON Fields", self.validate_json_fields()))
            results.append(("Data Types", self.validate_data_types()))
            results.append(("User Data", self.validate_user_data_migration()))

            # Print summary
            logger.info("\n" + "=" * 60)
            logger.info("VALIDATION SUMMARY")
            logger.info("=" * 60)

            all_pass = all(result[1] for result in results)

            for check_name, passed in results:
                status = "✓ PASS" if passed else "✗ FAIL"
                logger.info(f"  {check_name:20} {status}")

            logger.info("=" * 60)

            if self.errors:
                logger.error(f"\nFound {len(self.errors)} error(s):")
                for i, error in enumerate(self.errors[:10], 1):
                    logger.error(f"  {i}. {error}")
                if len(self.errors) > 10:
                    logger.error(f"  ... and {len(self.errors) - 10} more errors")

            if self.warnings:
                logger.warning(f"\nFound {len(self.warnings)} warning(s):")
                for i, warning in enumerate(self.warnings[:10], 1):
                    logger.warning(f"  {i}. {warning}")
                if len(self.warnings) > 10:
                    logger.warning(f"  ... and {len(self.warnings) - 10} more warnings")

            # Generate report
            self.generate_report()

            if all_pass:
                logger.info("\n✓ ALL VALIDATIONS PASSED")
            else:
                logger.error("\n✗ VALIDATION FAILED")

            return all_pass

        except Exception as e:
            logger.error(f"Validation failed with exception: {e}")
            raise
        finally:
            self.disconnect()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Validate PostgreSQL to SQLite migration")
    parser.add_argument(
        "--user-email",
        default=DEFAULT_USER_EMAIL,
        help=f"Email of migrated user (default: {DEFAULT_USER_EMAIL})",
    )
    parser.add_argument(
        "--postgres-url",
        default=POSTGRES_URL,
        help="PostgreSQL connection URL",
    )
    parser.add_argument(
        "--sqlite-path",
        type=Path,
        default=SQLITE_PATH,
        help=f"Path to SQLite database (default: {SQLITE_PATH})",
    )

    args = parser.parse_args()

    logger.info("Starting migration validation...")
    logger.info(f"User: {args.user_email}")
    logger.info(f"PostgreSQL: {args.postgres_url}")
    logger.info(f"SQLite: {args.sqlite_path}")

    validator = MigrationValidator(args.postgres_url, args.sqlite_path, args.user_email)

    try:
        success = validator.validate_all()
        return 0 if success else 1
    except Exception as e:
        logger.error(f"\nValidation failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
