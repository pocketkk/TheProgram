# Export Service Usage Guide

## Overview

The Export Service provides comprehensive data export functionality for The Program astrology application. It supports exporting data in JSON and CSV formats with various options for filtering, selection, and formatting.

## Features

- **Full Database Export**: Export all tables with metadata
- **Selective Export**: Export specific clients or charts with related data
- **Table Export**: Export individual tables with filters
- **Multiple Formats**: JSON (pretty or compact) and CSV (configurable delimiter)
- **Streaming**: Memory-efficient streaming for large datasets
- **Type Handling**: Proper serialization of UUID, datetime, and JSON fields
- **Validation**: Built-in validation of export results

## Installation

The export service is located at `/backend/app/services/export_service.py` and requires:

```python
from app.services.export_service import ExportService
from app.schemas_sqlite.export import (
    FullDatabaseExportRequest,
    ClientsExportRequest,
    ChartsExportRequest,
    TableExportRequest
)
```

## Basic Usage

### Initialize Service

```python
from sqlalchemy.orm import Session
from app.services.export_service import ExportService

# In a FastAPI endpoint
def export_data(db: Session = Depends(get_db)):
    export_service = ExportService(db)
    # Use the service...
```

### Full Database Export

#### JSON Format

```python
# Export entire database to JSON
result = export_service.export_full_database(
    format='json',
    include_metadata=True,
    pretty=True
)

# Access the data
json_string = result['data']
metadata = result['metadata']

print(f"Exported {metadata['total_records']} records from {metadata['total_tables']} tables")

# Save to file
with open('database_export.json', 'w') as f:
    f.write(json_string)
```

#### CSV Format

```python
# Export to CSV (returns dict of table_name -> CSV string)
result = export_service.export_full_database(
    format='csv',
    include_metadata=True
)

# Save each table to separate CSV file
for table_name, csv_data in result['data'].items():
    with open(f'{table_name}.csv', 'w') as f:
        f.write(csv_data)
```

#### With Table Filtering

```python
# Export only specific tables
result = export_service.export_full_database(
    format='json',
    include_tables=['clients', 'birth_data', 'charts'],
    include_metadata=True
)

# Exclude certain tables
result = export_service.export_full_database(
    format='json',
    exclude_tables=['location_cache'],  # Don't export cache
    include_metadata=True
)
```

### Client Export

```python
# Export specific clients with all related data
client_ids = ['uuid-1', 'uuid-2', 'uuid-3']

result = export_service.export_clients(
    client_ids=client_ids,
    format='json',
    include_related=True,  # Include birth_data, charts, interpretations, etc.
    pretty=True
)

# Access exported data
clients = result['clients']
related_data = result['related_data']

print(f"Exported {result['client_count']} clients")
print(f"Birth data records: {result['related_counts']['birth_data']}")
print(f"Charts: {result['related_counts']['charts']}")
print(f"Interpretations: {result['related_counts']['chart_interpretations']}")

# Save to file
with open('client_export.json', 'w') as f:
    f.write(result['data'])
```

#### CSV Format

```python
# Export clients to CSV
result = export_service.export_clients(
    client_ids=client_ids,
    format='csv',
    include_related=True
)

# Save separate CSV files
for table_name, csv_data in result['data'].items():
    with open(f'clients_{table_name}.csv', 'w') as f:
        f.write(csv_data)
```

### Chart Export

```python
# Export specific charts with interpretations
chart_ids = ['chart-uuid-1', 'chart-uuid-2']

result = export_service.export_charts(
    chart_ids=chart_ids,
    format='json',
    include_interpretations=True,
    pretty=True
)

# Access chart data
charts = result['charts']
for chart in charts:
    print(f"Chart: {chart['chart_name']}")
    print(f"Type: {chart['chart_type']}")
    print(f"Planets: {len(chart['chart_data']['planets'])}")
    print(f"Aspects: {len(chart['chart_data']['aspects'])}")

# Save to file
with open('charts_export.json', 'w') as f:
    f.write(result['data'])
```

### Table Export with Filters

```python
# Export specific table with filters
result = export_service.export_table(
    table_name='charts',
    format='json',
    filters={'chart_type': 'natal', 'astro_system': 'western'},
    limit=100,
    offset=0,
    pretty=True
)

print(f"Exported {result['record_count']} charts")

# Export recent charts (assuming created_at is ISO 8601)
result = export_service.export_table(
    table_name='charts',
    format='json',
    limit=50  # Last 50 charts
)
```

### Streaming Export (Large Datasets)

For very large datasets, use streaming to avoid loading everything into memory:

```python
# Stream export of large table
with open('large_export.json', 'w') as f:
    for chunk in export_service.stream_table_export(
        table_name='charts',
        format='json',
        chunk_size=1000  # Process 1000 records at a time
    ):
        f.write(chunk)

print("Streaming export complete!")
```

### Export Validation

```python
# Validate export result
result = export_service.export_full_database(format='json')
validation = export_service.validate_export(result)

if validation['valid']:
    print("Export is valid!")
else:
    print("Export has errors:")
    for error in validation['errors']:
        print(f"  - {error}")

if validation['warnings']:
    print("Warnings:")
    for warning in validation['warnings']:
        print(f"  - {warning}")
```

## FastAPI Endpoint Examples

### Full Database Export Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database_sqlite import get_db
from app.services.export_service import ExportService
from app.schemas_sqlite.export import FullDatabaseExportRequest, FullDatabaseExportResponse

router = APIRouter(prefix="/api/export", tags=["export"])

@router.post("/database", response_model=FullDatabaseExportResponse)
def export_database(
    request: FullDatabaseExportRequest,
    db: Session = Depends(get_db)
):
    """Export entire database"""
    export_service = ExportService(db)

    try:
        result = export_service.export_full_database(
            format=request.format,
            include_tables=request.include_tables,
            exclude_tables=request.exclude_tables,
            include_metadata=request.include_metadata,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
```

### Client Export Endpoint

```python
@router.post("/clients", response_model=ClientsExportResponse)
def export_clients(
    request: ClientsExportRequest,
    db: Session = Depends(get_db)
):
    """Export specific clients with related data"""
    export_service = ExportService(db)

    try:
        result = export_service.export_clients(
            client_ids=request.client_ids,
            format=request.format,
            include_related=request.include_related,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
```

### Chart Export Endpoint

```python
@router.post("/charts", response_model=ChartsExportResponse)
def export_charts(
    request: ChartsExportRequest,
    db: Session = Depends(get_db)
):
    """Export specific charts with interpretations"""
    export_service = ExportService(db)

    try:
        result = export_service.export_charts(
            chart_ids=request.chart_ids,
            format=request.format,
            include_interpretations=request.include_interpretations,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
```

### Table Export Endpoint

```python
@router.post("/table", response_model=TableExportResponse)
def export_table(
    request: TableExportRequest,
    db: Session = Depends(get_db)
):
    """Export specific table with filters"""
    export_service = ExportService(db)

    try:
        result = export_service.export_table(
            table_name=request.table_name,
            format=request.format,
            filters=request.filters,
            limit=request.limit,
            offset=request.offset,
            pretty=request.pretty,
            csv_delimiter=request.csv_delimiter
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
```

## Export Options

### Format Options

- **JSON**:
  - `pretty=True`: Human-readable with indentation (default)
  - `pretty=False`: Compact, no whitespace

- **CSV**:
  - `csv_delimiter=','`: Comma-separated (default)
  - `csv_delimiter=';'`: Semicolon-separated
  - `csv_delimiter='\t'`: Tab-separated

### Table Selection

Available tables:
- `clients` - Client information
- `birth_data` - Birth data records
- `charts` - Calculated charts
- `chart_interpretations` - AI interpretations
- `interpretations` - Interpretation templates
- `aspect_patterns` - Detected patterns
- `transit_events` - Transit events
- `session_notes` - Session notes
- `location_cache` - Location cache
- `app_config` - Application config (singleton)
- `user_preferences` - User preferences (singleton)

### Default Export Tables

When no `include_tables` is specified, these tables are exported by default:
- clients
- birth_data
- charts
- chart_interpretations
- interpretations
- aspect_patterns
- transit_events
- session_notes
- app_config
- user_preferences

(location_cache is excluded by default as it's transient cache data)

## Data Type Handling

The export service properly handles all SQLAlchemy types:

### UUID Fields
```python
# Exported as strings
{"id": "550e8400-e29b-41d4-a716-446655440000"}
```

### Datetime Fields
```python
# Exported as ISO 8601 strings
{"created_at": "2025-11-16T12:30:45.123456"}
```

### JSON Fields
```python
# In JSON exports: nested objects
{"chart_data": {"planets": {...}, "houses": {...}}}

# In CSV exports: JSON string
chart_data,"{""planets"": {...}, ""houses"": {...}}"
```

### NULL Values
```python
# In JSON: null
{"email": null}

# In CSV: empty string
email,
```

## Performance Considerations

### Memory Usage

For large datasets:

1. **Use streaming** for tables with >10,000 records:
   ```python
   # Instead of loading all at once
   stream_table_export(table_name, chunk_size=1000)
   ```

2. **Limit export scope**:
   ```python
   # Only export needed tables
   export_full_database(include_tables=['clients', 'charts'])
   ```

3. **Use pagination** for table exports:
   ```python
   # Export in batches
   for offset in range(0, total_records, 1000):
       export_table(table_name, limit=1000, offset=offset)
   ```

### Export Speed

Typical performance (depends on hardware and data complexity):
- 1,000 records: < 1 second
- 10,000 records: 1-3 seconds
- 100,000 records: 10-20 seconds (use streaming)
- 1,000,000+ records: Use streaming with chunking

## Error Handling

```python
from sqlalchemy.exc import SQLAlchemyError

try:
    result = export_service.export_full_database(format='json')
except ValueError as e:
    # Invalid parameters (bad format, invalid table names, etc.)
    print(f"Invalid request: {e}")
except SQLAlchemyError as e:
    # Database errors
    print(f"Database error: {e}")
except Exception as e:
    # Other errors
    print(f"Export failed: {e}")
```

## Best Practices

1. **Always validate exports**:
   ```python
   result = export_service.export_full_database(format='json')
   validation = export_service.validate_export(result)
   if not validation['valid']:
       handle_invalid_export(validation['errors'])
   ```

2. **Include metadata** for tracking:
   ```python
   result = export_service.export_full_database(include_metadata=True)
   # metadata includes timestamp, record counts, etc.
   ```

3. **Use appropriate format**:
   - JSON: For full data preservation, nested structures, re-import
   - CSV: For spreadsheet analysis, human review

4. **Handle large exports**:
   - Use streaming for >50,000 records
   - Process in chunks
   - Save to disk incrementally

5. **Secure sensitive data**:
   ```python
   # Only export needed data
   export_clients(
       client_ids=[verified_client_id],
       include_related=False  # Don't include sensitive details
   )
   ```

## Testing

Run the comprehensive test suite:

```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
pytest tests/services/test_export_service.py -v
```

Or use the standalone test:

```bash
python3 test_export_standalone.py
```

## Troubleshooting

### Empty Exports

If exports are empty:
1. Check filters are correct
2. Verify IDs exist in database
3. Check table names are valid

### CSV Formatting Issues

If CSV has formatting issues:
1. Try different delimiter (`;` or `\t`)
2. Check for special characters in data
3. Verify CSV parser settings

### Memory Errors

If running out of memory:
1. Use streaming export
2. Reduce chunk size
3. Export tables individually
4. Use filters to limit data

### JSON Serialization Errors

If JSON export fails:
1. Check for circular references
2. Verify all custom types are handled
3. Review error message for problematic field

## Future Enhancements

Potential improvements for future versions:

1. **Compression**: gzip/zip support for large exports
2. **Encryption**: Encrypted export for sensitive data
3. **Incremental Export**: Export only changed records since last export
4. **Format Support**: XML, YAML, Parquet formats
5. **Import Service**: Companion import service for data restoration
6. **Scheduled Exports**: Automatic periodic backups
7. **Cloud Storage**: Direct export to S3, GCS, etc.
8. **Progress Tracking**: Real-time progress for large exports
