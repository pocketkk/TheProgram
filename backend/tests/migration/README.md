# Migration Tests

Comprehensive test suite for PostgreSQL to SQLite migration.

## Overview

This test suite validates the complete data migration process from PostgreSQL to SQLite, ensuring data integrity, relationship preservation, and correct type transformations.

## Test Files

### Core Migration Tests

- **test_export_postgres.py** - PostgreSQL export functionality
  - UUID, datetime, JSON serialization
  - User and data filtering
  - Checksum generation
  - Error handling

- **test_import_sqlite.py** - SQLite import functionality
  - Database creation from schema
  - JSON parsing and insertion
  - Boolean and type conversions
  - Transaction handling and rollback

- **test_validation.py** - Migration validation
  - Row count verification
  - Foreign key integrity checks
  - JSON field validation
  - Data type validation
  - Validation report generation

### Data Integrity Tests

- **test_data_transformation.py** - Data type transformations
  - UUID → TEXT conversion
  - Datetime → ISO 8601 conversion
  - JSONB → JSON TEXT conversion
  - Boolean → INTEGER (0/1) conversion
  - Numeric type preservation

- **test_relationships.py** - Foreign key relationships
  - Referential integrity validation
  - Orphaned record detection
  - JOIN query validation
  - NULL foreign key handling

- **test_cascade_deletes.py** - CASCADE delete operations
  - Client deletion cascades to birth_data, charts, session_notes
  - Birth_data deletion cascades to charts
  - Chart deletion cascades to interpretations, patterns, transits
  - Foreign key enforcement

### Workflow Tests

- **test_full_migration.py** - End-to-end migration
  - Export → Import → Validate workflow
  - Data preservation across migration
  - Relationship preservation
  - Large dataset handling

- **test_rollback.py** - Backup and rollback
  - Backup creation before migration
  - Backup restoration on failure
  - Transaction rollback
  - Multiple backup preservation

## Running Tests

### Run All Tests

```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend/tests/migration
pytest -v
```

### Run Specific Test Category

```bash
# Export tests only
pytest test_export_postgres.py -v

# Import tests only
pytest test_import_sqlite.py -v

# Validation tests only
pytest test_validation.py -v
```

### Run with Coverage

```bash
pytest --cov=migration_scripts --cov-report=html
```

### Generate Test Report

```bash
python generate_test_report.py
```

This generates:
- `migration_test_report.md` - Markdown summary report
- `migration_test_results.json` - Detailed JSON results

## Test Fixtures

Test fixtures are defined in `conftest.py`:

### Database Fixtures

- `sqlite_conn` - Temporary SQLite database with schema
- `sqlite_memory_conn` - In-memory SQLite database (faster)
- `populated_sqlite_conn` - SQLite database with sample data
- `mock_postgres_conn` - Mock PostgreSQL connection

### Data Fixtures

- `sample_user_data` - User and preferences data
- `sample_clients` - Client records
- `sample_birth_data` - Birth information
- `sample_charts` - Chart data with JSON
- `sample_interpretations` - Interpretation records
- `sample_location_cache` - Location cache entries

### Utility Fixtures

- `temp_dir` - Temporary directory for test files
- `temp_migration_dir` - Temporary migration data directory
- `sample_export_files` - Complete set of JSON export files

## Test Coverage

### Export Tests (test_export_postgres.py)
- ✓ UUID serialization
- ✓ Datetime serialization
- ✓ JSON/JSONB serialization
- ✓ Decimal to float conversion
- ✓ NULL value handling
- ✓ Connection handling
- ✓ User lookup
- ✓ Table export with filtering
- ✓ Checksum generation
- ✓ Special character handling

### Import Tests (test_import_sqlite.py)
- ✓ Database creation
- ✓ Schema loading
- ✓ Backup of existing database
- ✓ JSON file loading
- ✓ User data import to app_config
- ✓ Client import
- ✓ Birth data import with FK
- ✓ Chart import with JSON fields
- ✓ Boolean conversion (True/False → 1/0)
- ✓ Transaction rollback on error
- ✓ NULL value handling
- ✓ Data type preservation

### Validation Tests (test_validation.py)
- ✓ Row count matching
- ✓ Row count mismatch detection
- ✓ Foreign key validation
- ✓ Orphaned record detection
- ✓ JSON parsing validation
- ✓ Invalid JSON detection
- ✓ UUID format validation
- ✓ Date format validation
- ✓ Coordinate range validation
- ✓ Report generation

### Transformation Tests (test_data_transformation.py)
- ✓ UUID format validation (36 chars, hyphens)
- ✓ UUID lowercase convention
- ✓ UUID parseability
- ✓ Datetime ISO 8601 format
- ✓ Date format (YYYY-MM-DD)
- ✓ Time format (HH:MM:SS)
- ✓ JSON parseability
- ✓ JSON structure preservation
- ✓ JSON array handling
- ✓ Boolean to INTEGER conversion
- ✓ REAL number preservation
- ✓ INTEGER preservation

### Relationship Tests (test_relationships.py)
- ✓ birth_data → clients relationship
- ✓ charts → clients relationship
- ✓ charts → birth_data relationship
- ✓ chart_interpretations → charts relationship
- ✓ session_notes → clients relationship
- ✓ PRAGMA foreign_key_check
- ✓ JOIN query validation
- ✓ NULL foreign key handling
- ✓ FK constraint enforcement
- ✓ Update FK constraint enforcement

### CASCADE Tests (test_cascade_deletes.py)
- ✓ Delete client → cascades to birth_data
- ✓ Delete client → cascades to charts
- ✓ Delete client → cascades to session_notes
- ✓ Delete birth_data → cascades to charts
- ✓ Delete chart → cascades to interpretations
- ✓ Delete chart → cascades to aspect_patterns
- ✓ Delete chart → cascades to transit_events
- ✓ Full cascade chain
- ✓ Foreign keys enabled

### Full Migration Tests (test_full_migration.py)
- ✓ Export → Import cycle
- ✓ Relationship preservation
- ✓ Data integrity preservation
- ✓ Orchestrator initialization
- ✓ Backup creation
- ✓ Empty table handling
- ✓ Large JSON field handling

### Rollback Tests (test_rollback.py)
- ✓ Backup creation before import
- ✓ Backup filename format
- ✓ Multiple backup preservation
- ✓ No backup if DB doesn't exist
- ✓ Transaction rollback on error
- ✓ Default row preservation
- ✓ Orchestrator backup creation
- ✓ Backup restoration on failure
- ✓ Backup validity

## Test Data

Test data is minimal but representative:
- 2 clients (John Doe, Jane Smith)
- 2 birth_data records (one with time, one without)
- 1 chart with complex JSON
- 2 interpretations (default + custom)
- 1 location cache entry

## Performance Benchmarks

Expected test execution times on standard hardware:

- Export Tests: ~0.5s
- Import Tests: ~1.0s
- Validation Tests: ~0.8s
- Transformation Tests: ~0.6s
- Relationship Tests: ~0.7s
- CASCADE Tests: ~0.9s
- Full Migration: ~2.0s
- Rollback Tests: ~1.2s

**Total: ~8 seconds** for complete suite

## Migration Validation Checklist

Before running production migration:

### Pre-Migration
- [ ] All tests pass (0 failures, 0 errors)
- [ ] Test with sample of production data
- [ ] Verify backup directory has space
- [ ] Verify PostgreSQL connection works
- [ ] Verify user email is correct
- [ ] Document rollback procedure

### During Migration
- [ ] Monitor export progress
- [ ] Verify JSON files created
- [ ] Verify checksums in manifest
- [ ] Monitor import progress
- [ ] Verify validation passes

### Post-Migration
- [ ] Row counts match
- [ ] Foreign keys intact
- [ ] JSON fields parseable
- [ ] CASCADE deletes work
- [ ] Backup created successfully
- [ ] Application tests pass with new DB

## Troubleshooting

### Tests Fail with "ModuleNotFoundError"

Ensure migration_scripts is in Python path:

```bash
export PYTHONPATH=/home/sylvia/ClaudeWork/TheProgram/backend:$PYTHONPATH
pytest
```

### Tests Fail with "No such table"

Schema not loaded. Check `sqlite_schema_path` fixture points to correct schema file.

### Foreign Key Violations

Ensure `PRAGMA foreign_keys = ON` is set. Check test fixtures enable this.

### JSON Decode Errors

Verify test data has valid JSON. Check `conftest.py` fixtures.

## Adding New Tests

1. Create test file: `test_new_feature.py`
2. Import fixtures from `conftest.py`
3. Use descriptive class and method names
4. Add to `generate_test_report.py` categories
5. Update this README

## Test Philosophy

These tests follow the principle:

**Test behavior, not implementation**

- Focus on outcomes (data correctness) not internals
- Use realistic test data
- Test both happy path and edge cases
- Mock external dependencies (PostgreSQL)
- Fast execution (in-memory where possible)

## Coverage Goals

- **Line Coverage:** >90%
- **Branch Coverage:** >85%
- **Function Coverage:** >95%

Current coverage: Run `pytest --cov` to check.

## CI/CD Integration

To integrate into CI/CD pipeline:

```yaml
# .github/workflows/test-migration.yml
name: Migration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - name: Install dependencies
        run: |
          pip install pytest pytest-cov psycopg2-binary
      - name: Run migration tests
        run: |
          cd backend/tests/migration
          pytest -v --cov
      - name: Generate report
        run: python generate_test_report.py
```

## Contact

For questions or issues with migration tests, refer to the main TASK-012 documentation.
