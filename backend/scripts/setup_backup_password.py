#!/usr/bin/env python3
"""
Setup backup encryption password in system keyring

Run this script once to securely store the backup encryption password
in your operating system's credential storage.
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.utils.secure_keyring import (
    prompt_for_password,
    set_backup_password,
    get_backup_password,
    has_password_configured
)


def main():
    """Main setup function"""
    print("=" * 60)
    print("  Backup Encryption Password Setup")
    print("=" * 60)
    print()
    print("This will set the encryption password for database backups.")
    print("The password will be stored securely in your system keyring:")
    print("  • Linux: Secret Service (GNOME Keyring/KWallet)")
    print("  • macOS: Keychain")
    print("  • Windows: Credential Vault")
    print()
    print("Requirements:")
    print("  • Minimum 12 characters")
    print("  • Include uppercase, lowercase, numbers")
    print("  • Include special characters (recommended)")
    print()

    # Check if password already exists
    if has_password_configured():
        existing = get_backup_password()
        print("⚠️  A password is already configured in the keyring.")
        print(f"   Password (masked): {'*' * min(len(existing), 12)}")
        print()
        choice = input("Replace existing password? (y/N): ").strip().lower()
        if choice != 'y':
            print("\nCancelled. Existing password unchanged.")
            return 0

    # Get new password
    try:
        password = prompt_for_password()
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
        return 1

    # Save to keyring
    try:
        set_backup_password(password)
    except Exception as e:
        print(f"\n❌ Error saving password to keyring: {e}")
        return 1

    print()
    print("=" * 60)
    print("  ✅ Success!")
    print("=" * 60)
    print()
    print("Password saved securely to system keyring.")
    print("You can now create encrypted backups.")
    print()
    print("To verify, run:")
    print("  python scripts/test_backup_password.py")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
