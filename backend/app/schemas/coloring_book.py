"""
Pydantic schemas for coloring book / art therapy feature

Handles request/response validation for coloring book image generation
and artwork saving.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# =============================================================================
# Coloring Book Image Generation
# =============================================================================


class ColoringBookGenerateRequest(BaseModel):
    """Request to generate a coloring book image"""
    prompt: str = Field(
        ...,
        min_length=3,
        description="Description of the coloring book image to generate"
    )
    theme: str = Field(
        default="mystical",
        description="Theme: mystical, nature, mandala, cosmic, animals, fantasy, floral, geometric, abstract"
    )
    complexity: str = Field(
        default="medium",
        description="Complexity level: simple, medium, detailed, intricate"
    )
    style: Optional[str] = Field(
        default=None,
        description="Additional style instructions"
    )


class ColoringBookGenerateResponse(BaseModel):
    """Response from coloring book image generation"""
    success: bool = Field(..., description="Whether generation succeeded")
    image_id: Optional[str] = Field(default=None, description="Generated image ID")
    image_url: Optional[str] = Field(default=None, description="URL to access the image")
    width: int = Field(default=0, description="Image width in pixels")
    height: int = Field(default=0, description="Image height in pixels")
    prompt: str = Field(default="", description="Original prompt")
    error: Optional[str] = Field(default=None, description="Error message if failed")


# =============================================================================
# Artwork Saving
# =============================================================================


class ArtworkSaveRequest(BaseModel):
    """Request to save colored artwork"""
    name: str = Field(..., min_length=1, max_length=255, description="Artwork name")
    image_data: str = Field(
        ...,
        description="Base64 encoded PNG image data"
    )
    source_image_id: Optional[str] = Field(
        default=None,
        description="ID of the source coloring book image (if based on generated image)"
    )
    canvas_state: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Canvas state for resuming work (layers, tool settings)"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for organization"
    )


class ArtworkInfo(BaseModel):
    """Artwork information"""
    id: str = Field(..., description="Artwork ID")
    name: str = Field(..., description="Artwork name")
    file_path: str = Field(..., description="Relative file path")
    url: str = Field(..., description="API URL to access image")
    thumbnail_url: Optional[str] = Field(default=None, description="Thumbnail URL")
    width: int = Field(default=0, description="Width in pixels")
    height: int = Field(default=0, description="Height in pixels")
    file_size: Optional[int] = Field(default=None, description="File size in bytes")
    source_image_id: Optional[str] = Field(default=None, description="Source coloring book image ID")
    canvas_state: Optional[Dict[str, Any]] = Field(default=None, description="Canvas state for resuming")
    tags: List[str] = Field(default_factory=list, description="Tags")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")

    class Config:
        from_attributes = True


class ArtworkListResponse(BaseModel):
    """Response for listing artwork"""
    artworks: List[ArtworkInfo] = Field(default_factory=list)
    total: int = Field(default=0, description="Total count")
    limit: int = Field(default=50, description="Results limit")
    offset: int = Field(default=0, description="Results offset")


class ArtworkUpdateRequest(BaseModel):
    """Request to update artwork"""
    name: Optional[str] = Field(default=None, max_length=255)
    image_data: Optional[str] = Field(
        default=None,
        description="Base64 encoded PNG image data (updates the image)"
    )
    canvas_state: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Updated canvas state"
    )
    tags: Optional[List[str]] = Field(default=None)


# =============================================================================
# Coloring Book Templates
# =============================================================================


class ColoringBookTemplate(BaseModel):
    """Predefined coloring book template"""
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    theme: str = Field(..., description="Theme category")
    thumbnail_url: str = Field(..., description="Thumbnail URL")
    prompt: str = Field(..., description="Generation prompt for this template")


class TemplateListResponse(BaseModel):
    """Response for listing templates"""
    templates: List[ColoringBookTemplate] = Field(default_factory=list)
    total: int = Field(default=0)
