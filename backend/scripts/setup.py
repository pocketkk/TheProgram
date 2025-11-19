#!/usr/bin/env python3
"""
The Program - Initial Setup Script

This script helps set up The Program for first-time use:
1. Checks for required dependencies
2. Creates necessary directories
3. Generates secure configuration
4. Initializes SQLite database
5. Creates initial password (if required)
"""

import os
import sys
import secrets
import hashlib
from pathlib import Path
from getpass import getpass

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def print_header(text: str):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70 + "\n")


def print_step(step: int, text: str):
    """Print a step indicator"""
    print(f"\n[{step}] {text}")
    print("-" * 70)


def check_dependencies():
    """Check if required Python packages are installed"""
    print_step(1, "Checking Dependencies")

    required_packages = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pydantic",
        "pyswisseph",
        "passlib",
        "python-jose",
        "anthropic",
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ✗ {package} - MISSING")
            missing.append(package)

    if missing:
        print("\n⚠️  Missing packages. Install with:")
        print(f"  pip install {' '.join(missing)}")
        print("\nOr install all requirements:")
        print("  pip install -r requirements.txt")
        return False

    print("\n✓ All dependencies installed")
    return True


def create_directories():
    """Create necessary directories"""
    print_step(2, "Creating Directories")

    base_dir = Path(__file__).parent.parent
    directories = [
        base_dir / "data",
        base_dir / "ephemeris",
        base_dir / "logs",
        base_dir / "storage" / "reports",
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ Created: {directory.relative_to(base_dir)}")

    print("\n✓ All directories created")
    return True


def generate_secret_key() -> str:
    """Generate a secure random secret key"""
    return secrets.token_hex(32)


def create_env_file():
    """Create .env file from .env.example"""
    print_step(3, "Creating Configuration File")

    base_dir = Path(__file__).parent.parent
    env_example = base_dir / ".env.example"
    env_file = base_dir / ".env"

    if env_file.exists():
        response = input("\n.env file already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("  Keeping existing .env file")
            return True

    if not env_example.exists():
        print("  ⚠️  .env.example not found")
        return False

    # Read template
    with open(env_example) as f:
        content = f.read()

    # Generate new secret key
    secret_key = generate_secret_key()
    print(f"\n  Generated SECRET_KEY: {secret_key[:20]}...")

    # Replace placeholder
    content = content.replace(
        "your-secret-key-change-this-in-production-use-openssl-rand-hex-32",
        secret_key
    )

    # Prompt for optional API keys
    print("\n  Optional API Keys (press Enter to skip):")

    anthropic_key = input("    Anthropic API Key: ").strip()
    if anthropic_key:
        content = content.replace("your-anthropic-api-key-here", anthropic_key)

    geonames_user = input("    GeoNames Username: ").strip()
    if geonames_user:
        content = content.replace("your_geonames_username", geonames_user)

    # Prompt for password requirement
    print("\n  Password Protection:")
    require_password = input("    Require password authentication? (Y/n): ").strip()
    if require_password.lower() == 'n':
        content = content.replace("REQUIRE_PASSWORD=true", "REQUIRE_PASSWORD=false")
        print("    Password protection disabled")
    else:
        print("    Password protection enabled")

    # Write .env file
    with open(env_file, 'w') as f:
        f.write(content)

    # Set secure permissions
    os.chmod(env_file, 0o600)

    print(f"\n✓ Configuration file created: {env_file}")
    return True


def initialize_database():
    """Initialize SQLite database"""
    print_step(4, "Initializing Database")

    try:
        from app.core.config_sqlite import sqlite_settings
        from app.db.session_sqlite import engine, Base
        from sqlalchemy import text

        # Ensure database directory exists
        sqlite_settings.ensure_database_dir()
        db_path = sqlite_settings.database_path

        print(f"  Database path: {db_path}")

        # Create all tables
        Base.metadata.create_all(bind=engine)

        # Apply SQLite PRAGMAs
        with engine.connect() as conn:
            for pragma in sqlite_settings.get_pragma_statements():
                conn.execute(text(pragma))
                print(f"  ✓ Applied: {pragma}")
            conn.commit()

        print(f"\n✓ Database initialized at: {db_path}")
        return True

    except Exception as e:
        print(f"\n✗ Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def create_initial_password():
    """Create initial password if required"""
    print_step(5, "Setting Initial Password")

    try:
        # Check if password is required
        from dotenv import load_dotenv
        load_dotenv()

        require_password = os.getenv("REQUIRE_PASSWORD", "true").lower() == "true"

        if not require_password:
            print("  Password protection disabled - skipping")
            return True

        # Import password utilities
        from passlib.context import CryptContext
        from app.db.session_sqlite import SessionLocal
        from app.models_sqlite.app_config import AppConfig

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        print("\n  Set your application password:")
        print("  (This will be required each time you open the app)\n")

        while True:
            password = getpass("    Password: ")
            if len(password) < 8:
                print("    ⚠️  Password must be at least 8 characters")
                continue

            confirm = getpass("    Confirm Password: ")
            if password != confirm:
                print("    ⚠️  Passwords don't match")
                continue

            break

        # Hash password
        hashed_password = pwd_context.hash(password)

        # Store in database
        db = SessionLocal()
        try:
            # Check if password already set
            config = db.query(AppConfig).filter(
                AppConfig.key == "app_password"
            ).first()

            if config:
                config.value = hashed_password
            else:
                config = AppConfig(
                    key="app_password",
                    value=hashed_password,
                    description="Application password hash"
                )
                db.add(config)

            db.commit()
            print("\n✓ Password set successfully")
            return True

        finally:
            db.close()

    except Exception as e:
        print(f"\n✗ Password setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_setup():
    """Verify the setup was successful"""
    print_step(6, "Verifying Setup")

    base_dir = Path(__file__).parent.parent
    checks = []

    # Check .env exists
    env_file = base_dir / ".env"
    checks.append(("Configuration file", env_file.exists()))

    # Check database exists
    db_file = base_dir / "data" / "theprogram.db"
    checks.append(("Database file", db_file.exists()))

    # Check directories exist
    checks.append(("Data directory", (base_dir / "data").exists()))
    checks.append(("Logs directory", (base_dir / "logs").exists()))
    checks.append(("Storage directory", (base_dir / "storage").exists()))

    all_good = True
    for check_name, result in checks:
        status = "✓" if result else "✗"
        print(f"  {status} {check_name}")
        if not result:
            all_good = False

    if all_good:
        print("\n✓ Setup verification passed")
    else:
        print("\n⚠️  Some checks failed")

    return all_good


def main():
    """Main setup routine"""
    print_header("The Program - Initial Setup")
    print("This script will help you set up The Program for first-time use.\n")

    # Run setup steps
    steps = [
        ("Checking dependencies", check_dependencies),
        ("Creating directories", create_directories),
        ("Creating configuration", create_env_file),
        ("Initializing database", initialize_database),
        ("Setting password", create_initial_password),
        ("Verifying setup", verify_setup),
    ]

    for step_name, step_func in steps:
        if not step_func():
            print(f"\n❌ Setup failed at: {step_name}")
            print("Please fix the errors above and run setup again.")
            return 1

    # Success
    print_header("Setup Complete!")
    print("✓ The Program is ready to use!\n")
    print("Next steps:")
    print("  1. Start the backend server:")
    print("     uvicorn app.main:app --reload")
    print("\n  2. Or use Docker:")
    print("     docker-compose up -d")
    print("\n  3. Access the API documentation:")
    print("     http://localhost:8000/docs")
    print("\n  4. Start the frontend (in separate terminal):")
    print("     cd frontend && npm run dev")
    print("\n" + "=" * 70 + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
