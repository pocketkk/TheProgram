# SQLite Schema Quick Reference

## 🎯 Essential Commands

### Open Database (Always do this first!)
```python
import sqlite3
conn = sqlite3.connect('astrology.db')
conn.execute('PRAGMA foreign_keys = ON')  # REQUIRED!
```

### Create Database from Schema
```bash
sqlite3 astrology.db < sqlite_schema.sql
```

## 📊 Table Quick Reference

### Singleton Tables (Always 1 Row)
```sql
-- App configuration
SELECT * FROM app_config WHERE id = 1;
UPDATE app_config SET password_hash = ? WHERE id = 1;

-- User preferences
SELECT * FROM user_preferences WHERE id = 1;
UPDATE user_preferences SET color_scheme = 'dark' WHERE id = 1;
```

### Client Data
```sql
-- List all clients
SELECT * FROM clients ORDER BY last_name;

-- Get client with birth data count
SELECT * FROM client_summary;  -- Uses view

-- Insert new client
INSERT INTO clients (id, first_name, last_name)
VALUES (?, ?, ?);
```

### Birth Data
```sql
-- Get all birth data for client
SELECT * FROM birth_data WHERE client_id = ?;

-- Insert birth data
INSERT INTO birth_data (
    id, client_id, birth_date, birth_time,
    latitude, longitude, timezone
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

### Charts
```sql
-- Get recent charts
SELECT * FROM recent_charts;  -- Uses view

-- Load chart with JSON parsing
SELECT id, chart_data FROM charts WHERE id = ?;
-- In Python: chart_data = json.loads(row['chart_data'])

-- Insert chart
INSERT INTO charts (
    id, client_id, birth_data_id,
    chart_type, astro_system, zodiac_type, chart_data
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

## 🔄 Data Type Conversions

### Python → SQLite
```python
import json
from datetime import datetime, date, time

# UUID
uuid_str = str(uuid4())  # '550e8400-...'

# Date
date_str = date(1990, 5, 15).isoformat()  # '1990-05-15'

# Time
time_str = time(14, 30, 0).isoformat()  # '14:30:00'

# DateTime
dt_str = datetime.now().isoformat()  # '2025-11-15T14:30:45'

# Boolean
bool_int = 1 if True else 0  # 1 or 0

# JSON
json_str = json.dumps({"key": "value"})  # '{"key":"value"}'
```

### SQLite → Python
```python
import json
from datetime import datetime

# UUID (already string)
uuid_obj = row['id']

# Date
date_obj = datetime.fromisoformat(row['birth_date']).date()

# Time
time_obj = datetime.fromisoformat(row['birth_time']).time()

# DateTime
dt_obj = datetime.fromisoformat(row['created_at'])

# Boolean
bool_val = bool(row['time_unknown'])  # 1 → True, 0 → False

# JSON
dict_obj = json.loads(row['chart_data'])
```

## 🔗 Foreign Key Relationships

```
clients
  ├─→ birth_data (1:N)
  │     └─→ charts (1:N)
  │           ├─→ chart_interpretations (1:N)
  │           ├─→ aspect_patterns (1:N)
  │           └─→ transit_events (1:N)
  └─→ session_notes (1:N)
```

All use **ON DELETE CASCADE** - delete parent deletes all children.

## 🗑️ Cascade Delete Examples

```sql
-- Delete client → cascades to ALL related data
DELETE FROM clients WHERE id = ?;
-- Also deletes: birth_data, charts, interpretations, patterns, transits, notes

-- Delete birth_data → cascades to charts
DELETE FROM birth_data WHERE id = ?;
-- Also deletes: charts, interpretations, patterns, transits

-- Delete chart → cascades to chart data
DELETE FROM charts WHERE id = ?;
-- Also deletes: interpretations, patterns, transits
```

## 🔍 Common Queries

### Search
```sql
-- Find clients by name
SELECT * FROM clients
WHERE first_name LIKE '%John%' OR last_name LIKE '%John%';

-- Find charts by type
SELECT * FROM charts WHERE chart_type = 'natal';

-- Find charts for client
SELECT * FROM charts WHERE client_id = ?;

-- Find interpretations for chart element
SELECT * FROM chart_interpretations
WHERE chart_id = ? AND element_type = 'planet' AND element_key = 'sun';
```

### Aggregate
```sql
-- Count charts per client
SELECT client_id, COUNT(*) as chart_count
FROM charts
GROUP BY client_id;

-- Count interpretations per chart
SELECT chart_id, COUNT(*) as interp_count
FROM chart_interpretations
GROUP BY chart_id;
```

### JSON Queries (SQLite JSON functions)
```sql
-- Extract JSON value
SELECT
    id,
    json_extract(chart_data, '$.planets.sun.longitude') as sun_longitude
FROM charts;

-- Check if JSON key exists
SELECT * FROM charts
WHERE json_extract(chart_data, '$.planets.sun') IS NOT NULL;
```

## 🎨 Index Usage

All foreign keys and date fields are indexed. Check index usage:

```sql
-- Verify index is used
EXPLAIN QUERY PLAN
SELECT * FROM charts WHERE client_id = ?;
-- Should say: SEARCH charts USING INDEX idx_charts_client_id

-- List all indexes
SELECT name, tbl_name FROM sqlite_master
WHERE type = 'index' AND name NOT LIKE 'sqlite_%';
```

## ⚡ Performance Tips

### Always Use Parameterized Queries
```python
# GOOD - parameterized
cursor.execute('SELECT * FROM clients WHERE id = ?', (client_id,))

# BAD - string formatting (SQL injection risk!)
cursor.execute(f'SELECT * FROM clients WHERE id = "{client_id}"')
```

### Batch Inserts
```python
# Use executemany for bulk inserts
data = [(id1, name1), (id2, name2), ...]
cursor.executemany(
    'INSERT INTO clients (id, first_name) VALUES (?, ?)',
    data
)
```

### Transactions
```python
# Wrap multiple operations in transaction
with conn:  # Auto-commit on success, rollback on error
    conn.execute('INSERT INTO clients ...')
    conn.execute('INSERT INTO birth_data ...')
    conn.execute('INSERT INTO charts ...')
```

## 🛠️ Maintenance

### Periodic (Weekly/Monthly)
```sql
-- Update query planner statistics
ANALYZE;

-- Defragment and reclaim space
VACUUM;

-- Check integrity
PRAGMA integrity_check;
```

### Startup
```python
conn = sqlite3.connect('astrology.db')
conn.execute('PRAGMA foreign_keys = ON')  # ALWAYS
conn.execute('PRAGMA journal_mode = WAL')  # Better concurrency
```

## 🐛 Troubleshooting

### Foreign Keys Not Working
```python
# CHECK: Did you enable them?
conn.execute('PRAGMA foreign_keys = ON')  # Required every connection!

# Verify they're on
cursor = conn.execute('PRAGMA foreign_keys')
print(cursor.fetchone()[0])  # Should be 1
```

### Cascade Deletes Not Working
```sql
-- Same as above - foreign keys must be enabled
PRAGMA foreign_keys = ON;
```

### JSON Parse Errors
```python
# CORRECT: Store as JSON string
json_str = json.dumps(data_dict)
cursor.execute('INSERT INTO charts (..., chart_data) VALUES (..., ?)', (..., json_str))

# CORRECT: Load as JSON string
cursor.execute('SELECT chart_data FROM charts WHERE id = ?', (id,))
json_str = cursor.fetchone()[0]
data_dict = json.loads(json_str)
```

### Slow Queries
```sql
-- Check if index is used
EXPLAIN QUERY PLAN SELECT ...;

-- If no index used, run ANALYZE
ANALYZE;
```

## 📝 Testing Checklist

Before deploying:
- [ ] `PRAGMA foreign_keys = ON` is set
- [ ] All migrations tested with sample data
- [ ] Cascade deletes verified
- [ ] JSON serialization/deserialization tested
- [ ] Backups configured
- [ ] Database integrity checked (`PRAGMA integrity_check`)

## 🚀 Quick Setup Script

```python
import sqlite3
import json
from pathlib import Path

def setup_database(db_path='astrology.db', schema_file='sqlite_schema.sql'):
    """Create and configure SQLite database"""

    # Create database
    conn = sqlite3.connect(db_path)

    # Enable foreign keys
    conn.execute('PRAGMA foreign_keys = ON')

    # Load schema
    schema_sql = Path(schema_file).read_text()
    conn.executescript(schema_sql)

    # Configure for performance
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA synchronous = NORMAL')
    conn.execute('PRAGMA cache_size = -2000')

    return conn

# Use it
conn = setup_database()
```

## 📚 Full Documentation

For complete details, see:
- `README.md` - Quick start and overview
- `schema_diagram.md` - Table structures and relationships
- `design_decisions.md` - Why things are designed this way
- `migration_mapping.md` - PostgreSQL to SQLite migration guide
- `sqlite_schema.sql` - Full schema with comments

---

**Quick Tip**: Keep this reference handy when writing queries!
