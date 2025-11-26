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

            # Enrich house data with planets that are in each house
            for house in chart_data["houses"]:
                house_number = house.get('number', 0)

                # Find all planets in this house
                planets_in_house = []
                for planet_name, planet_data in chart_data.get("planets", {}).items():
                    if planet_data.get("house") == house_number:
                        planets_in_house.append(planet_name.capitalize())

                # Find aspects involving planets in this house
                relevant_aspects = []
                if "aspects" in chart_data:
                    for aspect in chart_data["aspects"]:
                        planet1 = aspect.get("planet1", "")
                        planet2 = aspect.get("planet2", "")
                        # Include aspect if either planet is in this house
                        for planet_name, planet_data in chart_data.get("planets", {}).items():
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
