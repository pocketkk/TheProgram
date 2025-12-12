"""
Artwork model for coloring book / art therapy feature

Stores user-created colored artwork and canvas state for resuming work.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Integer
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedDict, JSONEncodedList


class Artwork(BaseModel):
    """
    User-created artwork from coloring book feature

    Stores colored images created by users, either from generated
    coloring book templates or from blank canvas painting.

    Fields:
        id: UUID primary key (inherited)
        name: Artwork name
        file_path: Relative path from images directory
        thumbnail_path: Optional thumbnail path
        width: Image width in pixels
        height: Image height in pixels
        file_size: File size in bytes
        source_image_id: FK to GeneratedImage (original coloring book image)
        canvas_state: JSON state for resuming work
        tags: JSON array of tags for organization
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Example:
        artwork = Artwork(
            name="My Cosmic Mandala",
            file_path="artwork/abc123/my_mandala.png",
            width=1024,
            height=1024,
            source_image_id="xyz789",
            tags=["mandala", "cosmic", "relaxing"]
        )
    """
    __tablename__ = 'artworks'

    name = Column(
        String(255),
        nullable=False,
        comment="Artwork name"
    )

    # File storage
    file_path = Column(
        String(500),
        nullable=False,
        unique=True,
        comment="Relative path from images directory"
    )

    thumbnail_path = Column(
        String(500),
        nullable=True,
        comment="Relative path to thumbnail"
    )

    # Image dimensions
    width = Column(
        Integer,
        nullable=True,
        comment="Width in pixels"
    )

    height = Column(
        Integer,
        nullable=True,
        comment="Height in pixels"
    )

    file_size = Column(
        Integer,
        nullable=True,
        comment="File size in bytes"
    )

    # Source reference
    source_image_id = Column(
        String,
        ForeignKey('generated_images.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
        comment="Original coloring book image (if based on generated template)"
    )

    # Canvas state for resuming work
    canvas_state = Column(
        JSONEncodedDict,
        nullable=True,
        comment="Canvas state JSON (layers, tool settings, undo history)"
    )

    # Tags for organization
    tags = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment="Tags for organization"
    )

    # Relationships
    source_image = relationship(
        'GeneratedImage',
        foreign_keys=[source_image_id],
        lazy='select'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_artwork_created', 'created_at'),
        Index('idx_artwork_name', 'name'),
        Index('idx_artwork_source', 'source_image_id'),
    )

    def __repr__(self):
        """String representation"""
        return f"<Artwork(id={self.id[:8]}..., name='{self.name}')>"

    @property
    def is_from_template(self) -> bool:
        """Check if this artwork is based on a generated template"""
        return self.source_image_id is not None

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['is_from_template'] = self.is_from_template
        return result
