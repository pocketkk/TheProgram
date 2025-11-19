# Data Portability API - Quick Reference

## Authentication

All endpoints require Bearer token:
```
Authorization: Bearer <token>
```

Get token from: `POST /api/v1/auth/login`

---

## Export Endpoints

### Full Database Export
```bash
POST /api/v1/export/full
{
  "format": "json",
  "compress": false,
  "include_metadata": true
}
```

### Download Export
```bash
GET /api/v1/export/full/download?format=json&compress=true
```

### Export Specific Clients
```bash
POST /api/v1/export/clients
{
  "client_ids": ["uuid1", "uuid2"],
  "include_related": true
}
```

### Export Specific Charts
```bash
POST /api/v1/export/charts
{
  "chart_ids": ["uuid1", "uuid2"],
  "include_interpretations": true
}
```

### Export Table
```bash
POST /api/v1/export/table
{
  "table_name": "clients",
  "filters": {"first_name": "John"},
  "limit": 100
}
```

---

## Import Endpoints

### Validate Import Data
```bash
POST /api/v1/import/validate
Content-Type: multipart/form-data

file: <upload file>
```

### Dry Run (Preview)
```bash
POST /api/v1/import/dry-run
Content-Type: multipart/form-data

file: <upload file>
import_mode: upsert
conflict_resolution: skip
```

### Execute Import
```bash
POST /api/v1/import/execute
Content-Type: multipart/form-data

file: <upload file>
import_mode: upsert
conflict_resolution: skip
validate_first: true
create_backup: true
```

---

## Backup Endpoints

### Create Backup
```bash
POST /api/v1/backups/create
{
  "encrypt": true,
  "compress": true,
  "verify": true,
  "description": "Manual backup",
  "tags": ["production"]
}
```

### List Backups
```bash
GET /api/v1/backups/list?limit=50&offset=0&encrypted_only=false
```

### Get Backup Details
```bash
GET /api/v1/backups/{backup_id}
```

### Verify Backup
```bash
POST /api/v1/backups/{backup_id}/verify
```

### Restore Backup
```bash
POST /api/v1/backups/{backup_id}/restore
{
  "verify_first": true,
  "create_safety_backup": true
}
```

### Delete Backup
```bash
DELETE /api/v1/backups/{backup_id}
```

### Cleanup Old Backups
```bash
POST /api/v1/backups/cleanup
{
  "keep_count": 30,
  "older_than_days": 90,
  "delete_failed": true
}
```

### Backup Status
```bash
GET /api/v1/backups/status
```

### Backup Statistics
```bash
GET /api/v1/backups/stats
```

---

## Common Response Codes

- `200 OK` - Success
- `201 Created` - Resource created (backups)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `409 Conflict` - Data conflict
- `413 Payload Too Large` - File too large
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

---

## Import Modes

- `insert_only` - Only insert new records
- `update_only` - Only update existing records
- `upsert` - Insert new, update existing
- `replace` - Delete all, then insert

---

## Conflict Resolution

- `skip` - Skip conflicting records
- `overwrite` - Overwrite with import data
- `merge` - Merge fields (import takes precedence)
- `fail` - Fail on any conflict

---

## Export Formats

- `json` - JSON format (default)
- `csv` - CSV format

---

## Quick Examples

### Export and Import Workflow
```bash
# 1. Export clients
curl -X POST http://localhost:8000/api/v1/export/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"client_ids":["uuid1"],"format":"json"}' \
  > export.json

# 2. Validate import
curl -X POST http://localhost:8000/api/v1/import/validate \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@export.json"

# 3. Import
curl -X POST http://localhost:8000/api/v1/import/execute \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@export.json" \
  -F "import_mode=upsert" \
  -F "create_backup=true"
```

### Backup and Restore Workflow
```bash
# 1. Create backup
curl -X POST http://localhost:8000/api/v1/backups/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"encrypt":true,"compress":true,"verify":true}'

# Response: {"backup_id": "backup_20231116_143022", ...}

# 2. List backups
curl -X GET http://localhost:8000/api/v1/backups/list \
  -H "Authorization: Bearer $TOKEN"

# 3. Restore (if needed)
curl -X POST http://localhost:8000/api/v1/backups/backup_20231116_143022/restore \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verify_first":true,"create_safety_backup":true}'
```

---

## File Locations

- **Schemas:** `/backend/app/schemas_sqlite/data_portability.py`
- **Export Routes:** `/backend/app/api/routes_sqlite/export.py`
- **Import Routes:** `/backend/app/api/routes_sqlite/import_routes.py`
- **Backup Routes:** `/backend/app/api/routes_sqlite/backup.py`
- **Tests:** `/backend/tests/api/test_*_routes.py`

---

## Documentation

- **Full Report:** `/backend/TASK_205_API_ENDPOINTS_REPORT.md`
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Support

For detailed information, see:
- TASK_205_API_ENDPOINTS_REPORT.md
- OpenAPI documentation at /docs
- Individual route files for implementation details
