"""
Gemini Image Generation Service

Generates images using Google's Gemini API for tarot cards, backgrounds, infographics.
Part of Phase 5: Image Generation.
"""
import os
import asyncio
import base64
import uuid
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable, Awaitable
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class GeneratedImageResult:
    """Result from image generation"""
    success: bool
    image_id: str = ""
    image_data: bytes = field(default_factory=bytes)
    mime_type: str = "image/png"
    width: int = 0
    height: int = 0
    prompt: str = ""
    enhanced_prompt: str = ""
    error: Optional[str] = None

    @property
    def data_url(self) -> str:
        """Convert to data URL for display"""
        if not self.image_data:
            return ""
        b64 = base64.b64encode(self.image_data).decode()
        return f"data:{self.mime_type};base64,{b64}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "success": self.success,
            "image_id": self.image_id,
            "image_url": self.data_url if self.success else None,
            "mime_type": self.mime_type,
            "width": self.width,
            "height": self.height,
            "prompt": self.prompt,
            "error": self.error,
        }


class GeminiImageService:
    """
    Image generation service using Google Gemini API

    Supports:
    - Text-to-image generation
    - Image refinement with context
    - Batch generation with progress callbacks
    - Purpose-specific defaults (tarot, backgrounds, etc.)

    Usage:
        service = GeminiImageService(api_key="...")
        result = await service.generate_image(
            prompt="A mystical tarot card depicting The Fool",
            purpose="tarot_card"
        )
    """

    # Default styles and aspect ratios by purpose
    # NOTE: Border style is handled separately via border_style parameter
    PURPOSE_DEFAULTS = {
        "tarot_card": {
            "aspect_ratio": "3:4",
            "style": "mystical, symbolic, rich in detail, traditional tarot imagery with cosmic elements",
            "resolution": "1K",
        },
        "background": {
            "aspect_ratio": "16:9",
            "style": "atmospheric, cosmic, ethereal, suitable for desktop wallpaper, deep space theme",
            "resolution": "2K",
        },
        "infographic": {
            "aspect_ratio": "4:3",
            "style": "clean, minimalist, informative, celestial color palette, elegant typography space",
            "resolution": "1K",
        },
        "custom": {
            "aspect_ratio": "1:1",
            "style": "high quality digital art, cosmic mystical aesthetic",
            "resolution": "1K",
        },
    }

    # Astrological element to color mapping
    ELEMENT_COLORS = {
        "fire": "warm oranges, reds, and golds",
        "earth": "deep greens, browns, and amber",
        "air": "light blues, whites, and silver",
        "water": "deep blues, teals, and purple",
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash-exp",  # Only model that supports image generation
        max_concurrent: int = 1,  # Sequential to avoid rate limits
    ):
        """
        Initialize Gemini image service

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            model: Gemini model to use for generation
            max_concurrent: Maximum concurrent requests
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key required. Set GOOGLE_API_KEY environment variable or pass api_key."
            )

        self.model = model
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._client = None

    def _get_client(self):
        """Lazy initialization of Gemini client"""
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise ImportError(
                    "google-genai package required. Install with: pip install google-genai"
                )
        return self._client

    async def generate_image(
        self,
        prompt: str,
        purpose: str = "custom",
        style: Optional[str] = None,
        aspect_ratio: Optional[str] = None,
        astro_context: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[Callable[[str, int, str], Awaitable[None]]] = None,
        reference_image: Optional[bytes] = None,
        include_card_labels: bool = False,
        card_name: Optional[str] = None,
        card_number: Optional[str] = None,
        border_style: Optional[str] = None,
    ) -> GeneratedImageResult:
        """
        Generate a single image

        Args:
            prompt: Description of the image to generate
            purpose: Image purpose (tarot_card, background, infographic, custom)
            style: Style override (uses purpose default if not provided)
            aspect_ratio: Aspect ratio override
            astro_context: Astrological context (elements, signs) for styling
            progress_callback: Async callback(stage, percent, message)
            reference_image: Optional reference image bytes for style consistency
            include_card_labels: Whether to include card name/number on tarot cards
            card_name: The card name (e.g., "The Fool") if labels enabled
            card_number: The card number (e.g., "0" or "I") if labels enabled
            border_style: Custom border/frame style description

        Returns:
            GeneratedImageResult with image data or error
        """
        async with self._semaphore:
            try:
                # Get defaults for purpose
                defaults = self.PURPOSE_DEFAULTS.get(purpose, self.PURPOSE_DEFAULTS["custom"])

                # Build enhanced prompt
                enhanced = self._enhance_prompt(
                    prompt=prompt,
                    purpose=purpose,
                    style=style or defaults["style"],
                    astro_context=astro_context,
                    include_card_labels=include_card_labels,
                    card_name=card_name,
                    card_number=card_number,
                    border_style=border_style,
                )

                # Determine aspect ratio
                ratio = aspect_ratio or defaults["aspect_ratio"]

                if progress_callback:
                    await progress_callback("generating", 20, "Crafting your vision...")

                # Call Gemini API
                client = self._get_client()

                # Use the models.generate_content method with image generation config
                response = await asyncio.to_thread(
                    self._generate_sync,
                    client,
                    enhanced,
                    ratio,
                    reference_image,
                )

                if progress_callback:
                    await progress_callback("processing", 80, "Finalizing image...")

                if response is None:
                    return GeneratedImageResult(
                        success=False,
                        prompt=prompt,
                        enhanced_prompt=enhanced,
                        error="No image generated - response was empty",
                    )

                # Extract image from response
                image_data, mime_type, width, height = self._extract_image(response)

                if not image_data:
                    return GeneratedImageResult(
                        success=False,
                        prompt=prompt,
                        enhanced_prompt=enhanced,
                        error="No image data in response",
                    )

                if progress_callback:
                    await progress_callback("complete", 100, "Image ready!")

                return GeneratedImageResult(
                    success=True,
                    image_id=str(uuid.uuid4()),
                    image_data=image_data,
                    mime_type=mime_type,
                    width=width,
                    height=height,
                    prompt=prompt,
                    enhanced_prompt=enhanced,
                )

            except Exception as e:
                logger.error(f"Error generating image: {e}")
                return GeneratedImageResult(
                    success=False,
                    prompt=prompt,
                    enhanced_prompt=prompt,
                    error=str(e),
                )

    def _generate_sync(
        self,
        client,
        prompt: str,
        aspect_ratio: str,
        reference_image: Optional[bytes] = None,
        max_retries: int = 3,
    ):
        """
        Synchronous image generation (called in thread pool)

        Uses Gemini's native image generation via generate_content.
        Includes retry logic with exponential backoff for rate limits.

        Args:
            client: Gemini client
            prompt: Enhanced prompt text
            aspect_ratio: Desired aspect ratio
            reference_image: Optional reference image for style consistency
            max_retries: Number of retries for rate limits
        """
        import time

        from google.genai import types

        # Build the config using proper types
        config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )

        # Include aspect ratio hint in the prompt
        prompt_with_ratio = f"{prompt}. Generate in {aspect_ratio} aspect ratio."

        # Build contents - either text-only or multimodal with reference image
        if reference_image:
            # Multimodal request: include reference image for style consistency
            style_instruction = (
                "Create a new tarot card inspired by the visual style of the reference image. "
                "Use a similar color palette, artistic style, and framing approach. "
            )
            contents = [
                types.Part.from_bytes(data=reference_image, mime_type="image/png"),
                style_instruction + prompt_with_ratio,
            ]
        else:
            contents = prompt_with_ratio

        last_error = None
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=config,
                )
                return response
            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Check if it's a rate limit error (429)
                if "429" in str(e) or "resource_exhausted" in error_str or "quota" in error_str:
                    wait_time = (2 ** attempt) * 15  # 15s, 30s, 60s
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                    time.sleep(wait_time)
                    continue
                else:
                    # Non-rate-limit error, don't retry
                    logger.error(f"Gemini API error: {e}")
                    raise

        # All retries exhausted
        logger.error(f"Gemini API error after {max_retries} retries: {last_error}")
        raise last_error

    def _extract_image(self, response) -> tuple:
        """
        Extract image data from Gemini response

        Returns:
            (image_bytes, mime_type, width, height)
        """
        try:
            # Iterate through response parts to find image
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_data = part.inline_data.data
                    mime_type = part.inline_data.mime_type or "image/png"

                    # Decode if base64 string
                    if isinstance(image_data, str):
                        image_data = base64.b64decode(image_data)

                    # Get dimensions from image
                    width, height = self._get_image_dimensions(image_data)

                    return image_data, mime_type, width, height

            return None, "", 0, 0

        except Exception as e:
            logger.error(f"Error extracting image: {e}")
            return None, "", 0, 0

    def _get_image_dimensions(self, image_data: bytes) -> tuple:
        """Get image dimensions from bytes"""
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_data))
            return img.size
        except ImportError:
            logger.warning("PIL not available, dimensions unknown")
            return 0, 0
        except Exception as e:
            logger.warning(f"Could not get image dimensions: {e}")
            return 0, 0

    def _enhance_prompt(
        self,
        prompt: str,
        purpose: str,
        style: str,
        astro_context: Optional[Dict[str, Any]] = None,
        include_card_labels: bool = False,
        card_name: Optional[str] = None,
        card_number: Optional[str] = None,
        border_style: Optional[str] = None,
    ) -> str:
        """
        Enhance prompt with style and astrological context

        Args:
            prompt: Base prompt
            purpose: Image purpose
            style: Style instructions
            astro_context: Optional astrological context
            include_card_labels: Whether to add card name/number to the image
            card_name: Card name (e.g., "The Fool")
            card_number: Card number (e.g., "0" or "I")
            border_style: Custom border/frame style description

        Returns:
            Enhanced prompt string
        """
        parts = []

        # Add the main prompt
        parts.append(prompt)

        # Add style if provided
        if style:
            parts.append(f"Style: {style}")

        # Add border/frame style if specified
        if purpose == "tarot_card":
            if border_style and border_style.strip():
                parts.append(f"Border/frame: {border_style}")

            # Handle card labels
            if include_card_labels and card_name:
                label_text = f"'{card_name}'"
                if card_number:
                    label_text += f" with number {card_number}"
                parts.append(f"Include the card title {label_text} in elegant lettering")
            else:
                parts.append("No text or labels on the card")

        # Add astrological context
        if astro_context:
            if elements := astro_context.get("elements"):
                colors = [
                    self.ELEMENT_COLORS.get(e.lower(), "")
                    for e in elements
                    if e.lower() in self.ELEMENT_COLORS
                ]
                if colors:
                    parts.append(f"Color palette emphasizing: {', '.join(colors)}")

            if signs := astro_context.get("signs"):
                parts.append(f"Subtle zodiac symbolism: {', '.join(signs[:3])}")

            if planets := astro_context.get("planets"):
                parts.append(f"Planetary motifs: {', '.join(planets[:3])}")

        return ". ".join(parts)

    async def generate_batch(
        self,
        items: List[Dict[str, Any]],
        style_prompt: str,
        progress_callback: Optional[Callable[[int, int, str, Optional[bytes]], Awaitable[None]]] = None,
    ) -> List[GeneratedImageResult]:
        """
        Generate multiple images with consistent style

        Args:
            items: List of dicts with 'prompt' and optional 'metadata'
            style_prompt: Consistent style applied to all
            progress_callback: Async callback(index, total, item_name, image_data)

        Returns:
            List of GeneratedImageResult
        """
        results = []
        total = len(items)

        for idx, item in enumerate(items):
            prompt = item.get("prompt", "")
            purpose = item.get("purpose", "custom")
            item_name = item.get("name", f"Item {idx + 1}")

            if progress_callback:
                await progress_callback(idx, total, item_name, None)

            result = await self.generate_image(
                prompt=prompt,
                purpose=purpose,
                style=style_prompt,
                astro_context=item.get("astro_context"),
            )

            results.append(result)

            if progress_callback and result.success:
                await progress_callback(idx + 1, total, item_name, result.image_data)

        return results

    async def refine_image(
        self,
        original_prompt: str,
        refinement_instruction: str,
        purpose: str = "custom",
        style: Optional[str] = None,
        original_image: Optional[bytes] = None,
        border_style: Optional[str] = None,
        include_card_labels: bool = False,
        card_name: Optional[str] = None,
        card_number: Optional[str] = None,
    ) -> GeneratedImageResult:
        """
        Generate a refined version of an image using the original as reference

        Args:
            original_prompt: The original generation prompt
            refinement_instruction: What to change (e.g., "make it more mystical")
            purpose: Image purpose
            style: Style override
            original_image: The original image bytes to use as visual reference
            border_style: Border/frame style description
            include_card_labels: Whether to include card labels
            card_name: Card name for labels
            card_number: Card number for labels

        Returns:
            GeneratedImageResult with refined image
        """
        # Build refined prompt - prepend refinement instruction
        refined_prompt = f"REFINEMENT: {refinement_instruction}. Based on the original design: {original_prompt}"

        return await self.generate_image(
            prompt=refined_prompt,
            purpose=purpose,
            style=style,
            reference_image=original_image,  # Use the original image as reference
            border_style=border_style,
            include_card_labels=include_card_labels,
            card_name=card_name,
            card_number=card_number,
        )


# Singleton instance factory
_service_instance: Optional[GeminiImageService] = None


def get_gemini_image_service(
    api_key: Optional[str] = None,
    force_new: bool = False,
) -> GeminiImageService:
    """
    Get or create GeminiImageService instance

    Args:
        api_key: Optional API key override
        force_new: Force creation of new instance

    Returns:
        GeminiImageService instance
    """
    global _service_instance

    if force_new or _service_instance is None or api_key:
        _service_instance = GeminiImageService(api_key=api_key)

    return _service_instance
