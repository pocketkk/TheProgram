"""
Tests for backup scheduler service
Tests scheduled backup automation and configuration
"""
import pytest
import time
import tempfile
import sqlite3
from pathlib import Path
from datetime import datetime

from app.services.backup_service import BackupService
from app.services.backup_scheduler import BackupScheduler
from app.schemas.backup import BackupConfig


@pytest.fixture
def temp_db():
    """Create a temporary SQLite database for testing"""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"

        # Create a test database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE test_table (id INTEGER PRIMARY KEY, data TEXT)")
        cursor.execute("INSERT INTO test_table (data) VALUES ('test')")
        conn.commit()
        conn.close()

        yield db_path


@pytest.fixture
def backup_service(temp_db):
    """Create backup service instance"""
    with tempfile.TemporaryDirectory() as backup_dir:
        database_url = f"sqlite:///{temp_db}"
        service = BackupService(
            database_url=database_url,
            backup_dir=backup_dir,
            encryption_password="test_password"
        )
        yield service


class TestBackupScheduler:
    """Test suite for BackupScheduler"""

    def test_scheduler_initialization(self, backup_service):
        """Test that scheduler initializes correctly"""
        config = BackupConfig(
            enabled=True,
            schedule="0 2 * * *",
            retention_days=30
        )

        scheduler = BackupScheduler(backup_service, config)

        assert scheduler is not None
        assert scheduler.backup_service == backup_service
        assert scheduler.config.enabled is True
        assert scheduler.scheduler is not None

    def test_scheduler_disabled(self, backup_service):
        """Test that disabled scheduler doesn't start"""
        config = BackupConfig(enabled=False)

        scheduler = BackupScheduler(backup_service, config)
        scheduler.start()

        assert scheduler.is_running() is False

    def test_scheduler_start_stop(self, backup_service):
        """Test starting and stopping scheduler"""
        config = BackupConfig(
            enabled=True,
            schedule="0 2 * * *"  # Daily at 2 AM
        )

        scheduler = BackupScheduler(backup_service, config)
        scheduler.start()

        assert scheduler.is_running() is True

        # Get next run time
        next_run = scheduler.get_next_run_time()
        assert next_run is not None
        assert next_run > datetime.now()

        # Stop scheduler
        scheduler.stop()
        assert scheduler.is_running() is False

    def test_scheduler_job_info(self, backup_service):
        """Test getting job information"""
        config = BackupConfig(
            enabled=True,
            schedule="0 2 * * *"
        )

        scheduler = BackupScheduler(backup_service, config)
        scheduler.start()

        job_info = scheduler.get_job_info()

        assert job_info is not None
        assert job_info["job_id"] == "scheduled_backup"
        assert job_info["name"] == "Scheduled Database Backup"
        assert job_info["next_run_time"] is not None

        scheduler.stop()

    def test_manual_trigger_backup(self, backup_service):
        """Test manually triggering a backup"""
        config = BackupConfig(
            enabled=True,
            encryption_enabled=True,
            compression_enabled=True
        )

        scheduler = BackupScheduler(backup_service, config)

        # Manually trigger backup
        scheduler.trigger_backup()

        # Verify backup was created
        backups = backup_service.list_backups()
        assert len(backups) == 1
        assert backups[0].backup_type.value == "scheduled"

    def test_scheduled_backup_with_cleanup(self, backup_service):
        """Test that scheduled backup includes cleanup"""
        config = BackupConfig(
            enabled=True,
            max_backups=3,
            encryption_enabled=False,
            compression_enabled=False
        )

        scheduler = BackupScheduler(backup_service, config)

        # Create some old backups
        for i in range(5):
            backup_service.create_backup(encrypt=False, compression=False)

        # Trigger scheduled backup
        scheduler.trigger_backup()

        # Should have 4 backups (3 old + 1 new, then cleaned to 3)
        backups = backup_service.list_backups()
        assert len(backups) <= config.max_backups + 1  # May have one extra before cleanup

    def test_update_schedule(self, backup_service):
        """Test updating the backup schedule"""
        config = BackupConfig(
            enabled=True,
            schedule="0 2 * * *"
        )

        scheduler = BackupScheduler(backup_service, config)
        scheduler.start()

        # Get initial next run time
        initial_next_run = scheduler.get_next_run_time()

        # Update schedule to different time
        scheduler.update_schedule("0 14 * * *")  # 2 PM instead of 2 AM

        # Verify schedule was updated
        assert scheduler.config.schedule == "0 14 * * *"

        scheduler.stop()

    def test_scheduler_with_verification(self, backup_service):
        """Test scheduled backup with verification enabled"""
        config = BackupConfig(
            enabled=True,
            verify_after_create=True,
            encryption_enabled=True,
            compression_enabled=True
        )

        scheduler = BackupScheduler(backup_service, config)

        # Trigger backup
        scheduler.trigger_backup()

        # Verify backup was verified
        backups = backup_service.list_backups()
        assert len(backups) == 1
        assert backups[0].verified is True

    def test_scheduler_cron_validation(self, backup_service):
        """Test that invalid cron expressions are rejected"""
        config = BackupConfig(
            enabled=True,
            schedule="invalid cron"
        )

        scheduler = BackupScheduler(backup_service, config)

        with pytest.raises(Exception):
            scheduler.start()

    def test_multiple_schedule_formats(self, backup_service):
        """Test different cron schedule formats"""
        schedules = [
            "0 2 * * *",      # Daily at 2 AM
            "0 */6 * * *",    # Every 6 hours
            "0 0 * * 0",      # Weekly on Sunday
            "0 0 1 * *",      # Monthly on 1st
        ]

        for schedule in schedules:
            config = BackupConfig(
                enabled=True,
                schedule=schedule
            )

            scheduler = BackupScheduler(backup_service, config)
            scheduler.start()

            assert scheduler.is_running() is True
            assert scheduler.get_next_run_time() is not None

            scheduler.stop()

    def test_scheduler_prevents_concurrent_backups(self, backup_service):
        """Test that scheduler prevents concurrent backup jobs"""
        config = BackupConfig(
            enabled=True,
            schedule="* * * * *"  # Every minute
        )

        scheduler = BackupScheduler(backup_service, config)
        scheduler.start()

        # Get job
        job_info = scheduler.get_job_info()
        assert job_info is not None

        # Verify max_instances is set to 1
        job = scheduler.scheduler.get_job("scheduled_backup")
        assert job.max_instances == 1

        scheduler.stop()


class TestBackupConfig:
    """Test BackupConfig schema validation"""

    def test_default_config(self):
        """Test default configuration values"""
        config = BackupConfig()

        assert config.enabled is True
        assert config.schedule == "0 2 * * *"
        assert config.retention_days == 30
        assert config.encryption_enabled is True
        assert config.compression_enabled is True
        assert config.max_backups == 30
        assert config.verify_after_create is True

    def test_custom_config(self):
        """Test custom configuration"""
        config = BackupConfig(
            enabled=False,
            schedule="0 3 * * *",
            retention_days=60,
            max_backups=50,
            encryption_enabled=False
        )

        assert config.enabled is False
        assert config.schedule == "0 3 * * *"
        assert config.retention_days == 60
        assert config.max_backups == 50
        assert config.encryption_enabled is False

    def test_invalid_cron_schedule(self):
        """Test that invalid cron schedule raises error"""
        with pytest.raises(ValueError, match="Invalid cron expression"):
            BackupConfig(schedule="invalid")

    def test_retention_days_validation(self):
        """Test retention days validation"""
        # Valid values
        config = BackupConfig(retention_days=1)
        assert config.retention_days == 1

        config = BackupConfig(retention_days=365)
        assert config.retention_days == 365

        # Invalid values should raise validation error
        with pytest.raises(ValueError):
            BackupConfig(retention_days=0)

        with pytest.raises(ValueError):
            BackupConfig(retention_days=400)

    def test_max_backups_validation(self):
        """Test max backups validation"""
        # Valid values
        config = BackupConfig(max_backups=1)
        assert config.max_backups == 1

        config = BackupConfig(max_backups=100)
        assert config.max_backups == 100

        # Invalid values
        with pytest.raises(ValueError):
            BackupConfig(max_backups=0)

        with pytest.raises(ValueError):
            BackupConfig(max_backups=101)
