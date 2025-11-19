# Backup Password Setup Guide

Quick guide for setting up secure backup encryption passwords.

---

## First-Time Setup

### 1. Install Dependencies
```bash
pip install keyring>=25.0.0
```

### 2. Set Up Password
```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
source test_venv/bin/activate
python scripts/setup_backup_password.py
```

**Follow the prompts**:
- Enter a strong password (12+ characters)
- Include uppercase, lowercase, numbers, and special characters
- Confirm the password

**Example**:
```
Enter backup encryption password: ****************
Confirm password: ****************

✅ Success!
Password saved securely to system keyring.
```

### 3. Verify Setup
```bash
python scripts/test_backup_password.py
```

**Expected output**:
```
✅ Password retrieved from keyring successfully
✅ Password meets security requirements
```

---

## Using Encrypted Backups

### Create Encrypted Backup
```python
from app.services.backup_service import BackupService

# Password automatically retrieved from keyring
backup_service = BackupService(
    database_url="sqlite:///./data/theprogram.db",
    backup_dir="./data/backups"
)

# Create encrypted, compressed backup
result = backup_service.create_backup(
    encrypt=True,
    compress=True
)

print(f"Backup created: {result['backup_path']}")
```

### Restore from Encrypted Backup
```python
# Password automatically retrieved from keyring
backup_service.restore_backup(
    backup_id="backup_20251116_143022"
)
```

---

## Password Management

### Change Password
```bash
python scripts/setup_backup_password.py
# Choose 'y' when prompted to replace existing password
```

### Check if Password is Set
```python
from app.utils.secure_keyring import has_password_configured

if has_password_configured():
    print("✅ Password is configured")
else:
    print("❌ No password set")
```

### Remove Password
```python
from app.utils.secure_keyring import delete_backup_password

delete_backup_password()
print("Password removed from keyring")
```

---

## Password Requirements

- ✅ Minimum 12 characters
- ✅ Maximum 128 characters
- ✅ Contains uppercase letters (A-Z)
- ✅ Contains lowercase letters (a-z)
- ✅ Contains numbers (0-9)
- ⚠️ Contains special characters (recommended)

**Good examples**:
- `MySecureBackup2024!`
- `Astronomy#DataProtection99`
- `TheProgram$Backup@2024`

**Bad examples**:
- `password` (too short, no variety)
- `Password1` (too short, predictable)
- `12345678` (no letters, predictable)

---

## Troubleshooting

### "No keyring backend found"
**Linux**: Install keyring service
```bash
sudo apt-get install gnome-keyring  # For GNOME
sudo apt-get install kwalletmanager  # For KDE
```

**Headless servers**: Use key file approach (see Advanced section)

### "Permission denied" accessing keyring
```bash
# Unlock keyring
gnome-keyring-daemon --unlock
```

### "Password not found in keyring"
Run setup again:
```bash
python scripts/setup_backup_password.py
```

### SSH Session Issues
Set up D-Bus for keyring access:
```bash
export $(dbus-launch)
```

---

## Advanced: Using Key Files (Headless Servers)

For servers without keyring support, use key files:

### Generate Key File
```python
from app.utils.secure_keyring import set_backup_password
import secrets
import os

# Generate random 256-bit key
key = secrets.token_hex(32)

# Save to file with restrictive permissions
key_path = "/secure/path/backup.key"
with open(key_path, 'w') as f:
    f.write(key)
os.chmod(key_path, 0o600)  # Read/write for owner only

# Store in keyring OR pass to BackupService
set_backup_password(key)
```

### Use Key File
```python
# Read key from file
with open('/secure/path/backup.key', 'r') as f:
    encryption_key = f.read().strip()

# Pass to BackupService directly
backup_service = BackupService(
    database_url="sqlite:///./data/theprogram.db",
    encryption_password=encryption_key  # Use key instead of keyring
)
```

**Security Notes**:
- Keep key file in secure location
- Set permissions to 0600 (owner read/write only)
- Never commit key files to version control
- Back up key file separately
- Rotate keys periodically

---

## Security Best Practices

### DO ✅
- Use system keyring when available
- Use strong, unique passwords
- Rotate passwords periodically
- Keep secure backup of password
- Test backups regularly
- Use encryption in production

### DON'T ❌
- Store passwords in .env files
- Commit passwords to version control
- Use weak or default passwords
- Share passwords via email/chat
- Reuse passwords from other systems
- Skip password setup in production

---

## Production Deployment

### 1. Initial Setup
```bash
# On production server
cd /path/to/theprogram/backend
python scripts/setup_backup_password.py
```

### 2. Verify
```bash
python scripts/test_backup_password.py
```

### 3. Document
Save password in secure password manager (1Password, LastPass, etc.) with label:
```
System: The Program - Production Backup Encryption
Type: Encryption Key
Rotation: Quarterly
```

### 4. Test Restore
```bash
# Create test backup
python scripts/create_backup.py --encrypt --compress

# Test restore to temp location
python scripts/restore_backup.py --backup-id <id> --test
```

---

## FAQ

**Q: Where is the password stored?**
A: In your OS credential storage (Keyring/Keychain/Credential Vault)

**Q: Can I use different passwords for different environments?**
A: Yes, keyring is per-user. Each environment can have its own password.

**Q: What if I forget the password?**
A: Encrypted backups cannot be decrypted. Keep secure backup of password.

**Q: How do I rotate the password?**
A: Run setup script again, create new backups with new password, securely delete old backups.

**Q: Is this secure for production?**
A: Yes, this is production-grade security using OS-level encryption.

**Q: Can I automate backups without manual password entry?**
A: Yes, once password is in keyring, backups are fully automated.

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review system keyring documentation
3. Test with `scripts/test_backup_password.py`
4. Check system logs for keyring errors

---

**Last Updated**: 2025-11-16
