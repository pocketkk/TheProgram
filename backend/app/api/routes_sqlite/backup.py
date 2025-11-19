"""
Backup API endpoints for database backup and restore

Provides RESTful endpoints for creating, listing, verifying, restoring,
and managing database backups with encryption and compression.
"""
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status, Query
from sqlalchemy.orm import Session

from app.core.auth_simple import verify_session_token, extract_token_from_header
from app.core.database_sqlite import get_db
from app.core.config import settings
from app.services.backup_service import BackupService
from app.schemas.backup import (
    BackupMetadata,
    BackupVerification,
    BackupStats,
    BackupType,
)
from app.schemas_sqlite.data_portability import (
    CreateBackupRequest,
    RestoreBackupRequest,
    RestoreResult,
    DeleteResult,
    CleanupRequest,
    CleanupResult,
    BackupStatusResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/backups", tags=["Backups"])
logger = logging.getLogger(__name__)


# ==================== Authentication Dependency ====================

async def verify_auth(authorization: str = Header(None)):
    """
    Verify authentication token from Authorization header

    Args:
        authorization: Authorization header value

    Raises:
        HTTPException 401: If not authenticated
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_valid, error_message = verify_session_token(token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message or "Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==================== Helper Functions ====================

def get_backup_service() -> BackupService:
    """
    Get configured BackupService instance

    Returns:
        BackupService instance
    """
    backup_dir = Path(settings.DATA_DIR) / "backups"
    return BackupService(
        database_url=settings.DATABASE_URL,
        backup_dir=str(backup_dir),
    )


# ==================== Backup Endpoints ====================

@router.post("/create", response_model=BackupMetadata, status_code=status.HTTP_201_CREATED)
async def create_backup(
    request: CreateBackupRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Create manual database backup

    Creates a new backup of the entire database with optional encryption,
    compression, and verification.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        request: Backup configuration
        db: Database session

    Returns:
        BackupMetadata with backup details

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If backup creation fails

    Example:
        ```
        POST /api/backups/create
        Authorization: Bearer <token>
        {
            "encrypt": true,
            "compress": true,
            "verify": true,
            "description": "Pre-deployment backup",
            "tags": ["production", "manual"]
        }
        ```
    """
    try:
        logger.info("Creating manual backup")

        backup_service = get_backup_service()
        metadata = backup_service.create_backup(
            encrypt=request.encrypt,
            compression=request.compress,
            description=request.description,
            tags=request.tags,
            backup_type=BackupType.MANUAL,
        )

        # Verify if requested
        if request.verify:
            logger.info(f"Verifying backup {metadata.backup_id}")
            verification = backup_service.verify_backup(metadata.backup_id)
            if not verification.verified:
                logger.warning(f"Backup verification failed: {verification.errors}")
                # Still return the backup but with verification status

        logger.info(f"Backup created successfully: {metadata.backup_id}")
        return metadata

    except Exception as e:
        logger.error(f"Error creating backup: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup creation failed: {str(e)}"
        )


@router.get("/list", response_model=List[BackupMetadata])
async def list_backups(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of backups to return"),
    offset: int = Query(0, ge=0, description="Number of backups to skip"),
    encrypted_only: bool = Query(False, description="Only return encrypted backups"),
    _: None = Depends(verify_auth),
):
    """
    List available backups

    Returns a paginated list of all available backups, sorted by creation date
    (newest first).

    **Authentication Required:** Bearer token in Authorization header

    Query Parameters:
        - limit: Maximum backups to return (1-100, default 50)
        - offset: Number of backups to skip (default 0)
        - encrypted_only: Filter to encrypted backups only (default false)

    Returns:
        List of BackupMetadata objects

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If listing fails

    Example:
        ```
        GET /api/backups/list?limit=20&offset=0
        Authorization: Bearer <token>
        ```
    """
    try:
        logger.info(f"Listing backups (limit={limit}, offset={offset})")

        backup_service = get_backup_service()
        all_backups = backup_service.list_backups(limit=limit + offset)

        # Apply offset
        backups = all_backups[offset:offset + limit]

        # Filter encrypted only if requested
        if encrypted_only:
            backups = [b for b in backups if b.encrypted]

        logger.info(f"Found {len(backups)} backups")
        return backups

    except Exception as e:
        logger.error(f"Error listing backups: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )


@router.get("/{backup_id}", response_model=BackupMetadata)
async def get_backup(
    backup_id: str,
    _: None = Depends(verify_auth),
):
    """
    Get backup details

    Retrieves detailed metadata for a specific backup.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        backup_id: Backup ID

    Returns:
        BackupMetadata with full backup details

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 404: If backup not found
        HTTPException 500: If retrieval fails

    Example:
        ```
        GET /api/backups/backup_20231116_143022
        Authorization: Bearer <token>
        ```
    """
    try:
        logger.info(f"Getting backup details: {backup_id}")

        backup_service = get_backup_service()
        metadata = backup_service._load_metadata(backup_id)

        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup not found: {backup_id}"
            )

        return metadata

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting backup: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup: {str(e)}"
        )


@router.post("/{backup_id}/verify", response_model=BackupVerification)
async def verify_backup(
    backup_id: str,
    _: None = Depends(verify_auth),
):
    """
    Verify backup integrity

    Verifies the integrity of a backup by checking:
    - File existence
    - Checksum validation
    - Decryption test (if encrypted)
    - Decompression test (if compressed)
    - SQLite integrity check

    **Authentication Required:** Bearer token in Authorization header

    Args:
        backup_id: Backup ID to verify

    Returns:
        BackupVerification with verification results

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 404: If backup not found
        HTTPException 500: If verification process fails

    Example:
        ```
        POST /api/backups/backup_20231116_143022/verify
        Authorization: Bearer <token>
        ```
    """
    try:
        logger.info(f"Verifying backup: {backup_id}")

        backup_service = get_backup_service()
        verification = backup_service.verify_backup(backup_id)

        if not verification.verified:
            logger.warning(f"Backup verification failed: {verification.errors}")

        return verification

    except Exception as e:
        logger.error(f"Error verifying backup: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@router.post("/{backup_id}/restore", response_model=RestoreResult)
async def restore_backup(
    backup_id: str,
    request: RestoreBackupRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Restore database from backup

    Restores the database from a backup. **This is a destructive operation**
    that will replace the current database.

    **⚠️ WARNING:** This will overwrite the current database!

    A safety backup is strongly recommended (enabled by default).

    **Authentication Required:** Bearer token in Authorization header

    Args:
        backup_id: Backup ID to restore from
        request: Restore options
        db: Database session

    Returns:
        RestoreResult with restoration details

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 404: If backup not found
        HTTPException 400: If backup is corrupted
        HTTPException 500: If restore fails

    Example:
        ```
        POST /api/backups/backup_20231116_143022/restore
        Authorization: Bearer <token>
        {
            "verify_first": true,
            "create_safety_backup": true
        }
        ```
    """
    try:
        logger.warning(f"⚠️  RESTORING DATABASE FROM BACKUP: {backup_id}")

        backup_service = get_backup_service()

        # Verify backup exists
        metadata = backup_service._load_metadata(backup_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup not found: {backup_id}"
            )

        # Perform restore
        safety_backup_id = None
        try:
            success = backup_service.restore_backup(
                backup_id=backup_id,
                verify_first=request.verify_first,
                create_safety_backup=request.create_safety_backup,
            )

            # Get safety backup ID if it was created
            if request.create_safety_backup:
                # The latest backup should be our safety backup
                backups = backup_service.list_backups(limit=1)
                if backups and backups[0].tags and 'safety' in backups[0].tags:
                    safety_backup_id = backups[0].backup_id

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Restore operation failed"
                )

            logger.info(f"Database restored successfully from {backup_id}")

            return RestoreResult(
                success=True,
                message=f"Database restored successfully from backup {backup_id}",
                backup_id=backup_id,
                safety_backup_id=safety_backup_id,
                records_restored=metadata.total_records,
                restore_timestamp=datetime.utcnow(),
            )

        except ValueError as e:
            logger.error(f"Restore validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring backup: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Restore failed: {str(e)}"
        )


@router.delete("/{backup_id}", response_model=DeleteResult)
async def delete_backup(
    backup_id: str,
    _: None = Depends(verify_auth),
):
    """
    Delete a backup

    Permanently deletes a backup file and its metadata.

    **⚠️ Warning:** This operation cannot be undone!

    **Authentication Required:** Bearer token in Authorization header

    Args:
        backup_id: Backup ID to delete

    Returns:
        DeleteResult with deletion status

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 404: If backup not found
        HTTPException 500: If deletion fails

    Example:
        ```
        DELETE /api/backups/backup_20231116_143022
        Authorization: Bearer <token>
        ```
    """
    try:
        logger.info(f"Deleting backup: {backup_id}")

        backup_service = get_backup_service()

        # Verify backup exists
        metadata = backup_service._load_metadata(backup_id)
        if not metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup not found: {backup_id}"
            )

        # Delete backup
        success = backup_service.delete_backup(backup_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete backup"
            )

        logger.info(f"Backup deleted successfully: {backup_id}")

        return DeleteResult(
            success=True,
            message=f"Backup {backup_id} deleted successfully",
            backup_id=backup_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting backup: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )


@router.post("/cleanup", response_model=CleanupResult)
async def cleanup_backups(
    request: CleanupRequest,
    _: None = Depends(verify_auth),
):
    """
    Cleanup old backups

    Deletes old backups based on retention criteria. Can delete by:
    - Keep only N most recent backups
    - Delete backups older than N days
    - Delete unverified backups
    - Delete failed backups

    **Authentication Required:** Bearer token in Authorization header

    Args:
        request: Cleanup criteria

    Returns:
        CleanupResult with cleanup statistics

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If no cleanup criteria specified
        HTTPException 500: If cleanup fails

    Example:
        ```
        POST /api/backups/cleanup
        Authorization: Bearer <token>
        {
            "keep_count": 30,
            "older_than_days": 90,
            "delete_unverified": false,
            "delete_failed": true
        }
        ```
    """
    try:
        # Validate at least one criterion is specified
        if not any([
            request.keep_count,
            request.older_than_days,
            request.delete_unverified,
            request.delete_failed
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one cleanup criterion must be specified"
            )

        logger.info(f"Cleaning up backups with criteria: {request.model_dump()}")

        backup_service = get_backup_service()
        deleted_ids = []
        freed_space = 0

        # Get all backups
        all_backups = backup_service.list_backups(limit=1000)

        # Apply filters
        backups_to_delete = []

        # Keep count filter
        if request.keep_count:
            if len(all_backups) > request.keep_count:
                backups_to_delete.extend(all_backups[request.keep_count:])

        # Older than days filter
        if request.older_than_days:
            cutoff_date = datetime.utcnow() - timedelta(days=request.older_than_days)
            for backup in all_backups:
                if backup.created_at < cutoff_date and backup not in backups_to_delete:
                    backups_to_delete.append(backup)

        # Delete unverified
        if request.delete_unverified:
            for backup in all_backups:
                if not backup.verified and backup not in backups_to_delete:
                    backups_to_delete.append(backup)

        # Delete failed
        if request.delete_failed:
            for backup in all_backups:
                if backup.status.value == "failed" and backup not in backups_to_delete:
                    backups_to_delete.append(backup)

        # Delete backups
        for backup in backups_to_delete:
            try:
                # Calculate freed space
                size = backup.compressed_size or backup.original_size
                freed_space += size

                # Delete
                backup_service.delete_backup(backup.backup_id)
                deleted_ids.append(backup.backup_id)

                logger.info(f"Deleted backup: {backup.backup_id}")
            except Exception as e:
                logger.error(f"Failed to delete backup {backup.backup_id}: {e}")

        logger.info(f"Cleanup complete: deleted {len(deleted_ids)} backups, freed {freed_space} bytes")

        return CleanupResult(
            success=True,
            message=f"Cleanup complete: {len(deleted_ids)} backups deleted",
            deleted_count=len(deleted_ids),
            freed_space=freed_space,
            deleted_backup_ids=deleted_ids,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during cleanup: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleanup failed: {str(e)}"
        )


@router.get("/status", response_model=BackupStatusResponse)
async def get_backup_status(
    _: None = Depends(verify_auth),
):
    """
    Get backup system status

    Returns overall backup system status including storage usage,
    backup counts, and last backup time.

    **Authentication Required:** Bearer token in Authorization header

    Returns:
        BackupStatusResponse with system status

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If status retrieval fails

    Example:
        ```
        GET /api/backups/status
        Authorization: Bearer <token>
        ```
    """
    try:
        logger.info("Getting backup system status")

        backup_service = get_backup_service()
        stats = backup_service.get_backup_stats()

        # Get backup directory info
        backup_dir = Path(settings.DATA_DIR) / "backups"

        return BackupStatusResponse(
            enabled=True,  # Always enabled for manual backups
            last_backup=stats.newest_backup,
            next_scheduled=None,  # Scheduled backups not implemented yet
            storage_path=str(backup_dir),
            storage_used=stats.total_size,
            backup_count=stats.total_backups,
            verified_count=stats.verified_backups,
            failed_count=stats.failed_backups,
        )

    except Exception as e:
        logger.error(f"Error getting backup status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup status: {str(e)}"
        )


@router.get("/stats", response_model=BackupStats)
async def get_backup_stats(
    _: None = Depends(verify_auth),
):
    """
    Get detailed backup statistics

    Returns detailed statistics about all backups including total size,
    compression ratios, and verification status.

    **Authentication Required:** Bearer token in Authorization header

    Returns:
        BackupStats with detailed statistics

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If statistics retrieval fails

    Example:
        ```
        GET /api/backups/stats
        Authorization: Bearer <token>
        ```
    """
    try:
        logger.info("Getting backup statistics")

        backup_service = get_backup_service()
        stats = backup_service.get_backup_stats()

        return stats

    except Exception as e:
        logger.error(f"Error getting backup stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup statistics: {str(e)}"
        )
