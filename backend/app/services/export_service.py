"""
Export Service for The Program

Provides comprehensive data export functionality for astrological data.
Supports JSON and CSV formats with various export options.

Features:
- Full database export
- Selective chart export
- Individual table export with filters
- Streaming for large datasets
- Metadata and validation
- Proper type handling (UUID, datetime, JSON)
"""
import csv
import json
import logging
from datetime import datetime
from io import StringIO
from typing import Dict, List, Optional, Any, Generator, Union
from uuid import UUID

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.models_sqlite import (
    BirthData, Chart, ChartInterpretation, Interpretation,
    AspectPattern, TransitEvent, LocationCache,
    AppConfig, UserPreferences
)

logger = logging.getLogger(__name__)


class ExportService:
    """
    Service for exporting astrological data in various formats

    Handles conversion of SQLAlchemy models to JSON and CSV formats
    with proper type handling and relationship management.
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

    # Tables that should be exported by default
    DEFAULT_EXPORT_TABLES = [
        'birth_data', 'charts', 'chart_interpretations',
        'interpretations', 'aspect_patterns', 'transit_events',
        'app_config', 'user_preferences'
    ]

    # Tables with relationships (for cascade export)
    RELATIONSHIP_MAP = {
        'birth_data': ['charts'],
        'charts': ['chart_interpretations', 'aspect_patterns', 'transit_events'],
    }

    def __init__(self, db: Session):
        """
        Initialize export service

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    # ==================== Full Database Export ====================

    def export_full_database(
        self,
        format: str = 'json',
        include_tables: Optional[List[str]] = None,
        exclude_tables: Optional[List[str]] = None,
        include_metadata: bool = True,
        pretty: bool = True,
        csv_delimiter: str = ',',
    ) -> Dict[str, Any]:
        """
        Export entire database to specified format

        Args:
            format: Export format ('json' or 'csv')
            include_tables: List of tables to include (None = all default tables)
            exclude_tables: List of tables to exclude from export
            include_metadata: Include export metadata (timestamp, counts)
            pretty: Pretty-print JSON (ignored for CSV)
            csv_delimiter: Delimiter for CSV format

        Returns:
            Dictionary containing:
                - format: Export format used
                - metadata: Export metadata (if included)
                - data: Exported data (format-specific)
                - tables: List of exported table names
                - record_counts: Count of records per table

        Example:
            result = service.export_full_database(format='json', pretty=True)
            json_data = result['data']
            print(f"Exported {result['metadata']['total_records']} records")
        """
        logger.info(f"Starting full database export in {format} format")

        # Determine which tables to export
        tables_to_export = self._get_export_tables(include_tables, exclude_tables)

        # Export each table
        all_data = {}
        record_counts = {}

        for table_name in tables_to_export:
            try:
                logger.debug(f"Exporting table: {table_name}")
                records = self._export_table_raw(table_name)
                all_data[table_name] = records
                record_counts[table_name] = len(records)
            except Exception as e:
                logger.error(f"Error exporting table {table_name}: {e}")
                all_data[table_name] = []
                record_counts[table_name] = 0

        # Build result
        result = {
            'format': format,
            'tables': tables_to_export,
            'record_counts': record_counts,
        }

        # Add metadata if requested
        if include_metadata:
            result['metadata'] = {
                'export_timestamp': datetime.utcnow().isoformat(),
                'export_format': format,
                'total_tables': len(tables_to_export),
                'total_records': sum(record_counts.values()),
                'table_counts': record_counts,
            }

        # Convert to requested format
        if format == 'json':
            result['data'] = self._to_json(all_data, pretty=pretty)
        elif format == 'csv':
            # CSV returns dict of table_name -> CSV string
            csv_data = {}
            for table_name, records in all_data.items():
                csv_data[table_name] = self._to_csv(records, table_name, delimiter=csv_delimiter)
            result['data'] = csv_data
        else:
            raise ValueError(f"Unsupported export format: {format}")

        logger.info(f"Database export complete: {sum(record_counts.values())} total records")
        return result

    # ==================== Selective Export ====================

    def export_charts(
        self,
        chart_ids: List[str],
        format: str = 'json',
        include_interpretations: bool = True,
        pretty: bool = True,
        csv_delimiter: str = ',',
    ) -> Dict[str, Any]:
        """
        Export specific charts with interpretations

        Args:
            chart_ids: List of chart UUIDs to export
            format: Export format ('json' or 'csv')
            include_interpretations: Include chart interpretations
            pretty: Pretty-print JSON
            csv_delimiter: CSV delimiter

        Returns:
            Export result dictionary
        """
        logger.info(f"Exporting {len(chart_ids)} charts")

        # Fetch charts
        charts = self.db.query(Chart).filter(Chart.id.in_(chart_ids)).all()

        if len(charts) != len(chart_ids):
            found_ids = {c.id for c in charts}
            missing_ids = set(chart_ids) - found_ids
            logger.warning(f"Some chart IDs not found: {missing_ids}")

        chart_data = [self._model_to_dict(chart) for chart in charts]

        result = {
            'format': format,
            'charts': chart_data,
            'chart_count': len(chart_data),
        }

        if include_interpretations:
            interpretations = self.db.query(ChartInterpretation).filter(
                ChartInterpretation.chart_id.in_(chart_ids)
            ).all()
            result['interpretations'] = [self._model_to_dict(i) for i in interpretations]
            result['interpretation_count'] = len(result['interpretations'])

            # Get aspect patterns
            patterns = self.db.query(AspectPattern).filter(
                AspectPattern.chart_id.in_(chart_ids)
            ).all()
            result['aspect_patterns'] = [self._model_to_dict(p) for p in patterns]

            # Get transit events
            transits = self.db.query(TransitEvent).filter(
                TransitEvent.chart_id.in_(chart_ids)
            ).all()
            result['transit_events'] = [self._model_to_dict(t) for t in transits]

        # Convert to format
        if format == 'json':
            result['data'] = self._to_json(result, pretty=pretty)
        elif format == 'csv':
            csv_data = {}
            csv_data['charts'] = self._to_csv(chart_data, 'charts', delimiter=csv_delimiter)
            if include_interpretations:
                if 'interpretations' in result:
                    csv_data['chart_interpretations'] = self._to_csv(
                        result['interpretations'], 'chart_interpretations',
                        delimiter=csv_delimiter
                    )
                if 'aspect_patterns' in result:
                    csv_data['aspect_patterns'] = self._to_csv(
                        result['aspect_patterns'], 'aspect_patterns',
                        delimiter=csv_delimiter
                    )
                if 'transit_events' in result:
                    csv_data['transit_events'] = self._to_csv(
                        result['transit_events'], 'transit_events',
                        delimiter=csv_delimiter
                    )
            result['data'] = csv_data

        return result

    def export_table(
        self,
        table_name: str,
        format: str = 'json',
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        pretty: bool = True,
        csv_delimiter: str = ',',
    ) -> Dict[str, Any]:
        """
        Export specific table with optional filters

        Args:
            table_name: Name of table to export
            format: Export format ('json' or 'csv')
            filters: Dictionary of column:value filters
            limit: Maximum records to export
            offset: Number of records to skip
            pretty: Pretty-print JSON
            csv_delimiter: CSV delimiter

        Returns:
            Export result dictionary

        Example:
            # Export recent charts
            result = service.export_table(
                'charts',
                filters={'chart_type': 'natal'},
                limit=100
            )
        """
        if table_name not in self.TABLE_MODELS:
            raise ValueError(f"Unknown table: {table_name}")

        logger.info(f"Exporting table '{table_name}' with filters: {filters}")

        model = self.TABLE_MODELS[table_name]
        query = self.db.query(model)

        # Apply filters
        if filters:
            for column, value in filters.items():
                if hasattr(model, column):
                    query = query.filter(getattr(model, column) == value)

        # Apply limit/offset
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)

        # Fetch records
        records = query.all()
        record_data = [self._model_to_dict(record) for record in records]

        result = {
            'format': format,
            'table': table_name,
            'record_count': len(record_data),
            'filters': filters or {},
            'limit': limit,
            'offset': offset,
        }

        # Convert to format
        if format == 'json':
            result['records'] = record_data
            result['data'] = self._to_json(result, pretty=pretty)
        elif format == 'csv':
            result['data'] = self._to_csv(record_data, table_name, delimiter=csv_delimiter)

        return result

    # ==================== Format Conversion ====================

    def _to_json(self, data: Any, pretty: bool = True) -> str:
        """
        Convert data to JSON string with proper type handling

        Args:
            data: Data to serialize
            pretty: Use indentation for readability

        Returns:
            JSON string
        """
        def json_serializer(obj):
            """Custom JSON serializer for special types"""
            if isinstance(obj, (datetime,)):
                return obj.isoformat()
            if isinstance(obj, UUID):
                return str(obj)
            # Handle any other non-serializable types
            return str(obj)

        if pretty:
            return json.dumps(data, indent=2, default=json_serializer, ensure_ascii=False)
        else:
            return json.dumps(data, default=json_serializer, ensure_ascii=False)

    def _to_csv(
        self,
        data: List[Dict[str, Any]],
        table_name: str,
        delimiter: str = ','
    ) -> str:
        """
        Convert list of dictionaries to CSV string

        Args:
            data: List of record dictionaries
            table_name: Name of table (for logging)
            delimiter: CSV delimiter character

        Returns:
            CSV string with header row
        """
        if not data:
            return ""

        output = StringIO()

        # Get all unique field names
        fieldnames = list(data[0].keys())

        writer = csv.DictWriter(
            output,
            fieldnames=fieldnames,
            delimiter=delimiter,
            quoting=csv.QUOTE_MINIMAL,
            extrasaction='ignore'
        )

        writer.writeheader()

        # Write rows with proper serialization
        for record in data:
            row = {}
            for key, value in record.items():
                # Serialize complex types
                if isinstance(value, (dict, list)):
                    row[key] = json.dumps(value)
                elif isinstance(value, (datetime,)):
                    row[key] = value.isoformat()
                elif isinstance(value, UUID):
                    row[key] = str(value)
                elif value is None:
                    row[key] = ''
                else:
                    row[key] = value
            writer.writerow(row)

        return output.getvalue()

    # ==================== Helper Methods ====================

    def _get_export_tables(
        self,
        include_tables: Optional[List[str]] = None,
        exclude_tables: Optional[List[str]] = None
    ) -> List[str]:
        """
        Determine which tables to export

        Args:
            include_tables: Explicit list of tables (None = use defaults)
            exclude_tables: Tables to exclude

        Returns:
            List of table names to export
        """
        if include_tables:
            tables = include_tables
        else:
            tables = self.DEFAULT_EXPORT_TABLES.copy()

        if exclude_tables:
            tables = [t for t in tables if t not in exclude_tables]

        # Validate all tables exist
        invalid_tables = [t for t in tables if t not in self.TABLE_MODELS]
        if invalid_tables:
            raise ValueError(f"Invalid table names: {invalid_tables}")

        return tables

    def _export_table_raw(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Export all records from a table as list of dicts

        Args:
            table_name: Name of table to export

        Returns:
            List of record dictionaries
        """
        model = self.TABLE_MODELS[table_name]
        records = self.db.query(model).all()
        return [self._model_to_dict(record) for record in records]

    def _model_to_dict(self, model_instance) -> Dict[str, Any]:
        """
        Convert SQLAlchemy model instance to dictionary

        Handles special types (UUID, datetime, JSON fields) properly.
        Uses the model's to_dict() method if available, otherwise
        inspects columns directly.

        Args:
            model_instance: SQLAlchemy model instance

        Returns:
            Dictionary representation
        """
        # Use model's to_dict if available
        if hasattr(model_instance, 'to_dict'):
            data = model_instance.to_dict()
        else:
            # Manual conversion
            data = {}
            mapper = inspect(model_instance.__class__)
            for column in mapper.columns:
                value = getattr(model_instance, column.name)
                data[column.name] = value

        # Ensure proper types (in case to_dict doesn't handle them)
        # The actual serialization happens in _to_json or _to_csv
        return data

    def validate_export(self, export_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate export result for integrity

        Args:
            export_result: Export result dictionary

        Returns:
            Validation result with any warnings/errors
        """
        validation = {
            'valid': True,
            'warnings': [],
            'errors': [],
        }

        # Check record counts
        if 'record_counts' in export_result:
            for table, count in export_result['record_counts'].items():
                if count == 0:
                    validation['warnings'].append(f"Table '{table}' has 0 records")

        # Check data exists
        if 'data' not in export_result:
            validation['errors'].append("Export result missing 'data' field")
            validation['valid'] = False

        return validation

    # ==================== Streaming Export (for large datasets) ====================

    def stream_table_export(
        self,
        table_name: str,
        format: str = 'json',
        chunk_size: int = 1000,
    ) -> Generator[str, None, None]:
        """
        Stream table export in chunks for large datasets

        Yields chunks of data to avoid loading entire table into memory.

        Args:
            table_name: Table to export
            format: Export format ('json' or 'csv')
            chunk_size: Number of records per chunk

        Yields:
            Chunks of formatted data (JSON array elements or CSV rows)

        Example:
            for chunk in service.stream_table_export('charts', chunk_size=100):
                file.write(chunk)
        """
        if table_name not in self.TABLE_MODELS:
            raise ValueError(f"Unknown table: {table_name}")

        model = self.TABLE_MODELS[table_name]

        if format == 'json':
            # Yield opening bracket
            yield '[\n'

            # Stream records
            offset = 0
            first_chunk = True

            while True:
                records = self.db.query(model).limit(chunk_size).offset(offset).all()
                if not records:
                    break

                record_dicts = [self._model_to_dict(r) for r in records]

                for i, record in enumerate(record_dicts):
                    if not first_chunk or i > 0:
                        yield ',\n'
                    yield self._to_json(record, pretty=True)

                first_chunk = False
                offset += chunk_size

            # Yield closing bracket
            yield '\n]'

        elif format == 'csv':
            # For CSV, yield header first
            first_record = self.db.query(model).first()
            if first_record:
                headers = list(self._model_to_dict(first_record).keys())
                yield delimiter.join(headers) + '\n'

                # Stream records
                offset = 0
                while True:
                    records = self.db.query(model).limit(chunk_size).offset(offset).all()
                    if not records:
                        break

                    record_dicts = [self._model_to_dict(r) for r in records]
                    csv_chunk = self._to_csv(record_dicts, table_name)

                    # Skip header from chunks after first
                    if offset > 0:
                        lines = csv_chunk.split('\n')
                        csv_chunk = '\n'.join(lines[1:])

                    yield csv_chunk
                    offset += chunk_size
