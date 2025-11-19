"""
Backup schemas for database backup and restore operations
Provides Pydantic models for backup metadata and operations
"""
from datetime import datetime
from enum import Enum
from typing import Dict, Optional
from pydantic import BaseModel, Field, field_validator


class BackupStatus(str, Enum):
    """Backup status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFIED = "verified"
    CORRUPTED = "corrupted"


class BackupType(str, Enum):
    """Backup type enumeration"""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    AUTO = "auto"


class BackupMetadata(BaseModel):
    """Backup metadata schema"""
    backup_id: str = Field(..., description="Unique backup identifier")
    filename: str = Field(..., description="Backup filename")
    created_at: datetime = Field(..., description="Backup creation timestamp")
    backup_type: BackupType = Field(default=BackupType.MANUAL, description="Type of backup")
    status: BackupStatus = Field(default=BackupStatus.PENDING, description="Backup status")

    # File information
    original_size: int = Field(..., description="Original database size in bytes", ge=0)
    compressed_size: Optional[int] = Field(None, description="Compressed size in bytes (if compressed)", ge=0)
    encrypted: bool = Field(default=False, description="Whether backup is encrypted")
    compressed: bool = Field(default=False, description="Whether backup is compressed")

    # Integrity
    checksum: str = Field(..., description="SHA-256 checksum of backup file")
    checksum_algorithm: str = Field(default="sha256", description="Checksum algorithm used")

    # Database information
    schema_version: Optional[str] = Field(None, description="Database schema version (Alembic revision)")
    table_counts: Dict[str, int] = Field(default_factory=dict, description="Record count per table")
    total_records: int = Field(default=0, description="Total records across all tables", ge=0)

    # Additional metadata
    description: Optional[str] = Field(None, description="Optional backup description")
    tags: list[str] = Field(default_factory=list, description="Tags for categorization")

    # Verification
    verified: bool = Field(default=False, description="Whether backup has been verified")
    verification_date: Optional[datetime] = Field(None, description="Last verification timestamp")
    verification_errors: list[str] = Field(default_factory=list, description="Verification errors if any")

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "backup_id": "backup_20231116_143022",
                "filename": "backup_20231116_143022.db.gz.enc",
                "created_at": "2023-11-16T14:30:22.000Z",
                "backup_type": "manual",
                "status": "completed",
                "original_size": 1048576,
                "compressed_size": 524288,
                "encrypted": True,
                "compressed": True,
                "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "checksum_algorithm": "sha256",
                "schema_version": "93d218e8012f",
                "table_counts": {"users": 10, "clients": 25, "birth_data": 50},
                "total_records": 85,
                "description": "Pre-deployment backup",
                "tags": ["production", "pre-deployment"],
                "verified": True,
                "verification_date": "2023-11-16T14:35:00.000Z",
                "verification_errors": []
            }
        }


class BackupCreate(BaseModel):
    """Schema for creating a new backup"""
    encrypt: bool = Field(default=True, description="Encrypt the backup")
    compress: bool = Field(default=True, description="Compress the backup")
    description: Optional[str] = Field(None, description="Optional backup description", max_length=500)
    tags: list[str] = Field(default_factory=list, description="Tags for categorization", max_length=10)
    backup_type: BackupType = Field(default=BackupType.MANUAL, description="Type of backup")

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        """Validate tags"""
        if len(v) > 10:
            raise ValueError("Maximum 10 tags allowed")
        return [tag.strip().lower() for tag in v if tag.strip()]

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "encrypt": True,
                "compress": True,
                "description": "Weekly backup before system update",
                "tags": ["weekly", "pre-update"],
                "backup_type": "manual"
            }
        }


class BackupRestore(BaseModel):
    """Schema for restoring from a backup"""
    backup_id: str = Field(..., description="Backup ID to restore from")
    verify_first: bool = Field(default=True, description="Verify backup integrity before restore")
    create_safety_backup: bool = Field(default=True, description="Create backup of current database before restore")

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "backup_id": "backup_20231116_143022",
                "verify_first": True,
                "create_safety_backup": True
            }
        }


class BackupList(BaseModel):
    """Schema for listing backups"""
    backups: list[BackupMetadata] = Field(..., description="List of backups")
    total: int = Field(..., description="Total number of backups", ge=0)

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "backups": [],
                "total": 0
            }
        }


class BackupVerification(BaseModel):
    """Schema for backup verification results"""
    backup_id: str = Field(..., description="Backup ID")
    verified: bool = Field(..., description="Whether backup passed verification")
    verification_date: datetime = Field(..., description="Verification timestamp")
    errors: list[str] = Field(default_factory=list, description="Verification errors")
    checks_performed: list[str] = Field(default_factory=list, description="Verification checks performed")

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "backup_id": "backup_20231116_143022",
                "verified": True,
                "verification_date": "2023-11-16T14:35:00.000Z",
                "errors": [],
                "checks_performed": [
                    "checksum_validation",
                    "encryption_test",
                    "decompression_test",
                    "sqlite_integrity_check",
                    "table_count_validation"
                ]
            }
        }


class BackupConfig(BaseModel):
    """Schema for backup configuration"""
    enabled: bool = Field(default=True, description="Enable automatic backups")
    schedule: str = Field(default="0 2 * * *", description="Backup schedule (cron expression)")
    retention_days: int = Field(default=30, description="Days to retain backups", ge=1, le=365)
    encryption_enabled: bool = Field(default=True, description="Enable backup encryption")
    compression_enabled: bool = Field(default=True, description="Enable backup compression")
    max_backups: int = Field(default=30, description="Maximum number of backups to keep", ge=1, le=100)
    backup_path: str = Field(default="./data/backups", description="Backup storage path")
    verify_after_create: bool = Field(default=True, description="Verify backups after creation")

    @field_validator('schedule')
    @classmethod
    def validate_schedule(cls, v):
        """Validate cron expression"""
        # Basic validation - could be more comprehensive
        parts = v.strip().split()
        if len(parts) != 5:
            raise ValueError("Invalid cron expression. Expected format: 'minute hour day month weekday'")
        return v

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "enabled": True,
                "schedule": "0 2 * * *",
                "retention_days": 30,
                "encryption_enabled": True,
                "compression_enabled": True,
                "max_backups": 30,
                "backup_path": "./data/backups",
                "verify_after_create": True
            }
        }


class BackupStats(BaseModel):
    """Schema for backup statistics"""
    total_backups: int = Field(..., description="Total number of backups", ge=0)
    total_size: int = Field(..., description="Total size of all backups in bytes", ge=0)
    oldest_backup: Optional[datetime] = Field(None, description="Oldest backup timestamp")
    newest_backup: Optional[datetime] = Field(None, description="Newest backup timestamp")
    verified_backups: int = Field(default=0, description="Number of verified backups", ge=0)
    failed_backups: int = Field(default=0, description="Number of failed backups", ge=0)
    average_size: int = Field(default=0, description="Average backup size in bytes", ge=0)
    compression_ratio: Optional[float] = Field(None, description="Average compression ratio", ge=0)

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "total_backups": 30,
                "total_size": 15728640,
                "oldest_backup": "2023-10-16T14:30:22.000Z",
                "newest_backup": "2023-11-16T14:30:22.000Z",
                "verified_backups": 28,
                "failed_backups": 0,
                "average_size": 524288,
                "compression_ratio": 0.5
            }
        }
