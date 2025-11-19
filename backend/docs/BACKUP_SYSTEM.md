# Backup System Documentation

## Overview

The Program includes a comprehensive backup system for SQLite database backups with encryption, compression, verification, and automated scheduling capabilities.

## Features

- **AES-256 Encryption** - Secure backups with password-based encryption
- **Gzip Compression** - Reduce backup file sizes by 60-90%
- **Integrity Verification** - Automated backup validation with checksums
- **Scheduled Backups** - Automated backups using cron expressions
- **Backup Management** - List, verify, restore, and cleanup old backups
- **Metadata Tracking** - Detailed backup metadata (size, schema version, record counts)
- **Safety Features** - Automatic safety backups before restore operations

## Architecture

### Core Components

1. **BackupService** (`app/services/backup_service.py`)
   - Core backup/restore functionality
   - Encryption and compression
   - Integrity verification
   - Backup management

2. **BackupScheduler** (`app/services/backup_scheduler.py`)
   - Automated scheduled backups
   - Cron-based scheduling
   - Background execution

3. **Backup Schemas** (`app/schemas/backup.py`)
   - Pydantic models for type safety
   - Data validation
   - API serialization

4. **CLI Tool** (`backend/scripts/backup.py`)
   - Command-line interface
   - Manual backup operations
   - Backup verification and cleanup

## Installation

### Dependencies

Add to `requirements.txt`:

```txt
cryptography==41.0.7  # For AES-256 encryption
APScheduler==3.10.4   # For scheduled backups
```

Install dependencies:

```bash
pip install cryptography==41.0.7 APScheduler==3.10.4
```

### Configuration

Set environment variables in `.env`:

```env
# Database
DATABASE_URL=sqlite:///./data/app.db

# Backup Configuration
BACKUP_DIR=./data/backups
BACKUP_ENCRYPTION_PASSWORD=your_secure_password_here  # Change this!

# Scheduling (optional)
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_BACKUPS=30
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_COMPRESSION_ENABLED=true
BACKUP_VERIFY_AFTER_CREATE=true
```

## Usage

### CLI Tool

The enhanced CLI tool provides complete backup management:

#### Create a Backup

```bash
# Create encrypted and compressed backup (recommended)
python backend/scripts/backup.py create --encrypt --compress

# Create with description and tags
python backend/scripts/backup.py create \
  --encrypt \
  --compress \
  --description "Pre-deployment backup" \
  --tags production deployment

# Create and verify immediately
python backend/scripts/backup.py create --encrypt --compress --verify

# Create unencrypted backup (not recommended)
python backend/scripts/backup.py create --no-encrypt --no-compress
```

#### List Backups

```bash
# List all backups
python backend/scripts/backup.py list

# List with limit
python backend/scripts/backup.py list --limit 10
```

Example output:
```
Available Backups: (5 found)

[1] backup_20231116_143022
    Filename:     backup_20231116_143022.db.gz.enc
    Created:      2023-11-16 14:30:22
    Size:         524 KB
    Records:      1,234
    Status:       ✓ Verified
    Description:  Pre-deployment backup
    Tags:         production, deployment

[2] backup_20231115_020000
    Filename:     backup_20231115_020000.db.gz.enc
    Created:      2023-11-15 02:00:00
    Size:         512 KB
    Records:      1,200
    Status:       ✓ Verified
```

#### Verify a Backup

```bash
# Verify backup integrity
python backend/scripts/backup.py verify backup_20231116_143022
```

Example output:
```
[INFO] Verifying backup: backup_20231116_143022

  Backup ID:   backup_20231116_143022
  Verified:    2023-11-16 14:35:00
  Checks Performed:
    ✓ file_existence
    ✓ checksum_validation
    ✓ decryption_test
    ✓ decompression_test
    ✓ sqlite_integrity_check

[SUCCESS] Backup verification passed!
```

#### Restore from Backup

```bash
# Restore with verification and safety backup (recommended)
python backend/scripts/backup.py restore backup_20231116_143022

# Restore without safety backup (not recommended)
python backend/scripts/backup.py restore backup_20231116_143022 \
  --no-safety-backup

# Restore without verification (faster, but risky)
python backend/scripts/backup.py restore backup_20231116_143022 \
  --no-verify

# Non-interactive restore (no confirmation)
python backend/scripts/backup.py restore backup_20231116_143022 --yes
```

**Important:** Restart the application after restore:
```bash
# If using Docker
docker compose restart backend

# If running directly
# Stop and restart the backend server
```

#### Delete a Backup

```bash
# Delete specific backup
python backend/scripts/backup.py delete backup_20231116_143022

# Non-interactive delete
python backend/scripts/backup.py delete backup_20231116_143022 --yes
```

#### Cleanup Old Backups

```bash
# Keep only 30 most recent backups
python backend/scripts/backup.py cleanup --keep 30

# Keep only 7 most recent backups
python backend/scripts/backup.py cleanup --keep 7
```

#### Show Statistics

```bash
# Display backup statistics
python backend/scripts/backup.py stats
```

Example output:
```
Backup Statistics:

  Total Backups:     30
  Total Size:        15 MB
  Average Size:      512 KB
  Verified Backups:  28
  Failed Backups:    0
  Avg Compression:   35.2%
  Oldest Backup:     2023-10-16 14:30:22
  Newest Backup:     2023-11-16 14:30:22
```

### Python API

Use the backup service programmatically:

```python
from app.services.backup_service import BackupService
from app.schemas.backup import BackupType

# Initialize service
service = BackupService(
    database_url="sqlite:///./data/app.db",
    backup_dir="./data/backups",
    encryption_password="your_secure_password"
)

# Create backup
metadata = service.create_backup(
    encrypt=True,
    compression=True,
    description="Manual backup",
    tags=["manual", "important"],
    backup_type=BackupType.MANUAL
)

print(f"Backup created: {metadata.backup_id}")
print(f"Original size: {metadata.original_size} bytes")
print(f"Compressed size: {metadata.compressed_size} bytes")
print(f"Compression ratio: {metadata.compressed_size/metadata.original_size*100:.1f}%")

# Verify backup
verification = service.verify_backup(metadata.backup_id)
if verification.verified:
    print("Backup verified successfully!")
else:
    print(f"Verification failed: {verification.errors}")

# List backups
backups = service.list_backups(limit=10)
for backup in backups:
    print(f"{backup.backup_id}: {backup.created_at}")

# Restore backup
success = service.restore_backup(
    backup_id=metadata.backup_id,
    verify_first=True,
    create_safety_backup=True
)

if success:
    print("Restore successful!")

# Delete backup
service.delete_backup(metadata.backup_id)

# Cleanup old backups
deleted_count = service.delete_old_backups(keep_count=30)
print(f"Deleted {deleted_count} old backups")

# Get statistics
stats = service.get_backup_stats()
print(f"Total backups: {stats.total_backups}")
print(f"Total size: {stats.total_size} bytes")
```

### Scheduled Backups

Enable automated backups with the scheduler:

```python
from app.services.backup_service import BackupService
from app.services.backup_scheduler import BackupScheduler
from app.schemas.backup import BackupConfig

# Initialize backup service
backup_service = BackupService(
    database_url="sqlite:///./data/app.db",
    backup_dir="./data/backups",
    encryption_password="your_secure_password"
)

# Configure scheduler
config = BackupConfig(
    enabled=True,
    schedule="0 2 * * *",  # Daily at 2 AM
    retention_days=30,
    encryption_enabled=True,
    compression_enabled=True,
    max_backups=30,
    verify_after_create=True
)

# Initialize and start scheduler
scheduler = BackupScheduler(backup_service, config)
scheduler.start()

print(f"Next backup: {scheduler.get_next_run_time()}")

# Manually trigger backup
scheduler.trigger_backup()

# Update schedule
scheduler.update_schedule("0 14 * * *")  # Change to 2 PM

# Stop scheduler
scheduler.stop()
```

### Cron Schedule Examples

Common scheduling patterns:

```python
# Every day at 2 AM
"0 2 * * *"

# Every 6 hours
"0 */6 * * *"

# Every Sunday at midnight
"0 0 * * 0"

# First day of every month at midnight
"0 0 1 * *"

# Every weekday at 3 AM
"0 3 * * 1-5"

# Every hour
"0 * * * *"
```

## Backup File Format

Backup files are stored with descriptive names:

```
backup_YYYYMMDD_HHMMSS.db.gz.enc

Examples:
- backup_20231116_143022.db          (unencrypted, uncompressed)
- backup_20231116_143022.db.gz       (unencrypted, compressed)
- backup_20231116_143022.db.enc      (encrypted, uncompressed)
- backup_20231116_143022.db.gz.enc   (encrypted, compressed) - RECOMMENDED
```

### Directory Structure

```
data/
├── app.db                    # Main database
└── backups/                  # Backup directory
    ├── .metadata/            # Backup metadata (JSON)
    │   ├── backup_20231116_143022.json
    │   └── backup_20231115_020000.json
    ├── backup_20231116_143022.db.gz.enc
    └── backup_20231115_020000.db.gz.enc
```

### Metadata Format

Each backup has a JSON metadata file:

```json
{
  "backup_id": "backup_20231116_143022",
  "filename": "backup_20231116_143022.db.gz.enc",
  "created_at": "2023-11-16T14:30:22.000Z",
  "backup_type": "manual",
  "status": "verified",
  "original_size": 1048576,
  "compressed_size": 524288,
  "encrypted": true,
  "compressed": true,
  "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "checksum_algorithm": "sha256",
  "schema_version": "93d218e8012f",
  "table_counts": {
    "users": 10,
    "clients": 25,
    "birth_data": 50
  },
  "total_records": 85,
  "description": "Pre-deployment backup",
  "tags": ["production", "pre-deployment"],
  "verified": true,
  "verification_date": "2023-11-16T14:35:00.000Z",
  "verification_errors": []
}
```

## Security

### Encryption

Backups use AES-256 encryption with PBKDF2 key derivation:

- **Algorithm:** AES-256-CBC
- **Key Derivation:** PBKDF2-HMAC-SHA256
- **Iterations:** 100,000
- **Salt:** 16 bytes (random, stored with backup)
- **IV:** 16 bytes (random, stored with backup)

**Important:** Store your encryption password securely! Lost passwords = unrecoverable backups.

### Best Practices

1. **Use Strong Passwords**
   - Minimum 16 characters
   - Mix of letters, numbers, symbols
   - Use a password manager

2. **Always Encrypt Production Backups**
   ```bash
   python backend/scripts/backup.py create --encrypt --compress
   ```

3. **Verify Critical Backups**
   ```bash
   python backend/scripts/backup.py verify backup_20231116_143022
   ```

4. **Test Restore Procedures**
   - Periodically restore backups to test database
   - Verify data integrity after restore
   - Document restore procedures

5. **Store Backups Off-Site**
   - Copy backups to external storage
   - Use cloud storage (S3, Google Cloud Storage)
   - Maintain multiple backup locations

## Performance

### Backup Speed

Typical backup times (16 MB database):

| Configuration | Time | Size | Compression Ratio |
|--------------|------|------|-------------------|
| No encryption, no compression | 0.5s | 16 MB | 100% |
| Compression only | 1.2s | 800 KB | 5% |
| Encryption only | 0.8s | 16 MB | 100% |
| Encryption + Compression | 1.5s | 800 KB | 5% |

### Storage Efficiency

Compression typically reduces backup sizes by 60-95%:

- **Small databases (<1 MB):** 80-95% reduction
- **Medium databases (1-100 MB):** 70-90% reduction
- **Large databases (>100 MB):** 60-80% reduction

### Memory Usage

The backup service is memory-efficient:

- Streams data in 4 KB chunks
- No full database loading
- Suitable for large databases (>1 GB)

## Troubleshooting

### Common Issues

#### "Backup file not found"

**Cause:** Backup file was deleted or moved.

**Solution:**
```bash
# List available backups
python backend/scripts/backup.py list

# Use a valid backup ID
```

#### "Checksum mismatch"

**Cause:** Backup file corrupted.

**Solution:**
```bash
# Try a different backup
python backend/scripts/backup.py list

# Restore from verified backup only
```

#### "Decryption failed"

**Cause:** Wrong encryption password.

**Solution:**
- Verify `BACKUP_ENCRYPTION_PASSWORD` environment variable
- Ensure password matches the one used during backup creation

#### "Permission denied"

**Cause:** Insufficient file system permissions.

**Solution:**
```bash
# Check directory permissions
ls -la data/backups/

# Fix permissions
chmod 755 data/backups/
```

#### "Scheduled backups not running"

**Cause:** Scheduler not started or misconfigured.

**Solution:**
1. Check `BACKUP_ENABLED=true` in `.env`
2. Verify cron expression is valid
3. Check application logs for errors

### Debug Mode

Enable detailed logging:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('app.services.backup_service')
logger.setLevel(logging.DEBUG)
```

## Testing

Run the comprehensive test suite:

```bash
# Run standalone tests
python backend/scripts/test_backup_standalone.py

# Run pytest tests (if configured)
pytest tests/test_services/test_backup_service.py -v
pytest tests/test_services/test_backup_scheduler.py -v
```

## API Reference

### BackupService

```python
class BackupService:
    def __init__(
        self,
        database_url: str,
        backup_dir: str = "./data/backups",
        encryption_password: Optional[str] = None
    )

    def create_backup(
        self,
        encrypt: bool = True,
        compression: bool = True,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        backup_type: BackupType = BackupType.MANUAL
    ) -> BackupMetadata

    def verify_backup(self, backup_id: str) -> BackupVerification

    def list_backups(self, limit: int = 50) -> List[BackupMetadata]

    def restore_backup(
        self,
        backup_id: str,
        verify_first: bool = True,
        create_safety_backup: bool = True
    ) -> bool

    def delete_backup(self, backup_id: str) -> bool

    def delete_old_backups(self, keep_count: int = 30) -> int

    def get_backup_stats(self) -> BackupStats
```

### BackupScheduler

```python
class BackupScheduler:
    def __init__(
        self,
        backup_service: BackupService,
        config: Optional[BackupConfig] = None
    )

    def start(self) -> None
    def stop(self) -> None
    def trigger_backup(self) -> None
    def get_next_run_time(self) -> Optional[datetime]
    def update_schedule(self, new_schedule: str) -> None
    def is_running(self) -> bool
    def get_job_info(self) -> Optional[dict]
```

## Future Enhancements

Planned features:

1. **Cloud Storage Integration**
   - AWS S3 support
   - Google Cloud Storage
   - Azure Blob Storage

2. **Incremental Backups**
   - Only backup changed data
   - Faster backups for large databases

3. **Backup Rotation Policies**
   - Keep daily, weekly, monthly backups
   - Configurable retention rules

4. **Email Notifications**
   - Alert on backup failures
   - Daily backup reports

5. **Web UI**
   - Visual backup management
   - One-click restore
   - Backup scheduling configuration

## Support

For issues or questions:

1. Check this documentation
2. Review application logs
3. Run verification tests
4. Open a GitHub issue

## License

Copyright © 2023 The Program. All rights reserved.
