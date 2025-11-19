#!/usr/bin/env python3
"""
Main migration orchestrator script.

This script coordinates the entire migration process from PostgreSQL to SQLite:
1. Export data from PostgreSQL to JSON
2. Create backup of existing SQLite database (if exists)
3. Import data into new SQLite database
4. Validate migration integrity
5. Generate migration report
"""
import argparse
import logging
import shutil
import sys
from datetime import datetime
from pathlib import Path

from config import (
    POSTGRES_URL,
    SQLITE_PATH,
    SCHEMA_PATH,
    MIGRATION_DATA_DIR,
    BACKUP_DIR,
    DEFAULT_USER_EMAIL,
    LOG_LEVEL,
    LOG_FORMAT,
)

from export_from_postgres import PostgreSQLExporter
from import_to_sqlite import SQLiteImporter
from validate_migration import MigrationValidator

# Configure logging
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)


class MigrationOrchestrator:
    """Orchestrate the complete migration process."""

    def __init__(
        self,
        postgres_url: str,
        sqlite_path: Path,
        user_email: str,
        skip_export: bool = False,
        skip_import: bool = False,
        skip_validation: bool = False,
        no_backup: bool = False,
    ):
        """
        Initialize the orchestrator.

        Args:
            postgres_url: PostgreSQL connection URL
            sqlite_path: Path to SQLite database
            user_email: Email of user to migrate
            skip_export: Skip export phase (use existing JSON files)
            skip_import: Skip import phase (only validate existing database)
            skip_validation: Skip validation phase
            no_backup: Don't create backup before migration
        """
        self.postgres_url = postgres_url
        self.sqlite_path = sqlite_path
        self.user_email = user_email
        self.skip_export = skip_export
        self.skip_import = skip_import
        self.skip_validation = skip_validation
        self.no_backup = no_backup
        self.migration_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    def create_backup(self) -> Path:
        """
        Create backup of existing SQLite database.

        Returns:
            Path to backup file
        """
        if not self.sqlite_path.exists():
            logger.info("No existing database to backup")
            return None

        backup_filename = f"theprogram_backup_{self.migration_timestamp}.db"
        backup_path = BACKUP_DIR / backup_filename

        logger.info(f"Creating backup: {backup_path}")
        shutil.copy2(self.sqlite_path, backup_path)
        logger.info(f"✓ Backup created successfully")

        return backup_path

    def export_data(self) -> bool:
        """
        Export data from PostgreSQL.

        Returns:
            True if export successful, False otherwise
        """
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 1: EXPORT FROM POSTGRESQL")
        logger.info("=" * 80)

        try:
            exporter = PostgreSQLExporter(self.postgres_url, self.user_email)
            checksums = exporter.export_all()
            logger.info(f"✓ Export completed successfully")
            return True
        except Exception as e:
            logger.error(f"✗ Export failed: {e}")
            return False

    def import_data(self) -> bool:
        """
        Import data into SQLite.

        Returns:
            True if import successful, False otherwise
        """
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 2: IMPORT TO SQLITE")
        logger.info("=" * 80)

        try:
            importer = SQLiteImporter(self.sqlite_path, SCHEMA_PATH)
            importer.import_all()
            logger.info(f"✓ Import completed successfully")
            return True
        except Exception as e:
            logger.error(f"✗ Import failed: {e}")
            return False

    def validate_data(self) -> bool:
        """
        Validate migrated data.

        Returns:
            True if validation successful, False otherwise
        """
        logger.info("\n" + "=" * 80)
        logger.info("PHASE 3: VALIDATION")
        logger.info("=" * 80)

        try:
            validator = MigrationValidator(self.postgres_url, self.sqlite_path, self.user_email)
            success = validator.validate_all()

            if success:
                logger.info(f"✓ Validation completed successfully")
            else:
                logger.error(f"✗ Validation found issues")

            return success
        except Exception as e:
            logger.error(f"✗ Validation failed: {e}")
            return False

    def run(self) -> bool:
        """
        Run the complete migration process.

        Returns:
            True if migration successful, False otherwise
        """
        logger.info("\n" + "=" * 80)
        logger.info("POSTGRESQL TO SQLITE MIGRATION")
        logger.info("=" * 80)
        logger.info(f"Timestamp: {self.migration_timestamp}")
        logger.info(f"User: {self.user_email}")
        logger.info(f"PostgreSQL: {self.postgres_url}")
        logger.info(f"SQLite: {self.sqlite_path}")
        logger.info(f"Data directory: {MIGRATION_DATA_DIR}")
        logger.info(f"Backup directory: {BACKUP_DIR}")
        logger.info("=" * 80)

        # Create backup (unless disabled or skipping import)
        backup_path = None
        if not self.no_backup and not self.skip_import:
            backup_path = self.create_backup()

        # Phase 1: Export
        if not self.skip_export:
            if not self.export_data():
                logger.error("\n✗ MIGRATION FAILED at export phase")
                return False
        else:
            logger.info("\n⊙ Skipping export phase (using existing JSON files)")

        # Phase 2: Import
        if not self.skip_import:
            if not self.import_data():
                logger.error("\n✗ MIGRATION FAILED at import phase")

                # Restore backup if import failed
                if backup_path and backup_path.exists():
                    logger.info(f"Restoring backup from: {backup_path}")
                    shutil.copy2(backup_path, self.sqlite_path)
                    logger.info("✓ Backup restored")

                return False
        else:
            logger.info("\n⊙ Skipping import phase (using existing database)")

        # Phase 3: Validation
        if not self.skip_validation:
            if not self.validate_data():
                logger.warning("\n⚠ MIGRATION COMPLETED but validation found issues")
                logger.warning("Please review the validation report before using the database")
                return False
        else:
            logger.info("\n⊙ Skipping validation phase")

        # Success!
        logger.info("\n" + "=" * 80)
        logger.info("✓ MIGRATION COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"SQLite database: {self.sqlite_path}")

        if backup_path:
            logger.info(f"Backup location: {backup_path}")

        logger.info(f"Export data: {MIGRATION_DATA_DIR}")
        logger.info("=" * 80)

        return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate data from PostgreSQL to SQLite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full migration (export + import + validate)
  python migrate.py --user-email pocketkk@gmail.com

  # Migration with custom PostgreSQL URL
  python migrate.py --postgres-url postgresql://user:pass@localhost/db

  # Re-import existing export data (skip export)
  python migrate.py --skip-export

  # Validate existing database (skip export and import)
  python migrate.py --skip-export --skip-import

  # Quick migration without validation
  python migrate.py --skip-validation

  # Migration without creating backup
  python migrate.py --no-backup
        """,
    )

    parser.add_argument(
        "--user-email",
        default=DEFAULT_USER_EMAIL,
        help=f"Email of user to migrate (default: {DEFAULT_USER_EMAIL})",
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
    parser.add_argument(
        "--skip-export",
        action="store_true",
        help="Skip export phase (use existing JSON files)",
    )
    parser.add_argument(
        "--skip-import",
        action="store_true",
        help="Skip import phase (only validate existing database)",
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Skip validation phase",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Don't create backup before migration",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging (DEBUG level)",
    )

    args = parser.parse_args()

    # Update log level if verbose
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Validate arguments
    if args.skip_import and not args.skip_export:
        logger.warning("--skip-import without --skip-export doesn't make sense (export will be unused)")

    # Create orchestrator
    orchestrator = MigrationOrchestrator(
        postgres_url=args.postgres_url,
        sqlite_path=args.sqlite_path,
        user_email=args.user_email,
        skip_export=args.skip_export,
        skip_import=args.skip_import,
        skip_validation=args.skip_validation,
        no_backup=args.no_backup,
    )

    # Run migration
    try:
        success = orchestrator.run()
        return 0 if success else 1
    except KeyboardInterrupt:
        logger.error("\n✗ Migration interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"\n✗ Migration failed with exception: {e}")
        logger.exception("Full traceback:")
        return 1


if __name__ == "__main__":
    sys.exit(main())
