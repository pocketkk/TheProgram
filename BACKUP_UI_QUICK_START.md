# Backup UI Quick Start Guide

**Quick reference for using the backup management UI**

---

## Accessing the Backup Dashboard

1. **Via Sidebar**: Click "Backups" in the left navigation
2. **Via Dashboard**: Click "Backup & Restore" in Quick Actions

---

## Creating a Backup

1. Click "Create Backup" button (top right)
2. Configure options:
   - ✅ Encrypt backup (recommended)
   - ✅ Compress backup (recommended)
   - ✅ Verify after creation (recommended)
   - Add optional description
3. Click "Create Backup"
4. Wait for success message
5. Backup appears in list automatically

---

## Restoring from Backup

1. Click "Restore" button (top right)
2. **Select**: Choose a verified backup from list
3. **Verify**: Automatic verification (if needed)
4. **Confirm**: 
   - Read warning about data replacement
   - ✅ Check "Create safety backup" (required)
   - ✅ Check "I understand this cannot be undone"
5. **Execute**: Click "Restore Database"
6. **Complete**: Click "Reload Application"

---

## Scheduling Automatic Backups

1. Click "Schedule" button
2. Toggle "Automatic Backups" ON
3. Select frequency:
   - Hourly
   - Daily (set hour 0-23)
   - Weekly (set day and hour)
   - Custom (cron expression)
4. Configure backup options
5. Set retention policy (keep last N backups)
6. Click "Save Schedule Settings"

---

## Viewing Backup Details

1. Click on any backup row
2. View complete metadata:
   - Status, size, creation date
   - Record counts by table
   - Security information
   - Description and tags
3. Quick actions:
   - Verify (if not verified)
   - Restore
   - Download
   - Delete

---

## Bulk Operations

1. Select checkboxes next to backups
2. Click "Delete Selected" to remove multiple backups

---

## Cleanup Old Backups

1. Click "Cleanup" button
2. Confirm deletion
3. Keeps last 30 backups (configurable)

---

## Status Cards

**Dashboard shows:**
- Total Backups count
- Verified Backups count
- Storage Used (total size)
- Last Backup (time ago)

---

## Backup Properties

**Icons indicate:**
- 🔒 Encrypted (AES-256)
- 📦 Compressed (gzip)
- ✅ Verified (integrity checked)

---

## File Locations (for developers)

```
frontend/src/
├── types/backup.ts                      # TypeScript types
├── lib/api/backup.ts                    # API client
├── features/data-portability/
│   ├── BackupDashboard.tsx             # Main page
│   ├── hooks/useBackups.ts             # React hook
│   └── components/
│       ├── CreateBackupDialog.tsx
│       ├── RestoreBackupDialog.tsx
│       ├── BackupDetailsModal.tsx
│       ├── BackupList.tsx
│       ├── BackupStorageChart.tsx
│       └── BackupScheduleSettings.tsx
```

---

## API Endpoints Used

All from `/api/v1/backups`:
- `POST /create` - Create backup
- `GET /list` - List backups
- `POST /{id}/verify` - Verify
- `POST /{id}/restore` - Restore
- `DELETE /{id}` - Delete
- `POST /cleanup` - Cleanup
- `GET /status` - Status
- `GET /stats` - Statistics
- `GET /{id}/download` - Download

---

## Troubleshooting

**No backups showing?**
- Check if backend is running
- Verify authentication token
- Check browser console for errors

**Restore failing?**
- Ensure backup is verified
- Check disk space
- Verify encryption password (if applicable)

**Schedule not saving?**
- Backend schedule API may not be implemented yet
- Frontend is ready, waiting for backend

---

**Need Help?** Check the full documentation in TASK_209_FRONTEND_BACKUP_UI_COMPLETE.md
