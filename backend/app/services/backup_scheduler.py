"""
Backup scheduler service for automated database backups
Uses APScheduler for cron-based scheduling
"""
import logging
from typing import Optional
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from app.services.backup_service import BackupService
from app.schemas.backup import BackupType, BackupConfig

logger = logging.getLogger(__name__)


class BackupScheduler:
    """Service for scheduling automated database backups"""

    def __init__(self, backup_service: BackupService, config: Optional[BackupConfig] = None):
        """
        Initialize backup scheduler

        Args:
            backup_service: BackupService instance
            config: Backup configuration (optional)
        """
        self.backup_service = backup_service
        self.config = config or BackupConfig()
        self.scheduler = BackgroundScheduler()
        self._job_id = "scheduled_backup"

        # Add event listeners
        self.scheduler.add_listener(self._job_executed, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self._job_error, EVENT_JOB_ERROR)

        logger.info("Backup scheduler initialized")

    def _job_executed(self, event) -> None:
        """Callback when scheduled job executes successfully"""
        logger.info(f"Scheduled backup job executed successfully at {datetime.now()}")

    def _job_error(self, event) -> None:
        """Callback when scheduled job encounters error"""
        logger.error(f"Scheduled backup job failed: {event.exception}")

    def _perform_scheduled_backup(self) -> None:
        """Execute scheduled backup"""
        try:
            logger.info("Starting scheduled backup...")

            # Create backup
            metadata = self.backup_service.create_backup(
                encrypt=self.config.encryption_enabled,
                compression=self.config.compression_enabled,
                description="Automated scheduled backup",
                tags=["scheduled", "automated"],
                backup_type=BackupType.SCHEDULED
            )

            logger.info(f"Scheduled backup created: {metadata.backup_id}")

            # Verify if configured
            if self.config.verify_after_create:
                verification = self.backup_service.verify_backup(metadata.backup_id)
                if verification.verified:
                    logger.info(f"Backup verified successfully: {metadata.backup_id}")
                else:
                    logger.error(f"Backup verification failed: {verification.errors}")

            # Cleanup old backups
            deleted_count = self.backup_service.delete_old_backups(
                keep_count=self.config.max_backups
            )
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old backups")

        except Exception as e:
            logger.error(f"Scheduled backup failed: {str(e)}", exc_info=True)
            raise

    def start(self) -> None:
        """Start the backup scheduler"""
        if not self.config.enabled:
            logger.info("Backup scheduler is disabled in configuration")
            return

        try:
            # Parse cron expression
            cron_parts = self.config.schedule.split()
            if len(cron_parts) != 5:
                raise ValueError(f"Invalid cron expression: {self.config.schedule}")

            minute, hour, day, month, day_of_week = cron_parts

            # Create cron trigger
            trigger = CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week
            )

            # Add job to scheduler
            self.scheduler.add_job(
                self._perform_scheduled_backup,
                trigger=trigger,
                id=self._job_id,
                name="Scheduled Database Backup",
                replace_existing=True,
                max_instances=1  # Prevent concurrent backups
            )

            # Start scheduler
            self.scheduler.start()

            logger.info(f"Backup scheduler started with schedule: {self.config.schedule}")
            logger.info(f"Next backup scheduled for: {self.scheduler.get_job(self._job_id).next_run_time}")

        except Exception as e:
            logger.error(f"Failed to start backup scheduler: {str(e)}", exc_info=True)
            raise

    def stop(self) -> None:
        """Stop the backup scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("Backup scheduler stopped")

    def trigger_backup(self) -> None:
        """Manually trigger a backup immediately"""
        logger.info("Manually triggering backup...")
        self._perform_scheduled_backup()

    def get_next_run_time(self) -> Optional[datetime]:
        """Get the next scheduled run time"""
        if not self.scheduler.running:
            return None

        job = self.scheduler.get_job(self._job_id)
        return job.next_run_time if job else None

    def update_schedule(self, new_schedule: str) -> None:
        """
        Update the backup schedule

        Args:
            new_schedule: New cron expression
        """
        self.config.schedule = new_schedule

        # Remove existing job
        if self.scheduler.get_job(self._job_id):
            self.scheduler.remove_job(self._job_id)

        # Re-add with new schedule if scheduler is running
        if self.scheduler.running:
            self.stop()
            self.start()

        logger.info(f"Backup schedule updated to: {new_schedule}")

    def is_running(self) -> bool:
        """Check if scheduler is running"""
        return self.scheduler.running

    def get_job_info(self) -> Optional[dict]:
        """Get information about the scheduled job"""
        if not self.scheduler.running:
            return None

        job = self.scheduler.get_job(self._job_id)
        if not job:
            return None

        return {
            "job_id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time,
            "trigger": str(job.trigger),
            "pending": job.pending
        }
