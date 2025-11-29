"""
Import Schemas for The Program

Pydantic schemas for validating and processing import data.
Supports JSON and CSV import with comprehensive validation.

Author: The Program Development Team
Date: 2025-11-16
"""

from typing import Dict, List, Optional, Any, Union
from enum import Enum
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, validator


class ImportMode(str, Enum):
    """Import mode options"""
    MERGE = "merge"  # Update existing, insert new (default)
    REPLACE = "replace"  # Delete all, insert new
    SKIP = "skip"  # Skip existing, only insert new
    UPDATE = "update"  # Only update existing, skip new


class ConflictType(str, Enum):
    """Types of import conflicts"""
    DUPLICATE_ID = "duplicate_id"
    DUPLICATE_UNIQUE = "duplicate_unique"
    MISSING_FOREIGN_KEY = "missing_foreign_key"
    INVALID_DATA = "invalid_data"
    SCHEMA_MISMATCH = "schema_mismatch"


class ConflictResolution(str, Enum):
    """Conflict resolution strategies"""
    ASK_USER = "ask_user"  # Prompt user for resolution
    KEEP_EXISTING = "keep_existing"  # Skip import, keep existing
    OVERWRITE = "overwrite"  # Replace existing with import
    MERGE_FIELDS = "merge_fields"  # Merge non-conflicting fields
    RENAME = "rename"  # Generate new ID for imported record


class ImportFormat(str, Enum):
    """Supported import formats"""
    JSON = "json"
    CSV = "csv"


# ==================== Validation Results ====================


class FieldError(BaseModel):
    """Field-level validation error"""
    field: str
    value: Any
    error: str
    line_number: Optional[int] = None


class ValidationResult(BaseModel):
    """Result of data validation"""
    valid: bool = True
    errors: List[FieldError] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    record_count: int = 0
    valid_records: int = 0
    invalid_records: int = 0

    def add_error(
        self,
        field: str,
        value: Any,
        error: str,
        line_number: Optional[int] = None
    ):
        """Add a field error"""
        self.errors.append(
            FieldError(
                field=field,
                value=value,
                error=error,
                line_number=line_number
            )
        )
        self.valid = False

    def add_warning(self, warning: str):
        """Add a warning"""
        self.warnings.append(warning)


# ==================== Conflict Detection ====================


class Conflict(BaseModel):
    """Represents a data conflict during import"""
    conflict_type: ConflictType
    table_name: str
    record_id: Optional[str] = None
    field_name: Optional[str] = None
    import_value: Any = None
    existing_value: Any = None
    description: str
    line_number: Optional[int] = None
    resolution: Optional[ConflictResolution] = ConflictResolution.ASK_USER


class ConflictReport(BaseModel):
    """Report of all conflicts found"""
    total_conflicts: int = 0
    conflicts_by_type: Dict[ConflictType, int] = Field(default_factory=dict)
    conflicts: List[Conflict] = Field(default_factory=list)

    def add_conflict(self, conflict: Conflict):
        """Add a conflict to the report"""
        self.conflicts.append(conflict)
        self.total_conflicts += 1

        # Update count by type
        conflict_type = conflict.conflict_type
        if conflict_type not in self.conflicts_by_type:
            self.conflicts_by_type[conflict_type] = 0
        self.conflicts_by_type[conflict_type] += 1


# ==================== Import Results ====================


class ImportStats(BaseModel):
    """Statistics for a single table import"""
    table_name: str
    total_records: int = 0
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    errors: List[str] = Field(default_factory=list)


class ImportResult(BaseModel):
    """Result of an import operation"""
    success: bool = True
    format: ImportFormat
    mode: ImportMode
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None

    # Statistics
    total_records: int = 0
    inserted_records: int = 0
    updated_records: int = 0
    skipped_records: int = 0
    failed_records: int = 0

    # Per-table stats
    table_stats: Dict[str, ImportStats] = Field(default_factory=dict)

    # Validation and conflicts
    validation_result: Optional[ValidationResult] = None
    conflict_report: Optional[ConflictReport] = None

    # Errors
    errors: List[str] = Field(default_factory=list)

    # Backup information
    backup_path: Optional[str] = None
    rollback_available: bool = False

    def add_error(self, error: str):
        """Add an error"""
        self.errors.append(error)
        self.success = False

    def finalize(self):
        """Finalize the import result with completion time"""
        self.completed_at = datetime.utcnow()
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = delta.total_seconds()


# ==================== Dry Run Results ====================


class DryRunPreview(BaseModel):
    """Preview of what would happen in dry run"""
    table_name: str
    would_insert: int = 0
    would_update: int = 0
    would_skip: int = 0
    would_fail: int = 0
    sample_inserts: List[Dict[str, Any]] = Field(default_factory=list, max_items=5)
    sample_updates: List[Dict[str, Any]] = Field(default_factory=list, max_items=5)


class DryRunResult(BaseModel):
    """Result of a dry run import"""
    mode: ImportMode
    format: ImportFormat
    total_records: int = 0

    # Projections
    would_insert: int = 0
    would_update: int = 0
    would_skip: int = 0
    would_fail: int = 0

    # Per-table previews
    table_previews: Dict[str, DryRunPreview] = Field(default_factory=dict)

    # Validation and conflicts
    validation_result: ValidationResult
    conflict_report: ConflictReport

    # Estimated execution time
    estimated_duration_seconds: Optional[float] = None

    # Warnings
    warnings: List[str] = Field(default_factory=list)


# ==================== Import Options ====================


class ImportOptions(BaseModel):
    """Options for import operation"""
    mode: ImportMode = ImportMode.MERGE
    format: ImportFormat = ImportFormat.JSON

    # Validation options
    strict_validation: bool = True  # Fail on any validation error
    validate_foreign_keys: bool = True
    validate_unique_constraints: bool = True

    # Conflict resolution
    default_conflict_resolution: ConflictResolution = ConflictResolution.ASK_USER
    conflict_resolutions: Dict[str, ConflictResolution] = Field(default_factory=dict)

    # Transaction options
    use_transactions: bool = True
    create_backup: bool = True
    backup_path: Optional[str] = None

    # Performance options
    batch_size: int = 1000  # Commit every N records
    disable_foreign_key_checks: bool = False  # Dangerous - use with caution

    # Progress tracking
    enable_progress_tracking: bool = True
    progress_callback: Optional[Any] = None  # Callable for progress updates

    # Error handling
    continue_on_error: bool = False  # Continue importing even if some records fail
    max_errors: int = 100  # Stop after N errors

    # CSV options
    csv_delimiter: str = ','
    csv_quotechar: str = '"'
    csv_has_header: bool = True

    # Compression options
    auto_decompress: bool = True
    compression_format: Optional[str] = None  # gzip, bz2, zlib


# ==================== Import Data Schemas ====================


class ImportMetadata(BaseModel):
    """Metadata included in export files"""
    export_timestamp: Optional[str] = None
    export_format: Optional[str] = None
    total_tables: Optional[int] = None
    total_records: Optional[int] = None
    table_counts: Optional[Dict[str, int]] = None
    version: Optional[str] = None
    application: Optional[str] = None


class ImportData(BaseModel):
    """Container for import data"""
    format: str
    metadata: Optional[ImportMetadata] = None
    data: Union[str, Dict[str, Any], List[Dict[str, Any]]]

    # For multi-table imports
    tables: Optional[List[str]] = None

    @validator('format')
    def validate_format(cls, v):
        """Validate format is supported"""
        if v.lower() not in ['json', 'csv']:
            raise ValueError(f"Unsupported format: {v}")
        return v.lower()


# ==================== Schema Definitions ====================


class TableSchema(BaseModel):
    """Schema definition for a table"""
    table_name: str
    required_fields: List[str] = Field(default_factory=list)
    optional_fields: List[str] = Field(default_factory=list)
    field_types: Dict[str, str] = Field(default_factory=dict)
    unique_fields: List[str] = Field(default_factory=list)
    foreign_keys: Dict[str, str] = Field(default_factory=dict)  # field -> referenced_table

    def validate_record(self, record: Dict[str, Any]) -> List[FieldError]:
        """Validate a record against this schema"""
        errors = []

        # Check required fields
        for field in self.required_fields:
            if field not in record or record[field] is None:
                errors.append(
                    FieldError(
                        field=field,
                        value=None,
                        error=f"Required field '{field}' is missing"
                    )
                )

        # Check field types
        for field, value in record.items():
            if field in self.field_types:
                expected_type = self.field_types[field]
                # Type validation would go here
                # For now, just basic checks
                if expected_type == 'uuid' and value is not None:
                    try:
                        UUID(str(value))
                    except (ValueError, TypeError):
                        errors.append(
                            FieldError(
                                field=field,
                                value=value,
                                error=f"Invalid UUID format"
                            )
                        )
                elif expected_type == 'datetime' and value is not None:
                    if isinstance(value, str):
                        try:
                            datetime.fromisoformat(value.replace('Z', '+00:00'))
                        except (ValueError, TypeError):
                            errors.append(
                                FieldError(
                                    field=field,
                                    value=value,
                                    error=f"Invalid datetime format"
                                )
                            )

        return errors


# ==================== Progress Tracking ====================


class ProgressUpdate(BaseModel):
    """Progress update for import operations"""
    table_name: Optional[str] = None
    current_record: int = 0
    total_records: int = 0
    percent_complete: float = 0.0
    records_per_second: Optional[float] = None
    eta_seconds: Optional[float] = None
    status: str = "processing"  # processing, validating, committing, complete

    def calculate_eta(self, elapsed_seconds: float):
        """Calculate ETA based on current progress"""
        if self.current_record > 0 and self.total_records > 0:
            self.records_per_second = self.current_record / elapsed_seconds
            remaining_records = self.total_records - self.current_record
            if self.records_per_second > 0:
                self.eta_seconds = remaining_records / self.records_per_second
