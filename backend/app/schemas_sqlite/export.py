"""
Export schemas for data export requests and responses

Provides Pydantic schemas for validating export requests
and structuring export responses.
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator


# ==================== Request Schemas ====================

class ExportFormat(BaseModel):
    """Base export format configuration"""
    format: Literal['json', 'csv'] = Field(
        default='json',
        description="Export format: json or csv"
    )
    pretty: bool = Field(
        default=True,
        description="Pretty-print JSON (ignored for CSV)"
    )
    csv_delimiter: str = Field(
        default=',',
        description="CSV delimiter character"
    )

    @field_validator('csv_delimiter')
    @classmethod
    def validate_delimiter(cls, v):
        """Validate CSV delimiter"""
        if len(v) != 1:
            raise ValueError("CSV delimiter must be a single character")
        return v


class FullDatabaseExportRequest(ExportFormat):
    """Request schema for full database export"""
    include_tables: Optional[List[str]] = Field(
        default=None,
        description="List of tables to include (None = all default tables)"
    )
    exclude_tables: Optional[List[str]] = Field(
        default=None,
        description="List of tables to exclude"
    )
    include_metadata: bool = Field(
        default=True,
        description="Include export metadata"
    )


class ClientsExportRequest(ExportFormat):
    """Request schema for client export"""
    client_ids: List[str] = Field(
        ...,
        min_length=1,
        description="List of client UUIDs to export"
    )
    include_related: bool = Field(
        default=True,
        description="Include related birth_data, charts, etc."
    )


class ChartsExportRequest(ExportFormat):
    """Request schema for chart export"""
    chart_ids: List[str] = Field(
        ...,
        min_length=1,
        description="List of chart UUIDs to export"
    )
    include_interpretations: bool = Field(
        default=True,
        description="Include chart interpretations and patterns"
    )


class TableExportRequest(ExportFormat):
    """Request schema for table export"""
    table_name: str = Field(
        ...,
        description="Name of table to export"
    )
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Column:value filters"
    )
    limit: Optional[int] = Field(
        default=None,
        ge=1,
        le=10000,
        description="Maximum records to export"
    )
    offset: Optional[int] = Field(
        default=None,
        ge=0,
        description="Number of records to skip"
    )


# ==================== Response Schemas ====================

class ExportMetadata(BaseModel):
    """Export metadata information"""
    export_timestamp: str = Field(
        ...,
        description="ISO 8601 timestamp of export"
    )
    export_format: str = Field(
        ...,
        description="Format used for export"
    )
    total_tables: int = Field(
        ...,
        ge=0,
        description="Number of tables exported"
    )
    total_records: int = Field(
        ...,
        ge=0,
        description="Total number of records exported"
    )
    table_counts: Dict[str, int] = Field(
        default_factory=dict,
        description="Record count per table"
    )


class FullDatabaseExportResponse(BaseModel):
    """Response schema for full database export"""
    format: str = Field(
        ...,
        description="Export format used"
    )
    tables: List[str] = Field(
        ...,
        description="List of exported tables"
    )
    record_counts: Dict[str, int] = Field(
        ...,
        description="Record count per table"
    )
    metadata: Optional[ExportMetadata] = Field(
        default=None,
        description="Export metadata"
    )
    data: Any = Field(
        ...,
        description="Exported data (format-specific: JSON string or dict of CSV strings)"
    )


class ClientsExportResponse(BaseModel):
    """Response schema for clients export"""
    format: str = Field(
        ...,
        description="Export format used"
    )
    client_count: int = Field(
        ...,
        ge=0,
        description="Number of clients exported"
    )
    clients: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Exported client data"
    )
    related_data: Optional[Dict[str, List[Dict[str, Any]]]] = Field(
        default=None,
        description="Related data (birth_data, charts, etc.)"
    )
    related_counts: Optional[Dict[str, int]] = Field(
        default=None,
        description="Count of related records per table"
    )
    data: Any = Field(
        ...,
        description="Formatted export data"
    )


class ChartsExportResponse(BaseModel):
    """Response schema for charts export"""
    format: str = Field(
        ...,
        description="Export format used"
    )
    chart_count: int = Field(
        ...,
        ge=0,
        description="Number of charts exported"
    )
    charts: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Exported chart data"
    )
    interpretations: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Chart interpretations"
    )
    interpretation_count: Optional[int] = Field(
        default=None,
        ge=0,
        description="Number of interpretations"
    )
    aspect_patterns: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Aspect patterns"
    )
    transit_events: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Transit events"
    )
    data: Any = Field(
        ...,
        description="Formatted export data"
    )


class TableExportResponse(BaseModel):
    """Response schema for table export"""
    format: str = Field(
        ...,
        description="Export format used"
    )
    table: str = Field(
        ...,
        description="Table name"
    )
    record_count: int = Field(
        ...,
        ge=0,
        description="Number of records exported"
    )
    filters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Filters applied"
    )
    limit: Optional[int] = Field(
        default=None,
        description="Limit applied"
    )
    offset: Optional[int] = Field(
        default=None,
        description="Offset applied"
    )
    records: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Exported records (JSON only)"
    )
    data: Any = Field(
        ...,
        description="Formatted export data"
    )


class ExportValidationResult(BaseModel):
    """Validation result for exported data"""
    valid: bool = Field(
        ...,
        description="Whether export is valid"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Warning messages"
    )
    errors: List[str] = Field(
        default_factory=list,
        description="Error messages"
    )


# ==================== Utility Schemas ====================

class ExportSummary(BaseModel):
    """Summary of export operation"""
    total_records: int = Field(
        ...,
        ge=0,
        description="Total records exported"
    )
    tables: List[str] = Field(
        ...,
        description="Tables included in export"
    )
    format: str = Field(
        ...,
        description="Export format"
    )
    size_estimate: Optional[str] = Field(
        default=None,
        description="Estimated data size (e.g., '2.5 MB')"
    )
    timestamp: str = Field(
        ...,
        description="Export timestamp"
    )


class AvailableTablesResponse(BaseModel):
    """Response listing available tables for export"""
    tables: List[str] = Field(
        ...,
        description="List of exportable table names"
    )
    default_tables: List[str] = Field(
        ...,
        description="Tables included in default export"
    )
    table_descriptions: Dict[str, str] = Field(
        default_factory=dict,
        description="Description of each table"
    )


# Export all schemas
__all__ = [
    'ExportFormat',
    'FullDatabaseExportRequest',
    'ClientsExportRequest',
    'ChartsExportRequest',
    'TableExportRequest',
    'ExportMetadata',
    'FullDatabaseExportResponse',
    'ClientsExportResponse',
    'ChartsExportResponse',
    'TableExportResponse',
    'ExportValidationResult',
    'ExportSummary',
    'AvailableTablesResponse',
]
