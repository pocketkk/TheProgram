"""
Import Service for The Program

Provides comprehensive data import functionality for astrological data.
Supports JSON and CSV formats with validation, conflict resolution, and transactions.

Features:
- Full database import with validation
- Selective chart import
- Import modes: merge, replace, skip, update
- Conflict detection and resolution
- Dry run mode for safe preview
- Transaction management with rollback
- Safety backups before import
- Progress tracking for large datasets
- Comprehensive error handling

Author: The Program Development Team
Date: 2025-11-16
"""

import json
import logging
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Callable
from uuid import UUID
import time

from sqlalchemy import inspect
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.models_sqlite import (
    BirthData, Chart, ChartInterpretation, Interpretation,
    AspectPattern, TransitEvent, LocationCache,
    AppConfig, UserPreferences
)
from app.schemas_sqlite.import_schemas import (
    ImportMode, ImportFormat, ImportResult, ImportStats, ImportOptions,
    ValidationResult, ConflictReport, Conflict, ConflictType, ConflictResolution,
    DryRunResult, DryRunPreview, ProgressUpdate, FieldError, TableSchema
)
from app.services.format_converter import FormatConverter

logger = logging.getLogger(__name__)


class ImportService:
    """
    Service for importing astrological data from various formats

    Handles conversion of JSON and CSV data to SQLAlchemy models
    with comprehensive validation, conflict resolution, and safety features.
    """

    # Map table names to SQLAlchemy models
    TABLE_MODELS = {
        'birth_data': BirthData,
        'charts': Chart,
        'chart_interpretations': ChartInterpretation,
        'interpretations': Interpretation,
        'aspect_patterns': AspectPattern,
        'transit_events': TransitEvent,
        'location_cache': LocationCache,
        'app_config': AppConfig,
        'user_preferences': UserPreferences,
    }

    # Import order (respects foreign key dependencies)
    IMPORT_ORDER = [
        'app_config',
        'user_preferences',
        'birth_data',
        'charts',
        'chart_interpretations',
        'interpretations',
        'aspect_patterns',
        'transit_events',
        'location_cache',
    ]

    # Table schemas for validation
    TABLE_SCHEMAS = {
        'birth_data': TableSchema(
            table_name='birth_data',
            required_fields=['id'],
            optional_fields=['date_time', 'location', 'latitude', 'longitude', 'timezone'],
            field_types={'id': 'uuid', 'date_time': 'datetime'},
            unique_fields=['id'],
            foreign_keys={}
        ),
        'charts': TableSchema(
            table_name='charts',
            required_fields=['id'],
            optional_fields=['birth_data_id', 'chart_type', 'chart_data'],
            field_types={'id': 'uuid', 'birth_data_id': 'uuid'},
            unique_fields=['id'],
            foreign_keys={'birth_data_id': 'birth_data'}
        ),
        # Add more schemas as needed
    }

    def __init__(self, db: Session, backup_dir: Optional[Path] = None):
        """
        Initialize import service

        Args:
            db: SQLAlchemy database session
            backup_dir: Directory for backup files (default: temp directory)
        """
        self.db = db
        self.backup_dir = backup_dir or Path(tempfile.gettempdir()) / "theprogram_backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.format_converter = FormatConverter()

    # ==================== Main Import Methods ====================

    def import_full_database(
        self,
        data: Union[Dict, str],
        options: Optional[ImportOptions] = None,
        dry_run: bool = False
    ) -> Union[ImportResult, DryRunResult]:
        """
        Import complete database from JSON or CSV

        Args:
            data: Import data (dict for JSON, str for JSON/CSV)
            options: Import options (mode, validation, etc.)
            dry_run: If True, preview without committing

        Returns:
            ImportResult or DryRunResult

        Example:
            # Import from JSON file
            with open('export.json', 'r') as f:
                data = json.load(f)

            result = service.import_full_database(
                data=data,
                options=ImportOptions(mode=ImportMode.MERGE)
            )

            print(f"Imported {result.inserted_records} records")
        """
        logger.info(f"Starting full database import (dry_run={dry_run})")

        # Default options
        if options is None:
            options = ImportOptions()

        # Start timing
        start_time = time.time()

        try:
            # Detect and parse format
            parsed_data = self._prepare_import_data(data, options)

            # Validate data structure
            validation_result = self._validate_full_database(parsed_data, options)

            if not validation_result.valid and options.strict_validation:
                result = ImportResult(
                    success=False,
                    format=options.format,
                    mode=options.mode
                )
                result.validation_result = validation_result
                result.add_error("Validation failed")
                result.finalize()
                return result

            # Detect conflicts
            conflict_report = self._detect_conflicts_full_database(parsed_data, options)

            # Dry run mode
            if dry_run:
                return self._dry_run_full_database(
                    parsed_data, options, validation_result, conflict_report
                )

            # Create backup if requested
            backup_path = None
            if options.create_backup:
                backup_path = self._create_backup()
                logger.info(f"Created backup at: {backup_path}")

            # Initialize result
            result = ImportResult(
                format=options.format,
                mode=options.mode,
                validation_result=validation_result,
                conflict_report=conflict_report,
                backup_path=str(backup_path) if backup_path else None,
                rollback_available=options.use_transactions
            )

            # Import data
            try:
                if options.use_transactions:
                    self._import_with_transaction(parsed_data, options, result)
                else:
                    self._import_without_transaction(parsed_data, options, result)

                result.success = True
                logger.info(f"Import completed successfully")

            except Exception as e:
                logger.error(f"Import failed: {e}")
                result.add_error(f"Import failed: {str(e)}")

                # Rollback if using transactions
                if options.use_transactions:
                    try:
                        self.db.rollback()
                        logger.info("Transaction rolled back")
                    except Exception as rollback_error:
                        logger.error(f"Rollback failed: {rollback_error}")

                # Restore from backup if available
                if backup_path and options.create_backup:
                    try:
                        self._restore_backup(backup_path)
                        logger.info("Database restored from backup")
                    except Exception as restore_error:
                        logger.error(f"Backup restoration failed: {restore_error}")
                        result.add_error(f"Backup restoration failed: {str(restore_error)}")

            result.finalize()
            return result

        except Exception as e:
            logger.exception(f"Unexpected error during import: {e}")
            result = ImportResult(
                success=False,
                format=options.format,
                mode=options.mode
            )
            result.add_error(f"Unexpected error: {str(e)}")
            result.finalize()
            return result

    def import_charts(
        self,
        data: List[Dict],
        options: Optional[ImportOptions] = None,
        include_interpretations: bool = True,
        dry_run: bool = False
    ) -> Union[ImportResult, DryRunResult]:
        """
        Import specific charts with interpretations

        Args:
            data: List of chart records
            options: Import options
            include_interpretations: Import related interpretations
            dry_run: Preview without committing

        Returns:
            ImportResult or DryRunResult
        """
        logger.info(f"Importing {len(data)} charts (include_interpretations={include_interpretations})")

        if options is None:
            options = ImportOptions()

        # Build import data structure
        import_data = {'charts': data}

        if include_interpretations:
            import_data['chart_interpretations'] = []
            import_data['aspect_patterns'] = []
            import_data['transit_events'] = []

            # Extract from each chart record
            for chart_record in data:
                if 'interpretations' in chart_record:
                    import_data['chart_interpretations'].extend(
                        chart_record.pop('interpretations')
                    )
                if 'aspect_patterns' in chart_record:
                    import_data['aspect_patterns'].extend(
                        chart_record.pop('aspect_patterns')
                    )
                if 'transit_events' in chart_record:
                    import_data['transit_events'].extend(
                        chart_record.pop('transit_events')
                    )

        return self.import_full_database(import_data, options, dry_run)

    def import_table(
        self,
        table_name: str,
        data: List[Dict],
        options: Optional[ImportOptions] = None,
        dry_run: bool = False
    ) -> Union[ImportResult, DryRunResult]:
        """
        Import data into a specific table

        Args:
            table_name: Name of table to import into
            data: List of record dictionaries
            options: Import options
            dry_run: Preview without committing

        Returns:
            ImportResult or DryRunResult

        Example:
            charts = [
                {'id': 'uuid1', 'birth_data_id': 'uuid2', 'chart_type': 'natal'},
                {'id': 'uuid3', 'birth_data_id': 'uuid4', 'chart_type': 'transit'}
            ]

            result = service.import_table('charts', charts, options)
        """
        if table_name not in self.TABLE_MODELS:
            raise ValueError(f"Unknown table: {table_name}")

        logger.info(f"Importing {len(data)} records into table '{table_name}'")

        if options is None:
            options = ImportOptions()

        # Build import data with single table
        import_data = {table_name: data}

        return self.import_full_database(import_data, options, dry_run)

    # ==================== Data Preparation ====================

    def _prepare_import_data(
        self,
        data: Union[Dict, str, bytes],
        options: ImportOptions
    ) -> Dict[str, List[Dict]]:
        """
        Prepare and normalize import data

        Handles:
        - Format detection (JSON/CSV)
        - Decompression if needed
        - CSV to JSON conversion
        - Data structure normalization

        Args:
            data: Raw import data
            options: Import options

        Returns:
            Normalized data structure: {table_name: [records...]}
        """
        # Handle bytes (potentially compressed)
        if isinstance(data, bytes):
            if options.auto_decompress:
                # Detect compression format
                if data.startswith(b'\x1f\x8b'):  # gzip magic number
                    compression = 'gzip'
                elif data.startswith(b'BZ'):  # bz2 magic number
                    compression = 'bz2'
                else:
                    compression = None

                if compression:
                    logger.info(f"Detected {compression} compression, decompressing...")
                    data = self.format_converter.decompress_data(data, compression)

            # Decode to string
            data = data.decode('utf-8')

        # Handle string data
        if isinstance(data, str):
            # Detect format
            format_type = self.format_converter.detect_format(data)
            logger.info(f"Detected format: {format_type}")

            if format_type == 'json' or options.format == ImportFormat.JSON:
                data = json.loads(data)
            elif format_type == 'csv' or options.format == ImportFormat.CSV:
                # CSV needs table name - infer from columns or default to 'birth_data'
                records = self.format_converter.csv_to_json(
                    data,
                    delimiter=options.csv_delimiter,
                    quotechar=options.csv_quotechar
                )

                # Try to infer table from columns
                if records and len(records) > 0:
                    columns = set(records[0].keys())

                    chart_columns = {'chart_type', 'chart_data', 'birth_data_id'}
                    birth_data_columns = {'birth_date', 'latitude', 'longitude'}

                    if columns.intersection(chart_columns):
                        table_name = 'charts'
                    elif columns.intersection(birth_data_columns):
                        table_name = 'birth_data'
                    else:
                        # Default to birth_data for single-user mode
                        table_name = 'birth_data'
                        logger.warning(f"Could not infer table from columns {columns}, defaulting to 'birth_data'")
                else:
                    table_name = 'birth_data'

                data = {table_name: records}

        # Normalize data structure
        if isinstance(data, dict):
            # Check if it's a full export format
            if 'data' in data and isinstance(data['data'], dict):
                # Format: {'data': {table_name: [records]}, 'metadata': {...}}
                return data['data']
            elif 'data' in data and isinstance(data['data'], str):
                # Format: {'data': 'json_string', ...}
                parsed = json.loads(data['data'])
                if isinstance(parsed, dict):
                    return parsed
                else:
                    return {'data': parsed}
            else:
                # Assume it's already in correct format: {table_name: [records]}
                return data
        elif isinstance(data, list):
            # Single table data
            return {'data': data}
        else:
            raise ValueError(f"Unsupported data type: {type(data)}")

    # ==================== Validation ====================

    def _validate_full_database(
        self,
        data: Dict[str, List[Dict]],
        options: ImportOptions
    ) -> ValidationResult:
        """
        Validate entire database import

        Checks:
        - Required fields present
        - Data types correct
        - Foreign key references exist
        - Unique constraints
        - Custom validation rules

        Args:
            data: Normalized import data
            options: Import options

        Returns:
            ValidationResult with errors and warnings
        """
        result = ValidationResult()
        result.record_count = sum(len(records) for records in data.values())

        logger.info(f"Validating {result.record_count} total records across {len(data)} tables")

        # Validate each table
        for table_name, records in data.items():
            if table_name not in self.TABLE_MODELS:
                result.add_warning(f"Unknown table '{table_name}' will be skipped")
                continue

            # Get schema if available
            schema = self.TABLE_SCHEMAS.get(table_name)

            # Validate each record
            for idx, record in enumerate(records):
                line_number = idx + 1

                # Schema validation
                if schema and options.strict_validation:
                    errors = schema.validate_record(record)
                    if errors:
                        result.valid = False
                        for error in errors:
                            error.line_number = line_number
                            result.errors.append(error)
                        result.invalid_records += 1
                    else:
                        result.valid_records += 1
                else:
                    # Basic validation - check for ID field
                    if 'id' not in record:
                        result.add_error('id', None, "Missing required field 'id'", line_number)
                        result.invalid_records += 1
                    else:
                        result.valid_records += 1

                # Foreign key validation
                if options.validate_foreign_keys and schema:
                    for fk_field, ref_table in schema.foreign_keys.items():
                        if fk_field in record and record[fk_field] is not None:
                            fk_value = record[fk_field]
                            # Check if referenced record exists in import data
                            if ref_table in data:
                                ref_ids = [r.get('id') for r in data[ref_table]]
                                if fk_value not in ref_ids:
                                    # Check database
                                    if not self._record_exists(ref_table, fk_value):
                                        result.add_error(
                                            fk_field, fk_value,
                                            f"Foreign key reference to {ref_table} not found",
                                            line_number
                                        )

        logger.info(f"Validation complete: {result.valid_records} valid, "
                   f"{result.invalid_records} invalid")

        return result

    def _record_exists(self, table_name: str, record_id: Union[str, UUID]) -> bool:
        """Check if a record exists in the database"""
        if table_name not in self.TABLE_MODELS:
            return False

        model = self.TABLE_MODELS[table_name]
        try:
            exists = self.db.query(model).filter(model.id == str(record_id)).first() is not None
            return exists
        except Exception as e:
            logger.error(f"Error checking record existence: {e}")
            return False

    # ==================== Conflict Detection ====================

    def _detect_conflicts_full_database(
        self,
        data: Dict[str, List[Dict]],
        options: ImportOptions
    ) -> ConflictReport:
        """
        Detect conflicts across all tables

        Checks for:
        - Duplicate IDs
        - Duplicate unique fields
        - Missing foreign keys
        - Data type mismatches

        Args:
            data: Normalized import data
            options: Import options

        Returns:
            ConflictReport with all detected conflicts
        """
        report = ConflictReport()

        logger.info("Detecting conflicts...")

        for table_name, records in data.items():
            if table_name not in self.TABLE_MODELS:
                continue

            model = self.TABLE_MODELS[table_name]

            # Check each record for conflicts
            for idx, record in enumerate(records):
                line_number = idx + 1
                record_id = record.get('id')

                if record_id:
                    # Check for duplicate ID
                    existing = self._get_existing_record(table_name, record_id)
                    if existing:
                        conflict = Conflict(
                            conflict_type=ConflictType.DUPLICATE_ID,
                            table_name=table_name,
                            record_id=str(record_id),
                            description=f"Record with ID {record_id} already exists",
                            line_number=line_number,
                            import_value=record,
                            existing_value=existing
                        )
                        report.add_conflict(conflict)

                # Check unique constraints
                schema = self.TABLE_SCHEMAS.get(table_name)
                if schema and options.validate_unique_constraints:
                    for unique_field in schema.unique_fields:
                        if unique_field in record and unique_field != 'id':
                            value = record[unique_field]
                            if self._field_value_exists(table_name, unique_field, value):
                                conflict = Conflict(
                                    conflict_type=ConflictType.DUPLICATE_UNIQUE,
                                    table_name=table_name,
                                    field_name=unique_field,
                                    description=f"Duplicate value for unique field '{unique_field}': {value}",
                                    line_number=line_number,
                                    import_value=value
                                )
                                report.add_conflict(conflict)

        logger.info(f"Conflict detection complete: {report.total_conflicts} conflicts found")

        return report

    def _get_existing_record(self, table_name: str, record_id: Union[str, UUID]) -> Optional[Dict]:
        """Get existing record from database"""
        if table_name not in self.TABLE_MODELS:
            return None

        model = self.TABLE_MODELS[table_name]
        try:
            record = self.db.query(model).filter(model.id == str(record_id)).first()
            if record:
                return self._model_to_dict(record)
            return None
        except Exception as e:
            logger.error(f"Error fetching existing record: {e}")
            return None

    def _field_value_exists(self, table_name: str, field_name: str, value: Any) -> bool:
        """Check if a field value already exists"""
        if table_name not in self.TABLE_MODELS:
            return False

        model = self.TABLE_MODELS[table_name]
        try:
            if hasattr(model, field_name):
                exists = self.db.query(model).filter(
                    getattr(model, field_name) == value
                ).first() is not None
                return exists
            return False
        except Exception as e:
            logger.error(f"Error checking field value: {e}")
            return False

    # ==================== Dry Run ====================

    def _dry_run_full_database(
        self,
        data: Dict[str, List[Dict]],
        options: ImportOptions,
        validation_result: ValidationResult,
        conflict_report: ConflictReport
    ) -> DryRunResult:
        """
        Perform dry run to preview import effects

        Args:
            data: Normalized import data
            options: Import options
            validation_result: Validation results
            conflict_report: Conflict report

        Returns:
            DryRunResult with projections
        """
        logger.info("Performing dry run...")

        result = DryRunResult(
            mode=options.mode,
            format=options.format,
            validation_result=validation_result,
            conflict_report=conflict_report
        )

        # Analyze each table
        for table_name, records in data.items():
            if table_name not in self.TABLE_MODELS:
                continue

            preview = DryRunPreview(table_name=table_name)

            for record in records:
                record_id = record.get('id')
                if not record_id:
                    preview.would_fail += 1
                    continue

                existing = self._get_existing_record(table_name, record_id)

                if existing:
                    # Record exists
                    if options.mode == ImportMode.MERGE or options.mode == ImportMode.UPDATE:
                        preview.would_update += 1
                        if len(preview.sample_updates) < 5:
                            preview.sample_updates.append(record)
                    elif options.mode == ImportMode.SKIP:
                        preview.would_skip += 1
                    elif options.mode == ImportMode.REPLACE:
                        preview.would_update += 1
                else:
                    # New record
                    if options.mode == ImportMode.UPDATE:
                        preview.would_skip += 1
                    else:
                        preview.would_insert += 1
                        if len(preview.sample_inserts) < 5:
                            preview.sample_inserts.append(record)

            result.table_previews[table_name] = preview
            result.would_insert += preview.would_insert
            result.would_update += preview.would_update
            result.would_skip += preview.would_skip
            result.would_fail += preview.would_fail

        result.total_records = sum(len(records) for records in data.values())

        # Estimate duration (rough estimate: 1000 records per second)
        result.estimated_duration_seconds = result.total_records / 1000.0

        logger.info(f"Dry run complete: {result.would_insert} inserts, "
                   f"{result.would_update} updates, {result.would_skip} skips")

        return result

    # ==================== Transaction Import ====================

    def _import_with_transaction(
        self,
        data: Dict[str, List[Dict]],
        options: ImportOptions,
        result: ImportResult
    ):
        """
        Import data within a database transaction

        All changes are committed together or rolled back on error.

        Args:
            data: Normalized import data
            options: Import options
            result: ImportResult to update
        """
        logger.info("Starting transactional import...")

        try:
            # Import tables in dependency order
            for table_name in self.IMPORT_ORDER:
                if table_name not in data:
                    continue

                logger.info(f"Importing table: {table_name}")
                stats = self._import_table_data(table_name, data[table_name], options)
                result.table_stats[table_name] = stats

                # Update totals
                result.total_records += stats.total_records
                result.inserted_records += stats.inserted
                result.updated_records += stats.updated
                result.skipped_records += stats.skipped
                result.failed_records += stats.failed

            # Commit transaction
            self.db.commit()
            logger.info("Transaction committed successfully")

        except Exception as e:
            logger.error(f"Transaction failed: {e}")
            self.db.rollback()
            raise

    def _import_without_transaction(
        self,
        data: Dict[str, List[Dict]],
        options: ImportOptions,
        result: ImportResult
    ):
        """
        Import data without transaction (commits per batch)

        Args:
            data: Normalized import data
            options: Import options
            result: ImportResult to update
        """
        logger.info("Starting non-transactional import...")

        for table_name in self.IMPORT_ORDER:
            if table_name not in data:
                continue

            try:
                logger.info(f"Importing table: {table_name}")
                stats = self._import_table_data(table_name, data[table_name], options)
                result.table_stats[table_name] = stats

                result.total_records += stats.total_records
                result.inserted_records += stats.inserted
                result.updated_records += stats.updated
                result.skipped_records += stats.skipped
                result.failed_records += stats.failed

            except Exception as e:
                logger.error(f"Error importing table {table_name}: {e}")
                result.add_error(f"Table {table_name}: {str(e)}")

                if not options.continue_on_error:
                    raise

    def _import_table_data(
        self,
        table_name: str,
        records: List[Dict],
        options: ImportOptions
    ) -> ImportStats:
        """
        Import data into a specific table

        Args:
            table_name: Name of table
            records: List of records to import
            options: Import options

        Returns:
            ImportStats for this table
        """
        stats = ImportStats(table_name=table_name, total_records=len(records))

        if table_name not in self.TABLE_MODELS:
            stats.failed = len(records)
            stats.errors.append(f"Unknown table: {table_name}")
            return stats

        model = self.TABLE_MODELS[table_name]
        batch_count = 0

        for idx, record in enumerate(records):
            try:
                record_id = record.get('id')
                if not record_id:
                    stats.failed += 1
                    stats.errors.append(f"Record {idx}: Missing ID")
                    continue

                # Check if exists
                existing = self.db.query(model).filter(model.id == str(record_id)).first()

                if existing:
                    # Handle existing record based on mode
                    if options.mode == ImportMode.MERGE or options.mode == ImportMode.UPDATE:
                        # Update existing - only set columns that exist and are writable
                        mapper = inspect(model)
                        column_names = {col.name for col in mapper.columns}

                        for key, value in record.items():
                            # Only set actual columns (not computed properties)
                            if key in column_names and hasattr(existing, key):
                                setattr(existing, key, value)
                        stats.updated += 1
                    elif options.mode == ImportMode.SKIP:
                        # Skip existing
                        stats.skipped += 1
                        continue
                    elif options.mode == ImportMode.REPLACE:
                        # Delete and recreate - filter computed properties
                        self.db.delete(existing)
                        self.db.flush()

                        mapper = inspect(model)
                        column_names = {col.name for col in mapper.columns}
                        filtered_record = {k: v for k, v in record.items() if k in column_names}

                        new_record = model(**filtered_record)
                        self.db.add(new_record)
                        stats.updated += 1
                else:
                    # Insert new record
                    if options.mode == ImportMode.UPDATE:
                        # Skip new records in UPDATE mode
                        stats.skipped += 1
                        continue
                    else:
                        # Filter out computed properties before creating instance
                        mapper = inspect(model)
                        column_names = {col.name for col in mapper.columns}
                        filtered_record = {k: v for k, v in record.items() if k in column_names}

                        new_record = model(**filtered_record)
                        self.db.add(new_record)
                        stats.inserted += 1

                # Batch commit
                batch_count += 1
                if batch_count >= options.batch_size:
                    self.db.flush()
                    batch_count = 0

            except IntegrityError as e:
                stats.failed += 1
                stats.errors.append(f"Record {idx}: Integrity error - {str(e)}")
                self.db.rollback()

                if not options.continue_on_error:
                    raise

            except Exception as e:
                stats.failed += 1
                stats.errors.append(f"Record {idx}: {str(e)}")

                if not options.continue_on_error:
                    raise

        # Final flush for remaining records
        if batch_count > 0:
            self.db.flush()

        logger.info(f"Table {table_name}: {stats.inserted} inserted, "
                   f"{stats.updated} updated, {stats.skipped} skipped, "
                   f"{stats.failed} failed")

        return stats

    # ==================== Backup and Restore ====================

    def _create_backup(self) -> Path:
        """
        Create a backup of the current database

        Returns:
            Path to backup file (or None if backup not possible)
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"backup_{timestamp}.db"

        try:
            # Get database file path
            db_url = str(self.db.bind.url)
            if 'sqlite:///' in db_url:
                db_path = db_url.replace('sqlite:///', '')

                # Check if it's an in-memory database
                if db_path == ':memory:' or ':memory:' in db_path:
                    logger.info("In-memory database detected, skipping backup creation")
                    return None

                # Check if database file exists
                if not Path(db_path).exists():
                    logger.warning(f"Database file not found at {db_path}, skipping backup")
                    return None

                # Copy database file
                shutil.copy2(db_path, backup_path)
                logger.info(f"Created backup: {backup_path}")

                return backup_path
            else:
                logger.warning("Non-SQLite database, backup not implemented")
                return None

        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            # Don't raise - backup failure shouldn't block import
            logger.warning("Continuing import without backup")
            return None

    def _restore_backup(self, backup_path: Path):
        """
        Restore database from backup

        Args:
            backup_path: Path to backup file
        """
        try:
            db_url = str(self.db.bind.url)
            if 'sqlite:///' in db_url:
                db_path = db_url.replace('sqlite:///', '')

                # Close current session
                self.db.close()

                # Restore backup
                shutil.copy2(backup_path, db_path)
                logger.info(f"Restored backup from: {backup_path}")
            else:
                logger.warning("Non-SQLite database, restore not implemented")

        except Exception as e:
            logger.error(f"Backup restoration failed: {e}")
            raise

    # ==================== Helper Methods ====================

    def _model_to_dict(self, model_instance) -> Dict[str, Any]:
        """Convert SQLAlchemy model to dictionary"""
        if hasattr(model_instance, 'to_dict'):
            return model_instance.to_dict()
        else:
            data = {}
            mapper = inspect(model_instance.__class__)
            for column in mapper.columns:
                value = getattr(model_instance, column.name)
                # Convert special types
                if isinstance(value, UUID):
                    value = str(value)
                elif isinstance(value, datetime):
                    value = value.isoformat()
                data[column.name] = value
            return data
