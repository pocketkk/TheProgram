"""
Data Portability Schemas for Export, Import, and Backup API endpoints

Provides Pydantic models for request/response validation across all
data portability operations including export, import, and backup.
"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator


# ==================== Common Enums ====================

class ExportFormat(str, Enum):
    """Export format enumeration"""
    JSON = "json"
    CSV = "csv"


class ImportMode(str, Enum):
    """Import mode enumeration"""
    INSERT_ONLY = "insert_only"  # Only insert new records
    UPDATE_ONLY = "update_only"  # Only update existing records
    UPSERT = "upsert"  # Insert new, update existing
    REPLACE = "replace"  # Delete all, then insert


class ConflictResolution(str, Enum):
    """Conflict resolution strategy"""
    SKIP = "skip"  # Skip conflicting records
    OVERWRITE = "overwrite"  # Overwrite with import data
    MERGE = "merge"  # Merge fields (import takes precedence)
    FAIL = "fail"  # Fail on any conflict


# ==================== Export Schemas ====================

class ExportFullRequest(BaseModel):
    """Request schema for full database export"""
    format: ExportFormat = Field(default=ExportFormat.JSON, description="Export format")
    include_tables: Optional[List[str]] = Field(None, description="Tables to include (None = all default tables)")
    exclude_tables: Optional[List[str]] = Field(None, description="Tables to exclude")
    include_metadata: bool = Field(default=True, description="Include export metadata")
    compress: bool = Field(default=False, description="Compress export data")
    pretty: bool = Field(default=True, description="Pretty-print JSON (ignored for CSV)")
    csv_delimiter: str = Field(default=",", description="CSV delimiter character", max_length=1)

    @field_validator('csv_delimiter')
    @classmethod
    def validate_delimiter(cls, v):
        """Validate CSV delimiter"""
        if len(v) != 1:
            raise ValueError("Delimiter must be a single character")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "format": "json",
                "include_metadata": True,
                "compress": False,
                "pretty": True
            }
        }


class ExportClientsRequest(BaseModel):
    """Request schema for exporting specific clients"""
    client_ids: List[str] = Field(..., description="List of client UUIDs to export", min_length=1)
    format: ExportFormat = Field(default=ExportFormat.JSON, description="Export format")
    include_related: bool = Field(default=True, description="Include related data (charts, notes, etc)")
    pretty: bool = Field(default=True, description="Pretty-print JSON")
    csv_delimiter: str = Field(default=",", description="CSV delimiter character", max_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "client_ids": ["550e8400-e29b-41d4-a716-446655440000"],
                "format": "json",
                "include_related": True,
                "pretty": True
            }
        }


class ExportChartsRequest(BaseModel):
    """Request schema for exporting specific charts"""
    chart_ids: List[str] = Field(..., description="List of chart UUIDs to export", min_length=1)
    format: ExportFormat = Field(default=ExportFormat.JSON, description="Export format")
    include_interpretations: bool = Field(default=True, description="Include interpretations and patterns")
    pretty: bool = Field(default=True, description="Pretty-print JSON")
    csv_delimiter: str = Field(default=",", description="CSV delimiter character", max_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "chart_ids": ["550e8400-e29b-41d4-a716-446655440001"],
                "format": "json",
                "include_interpretations": True,
                "pretty": True
            }
        }


class ExportTableRequest(BaseModel):
    """Request schema for exporting a specific table"""
    table_name: str = Field(..., description="Name of table to export")
    format: ExportFormat = Field(default=ExportFormat.JSON, description="Export format")
    filters: Optional[Dict[str, Any]] = Field(None, description="Column filters (key=column, value=filter value)")
    limit: Optional[int] = Field(None, description="Maximum records to export", ge=1, le=10000)
    offset: Optional[int] = Field(None, description="Number of records to skip", ge=0)
    pretty: bool = Field(default=True, description="Pretty-print JSON")
    csv_delimiter: str = Field(default=",", description="CSV delimiter character", max_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "table_name": "charts",
                "format": "json",
                "filters": {"chart_type": "natal"},
                "limit": 100,
                "pretty": True
            }
        }


class ExportResponse(BaseModel):
    """Response schema for export operations"""
    success: bool = Field(..., description="Whether export was successful")
    message: str = Field(..., description="Status message")
    format: ExportFormat = Field(..., description="Export format used")

    # Data can be inline JSON string or download info
    data: Optional[str] = Field(None, description="Inline export data (JSON/CSV string)")
    download_filename: Optional[str] = Field(None, description="Filename for download")

    # Metadata
    record_count: int = Field(default=0, description="Total records exported", ge=0)
    table_counts: Optional[Dict[str, int]] = Field(None, description="Record counts per table")
    export_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Export timestamp")
    compressed: bool = Field(default=False, description="Whether data is compressed")

    # File info (for downloads)
    file_size: Optional[int] = Field(None, description="File size in bytes", ge=0)
    checksum: Optional[str] = Field(None, description="SHA-256 checksum")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Export completed successfully",
                "format": "json",
                "record_count": 150,
                "table_counts": {"clients": 25, "charts": 125},
                "export_timestamp": "2023-11-16T14:30:22.000Z",
                "download_filename": "theprogram_export_20231116_143022.json"
            }
        }


# ==================== Import Schemas ====================

class ImportValidateRequest(BaseModel):
    """Request schema for validating import data"""
    # Data can be uploaded as file or provided as JSON
    # File upload handled separately via multipart/form-data
    data: Optional[Dict[str, Any]] = Field(None, description="Import data (if not file upload)")
    format: Optional[ExportFormat] = Field(None, description="Data format (auto-detected if not specified)")

    class Config:
        json_schema_extra = {
            "example": {
                "format": "json"
            }
        }


class ImportDryRunRequest(BaseModel):
    """Request schema for import dry run"""
    data: Optional[Dict[str, Any]] = Field(None, description="Import data (if not file upload)")
    format: Optional[ExportFormat] = Field(None, description="Data format")
    import_mode: ImportMode = Field(default=ImportMode.UPSERT, description="Import mode")
    conflict_resolution: ConflictResolution = Field(
        default=ConflictResolution.SKIP,
        description="How to handle conflicts"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "import_mode": "upsert",
                "conflict_resolution": "skip",
                "format": "json"
            }
        }


class ImportExecuteRequest(BaseModel):
    """Request schema for executing import"""
    data: Optional[Dict[str, Any]] = Field(None, description="Import data (if not file upload)")
    format: Optional[ExportFormat] = Field(None, description="Data format")
    import_mode: ImportMode = Field(default=ImportMode.UPSERT, description="Import mode")
    conflict_resolution: ConflictResolution = Field(
        default=ConflictResolution.SKIP,
        description="How to handle conflicts"
    )
    validate_first: bool = Field(default=True, description="Validate data before importing")
    create_backup: bool = Field(default=True, description="Create backup before importing")

    class Config:
        json_schema_extra = {
            "example": {
                "import_mode": "upsert",
                "conflict_resolution": "skip",
                "validate_first": True,
                "create_backup": True,
                "format": "json"
            }
        }


class ValidationError(BaseModel):
    """Individual validation error"""
    field: str = Field(..., description="Field path (e.g., 'clients[0].email')")
    error: str = Field(..., description="Error message")
    value: Optional[Any] = Field(None, description="Invalid value")

    class Config:
        json_schema_extra = {
            "example": {
                "field": "clients[0].email",
                "error": "Invalid email format",
                "value": "not-an-email"
            }
        }


class ValidationResult(BaseModel):
    """Response schema for import validation"""
    valid: bool = Field(..., description="Whether data is valid")
    errors: List[ValidationError] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")

    # Preview info
    detected_format: Optional[ExportFormat] = Field(None, description="Auto-detected format")
    tables_found: List[str] = Field(default_factory=list, description="Tables found in data")
    record_counts: Dict[str, int] = Field(default_factory=dict, description="Record counts per table")
    total_records: int = Field(default=0, description="Total records to import", ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "valid": True,
                "errors": [],
                "warnings": ["Some email addresses are missing"],
                "detected_format": "json",
                "tables_found": ["clients", "charts"],
                "record_counts": {"clients": 25, "charts": 100},
                "total_records": 125
            }
        }


class DryRunResult(BaseModel):
    """Response schema for import dry run"""
    success: bool = Field(..., description="Whether dry run was successful")
    will_insert: int = Field(default=0, description="Records to be inserted", ge=0)
    will_update: int = Field(default=0, description="Records to be updated", ge=0)
    will_skip: int = Field(default=0, description="Records to be skipped", ge=0)
    will_delete: int = Field(default=0, description="Records to be deleted (replace mode)", ge=0)

    conflicts: List[Dict[str, Any]] = Field(default_factory=list, description="Detected conflicts")
    warnings: List[str] = Field(default_factory=list, description="Warnings")

    # Detailed breakdown
    table_operations: Dict[str, Dict[str, int]] = Field(
        default_factory=dict,
        description="Operations per table (insert/update/skip/delete counts)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "will_insert": 50,
                "will_update": 30,
                "will_skip": 5,
                "will_delete": 0,
                "conflicts": [],
                "warnings": [],
                "table_operations": {
                    "clients": {"insert": 20, "update": 10, "skip": 2},
                    "charts": {"insert": 30, "update": 20, "skip": 3}
                }
            }
        }


class ImportResult(BaseModel):
    """Response schema for import execution"""
    success: bool = Field(..., description="Whether import was successful")
    message: str = Field(..., description="Status message")

    # Import statistics
    records_inserted: int = Field(default=0, description="Records inserted", ge=0)
    records_updated: int = Field(default=0, description="Records updated", ge=0)
    records_skipped: int = Field(default=0, description="Records skipped", ge=0)
    records_deleted: int = Field(default=0, description="Records deleted (replace mode)", ge=0)
    records_failed: int = Field(default=0, description="Records that failed to import", ge=0)

    # Detailed results
    table_results: Dict[str, Dict[str, int]] = Field(
        default_factory=dict,
        description="Results per table"
    )
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Import errors")
    warnings: List[str] = Field(default_factory=list, description="Import warnings")

    # Backup info (if created)
    backup_id: Optional[str] = Field(None, description="Backup ID (if backup was created)")

    # Timing
    import_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Import timestamp")
    duration_seconds: Optional[float] = Field(None, description="Import duration in seconds", ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Import completed successfully",
                "records_inserted": 50,
                "records_updated": 30,
                "records_skipped": 5,
                "records_deleted": 0,
                "records_failed": 0,
                "table_results": {
                    "clients": {"inserted": 20, "updated": 10, "skipped": 2},
                    "charts": {"inserted": 30, "updated": 20, "skipped": 3}
                },
                "errors": [],
                "warnings": [],
                "backup_id": "backup_20231116_143022",
                "import_timestamp": "2023-11-16T14:30:22.000Z",
                "duration_seconds": 5.2
            }
        }


# ==================== Backup Schemas ====================

class CreateBackupRequest(BaseModel):
    """Request schema for creating backup"""
    encrypt: bool = Field(default=True, description="Encrypt the backup")
    compress: bool = Field(default=True, description="Compress the backup")
    verify: bool = Field(default=True, description="Verify backup after creation")
    description: Optional[str] = Field(None, description="Optional backup description", max_length=500)
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        """Validate tags"""
        if len(v) > 10:
            raise ValueError("Maximum 10 tags allowed")
        return [tag.strip().lower() for tag in v if tag.strip()]

    class Config:
        json_schema_extra = {
            "example": {
                "encrypt": True,
                "compress": True,
                "verify": True,
                "description": "Pre-deployment backup",
                "tags": ["production", "pre-deployment"]
            }
        }


class RestoreBackupRequest(BaseModel):
    """Request schema for restoring backup"""
    verify_first: bool = Field(default=True, description="Verify backup before restoring")
    create_safety_backup: bool = Field(default=True, description="Create backup of current database before restore")

    class Config:
        json_schema_extra = {
            "example": {
                "verify_first": True,
                "create_safety_backup": True
            }
        }


class RestoreResult(BaseModel):
    """Response schema for restore operation"""
    success: bool = Field(..., description="Whether restore was successful")
    message: str = Field(..., description="Status message")
    backup_id: str = Field(..., description="Backup ID that was restored")
    safety_backup_id: Optional[str] = Field(None, description="Safety backup ID (if created)")
    records_restored: int = Field(default=0, description="Total records restored", ge=0)
    restore_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Restore timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Backup restored successfully",
                "backup_id": "backup_20231116_143022",
                "safety_backup_id": "backup_20231116_153045",
                "records_restored": 500,
                "restore_timestamp": "2023-11-16T15:30:45.000Z"
            }
        }


class DeleteResult(BaseModel):
    """Response schema for delete operation"""
    success: bool = Field(..., description="Whether deletion was successful")
    message: str = Field(..., description="Status message")
    backup_id: str = Field(..., description="Backup ID that was deleted")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Backup deleted successfully",
                "backup_id": "backup_20231116_143022"
            }
        }


class CleanupRequest(BaseModel):
    """Request schema for backup cleanup"""
    keep_count: Optional[int] = Field(None, description="Number of recent backups to keep", ge=1, le=100)
    older_than_days: Optional[int] = Field(None, description="Delete backups older than N days", ge=1, le=365)
    delete_unverified: bool = Field(default=False, description="Delete unverified backups")
    delete_failed: bool = Field(default=True, description="Delete failed backups")

    @field_validator('keep_count', 'older_than_days')
    @classmethod
    def validate_at_least_one_criteria(cls, v, info):
        """Ensure at least one cleanup criteria is specified"""
        # This will be checked in the route handler
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "keep_count": 30,
                "older_than_days": 90,
                "delete_unverified": False,
                "delete_failed": True
            }
        }


class CleanupResult(BaseModel):
    """Response schema for cleanup operation"""
    success: bool = Field(..., description="Whether cleanup was successful")
    message: str = Field(..., description="Status message")
    deleted_count: int = Field(default=0, description="Number of backups deleted", ge=0)
    freed_space: int = Field(default=0, description="Space freed in bytes", ge=0)
    deleted_backup_ids: List[str] = Field(default_factory=list, description="IDs of deleted backups")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Cleanup completed successfully",
                "deleted_count": 15,
                "freed_space": 52428800,
                "deleted_backup_ids": ["backup_20231001_120000", "backup_20231002_120000"]
            }
        }


class BackupStatusResponse(BaseModel):
    """Response schema for backup system status"""
    enabled: bool = Field(..., description="Whether backup system is enabled")
    last_backup: Optional[datetime] = Field(None, description="Last backup timestamp")
    next_scheduled: Optional[datetime] = Field(None, description="Next scheduled backup (if applicable)")
    storage_path: str = Field(..., description="Backup storage path")
    storage_used: int = Field(default=0, description="Storage used in bytes", ge=0)
    backup_count: int = Field(default=0, description="Total number of backups", ge=0)
    verified_count: int = Field(default=0, description="Number of verified backups", ge=0)
    failed_count: int = Field(default=0, description="Number of failed backups", ge=0)

    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True,
                "last_backup": "2023-11-16T02:00:00.000Z",
                "next_scheduled": "2023-11-17T02:00:00.000Z",
                "storage_path": "/app/data/backups",
                "storage_used": 104857600,
                "backup_count": 30,
                "verified_count": 28,
                "failed_count": 0
            }
        }


# ==================== Error Response Schemas ====================

class ErrorDetail(BaseModel):
    """Individual error detail"""
    field: Optional[str] = Field(None, description="Field name (if applicable)")
    error: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")

    class Config:
        json_schema_extra = {
            "example": {
                "field": "client_ids",
                "error": "Invalid UUID format",
                "code": "VALIDATION_ERROR"
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str = Field(..., description="Error type/category")
    message: str = Field(..., description="Error message")
    details: Optional[List[ErrorDetail]] = Field(None, description="Detailed error information")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "ValidationError",
                "message": "Import data validation failed",
                "details": [
                    {
                        "field": "clients[0].email",
                        "error": "Invalid email format",
                        "code": "INVALID_EMAIL"
                    }
                ],
                "timestamp": "2023-11-16T14:30:22.000Z"
            }
        }


# ==================== Progress/Status WebSocket Schemas ====================

class ProgressUpdate(BaseModel):
    """WebSocket progress update"""
    operation_id: str = Field(..., description="Operation ID")
    operation_type: str = Field(..., description="Operation type (export/import/backup)")
    progress: int = Field(..., description="Progress percentage (0-100)", ge=0, le=100)
    status: str = Field(..., description="Current status message")
    current_step: Optional[str] = Field(None, description="Current step description")
    total_steps: Optional[int] = Field(None, description="Total number of steps", ge=1)
    completed_steps: Optional[int] = Field(None, description="Completed steps", ge=0)
    eta_seconds: Optional[int] = Field(None, description="Estimated time remaining in seconds", ge=0)
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Update timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "operation_id": "op_20231116_143022",
                "operation_type": "import",
                "progress": 45,
                "status": "Importing clients...",
                "current_step": "Processing table: clients",
                "total_steps": 5,
                "completed_steps": 2,
                "eta_seconds": 30,
                "timestamp": "2023-11-16T14:30:22.000Z"
            }
        }
