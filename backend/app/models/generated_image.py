"""
Generated image models for AI image generation feature

Stores generated images and collections (tarot decks, theme sets).
Part of Phase 5: Gemini Image Generation.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Text, Integer, Boolean
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedDict


class ImageCollection(BaseModel):
    """
    Collection of related generated images

    Groups images with consistent styling (tarot decks, theme sets).
    Stores the base style prompt to ensure visual consistency.

    Fields:
        id: UUID primary key (inherited)
        name: Collection name
        collection_type: Type (tarot_deck, theme_set)
        description: Optional description
        style_prompt: Base style for consistency across collection
        is_complete: Whether all expected images are generated
        is_active: Whether this collection is currently active
        total_expected: Expected number of images (78 for tarot)
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Collection Types:
        - tarot_deck: 78-card tarot deck
        - theme_set: Workspace theme collection

    Example:
        collection = ImageCollection(
            name="Cosmic Dreams Tarot",
            collection_type="tarot_deck",
            style_prompt="mystical watercolor, cosmic blues and purples",
            total_expected=78
        )
    """
    __tablename__ = 'image_collections'

    name = Column(
        String(255),
        nullable=False,
        comment="Collection name"
    )

    collection_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Collection type: tarot_deck, theme_set"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Collection description"
    )

    style_prompt = Column(
        Text,
        nullable=True,
        comment="Base style prompt for consistency"
    )

    border_style = Column(
        Text,
        nullable=True,
        comment="Border/frame style description for card edges and text"
    )

    is_complete = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether all expected images are generated"
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether this collection is currently active"
    )

    total_expected = Column(
        Integer,
        nullable=True,
        comment="Expected number of images (78 for tarot)"
    )

    include_card_labels = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether to include card name/number on generated cards"
    )

    reference_image_id = Column(
        String,
        ForeignKey('generated_images.id', ondelete='SET NULL'),
        nullable=True,
        comment="Approved reference image for style consistency"
    )

    prompt_tradition = Column(
        String(50),
        nullable=True,
        comment="Prompt tradition used: rws, thoth, marseille, astronomical, mythological, custom"
    )

    # Relationships
    images = relationship(
        'GeneratedImage',
        back_populates='collection',
        cascade='all, delete-orphan',
        lazy='select',
        foreign_keys='GeneratedImage.collection_id'
    )

    reference_image = relationship(
        'GeneratedImage',
        foreign_keys=[reference_image_id],
        lazy='select',
        post_update=True
    )

    # Table indexes
    __table_args__ = (
        Index('idx_collection_type', 'collection_type'),
        Index('idx_collection_active', 'is_active'),
        Index('idx_collection_created', 'created_at'),
    )

    def __repr__(self):
        """String representation"""
        return f"<ImageCollection(id={self.id[:8]}..., name='{self.name}', type='{self.collection_type}')>"

    @property
    def image_count(self) -> int:
        """Get number of images in collection"""
        return len(self.images) if self.images else 0

    @property
    def completion_percentage(self) -> float:
        """Get completion percentage"""
        if not self.total_expected or self.total_expected == 0:
            return 100.0 if self.is_complete else 0.0
        return (self.image_count / self.total_expected) * 100

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['image_count'] = self.image_count
        result['completion_percentage'] = self.completion_percentage
        return result


class GeneratedImage(BaseModel):
    """
    Generated image model for AI-created images

    Stores metadata about images generated via Gemini API.
    Actual image files stored in filesystem, referenced by file_path.

    Fields:
        id: UUID primary key (inherited)
        image_type: Category (tarot_card, background, infographic, custom)
        prompt: Generation prompt used
        style_prompt: Style instructions used
        file_path: Relative path from images directory
        thumbnail_path: Optional thumbnail path
        width: Image width in pixels
        height: Image height in pixels
        mime_type: Image MIME type
        file_size: File size in bytes
        generation_params: JSON of all generation parameters
        model_used: Gemini model used
        parent_id: For refinements, links to original image
        collection_id: FK to ImageCollection
        item_key: Identifier within collection (e.g., "major_00" for The Fool)
        is_approved: User approval status
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Image Types:
        - tarot_card: Tarot deck card
        - background: Workspace background theme
        - infographic: Chart summary, transit calendar
        - custom: General purpose generation

    Example:
        image = GeneratedImage(
            image_type="tarot_card",
            prompt="The Fool card in cosmic watercolor style",
            style_prompt="mystical, symbolic, rich detail",
            file_path="tarot/abc123/major_00_the_fool.png",
            width=768,
            height=1024,
            collection_id=deck.id,
            item_key="major_00"
        )
    """
    __tablename__ = 'generated_images'

    # Image categorization
    image_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Image type: tarot_card, background, infographic, custom"
    )

    # Generation details
    prompt = Column(
        Text,
        nullable=False,
        comment="Generation prompt"
    )

    style_prompt = Column(
        String(500),
        nullable=True,
        comment="Style instructions"
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

    mime_type = Column(
        String(50),
        nullable=False,
        default='image/png',
        comment="MIME type"
    )

    file_size = Column(
        Integer,
        nullable=True,
        comment="File size in bytes"
    )

    # Generation metadata
    generation_params = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON generation parameters (aspect_ratio, model, etc.)"
    )

    model_used = Column(
        String(100),
        nullable=True,
        comment="Gemini model used for generation"
    )

    # Relationships
    parent_id = Column(
        String,
        ForeignKey('generated_images.id', ondelete='SET NULL'),
        nullable=True,
        comment="For refinements, links to original image"
    )

    collection_id = Column(
        String,
        ForeignKey('image_collections.id', ondelete='CASCADE'),
        nullable=True,
        index=True,
        comment="Parent collection"
    )

    # Collection item identifier
    item_key = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Identifier within collection (e.g., major_00 for The Fool)"
    )

    # User approval
    is_approved = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="User approval status"
    )

    # Relationships
    collection = relationship(
        'ImageCollection',
        back_populates='images',
        foreign_keys=[collection_id]
    )

    parent = relationship(
        'GeneratedImage',
        remote_side='GeneratedImage.id',
        foreign_keys=[parent_id],
        lazy='select'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_image_type', 'image_type'),
        Index('idx_image_collection', 'collection_id'),
        Index('idx_image_item_key', 'item_key'),
        Index('idx_image_created', 'created_at'),
        Index('idx_image_collection_item', 'collection_id', 'item_key'),
    )

    def __repr__(self):
        """String representation"""
        return f"<GeneratedImage(id={self.id[:8]}..., type='{self.image_type}', path='{self.file_path}')>"

    @property
    def aspect_ratio(self) -> str:
        """Calculate aspect ratio string"""
        if not self.width or not self.height:
            return "unknown"
        from math import gcd
        divisor = gcd(self.width, self.height)
        w = self.width // divisor
        h = self.height // divisor
        return f"{w}:{h}"

    @property
    def is_refinement(self) -> bool:
        """Check if this is a refinement of another image"""
        return self.parent_id is not None

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['aspect_ratio'] = self.aspect_ratio
        result['is_refinement'] = self.is_refinement
        return result
