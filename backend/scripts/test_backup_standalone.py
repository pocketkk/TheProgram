#!/usr/bin/env python3
"""
Standalone backup service test
Tests basic functionality without pytest conftest issues
"""
import sys
import tempfile
import sqlite3
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.backup_service import BackupService
from app.schemas.backup import BackupType


def create_test_database(db_path: Path):
    """Create a test database with sample data"""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create test tables
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE clients (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            birth_date TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE alembic_version (
            version_num TEXT PRIMARY KEY
        )
    """)

    # Insert test data
    for i in range(10):
        cursor.execute(
            "INSERT INTO users (username, email) VALUES (?, ?)",
            (f"user{i}", f"user{i}@example.com")
        )

    for i in range(25):
        cursor.execute(
            "INSERT INTO clients (name, birth_date) VALUES (?, ?)",
            (f"Client {i}", "1990-01-01")
        )

    cursor.execute(
        "INSERT INTO alembic_version (version_num) VALUES (?)",
        ("test_version_123",)
    )

    conn.commit()
    conn.close()


def test_unencrypted_backup(service, test_name):
    """Test creating unencrypted backup"""
    print(f"\n{test_name}...")
    try:
        metadata = service.create_backup(
            encrypt=False,
            compression=False,
            description="Test unencrypted backup"
        )
        assert metadata.backup_id.startswith("backup_"), f"backup_id: {metadata.backup_id}"
        assert metadata.encrypted is False, f"encrypted: {metadata.encrypted}"
        assert metadata.compressed is False, f"compressed: {metadata.compressed}"
        assert metadata.total_records == 36, f"total_records: {metadata.total_records}"  # 10 users + 25 clients + 1 alembic_version
        print(f"  ✓ {test_name} PASSED")
        return True
    except Exception as e:
        import traceback
        print(f"  ✗ {test_name} FAILED: {e}")
        traceback.print_exc()
        return False


def test_compressed_backup(service, test_name):
    """Test creating compressed backup"""
    print(f"\n{test_name}...")
    try:
        metadata = service.create_backup(
            encrypt=False,
            compression=True
        )
        assert metadata.compressed is True
        assert metadata.compressed_size < metadata.original_size
        print(f"  ✓ {test_name} PASSED")
        print(f"    Original size: {metadata.original_size} bytes")
        print(f"    Compressed size: {metadata.compressed_size} bytes")
        print(f"    Compression ratio: {metadata.compressed_size/metadata.original_size*100:.1f}%")
        return True
    except Exception as e:
        print(f"  ✗ {test_name} FAILED: {e}")
        return False


def test_encrypted_backup(service, test_name):
    """Test creating encrypted backup"""
    print(f"\n{test_name}...")
    try:
        metadata = service.create_backup(
            encrypt=True,
            compression=False
        )
        assert metadata.encrypted is True
        assert metadata.filename.endswith(".db.enc")
        print(f"  ✓ {test_name} PASSED")
        return True
    except Exception as e:
        print(f"  ✗ {test_name} FAILED: {e}")
        return False


def test_encrypted_compressed_backup(service, test_name):
    """Test creating encrypted and compressed backup"""
    print(f"\n{test_name}...")
    try:
        metadata = service.create_backup(
            encrypt=True,
            compression=True,
            description="Full protection backup"
        )
        assert metadata.encrypted is True
        assert metadata.compressed is True
        assert metadata.filename.endswith(".db.gz.enc")
        print(f"  ✓ {test_name} PASSED")
        return True
    except Exception as e:
        print(f"  ✗ {test_name} FAILED: {e}")
        return False


def test_verify_backup(service, test_name):
    """Test backup verification"""
    print(f"\n{test_name}...")
    try:
        # Create backup first
        metadata = service.create_backup(encrypt=True, compression=True)

        # Verify it
        verification = service.verify_backup(metadata.backup_id)

        assert verification.verified is True
        assert len(verification.errors) == 0
        assert "checksum_validation" in verification.checks_performed
        print(f"  ✓ {test_name} PASSED")
        print(f"    Checks performed: {', '.join(verification.checks_performed)}")
        return True
    except Exception as e:
        print(f"  ✗ {test_name} FAILED: {e}")
        return False


def test_list_backups(service, test_name):
    """Test listing backups"""
    print(f"\n{test_name}...")
    try:
        # Get current count
        initial_backups = service.list_backups(limit=10)
        initial_count = len(initial_backups)

        # Create multiple backups
        for i in range(3):
            service.create_backup(encrypt=False, compression=False)

        backups = service.list_backups(limit=10)
        final_count = len(backups)

        # Should have at least 3 more than we started with
        assert final_count >= initial_count + 3, f"Expected at least {initial_count + 3} backups, found {final_count}"
        print(f"  ✓ {test_name} PASSED")
        print(f"    Found {final_count} backups (added 3)")
        return True
    except Exception as e:
        import traceback
        print(f"  ✗ {test_name} FAILED: {e}")
        traceback.print_exc()
        return False


def test_restore_backup(service, db_path, test_name):
    """Test restoring from backup"""
    print(f"\n{test_name}...")
    try:
        # Create backup
        metadata = service.create_backup(encrypt=True, compression=True)

        # Modify database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id < 5")
        conn.commit()
        cursor.execute("SELECT COUNT(*) FROM users")
        count_before = cursor.fetchone()[0]
        conn.close()
        assert count_before < 10

        # Restore backup
        success = service.restore_backup(
            backup_id=metadata.backup_id,
            verify_first=True,
            create_safety_backup=False
        )
        assert success is True

        # Verify restoration
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        count_after = cursor.fetchone()[0]
        conn.close()
        assert count_after == 10

        print(f"  ✓ {test_name} PASSED")
        print(f"    Restored {count_after} users")
        return True
    except Exception as e:
        print(f"  ✗ {test_name} FAILED: {e}")
        return False


def test_delete_backup(service, test_name):
    """Test deleting backups"""
    print(f"\n{test_name}...")
    try:
        # Create backup
        metadata = service.create_backup(encrypt=False, compression=False)

        # Delete it
        success = service.delete_backup(metadata.backup_id)
        assert success is True

        # Verify it's gone
        backups = service.list_backups()
        assert not any(b.backup_id == metadata.backup_id for b in backups)

        print(f"  ✓ {test_name} PASSED")
        return True
    except Exception as e:
        print(f"  ✗ {test_name} FAILED: {e}")
        return False


def test_cleanup_old_backups(service, test_name):
    """Test cleanup of old backups"""
    print(f"\n{test_name}...")
    try:
        # Get initial count
        initial_backups = service.list_backups()
        initial_count = len(initial_backups)

        # Create 10 MORE backups
        for i in range(10):
            service.create_backup(encrypt=False, compression=False)

        # Keep only 5 total
        deleted_count = service.delete_old_backups(keep_count=5)

        # Verify - should be at most 5 backups remaining
        backups = service.list_backups()
        assert len(backups) <= 5, f"Expected at most 5 backups, found {len(backups)}"
        # Should have deleted at least initial_count + 10 - 5 backups
        expected_deletions = max(0, initial_count + 10 - 5)
        assert deleted_count >= expected_deletions, f"Expected at least {expected_deletions} deletions, got {deleted_count}"

        print(f"  ✓ {test_name} PASSED")
        print(f"    Deleted {deleted_count} old backups, {len(backups)} remaining")
        return True
    except Exception as e:
        import traceback
        print(f"  ✗ {test_name} FAILED: {e}")
        traceback.print_exc()
        return False


def test_backup_stats(service, test_name):
    """Test backup statistics"""
    print(f"\n{test_name}...")
    try:
        # Get initial stats
        initial_stats = service.get_backup_stats()
        initial_count = initial_stats.total_backups

        # Create some more backups
        service.create_backup(encrypt=False, compression=False)
        service.create_backup(encrypt=True, compression=True)

        # Get new stats
        stats = service.get_backup_stats()

        assert stats.total_backups >= initial_count + 2, f"Expected at least {initial_count + 2} backups, found {stats.total_backups}"
        assert stats.total_size > 0, f"Expected total_size > 0, got {stats.total_size}"
        print(f"  ✓ {test_name} PASSED")
        print(f"    Total backups: {stats.total_backups}")
        print(f"    Total size: {stats.total_size} bytes")
        if stats.compression_ratio:
            print(f"    Avg compression: {stats.compression_ratio*100:.1f}%")
        return True
    except Exception as e:
        import traceback
        print(f"  ✗ {test_name} FAILED: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 70)
    print("BACKUP SERVICE STANDALONE TEST SUITE")
    print("=" * 70)

    # Create temporary directory for test
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        db_path = temp_path / "test.db"
        backup_dir = temp_path / "backups"

        # Create test database
        print("\nSetting up test database...")
        create_test_database(db_path)
        print("  ✓ Test database created")

        # Initialize backup service
        print("\nInitializing backup service...")
        database_url = f"sqlite:///{db_path}"
        service = BackupService(
            database_url=database_url,
            backup_dir=str(backup_dir),
            encryption_password="test_password_123"
        )
        print("  ✓ Backup service initialized")

        # Run tests
        tests = [
            (test_unencrypted_backup, (service, "Test 1: Unencrypted Backup")),
            (test_compressed_backup, (service, "Test 2: Compressed Backup")),
            (test_encrypted_backup, (service, "Test 3: Encrypted Backup")),
            (test_encrypted_compressed_backup, (service, "Test 4: Encrypted + Compressed Backup")),
            (test_verify_backup, (service, "Test 5: Backup Verification")),
            (test_list_backups, (service, "Test 6: List Backups")),
            (test_restore_backup, (service, db_path, "Test 7: Restore Backup")),
            (test_delete_backup, (service, "Test 8: Delete Backup")),
            (test_cleanup_old_backups, (service, "Test 9: Cleanup Old Backups")),
            (test_backup_stats, (service, "Test 10: Backup Statistics")),
        ]

        results = []
        for test_func, args in tests:
            result = test_func(*args)
            results.append(result)

        # Print summary
        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        passed = sum(results)
        total = len(results)
        print(f"\nTotal tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {passed/total*100:.1f}%")

        if passed == total:
            print("\n✓ ALL TESTS PASSED!")
            return 0
        else:
            print(f"\n✗ {total - passed} TEST(S) FAILED")
            return 1


if __name__ == '__main__':
    sys.exit(main())
