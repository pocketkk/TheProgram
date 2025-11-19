"""
AI Interpretation Service

Generates astrological interpretations using AI models (Claude)
"""
import os
import asyncio
from typing import Dict, List, Optional, Any
import anthropic
from anthropic import Anthropic, AsyncAnthropic
import logging

logger = logging.getLogger(__name__)


class AIInterpreter:
    """
    AI service for generating astrological interpretations
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-haiku-4-5-20251001"):
        """
        Initialize AI interpreter

        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
            model: AI model to use
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key required. Set ANTHROPIC_API_KEY environment variable.")

        self.client = Anthropic(api_key=self.api_key)
        self.async_client = AsyncAnthropic(api_key=self.api_key)
        self.model = model

    def generate_planet_interpretation(
        self,
        planet_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate interpretation for a planet placement

        Args:
            planet_data: Planet information (name, sign, degree, house, etc.)
            chart_context: Additional chart context for personalization

        Returns:
            AI-generated interpretation text
        """
        planet_name = planet_data.get("name", "Planet")
        sign_num = planet_data.get("sign", 0)
        sign = planet_data.get("sign_name", "")
        house = planet_data.get("house", "")  # May need to calculate from houses
        degree = planet_data.get("degree_in_sign", planet_data.get("degree", ""))
        is_retrograde = planet_data.get("retrograde", False)

        prompt = f"""You are an expert astrologer. Generate a concise, insightful interpretation for the following planetary placement:

Planet: {planet_name}
Sign: {sign}
House: {house}
Degree: {degree}° {sign}
Retrograde: {'Yes' if is_retrograde else 'No'}

Provide a 2-3 sentence interpretation focusing on:
1. The core meaning of this placement
2. How it manifests in the person's life
3. Key themes or qualities

Be specific, insightful, and use professional astrological language. Keep it personal and actionable."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            return message.content[0].text.strip()

        except Exception as e:
            logger.error(f"Error generating planet interpretation: {e}")
            raise

    def generate_house_interpretation(
        self,
        house_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate interpretation for a house

        Args:
            house_data: House information (number, sign, cusp, planets)
            chart_context: Additional chart context

        Returns:
            AI-generated interpretation text
        """
        house_number = house_data.get("number", 1)
        sign = house_data.get("sign", "")
        cusp = house_data.get("cusp", "")
        planets = house_data.get("planets", [])

        planets_str = ", ".join(planets) if planets else "no planets"

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following house:

House: {house_number}
Sign on Cusp: {sign}
Cusp Position: {cusp}°
Planets in House: {planets_str}

Provide a 2-3 sentence interpretation focusing on:
1. The life area this house governs
2. How the sign influences this area
3. Key themes or focus areas

Be specific and insightful. Keep it personal and actionable."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            return message.content[0].text.strip()

        except Exception as e:
            logger.error(f"Error generating house interpretation: {e}")
            raise

    def generate_aspect_interpretation(
        self,
        aspect_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate interpretation for an aspect

        Args:
            aspect_data: Aspect information (planet1, planet2, type, orb, etc.)
            chart_context: Additional chart context

        Returns:
            AI-generated interpretation text
        """
        planet1 = aspect_data.get("planet1", "")
        planet2 = aspect_data.get("planet2", "")
        aspect_type = aspect_data.get("type", "")
        orb = aspect_data.get("orb", 0)
        is_applying = aspect_data.get("isApplying", False)

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following aspect:

Aspect: {planet1} {aspect_type} {planet2}
Orb: {orb:.2f}°
Status: {'Applying' if is_applying else 'Separating'}

Provide a 2-3 sentence interpretation focusing on:
1. The dynamic between these two planets
2. How this aspect manifests in the person's life
3. Potential challenges or opportunities

Be specific and insightful. Use professional astrological language."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            return message.content[0].text.strip()

        except Exception as e:
            logger.error(f"Error generating aspect interpretation: {e}")
            raise

    def generate_pattern_interpretation(
        self,
        pattern_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate interpretation for an aspect pattern

        Args:
            pattern_data: Pattern information (type, planets, aspects)
            chart_context: Additional chart context

        Returns:
            AI-generated interpretation text
        """
        pattern_type = pattern_data.get("type", "")
        planets = pattern_data.get("planets", [])
        aspects = pattern_data.get("aspects", [])

        planets_str = ", ".join(planets) if planets else ""
        aspects_str = ", ".join([a.get("type", "") for a in aspects]) if aspects else ""

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following aspect pattern:

Pattern Type: {pattern_type}
Planets Involved: {planets_str}
Aspects: {aspects_str}

Provide a 2-3 sentence interpretation focusing on:
1. The significance of this pattern configuration
2. How it influences the person's life and personality
3. Key themes, strengths, or challenges

Be specific and insightful. Use professional astrological language."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=350,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            return message.content[0].text.strip()

        except Exception as e:
            logger.error(f"Error generating pattern interpretation: {e}")
            raise

    async def generate_planet_interpretation_async(
        self,
        planet_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Async version of generate_planet_interpretation"""
        planet_name = planet_data.get("name", "Planet")
        sign_num = planet_data.get("sign", 0)
        sign = planet_data.get("sign_name", "")
        house = planet_data.get("house", "")
        degree = planet_data.get("degree_in_sign", planet_data.get("degree", ""))
        is_retrograde = planet_data.get("retrograde", False)

        prompt = f"""You are an expert astrologer. Generate a concise, insightful interpretation for the following planetary placement:

Planet: {planet_name}
Sign: {sign}
House: {house}
Degree: {degree}° {sign}
Retrograde: {'Yes' if is_retrograde else 'No'}

Provide a 2-3 sentence interpretation focusing on:
1. The core meaning of this placement
2. How it manifests in the person's life
3. Key themes or qualities

Be specific, insightful, and use professional astrological language. Keep it personal and actionable."""

        try:
            message = await self.async_client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating planet interpretation: {e}")
            raise

    async def generate_house_interpretation_async(
        self,
        house_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Async version of generate_house_interpretation"""
        house_number = house_data.get("number", 1)
        sign = house_data.get("sign", "")
        cusp = house_data.get("cusp", "")
        planets = house_data.get("planets", [])

        planets_str = ", ".join(planets) if planets else "no planets"

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following house:

House: {house_number}
Sign on Cusp: {sign}
Cusp Position: {cusp}°
Planets in House: {planets_str}

Provide a 2-3 sentence interpretation focusing on:
1. The life area this house governs
2. How the sign influences this area
3. Key themes or focus areas

Be specific and insightful. Keep it personal and actionable."""

        try:
            message = await self.async_client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating house interpretation: {e}")
            raise

    async def generate_batch_interpretations_async(
        self,
        chart_data: Dict[str, Any],
        element_types: Optional[List[str]] = None,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, List[Dict[str, str]]]:
        """
        Generate interpretations for multiple chart elements in parallel

        Args:
            chart_data: Full chart data
            element_types: Types to generate (if None, generates all)
            progress_callback: Optional callback function for progress updates
                             Called with (element_type, element_key, description)

        Returns:
            Dictionary with generated interpretations by element type
        """
        if element_types is None:
            element_types = ["planet", "house", "aspect", "pattern"]

        results = {}

        # Process planets in parallel batches
        if "planet" in element_types and "planets" in chart_data:
            results["planet"] = []
            tasks = []
            planet_keys = []

            for planet_name, planet_data in chart_data["planets"].items():
                planet_info = {
                    "name": planet_name.capitalize(),
                    **planet_data
                }
                tasks.append(self.generate_planet_interpretation_async(planet_info, chart_data))
                planet_keys.append(planet_name.lower())

            # Process 10 planets at a time
            for i in range(0, len(tasks), 10):
                batch_tasks = tasks[i:i+10]
                batch_keys = planet_keys[i:i+10]

                descriptions = await asyncio.gather(*batch_tasks, return_exceptions=True)

                for key, description in zip(batch_keys, descriptions):
                    if isinstance(description, Exception):
                        logger.error(f"Error generating planet interpretation for {key}: {description}")
                        continue

                    result = {
                        "element_key": key,
                        "description": description
                    }
                    results["planet"].append(result)

                    # Call progress callback if provided
                    if progress_callback:
                        await progress_callback("planet", key, description)

        # Process houses in parallel batches
        if "house" in element_types and "houses" in chart_data:
            results["house"] = []
            tasks = []
            house_numbers = []

            for house in chart_data["houses"]:
                tasks.append(self.generate_house_interpretation_async(house, chart_data))
                house_numbers.append(house.get('number', 0))

            # Process 10 houses at a time
            for i in range(0, len(tasks), 10):
                batch_tasks = tasks[i:i+10]
                batch_numbers = house_numbers[i:i+10]

                descriptions = await asyncio.gather(*batch_tasks, return_exceptions=True)

                for number, description in zip(batch_numbers, descriptions):
                    if isinstance(description, Exception):
                        logger.error(f"Error generating house interpretation for house {number}: {description}")
                        continue

                    result = {
                        "element_key": f"house_{number}",
                        "description": description
                    }
                    results["house"].append(result)

                    # Call progress callback if provided
                    if progress_callback:
                        await progress_callback("house", f"house_{number}", description)

        return results

    def generate_batch_interpretations(
        self,
        chart_data: Dict[str, Any],
        element_types: Optional[List[str]] = None
    ) -> Dict[str, List[Dict[str, str]]]:
        """
        Synchronous wrapper for generate_batch_interpretations_async
        For backward compatibility with existing code
        """
        return asyncio.run(self.generate_batch_interpretations_async(chart_data, element_types))

    def generate_batch_interpretations_old(
        self,
        chart_data: Dict[str, Any],
        element_types: Optional[List[str]] = None
    ) -> Dict[str, List[Dict[str, str]]]:
        """
        OLD SEQUENTIAL VERSION - kept for reference
        Generate interpretations for multiple chart elements

        Args:
            chart_data: Full chart data
            element_types: Types to generate (if None, generates all)

        Returns:
            Dictionary with generated interpretations by element type
        """
        if element_types is None:
            element_types = ["planet", "house", "aspect", "pattern"]

        results = {}

        if "planet" in element_types and "planets" in chart_data:
            results["planet"] = []
            for planet_name, planet_data in chart_data["planets"].items():
                try:
                    # Add planet name to the data for the prompt
                    planet_info = {
                        "name": planet_name.capitalize(),
                        **planet_data
                    }
                    description = self.generate_planet_interpretation(planet_info, chart_data)
                    results["planet"].append({
                        "element_key": planet_name.lower(),
                        "description": description
                    })
                except Exception as e:
                    logger.error(f"Error generating planet interpretation for {planet_name}: {e}")

        if "house" in element_types and "houses" in chart_data:
            results["house"] = []
            for house in chart_data["houses"]:
                try:
                    description = self.generate_house_interpretation(house, chart_data)
                    results["house"].append({
                        "element_key": f"house_{house.get('number', 0)}",
                        "description": description
                    })
                except Exception as e:
                    logger.error(f"Error generating house interpretation for house {house.get('number')}: {e}")

        if "aspect" in element_types and "aspects" in chart_data:
            results["aspect"] = []
            for aspect in chart_data["aspects"]:
                try:
                    description = self.generate_aspect_interpretation(aspect, chart_data)
                    planet1 = aspect.get("planet1", "").lower().replace(" ", "_")
                    planet2 = aspect.get("planet2", "").lower().replace(" ", "_")
                    aspect_type = aspect.get("type", "").lower().replace(" ", "_")
                    results["aspect"].append({
                        "element_key": f"{planet1}_{aspect_type}_{planet2}",
                        "description": description
                    })
                except Exception as e:
                    logger.error(f"Error generating aspect interpretation: {e}")

        if "pattern" in element_types and "patterns" in chart_data:
            results["pattern"] = []
            for idx, pattern in enumerate(chart_data["patterns"]):
                try:
                    description = self.generate_pattern_interpretation(pattern, chart_data)
                    pattern_type = pattern.get("type", "").lower().replace(" ", "_")
                    results["pattern"].append({
                        "element_key": f"{pattern_type}_{idx + 1}",
                        "description": description
                    })
                except Exception as e:
                    logger.error(f"Error generating pattern interpretation: {e}")

        return results
