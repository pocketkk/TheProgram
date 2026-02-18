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

IMPORTANT: Output only plain text, NO markdown formatting (no asterisks, no hashes, no bullets). Be specific, insightful, and use professional astrological language. Keep it personal and actionable."""

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
            house_data: House information (number, sign, cusp, planets, relevant_aspects)
            chart_context: Additional chart context

        Returns:
            AI-generated interpretation text
        """
        house_number = house_data.get("number", 1)
        sign = house_data.get("sign", "")
        cusp = house_data.get("cusp", "")
        planets = house_data.get("planets", [])
        relevant_aspects = house_data.get("relevant_aspects", [])

        planets_str = ", ".join(planets) if planets else "no planets"
        aspects_str = "\n".join(f"  - {aspect}" for aspect in relevant_aspects) if relevant_aspects else "  (no major aspects)"

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following house:

House: {house_number}
Sign on Cusp: {sign}
Cusp Position: {cusp}°
Planets in House: {planets_str}
Major Aspects involving these planets:
{aspects_str}

Provide a 2-3 sentence interpretation focusing on:
1. The life area this house governs
2. How the sign influences this area
3. How the planets and aspects modify the expression
4. Key themes or focus areas

IMPORTANT: Output only plain text, NO markdown formatting (no asterisks, no hashes, no bullets). Be specific and insightful. Consider the aspects when discussing planetary influences. Keep it personal and actionable."""

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

IMPORTANT: Output only plain text, NO markdown formatting (no asterisks, no hashes, no bullets). Be specific, insightful, and use professional astrological language. Keep it personal and actionable."""

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
        relevant_aspects = house_data.get("relevant_aspects", [])

        planets_str = ", ".join(planets) if planets else "no planets"
        aspects_str = "\n".join(f"  - {aspect}" for aspect in relevant_aspects) if relevant_aspects else "  (no major aspects)"

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following house:

House: {house_number}
Sign on Cusp: {sign}
Cusp Position: {cusp}°
Planets in House: {planets_str}
Major Aspects involving these planets:
{aspects_str}

Provide a 2-3 sentence interpretation focusing on:
1. The life area this house governs
2. How the sign influences this area
3. How the planets and aspects modify the expression
4. Key themes or focus areas

IMPORTANT: Output only plain text, NO markdown formatting (no asterisks, no hashes, no bullets). Be specific and insightful. Consider the aspects when discussing planetary influences. Keep it personal and actionable."""

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

    async def generate_aspect_interpretation_async(
        self,
        aspect_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Async version of generate_aspect_interpretation"""
        # Skip if aspect_data is None or not a dict
        if aspect_data is None or not isinstance(aspect_data, dict):
            raise ValueError("aspect_data must be a dict")

        planet1 = aspect_data.get("planet1", "")
        planet2 = aspect_data.get("planet2", "")
        aspect_type = aspect_data.get("type", aspect_data.get("aspect_type", ""))
        orb = aspect_data.get("orb", 0)
        is_applying = aspect_data.get("isApplying", aspect_data.get("is_applying", False))

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following aspect:

Aspect: {planet1} {aspect_type} {planet2}
Orb: {orb:.2f}°
Status: {'Applying' if is_applying else 'Separating'}

Provide a 2-3 sentence interpretation focusing on:
1. The dynamic between these two planets
2. How this aspect manifests in the person's life
3. Potential challenges or opportunities

IMPORTANT: Output only plain text, NO markdown formatting. Be specific and insightful. Use professional astrological language."""

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
            logger.error(f"Error generating aspect interpretation: {e}")
            raise

    async def generate_pattern_interpretation_async(
        self,
        pattern_data: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Async version of generate_pattern_interpretation"""
        # Skip if pattern_data is None or not a dict
        if pattern_data is None or not isinstance(pattern_data, dict):
            raise ValueError("pattern_data must be a dict")

        pattern_type = pattern_data.get("type", pattern_data.get("name", ""))
        planets = pattern_data.get("planets", [])
        aspects = pattern_data.get("aspects", [])

        planets_str = ", ".join(planets) if planets else ""
        # Handle aspects safely - they could be dicts or None
        if aspects and isinstance(aspects, list):
            aspect_types = []
            for a in aspects:
                if isinstance(a, dict):
                    aspect_types.append(a.get("type", a.get("aspect_type", "")))
            aspects_str = ", ".join(aspect_types) if aspect_types else ""
        else:
            aspects_str = ""

        prompt = f"""You are an expert astrologer. Generate a concise interpretation for the following aspect pattern:

Pattern Type: {pattern_type}
Planets Involved: {planets_str}
Aspects: {aspects_str}

Provide a 2-3 sentence interpretation focusing on:
1. The significance of this pattern configuration
2. How it influences the person's life and personality
3. Key themes, strengths, or challenges

IMPORTANT: Output only plain text, NO markdown formatting. Be specific and insightful. Use professional astrological language."""

        try:
            message = await self.async_client.messages.create(
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
                # Skip if planet_data is None or not a dict
                if planet_data is None or not isinstance(planet_data, dict):
                    logger.warning(f"Skipping planet {planet_name}: data is None or not a dict")
                    continue
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

            # Enrich house data with planets that are in each house
            for house in chart_data["houses"]:
                # Skip if house is None or not a dict
                if house is None or not isinstance(house, dict):
                    logger.warning(f"Skipping house: data is None or not a dict")
                    continue
                house_number = house.get('number', 0)

                # Find all planets in this house
                planets_in_house = []
                planets_dict = chart_data.get("planets", {})
                if isinstance(planets_dict, dict):
                    for planet_name, planet_data in planets_dict.items():
                        # Skip if planet_data is not a dict
                        if not isinstance(planet_data, dict):
                            continue
                        if planet_data.get("house") == house_number:
                            planets_in_house.append(planet_name.capitalize())

                # Find aspects involving planets in this house
                relevant_aspects = []
                if "aspects" in chart_data:
                    for aspect in chart_data["aspects"]:
                        # Skip if aspect is not a dict
                        if not isinstance(aspect, dict):
                            continue
                        planet1 = aspect.get("planet1", "")
                        planet2 = aspect.get("planet2", "")
                        # Include aspect if either planet is in this house
                        if isinstance(planets_dict, dict):
                            for planet_name, planet_data in planets_dict.items():
                                # Skip if planet_data is not a dict
                                if not isinstance(planet_data, dict):
                                    continue
                                if planet_data.get("house") == house_number:
                                    if planet1.lower() == planet_name.lower() or planet2.lower() == planet_name.lower():
                                        aspect_type = aspect.get("aspect_type", "")
                                        aspect_str = f"{planet1.capitalize()} {aspect_type} {planet2.capitalize()}"
                                        if aspect_str not in relevant_aspects:
                                            relevant_aspects.append(aspect_str)

                # Create enriched house data
                enriched_house = {
                    **house,
                    "planets": planets_in_house,
                    "relevant_aspects": relevant_aspects
                }

                tasks.append(self.generate_house_interpretation_async(enriched_house, chart_data))
                house_numbers.append(house_number)

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

        # Process aspects in parallel batches
        if "aspect" in element_types and "aspects" in chart_data:
            results["aspect"] = []
            tasks = []
            aspect_keys = []

            for aspect in chart_data["aspects"]:
                # Skip if aspect is None or not a dict
                if aspect is None or not isinstance(aspect, dict):
                    logger.warning(f"Skipping aspect: data is None or not a dict")
                    continue
                tasks.append(self.generate_aspect_interpretation_async(aspect, chart_data))
                planet1 = aspect.get("planet1", "").lower().replace(" ", "_")
                planet2 = aspect.get("planet2", "").lower().replace(" ", "_")
                aspect_type = aspect.get("type", aspect.get("aspect_type", "")).lower().replace(" ", "_")
                aspect_keys.append(f"{planet1}_{aspect_type}_{planet2}")

            # Process 10 aspects at a time
            for i in range(0, len(tasks), 10):
                batch_tasks = tasks[i:i+10]
                batch_keys = aspect_keys[i:i+10]

                descriptions = await asyncio.gather(*batch_tasks, return_exceptions=True)

                for key, description in zip(batch_keys, descriptions):
                    if isinstance(description, Exception):
                        logger.error(f"Error generating aspect interpretation for {key}: {description}")
                        continue

                    result = {
                        "element_key": key,
                        "description": description
                    }
                    results["aspect"].append(result)

                    # Call progress callback if provided
                    if progress_callback:
                        await progress_callback("aspect", key, description)

        # Process patterns in parallel batches
        if "pattern" in element_types and "patterns" in chart_data:
            results["pattern"] = []
            tasks = []
            pattern_keys = []

            for idx, pattern in enumerate(chart_data["patterns"]):
                # Skip if pattern is None or not a dict
                if pattern is None or not isinstance(pattern, dict):
                    logger.warning(f"Skipping pattern at index {idx}: data is None or not a dict")
                    continue
                tasks.append(self.generate_pattern_interpretation_async(pattern, chart_data))
                pattern_type = pattern.get("type", pattern.get("name", "")).lower().replace(" ", "_")
                pattern_keys.append(f"{pattern_type}_{idx + 1}")

            # Process 10 patterns at a time
            for i in range(0, len(tasks), 10):
                batch_tasks = tasks[i:i+10]
                batch_keys = pattern_keys[i:i+10]

                descriptions = await asyncio.gather(*batch_tasks, return_exceptions=True)

                for key, description in zip(batch_keys, descriptions):
                    if isinstance(description, Exception):
                        logger.error(f"Error generating pattern interpretation for {key}: {description}")
                        continue

                    result = {
                        "element_key": key,
                        "description": description
                    }
                    results["pattern"].append(result)

                    # Call progress callback if provided
                    if progress_callback:
                        await progress_callback("pattern", key, description)

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

    # ==================== Transit Interpretation Methods ====================

    def generate_transit_interpretation(
        self,
        transit_data: Dict[str, Any],
        natal_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate AI interpretation for a transit aspect

        Args:
            transit_data: Transit information (transit_planet, natal_planet, aspect, etc.)
            natal_context: Additional natal chart context

        Returns:
            AI-generated interpretation text
        """
        transit_planet = transit_data.get("transit_planet", "")
        natal_planet = transit_data.get("natal_planet", "")
        aspect = transit_data.get("aspect", "")
        orb = transit_data.get("orb", 0)
        is_applying = transit_data.get("is_applying", False)
        significance = transit_data.get("significance", "moderate")
        transit_sign = transit_data.get("transit_sign", "")
        natal_sign = transit_data.get("natal_sign", "")
        is_retrograde = transit_data.get("transit_retrograde", False)
        duration = transit_data.get("estimated_duration", "")

        prompt = f"""You are an expert astrologer specializing in transit analysis. Generate an insightful interpretation for this current transit:

Transit: {transit_planet}{' (Retrograde)' if is_retrograde else ''} {aspect} natal {natal_planet}
Transit Planet Position: {transit_planet} in {transit_sign}
Natal Planet Position: {natal_planet} in {natal_sign}
Orb: {orb:.2f}°
Status: {'Applying (building in intensity)' if is_applying else 'Separating (waning in influence)'}
Significance Level: {significance}
Estimated Duration: {duration}

Provide a 3-4 sentence interpretation focusing on:
1. What energies this transit activates in the person's life
2. What opportunities or challenges may arise
3. How to best work with this energy
4. Any timing considerations

IMPORTANT: Output only plain text, NO markdown formatting. Be practical, insightful, and encouraging. Focus on actionable guidance."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=400,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating transit interpretation: {e}")
            raise

    async def generate_transit_interpretation_async(
        self,
        transit_data: Dict[str, Any],
        natal_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Async version of generate_transit_interpretation"""
        transit_planet = transit_data.get("transit_planet", "")
        natal_planet = transit_data.get("natal_planet", "")
        aspect = transit_data.get("aspect", "")
        orb = transit_data.get("orb", 0)
        is_applying = transit_data.get("is_applying", False)
        significance = transit_data.get("significance", "moderate")
        transit_sign = transit_data.get("transit_sign", "")
        natal_sign = transit_data.get("natal_sign", "")
        is_retrograde = transit_data.get("transit_retrograde", False)
        duration = transit_data.get("estimated_duration", "")

        prompt = f"""You are an expert astrologer specializing in transit analysis. Generate an insightful interpretation for this current transit:

Transit: {transit_planet}{' (Retrograde)' if is_retrograde else ''} {aspect} natal {natal_planet}
Transit Planet Position: {transit_planet} in {transit_sign}
Natal Planet Position: {natal_planet} in {natal_sign}
Orb: {orb:.2f}°
Status: {'Applying (building in intensity)' if is_applying else 'Separating (waning in influence)'}
Significance Level: {significance}
Estimated Duration: {duration}

Provide a 3-4 sentence interpretation focusing on:
1. What energies this transit activates in the person's life
2. What opportunities or challenges may arise
3. How to best work with this energy
4. Any timing considerations

IMPORTANT: Output only plain text, NO markdown formatting. Be practical, insightful, and encouraging. Focus on actionable guidance."""

        try:
            message = await self.async_client.messages.create(
                model=self.model,
                max_tokens=400,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating transit interpretation: {e}")
            raise

    def generate_daily_transit_forecast(
        self,
        daily_snapshot: Dict[str, Any],
        natal_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a daily transit forecast

        Args:
            daily_snapshot: Daily snapshot with moon phase, active transits, themes
            natal_context: Additional natal chart context

        Returns:
            AI-generated daily forecast
        """
        date = daily_snapshot.get("date", "today")
        moon_phase = daily_snapshot.get("moon_phase", "")
        moon_sign = daily_snapshot.get("moon_sign", "")
        sun_sign = daily_snapshot.get("sun_sign", "")
        themes = daily_snapshot.get("themes", [])
        active_transits = daily_snapshot.get("active_transits", [])
        major_transit = daily_snapshot.get("major_transit")

        # Format active transits
        transits_summary = []
        for t in active_transits[:5]:  # Top 5
            status = "applying" if t.get("is_applying") else "separating"
            transits_summary.append(
                f"- {t.get('transit_planet')} {t.get('aspect')} {t.get('natal_planet')} ({t.get('significance')}, {status})"
            )
        transits_str = "\n".join(transits_summary) if transits_summary else "No major transits"

        major_transit_str = ""
        if major_transit:
            major_transit_str = f"\nMost Significant Transit: {major_transit.get('transit_planet')} {major_transit.get('aspect')} {major_transit.get('natal_planet')}"

        themes_str = ", ".join(themes) if themes else "General flow"

        prompt = f"""You are an expert astrologer creating a personalized daily transit forecast. Based on the following cosmic weather, write an inspiring and practical daily horoscope:

Date: {date}
Moon Phase: {moon_phase}
Moon in: {moon_sign}
Sun in: {sun_sign}
Today's Themes: {themes_str}
{major_transit_str}

Active Transits to Natal Chart:
{transits_str}

Write a 4-5 sentence personalized daily forecast that:
1. Sets the overall tone for the day based on the moon phase and sign
2. Highlights the most important transit influences
3. Suggests how to best use the day's energies
4. Provides practical advice for decisions, relationships, or activities
5. Ends with an uplifting or empowering message

IMPORTANT: Output only plain text, NO markdown formatting. Be warm, insightful, and practically helpful. Speak directly to the reader as "you"."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.8,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating daily forecast: {e}")
            raise

    async def generate_daily_transit_forecast_async(
        self,
        daily_snapshot: Dict[str, Any],
        natal_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Async version of generate_daily_transit_forecast"""
        date = daily_snapshot.get("date", "today")
        moon_phase = daily_snapshot.get("moon_phase", "")
        moon_sign = daily_snapshot.get("moon_sign", "")
        sun_sign = daily_snapshot.get("sun_sign", "")
        themes = daily_snapshot.get("themes", [])
        active_transits = daily_snapshot.get("active_transits", [])
        major_transit = daily_snapshot.get("major_transit")

        transits_summary = []
        for t in active_transits[:5]:
            status = "applying" if t.get("is_applying") else "separating"
            transits_summary.append(
                f"- {t.get('transit_planet')} {t.get('aspect')} {t.get('natal_planet')} ({t.get('significance')}, {status})"
            )
        transits_str = "\n".join(transits_summary) if transits_summary else "No major transits"

        major_transit_str = ""
        if major_transit:
            major_transit_str = f"\nMost Significant Transit: {major_transit.get('transit_planet')} {major_transit.get('aspect')} {major_transit.get('natal_planet')}"

        themes_str = ", ".join(themes) if themes else "General flow"

        prompt = f"""You are an expert astrologer creating a personalized daily transit forecast. Based on the following cosmic weather, write an inspiring and practical daily horoscope:

Date: {date}
Moon Phase: {moon_phase}
Moon in: {moon_sign}
Sun in: {sun_sign}
Today's Themes: {themes_str}
{major_transit_str}

Active Transits to Natal Chart:
{transits_str}

Write a 4-5 sentence personalized daily forecast that:
1. Sets the overall tone for the day based on the moon phase and sign
2. Highlights the most important transit influences
3. Suggests how to best use the day's energies
4. Provides practical advice for decisions, relationships, or activities
5. Ends with an uplifting or empowering message

IMPORTANT: Output only plain text, NO markdown formatting. Be warm, insightful, and practically helpful. Speak directly to the reader as "you"."""

        try:
            message = await self.async_client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.8,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating daily forecast: {e}")
            raise

    def generate_transit_report(
        self,
        transits_response: Dict[str, Any],
        natal_context: Optional[Dict[str, Any]] = None,
        report_type: str = "comprehensive"
    ) -> str:
        """
        Generate a comprehensive transit report

        Args:
            transits_response: Full transit response with current_positions, transits, summary
            natal_context: Additional natal chart context
            report_type: "comprehensive", "highlights", or "brief"

        Returns:
            AI-generated transit report
        """
        summary = transits_response.get("summary", {})
        transits = transits_response.get("transits", [])
        transit_datetime = transits_response.get("transit_datetime", "")

        # Group transits by significance
        major_transits = [t for t in transits if t.get("significance") == "major"]
        significant_transits = [t for t in transits if t.get("significance") == "significant"]

        # Format major transits
        major_str = ""
        if major_transits:
            major_list = []
            for t in major_transits:
                retro = " (R)" if t.get("transit_retrograde") else ""
                status = "applying" if t.get("is_applying") else "separating"
                major_list.append(
                    f"- {t.get('transit_planet')}{retro} {t.get('aspect')} {t.get('natal_planet')} ({status}, {t.get('orb', 0):.1f}° orb)"
                )
            major_str = "\n".join(major_list)

        # Format significant transits
        significant_str = ""
        if significant_transits:
            sig_list = []
            for t in significant_transits[:5]:
                retro = " (R)" if t.get("transit_retrograde") else ""
                sig_list.append(
                    f"- {t.get('transit_planet')}{retro} {t.get('aspect')} {t.get('natal_planet')}"
                )
            significant_str = "\n".join(sig_list)

        themes = summary.get("themes", [])
        themes_str = ", ".join(themes) if themes else "No dominant themes"

        max_tokens = 800 if report_type == "comprehensive" else (400 if report_type == "highlights" else 250)

        prompt = f"""You are an expert astrologer writing a {report_type} transit report. Create an insightful analysis based on the current transits:

Transit Time: {transit_datetime}
Total Active Transits: {summary.get('total_transits', 0)}
Major Transits: {summary.get('major_count', 0)}
Significant Transits: {summary.get('significant_count', 0)}
Current Themes: {themes_str}

MAJOR TRANSITS (most impactful):
{major_str if major_str else "None currently"}

SIGNIFICANT TRANSITS:
{significant_str if significant_str else "None currently"}

Write a {report_type} transit report that:
1. Opens with an overview of the current cosmic climate
2. Analyzes each major transit and its implications
3. Discusses how these transits interact and combine
4. Identifies key opportunities and challenges
5. Provides timing advice and practical recommendations
6. Closes with empowering guidance

IMPORTANT: Output only plain text, NO markdown formatting. Be thorough yet accessible. Write as if speaking directly to the person about their current situation."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating transit report: {e}")
            raise

    async def generate_transit_report_async(
        self,
        transits_response: Dict[str, Any],
        natal_context: Optional[Dict[str, Any]] = None,
        report_type: str = "comprehensive"
    ) -> str:
        """Async version of generate_transit_report"""
        summary = transits_response.get("summary", {})
        transits = transits_response.get("transits", [])
        transit_datetime = transits_response.get("transit_datetime", "")

        major_transits = [t for t in transits if t.get("significance") == "major"]
        significant_transits = [t for t in transits if t.get("significance") == "significant"]

        major_str = ""
        if major_transits:
            major_list = []
            for t in major_transits:
                retro = " (R)" if t.get("transit_retrograde") else ""
                status = "applying" if t.get("is_applying") else "separating"
                major_list.append(
                    f"- {t.get('transit_planet')}{retro} {t.get('aspect')} {t.get('natal_planet')} ({status}, {t.get('orb', 0):.1f}° orb)"
                )
            major_str = "\n".join(major_list)

        significant_str = ""
        if significant_transits:
            sig_list = []
            for t in significant_transits[:5]:
                retro = " (R)" if t.get("transit_retrograde") else ""
                sig_list.append(
                    f"- {t.get('transit_planet')}{retro} {t.get('aspect')} {t.get('natal_planet')}"
                )
            significant_str = "\n".join(sig_list)

        themes = summary.get("themes", [])
        themes_str = ", ".join(themes) if themes else "No dominant themes"

        max_tokens = 800 if report_type == "comprehensive" else (400 if report_type == "highlights" else 250)

        prompt = f"""You are an expert astrologer writing a {report_type} transit report. Create an insightful analysis based on the current transits:

Transit Time: {transit_datetime}
Total Active Transits: {summary.get('total_transits', 0)}
Major Transits: {summary.get('major_count', 0)}
Significant Transits: {summary.get('significant_count', 0)}
Current Themes: {themes_str}

MAJOR TRANSITS (most impactful):
{major_str if major_str else "None currently"}

SIGNIFICANT TRANSITS:
{significant_str if significant_str else "None currently"}

Write a {report_type} transit report that:
1. Opens with an overview of the current cosmic climate
2. Analyzes each major transit and its implications
3. Discusses how these transits interact and combine
4. Identifies key opportunities and challenges
5. Provides timing advice and practical recommendations
6. Closes with empowering guidance

IMPORTANT: Output only plain text, NO markdown formatting. Be thorough yet accessible. Write as if speaking directly to the person about their current situation."""

        try:
            message = await self.async_client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating transit report: {e}")
            raise

    # ==================== Human Design Interpretation Methods ====================

    @staticmethod
    async def generate_hd_type_interpretation_async(
        hd_type: str,
        strategy: str,
        authority: str,
        api_key: Optional[str] = None
    ) -> str:
        """
        Generate AI interpretation for Human Design Type, Strategy, and Authority.

        Args:
            hd_type: Human Design type (e.g., "Generator", "Projector")
            strategy: Type strategy (e.g., "To Respond", "Wait for Invitation")
            authority: Inner authority (e.g., "Sacral", "Emotional")
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)

        Returns:
            AI-generated interpretation
        """
        import os
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key required")

        client = AsyncAnthropic(api_key=api_key)

        prompt = f"""You are an expert Human Design analyst. Generate an insightful interpretation for this core Human Design configuration:

Type: {hd_type}
Strategy: {strategy}
Authority: {authority}

Provide a comprehensive 4-5 paragraph interpretation that covers:
1. What this Type means for how you interact with the world and your natural role
2. How to apply your Strategy in daily life for correct decisions
3. How to use your Authority for making aligned decisions
4. The relationship between your Type, Strategy, and Authority
5. Practical tips for living in alignment with your design

IMPORTANT: Output only plain text, NO markdown formatting. Be warm, insightful, and empowering. Speak directly to the reader as "you". Focus on practical application."""

        try:
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=800,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating HD type interpretation: {e}")
            raise

    @staticmethod
    async def generate_hd_profile_interpretation_async(
        profile: str,
        personality_line: int,
        design_line: int,
        api_key: Optional[str] = None
    ) -> str:
        """
        Generate AI interpretation for Human Design Profile.

        Args:
            profile: Profile name (e.g., "3/5 Martyr/Heretic")
            personality_line: Conscious line (1-6)
            design_line: Unconscious line (1-6)
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)

        Returns:
            AI-generated interpretation
        """
        import os
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key required")

        client = AsyncAnthropic(api_key=api_key)

        line_names = {
            1: "Investigator", 2: "Hermit", 3: "Martyr",
            4: "Opportunist", 5: "Heretic", 6: "Role Model"
        }

        p_name = line_names.get(personality_line, "")
        d_name = line_names.get(design_line, "")

        prompt = f"""You are an expert Human Design analyst. Generate an insightful interpretation for this Profile:

Profile: {profile}
Personality (Conscious) Line: {personality_line} - {p_name}
Design (Unconscious) Line: {design_line} - {d_name}

Provide a comprehensive 4-5 paragraph interpretation that covers:
1. What the Personality line means for how you consciously see yourself and interact
2. What the Design line means as an underlying unconscious theme others see in you
3. How these two lines interact and create your unique life path
4. The profile's approach to relationships, learning, and personal growth
5. Key themes and challenges specific to this profile combination

IMPORTANT: Output only plain text, NO markdown formatting. Be warm and insightful. Speak directly to the reader as "you". Help them understand the dance between their conscious and unconscious expression."""

        try:
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=700,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating HD profile interpretation: {e}")
            raise

    @staticmethod
    async def generate_hd_channel_interpretation_async(
        channel_name: str,
        gate1: int,
        gate2: int,
        activation_type: str = "both",
        api_key: Optional[str] = None
    ) -> str:
        """
        Generate AI interpretation for a defined Human Design channel.

        Args:
            channel_name: Channel name (e.g., "The Channel of Inspiration")
            gate1: First gate number
            gate2: Second gate number
            activation_type: How channel is activated ("personality", "design", or "both")
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)

        Returns:
            AI-generated interpretation
        """
        import os
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key required")

        client = AsyncAnthropic(api_key=api_key)

        activation_desc = {
            "personality": "consciously (Personality side) - you are aware of this energy",
            "design": "unconsciously (Design side) - others see this in you more than you do",
            "both": "both consciously and unconsciously - fully integrated energy"
        }

        prompt = f"""You are an expert Human Design analyst. Generate an insightful interpretation for this defined channel:

Channel: {channel_name}
Gates: {gate1} and {gate2}
Activation: {activation_desc.get(activation_type, "both sides")}

Provide a comprehensive 3-4 paragraph interpretation that covers:
1. What this channel represents as a consistent life theme and energy
2. How this energy manifests in your daily life, work, and relationships
3. The gift or superpower this channel brings you
4. How to best work with and express this energy

IMPORTANT: Output only plain text, NO markdown formatting. Be warm and empowering. Speak directly to the reader as "you". Focus on the practical expression of this defined energy."""

        try:
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=500,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating HD channel interpretation: {e}")
            raise

    @staticmethod
    async def generate_hd_gate_interpretation_async(
        gate: int,
        gate_name: str,
        planet: str,
        line: int,
        is_personality: bool,
        api_key: Optional[str] = None
    ) -> str:
        """
        Generate AI interpretation for a Human Design gate activation.

        Args:
            gate: Gate number (1-64)
            gate_name: Gate name from I Ching
            planet: Planet activating this gate
            line: Line within gate (1-6)
            is_personality: True if Personality activation, False if Design
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)

        Returns:
            AI-generated interpretation
        """
        import os
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key required")

        client = AsyncAnthropic(api_key=api_key)

        side = "Personality (conscious)" if is_personality else "Design (unconscious)"

        prompt = f"""You are an expert Human Design analyst with deep knowledge of the I Ching. Generate an insightful interpretation for this gate activation:

Gate: {gate} - {gate_name}
Line: {line}
Planet: {planet}
Activation: {side}

Provide a 2-3 paragraph interpretation that covers:
1. The core meaning of this gate and how the line modifies its expression
2. How the planet colors this gate's expression ({planet}'s influence)
3. Whether this is conscious or unconscious, and what that means for you
4. How this gate might manifest in your life

IMPORTANT: Output only plain text, NO markdown formatting. Be specific about this gate/line/planet combination. Speak directly to the reader as "you"."""

        try:
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=400,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating HD gate interpretation: {e}")
            raise

    @staticmethod
    async def generate_hd_full_reading_async(
        chart_data: Dict[str, Any],
        api_key: Optional[str] = None
    ) -> tuple[str, Dict[str, str]]:
        """
        Generate a comprehensive Human Design reading.

        Args:
            chart_data: Complete HD chart data from calculator
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)

        Returns:
            Tuple of (full_reading_text, sections_dict)
        """
        import os
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key required")

        client = AsyncAnthropic(api_key=api_key)

        # Extract key data
        hd_type = chart_data.get('hd_type', '')
        strategy = chart_data.get('strategy', '')
        authority = chart_data.get('authority', '')
        profile = chart_data.get('profile', {})
        profile_name = profile.get('name', '') if isinstance(profile, dict) else str(profile)
        definition = chart_data.get('definition', '')
        defined_centers = chart_data.get('defined_centers', [])
        undefined_centers = chart_data.get('undefined_centers', [])
        channels = chart_data.get('channels', [])
        incarnation_cross = chart_data.get('incarnation_cross', {})
        cross_name = incarnation_cross.get('name', '') if isinstance(incarnation_cross, dict) else ''

        # Format channels
        channels_str = ""
        if channels:
            channel_names = [c.get('name', '') for c in channels[:5]]
            channels_str = ", ".join(channel_names)

        prompt = f"""You are an expert Human Design analyst creating a comprehensive personal reading. Generate a complete reading based on this chart:

TYPE: {hd_type}
STRATEGY: {strategy}
AUTHORITY: {authority}
PROFILE: {profile_name}
DEFINITION: {definition}

DEFINED CENTERS: {', '.join(defined_centers) if defined_centers else 'None (Reflector)'}
UNDEFINED CENTERS: {', '.join(undefined_centers) if undefined_centers else 'All defined'}

DEFINED CHANNELS: {channels_str if channels_str else 'No fully defined channels'}

INCARNATION CROSS: {cross_name}

Write a comprehensive reading (6-8 paragraphs) that:

1. INTRODUCTION: Welcome them to their design and give an overview of what makes their chart unique

2. TYPE & STRATEGY: Explain their type deeply - what it means for their energy, their role in the world, and how to use their strategy for correct decisions

3. AUTHORITY: Detail how their specific authority works for decision-making with practical examples

4. PROFILE: Explain their profile's life theme, how the conscious and unconscious lines interact

5. DEFINITION: Discuss their definition type (single, split, etc.) and what it means for how they process and connect

6. CENTERS: Highlight the most significant defined and undefined centers, what energies they have consistent access to versus where they're open to conditioning

7. INCARNATION CROSS: Touch on their life purpose as indicated by their cross

8. PRACTICAL GUIDANCE: Close with empowering, actionable advice for living their design

IMPORTANT: Output only plain text, NO markdown formatting whatsoever. Be warm, insightful, and deeply personal. Speak directly as "you". This should feel like receiving wisdom from a trusted advisor who sees the reader's unique gifts and path."""

        try:
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1500,
                temperature=0.8,
                messages=[{"role": "user", "content": prompt}]
            )

            full_reading = message.content[0].text.strip()

            # Create sections dict (simplified - could be enhanced with parsing)
            sections = {
                "type": f"{hd_type} - {strategy}",
                "authority": authority,
                "profile": profile_name,
                "definition": definition,
                "centers": f"Defined: {', '.join(defined_centers)}" if defined_centers else "Reflector",
                "cross": cross_name
            }

            return full_reading, sections

        except Exception as e:
            logger.error(f"Error generating HD full reading: {e}")
            raise
