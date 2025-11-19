# Import Service - Quick Start Guide

## Installation

No additional dependencies needed beyond existing project requirements.

## Basic Usage

### 1. Simple Client Import

```python
from app.services.import_service import ImportService
from app.schemas_sqlite.import_schemas import ImportOptions, ImportMode

# Initialize service
service = ImportService(db_session)

# Prepare data
data = {
    'clients': [{
        'id': 'uuid-here',
        'first_name': 'John',
        'last_name': 'Doe'
    }]
}

# Import
result = service.import_full_database(data)
print(f"Imported: {result.inserted_records} records")
```

### 2. Import from JSON File

```python
import json

with open('export.json', 'r') as f:
    data = json.load(f)

result = service.import_full_database(data)
```

### 3. Import from CSV

```python
with open('clients.csv', 'r') as f:
    csv_data = f.read()

result = service.import_full_database(
    data=csv_data,
    options=ImportOptions(format=ImportFormat.CSV)
)
```

### 4. Safe Import with Preview

```python
# Preview first (dry run)
preview = service.import_full_database(data, dry_run=True)
print(f"Will insert: {preview.would_insert}")
print(f"Will update: {preview.would_update}")

# If safe, import
if preview.would_fail == 0:
    result = service.import_full_database(
        data,
        options=ImportOptions(create_backup=True)
    )
```

### 5. Import Modes

```python
# MERGE: Update existing + insert new (default)
result = service.import_full_database(
    data,
    options=ImportOptions(mode=ImportMode.MERGE)
)

# REPLACE: Delete all + insert new
result = service.import_full_database(
    data,
    options=ImportOptions(mode=ImportMode.REPLACE)
)

# SKIP: Skip existing, insert new only
result = service.import_full_database(
    data,
    options=ImportOptions(mode=ImportMode.SKIP)
)

# UPDATE: Update existing only, skip new
result = service.import_full_database(
    data,
    options=ImportOptions(mode=ImportMode.UPDATE)
)
```

## Import Options

```python
options = ImportOptions(
    mode=ImportMode.MERGE,              # Import mode
    format=ImportFormat.JSON,           # Data format
    strict_validation=True,             # Fail on validation errors
    validate_foreign_keys=True,         # Check foreign keys
    validate_unique_constraints=True,   # Check unique constraints
    use_transactions=True,              # Use ACID transactions
    create_backup=True,                 # Backup before import
    batch_size=1000,                    # Records per commit
    continue_on_error=False,            # Stop on first error
    csv_delimiter=',',                  # CSV delimiter
    auto_decompress=True                # Auto-decompress gzip/bz2
)
```

## Checking Results

```python
result = service.import_full_database(data)

if result.success:
    print(f"✓ Success!")
    print(f"  Inserted: {result.inserted_records}")
    print(f"  Updated: {result.updated_records}")
    print(f"  Duration: {result.duration_seconds:.2f}s")
else:
    print(f"✗ Failed!")
    for error in result.errors:
        print(f"  {error}")
```

## Common Patterns

### Export/Import Roundtrip

```python
# Export
export_service = ExportService(db_session)
export_result = export_service.export_full_database()

# Import
import_service = ImportService(db_session)
import_result = import_service.import_full_database(export_result)
```

### Import with Relationships

```python
data = {
    'clients': [{'id': 'client-1', ...}],
    'birth_data': [{'id': 'birth-1', 'client_id': 'client-1', ...}],
    'charts': [{'id': 'chart-1', 'client_id': 'client-1', ...}]
}

result = service.import_full_database(data)
```

### Large Dataset

```python
result = service.import_full_database(
    data,
    options=ImportOptions(
        batch_size=500,
        use_transactions=False,
        continue_on_error=True
    )
)
```

## Error Handling

```python
result = service.import_full_database(data)

if not result.success:
    # Check validation errors
    if result.validation_result and not result.validation_result.valid:
        for error in result.validation_result.errors:
            print(f"Line {error.line_number}: {error.error}")

    # Check import errors
    for error in result.errors:
        print(f"Error: {error}")

    # Check per-table errors
    for table, stats in result.table_stats.items():
        if stats.failed > 0:
            print(f"{table}: {stats.failed} failures")
            for err in stats.errors:
                print(f"  {err}")
```

## Testing

```bash
# Run tests
pytest backend/tests/services/test_import_service.py -v

# Run standalone demo
python3 backend/test_import_standalone.py
```

## Documentation

- **Full Documentation:** `backend/IMPORT_SERVICE_DOCUMENTATION.md`
- **Summary:** `backend/TASK_202_SUMMARY.md`
- **Tests:** `backend/tests/services/test_import_service.py`

## Need Help?

1. Check the full documentation
2. Look at test cases for examples
3. Run dry run mode to preview
4. Check service logs for details
