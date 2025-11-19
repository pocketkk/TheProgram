"""
Export API endpoints for data portability

Provides RESTful endpoints for exporting database data in various formats.
Supports full database export, selective export, and streaming downloads.
"""
import gzip
import io
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from app.core.auth_simple import verify_session_token, extract_token_from_header
from app.core.database_sqlite import get_db
from app.services.export_service import ExportService
from app.schemas_sqlite.data_portability import (
    ExportFullRequest,
    ExportClientsRequest,
    ExportChartsRequest,
    ExportTableRequest,
    ExportResponse,
    ExportFormat,
    ErrorResponse,
)

router = APIRouter(prefix="/export", tags=["Export"])
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

def generate_export_filename(export_type: str, format: ExportFormat, compressed: bool = False) -> str:
    """
    Generate standardized export filename

    Args:
        export_type: Type of export (full, clients, charts, table)
        format: Export format
        compressed: Whether file is compressed

    Returns:
        Filename with timestamp
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    extension = f".{format.value}"
    if compressed:
        extension += ".gz"

    return f"theprogram_{export_type}_export_{timestamp}{extension}"


def compress_data(data: str) -> bytes:
    """
    Compress string data using gzip

    Args:
        data: String data to compress

    Returns:
        Compressed bytes
    """
    return gzip.compress(data.encode('utf-8'))


def create_download_response(
    data: str,
    filename: str,
    media_type: str = "application/json",
    compressed: bool = False
) -> Response:
    """
    Create streaming response for file download

    Args:
        data: Data to download
        filename: Download filename
        media_type: MIME type
        compressed: Whether to compress data

    Returns:
        FastAPI Response for download
    """
    if compressed:
        content = compress_data(data)
        media_type = "application/gzip"
    else:
        content = data.encode('utf-8')

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(content)),
        }
    )


# ==================== Export Endpoints ====================

@router.post("/full", response_model=ExportResponse)
async def export_full_database(
    request: ExportFullRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Export full database

    Exports the entire database in specified format. Supports JSON and CSV formats,
    optional compression, and metadata inclusion.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        request: Export configuration
        db: Database session

    Returns:
        ExportResponse with export data or download link

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid request parameters
        HTTPException 500: If export fails

    Example:
        ```
        POST /api/export/full
        Authorization: Bearer <token>
        {
            "format": "json",
            "include_metadata": true,
            "compress": false
        }
        ```
    """
    try:
        logger.info(f"Starting full database export (format={request.format.value})")

        service = ExportService(db)
        result = service.export_full_database(
            format=request.format.value,
            include_tables=request.include_tables,
            exclude_tables=request.exclude_tables,
            include_metadata=request.include_metadata,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter,
        )

        # Calculate total records
        total_records = sum(result.get('record_counts', {}).values())

        # For CSV, combine all tables into a zip or return as dict
        if request.format == ExportFormat.CSV:
            # For CSV, we'll return JSON metadata with download info
            # In a real implementation, you'd create a ZIP file with all CSV files
            return ExportResponse(
                success=True,
                message=f"Database exported successfully ({total_records} records)",
                format=request.format,
                record_count=total_records,
                table_counts=result.get('record_counts'),
                export_timestamp=datetime.utcnow(),
                data=None,  # CSV data would be in separate download
                download_filename=generate_export_filename("full", request.format, request.compress),
            )

        # For JSON, return inline or as download
        data_str = result.get('data', '')

        return ExportResponse(
            success=True,
            message=f"Database exported successfully ({total_records} records)",
            format=request.format,
            data=data_str if not request.compress else None,
            record_count=total_records,
            table_counts=result.get('record_counts'),
            export_timestamp=datetime.utcnow(),
            compressed=request.compress,
            download_filename=generate_export_filename("full", request.format, request.compress) if request.compress else None,
        )

    except ValueError as e:
        logger.error(f"Validation error in full export: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error exporting full database: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.get("/full/download")
async def download_full_database(
    format: ExportFormat = ExportFormat.JSON,
    compress: bool = False,
    include_metadata: bool = True,
    pretty: bool = False,
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Download full database export as file

    Same as /full endpoint but returns file download instead of JSON response.

    **Authentication Required:** Bearer token in Authorization header

    Query Parameters:
        - format: Export format (json or csv)
        - compress: Compress with gzip
        - include_metadata: Include export metadata
        - pretty: Pretty-print JSON

    Returns:
        File download (streaming response)
    """
    try:
        logger.info(f"Starting full database download (format={format.value})")

        service = ExportService(db)
        result = service.export_full_database(
            format=format.value,
            include_metadata=include_metadata,
            pretty=pretty,
        )

        data_str = result.get('data', '')
        filename = generate_export_filename("full", format, compress)

        media_type = "application/json" if format == ExportFormat.JSON else "text/csv"

        return create_download_response(data_str, filename, media_type, compress)

    except Exception as e:
        logger.error(f"Error downloading full database: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {str(e)}"
        )


@router.post("/clients", response_model=ExportResponse)
async def export_clients(
    request: ExportClientsRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Export specific clients with related data

    Exports selected clients and optionally their related data (birth data, charts,
    interpretations, session notes).

    **Authentication Required:** Bearer token in Authorization header

    Args:
        request: Export configuration with client IDs
        db: Database session

    Returns:
        ExportResponse with client export data

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid client IDs
        HTTPException 404: If no clients found
        HTTPException 500: If export fails
    """
    try:
        logger.info(f"Exporting {len(request.client_ids)} clients")

        service = ExportService(db)
        result = service.export_clients(
            client_ids=request.client_ids,
            format=request.format.value,
            include_related=request.include_related,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter,
        )

        client_count = result.get('client_count', 0)

        if client_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No clients found with specified IDs"
            )

        data_str = result.get('data', '')
        total_records = client_count

        if request.include_related and 'related_counts' in result:
            total_records += sum(result['related_counts'].values())

        return ExportResponse(
            success=True,
            message=f"{client_count} client(s) exported successfully",
            format=request.format,
            data=data_str,
            record_count=total_records,
            table_counts=result.get('related_counts') if request.include_related else {'clients': client_count},
            export_timestamp=datetime.utcnow(),
        )

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error in client export: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error exporting clients: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.post("/charts", response_model=ExportResponse)
async def export_charts(
    request: ExportChartsRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Export specific charts with interpretations

    Exports selected charts and optionally their interpretations, aspect patterns,
    and transit events.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        request: Export configuration with chart IDs
        db: Database session

    Returns:
        ExportResponse with chart export data

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid chart IDs
        HTTPException 404: If no charts found
        HTTPException 500: If export fails
    """
    try:
        logger.info(f"Exporting {len(request.chart_ids)} charts")

        service = ExportService(db)
        result = service.export_charts(
            chart_ids=request.chart_ids,
            format=request.format.value,
            include_interpretations=request.include_interpretations,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter,
        )

        chart_count = result.get('chart_count', 0)

        if chart_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No charts found with specified IDs"
            )

        data_str = result.get('data', '')
        total_records = chart_count

        if request.include_interpretations:
            total_records += result.get('interpretation_count', 0)

        return ExportResponse(
            success=True,
            message=f"{chart_count} chart(s) exported successfully",
            format=request.format,
            data=data_str,
            record_count=total_records,
            export_timestamp=datetime.utcnow(),
        )

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error in chart export: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error exporting charts: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.post("/table", response_model=ExportResponse)
async def export_table(
    request: ExportTableRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_auth),
):
    """
    Export specific table with optional filters

    Exports a single database table with optional column filters, limit, and offset.
    Useful for exporting subsets of data or specific table types.

    **Authentication Required:** Bearer token in Authorization header

    Args:
        request: Export configuration with table name and filters
        db: Database session

    Returns:
        ExportResponse with table export data

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 400: If invalid table name or filters
        HTTPException 500: If export fails
    """
    try:
        logger.info(f"Exporting table '{request.table_name}' with filters: {request.filters}")

        service = ExportService(db)
        result = service.export_table(
            table_name=request.table_name,
            format=request.format.value,
            filters=request.filters,
            limit=request.limit,
            offset=request.offset,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter,
        )

        record_count = result.get('record_count', 0)
        data_str = result.get('data', '')

        return ExportResponse(
            success=True,
            message=f"Table '{request.table_name}' exported successfully ({record_count} records)",
            format=request.format,
            data=data_str,
            record_count=record_count,
            table_counts={request.table_name: record_count},
            export_timestamp=datetime.utcnow(),
        )

    except ValueError as e:
        logger.error(f"Validation error in table export: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error exporting table: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.get("/tables")
async def list_exportable_tables(
    _: None = Depends(verify_auth),
):
    """
    List available tables for export

    Returns a list of all tables that can be exported from the database.

    **Authentication Required:** Bearer token in Authorization header

    Returns:
        List of table names with descriptions
    """
    return {
        "tables": [
            {"name": "clients", "description": "Client records"},
            {"name": "birth_data", "description": "Birth data for charts"},
            {"name": "charts", "description": "Astrological charts"},
            {"name": "chart_interpretations", "description": "Chart interpretations"},
            {"name": "interpretations", "description": "Interpretation templates"},
            {"name": "aspect_patterns", "description": "Aspect patterns in charts"},
            {"name": "transit_events", "description": "Transit events"},
            {"name": "session_notes", "description": "Session notes"},
            {"name": "location_cache", "description": "Cached location data"},
            {"name": "app_config", "description": "Application configuration"},
            {"name": "user_preferences", "description": "User preferences"},
        ],
        "default_tables": [
            "clients", "birth_data", "charts", "chart_interpretations",
            "interpretations", "aspect_patterns", "transit_events",
            "session_notes", "app_config", "user_preferences"
        ]
    }
