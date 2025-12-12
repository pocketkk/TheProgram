"""
Image Storage Service

Manages image file storage on the local filesystem.
Handles saving, loading, and organizing generated images.
Part of Phase 5: Image Generation.
"""
import os
import base64
import uuid
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ImageStorageService:
    """
    Manages image file storage and organization

    Directory structure:
        {base_path}/
            tarot/{collection_id}/
                major_00_the_fool.png
                major_01_the_magician.png
                ...
            backgrounds/
                theme_cosmic_1234.png
            infographics/
                chart_summary_1234.png
            custom/
                image_1234.png
            temp/
                (temporary files, cleaned up periodically)

    Usage:
        service = ImageStorageService()
        path = service.save_image(image_bytes, "tarot", "major_00_the_fool.png", collection_id)
        url = service.get_file_url(path)
    """

    CATEGORIES = ["tarot", "backgrounds", "infographics", "custom", "temp", "coloring_book", "artwork"]

    def __init__(self, base_path: Optional[str] = None):
        """
        Initialize storage service

        Args:
            base_path: Base directory for image storage.
                      Defaults to USER_DATA_DIR/images or ./data/images
        """
        self.base_path = self._resolve_base_path(base_path)
        self._ensure_directories()

    def _resolve_base_path(self, base_path: Optional[str]) -> Path:
        """Resolve the base path for image storage"""
        if base_path:
            return Path(base_path)

        # Check for Electron user data directory
        user_data_dir = os.getenv("USER_DATA_DIR")
        if user_data_dir:
            return Path(user_data_dir) / "images"

        # Fallback to local data directory
        return Path("./data/images")

    def _ensure_directories(self):
        """Create all required directories"""
        for category in self.CATEGORIES:
            (self.base_path / category).mkdir(parents=True, exist_ok=True)

    def save_image(
        self,
        image_data: bytes,
        category: str,
        filename: str,
        collection_id: Optional[str] = None,
    ) -> str:
        """
        Save an image to storage

        Args:
            image_data: Raw image bytes
            category: Storage category (tarot, backgrounds, etc.)
            filename: Filename to use
            collection_id: Optional collection ID for organizing tarot decks

        Returns:
            Relative path from base directory
        """
        if category not in self.CATEGORIES:
            raise ValueError(f"Invalid category: {category}. Must be one of {self.CATEGORIES}")

        # Build path
        if collection_id and category == "tarot":
            rel_path = Path(category) / collection_id / filename
        else:
            rel_path = Path(category) / filename

        full_path = self.base_path / rel_path

        # Ensure directory exists
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        with open(full_path, "wb") as f:
            f.write(image_data)

        logger.info(f"Saved image to {rel_path}")
        return str(rel_path)

    def save_image_base64(
        self,
        base64_data: str,
        category: str,
        filename: str,
        collection_id: Optional[str] = None,
    ) -> str:
        """
        Save a base64-encoded image

        Args:
            base64_data: Base64 encoded image (with or without data URL prefix)
            category: Storage category
            filename: Filename to use
            collection_id: Optional collection ID

        Returns:
            Relative path from base directory
        """
        # Strip data URL prefix if present
        if base64_data.startswith("data:"):
            base64_data = base64_data.split(",", 1)[1]

        image_bytes = base64.b64decode(base64_data)
        return self.save_image(image_bytes, category, filename, collection_id)

    def get_file_path(self, relative_path: str) -> Path:
        """
        Get absolute path for a relative path

        Args:
            relative_path: Relative path from base directory

        Returns:
            Absolute Path object
        """
        return self.base_path / relative_path

    def get_file_url(self, relative_path: str) -> str:
        """
        Get URL for serving the image

        Args:
            relative_path: Relative path from base directory

        Returns:
            URL path for API endpoint
        """
        return f"/api/images/file/{relative_path}"

    def get_file_url_local(self, relative_path: str) -> str:
        """
        Get local file URL for Electron

        Args:
            relative_path: Relative path from base directory

        Returns:
            file:// URL for local access
        """
        full_path = self.get_file_path(relative_path)
        return f"file://{full_path.absolute()}"

    def load_image(self, relative_path: str) -> Optional[bytes]:
        """
        Load image bytes from storage

        Args:
            relative_path: Relative path from base directory

        Returns:
            Image bytes or None if not found
        """
        full_path = self.get_file_path(relative_path)
        if not full_path.exists():
            return None

        with open(full_path, "rb") as f:
            return f.read()

    def load_image_base64(self, relative_path: str) -> Optional[str]:
        """
        Load image as base64 string

        Args:
            relative_path: Relative path from base directory

        Returns:
            Base64 encoded image or None if not found
        """
        image_bytes = self.load_image(relative_path)
        if image_bytes is None:
            return None
        return base64.b64encode(image_bytes).decode()

    def delete_image(self, relative_path: str) -> bool:
        """
        Delete an image from storage

        Args:
            relative_path: Relative path from base directory

        Returns:
            True if deleted, False if not found
        """
        full_path = self.get_file_path(relative_path)
        if not full_path.exists():
            return False

        full_path.unlink()
        logger.info(f"Deleted image: {relative_path}")

        # Clean up empty directories
        self._cleanup_empty_dirs(full_path.parent)
        return True

    def _cleanup_empty_dirs(self, directory: Path):
        """Remove empty directories up to base path"""
        try:
            while directory != self.base_path and directory.is_dir():
                if not any(directory.iterdir()):
                    directory.rmdir()
                    directory = directory.parent
                else:
                    break
        except Exception as e:
            logger.warning(f"Could not cleanup directory: {e}")

    def list_images(
        self,
        category: Optional[str] = None,
        collection_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        List images in storage

        Args:
            category: Filter by category
            collection_id: Filter by collection (for tarot)
            limit: Maximum number of results

        Returns:
            List of image info dicts
        """
        images = []
        search_paths = []

        if category:
            if collection_id and category == "tarot":
                search_paths.append(self.base_path / category / collection_id)
            else:
                search_paths.append(self.base_path / category)
        else:
            for cat in self.CATEGORIES:
                if cat != "temp":  # Skip temp in general listing
                    search_paths.append(self.base_path / cat)

        for search_path in search_paths:
            if not search_path.exists():
                continue

            for file_path in search_path.rglob("*.png"):
                if len(images) >= limit:
                    break

                rel_path = file_path.relative_to(self.base_path)
                stat = file_path.stat()

                images.append({
                    "path": str(rel_path),
                    "filename": file_path.name,
                    "category": rel_path.parts[0] if rel_path.parts else "unknown",
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "url": self.get_file_url(str(rel_path)),
                })

            # Also check for jpg/jpeg
            for file_path in search_path.rglob("*.jpg"):
                if len(images) >= limit:
                    break

                rel_path = file_path.relative_to(self.base_path)
                stat = file_path.stat()

                images.append({
                    "path": str(rel_path),
                    "filename": file_path.name,
                    "category": rel_path.parts[0] if rel_path.parts else "unknown",
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "url": self.get_file_url(str(rel_path)),
                })

        # Sort by modified time, newest first
        images.sort(key=lambda x: x["modified"], reverse=True)
        return images[:limit]

    def cleanup_temp(self, max_age_hours: int = 24) -> int:
        """
        Clean up old temporary files

        Args:
            max_age_hours: Maximum age in hours before deletion

        Returns:
            Number of files deleted
        """
        temp_dir = self.base_path / "temp"
        if not temp_dir.exists():
            return 0

        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        deleted = 0

        for file_path in temp_dir.iterdir():
            if file_path.is_file():
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                if mtime < cutoff:
                    file_path.unlink()
                    deleted += 1

        logger.info(f"Cleaned up {deleted} temporary files")
        return deleted

    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics

        Returns:
            Dict with storage info by category
        """
        stats = {
            "total_files": 0,
            "total_size_bytes": 0,
            "by_category": {},
        }

        for category in self.CATEGORIES:
            cat_path = self.base_path / category
            if not cat_path.exists():
                stats["by_category"][category] = {"files": 0, "size_bytes": 0}
                continue

            files = list(cat_path.rglob("*"))
            file_count = sum(1 for f in files if f.is_file())
            total_size = sum(f.stat().st_size for f in files if f.is_file())

            stats["by_category"][category] = {
                "files": file_count,
                "size_bytes": total_size,
                "size_mb": round(total_size / (1024 * 1024), 2),
            }

            stats["total_files"] += file_count
            stats["total_size_bytes"] += total_size

        stats["total_size_mb"] = round(stats["total_size_bytes"] / (1024 * 1024), 2)
        return stats

    def generate_filename(
        self,
        prefix: str,
        extension: str = "png",
        include_timestamp: bool = True,
    ) -> str:
        """
        Generate a unique filename

        Args:
            prefix: Filename prefix
            extension: File extension
            include_timestamp: Include timestamp in filename

        Returns:
            Generated filename
        """
        unique_id = str(uuid.uuid4())[:8]

        if include_timestamp:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            return f"{prefix}_{timestamp}_{unique_id}.{extension}"
        else:
            return f"{prefix}_{unique_id}.{extension}"


# Singleton instance
_storage_instance: Optional[ImageStorageService] = None


def get_image_storage_service(
    base_path: Optional[str] = None,
    force_new: bool = False,
) -> ImageStorageService:
    """
    Get or create ImageStorageService instance

    Args:
        base_path: Optional base path override
        force_new: Force creation of new instance

    Returns:
        ImageStorageService instance
    """
    global _storage_instance

    if force_new or _storage_instance is None or base_path:
        _storage_instance = ImageStorageService(base_path=base_path)

    return _storage_instance
