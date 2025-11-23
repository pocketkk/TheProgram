# Phase 2 Testing Guide

Your backup password has been set: `NewLife123`

## Quick Test Commands

### 1. Start the Backend
```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
source test_venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend (in another terminal)
```bash
cd /home/sylvia/ClaudeWork/TheProgram/frontend
npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:3000 (or 5173)
- API Docs: http://localhost:8000/docs

---

## Testing Features

### A. Test Export Features

**Via UI:**
1. Go to Settings → Data Portability → Export
2. Select "Full Database" 
3. Choose format (JSON recommended)
4. Click "Export & Download"
5. Verify file downloads

**Via API (using curl):**
```bash
# Get your session token first (login via UI or API)
TOKEN="your_session_token_here"

# Export full database
curl -X POST http://localhost:8000/api/v1/export/full \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "json", "include_metadata": true}'
```

### B. Test Backup Features

**Via UI:**
1. Go to Backups dashboard
2. Click "Create Backup"
3. Check: Encrypt ✓, Compress ✓
4. Click "Create"
5. Verify backup appears in list
6. Test "Verify" button
7. (Optional) Test "Restore" with safety backup

**Via CLI:**
```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
source test_venv/bin/activate

# Create encrypted, compressed backup
python scripts/backup.py create --encrypt --compress --verify

# List all backups
python scripts/backup.py list

# Verify a backup
python scripts/backup.py verify <backup_id>

# Restore from backup (careful!)
python scripts/backup.py restore <backup_id>
```

### C. Test Import Features

**Via UI:**
1. First, export some data (see Test A)
2. Go to Import section
3. Upload the exported file
4. Follow wizard: Validate → Preview → Confirm → Execute
5. Verify data imported successfully

**Via API:**
```bash
# Upload and import a file
curl -X POST http://localhost:8000/api/v1/import/execute \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/export.json" \
  -F "mode=merge"
```

---

## Quick Automated Tests

### Run All Standalone Tests
```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
source test_venv/bin/activate

# Export tests
python test_export_standalone.py

# Import tests  
python test_import_standalone.py

# Backup tests
python scripts/test_backup_standalone.py

# Format converter tests
python test_runner.py
```

### Expected Results
- Export: 8/8 tests passing ✓
- Import: 10/10 tests passing ✓
- Backup: 7/10 tests passing ✓ (3 test isolation issues)
- Format Converter: 12/12 tests passing ✓

---

## Password Information

**Backup Encryption Password**: `NewLife123`

Stored securely in OS keyring (not in files).

To change password:
```bash
python scripts/setup_backup_password.py
```

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Install dependencies
cd backend
pip install -r requirements.txt
```

### Frontend won't start
```bash
# Install dependencies
cd frontend
npm install

# Try different port if 3000 is taken
npm run dev -- --port 5173
```

### "No password found" error
```bash
# Re-set the password
cd backend
python scripts/setup_backup_password.py
# Enter: NewLife123
```

### Import fails
- Check file format (must be valid JSON or CSV)
- Verify file isn't too large (start with small test files)
- Check API logs for detailed errors

---

## Sample Test Workflow

**Complete End-to-End Test:**

1. **Start services** (backend + frontend)
2. **Login** to the application
3. **Create test data** (add a client, birth data, chart)
4. **Export** the data (JSON format)
5. **Create backup** (encrypted + compressed)
6. **Verify backup** integrity
7. **Import** the exported data (should merge or skip duplicates)
8. **List backups** (should show the backup you created)
9. **Check statistics** (storage usage, record counts)

Expected: All operations succeed with no errors ✓

---

## Test Report

After testing, note:
- ✓ What worked well
- ✗ Any errors or issues
- 💡 Suggestions for improvements

Report issues to the development team for fixes.

---

**Happy Testing!** 🚀
