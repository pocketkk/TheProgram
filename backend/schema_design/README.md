# SQLite Schema Design for Single-User Astrology Application

## Overview

This directory contains the complete schema design for migrating from a multi-user PostgreSQL database to a single-user SQLite database. This is **TASK-001** of the migration project.

## What's in This Directory

### 1. `sqlite_schema.sql`
**Complete SQLite schema with:**
- All CREATE TABLE statements
- Foreign key constraints
- Indexes for performance
- Auto-update triggers
- Convenience views
- Inline documentation

**How to use:**
```bash
# Create new SQLite database
sqlite3 astrology.db < sqlite_schema.sql

# Or in Python
import sqlite3
conn = sqlite3.connect('astrology.db')
with open('sqlite_schema.sql', 'r') as f:
    conn.executescript(f.read())
conn.close()
```

### 2. `migration_mapping.md`
**Detailed migration guide with:**
- Old table → New table mapping
- Field-by-field transformations
- Type conversion rules
- Data transformation examples
- Complete Python migration example
- Before/after data examples
- Validation checklist

**Use this when:**
- Writing the migration script
- Understanding how PostgreSQL data maps to SQLite
- Validating migration results

### 3. `schema_diagram.md`
**Visual schema documentation with:**
- ASCII ERD (Entity Relationship Diagram)
- Cascade deletion hierarchy
- Detailed table structures
- Index definitions
- Design pattern explanations

**Use this when:**
- Understanding table relationships
- Designing queries
- Planning new features
- Onboarding new developers

### 4. `design_decisions.md`
**Comprehensive design rationale with:**
- Major design decisions explained
- Trade-offs considered
- Alternatives rejected
- SQLite-specific optimizations
- Security considerations
- Performance analysis
- Risk mitigation strategies

**Use this when:**
- Understanding WHY choices were made
- Questioning a design decision
- Planning schema changes
- Troubleshooting issues

## Quick Start

### For Developers

1. **Read schema_diagram.md first** to understand the structure
2. **Review design_decisions.md** to understand the rationale
3. **Use sqlite_schema.sql** to create the database
4. **Follow migration_mapping.md** when implementing the migration

### For Database Administrators

1. **Review design_decisions.md** for SQLite optimizations
2. **Implement the PRAGMA settings** recommended
3. **Set up backup procedures** as outlined
4. **Plan periodic maintenance** (VACUUM, ANALYZE)

### For Project Managers

1. **Read the Executive Summary** in design_decisions.md
2. **Review the risks section** to understand potential issues
3. **Check the validation checklist** in migration_mapping.md
4. **Understand the testing recommendations**

## Key Changes from PostgreSQL

### Removed
- `users` table (replaced with `app_config` singleton)
- All `user_id` foreign keys (single-user mode)

### Simplified
- `user_preferences` is now a singleton table (id constrained to 1)

### Added
- `app_config` table for application-level configuration

### Modified
- UUID → TEXT (all IDs)
- JSONB → TEXT (all JSON fields)
- Date/Time → TEXT in ISO 8601 format
- Boolean → INTEGER (0/1)
- Numeric → REAL

## Schema Statistics

### Tables
- **2 singleton tables**: app_config, user_preferences
- **10 data tables**: clients, birth_data, charts, chart_interpretations, interpretations, aspect_patterns, transit_events, session_notes, location_cache
- **2 views**: client_summary, recent_charts

### Relationships
- **9 foreign key constraints** (all ON DELETE CASCADE)
- **20+ indexes** for query performance
- **11 auto-update triggers** for timestamp management

### Data Types
- **TEXT**: All strings, UUIDs, JSON, dates/times
- **INTEGER**: Booleans, numeric IDs, offsets, versions
- **REAL**: Latitude, longitude, orbs

## Migration Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: Design (COMPLETED)                                │
│  ✓ Analyze PostgreSQL schema                                │
│  ✓ Design SQLite schema                                     │
│  ✓ Document design decisions                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: Implementation (NEXT)                             │
│  → Create SQLite database using sqlite_schema.sql           │
│  → Write Python migration script using migration_mapping.md │
│  → Test migration with sample data                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: Validation (UPCOMING)                             │
│  → Run validation checklist from migration_mapping.md       │
│  → Verify all data migrated correctly                       │
│  → Test foreign key constraints                             │
│  → Performance benchmarking                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 4: Application Updates (FUTURE)                      │
│  → Update SQLAlchemy models to match SQLite schema          │
│  → Update queries to handle new schema                      │
│  → Add UI confirmations for cascade deletes                 │
│  → Implement backup/restore functionality                   │
└─────────────────────────────────────────────────────────────┘
```

## Common Tasks

### Create a New Database
```python
import sqlite3

# Create and initialize database
conn = sqlite3.connect('astrology.db')

# Enable foreign keys (REQUIRED)
conn.execute('PRAGMA foreign_keys = ON')

# Load schema
with open('sqlite_schema.sql', 'r') as f:
    conn.executescript(f.read())

conn.close()
```

### Query with Foreign Key Constraints
```python
import sqlite3

conn = sqlite3.connect('astrology.db')

# ALWAYS enable foreign keys first
conn.execute('PRAGMA foreign_keys = ON')

# Now queries will enforce constraints
cursor = conn.cursor()
cursor.execute('SELECT * FROM clients')
```

### Parse JSON Fields
```python
import json
import sqlite3

conn = sqlite3.connect('astrology.db')
conn.row_factory = sqlite3.Row  # Access columns by name

cursor = conn.execute('SELECT id, chart_data FROM charts WHERE id = ?', (chart_id,))
row = cursor.fetchone()

# Parse JSON
chart_data = json.loads(row['chart_data'])
planets = chart_data['planets']
sun_position = planets['sun']['longitude']
```

### Parse ISO 8601 Dates
```python
from datetime import datetime

# From database
birth_date_str = '1990-05-15'
birth_time_str = '14:30:00'

# To Python
birth_date = datetime.fromisoformat(birth_date_str).date()
birth_time = datetime.fromisoformat(birth_time_str).time()

# Back to database
db_date = birth_date.isoformat()
db_time = birth_time.isoformat()
```

## Testing the Schema

### Test Foreign Key Constraints
```sql
-- Should succeed: Insert client
INSERT INTO clients (id, first_name, last_name)
VALUES ('test-uuid-123', 'Test', 'User');

-- Should succeed: Insert birth_data for client
INSERT INTO birth_data (
    id, client_id, birth_date, latitude, longitude, timezone
)
VALUES (
    'birth-uuid-123',
    'test-uuid-123',
    '1990-01-01',
    40.7128,
    -74.0060,
    'America/New_York'
);

-- Should FAIL: Insert birth_data with non-existent client_id
INSERT INTO birth_data (
    id, client_id, birth_date, latitude, longitude, timezone
)
VALUES (
    'birth-uuid-456',
    'non-existent-uuid',
    '1990-01-01',
    40.7128,
    -74.0060,
    'America/New_York'
);

-- Should CASCADE: Delete client should delete birth_data too
DELETE FROM clients WHERE id = 'test-uuid-123';

-- Verify cascade worked
SELECT COUNT(*) FROM birth_data WHERE id = 'birth-uuid-123';
-- Should return 0
```

### Test Triggers
```sql
-- Insert a client
INSERT INTO clients (id, first_name) VALUES ('trigger-test', 'Test');

-- Check created_at and updated_at are set
SELECT created_at, updated_at FROM clients WHERE id = 'trigger-test';

-- Wait a moment and update
-- (In real test, add a delay)
UPDATE clients SET first_name = 'Updated' WHERE id = 'trigger-test';

-- Verify updated_at changed
SELECT created_at, updated_at FROM clients WHERE id = 'trigger-test';
-- updated_at should be newer than created_at
```

### Test Singleton Constraints
```sql
-- Should FAIL: Try to insert second row in app_config
INSERT INTO app_config (id) VALUES (2);
-- Error: CHECK constraint failed

-- Should SUCCEED: Update existing row
UPDATE app_config SET password_hash = 'new-hash' WHERE id = 1;

-- Should SUCCEED: Select the singleton
SELECT * FROM app_config;
-- Always returns exactly 1 row
```

## Performance Optimization

### Recommended PRAGMA Settings
```sql
-- Enable foreign keys (REQUIRED every time)
PRAGMA foreign_keys = ON;

-- Performance optimizations
PRAGMA journal_mode = WAL;        -- Better concurrency
PRAGMA synchronous = NORMAL;      -- Good balance
PRAGMA cache_size = -2000;        -- 2MB cache
PRAGMA temp_store = MEMORY;       -- Faster temp operations
PRAGMA auto_vacuum = INCREMENTAL; -- Automatic cleanup
```

### Periodic Maintenance
```sql
-- Run monthly or when database is 10% fragmented
VACUUM;

-- Run weekly or after significant data changes
ANALYZE;

-- Check database integrity
PRAGMA integrity_check;
```

## Troubleshooting

### Foreign Keys Not Working
**Problem**: Cascade deletes don't work, orphaned records appear.

**Solution**: Always run `PRAGMA foreign_keys = ON` when opening the database. This must be done for every connection.

```python
conn = sqlite3.connect('astrology.db')
conn.execute('PRAGMA foreign_keys = ON')  # REQUIRED
```

### JSON Parsing Errors
**Problem**: `json.loads()` fails with "Invalid JSON" error.

**Solution**: Verify JSON is stored correctly:
```python
import json

# Correct way to store JSON
chart_data = {"planets": {...}, "houses": {...}}
json_str = json.dumps(chart_data)  # Convert to string
cursor.execute('INSERT INTO charts (..., chart_data) VALUES (..., ?)', (..., json_str))

# Correct way to load JSON
cursor.execute('SELECT chart_data FROM charts WHERE id = ?', (chart_id,))
json_str = cursor.fetchone()[0]
chart_data = json.loads(json_str)  # Parse string to dict
```

### Date/Time Parsing Errors
**Problem**: Dates don't sort correctly or parse incorrectly.

**Solution**: Always use ISO 8601 format:
```python
from datetime import datetime, date, time

# Dates: YYYY-MM-DD
date_str = date(1990, 5, 15).isoformat()  # '1990-05-15'

# Times: HH:MM:SS
time_str = time(14, 30, 0).isoformat()  # '14:30:00'

# DateTimes: YYYY-MM-DDTHH:MM:SS
dt_str = datetime(2025, 11, 15, 14, 30, 45).isoformat()  # '2025-11-15T14:30:45'
```

### Slow Queries
**Problem**: Queries take longer than expected.

**Solution**:
1. Verify indexes exist: `SELECT * FROM sqlite_master WHERE type='index';`
2. Run `ANALYZE` to update statistics
3. Use `EXPLAIN QUERY PLAN` to check query execution:
```sql
EXPLAIN QUERY PLAN
SELECT * FROM charts WHERE client_id = 'some-uuid';
-- Should show "SEARCH charts USING INDEX idx_charts_client_id"
```

## Next Steps

1. **Review all documents** in this directory
2. **Create a test database** using sqlite_schema.sql
3. **Test the schema** using the examples above
4. **Write migration script** following migration_mapping.md
5. **Test migration** with sample PostgreSQL data
6. **Proceed to TASK-002** (SQLAlchemy model updates)

## Questions or Issues?

If you encounter any issues or have questions about the schema design:

1. Check **design_decisions.md** for the rationale behind specific choices
2. Review **migration_mapping.md** for data transformation guidance
3. Consult **schema_diagram.md** for relationship understanding
4. Test queries in isolation to isolate the problem

## Files in This Directory

```
schema_design/
├── README.md                   ← You are here
├── sqlite_schema.sql           ← Complete schema (RUNNABLE)
├── migration_mapping.md        ← Migration guide (DETAILED)
├── schema_diagram.md           ← Visual documentation (ASCII ERD)
└── design_decisions.md         ← Rationale and analysis (WHY)
```

## Schema Version

- **Version**: 1.0.0
- **Date**: 2025-11-15
- **PostgreSQL Source**: Multi-user astrology application
- **SQLite Target**: Single-user offline-first application
- **Status**: Design Complete, Ready for Implementation

---

**Next Task**: TASK-002 - Implement migration script using this schema design.
