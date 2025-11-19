"""
Secure password management using system keyring

Stores backup encryption passwords securely in the OS credential storage:
- Linux: Secret Service (GNOME Keyring, KWallet)
- macOS: Keychain
- Windows: Credential Vault
"""
import keyring
import getpass
import re
from typing import Optional


SERVICE_NAME = "theprogram_backup"
USERNAME = "encryption_key"


def set_backup_password(password: str) -> None:
    """
    Store backup encryption password in system keyring

    Args:
        password: The password to store

    Raises:
        keyring.errors.PasswordSetError: If password storage fails
    """
    keyring.set_password(SERVICE_NAME, USERNAME, password)


def get_backup_password() -> Optional[str]:
    """
    Retrieve backup encryption password from system keyring

    Returns:
        Password if found, None otherwise
    """
    return keyring.get_password(SERVICE_NAME, USERNAME)


def delete_backup_password() -> None:
    """
    Delete backup encryption password from system keyring

    Does not raise error if password doesn't exist.
    """
    try:
        keyring.delete_password(SERVICE_NAME, USERNAME)
    except keyring.errors.PasswordDeleteError:
        pass  # Password not found, that's OK


def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Validate password strength

    Requirements:
    - At least 12 characters
    - At most 128 characters
    - Contains uppercase letters
    - Contains lowercase letters
    - Contains numbers
    - Contains special characters (recommended but not required)

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, list_of_issues)
    """
    issues = []

    if len(password) < 12:
        issues.append("Password must be at least 12 characters")

    if len(password) > 128:
        issues.append("Password must be less than 128 characters")

    if not re.search(r'[A-Z]', password):
        issues.append("Password must contain uppercase letters")

    if not re.search(r'[a-z]', password):
        issues.append("Password must contain lowercase letters")

    if not re.search(r'[0-9]', password):
        issues.append("Password must contain numbers")

    # Special characters are recommended but not required
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;~`]', password):
        issues.append("Warning: Password should contain special characters (recommended)")

    # Only fail if there are actual errors (not warnings)
    has_errors = any(issue.startswith("Password must") for issue in issues)

    return not has_errors, issues


def prompt_for_password() -> str:
    """
    Prompt user for password with confirmation and validation

    Continues prompting until a valid password is provided.

    Returns:
        Validated password
    """
    while True:
        password = getpass.getpass("Enter backup encryption password: ")

        # Validate password strength
        is_valid, issues = validate_password_strength(password)

        if not is_valid:
            print("\nPassword validation failed:")
            for issue in issues:
                if issue.startswith("Password must"):
                    print(f"  ❌ {issue}")
                else:
                    print(f"  ⚠️  {issue}")
            print()
            continue

        # Show warnings but allow
        warnings = [i for i in issues if not i.startswith("Password must")]
        if warnings:
            for warning in warnings:
                print(f"  ⚠️  {warning}")

        # Confirm password
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("❌ Passwords don't match\n")
            continue

        return password


def ensure_password_configured() -> str:
    """
    Ensure password is configured in keyring

    If no password is found, prompts the user to set one.

    Returns:
        The password (from keyring or newly set)

    Raises:
        KeyboardInterrupt: If user cancels password entry
    """
    password = get_backup_password()

    if password is None:
        print("\n" + "=" * 60)
        print("  Backup Encryption Password Required")
        print("=" * 60)
        print()
        print("No backup encryption password found in system keyring.")
        print("Please set a strong password for backup encryption.")
        print()
        print("Requirements:")
        print("  • At least 12 characters")
        print("  • Include uppercase and lowercase letters")
        print("  • Include numbers")
        print("  • Special characters recommended")
        print()

        password = prompt_for_password()
        set_backup_password(password)
        print("\n✅ Password saved securely to system keyring")

    return password


def has_password_configured() -> bool:
    """
    Check if a backup password is already configured

    Returns:
        True if password exists in keyring, False otherwise
    """
    return get_backup_password() is not None
