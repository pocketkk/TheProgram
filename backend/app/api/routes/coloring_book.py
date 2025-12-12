"""
Coloring Book / Art Therapy API endpoints

Provides REST API for:
- Generating coloring book images using Gemini
- Saving and managing user-created artwork
- Template browsing
"""
import base64
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.models.app_config import AppConfig
from app.models.generated_image import GeneratedImage
from app.models.artwork import Artwork
from app.services.image_storage_service import get_image_storage_service
from app.schemas.coloring_book import (
    ColoringBookGenerateRequest,
    ColoringBookGenerateResponse,
    ArtworkSaveRequest,
    ArtworkInfo,
    ArtworkListResponse,
    ArtworkUpdateRequest,
    ColoringBookTemplate,
    TemplateListResponse,
    ColoringBookImageInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coloring-book", tags=["Coloring Book"])


# =============================================================================
# Predefined Templates
# =============================================================================

COLORING_BOOK_TEMPLATES = [
    {
        "id": "mandala_cosmic",
        "name": "Cosmic Mandala",
        "description": "A beautiful mandala with stars, moons, and cosmic patterns",
        "theme": "mandala",
        "prompt": "A detailed mandala pattern with cosmic elements like stars, moons, planets, and swirling galaxies arranged in perfect symmetry"
    },
    {
        "id": "mandala_floral",
        "name": "Floral Mandala",
        "description": "Intricate floral patterns in mandala form",
        "theme": "mandala",
        "prompt": "A circular mandala composed of intricate flower patterns, leaves, and botanical elements in perfect radial symmetry"
    },
    {
        "id": "zodiac_wheel",
        "name": "Zodiac Wheel",
        "description": "All 12 zodiac signs arranged in a beautiful wheel",
        "theme": "mystical",
        "prompt": "A decorative zodiac wheel featuring all 12 astrological signs with celestial decorations, stars, and mystical symbols"
    },
    {
        "id": "moon_phases",
        "name": "Moon Phases",
        "description": "The phases of the moon with decorative elements",
        "theme": "cosmic",
        "prompt": "The eight phases of the moon arranged in an artistic composition with stars, clouds, and celestial decorations"
    },
    {
        "id": "tree_of_life",
        "name": "Tree of Life",
        "description": "A mystical tree with cosmic roots and branches",
        "theme": "mystical",
        "prompt": "A magnificent tree of life with intricate branches reaching to the stars and roots forming mystical patterns"
    },
    {
        "id": "dragon_fantasy",
        "name": "Fantasy Dragon",
        "description": "A majestic dragon among clouds and stars",
        "theme": "fantasy",
        "prompt": "A magnificent dragon with detailed scales flying through clouds with stars and moons in the background"
    },
    {
        "id": "phoenix_rising",
        "name": "Phoenix Rising",
        "description": "A phoenix emerging from flames",
        "theme": "fantasy",
        "prompt": "A beautiful phoenix bird rising from decorative flames with detailed feathers and swirling fire patterns"
    },
    {
        "id": "ocean_waves",
        "name": "Ocean Waves",
        "description": "Stylized waves with sea creatures",
        "theme": "nature",
        "prompt": "Stylized ocean waves in Japanese art style with fish, shells, and sea foam decorations"
    },
    {
        "id": "butterfly_garden",
        "name": "Butterfly Garden",
        "description": "Butterflies among flowers",
        "theme": "nature",
        "prompt": "Multiple detailed butterflies flying among various flowers, leaves, and garden elements"
    },
    {
        "id": "geometric_stars",
        "name": "Geometric Stars",
        "description": "Complex geometric star patterns",
        "theme": "geometric",
        "prompt": "Complex geometric patterns featuring interconnected stars, hexagons, and sacred geometry shapes"
    },
    {
        "id": "abstract_flow",
        "name": "Abstract Flow",
        "description": "Flowing abstract shapes and patterns",
        "theme": "abstract",
        "prompt": "Abstract flowing shapes and organic curves creating a meditative pattern with dots and swirls"
    },
    {
        "id": "celtic_knots",
        "name": "Celtic Knots",
        "description": "Intricate Celtic knotwork patterns",
        "theme": "geometric",
        "prompt": "Intricate Celtic knotwork patterns interweaving in complex symmetrical designs"
    },
    {
        "id": "sun_moon",
        "name": "Sun and Moon",
        "description": "A celestial sun and moon design",
        "theme": "cosmic",
        "prompt": "A detailed sun and moon design with faces, surrounded by stars, clouds, and celestial decorations"
    },
    {
        "id": "owl_wisdom",
        "name": "Wise Owl",
        "description": "A majestic owl with decorative patterns",
        "theme": "animals",
        "prompt": "A majestic owl with intricate feather patterns, decorated with geometric and floral elements"
    },
    {
        "id": "wolf_moon",
        "name": "Wolf and Moon",
        "description": "A wolf howling at the moon",
        "theme": "animals",
        "prompt": "A wolf howling at a detailed full moon with decorative forest elements and stars"
    },
]


def get_google_api_key(db: Session) -> str:
    """Get Google API key from database, raise if not configured"""
    config = db.query(AppConfig).filter_by(id=1).first()
    if not config or not config.has_google_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google API key not configured. Set your API key in settings to enable image generation.",
        )
    return config.google_api_key


def _artwork_to_info(artwork: Artwork, storage) -> ArtworkInfo:
    """Convert Artwork model to ArtworkInfo schema"""
    return ArtworkInfo(
        id=artwork.id,
        name=artwork.name,
        file_path=artwork.file_path,
        url=storage.get_file_url(artwork.file_path),
        thumbnail_url=None,
        width=artwork.width or 0,
        height=artwork.height or 0,
        file_size=artwork.file_size,
        source_image_id=artwork.source_image_id,
        canvas_state=artwork.canvas_state,
        tags=artwork.tags or [],
        created_at=artwork.created_at,
        updated_at=artwork.updated_at,
    )


def _decode_base64_image(image_data_str: str) -> bytes:
    """
    Decode base64 image data with validation.

    Args:
        image_data_str: Base64 encoded image, optionally with data URL prefix

    Returns:
        Decoded image bytes

    Raises:
        HTTPException: If decoding fails
    """
    try:
        # Remove data URL prefix if present (e.g., "data:image/png;base64,")
        if "," in image_data_str:
            image_data_str = image_data_str.split(",")[1]

        # Validate base64 string is not empty
        if not image_data_str or not image_data_str.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image data provided",
            )

        return base64.b64decode(image_data_str)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image data: {str(e)}",
        )


# =============================================================================
# Coloring Book Image Generation
# =============================================================================


@router.post("/generate", response_model=ColoringBookGenerateResponse)
async def generate_coloring_book_image(
    request: ColoringBookGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a coloring book image using Gemini

    Creates a black and white line art image suitable for coloring.
    The image is optimized for digital coloring with clear outlines.

    Args:
        request: Generation request with prompt and settings

    Returns:
        ColoringBookGenerateResponse with image URL or error
    """
    api_key = get_google_api_key(db)

    try:
        from app.services.gemini_image_service import GeminiImageService

        service = GeminiImageService(api_key=api_key)

        # Build the coloring book specific prompt
        complexity_hints = {
            "simple": "with simple shapes, minimal details, suitable for beginners",
            "medium": "with moderate detail level, clear defined areas",
            "detailed": "with intricate details and many small areas to color",
            "intricate": "extremely detailed with very fine patterns and many tiny areas",
        }

        complexity_hint = complexity_hints.get(request.complexity, complexity_hints["medium"])

        # Build enhanced prompt for coloring book style
        enhanced_prompt = f"""Create a coloring book page illustration: {request.prompt}

CRITICAL REQUIREMENTS:
- BLACK AND WHITE LINE ART ONLY - no shading, no gradients, no filled areas
- Clean, crisp black outlines on pure white background
- All shapes should be clearly defined closed areas ready for coloring
- {complexity_hint}
- High contrast black lines on white
- NO gray tones, NO halftones, NO texture fills
- Style: professional adult coloring book illustration

Theme: {request.theme}"""

        if request.style:
            enhanced_prompt += f"\nAdditional style notes: {request.style}"

        # Generate the image
        result = await service.generate_image(
            prompt=enhanced_prompt,
            purpose="custom",
            style="black and white line art, coloring book style, clean outlines, no shading",
            aspect_ratio="1:1",  # Square for coloring
        )

        if not result.success:
            return ColoringBookGenerateResponse(
                success=False,
                prompt=request.prompt,
                error=result.error,
            )

        # Save to storage
        storage = get_image_storage_service()
        filename = storage.generate_filename("coloring_book")

        file_path = storage.save_image(
            image_data=result.image_data,
            category="coloring_book",
            filename=filename,
        )

        # Save to database as GeneratedImage
        image = GeneratedImage(
            image_type="coloring_book",
            prompt=request.prompt,
            style_prompt=f"theme:{request.theme}, complexity:{request.complexity}",
            file_path=file_path,
            mime_type=result.mime_type,
            width=result.width,
            height=result.height,
            file_size=len(result.image_data),
            generation_params={
                "enhanced_prompt": enhanced_prompt,
                "theme": request.theme,
                "complexity": request.complexity,
                "style": request.style,
            },
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        return ColoringBookGenerateResponse(
            success=True,
            image_id=image.id,
            image_url=storage.get_file_url(file_path),
            width=result.width,
            height=result.height,
            prompt=request.prompt,
        )

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        return ColoringBookGenerateResponse(
            success=False,
            prompt=request.prompt,
            error="Image generation dependencies not installed.",
        )
    except Exception as e:
        logger.error(f"Coloring book generation error: {e}")
        return ColoringBookGenerateResponse(
            success=False,
            prompt=request.prompt,
            error=str(e),
        )


@router.post("/generate-from-template/{template_id}", response_model=ColoringBookGenerateResponse)
async def generate_from_template(
    template_id: str,
    complexity: str = Query(default="medium", description="Complexity: simple, medium, detailed, intricate"),
    db: Session = Depends(get_db),
):
    """
    Generate a coloring book image from a predefined template

    Uses a curated template for consistent, high-quality results.

    Args:
        template_id: ID of the template to use
        complexity: Complexity level

    Returns:
        ColoringBookGenerateResponse with image URL or error
    """
    # Find template
    template = next((t for t in COLORING_BOOK_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )

    # Generate using the template prompt
    request = ColoringBookGenerateRequest(
        prompt=template["prompt"],
        theme=template["theme"],
        complexity=complexity,
    )

    return await generate_coloring_book_image(request, db)


# =============================================================================
# Template Endpoints
# =============================================================================


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates(
    theme: Optional[str] = Query(default=None, description="Filter by theme"),
):
    """
    List available coloring book templates

    Returns curated templates for quick generation.

    Args:
        theme: Optional theme filter

    Returns:
        TemplateListResponse with templates
    """
    templates = COLORING_BOOK_TEMPLATES

    if theme:
        templates = [t for t in templates if t["theme"] == theme]

    # Build response with placeholder thumbnails
    result = []
    for t in templates:
        result.append(
            ColoringBookTemplate(
                id=t["id"],
                name=t["name"],
                description=t["description"],
                theme=t["theme"],
                thumbnail_url=f"/api/coloring-book/templates/{t['id']}/thumbnail",
                prompt=t["prompt"],
            )
        )

    return TemplateListResponse(
        templates=result,
        total=len(result),
    )


@router.get("/templates/{template_id}/thumbnail")
async def get_template_thumbnail(template_id: str):
    """
    Get a placeholder thumbnail for a template

    Returns an SVG placeholder showing the template name.
    Actual thumbnails could be pre-generated and cached in the future.

    Args:
        template_id: Template ID

    Returns:
        SVG image response
    """
    from fastapi.responses import Response

    # Find template
    template = next((t for t in COLORING_BOOK_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found",
        )

    # Theme colors for the placeholder
    theme_colors = {
        "mandala": "#9b59b6",
        "mystical": "#8e44ad",
        "cosmic": "#2c3e50",
        "nature": "#27ae60",
        "fantasy": "#e74c3c",
        "geometric": "#3498db",
        "abstract": "#e67e22",
        "animals": "#16a085",
    }
    color = theme_colors.get(template["theme"], "#7f8c8d")

    # Generate SVG placeholder
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f5f5f5"/>
  <rect x="10" y="10" width="180" height="180" rx="10" fill="none" stroke="{color}" stroke-width="2"/>
  <circle cx="100" cy="80" r="40" fill="none" stroke="{color}" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="100" y="150" font-family="Arial, sans-serif" font-size="12" fill="#333" text-anchor="middle">{template["name"]}</text>
  <text x="100" y="170" font-family="Arial, sans-serif" font-size="10" fill="#666" text-anchor="middle">{template["theme"]}</text>
</svg>'''

    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400"},
    )


# =============================================================================
# Coloring Book Image Browsing
# =============================================================================


@router.get("/images", response_model=list[ColoringBookImageInfo])
async def list_coloring_book_images(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List generated coloring book images

    Returns all coloring book images for selection.

    Args:
        limit: Maximum results
        offset: Results offset

    Returns:
        List of coloring book images
    """
    query = db.query(GeneratedImage).filter(
        GeneratedImage.image_type == "coloring_book"
    )

    images = query.order_by(GeneratedImage.created_at.desc()).offset(offset).limit(limit).all()
    storage = get_image_storage_service()

    return [
        ColoringBookImageInfo(
            id=img.id,
            prompt=img.prompt or "",
            url=storage.get_file_url(img.file_path),
            width=img.width or 0,
            height=img.height or 0,
            theme=img.generation_params.get("theme") if img.generation_params else None,
            created_at=img.created_at,
        )
        for img in images
    ]


# =============================================================================
# Artwork Management
# =============================================================================


@router.post("/artwork", response_model=ArtworkInfo)
async def save_artwork(
    request: ArtworkSaveRequest,
    db: Session = Depends(get_db),
):
    """
    Save colored artwork

    Saves user-created artwork from the coloring canvas.
    Supports both completed artwork and work-in-progress with canvas state.

    Args:
        request: Artwork save request with image data

    Returns:
        ArtworkInfo for saved artwork
    """
    storage = get_image_storage_service()

    # Decode and validate base64 image data
    image_data = _decode_base64_image(request.image_data)

    # Generate filename and save
    filename = storage.generate_filename("artwork")
    file_path = storage.save_image(
        image_data=image_data,
        category="artwork",
        filename=filename,
    )

    # Get image dimensions
    width, height = 0, 0
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_data))
        width, height = img.size
    except Exception:
        pass

    # Create artwork record
    artwork = Artwork(
        name=request.name,
        file_path=file_path,
        width=width,
        height=height,
        file_size=len(image_data),
        source_image_id=request.source_image_id,
        canvas_state=request.canvas_state,
        tags=request.tags,
    )
    db.add(artwork)
    db.commit()
    db.refresh(artwork)

    return _artwork_to_info(artwork, storage)


@router.get("/artwork", response_model=ArtworkListResponse)
async def list_artwork(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    tag: Optional[str] = Query(default=None, description="Filter by tag"),
    db: Session = Depends(get_db),
):
    """
    List saved artwork

    Returns paginated list of user-created artwork.

    Args:
        limit: Maximum results
        offset: Results offset
        tag: Optional tag filter

    Returns:
        ArtworkListResponse with artwork list
    """
    query = db.query(Artwork)

    total = query.count()
    artworks = query.order_by(Artwork.created_at.desc()).offset(offset).limit(limit).all()

    storage = get_image_storage_service()

    # NOTE: Tag filtering is done in Python because SQLite lacks native JSON array
    # querying. This is acceptable for the expected dataset size (personal artwork
    # collection). For larger datasets, consider PostgreSQL with JSONB or a separate
    # tags table with proper indexing.
    if tag:
        artworks = [a for a in artworks if a.tags and tag in a.tags]
        total = len(artworks)

    return ArtworkListResponse(
        artworks=[_artwork_to_info(artwork, storage) for artwork in artworks],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/artwork/{artwork_id}", response_model=ArtworkInfo)
async def get_artwork(
    artwork_id: str,
    db: Session = Depends(get_db),
):
    """
    Get artwork details

    Returns detailed info about a specific artwork including canvas state.

    Args:
        artwork_id: Artwork UUID

    Returns:
        ArtworkInfo with full details
    """
    artwork = db.query(Artwork).filter_by(id=artwork_id).first()
    if not artwork:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artwork not found",
        )

    storage = get_image_storage_service()
    return _artwork_to_info(artwork, storage)


@router.patch("/artwork/{artwork_id}", response_model=ArtworkInfo)
async def update_artwork(
    artwork_id: str,
    request: ArtworkUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Update artwork

    Updates artwork name, image, canvas state, or tags.

    Args:
        artwork_id: Artwork UUID
        request: Update fields

    Returns:
        Updated ArtworkInfo
    """
    artwork = db.query(Artwork).filter_by(id=artwork_id).first()
    if not artwork:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artwork not found",
        )

    storage = get_image_storage_service()

    # Update fields
    if request.name is not None:
        artwork.name = request.name

    if request.tags is not None:
        artwork.tags = request.tags

    if request.canvas_state is not None:
        artwork.canvas_state = request.canvas_state

    # Update image if provided
    if request.image_data is not None:
        # Decode and validate base64 image data
        image_data = _decode_base64_image(request.image_data)

        # Delete old file
        storage.delete_image(artwork.file_path)

        # Save new file
        filename = storage.generate_filename("artwork")
        file_path = storage.save_image(
            image_data=image_data,
            category="artwork",
            filename=filename,
        )

        artwork.file_path = file_path
        artwork.file_size = len(image_data)

        # Update dimensions
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_data))
            artwork.width, artwork.height = img.size
        except Exception:
            pass

    db.commit()
    db.refresh(artwork)

    return _artwork_to_info(artwork, storage)


@router.delete("/artwork/{artwork_id}")
async def delete_artwork(
    artwork_id: str,
    db: Session = Depends(get_db),
):
    """
    Delete artwork

    Removes artwork from database and storage.

    Args:
        artwork_id: Artwork UUID

    Returns:
        Success message
    """
    artwork = db.query(Artwork).filter_by(id=artwork_id).first()
    if not artwork:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artwork not found",
        )

    # Delete from storage
    storage = get_image_storage_service()
    storage.delete_image(artwork.file_path)

    # Delete from database
    db.delete(artwork)
    db.commit()

    return {"message": "Artwork deleted successfully"}
