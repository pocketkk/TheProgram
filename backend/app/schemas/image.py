"""
Pydantic schemas for image generation

These schemas handle request/response validation for the
Gemini image generation feature.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# =============================================================================
# Image Generation Request/Response
# =============================================================================


class ImageGenerateRequest(BaseModel):
    """Request to generate a single image"""
    prompt: str = Field(..., min_length=3, description="Image generation prompt")
    purpose: str = Field(
        default="custom",
        description="Image purpose: tarot_card, background, infographic, custom"
    )
    style: Optional[str] = Field(
        default=None,
        description="Style override (uses purpose default if not provided)"
    )
    aspect_ratio: Optional[str] = Field(
        default=None,
        description="Aspect ratio override (e.g., '16:9', '3:4')"
    )
    astro_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Astrological context for styling (elements, signs, planets)"
    )
    collection_id: Optional[str] = Field(
        default=None,
        description="Collection ID if adding to a collection"
    )
    item_key: Optional[str] = Field(
        default=None,
        description="Item key within collection (e.g., 'major_00' for The Fool)"
    )


class ImageGenerateResponse(BaseModel):
    """Response from image generation"""
    success: bool = Field(..., description="Whether generation succeeded")
    image_id: Optional[str] = Field(default=None, description="Generated image ID")
    image_url: Optional[str] = Field(default=None, description="URL to access the image")
    width: int = Field(default=0, description="Image width in pixels")
    height: int = Field(default=0, description="Image height in pixels")
    prompt: str = Field(default="", description="Original prompt")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class ImageRefineRequest(BaseModel):
    """Request to refine an existing image"""
    image_id: str = Field(..., description="ID of image to refine")
    refinement: str = Field(
        ...,
        min_length=3,
        description="Refinement instructions (e.g., 'make it more mystical')"
    )


# =============================================================================
# Image Info Schemas
# =============================================================================


class ImageInfo(BaseModel):
    """Image information"""
    id: str = Field(..., description="Image ID")
    image_type: str = Field(..., description="Type: tarot_card, background, etc.")
    prompt: str = Field(..., description="Generation prompt")
    file_path: str = Field(..., description="Relative file path")
    url: str = Field(..., description="API URL to access image")
    width: int = Field(default=0, description="Width in pixels")
    height: int = Field(default=0, description="Height in pixels")
    file_size: Optional[int] = Field(default=None, description="File size in bytes")
    collection_id: Optional[str] = Field(default=None, description="Collection ID if part of collection")
    item_key: Optional[str] = Field(default=None, description="Item key within collection")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True


class ImageListResponse(BaseModel):
    """Response for listing images"""
    images: List[ImageInfo] = Field(default_factory=list)
    total: int = Field(default=0, description="Total count")
    limit: int = Field(default=50, description="Results limit")
    offset: int = Field(default=0, description="Results offset")


# =============================================================================
# Collection Schemas
# =============================================================================


class CollectionCreate(BaseModel):
    """Request to create an image collection"""
    name: str = Field(..., min_length=1, max_length=255, description="Collection name")
    collection_type: str = Field(
        ...,
        description="Type: tarot_deck, planet_set, theme_set, infographic_set"
    )
    style_prompt: Optional[str] = Field(
        default=None,
        description="Consistent style prompt for all images in collection"
    )
    border_style: Optional[str] = Field(
        default=None,
        description="Border/frame style description for card edges and text"
    )
    total_expected: Optional[int] = Field(
        default=None,
        description="Expected number of images (78 for tarot)"
    )
    include_card_labels: bool = Field(
        default=False,
        description="Whether to include card name/number on generated cards"
    )
    prompt_tradition: Optional[str] = Field(
        default=None,
        description="Prompt tradition: rws, thoth, marseille, astronomical, mythological, custom"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional collection metadata"
    )


class CollectionUpdate(BaseModel):
    """Request to update a collection"""
    name: Optional[str] = Field(default=None, max_length=255)
    style_prompt: Optional[str] = Field(default=None)
    border_style: Optional[str] = Field(default=None)
    is_active: Optional[bool] = Field(default=None)
    include_card_labels: Optional[bool] = Field(default=None)
    reference_image_id: Optional[str] = Field(
        default=None,
        description="Approved reference image ID for style consistency"
    )
    card_back_image_id: Optional[str] = Field(
        default=None,
        description="Generated card back image ID for the deck"
    )
    prompt_tradition: Optional[str] = Field(
        default=None,
        description="Prompt tradition: rws, thoth, marseille, astronomical, mythological, custom"
    )
    metadata: Optional[Dict[str, Any]] = Field(default=None)


class CollectionInfo(BaseModel):
    """Collection information"""
    id: str = Field(..., description="Collection ID")
    name: str = Field(..., description="Collection name")
    collection_type: str = Field(..., description="Type of collection")
    style_prompt: Optional[str] = Field(default=None)
    border_style: Optional[str] = Field(default=None)
    is_complete: bool = Field(default=False)
    is_active: bool = Field(default=False)
    total_expected: Optional[int] = Field(default=None)
    include_card_labels: bool = Field(default=False)
    reference_image_id: Optional[str] = Field(default=None)
    card_back_image_id: Optional[str] = Field(default=None, description="Generated card back image ID")
    card_back_url: Optional[str] = Field(default=None, description="URL to access the card back image")
    prompt_tradition: Optional[str] = Field(default=None)
    image_count: int = Field(default=0, description="Current number of images")
    metadata: Optional[Dict[str, Any]] = Field(default=None)
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None)

    class Config:
        from_attributes = True


class CollectionWithImages(CollectionInfo):
    """Collection with its images"""
    images: List[ImageInfo] = Field(default_factory=list)


class CollectionListResponse(BaseModel):
    """Response for listing collections"""
    collections: List[CollectionInfo] = Field(default_factory=list)
    total: int = Field(default=0)


# =============================================================================
# Batch Generation Schemas
# =============================================================================


class BatchGenerateItem(BaseModel):
    """Single item in batch generation request"""
    prompt: str = Field(..., description="Generation prompt")
    item_key: str = Field(..., description="Item key (e.g., 'major_00')")
    name: Optional[str] = Field(default=None, description="Display name")


class BatchGenerateRequest(BaseModel):
    """Request to generate multiple images"""
    collection_id: str = Field(..., description="Collection to add images to")
    items: List[BatchGenerateItem] = Field(..., min_length=1, description="Items to generate")
    style_override: Optional[str] = Field(
        default=None,
        description="Style override (uses collection style_prompt if not provided)"
    )


class BatchProgressUpdate(BaseModel):
    """Progress update for batch generation"""
    current: int = Field(..., description="Current item index")
    total: int = Field(..., description="Total items")
    item_name: str = Field(..., description="Current item name")
    status: str = Field(..., description="Status: generating, complete, failed")
    image_url: Optional[str] = Field(default=None, description="URL if complete")
    error: Optional[str] = Field(default=None, description="Error if failed")


# =============================================================================
# Storage Stats Schema
# =============================================================================


class StorageStats(BaseModel):
    """Image storage statistics"""
    total_files: int = Field(default=0)
    total_size_bytes: int = Field(default=0)
    total_size_mb: float = Field(default=0.0)
    by_category: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
