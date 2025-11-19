"""
Comprehensive tests for backup service
Tests encryption, compression, verification, and restore operations
"""
import pytest
import tempfile
import shutil
import sqlite3
from pathlib import Path
from datetime import datetime

from app.services.backup_service import BackupService
from app.schemas.backup import BackupType, BackupStatus


@pytest.fixture
def temp_db():
    """Create a temporary SQLite database for testing"""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"

        # Create a test database with some data
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

        # Add schema version
        cursor.execute(
            "INSERT INTO alembic_version (version_num) VALUES (?)",
            ("test_version_123",)
        )

        conn.commit()
        conn.close()

        yield db_path


@pytest.fixture
def backup_service(temp_db):
    """Create backup service instance with temporary database"""
    with tempfile.TemporaryDirectory() as backup_dir:
        database_url = f"sqlite:///{temp_db}"
        service = BackupService(
            database_url=database_url,
            backup_dir=backup_dir,
            encryption_password="test_password_123"
        )
        yield service


class TestBackupService:
    """Test suite for BackupService"""

    def test_backup_service_initialization(self, backup_service):
        """Test that backup service initializes correctly"""
        assert backup_service.backup_dir.exists()
        assert backup_service.metadata_dir.exists()
        assert backup_service.encryption_password == "test_password_123"

    def test_create_unencrypted_uncompressed_backup(self, backup_service):
        """Test creating a basic backup without encryption or compression"""
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=False,
            description="Test backup",
            tags=["test"]
        )

        assert metadata is not None
        assert metadata.backup_id.startswith("backup_")
        assert metadata.encrypted is False
        assert metadata.compressed is False
        assert metadata.original_size > 0
        assert metadata.status == BackupStatus.COMPLETED
        assert metadata.total_records == 35  # 10 users + 25 clients
        assert metadata.table_counts["users"] == 10
        assert metadata.table_counts["clients"] == 25
        assert metadata.schema_version == "test_version_123"
        assert "test" in metadata.tags
        assert metadata.description == "Test backup"

        # Verify backup file exists
        backup_path = backup_service.backup_dir / metadata.filename
        assert backup_path.exists()

    def test_create_compressed_backup(self, backup_service):
        """Test creating a compressed backup"""
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=True
        )

        assert metadata is not None
        assert metadata.compressed is True
        assert metadata.compressed_size is not None
        assert metadata.compressed_size < metadata.original_size
        assert metadata.filename.endswith(".db.gz")

        # Verify compression ratio
        ratio = metadata.compressed_size / metadata.original_size
        assert ratio < 1.0  # Should be smaller

    def test_create_encrypted_backup(self, backup_service):
        """Test creating an encrypted backup"""
        metadata = backup_service.create_backup(
            encrypt=True,
            compression=False
        )

        assert metadata is not None
        assert metadata.encrypted is True
        assert metadata.filename.endswith(".db.enc")

        # Verify backup file exists and is different from original
        backup_path = backup_service.backup_dir / metadata.filename
        assert backup_path.exists()

    def test_create_encrypted_compressed_backup(self, backup_service):
        """Test creating an encrypted and compressed backup"""
        metadata = backup_service.create_backup(
            encrypt=True,
            compression=True,
            description="Encrypted and compressed test",
            tags=["encrypted", "compressed", "test"]
        )

        assert metadata is not None
        assert metadata.encrypted is True
        assert metadata.compressed is True
        assert metadata.filename.endswith(".db.gz.enc")
        assert metadata.compressed_size < metadata.original_size

    def test_backup_checksum(self, backup_service):
        """Test that backup checksum is calculated correctly"""
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=False
        )

        # Verify checksum exists and has correct format
        assert metadata.checksum is not None
        assert len(metadata.checksum) == 64  # SHA-256 hex length
        assert metadata.checksum_algorithm == "sha256"

        # Verify checksum is consistent
        backup_path = backup_service.backup_dir / metadata.filename
        checksum2 = backup_service._calculate_checksum(backup_path)
        assert metadata.checksum == checksum2

    def test_verify_valid_backup(self, backup_service):
        """Test verifying a valid backup"""
        metadata = backup_service.create_backup(
            encrypt=True,
            compression=True
        )

        verification = backup_service.verify_backup(metadata.backup_id)

        assert verification is not None
        assert verification.verified is True
        assert verification.backup_id == metadata.backup_id
        assert len(verification.errors) == 0
        assert "checksum_validation" in verification.checks_performed
        assert "decryption_test" in verification.checks_performed
        assert "decompression_test" in verification.checks_performed
        assert "sqlite_integrity_check" in verification.checks_performed

    def test_verify_nonexistent_backup(self, backup_service):
        """Test verifying a non-existent backup"""
        verification = backup_service.verify_backup("nonexistent_backup")

        assert verification is not None
        assert verification.verified is False
        assert "Metadata file not found" in verification.errors

    def test_verify_corrupted_checksum(self, backup_service):
        """Test verifying backup with corrupted checksum"""
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=False
        )

        # Corrupt the backup file
        backup_path = backup_service.backup_dir / metadata.filename
        with open(backup_path, 'ab') as f:
            f.write(b"corrupted data")

        verification = backup_service.verify_backup(metadata.backup_id)

        assert verification is not None
        assert verification.verified is False
        assert any("Checksum mismatch" in error for error in verification.errors)

    def test_list_backups(self, backup_service):
        """Test listing backups"""
        # Create multiple backups
        metadata1 = backup_service.create_backup(encrypt=False, compression=False)
        metadata2 = backup_service.create_backup(encrypt=True, compression=False)
        metadata3 = backup_service.create_backup(encrypt=True, compression=True)

        backups = backup_service.list_backups(limit=10)

        assert len(backups) == 3
        assert any(b.backup_id == metadata1.backup_id for b in backups)
        assert any(b.backup_id == metadata2.backup_id for b in backups)
        assert any(b.backup_id == metadata3.backup_id for b in backups)

    def test_list_backups_with_limit(self, backup_service):
        """Test listing backups with limit"""
        # Create 5 backups
        for i in range(5):
            backup_service.create_backup(encrypt=False, compression=False)

        backups = backup_service.list_backups(limit=3)

        assert len(backups) == 3  # Should respect limit

    def test_restore_unencrypted_backup(self, backup_service, temp_db):
        """Test restoring from an unencrypted backup"""
        # Create backup
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=False
        )

        # Modify database
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id < 5")
        conn.commit()
        conn.close()

        # Verify data was deleted
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        count_before_restore = cursor.fetchone()[0]
        conn.close()
        assert count_before_restore < 10

        # Restore backup
        success = backup_service.restore_backup(
            backup_id=metadata.backup_id,
            verify_first=True,
            create_safety_backup=False
        )

        assert success is True

        # Verify data is restored
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        count_after_restore = cursor.fetchone()[0]
        conn.close()
        assert count_after_restore == 10

    def test_restore_encrypted_compressed_backup(self, backup_service, temp_db):
        """Test restoring from an encrypted and compressed backup"""
        # Create backup
        metadata = backup_service.create_backup(
            encrypt=True,
            compression=True
        )

        # Modify database
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clients")
        conn.commit()
        conn.close()

        # Restore backup
        success = backup_service.restore_backup(
            backup_id=metadata.backup_id,
            verify_first=True,
            create_safety_backup=False
        )

        assert success is True

        # Verify data is restored
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients")
        count = cursor.fetchone()[0]
        conn.close()
        assert count == 25

    def test_restore_with_safety_backup(self, backup_service):
        """Test that safety backup is created before restore"""
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=False
        )

        # Restore with safety backup
        success = backup_service.restore_backup(
            backup_id=metadata.backup_id,
            verify_first=False,
            create_safety_backup=True
        )

        assert success is True

        # Check that additional backup was created
        backups = backup_service.list_backups()
        assert len(backups) >= 2  # Original + safety backup
        assert any("pre-restore" in (b.tags or []) for b in backups)

    def test_delete_backup(self, backup_service):
        """Test deleting a backup"""
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=False
        )

        # Verify backup exists
        backup_path = backup_service.backup_dir / metadata.filename
        metadata_file = backup_service.metadata_dir / f"{metadata.backup_id}.json"
        assert backup_path.exists()
        assert metadata_file.exists()

        # Delete backup
        success = backup_service.delete_backup(metadata.backup_id)
        assert success is True

        # Verify backup is deleted
        assert not backup_path.exists()
        assert not metadata_file.exists()

    def test_delete_old_backups(self, backup_service):
        """Test cleanup of old backups"""
        # Create 10 backups
        for i in range(10):
            backup_service.create_backup(encrypt=False, compression=False)

        # Keep only 5 most recent
        deleted_count = backup_service.delete_old_backups(keep_count=5)

        assert deleted_count == 5

        # Verify only 5 backups remain
        backups = backup_service.list_backups()
        assert len(backups) == 5

    def test_backup_stats(self, backup_service):
        """Test backup statistics"""
        # Create backups with different configurations
        backup_service.create_backup(encrypt=False, compression=False)
        backup_service.create_backup(encrypt=True, compression=True)
        backup_service.create_backup(encrypt=True, compression=True)

        # Verify one backup
        backups = backup_service.list_backups()
        backup_service.verify_backup(backups[0].backup_id)

        # Get statistics
        stats = backup_service.get_backup_stats()

        assert stats.total_backups == 3
        assert stats.total_size > 0
        assert stats.average_size > 0
        assert stats.verified_backups >= 1
        assert stats.oldest_backup is not None
        assert stats.newest_backup is not None
        assert stats.compression_ratio is not None
        assert 0 < stats.compression_ratio < 1  # Should be compressed

    def test_backup_type_assignment(self, backup_service):
        """Test that backup type is correctly assigned"""
        metadata = backup_service.create_backup(
            encrypt=False,
            compression=False,
            backup_type=BackupType.MANUAL
        )

        assert metadata.backup_type == BackupType.MANUAL

        metadata2 = backup_service.create_backup(
            encrypt=False,
            compression=False,
            backup_type=BackupType.SCHEDULED
        )

        assert metadata2.backup_type == BackupType.SCHEDULED

    def test_backup_metadata_persistence(self, backup_service):
        """Test that backup metadata is saved and loaded correctly"""
        metadata = backup_service.create_backup(
            encrypt=True,
            compression=True,
            description="Test metadata persistence",
            tags=["test", "metadata"]
        )

        # Load metadata
        loaded_metadata = backup_service._load_metadata(metadata.backup_id)

        assert loaded_metadata is not None
        assert loaded_metadata.backup_id == metadata.backup_id
        assert loaded_metadata.filename == metadata.filename
        assert loaded_metadata.encrypted == metadata.encrypted
        assert loaded_metadata.compressed == metadata.compressed
        assert loaded_metadata.description == metadata.description
        assert loaded_metadata.tags == metadata.tags
        assert loaded_metadata.total_records == metadata.total_records

    def test_multiple_backups_different_configs(self, backup_service):
        """Test creating multiple backups with different configurations"""
        configs = [
            {"encrypt": False, "compression": False},
            {"encrypt": True, "compression": False},
            {"encrypt": False, "compression": True},
            {"encrypt": True, "compression": True}
        ]

        metadatas = []
        for config in configs:
            metadata = backup_service.create_backup(**config)
            metadatas.append(metadata)

        # Verify all backups
        for metadata in metadatas:
            verification = backup_service.verify_backup(metadata.backup_id)
            assert verification.verified is True

    def test_backup_file_size_reduction(self, backup_service):
        """Test that compression reduces file size"""
        # Uncompressed backup
        metadata1 = backup_service.create_backup(
            encrypt=False,
            compression=False
        )

        # Compressed backup
        metadata2 = backup_service.create_backup(
            encrypt=False,
            compression=True
        )

        # Verify compression reduces size
        uncompressed_size = metadata1.original_size
        compressed_size = metadata2.compressed_size

        assert compressed_size < uncompressed_size
        # Typically should be at least 20% smaller
        assert compressed_size < uncompressed_size * 0.8


@pytest.mark.asyncio
class TestBackupServiceEdgeCases:
    """Test edge cases and error handling"""

    def test_restore_nonexistent_backup(self, backup_service):
        """Test restoring from non-existent backup raises error"""
        with pytest.raises(ValueError, match="Backup not found"):
            backup_service.restore_backup("nonexistent_backup")

    def test_delete_nonexistent_backup(self, backup_service):
        """Test deleting non-existent backup raises error"""
        with pytest.raises(ValueError, match="Backup not found"):
            backup_service.delete_backup("nonexistent_backup")

    def test_encryption_with_different_password_fails(self, backup_service, temp_db):
        """Test that decryption fails with wrong password"""
        # Create encrypted backup
        metadata = backup_service.create_backup(
            encrypt=True,
            compression=False
        )

        # Create new service with different password
        backup_service2 = BackupService(
            database_url=f"sqlite:///{temp_db}",
            backup_dir=str(backup_service.backup_dir),
            encryption_password="wrong_password"
        )

        # Try to verify - should fail
        verification = backup_service2.verify_backup(metadata.backup_id)
        assert verification.verified is False

    def test_backup_empty_database(self, temp_db):
        """Test backing up an empty database"""
        # Create empty database
        with tempfile.TemporaryDirectory() as temp_dir:
            empty_db = Path(temp_dir) / "empty.db"
            conn = sqlite3.connect(str(empty_db))
            conn.close()

            # Create backup service
            service = BackupService(
                database_url=f"sqlite:///{empty_db}",
                backup_dir=temp_dir + "/backups"
            )

            # Create backup
            metadata = service.create_backup(
                encrypt=False,
                compression=False
            )

            assert metadata is not None
            assert metadata.total_records == 0
