"""
Backup service for database backup and restore operations
Provides encryption, compression, verification, and management features
"""
import gzip
import hashlib
import json
import logging
import os
import shutil
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Tuple

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

from app.schemas.backup import (
    BackupMetadata,
    BackupCreate,
    BackupStatus,
    BackupType,
    BackupVerification,
    BackupStats
)
from app.utils.secure_keyring import ensure_password_configured

logger = logging.getLogger(__name__)


class BackupService:
    """Service for managing database backups"""

    def __init__(
        self,
        database_url: str,
        backup_dir: str = "./data/backups",
        encryption_password: Optional[str] = None
    ):
        """
        Initialize backup service

        Args:
            database_url: SQLAlchemy database URL
            backup_dir: Directory to store backups
            encryption_password: Password for backup encryption (optional, retrieves from keyring if not provided)
        """
        self.database_url = database_url
        self.backup_dir = Path(backup_dir)

        # Get password from keyring if not provided
        # This ensures passwords are never stored in code or config files
        if encryption_password:
            self.encryption_password = encryption_password
        else:
            # Retrieve from secure keyring (will prompt if not set)
            self.encryption_password = ensure_password_configured()

        # Ensure backup directory exists
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Create metadata directory
        self.metadata_dir = self.backup_dir / ".metadata"
        self.metadata_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Backup service initialized. Backup directory: {self.backup_dir}")

    def _get_database_path(self) -> Path:
        """Extract database file path from database URL"""
        if self.database_url.startswith("sqlite:///"):
            db_path = self.database_url.replace("sqlite:///", "")
            return Path(db_path)
        else:
            raise ValueError(f"Unsupported database URL: {self.database_url}")

    def _generate_backup_id(self) -> str:
        """Generate unique backup ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"backup_{timestamp}"

    def _generate_filename(self, backup_id: str, encrypted: bool, compressed: bool) -> str:
        """Generate backup filename"""
        extension = ".db"
        if compressed:
            extension += ".gz"
        if encrypted:
            extension += ".enc"
        return f"{backup_id}{extension}"

    def _derive_encryption_key(self, salt: bytes) -> bytes:
        """Derive encryption key from password using PBKDF2"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return kdf.derive(self.encryption_password.encode())

    def _encrypt_file(self, input_path: Path, output_path: Path) -> bytes:
        """
        Encrypt file using AES-256

        Args:
            input_path: Path to input file
            output_path: Path to encrypted output file

        Returns:
            Salt used for key derivation
        """
        # Generate random salt
        salt = os.urandom(16)

        # Derive encryption key
        key = self._derive_encryption_key(salt)
        cipher = Fernet(Fernet.generate_key())  # Use Fernet for simplicity

        # For production, use proper AES-256 with derived key
        # Here we'll use a simpler approach with Fernet
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        import base64

        # Read input file
        with open(input_path, 'rb') as f:
            data = f.read()

        # Generate IV
        iv = os.urandom(16)

        # Create cipher
        cipher = Cipher(
            algorithms.AES(key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()

        # Pad data to block size
        block_size = 16
        padding_length = block_size - (len(data) % block_size)
        padded_data = data + bytes([padding_length] * padding_length)

        # Encrypt
        encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

        # Write encrypted file (salt + iv + encrypted_data)
        with open(output_path, 'wb') as f:
            f.write(salt)
            f.write(iv)
            f.write(encrypted_data)

        logger.info(f"File encrypted: {output_path}")
        return salt

    def _decrypt_file(self, input_path: Path, output_path: Path) -> None:
        """
        Decrypt file using AES-256

        Args:
            input_path: Path to encrypted file
            output_path: Path to decrypted output file
        """
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend

        # Read encrypted file
        with open(input_path, 'rb') as f:
            salt = f.read(16)
            iv = f.read(16)
            encrypted_data = f.read()

        # Derive encryption key
        key = self._derive_encryption_key(salt)

        # Create cipher
        cipher = Cipher(
            algorithms.AES(key),
            modes.CBC(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()

        # Decrypt
        padded_data = decryptor.update(encrypted_data) + decryptor.finalize()

        # Remove padding
        padding_length = padded_data[-1]
        data = padded_data[:-padding_length]

        # Write decrypted file
        with open(output_path, 'wb') as f:
            f.write(data)

        logger.info(f"File decrypted: {output_path}")

    def _compress_file(self, input_path: Path, output_path: Path) -> None:
        """
        Compress file using gzip

        Args:
            input_path: Path to input file
            output_path: Path to compressed output file
        """
        with open(input_path, 'rb') as f_in:
            with gzip.open(output_path, 'wb', compresslevel=9) as f_out:
                shutil.copyfileobj(f_in, f_out)

        logger.info(f"File compressed: {output_path}")

    def _decompress_file(self, input_path: Path, output_path: Path) -> None:
        """
        Decompress gzip file

        Args:
            input_path: Path to compressed file
            output_path: Path to decompressed output file
        """
        with gzip.open(input_path, 'rb') as f_in:
            with open(output_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        logger.info(f"File decompressed: {output_path}")

    def _calculate_checksum(self, file_path: Path) -> str:
        """
        Calculate SHA-256 checksum of file

        Args:
            file_path: Path to file

        Returns:
            Hexadecimal checksum string
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def _get_schema_version(self, engine: Engine) -> Optional[str]:
        """Get current database schema version (Alembic revision)"""
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                row = result.fetchone()
                return row[0] if row else None
        except Exception as e:
            logger.warning(f"Could not get schema version: {e}")
            return None

    def _get_table_counts(self, engine: Engine) -> Dict[str, int]:
        """Get record count for each table"""
        table_counts = {}
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        with engine.connect() as conn:
            for table in tables:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    table_counts[table] = count
                except Exception as e:
                    logger.warning(f"Could not count records in table {table}: {e}")
                    table_counts[table] = 0

        return table_counts

    def _save_metadata(self, metadata: BackupMetadata) -> None:
        """Save backup metadata to JSON file"""
        metadata_file = self.metadata_dir / f"{metadata.backup_id}.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata.model_dump(mode='json'), f, indent=2, default=str)
        logger.info(f"Metadata saved: {metadata_file}")

    def _load_metadata(self, backup_id: str) -> Optional[BackupMetadata]:
        """Load backup metadata from JSON file"""
        metadata_file = self.metadata_dir / f"{backup_id}.json"
        if not metadata_file.exists():
            return None

        try:
            with open(metadata_file, 'r') as f:
                data = json.load(f)
            return BackupMetadata(**data)
        except Exception as e:
            logger.error(f"Failed to load metadata for {backup_id}: {e}")
            return None

    def _verify_sqlite_integrity(self, db_path: Path) -> Tuple[bool, List[str]]:
        """
        Verify SQLite database integrity

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()

            # Run integrity check
            cursor.execute("PRAGMA integrity_check")
            result = cursor.fetchall()

            if result and result[0][0] != "ok":
                errors.extend([row[0] for row in result])

            conn.close()

            return len(errors) == 0, errors
        except Exception as e:
            errors.append(f"Integrity check failed: {str(e)}")
            return False, errors

    def create_backup(
        self,
        encrypt: bool = True,
        compression: bool = True,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        backup_type: BackupType = BackupType.MANUAL
    ) -> BackupMetadata:
        """
        Create a new database backup

        Args:
            encrypt: Whether to encrypt the backup
            compression: Whether to compress the backup
            description: Optional backup description
            tags: Optional tags for categorization
            backup_type: Type of backup (manual, scheduled, auto)

        Returns:
            BackupMetadata object
        """
        logger.info("Starting backup creation...")

        # Get database path
        db_path = self._get_database_path()
        if not db_path.exists():
            raise FileNotFoundError(f"Database file not found: {db_path}")

        # Generate backup ID and filename
        backup_id = self._generate_backup_id()
        filename = self._generate_filename(backup_id, encrypt, compression)
        backup_path = self.backup_dir / filename

        # Get database information
        engine = create_engine(self.database_url)
        schema_version = self._get_schema_version(engine)
        table_counts = self._get_table_counts(engine)
        total_records = sum(table_counts.values())
        engine.dispose()

        # Get original size
        original_size = db_path.stat().st_size

        # Create temporary working directory
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            current_file = temp_path / "backup.db"

            # Copy database file
            shutil.copy2(db_path, current_file)
            logger.info(f"Database copied to temporary location")

            # Compress if requested
            if compression:
                compressed_file = temp_path / "backup.db.gz"
                self._compress_file(current_file, compressed_file)
                current_file = compressed_file
                logger.info(f"Backup compressed")

            # Encrypt if requested
            if encrypt:
                encrypted_file = temp_path / "backup.db.gz.enc" if compression else temp_path / "backup.db.enc"
                self._encrypt_file(current_file, encrypted_file)
                current_file = encrypted_file
                logger.info(f"Backup encrypted")

            # Move to backup directory
            shutil.move(str(current_file), str(backup_path))

        # Calculate checksum
        checksum = self._calculate_checksum(backup_path)

        # Get compressed size
        compressed_size = backup_path.stat().st_size if (compression or encrypt) else None

        # Create metadata
        metadata = BackupMetadata(
            backup_id=backup_id,
            filename=filename,
            created_at=datetime.utcnow(),
            backup_type=backup_type,
            status=BackupStatus.COMPLETED,
            original_size=original_size,
            compressed_size=compressed_size,
            encrypted=encrypt,
            compressed=compression,
            checksum=checksum,
            checksum_algorithm="sha256",
            schema_version=schema_version,
            table_counts=table_counts,
            total_records=total_records,
            description=description,
            tags=tags or []
        )

        # Save metadata
        self._save_metadata(metadata)

        logger.info(f"Backup created successfully: {backup_id}")
        logger.info(f"Original size: {original_size} bytes")
        if compressed_size:
            logger.info(f"Compressed size: {compressed_size} bytes ({compressed_size/original_size*100:.1f}%)")

        return metadata

    def verify_backup(self, backup_id: str) -> BackupVerification:
        """
        Verify backup integrity

        Args:
            backup_id: Backup ID to verify

        Returns:
            BackupVerification object
        """
        logger.info(f"Verifying backup: {backup_id}")

        errors = []
        checks_performed = []

        # Load metadata
        metadata = self._load_metadata(backup_id)
        if not metadata:
            return BackupVerification(
                backup_id=backup_id,
                verified=False,
                verification_date=datetime.utcnow(),
                errors=["Metadata file not found"],
                checks_performed=[]
            )

        backup_path = self.backup_dir / metadata.filename

        # Check if backup file exists
        if not backup_path.exists():
            errors.append("Backup file not found")
            return BackupVerification(
                backup_id=backup_id,
                verified=False,
                verification_date=datetime.utcnow(),
                errors=errors,
                checks_performed=["file_existence"]
            )

        checks_performed.append("file_existence")

        # Verify checksum
        try:
            current_checksum = self._calculate_checksum(backup_path)
            if current_checksum != metadata.checksum:
                errors.append(f"Checksum mismatch: expected {metadata.checksum}, got {current_checksum}")
            checks_performed.append("checksum_validation")
        except Exception as e:
            errors.append(f"Checksum verification failed: {str(e)}")

        # Try to decrypt and decompress to verify integrity
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            current_file = backup_path

            try:
                # Decrypt if encrypted
                if metadata.encrypted:
                    decrypted_file = temp_path / "decrypted.db"
                    self._decrypt_file(current_file, decrypted_file)
                    current_file = decrypted_file
                    checks_performed.append("decryption_test")
            except Exception as e:
                errors.append(f"Decryption failed: {str(e)}")

            try:
                # Decompress if compressed
                if metadata.compressed and not errors:
                    decompressed_file = temp_path / "decompressed.db"
                    self._decompress_file(current_file, decompressed_file)
                    current_file = decompressed_file
                    checks_performed.append("decompression_test")
            except Exception as e:
                errors.append(f"Decompression failed: {str(e)}")

            # Verify SQLite integrity
            if not errors:
                try:
                    is_valid, integrity_errors = self._verify_sqlite_integrity(current_file)
                    if not is_valid:
                        errors.extend(integrity_errors)
                    checks_performed.append("sqlite_integrity_check")
                except Exception as e:
                    errors.append(f"SQLite integrity check failed: {str(e)}")

        # Update metadata
        verified = len(errors) == 0
        metadata.verified = verified
        metadata.verification_date = datetime.utcnow()
        metadata.verification_errors = errors
        if verified:
            metadata.status = BackupStatus.VERIFIED
        else:
            metadata.status = BackupStatus.CORRUPTED
        self._save_metadata(metadata)

        logger.info(f"Verification {'passed' if verified else 'failed'}: {backup_id}")

        return BackupVerification(
            backup_id=backup_id,
            verified=verified,
            verification_date=datetime.utcnow(),
            errors=errors,
            checks_performed=checks_performed
        )

    def list_backups(self, limit: int = 50) -> List[BackupMetadata]:
        """
        List available backups

        Args:
            limit: Maximum number of backups to return

        Returns:
            List of BackupMetadata objects
        """
        backups = []

        # Get all metadata files
        metadata_files = sorted(
            self.metadata_dir.glob("*.json"),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )

        for metadata_file in metadata_files[:limit]:
            backup_id = metadata_file.stem
            metadata = self._load_metadata(backup_id)
            if metadata:
                backups.append(metadata)

        logger.info(f"Found {len(backups)} backups")
        return backups

    def restore_backup(
        self,
        backup_id: str,
        verify_first: bool = True,
        create_safety_backup: bool = True
    ) -> bool:
        """
        Restore database from backup

        Args:
            backup_id: Backup ID to restore from
            verify_first: Verify backup integrity before restoring
            create_safety_backup: Create backup of current database before restore

        Returns:
            True if restore successful, False otherwise
        """
        logger.info(f"Starting restore from backup: {backup_id}")

        # Load metadata
        metadata = self._load_metadata(backup_id)
        if not metadata:
            raise ValueError(f"Backup not found: {backup_id}")

        backup_path = self.backup_dir / metadata.filename
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        # Verify backup first if requested
        if verify_first:
            verification = self.verify_backup(backup_id)
            if not verification.verified:
                raise ValueError(f"Backup verification failed: {verification.errors}")

        # Create safety backup if requested
        if create_safety_backup:
            try:
                safety_metadata = self.create_backup(
                    encrypt=True,
                    compression=True,
                    description=f"Safety backup before restore from {backup_id}",
                    tags=["safety", "pre-restore"],
                    backup_type=BackupType.AUTO
                )
                logger.info(f"Safety backup created: {safety_metadata.backup_id}")
            except Exception as e:
                logger.error(f"Failed to create safety backup: {e}")
                raise

        # Get database path
        db_path = self._get_database_path()

        # Restore backup
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            current_file = backup_path

            # Copy backup to temp directory
            temp_backup = temp_path / metadata.filename
            shutil.copy2(current_file, temp_backup)
            current_file = temp_backup

            # Decrypt if encrypted
            if metadata.encrypted:
                decrypted_file = temp_path / "decrypted"
                self._decrypt_file(current_file, decrypted_file)
                current_file = decrypted_file
                logger.info("Backup decrypted")

            # Decompress if compressed
            if metadata.compressed:
                decompressed_file = temp_path / "decompressed.db"
                self._decompress_file(current_file, decompressed_file)
                current_file = decompressed_file
                logger.info("Backup decompressed")

            # Verify SQLite integrity before restore
            is_valid, errors = self._verify_sqlite_integrity(current_file)
            if not is_valid:
                raise ValueError(f"Backup database is corrupted: {errors}")

            # Replace current database
            shutil.copy2(current_file, db_path)
            logger.info(f"Database restored from {backup_id}")

        return True

    def delete_backup(self, backup_id: str) -> bool:
        """
        Delete a specific backup

        Args:
            backup_id: Backup ID to delete

        Returns:
            True if deleted successfully
        """
        logger.info(f"Deleting backup: {backup_id}")

        # Load metadata
        metadata = self._load_metadata(backup_id)
        if not metadata:
            raise ValueError(f"Backup not found: {backup_id}")

        # Delete backup file
        backup_path = self.backup_dir / metadata.filename
        if backup_path.exists():
            backup_path.unlink()
            logger.info(f"Backup file deleted: {backup_path}")

        # Delete metadata file
        metadata_file = self.metadata_dir / f"{backup_id}.json"
        if metadata_file.exists():
            metadata_file.unlink()
            logger.info(f"Metadata file deleted: {metadata_file}")

        return True

    def delete_old_backups(self, keep_count: int = 30) -> int:
        """
        Delete old backups, keeping only the most recent ones

        Args:
            keep_count: Number of backups to keep

        Returns:
            Number of backups deleted
        """
        logger.info(f"Cleaning up old backups, keeping {keep_count} most recent")

        backups = self.list_backups(limit=1000)
        deleted_count = 0

        if len(backups) > keep_count:
            backups_to_delete = backups[keep_count:]
            for backup in backups_to_delete:
                try:
                    self.delete_backup(backup.backup_id)
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"Failed to delete backup {backup.backup_id}: {e}")

        logger.info(f"Deleted {deleted_count} old backups")
        return deleted_count

    def get_backup_stats(self) -> BackupStats:
        """
        Get backup statistics

        Returns:
            BackupStats object
        """
        backups = self.list_backups(limit=1000)

        if not backups:
            return BackupStats(
                total_backups=0,
                total_size=0,
                oldest_backup=None,
                newest_backup=None,
                verified_backups=0,
                failed_backups=0,
                average_size=0,
                compression_ratio=None
            )

        total_size = sum(b.compressed_size or b.original_size for b in backups)
        verified_count = sum(1 for b in backups if b.verified)
        failed_count = sum(1 for b in backups if b.status == BackupStatus.FAILED)

        # Calculate average compression ratio
        compressed_backups = [b for b in backups if b.compressed and b.compressed_size]
        avg_compression_ratio = None
        if compressed_backups:
            ratios = [b.compressed_size / b.original_size for b in compressed_backups]
            avg_compression_ratio = sum(ratios) / len(ratios)

        return BackupStats(
            total_backups=len(backups),
            total_size=total_size,
            oldest_backup=min(b.created_at for b in backups),
            newest_backup=max(b.created_at for b in backups),
            verified_backups=verified_count,
            failed_backups=failed_count,
            average_size=total_size // len(backups) if backups else 0,
            compression_ratio=avg_compression_ratio
        )
