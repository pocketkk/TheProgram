# PostgreSQL to SQLite Migration Scripts

Production-ready Python scripts for safely migrating data from multi-user PostgreSQL to single-user SQLite database.

## Overview

This migration system handles the complete transformation from a multi-user PostgreSQL schema to a simplified single-user SQLite schema, including:

- **Data Export**: Export all user data from PostgreSQL to JSON files
- **Schema Transformation**: Remove user_id fields, convert types (UUID→TEXT, JSONB→JSON, etc.)
- **Data Import**: Create new SQLite database and import transformed data
- **Validation**: Comprehensive integrity checks including row counts, foreign keys, and JSON structure
- **Safety**: Transactions, backups, rollback capabilities, and detailed logging

## Directory Structure

```
migration_scripts/
├── config.py                  # Configuration settings
├── export_from_postgres.py    # Export PostgreSQL data to JSON
├── import_to_sqlite.py        # Import JSON data into SQLite
├── validate_migration.py      # Validate migration integrity
├── migrate.py                 # Main orchestrator script
├── requirements.txt           # Python dependencies
├── README.md                  # This file
│
├── migration_data/            # Exported JSON files (created during export)
│   ├── manifest.json
│   ├── user_data.json
│   ├── clients.json
│   ├── birth_data.json
│   └── ...
│
├── backups/                   # Database backups (created automatically)
│   └── theprogram_backup_20251115_153000.db
│
└── logs/                      # Migration logs (optional)
    └── migration.log
```

## Prerequisites

### System Requirements

- Python 3.8 or higher
- PostgreSQL 12+ (source database)
- Sufficient disk space (exported JSON ~10-50MB, SQLite DB ~50-100MB)

### PostgreSQL Access

Ensure you have access to the PostgreSQL database with the following credentials:

```bash
Host: localhost
Port: 5432
Database: theprogram_db
User: theprogram
Password: theprogram
```

You can override these in `config.py` or via environment variables.

### Python Dependencies

Install required packages:

```bash
pip install -r requirements.txt
```

This installs:
- `psycopg2-binary`: PostgreSQL adapter
- `python-dotenv`: Environment variable support (optional)

## Quick Start

### Option 1: Full Automated Migration (Recommended)

Run the complete migration process with a single command:

```bash
python migrate.py --user-email your.email@example.com
```

This will:
1. Export all data from PostgreSQL
2. Create backup of existing SQLite database (if exists)
3. Create new SQLite database from schema
4. Import and transform all data
5. Validate data integrity
6. Generate validation report

### Option 2: Step-by-Step Migration

For more control, run each phase separately:

```bash
# 1. Export from PostgreSQL
python export_from_postgres.py --user-email your.email@example.com

# 2. Import to SQLite
python import_to_sqlite.py

# 3. Validate migration
python validate_migration.py --user-email your.email@example.com
```

## Configuration

### Environment Variables

You can override default settings using environment variables:

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=theprogram_db
export POSTGRES_USER=theprogram
export POSTGRES_PASSWORD=theprogram
export MIGRATION_USER_EMAIL=your.email@example.com
```

### Configuration File

Edit `config.py` to change default settings:

```python
# PostgreSQL configuration
POSTGRES_HOST = "localhost"
POSTGRES_PORT = "5432"
POSTGRES_DB = "theprogram_db"
POSTGRES_USER = "theprogram"
POSTGRES_PASSWORD = "theprogram"

# SQLite configuration
SQLITE_PATH = BASE_DIR.parent / "app.db"
SCHEMA_PATH = BASE_DIR.parent / "schema_design" / "sqlite_schema.sql"

# Default user to migrate
DEFAULT_USER_EMAIL = "pocketkk@gmail.com"
```

## Usage Examples

### Basic Migration

Migrate user's data with default settings:

```bash
python migrate.py --user-email pocketkk@gmail.com
```

### Custom PostgreSQL Connection

Use a different PostgreSQL database:

```bash
python migrate.py \
  --postgres-url postgresql://user:pass@remotehost:5432/database \
  --user-email user@example.com
```

### Re-Import from Existing Export

If you've already exported data and want to re-import (e.g., after fixing schema):

```bash
python migrate.py --skip-export
```

### Validate Existing Database

Check integrity of an already-migrated database:

```bash
python migrate.py --skip-export --skip-import
```

### Migration Without Backup

Skip backup creation (use with caution):

```bash
python migrate.py --no-backup
```

### Verbose Logging

Enable debug-level logging:

```bash
python migrate.py --verbose
```

## Data Transformations

The migration performs the following transformations:

### Removed Fields

- All `user_id` foreign keys (multi-tenancy removed)
- User records moved to `app_config` table

### Type Conversions

| PostgreSQL Type | SQLite Type | Transformation |
|----------------|-------------|----------------|
| UUID | TEXT | `str(uuid_value)` |
| VARCHAR/String | TEXT | Direct copy |
| DateTime | TEXT | ISO 8601 format (`YYYY-MM-DDTHH:MM:SS`) |
| Date | TEXT | ISO 8601 format (`YYYY-MM-DD`) |
| Time | TEXT | ISO 8601 format (`HH:MM:SS`) |
| Boolean | INTEGER | `1` for True, `0` for False |
| JSONB | TEXT | `json.dumps(value)` |
| Numeric | REAL | `float(value)` |
| Integer | INTEGER | Direct copy |

### Schema Changes

1. **app_config table**: New singleton table for app-level settings (includes password hash)
2. **user_preferences table**: Converted to singleton (id constrained to 1)
3. **All other tables**: Removed user_id, kept client-based organization

See `../schema_design/migration_mapping.md` for detailed field-by-field mapping.

## Validation Checks

The validation script performs comprehensive checks:

### Row Count Validation

- Compares row counts between PostgreSQL and SQLite for each table
- Accounts for user filtering (only selected user's data)

### Foreign Key Validation

- Checks for orphaned records
- Validates all foreign key relationships:
  - `birth_data.client_id` → `clients.id`
  - `charts.client_id` → `clients.id`
  - `charts.birth_data_id` → `birth_data.id`
  - `chart_interpretations.chart_id` → `charts.id`
  - `aspect_patterns.chart_id` → `charts.id`
  - `transit_events.chart_id` → `charts.id`
  - `session_notes.client_id` → `clients.id`

### JSON Structure Validation

- Verifies all JSON fields can be parsed
- Checks JSON structure (e.g., `planets_involved` must be a list)
- Validates required vs nullable JSON fields

### Data Type Validation

- UUIDs are proper format (36 characters with hyphens)
- Dates are ISO 8601 format
- Booleans are 0 or 1
- Coordinates are within valid ranges (-90 to 90 latitude, -180 to 180 longitude)

### User Data Validation

- Password hash correctly migrated to `app_config`
- User preferences correctly migrated

## Output Files

### Exported JSON Files

Located in `migration_data/`:

- `manifest.json`: Export metadata (timestamp, user, row counts, checksums)
- `user_data.json`: User and preferences data
- `clients.json`: Client records
- `birth_data.json`: Birth data records
- `charts.json`: Chart records
- `chart_interpretations.json`: AI interpretations
- `interpretations.json`: Reusable interpretation templates
- `aspect_patterns.json`: Detected aspect patterns
- `transit_events.json`: Transit events
- `session_notes.json`: Session notes
- `location_cache.json`: Location cache

### SQLite Database

Default location: `../app.db`

The database includes:
- All tables from schema
- Indexes for performance
- Foreign key constraints
- Triggers for auto-updating timestamps
- Initial singleton records in `app_config` and `user_preferences`

### Validation Report

Located in `migration_data/validation_report.json`:

```json
{
  "timestamp": "2025-11-15T15:30:00",
  "user_email": "user@example.com",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "validation_results": {
    "clients": {"pg_count": 10, "sqlite_count": 10, "match": true},
    ...
  },
  "errors": [],
  "warnings": [],
  "overall_status": "PASS"
}
```

### Backups

Located in `backups/`:

Format: `theprogram_backup_YYYYMMDD_HHMMSS.db`

Automatic backups are created before each import (unless `--no-backup` is used).

## Safety Features

### Transactions

All import operations use transactions:
- Changes are committed only if entire import succeeds
- Automatic rollback on any error
- Prevents partial/corrupted database state

### Backups

Automatic backup before migration:
- Timestamped backup files
- Original database preserved
- Easy rollback if needed

### Non-Destructive

PostgreSQL database is never modified:
- Read-only operations
- Safe to re-run migration
- Original data always preserved

### Logging

Comprehensive logging at each step:
- INFO level: High-level progress
- DEBUG level: Detailed operations (use `--verbose`)
- ERROR level: Failures and issues
- Logs saved to console and optionally to file

### Checksums

Export manifest includes SHA256 checksums:
- Verify data integrity
- Detect file corruption
- Compare exports across migrations

## Troubleshooting

### Export Fails: User Not Found

```
ValueError: User not found: user@example.com
```

**Solution**: Check the email address. List available users:

```bash
psql -h localhost -U theprogram -d theprogram_db -c "SELECT email, full_name FROM users;"
```

### Import Fails: Schema File Not Found

```
FileNotFoundError: sqlite_schema.sql not found
```

**Solution**: Ensure the schema file exists at the correct path. Check `config.py`:

```python
SCHEMA_PATH = BASE_DIR.parent / "schema_design" / "sqlite_schema.sql"
```

### Validation Fails: Row Count Mismatch

```
Row count mismatch in clients: PG=10, SQLite=8
```

**Solution**: This usually indicates:
- Incomplete export (check export logs)
- Import error (check import logs)
- Foreign key constraints blocking inserts

Re-run migration with `--verbose` to see detailed logs.

### Validation Fails: Foreign Key Violations

```
Foreign key violation: (birth_data, 5, client_id, clients)
```

**Solution**: Indicates orphaned records. Possible causes:
- Data inconsistency in PostgreSQL
- Export filtering issue
- Import order problem

Check the validation report for details.

### Database Locked Error

```
sqlite3.OperationalError: database is locked
```

**Solution**: Another process is accessing the SQLite database. Close other connections and try again.

### Permission Denied

```
PermissionError: [Errno 13] Permission denied: 'app.db'
```

**Solution**: Check file permissions and ensure you have write access to the directory.

## Performance

### Expected Times (for typical dataset)

- **Export**: ~10-30 seconds (depends on PostgreSQL server)
- **Import**: ~5-15 seconds (depends on disk I/O)
- **Validation**: ~5-10 seconds
- **Total**: ~20-60 seconds

### Large Datasets

For databases with thousands of charts:
- Export may take 1-2 minutes
- Import may take 30-60 seconds
- Validation may take 30 seconds

SQLite can easily handle databases up to 1GB in size.

## Post-Migration

### Verify Database

After migration, verify the database:

```bash
# Check database integrity
sqlite3 ../app.db "PRAGMA integrity_check;"

# Count records
sqlite3 ../app.db "SELECT name, COUNT(*) FROM (
    SELECT 'clients' as name FROM clients UNION ALL
    SELECT 'birth_data' FROM birth_data UNION ALL
    SELECT 'charts' FROM charts
) GROUP BY name;"

# Test foreign key constraints
sqlite3 ../app.db "PRAGMA foreign_key_check;"
```

### Update Application

Update your application to use the new SQLite database:

```python
import sqlite3

# Connect to SQLite
conn = sqlite3.connect('app.db')
conn.execute("PRAGMA foreign_keys = ON")

# Query data
cursor = conn.cursor()
cursor.execute("SELECT * FROM clients")
clients = cursor.fetchall()
```

### Archive PostgreSQL Data

Once migration is verified:
1. Keep PostgreSQL database as backup for 30 days
2. Export PostgreSQL dump for long-term archive
3. Document migration date and user in your records

```bash
# Create PostgreSQL dump
pg_dump -h localhost -U theprogram theprogram_db > theprogram_archive_$(date +%Y%m%d).sql
```

## Development

### Running Tests

```bash
# Export only
python export_from_postgres.py --user-email test@example.com

# Import only (using existing export)
python import_to_sqlite.py

# Validate only (using existing database)
python validate_migration.py --user-email test@example.com
```

### Modifying Scripts

The scripts are designed to be modular:

- **config.py**: Change settings without modifying code
- **export_from_postgres.py**: Modify export logic
- **import_to_sqlite.py**: Modify import/transformation logic
- **validate_migration.py**: Add new validation checks
- **migrate.py**: Change orchestration flow

### Adding New Tables

To migrate a new table:

1. Add export method in `export_from_postgres.py`:
```python
def export_new_table(self) -> List[Dict[str, Any]]:
    return self.export_table("new_table", user_filter=True)
```

2. Add import method in `import_to_sqlite.py`:
```python
def import_new_table(self, records: List[Dict[str, Any]]) -> None:
    # Import logic here
    pass
```

3. Add validation in `validate_migration.py` if needed

4. Update `config.py` to include new table in lists

## Support

For issues or questions:

1. Check this README
2. Review validation report: `migration_data/validation_report.json`
3. Check logs for detailed error messages
4. Verify schema design: `../schema_design/`

## License

Part of TheProgram astrology application.

## Changelog

### Version 1.0.0 (2025-11-15)

- Initial release
- Full PostgreSQL to SQLite migration support
- Comprehensive validation
- Transaction safety and backups
- Detailed logging and error handling

---

**Note**: Always test migration on a copy of your data before running on production database!
