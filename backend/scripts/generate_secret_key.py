#!/usr/bin/env python3
"""
The Program - Secret Key Generator

Generates a secure random secret key for JWT token signing.
This should be run once and the output added to your .env file.
"""

import secrets


def generate_secret_key() -> str:
    """Generate a secure random secret key"""
    return secrets.token_hex(32)


def main():
    """Generate and display secret key"""
    print("\n" + "=" * 70)
    print("  Secret Key Generator")
    print("=" * 70)
    print("\nGenerated SECRET_KEY:\n")

    key = generate_secret_key()
    print(f"  {key}")

    print("\n" + "-" * 70)
    print("Add this to your .env file:")
    print(f"  SECRET_KEY={key}")
    print("=" * 70 + "\n")

    return 0


if __name__ == "__main__":
    exit(main())
