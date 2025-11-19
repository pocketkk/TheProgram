"""
Import API endpoints for data portability

Provides RESTful endpoints for importing database data from various formats.
Supports validation, dry-run preview, and safe import with backups.
"""
import json
import logging
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import time

from fastapi import (
    APIRouter, Depends, HTTPException, Header, status,
    UploadFile, File, Form
)
from sqlalchemy.orm import Session

from app.core.auth_simple import verify_session_token, extract_token_from_header
from app.core.database_sqlite import get_db
from app.core.config import settings
from app.services.import_service import ImportService
from app.services.backup_service import BackupService
from app.schemas.backup import BackupType
from app.schemas_sqlite.data_portability import (
    ImportValidateRequest,
    ImportDryRunRequest,
    ImportExecuteRequest,
    ValidationResult,
    ValidationError,
    DryRunResult,
    ImportResult,
    ImportMode,
    ConflictResolution,
    ExportFormat,
    ErrorResponse,
)

router = APIRouter(prefix="/import", tags=["Import"])
logger = logging.getLogger(__name__)

# File upload size limit (50MB default)
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB


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

def parse_upload_file(file: UploadFile) -> Dict[str, Any]:
    """
    Parse uploaded file and extract data

    Args:
        file: Uploaded file

    Returns:
        Parsed data dictionary

    Raises:
        HTTPException 400: If file format is invalid
        HTTPException 413: If file is too large
    """
    try:
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning

        if file_size > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE / 1024 / 1024}MB"
            )

        # Read file content
        content = file.file.read()

        # Detect format from filename or content
        filename = file.filename.lower()

        if filename.endswith('.json') or filename.endswith('.json.gz'):
            # Parse JSON
            try:
                data = json.loads(content)
                return data
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON format: {str(e)}"
                )

        elif filename.endswith('.csv'):
            # For CSV, we'll need to convert to dict format
            # This is a simplified version - production would use format_converter
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV import not yet implemented via file upload. Use JSON format."
            )

        else:
            # Try to parse as JSON anyway
            try:
                data = json.loads(content)
                return data
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to parse file. Supported formats: JSON (.json)"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing upload file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File parsing error: {str(e)}"
        )


def convert_import_service_validation(validation_result) -> ValidationResult:
    """
    Convert import service validation result to API schema

    Args:
        validation_result: Service validation result

    Returns:
        API ValidationResult schema
    """
    # Extract data from service result
    is_valid = validation_result.get('valid', False)
    errors_list = validation_result.get('errors', [])
    warnings_list = validation_result.get('warnings', [])

    # Convert errors to ValidationError objects
    validation_errors = []
    for err in errors_list:
        if isinstance(err, dict):
            validation_errors.append(ValidationError(
                field=err.get('field', 'unknown'),
                error=err.get('error', 'Validation failed'),
                value=err.get('value')
            ))
        else:
            validation_errors.append(ValidationError(
                field='unknown',
                error=str(err),
                value=None
            ))

    return ValidationResult(
        valid=is_valid,
        errors=validation_errors,
        warnings=warnings_list,
        detected_format=validation_result.get('format', ExportFormat.JSON),
        tables_found=validation_result.get('tables', []),
        record_counts=validation_result.get('record_counts', {}),
        total_records=validation_result.get('total_records', 0),
    )


# ==================== Import Endpoints ====================

@router.post("/validate", response_model=ValidationResult)
async def validate_import(
    file: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Validate import data without importing

    Validates the structure and content of import data without actually importing it.
    Checks for data format, required fields, data types, and potential conflicts.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        file: Uploaded file (multipart/form-data)
        data: JSON data string (alternative to file upload)
        db: Database session

    Returns:
        ValidationResult with validation status and errors/warnings

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If neither file nor data provided, or invalid format
        HTTPException 413: If file too large
        HTTPException 422: If validation fails

    Example:
        ```
        POST /api/import/validate
        Authorization: Bearer <token>
        Content-Type: multipart/form-data

        file: <upload file>
        ```
    """
    try:
        logger.info("Validating import data")

        # Get data from file or direct input
        import_data = None

        if file:
            import_data = parse_upload_file(file)
        elif data:
            try:
                import_data = json.loads(data)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON in data parameter: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' or 'data' must be provided"
            )

        # Validate using import service
        service = ImportService(db)
        validation_result = service.validate_import_data(import_data)

        # Convert to API response format
        return convert_import_service_validation(validation_result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating import data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


@router.post("/dry-run", response_model=DryRunResult)
async def import_dry_run(
    file: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None),
    import_mode: ImportMode = Form(ImportMode.UPSERT),
    conflict_resolution: ConflictResolution = Form(ConflictResolution.SKIP),
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Preview import changes without executing

    Performs a dry-run of the import operation, showing what would be inserted,
    updated, skipped, or deleted without actually modifying the database.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        file: Uploaded file (multipart/form-data)
        data: JSON data string (alternative to file upload)
        import_mode: Import mode (insert_only, update_only, upsert, replace)
        conflict_resolution: How to handle conflicts (skip, overwrite, merge, fail)
        db: Database session

    Returns:
        DryRunResult with preview of operations

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid data or parameters
        HTTPException 422: If conflicts detected and resolution is 'fail'

    Example:
        ```
        POST /api/import/dry-run
        Authorization: Bearer <token>
        Content-Type: multipart/form-data

        file: <upload file>
        import_mode: upsert
        conflict_resolution: skip
        ```
    """
    try:
        logger.info(f"Running import dry-run (mode={import_mode.value}, resolution={conflict_resolution.value})")

        # Get data from file or direct input
        import_data = None

        if file:
            import_data = parse_upload_file(file)
        elif data:
            try:
                import_data = json.loads(data)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON in data parameter: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' or 'data' must be provided"
            )

        # Run dry-run using import service
        service = ImportService(db)
        dry_run_result = service.dry_run_import(
            import_data=import_data,
            import_mode=import_mode.value,
            conflict_resolution=conflict_resolution.value,
        )

        # Convert to API response format
        return DryRunResult(
            success=dry_run_result.get('success', True),
            will_insert=dry_run_result.get('will_insert', 0),
            will_update=dry_run_result.get('will_update', 0),
            will_skip=dry_run_result.get('will_skip', 0),
            will_delete=dry_run_result.get('will_delete', 0),
            conflicts=dry_run_result.get('conflicts', []),
            warnings=dry_run_result.get('warnings', []),
            table_operations=dry_run_result.get('table_operations', {}),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in dry-run: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dry-run failed: {str(e)}"
        )


@router.post("/execute", response_model=ImportResult)
async def execute_import(
    file: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None),
    import_mode: ImportMode = Form(ImportMode.UPSERT),
    conflict_resolution: ConflictResolution = Form(ConflictResolution.SKIP),
    validate_first: bool = Form(True),
    create_backup: bool = Form(True),
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Execute import operation

    Imports data into the database. Optionally validates data and creates a backup
    before importing. Supports various import modes and conflict resolution strategies.

    **Authentication Required:** Bearer token in Authorization header

    **⚠️ Warning:** This operation modifies the database. Use dry-run first to preview changes.

    Args:
        file: Uploaded file (multipart/form-data)
        data: JSON data string (alternative to file upload)
        import_mode: Import mode (insert_only, update_only, upsert, replace)
        conflict_resolution: How to handle conflicts (skip, overwrite, merge, fail)
        validate_first: Validate data before importing
        create_backup: Create safety backup before importing
        db: Database session

    Returns:
        ImportResult with import statistics and results

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid data or parameters
        HTTPException 409: If conflicts detected and resolution is 'fail'
        HTTPException 422: If validation fails
        HTTPException 500: If import fails

    Example:
        ```
        POST /api/import/execute
        Authorization: Bearer <token>
        Content-Type: multipart/form-data

        file: <upload file>
        import_mode: upsert
        conflict_resolution: skip
        validate_first: true
        create_backup: true
        ```
    """
    start_time = time.time()

    try:
        logger.info(f"Executing import (mode={import_mode.value}, resolution={conflict_resolution.value})")

        # Get data from file or direct input
        import_data = None

        if file:
            import_data = parse_upload_file(file)
        elif data:
            try:
                import_data = json.loads(data)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON in data parameter: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' or 'data' must be provided"
            )

        # Validate first if requested
        if validate_first:
            service = ImportService(db)
            validation_result = service.validate_import_data(import_data)

            if not validation_result.get('valid', False):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error": "ValidationError",
                        "message": "Import data validation failed",
                        "errors": validation_result.get('errors', [])
                    }
                )

        # Create backup if requested
        backup_id = None
        if create_backup:
            try:
                backup_service = BackupService(
                    database_url=settings.DATABASE_URL,
                    backup_dir=str(Path(settings.DATA_DIR) / "backups")
                )
                backup_metadata = backup_service.create_backup(
                    encrypt=True,
                    compression=True,
                    description="Safety backup before import",
                    tags=["safety", "pre-import"],
                    backup_type=BackupType.AUTO
                )
                backup_id = backup_metadata.backup_id
                logger.info(f"Safety backup created: {backup_id}")
            except Exception as e:
                logger.error(f"Failed to create safety backup: {e}")
                # Continue with import even if backup fails (log warning)
                logger.warning("Continuing import without safety backup")

        # Execute import
        service = ImportService(db)
        import_result = service.execute_import(
            import_data=import_data,
            import_mode=import_mode.value,
            conflict_resolution=conflict_resolution.value,
        )

        # Calculate duration
        duration = time.time() - start_time

        # Convert to API response format
        total_inserted = import_result.get('inserted', 0)
        total_updated = import_result.get('updated', 0)
        total_skipped = import_result.get('skipped', 0)
        total_deleted = import_result.get('deleted', 0)
        total_failed = import_result.get('failed', 0)

        success = import_result.get('success', False)
        message = f"Import completed: {total_inserted} inserted, {total_updated} updated, {total_skipped} skipped"

        if total_failed > 0:
            message += f", {total_failed} failed"

        return ImportResult(
            success=success,
            message=message,
            records_inserted=total_inserted,
            records_updated=total_updated,
            records_skipped=total_skipped,
            records_deleted=total_deleted,
            records_failed=total_failed,
            table_results=import_result.get('table_results', {}),
            errors=import_result.get('errors', []),
            warnings=import_result.get('warnings', []),
            backup_id=backup_id,
            import_timestamp=datetime.utcnow(),
            duration_seconds=round(duration, 2),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing import: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )


@router.post("/clients", response_model=ImportResult)
async def import_clients(
    file: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None),
    import_mode: ImportMode = Form(ImportMode.UPSERT),
    conflict_resolution: ConflictResolution = Form(ConflictResolution.SKIP),
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Import clients only

    Imports only client data, skipping other tables. Useful for importing client
    lists from external sources.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        file: Uploaded file (multipart/form-data) - JSON array of clients
        data: JSON data string - array of client objects
        import_mode: Import mode
        conflict_resolution: Conflict resolution strategy
        db: Database session

    Returns:
        ImportResult with import statistics

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid data
        HTTPException 500: If import fails
    """
    try:
        logger.info("Importing clients only")

        # Get data from file or direct input
        import_data = None

        if file:
            parsed = parse_upload_file(file)
            # Wrap in expected format if it's just an array
            if isinstance(parsed, list):
                import_data = {'clients': parsed}
            else:
                import_data = parsed
        elif data:
            try:
                parsed = json.loads(data)
                if isinstance(parsed, list):
                    import_data = {'clients': parsed}
                else:
                    import_data = parsed
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON in data parameter: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' or 'data' must be provided"
            )

        # Filter to only clients table
        filtered_data = {'clients': import_data.get('clients', [])}

        if not filtered_data['clients']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No client data found in import"
            )

        # Execute import
        service = ImportService(db)
        import_result = service.execute_import(
            import_data=filtered_data,
            import_mode=import_mode.value,
            conflict_resolution=conflict_resolution.value,
        )

        # Convert to API response
        return ImportResult(
            success=import_result.get('success', False),
            message=f"Imported {import_result.get('inserted', 0)} clients",
            records_inserted=import_result.get('inserted', 0),
            records_updated=import_result.get('updated', 0),
            records_skipped=import_result.get('skipped', 0),
            records_failed=import_result.get('failed', 0),
            table_results=import_result.get('table_results', {}),
            errors=import_result.get('errors', []),
            warnings=import_result.get('warnings', []),
            import_timestamp=datetime.utcnow(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing clients: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Client import failed: {str(e)}"
        )


@router.post("/charts", response_model=ImportResult)
async def import_charts(
    file: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None),
    import_mode: ImportMode = Form(ImportMode.UPSERT),
    conflict_resolution: ConflictResolution = Form(ConflictResolution.SKIP),
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Import charts only

    Imports only chart data (and related interpretations), skipping other tables.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        file: Uploaded file (multipart/form-data) - JSON with charts
        data: JSON data string - charts and related data
        import_mode: Import mode
        conflict_resolution: Conflict resolution strategy
        db: Database session

    Returns:
        ImportResult with import statistics

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid data
        HTTPException 500: If import fails
    """
    try:
        logger.info("Importing charts only")

        # Get data from file or direct input
        import_data = None

        if file:
            import_data = parse_upload_file(file)
        elif data:
            try:
                import_data = json.loads(data)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON in data parameter: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' or 'data' must be provided"
            )

        # Filter to only chart-related tables
        chart_tables = ['charts', 'chart_interpretations', 'aspect_patterns', 'transit_events']
        filtered_data = {table: import_data.get(table, []) for table in chart_tables}

        # Remove empty tables
        filtered_data = {k: v for k, v in filtered_data.items() if v}

        if not filtered_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No chart data found in import"
            )

        # Execute import
        service = ImportService(db)
        import_result = service.execute_import(
            import_data=filtered_data,
            import_mode=import_mode.value,
            conflict_resolution=conflict_resolution.value,
        )

        # Convert to API response
        total_imported = sum([
            import_result.get('inserted', 0),
            import_result.get('updated', 0)
        ])

        return ImportResult(
            success=import_result.get('success', False),
            message=f"Imported {total_imported} chart records",
            records_inserted=import_result.get('inserted', 0),
            records_updated=import_result.get('updated', 0),
            records_skipped=import_result.get('skipped', 0),
            records_failed=import_result.get('failed', 0),
            table_results=import_result.get('table_results', {}),
            errors=import_result.get('errors', []),
            warnings=import_result.get('warnings', []),
            import_timestamp=datetime.utcnow(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing charts: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chart import failed: {str(e)}"
        )
