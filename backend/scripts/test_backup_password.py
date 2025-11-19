#!/usr/bin/env python3
"""
Test backup password keyring functionality

Verifies that the password can be stored and retrieved from the system keyring.
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.utils.secure_keyring import (
    get_backup_password,
    has_password_configured,
    validate_password_strength
)


def main():
    """Test keyring functionality"""
    print("=" * 60)
    print("  Backup Password Keyring Test")
    print("=" * 60)
    print()

    # Check if password is configured
    if not has_password_configured():
        print("❌ No password configured in keyring")
        print()
        print("Run this command to set up a password:")
        print("  python scripts/setup_backup_password.py")
        print()
        return 1

    # Retrieve password
    try:
        password = get_backup_password()
    except Exception as e:
        print(f"❌ Error retrieving password: {e}")
        return 1

    if password is None:
        print("❌ Password is None (unexpected)")
        return 1

    print("✅ Password retrieved from keyring successfully")
    print()
    print(f"Password length: {len(password)} characters")
    print(f"Password (masked): {'*' * min(len(password), 20)}")
    print()

    # Validate password strength
    is_valid, issues = validate_password_strength(password)

    if is_valid:
        print("✅ Password meets security requirements")
    else:
        print("⚠️  Password validation warnings:")
        for issue in issues:
            print(f"  • {issue}")

    print()
    print("=" * 60)
    print("  Test completed successfully!")
    print("=" * 60)
    print()
    print("The password is ready to use for encrypted backups.")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
