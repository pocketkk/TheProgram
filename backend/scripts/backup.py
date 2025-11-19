#!/usr/bin/env python3
"""
Enhanced CLI tool for database backup management
Supports backup, restore, verify, list, and cleanup operations
"""
import argparse
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.backup_service import BackupService
from app.schemas.backup import BackupType


class Colors:
    """ANSI color codes for terminal output"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    MAGENTA = '\033[0;35m'
    NC = '\033[0m'  # No Color


def print_info(msg: str) -> None:
    """Print info message"""
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {msg}")


def print_success(msg: str) -> None:
    """Print success message"""
    print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {msg}")


def print_warning(msg: str) -> None:
    """Print warning message"""
    print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {msg}")


def print_error(msg: str) -> None:
    """Print error message"""
    print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")


def format_size(size_bytes: int) -> str:
    """Format bytes to human-readable size"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def format_datetime(dt: datetime) -> str:
    """Format datetime for display"""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def get_backup_service() -> BackupService:
    """Initialize and return backup service"""
    # Get configuration from environment
    database_url = os.environ.get("DATABASE_URL", "sqlite:///./data/app.db")
    backup_dir = os.environ.get("BACKUP_DIR", "./data/backups")
    encryption_password = os.environ.get("BACKUP_ENCRYPTION_PASSWORD")

    return BackupService(
        database_url=database_url,
        backup_dir=backup_dir,
        encryption_password=encryption_password
    )


def cmd_create(args) -> int:
    """Create a new backup"""
    try:
        print_info("Creating backup...")

        service = get_backup_service()

        metadata = service.create_backup(
            encrypt=args.encrypt,
            compression=args.compress,
            description=args.description,
            tags=args.tags or [],
            backup_type=BackupType.MANUAL
        )

        print_success(f"Backup created successfully!")
        print()
        print(f"  {Colors.CYAN}Backup ID:{Colors.NC} {metadata.backup_id}")
        print(f"  {Colors.CYAN}Filename:{Colors.NC} {metadata.filename}")
        print(f"  {Colors.CYAN}Created:{Colors.NC} {format_datetime(metadata.created_at)}")
        print(f"  {Colors.CYAN}Original Size:{Colors.NC} {format_size(metadata.original_size)}")
        if metadata.compressed_size:
            ratio = (metadata.compressed_size / metadata.original_size) * 100
            print(f"  {Colors.CYAN}Compressed Size:{Colors.NC} {format_size(metadata.compressed_size)} ({ratio:.1f}%)")
        print(f"  {Colors.CYAN}Encrypted:{Colors.NC} {'Yes' if metadata.encrypted else 'No'}")
        print(f"  {Colors.CYAN}Compressed:{Colors.NC} {'Yes' if metadata.compressed else 'No'}")
        print(f"  {Colors.CYAN}Total Records:{Colors.NC} {metadata.total_records:,}")
        print()

        # Verify if requested
        if args.verify:
            print_info("Verifying backup...")
            verification = service.verify_backup(metadata.backup_id)
            if verification.verified:
                print_success("Backup verification passed!")
            else:
                print_error("Backup verification failed!")
                for error in verification.errors:
                    print(f"  - {error}")
                return 1

        return 0

    except Exception as e:
        print_error(f"Failed to create backup: {str(e)}")
        return 1


def cmd_list(args) -> int:
    """List available backups"""
    try:
        service = get_backup_service()
        backups = service.list_backups(limit=args.limit)

        if not backups:
            print_warning("No backups found")
            return 0

        print()
        print(f"{Colors.CYAN}Available Backups:{Colors.NC} ({len(backups)} found)")
        print()

        for i, backup in enumerate(backups, 1):
            status_color = Colors.GREEN if backup.verified else Colors.YELLOW
            status = "✓ Verified" if backup.verified else "? Not verified"

            print(f"{Colors.MAGENTA}[{i}]{Colors.NC} {backup.backup_id}")
            print(f"    Filename:     {backup.filename}")
            print(f"    Created:      {format_datetime(backup.created_at)}")
            print(f"    Size:         {format_size(backup.compressed_size or backup.original_size)}")
            print(f"    Records:      {backup.total_records:,}")
            print(f"    Status:       {status_color}{status}{Colors.NC}")
            if backup.description:
                print(f"    Description:  {backup.description}")
            if backup.tags:
                print(f"    Tags:         {', '.join(backup.tags)}")
            print()

        return 0

    except Exception as e:
        print_error(f"Failed to list backups: {str(e)}")
        return 1


def cmd_restore(args) -> int:
    """Restore from a backup"""
    try:
        service = get_backup_service()

        # Confirm restore
        if not args.yes:
            print_warning("This will replace the current database with the backup!")
            response = input(f"Restore from backup '{args.backup_id}'? (yes/no): ")
            if response.lower() != 'yes':
                print_info("Restore cancelled")
                return 0

        print_info(f"Restoring from backup: {args.backup_id}")

        success = service.restore_backup(
            backup_id=args.backup_id,
            verify_first=args.verify,
            create_safety_backup=not args.no_safety_backup
        )

        if success:
            print_success("Database restored successfully!")
            print()
            print_warning("Remember to restart the application to use the restored database")
            if os.path.exists("docker-compose.yml"):
                print_info("Docker: docker compose restart backend")
            return 0
        else:
            print_error("Restore failed")
            return 1

    except Exception as e:
        print_error(f"Failed to restore backup: {str(e)}")
        return 1


def cmd_verify(args) -> int:
    """Verify a backup"""
    try:
        service = get_backup_service()

        print_info(f"Verifying backup: {args.backup_id}")

        verification = service.verify_backup(args.backup_id)

        print()
        print(f"  {Colors.CYAN}Backup ID:{Colors.NC} {verification.backup_id}")
        print(f"  {Colors.CYAN}Verified:{Colors.NC} {format_datetime(verification.verification_date)}")
        print(f"  {Colors.CYAN}Checks Performed:{Colors.NC}")
        for check in verification.checks_performed:
            print(f"    ✓ {check}")
        print()

        if verification.verified:
            print_success("Backup verification passed!")
            return 0
        else:
            print_error("Backup verification failed!")
            print()
            print(f"  {Colors.RED}Errors:{Colors.NC}")
            for error in verification.errors:
                print(f"    ✗ {error}")
            print()
            return 1

    except Exception as e:
        print_error(f"Failed to verify backup: {str(e)}")
        return 1


def cmd_cleanup(args) -> int:
    """Cleanup old backups"""
    try:
        service = get_backup_service()

        print_info(f"Cleaning up old backups (keeping {args.keep} most recent)...")

        deleted_count = service.delete_old_backups(keep_count=args.keep)

        if deleted_count > 0:
            print_success(f"Deleted {deleted_count} old backup(s)")
        else:
            print_info("No backups to delete")

        return 0

    except Exception as e:
        print_error(f"Failed to cleanup backups: {str(e)}")
        return 1


def cmd_delete(args) -> int:
    """Delete a specific backup"""
    try:
        service = get_backup_service()

        # Confirm delete
        if not args.yes:
            response = input(f"Delete backup '{args.backup_id}'? (yes/no): ")
            if response.lower() != 'yes':
                print_info("Delete cancelled")
                return 0

        print_info(f"Deleting backup: {args.backup_id}")

        service.delete_backup(args.backup_id)

        print_success("Backup deleted successfully")
        return 0

    except Exception as e:
        print_error(f"Failed to delete backup: {str(e)}")
        return 1


def cmd_stats(args) -> int:
    """Show backup statistics"""
    try:
        service = get_backup_service()

        stats = service.get_backup_stats()

        print()
        print(f"{Colors.CYAN}Backup Statistics:{Colors.NC}")
        print()
        print(f"  Total Backups:     {stats.total_backups}")
        print(f"  Total Size:        {format_size(stats.total_size)}")
        print(f"  Average Size:      {format_size(stats.average_size)}")
        print(f"  Verified Backups:  {stats.verified_backups}")
        print(f"  Failed Backups:    {stats.failed_backups}")

        if stats.compression_ratio:
            print(f"  Avg Compression:   {stats.compression_ratio*100:.1f}%")

        if stats.oldest_backup:
            print(f"  Oldest Backup:     {format_datetime(stats.oldest_backup)}")
        if stats.newest_backup:
            print(f"  Newest Backup:     {format_datetime(stats.newest_backup)}")

        print()
        return 0

    except Exception as e:
        print_error(f"Failed to get backup statistics: {str(e)}")
        return 1


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Enhanced Database Backup Tool for The Program",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create encrypted and compressed backup
  %(prog)s create --encrypt --compress --description "Pre-deployment backup"

  # List all backups
  %(prog)s list

  # Verify a backup
  %(prog)s verify backup_20231116_143022

  # Restore from backup
  %(prog)s restore backup_20231116_143022

  # Cleanup old backups (keep 30 most recent)
  %(prog)s cleanup --keep 30

  # Show statistics
  %(prog)s stats
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Create backup
    parser_create = subparsers.add_parser('create', help='Create a new backup')
    parser_create.add_argument('--encrypt', action='store_true', default=True, help='Encrypt backup (default: true)')
    parser_create.add_argument('--no-encrypt', dest='encrypt', action='store_false', help='Do not encrypt backup')
    parser_create.add_argument('--compress', action='store_true', default=True, help='Compress backup (default: true)')
    parser_create.add_argument('--no-compress', dest='compress', action='store_false', help='Do not compress backup')
    parser_create.add_argument('--description', '-d', help='Backup description')
    parser_create.add_argument('--tags', '-t', nargs='+', help='Tags for categorization')
    parser_create.add_argument('--verify', action='store_true', help='Verify backup after creation')
    parser_create.set_defaults(func=cmd_create)

    # List backups
    parser_list = subparsers.add_parser('list', help='List available backups')
    parser_list.add_argument('--limit', '-l', type=int, default=50, help='Maximum number of backups to list')
    parser_list.set_defaults(func=cmd_list)

    # Restore backup
    parser_restore = subparsers.add_parser('restore', help='Restore from a backup')
    parser_restore.add_argument('backup_id', help='Backup ID to restore from')
    parser_restore.add_argument('--verify', action='store_true', default=True, help='Verify backup before restore (default: true)')
    parser_restore.add_argument('--no-verify', dest='verify', action='store_false', help='Skip verification')
    parser_restore.add_argument('--no-safety-backup', action='store_true', help='Skip safety backup before restore')
    parser_restore.add_argument('--yes', '-y', action='store_true', help='Skip confirmation prompt')
    parser_restore.set_defaults(func=cmd_restore)

    # Verify backup
    parser_verify = subparsers.add_parser('verify', help='Verify a backup')
    parser_verify.add_argument('backup_id', help='Backup ID to verify')
    parser_verify.set_defaults(func=cmd_verify)

    # Cleanup old backups
    parser_cleanup = subparsers.add_parser('cleanup', help='Cleanup old backups')
    parser_cleanup.add_argument('--keep', '-k', type=int, default=30, help='Number of backups to keep (default: 30)')
    parser_cleanup.set_defaults(func=cmd_cleanup)

    # Delete backup
    parser_delete = subparsers.add_parser('delete', help='Delete a specific backup')
    parser_delete.add_argument('backup_id', help='Backup ID to delete')
    parser_delete.add_argument('--yes', '-y', action='store_true', help='Skip confirmation prompt')
    parser_delete.set_defaults(func=cmd_delete)

    # Show statistics
    parser_stats = subparsers.add_parser('stats', help='Show backup statistics')
    parser_stats.set_defaults(func=cmd_stats)

    # Parse arguments
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # Execute command
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main())
