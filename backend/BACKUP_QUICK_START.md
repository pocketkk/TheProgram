# Backup System - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd backend
pip install cryptography==41.0.7 APScheduler==3.10.4
```

### 2. Configure

Add to `.env`:

```env
BACKUP_ENCRYPTION_PASSWORD=CHANGE_ME_TO_SECURE_PASSWORD_123!
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
```

### 3. Create Your First Backup

```bash
python scripts/backup.py create --encrypt --compress --verify
```

## Common Commands

```bash
# Create backup
python scripts/backup.py create --encrypt --compress

# List backups
python scripts/backup.py list

# Verify backup
python scripts/backup.py verify backup_20231116_143022

# Restore backup
python scripts/backup.py restore backup_20231116_143022

# Show statistics
python scripts/backup.py stats

# Cleanup old backups (keep 30)
python scripts/backup.py cleanup --keep 30
```

## Daily Workflow

**Morning:**
```bash
# Check backup status
python scripts/backup.py stats
python scripts/backup.py list --limit 5
```

**Before Deployment:**
```bash
# Create tagged backup
python scripts/backup.py create \
  --encrypt \
  --compress \
  --description "Pre-deployment backup" \
  --tags production deployment \
  --verify
```

**After Issues:**
```bash
# List recent backups
python scripts/backup.py list --limit 10

# Restore
python scripts/backup.py restore backup_YYYYMMDD_HHMMSS
docker compose restart backend
```

**Weekly Maintenance:**
```bash
# Cleanup old backups
python scripts/backup.py cleanup --keep 30

# Verify latest backup
python scripts/backup.py verify $(python scripts/backup.py list --limit 1 | grep backup_ | awk '{print $2}')
```

## Automated Backups

Set in `.env`:

```env
# Daily at 2 AM
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_MAX_BACKUPS=30
```

Check next backup time:
```bash
python -c "
from app.services.backup_service import BackupService
from app.services.backup_scheduler import BackupScheduler
from app.schemas.backup import BackupConfig

service = BackupService('sqlite:///./data/app.db', './data/backups')
scheduler = BackupScheduler(service, BackupConfig())
scheduler.start()
print(f'Next backup: {scheduler.get_next_run_time()}')
scheduler.stop()
"
```

## Troubleshooting

**Import Error:**
```bash
pip install cryptography==41.0.7 APScheduler==3.10.4
```

**Permission Error:**
```bash
chmod 755 data/backups/
```

**Wrong Password:**
```bash
# Set in .env
BACKUP_ENCRYPTION_PASSWORD=your_password_here
```

## Security Checklist

- [ ] Use strong encryption password (16+ characters)
- [ ] Store password securely (password manager)
- [ ] Always encrypt production backups
- [ ] Verify critical backups after creation
- [ ] Test restore procedures monthly
- [ ] Store backups off-site
- [ ] Document recovery procedures

## Performance Tips

✅ **Best:** `--encrypt --compress` (96% compression!)
✅ **Verify:** Add `--verify` for critical backups
✅ **Schedule:** Use automated daily backups
✅ **Cleanup:** Keep 30 backups max

## Full Documentation

See `/backend/docs/BACKUP_SYSTEM.md` for comprehensive documentation.

## Quick Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `create` | Create backup | `create --encrypt --compress` |
| `list` | Show backups | `list --limit 10` |
| `verify` | Check integrity | `verify backup_20231116_143022` |
| `restore` | Restore database | `restore backup_20231116_143022` |
| `delete` | Remove backup | `delete backup_20231116_143022` |
| `cleanup` | Remove old backups | `cleanup --keep 30` |
| `stats` | Show statistics | `stats` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_ENCRYPTION_PASSWORD` | Required | Encryption password |
| `BACKUP_DIR` | `./data/backups` | Backup directory |
| `BACKUP_ENABLED` | `true` | Enable scheduled backups |
| `BACKUP_SCHEDULE` | `0 2 * * *` | Cron expression (daily 2 AM) |
| `BACKUP_MAX_BACKUPS` | `30` | Max backups to keep |

## Common Schedules

```bash
# Every day at 2 AM
"0 2 * * *"

# Every 6 hours
"0 */6 * * *"

# Every Sunday at midnight
"0 0 * * 0"

# First of month at midnight
"0 0 1 * *"

# Every weekday at 3 AM
"0 3 * * 1-5"
```

## Need Help?

1. Check `/backend/docs/BACKUP_SYSTEM.md`
2. Run tests: `python scripts/test_backup_standalone.py`
3. Check logs in console output
4. Verify configuration in `.env`
