"""
Palm Reading Service

Analyzes palm images using Claude's vision capabilities to generate
comprehensive palm readings with astrological implications.
"""
import os
import base64
import logging
from typing import Dict, Any, Optional
from anthropic import Anthropic, AsyncAnthropic

logger = logging.getLogger(__name__)


class PalmReadingService:
    """
    Service for analyzing palm images and generating palm readings
    using Claude's vision capabilities.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-sonnet-4-20250514"):
        """
        Initialize Palm Reading Service

        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
            model: AI model to use (needs vision capability)
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key required. Set ANTHROPIC_API_KEY environment variable.")

        self.client = Anthropic(api_key=self.api_key)
        self.async_client = AsyncAnthropic(api_key=self.api_key)
        self.model = model

    def _encode_image(self, image_data: bytes) -> str:
        """Encode image bytes to base64"""
        return base64.standard_b64encode(image_data).decode("utf-8")

    def _get_palm_reading_prompt(self, hand_type: str = "both") -> str:
        """
        Get the comprehensive palm reading prompt with astrological correlations

        Args:
            hand_type: "left", "right", or "both"
        """
        hand_context = {
            "left": "the left hand (receptive hand - representing inherited traits, potential, and the inner self)",
            "right": "the right hand (active hand - representing conscious actions, external personality, and how potential is manifested)",
            "both": "both hands (comparing the passive/receptive left hand with the active/dominant right hand for a complete reading)"
        }

        return f"""You are a master palm reader (chiromancer) with deep knowledge of both traditional palmistry and its connections to astrology. You are analyzing {hand_context.get(hand_type, hand_context['both'])}.

Provide a comprehensive palm reading that includes the following sections. For each section, include both the palmistry interpretation AND its astrological correlations:

## 1. HAND SHAPE & ELEMENT
Analyze the overall hand shape and classify it:
- Earth Hand (square palm, short fingers) - Taurus, Virgo, Capricorn traits
- Air Hand (square palm, long fingers) - Gemini, Libra, Aquarius traits
- Fire Hand (rectangular palm, short fingers) - Aries, Leo, Sagittarius traits
- Water Hand (rectangular palm, long fingers) - Cancer, Scorpio, Pisces traits

Describe what this reveals about the person's fundamental nature and temperament.

## 2. THE MAJOR LINES

### Heart Line (Emotional Nature - Moon/Venus influence)
- Position, depth, length, and any special markings
- What it reveals about emotional expression, romantic nature, and relationships
- Astrological correlation: Moon sign and Venus placement implications

### Head Line (Mental Nature - Mercury influence)
- Position, depth, length, curvature, and special markings
- What it reveals about thinking style, intellectual approach, and decision-making
- Astrological correlation: Mercury sign and 3rd house implications

### Life Line (Vitality & Life Path - Sun/Mars influence)
- Position, depth, length, and special markings
- What it reveals about vitality, major life changes, and life force
- Note: This does NOT predict lifespan, but quality and nature of life experiences
- Astrological correlation: Sun sign vitality and Mars energy expression

### Fate Line (Career & Destiny - Saturn influence)
- Presence, position, and characteristics (if visible)
- What it reveals about career path, sense of purpose, and life direction
- Astrological correlation: Saturn placement and 10th house themes

## 3. THE MOUNTS (Planetary Hills)
Analyze the prominence of each mount and its astrological significance:

- Mount of Jupiter (below index finger) - Leadership, ambition, spirituality
- Mount of Saturn (below middle finger) - Wisdom, responsibility, karma
- Mount of Apollo/Sun (below ring finger) - Creativity, success, fame
- Mount of Mercury (below little finger) - Communication, commerce, intelligence
- Mount of Venus (thumb base) - Love, passion, vitality
- Mount of Luna/Moon (opposite Venus) - Imagination, intuition, subconscious
- Mount of Mars (two areas) - Courage, assertiveness, resilience

## 4. FINGER ANALYSIS
Brief analysis of finger proportions and what they reveal:
- Jupiter finger (index) - Self-confidence and leadership
- Saturn finger (middle) - Responsibility and boundaries
- Apollo finger (ring) - Creativity and self-expression
- Mercury finger (little) - Communication and relationships

## 5. SPECIAL MARKINGS
Note any significant special markings visible:
- Stars, crosses, triangles, squares, islands, or chains on lines
- Their locations and interpretations
- Astrological timing implications if relevant

## 6. ASTROLOGICAL SYNTHESIS
Provide a synthesized reading that connects all the palmistry findings to create an astrological profile:
- Likely dominant elements and modalities
- Suggested planetary strengths based on palm features
- Life themes that align with astrological houses
- Overall soul purpose and karmic indicators

## 7. GUIDANCE & POTENTIAL
Based on the reading, provide:
- Key strengths to develop
- Areas for growth and awareness
- Timing considerations (general life phases)
- Empowering message for the individual

IMPORTANT GUIDELINES:
- Output only plain text, NO markdown formatting (no asterisks, no hashes, no bullets in your response)
- Use section headers but no markdown symbols
- Be specific about what you observe in the image
- If certain features are unclear, acknowledge this honestly
- Keep the tone warm, insightful, and empowering
- Focus on potential and guidance rather than deterministic predictions
- If the image quality makes certain features hard to read, note this
- Speak directly to the person as "you"
"""

    async def analyze_palm_async(
        self,
        image_data: bytes,
        media_type: str = "image/jpeg",
        hand_type: str = "both",
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a palm image and generate a comprehensive reading

        Args:
            image_data: Raw image bytes
            media_type: MIME type of the image (image/jpeg, image/png, image/webp)
            hand_type: "left", "right", or "both"
            additional_context: Optional additional context from the user

        Returns:
            Dictionary with palm reading results
        """
        try:
            # Encode image to base64
            base64_image = self._encode_image(image_data)

            # Build the prompt
            prompt = self._get_palm_reading_prompt(hand_type)
            if additional_context:
                prompt += f"\n\nAdditional context from the person: {additional_context}"

            # Create the message with vision
            message = await self.async_client.messages.create(
                model=self.model,
                max_tokens=4000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": base64_image
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            reading_text = message.content[0].text.strip()

            # Parse the reading into sections
            sections = self._parse_reading_sections(reading_text)

            return {
                "success": True,
                "full_reading": reading_text,
                "sections": sections,
                "hand_type": hand_type,
                "model_used": self.model,
                "tokens_used": {
                    "input": message.usage.input_tokens,
                    "output": message.usage.output_tokens
                }
            }

        except Exception as e:
            logger.error(f"Error analyzing palm: {e}")
            return {
                "success": False,
                "error": str(e),
                "full_reading": None,
                "sections": None
            }

    def analyze_palm(
        self,
        image_data: bytes,
        media_type: str = "image/jpeg",
        hand_type: str = "both",
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synchronous version of analyze_palm_async

        Args:
            image_data: Raw image bytes
            media_type: MIME type of the image
            hand_type: "left", "right", or "both"
            additional_context: Optional additional context

        Returns:
            Dictionary with palm reading results
        """
        try:
            base64_image = self._encode_image(image_data)
            prompt = self._get_palm_reading_prompt(hand_type)
            if additional_context:
                prompt += f"\n\nAdditional context from the person: {additional_context}"

            message = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": base64_image
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            reading_text = message.content[0].text.strip()
            sections = self._parse_reading_sections(reading_text)

            return {
                "success": True,
                "full_reading": reading_text,
                "sections": sections,
                "hand_type": hand_type,
                "model_used": self.model,
                "tokens_used": {
                    "input": message.usage.input_tokens,
                    "output": message.usage.output_tokens
                }
            }

        except Exception as e:
            logger.error(f"Error analyzing palm: {e}")
            return {
                "success": False,
                "error": str(e),
                "full_reading": None,
                "sections": None
            }

    def _parse_reading_sections(self, reading_text: str) -> Dict[str, str]:
        """
        Parse the reading text into sections

        Args:
            reading_text: Full reading text from AI

        Returns:
            Dictionary mapping section names to content
        """
        sections = {}
        current_section = "introduction"
        current_content = []

        # Section markers to look for
        section_markers = [
            ("HAND SHAPE", "hand_shape"),
            ("MAJOR LINES", "major_lines"),
            ("HEART LINE", "heart_line"),
            ("HEAD LINE", "head_line"),
            ("LIFE LINE", "life_line"),
            ("FATE LINE", "fate_line"),
            ("MOUNTS", "mounts"),
            ("FINGER ANALYSIS", "fingers"),
            ("SPECIAL MARKINGS", "special_markings"),
            ("ASTROLOGICAL SYNTHESIS", "astrological_synthesis"),
            ("GUIDANCE", "guidance"),
        ]

        lines = reading_text.split('\n')

        for line in lines:
            line_upper = line.upper().strip()

            # Check if this line starts a new section
            new_section = None
            for marker, section_key in section_markers:
                if marker in line_upper:
                    new_section = section_key
                    break

            if new_section:
                # Save previous section
                if current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = new_section
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_content:
            sections[current_section] = '\n'.join(current_content).strip()

        return sections

    async def generate_quick_insight_async(
        self,
        image_data: bytes,
        media_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Generate a quick, shorter palm insight (for preview/summary)

        Args:
            image_data: Raw image bytes
            media_type: MIME type of the image

        Returns:
            Dictionary with quick insight
        """
        try:
            base64_image = self._encode_image(image_data)

            prompt = """You are a skilled palm reader. Look at this palm and provide a brief, insightful reading in 3-4 sentences.

Focus on:
1. The most prominent feature you notice
2. One key strength you see
3. One area of potential or growth

Keep it concise, warm, and encouraging. Output plain text only, no markdown formatting. Speak directly to the person as "you"."""

            message = await self.async_client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": base64_image
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            return {
                "success": True,
                "insight": message.content[0].text.strip(),
                "model_used": self.model
            }

        except Exception as e:
            logger.error(f"Error generating quick insight: {e}")
            return {
                "success": False,
                "error": str(e),
                "insight": None
            }
