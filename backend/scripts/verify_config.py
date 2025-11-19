#!/usr/bin/env python3
"""
The Program - Configuration Verification Script

Validates configuration settings and environment variables.
Reports any issues or missing required values.
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class ConfigChecker:
    """Configuration validation utility"""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []

    def check_env_file(self) -> bool:
        """Check if .env file exists"""
        base_dir = Path(__file__).parent.parent
        env_file = base_dir / ".env"

        if not env_file.exists():
            self.errors.append(".env file not found - run setup.py first")
            return False

        self.info.append(f"✓ .env file exists at {env_file}")
        return True

    def check_required_vars(self) -> bool:
        """Check required environment variables"""
        from dotenv import load_dotenv
        load_dotenv()

        required = [
            ("SECRET_KEY", "Security"),
            ("SQLITE_DB_PATH", "Database"),
        ]

        all_present = True
        for var_name, category in required:
            value = os.getenv(var_name)
            if not value:
                self.errors.append(f"Required variable missing: {var_name} ({category})")
                all_present = False
            elif var_name == "SECRET_KEY":
                # Check if it's still the default
                if "change-this" in value.lower() or len(value) < 32:
                    self.errors.append(
                        "SECRET_KEY appears to be default/insecure - generate new key"
                    )
                    all_present = False
                else:
                    self.info.append(f"✓ {var_name} is set")
            else:
                self.info.append(f"✓ {var_name} is set")

        return all_present

    def check_optional_vars(self):
        """Check optional but recommended variables"""
        from dotenv import load_dotenv
        load_dotenv()

        optional = [
            ("ANTHROPIC_API_KEY", "AI interpretations will not work"),
            ("GEONAMES_USERNAME", "Location lookup may be limited"),
        ]

        for var_name, warning in optional:
            value = os.getenv(var_name)
            if not value or value.startswith("your-") or value.startswith("your_"):
                self.warnings.append(f"{var_name} not set - {warning}")
            else:
                self.info.append(f"✓ {var_name} is configured")

    def check_database(self) -> bool:
        """Check SQLite database configuration"""
        try:
            from app.core.config_sqlite import sqlite_settings

            db_path = sqlite_settings.database_path

            # Check if database directory exists
            db_dir = db_path.parent
            if not db_dir.exists():
                self.warnings.append(
                    f"Database directory doesn't exist: {db_dir} (will be created on startup)"
                )
            else:
                self.info.append(f"✓ Database directory exists: {db_dir}")

            # Check if database file exists
            if db_path.exists():
                size_mb = db_path.stat().st_size / (1024 * 1024)
                self.info.append(f"✓ Database exists: {db_path} ({size_mb:.2f} MB)")

                # Check if writable
                if os.access(db_path, os.W_OK):
                    self.info.append("✓ Database is writable")
                else:
                    self.errors.append(f"Database is not writable: {db_path}")
                    return False
            else:
                self.info.append(f"Database will be created at: {db_path}")

            # Check SQLite settings
            if not sqlite_settings.SQLITE_ENABLE_FOREIGN_KEYS:
                self.warnings.append(
                    "Foreign key constraints are DISABLED - data integrity at risk"
                )
            else:
                self.info.append("✓ Foreign key constraints enabled")

            return True

        except Exception as e:
            self.errors.append(f"Database check failed: {e}")
            return False

    def check_directories(self) -> bool:
        """Check required directories exist"""
        base_dir = Path(__file__).parent.parent
        required_dirs = [
            "data",
            "logs",
            "storage/reports",
        ]

        all_exist = True
        for dir_name in required_dirs:
            dir_path = base_dir / dir_name
            if not dir_path.exists():
                self.warnings.append(f"Directory doesn't exist: {dir_name} (will be created)")
                all_exist = False
            else:
                # Check if writable
                if os.access(dir_path, os.W_OK):
                    self.info.append(f"✓ Directory exists and writable: {dir_name}")
                else:
                    self.errors.append(f"Directory not writable: {dir_name}")
                    all_exist = False

        return all_exist

    def check_dependencies(self) -> bool:
        """Check if required Python packages are installed"""
        required_packages = [
            ("fastapi", "FastAPI"),
            ("uvicorn", "Uvicorn"),
            ("sqlalchemy", "SQLAlchemy"),
            ("pydantic", "Pydantic"),
            ("pyswisseph", "PySwissEph"),
            ("passlib", "Passlib"),
            ("jose", "Python-JOSE"),
        ]

        all_installed = True
        for package, display_name in required_packages:
            try:
                __import__(package)
                self.info.append(f"✓ {display_name} installed")
            except ImportError:
                self.errors.append(f"{display_name} not installed - run: pip install {package}")
                all_installed = False

        return all_installed

    def check_security_settings(self):
        """Check security-related settings"""
        from dotenv import load_dotenv
        load_dotenv()

        # Check DEBUG mode
        debug = os.getenv("DEBUG", "true").lower() == "true"
        app_env = os.getenv("APP_ENV", "development")

        if debug and app_env == "production":
            self.warnings.append("DEBUG=true in production - should be false")
        elif not debug:
            self.info.append("✓ DEBUG mode disabled (production ready)")

        # Check password requirement
        require_password = os.getenv("REQUIRE_PASSWORD", "true").lower() == "true"
        if not require_password:
            self.warnings.append(
                "Password protection disabled - only use on trusted devices"
            )
        else:
            self.info.append("✓ Password protection enabled")

        # Check CORS
        cors_origins = os.getenv("CORS_ORIGINS", "")
        if "*" in cors_origins:
            self.warnings.append("CORS allows all origins (*) - security risk")
        elif cors_origins:
            self.info.append(f"✓ CORS configured for: {cors_origins}")

    def print_report(self):
        """Print validation report"""
        print("\n" + "=" * 70)
        print("  Configuration Verification Report")
        print("=" * 70)

        if self.errors:
            print("\n❌ ERRORS (must fix):")
            for error in self.errors:
                print(f"  - {error}")

        if self.warnings:
            print("\n⚠️  WARNINGS (recommended to fix):")
            for warning in self.warnings:
                print(f"  - {warning}")

        if self.info:
            print("\n✓ INFO:")
            for info in self.info:
                print(f"  {info}")

        print("\n" + "=" * 70)

        if self.errors:
            print("\n❌ Configuration has ERRORS - please fix before running")
            return False
        elif self.warnings:
            print("\n⚠️  Configuration has warnings - review recommendations")
            return True
        else:
            print("\n✓ Configuration is valid")
            return True


def main():
    """Main verification routine"""
    print("\nThe Program - Configuration Verification")
    print("-" * 70)

    checker = ConfigChecker()

    # Run all checks
    checks = [
        checker.check_env_file,
        checker.check_required_vars,
        checker.check_optional_vars,
        checker.check_database,
        checker.check_directories,
        checker.check_dependencies,
        checker.check_security_settings,
    ]

    for check in checks:
        try:
            check()
        except Exception as e:
            checker.errors.append(f"Check failed: {e}")

    # Print report
    is_valid = checker.print_report()

    if not is_valid:
        print("\nRun setup.py to fix configuration issues:")
        print("  python scripts/setup.py")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
