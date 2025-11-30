"""
Newspaper Service

Transforms historical news data into newspaper-style content using Google Gemini.
Supports multi-source synthesis (Guardian, NYT, Wikipedia) for year-specific newspapers.
Supports Victorian (formal/ornate) and Modern (contemporary) journalism styles.
"""
import os
import json
import hashlib
import logging
from typing import Dict, Any, Optional, List, TYPE_CHECKING
from dataclasses import dataclass

if TYPE_CHECKING:
    from app.services.news_aggregator_service import AggregatedNews

logger = logging.getLogger(__name__)


class NewspaperGenerationError(Exception):
    """Raised when newspaper generation fails"""
    pass


@dataclass
class NewspaperContent:
    """Structured newspaper content result"""
    headline: str
    date_display: str
    sections: list[Dict[str, Any]]
    style: str
    generation_metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "headline": self.headline,
            "date_display": self.date_display,
            "sections": self.sections,
            "style": self.style,
            "metadata": self.generation_metadata,
        }


class NewspaperService:
    """
    Newspaper generation service using Google Gemini API

    Transforms historical Wikipedia data into newspaper-style articles
    with support for Victorian and Modern journalism styles.

    Usage:
        service = NewspaperService(api_key="...")
        result = await service.generate_newspaper(
            wikipedia_data=events_data,
            style="victorian",
            date_context="July 20, 1969"
        )
    """

    # Style templates for different journalism approaches
    STYLE_PROMPTS = {
        "victorian": {
            "tone": "formal, ornate, dramatic, sensational Victorian journalism",
            "language": "elevated language, formal diction, dramatic flourishes",
            "headlines": "grand proclamations with exclamation points, capitalize key words",
            "structure": "long flowing sentences, rich descriptions, moral overtones",
            "example_headline": "MANKIND TRIUMPHANT! Man Sets Foot Upon the Moon!",
        },
        "modern": {
            "tone": "clear, engaging, contemporary journalism with AP style",
            "language": "accessible, direct, informative but engaging",
            "headlines": "active voice, strong verbs, factual yet compelling",
            "structure": "inverted pyramid, concise paragraphs, punchy sentences",
            "example_headline": "Armstrong Takes First Steps on Moon",
        }
    }

    # Default sections for newspaper organization
    DEFAULT_SECTIONS = [
        "WORLD EVENTS",
        "SCIENCE & DISCOVERY",
        "ARTS & CULTURE",
        "BIRTHS & DEATHS"
    ]

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash-exp",  # Fast and cost-efficient for text
        max_retries: int = 3,
    ):
        """
        Initialize newspaper service

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            model: Gemini model to use (flash recommended for speed/cost)
            max_retries: Maximum retry attempts for rate limits
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key required. Set GOOGLE_API_KEY environment variable or pass api_key."
            )

        self.model = model
        self.max_retries = max_retries
        self._client = None

    def _get_client(self):
        """Lazy initialization of Gemini client"""
        if self._client is None:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._client = genai.GenerativeModel(self.model)
            except ImportError:
                raise ImportError(
                    "google-generativeai package required. Install with: pip install google-generativeai"
                )
        return self._client

    def get_prompt_hash(self, wikipedia_data: dict, style: str) -> str:
        """
        Generate hash of prompt inputs for cache invalidation

        Args:
            wikipedia_data: Wikipedia events data
            style: Journalism style (victorian/modern)

        Returns:
            SHA256 hash of the prompt inputs
        """
        # Create deterministic string from inputs
        hash_input = json.dumps({
            "data": wikipedia_data,
            "style": style,
            "model": self.model,
        }, sort_keys=True)

        return hashlib.sha256(hash_input.encode()).hexdigest()

    async def generate_newspaper(
        self,
        wikipedia_data: Dict[str, Any],
        style: str = "modern",
        date_context: Optional[str] = None,
    ) -> NewspaperContent:
        """
        Generate newspaper content from Wikipedia historical data

        Args:
            wikipedia_data: Dict with Wikipedia events organized by category
                Expected format: {
                    "events": [...],
                    "births": [...],
                    "deaths": [...],
                    "date": "July 20"  # or similar
                }
            style: Journalism style - "victorian" or "modern"
            date_context: Human-readable date (e.g., "July 20, 1969")

        Returns:
            NewspaperContent with structured newspaper data

        Raises:
            NewspaperGenerationError: If generation fails
        """
        if style not in self.STYLE_PROMPTS:
            raise ValueError(f"Invalid style '{style}'. Must be 'victorian' or 'modern'")

        try:
            # Get style configuration
            style_config = self.STYLE_PROMPTS[style]

            # Build the prompt
            prompt = self._build_prompt(wikipedia_data, style_config, date_context)

            # Generate with retries
            response_text = await self._generate_with_retry(prompt)

            # Parse JSON response
            newspaper_data = self._parse_response(response_text)

            # Validate structure
            self._validate_newspaper_data(newspaper_data)

            # Create result object
            return NewspaperContent(
                headline=newspaper_data["headline"],
                date_display=newspaper_data["date_display"],
                sections=newspaper_data["sections"],
                style=style,
                generation_metadata={
                    "model": self.model,
                    "prompt_hash": self.get_prompt_hash(wikipedia_data, style),
                    "source_events_count": len(wikipedia_data.get("events", [])),
                }
            )

        except Exception as e:
            logger.error(f"Error generating newspaper: {e}")
            raise NewspaperGenerationError(f"Failed to generate newspaper: {str(e)}")

    def _build_prompt(
        self,
        wikipedia_data: Dict[str, Any],
        style_config: Dict[str, str],
        date_context: Optional[str]
    ) -> str:
        """
        Build the generation prompt for Gemini

        Args:
            wikipedia_data: Wikipedia events data
            style_config: Style configuration dict
            date_context: Optional human-readable date

        Returns:
            Formatted prompt string
        """
        # Extract date
        date_str = date_context or wikipedia_data.get("date", "This Day in History")

        # Format Wikipedia events for the prompt
        events_summary = self._format_wikipedia_events(wikipedia_data)

        prompt = f"""You are a master historical journalist transforming Wikipedia historical events into newspaper articles.

STYLE INSTRUCTIONS:
- Tone: {style_config['tone']}
- Language: {style_config['language']}
- Headlines: {style_config['headlines']}
- Structure: {style_config['structure']}
- Example Headline: {style_config['example_headline']}

TASK:
Transform the following historical events from {date_str} into a complete newspaper front page.

WIKIPEDIA DATA:
{events_summary}

REQUIREMENTS:
1. Create ONE main headline that captures the most significant event of the day
2. Organize events into 4 sections: WORLD EVENTS, SCIENCE & DISCOVERY, ARTS & CULTURE, BIRTHS & DEATHS
3. Select 2-3 most interesting/significant events per section
4. Write each article as 2-3 paragraphs (100-200 words)
5. Each article should include:
   - Engaging headline in the specified style
   - Article content that tells the story with context
   - Year of the event
   - Brief note on historical significance

OUTPUT FORMAT (STRICT JSON):
{{
  "headline": "Main headline for the entire day",
  "date_display": "{date_str}",
  "sections": [
    {{
      "name": "WORLD EVENTS",
      "articles": [
        {{
          "headline": "Article headline",
          "content": "2-3 paragraph article text...",
          "year": 1969,
          "significance": "Why this event mattered historically"
        }}
      ]
    }},
    {{
      "name": "SCIENCE & DISCOVERY",
      "articles": [...]
    }},
    {{
      "name": "ARTS & CULTURE",
      "articles": [...]
    }},
    {{
      "name": "BIRTHS & DEATHS",
      "articles": [...]
    }}
  ]
}}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting or code blocks
- Each article must be engaging and historically accurate
- Adapt writing style to match {style_config['tone']}
- If a section has no relevant events, include it with an empty articles array
- Articles should be substantive (100-200 words) but concise
"""

        return prompt

    def _format_wikipedia_events(self, wikipedia_data: Dict[str, Any]) -> str:
        """
        Format Wikipedia data for inclusion in prompt

        Args:
            wikipedia_data: Raw Wikipedia data

        Returns:
            Formatted string representation
        """
        sections = []

        # Events
        if events := wikipedia_data.get("events", []):
            events_str = "\n".join(f"- {event}" for event in events[:20])
            sections.append(f"EVENTS:\n{events_str}")

        # Births
        if births := wikipedia_data.get("births", []):
            births_str = "\n".join(f"- {birth}" for birth in births[:10])
            sections.append(f"BIRTHS:\n{births_str}")

        # Deaths
        if deaths := wikipedia_data.get("deaths", []):
            deaths_str = "\n".join(f"- {death}" for death in deaths[:10])
            sections.append(f"DEATHS:\n{deaths_str}")

        return "\n\n".join(sections)

    async def _generate_with_retry(self, prompt: str) -> str:
        """
        Call Gemini API with retry logic for rate limits

        Args:
            prompt: Generation prompt

        Returns:
            Response text from Gemini

        Raises:
            NewspaperGenerationError: If all retries fail
        """
        import asyncio
        import time

        client = self._get_client()
        last_error = None

        for attempt in range(self.max_retries):
            try:
                # Configure for JSON output
                generation_config = {
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": 8192,
                    "response_mime_type": "application/json",
                }

                # Generate (synchronous call, but in async context)
                response = await asyncio.to_thread(
                    client.generate_content,
                    prompt,
                    generation_config=generation_config
                )

                return response.text

            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Check if it's a rate limit error
                if "429" in str(e) or "resource_exhausted" in error_str or "quota" in error_str:
                    wait_time = (2 ** attempt) * 10  # 10s, 20s, 40s
                    logger.warning(
                        f"Rate limited, waiting {wait_time}s before retry "
                        f"{attempt + 1}/{self.max_retries}"
                    )
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    # Non-rate-limit error, don't retry
                    logger.error(f"Gemini API error: {e}")
                    raise NewspaperGenerationError(f"API error: {str(e)}")

        # All retries exhausted
        logger.error(f"Gemini API error after {self.max_retries} retries: {last_error}")
        raise NewspaperGenerationError(
            f"Failed after {self.max_retries} retries: {str(last_error)}"
        )

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse JSON response from Gemini

        Args:
            response_text: Raw response text

        Returns:
            Parsed JSON dictionary

        Raises:
            NewspaperGenerationError: If parsing fails
        """
        try:
            # Gemini should return JSON directly due to response_mime_type
            data = json.loads(response_text)
            return data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Response text: {response_text[:500]}...")

            # Try to extract JSON from markdown code block (fallback)
            if "```json" in response_text:
                try:
                    start = response_text.find("```json") + 7
                    end = response_text.find("```", start)
                    json_str = response_text[start:end].strip()
                    data = json.loads(json_str)
                    return data
                except Exception as e2:
                    logger.error(f"Fallback JSON extraction failed: {e2}")

            raise NewspaperGenerationError(f"Invalid JSON response: {str(e)}")

    def _validate_newspaper_data(self, data: Dict[str, Any]) -> None:
        """
        Validate newspaper data structure

        Args:
            data: Parsed newspaper data

        Raises:
            NewspaperGenerationError: If validation fails
        """
        required_fields = ["headline", "date_display", "sections"]

        for field in required_fields:
            if field not in data:
                raise NewspaperGenerationError(f"Missing required field: {field}")

        if not isinstance(data["sections"], list):
            raise NewspaperGenerationError("sections must be a list")

        # Validate each section
        for i, section in enumerate(data["sections"]):
            if "name" not in section:
                raise NewspaperGenerationError(f"Section {i} missing 'name' field")

            if "articles" not in section:
                raise NewspaperGenerationError(f"Section {i} missing 'articles' field")

            if not isinstance(section["articles"], list):
                raise NewspaperGenerationError(f"Section {i} 'articles' must be a list")

            # Validate articles
            for j, article in enumerate(section["articles"]):
                article_fields = ["headline", "content", "year", "significance"]
                for field in article_fields:
                    if field not in article:
                        raise NewspaperGenerationError(
                            f"Section {i}, Article {j} missing '{field}' field"
                        )

    async def generate_newspaper_from_aggregated(
        self,
        aggregated_news: "AggregatedNews",
        style: str = "modern",
    ) -> NewspaperContent:
        """
        Generate newspaper content from aggregated multi-source news data

        This method synthesizes news from multiple sources (Guardian, NYT, Wikipedia)
        into a cohesive newspaper format while preserving source attribution.

        Args:
            aggregated_news: AggregatedNews object from NewsAggregatorService
            style: Journalism style - "victorian" or "modern"

        Returns:
            NewspaperContent with structured newspaper data including source attribution

        Raises:
            NewspaperGenerationError: If generation fails
        """
        if style not in self.STYLE_PROMPTS:
            raise ValueError(f"Invalid style '{style}'. Must be 'victorian' or 'modern'")

        try:
            # Get style configuration
            style_config = self.STYLE_PROMPTS[style]

            # Build the multi-source prompt
            prompt = self._build_multi_source_prompt(aggregated_news, style_config)

            # Generate with retries
            response_text = await self._generate_with_retry(prompt)

            # Parse JSON response
            newspaper_data = self._parse_response(response_text)

            # Validate structure
            self._validate_newspaper_data(newspaper_data)

            # Create result object with multi-source metadata
            return NewspaperContent(
                headline=newspaper_data["headline"],
                date_display=newspaper_data["date_display"],
                sections=newspaper_data["sections"],
                style=style,
                generation_metadata={
                    "model": self.model,
                    "prompt_hash": self._get_aggregated_prompt_hash(aggregated_news, style),
                    "year": aggregated_news.year,
                    "is_year_specific": aggregated_news.is_year_specific,
                    "sources_used": aggregated_news.sources_used,
                    "sources_failed": aggregated_news.sources_failed,
                    "guardian_article_count": len(aggregated_news.guardian_articles),
                    "nyt_article_count": len(aggregated_news.nyt_articles),
                    "has_wikipedia_context": bool(aggregated_news.wikipedia_context),
                }
            )

        except Exception as e:
            logger.error(f"Error generating newspaper from aggregated sources: {e}")
            raise NewspaperGenerationError(f"Failed to generate newspaper: {str(e)}")

    def _get_aggregated_prompt_hash(
        self,
        aggregated_news: "AggregatedNews",
        style: str
    ) -> str:
        """Generate hash of multi-source prompt inputs for cache invalidation"""
        hash_input = json.dumps({
            "date": aggregated_news.date,
            "year": aggregated_news.year,
            "guardian_count": len(aggregated_news.guardian_articles),
            "nyt_count": len(aggregated_news.nyt_articles),
            "has_wikipedia": bool(aggregated_news.wikipedia_context),
            "style": style,
            "model": self.model,
        }, sort_keys=True)
        return hashlib.sha256(hash_input.encode()).hexdigest()

    def _build_multi_source_prompt(
        self,
        aggregated_news: "AggregatedNews",
        style_config: Dict[str, str]
    ) -> str:
        """
        Build the generation prompt for multi-source news synthesis

        Args:
            aggregated_news: Aggregated news from multiple sources
            style_config: Style configuration dict

        Returns:
            Formatted prompt string for Gemini
        """
        # Format date for display
        date_str = f"{aggregated_news.month}/{aggregated_news.day}/{aggregated_news.year}"

        # Format articles from each source
        sources_content = self._format_multi_source_content(aggregated_news)

        # Build era context based on year
        era_context = self._get_era_context(aggregated_news.year)

        prompt = f"""You are a master historical journalist creating a newspaper front page for a SPECIFIC DATE in history.

DATE: {date_str} (This is the EXACT date - all content must be from this specific day and year)
ERA CONTEXT: {era_context}

STYLE INSTRUCTIONS:
- Tone: {style_config['tone']}
- Language: {style_config['language']}
- Headlines: {style_config['headlines']}
- Structure: {style_config['structure']}
- Example Headline: {style_config['example_headline']}

AVAILABLE SOURCE MATERIAL:
{sources_content}

CRITICAL REQUIREMENTS:
1. Create a newspaper that reads as if published ON {date_str}
2. The main headline should capture THE most significant news story of that day
3. All articles must be written from the perspective of that date (no hindsight)
4. Organize into 4 sections: WORLD EVENTS, SCIENCE & DISCOVERY, ARTS & CULTURE, NOTABLE FIGURES
5. Select 2-3 most significant stories per section from the source material
6. Write each article as 2-3 engaging paragraphs (100-200 words)
7. Preserve source attribution - note which source each article came from
8. If using Wikipedia context, focus on events from the specific YEAR {aggregated_news.year}

ARTICLE FORMAT:
Each article must include:
- Engaging headline in the specified style
- Article content written as if reporting live news
- Year of the event (should all be {aggregated_news.year} for year-specific news)
- Source attribution (guardian, nyt, or wikipedia)
- Brief note on why this story matters

OUTPUT FORMAT (STRICT JSON):
{{
  "headline": "Main headline capturing the biggest story of {date_str}",
  "date_display": "{date_str}",
  "sections": [
    {{
      "name": "WORLD EVENTS",
      "articles": [
        {{
          "headline": "Article headline",
          "content": "2-3 paragraph article text written as live reporting...",
          "year": {aggregated_news.year},
          "source": "guardian|nyt|wikipedia",
          "significance": "Why this story matters"
        }}
      ]
    }},
    {{
      "name": "SCIENCE & DISCOVERY",
      "articles": [...]
    }},
    {{
      "name": "ARTS & CULTURE",
      "articles": [...]
    }},
    {{
      "name": "NOTABLE FIGURES",
      "articles": [...]
    }}
  ]
}}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting or code blocks
- Write as a journalist ON that date, not looking back at history
- If a section has no relevant content, include it with an empty articles array
- Prioritize real news articles over Wikipedia context when available
- Make the newspaper feel authentic to {aggregated_news.year}
"""

        return prompt

    def _format_multi_source_content(
        self,
        aggregated_news: "AggregatedNews"
    ) -> str:
        """
        Format articles from all sources for inclusion in prompt

        Args:
            aggregated_news: Aggregated news data

        Returns:
            Formatted string with all source content
        """
        sections = []

        # Guardian articles
        if aggregated_news.guardian_articles:
            guardian_str = "THE GUARDIAN ARTICLES:\n"
            for i, article in enumerate(aggregated_news.guardian_articles[:15], 1):
                headline = article.get("headline", "Untitled")
                summary = article.get("summary", "")[:300]
                section = article.get("section", "General")
                guardian_str += f"{i}. [{section}] {headline}\n   {summary}\n\n"
            sections.append(guardian_str)

        # NYT articles
        if aggregated_news.nyt_articles:
            nyt_str = "NEW YORK TIMES ARTICLES:\n"
            for i, article in enumerate(aggregated_news.nyt_articles[:15], 1):
                headline = article.get("headline", "Untitled")
                summary = article.get("summary", "")[:300]
                section = article.get("section", "General")
                nyt_str += f"{i}. [{section}] {headline}\n   {summary}\n\n"
            sections.append(nyt_str)

        # Wikipedia context
        if aggregated_news.wikipedia_context:
            wiki_data = aggregated_news.wikipedia_context
            wiki_str = "WIKIPEDIA HISTORICAL CONTEXT:\n"

            # Events from the specific year
            if events := wiki_data.get("events", []):
                # Filter to events from this year if possible
                year_events = [e for e in events if str(aggregated_news.year) in str(e)]
                if year_events:
                    wiki_str += f"Events from {aggregated_news.year}:\n"
                    for event in year_events[:10]:
                        wiki_str += f"- {event}\n"
                else:
                    wiki_str += "Other notable events on this date:\n"
                    for event in events[:5]:
                        wiki_str += f"- {event}\n"
                wiki_str += "\n"

            # Births from specific year
            if births := wiki_data.get("births", []):
                year_births = [b for b in births if str(aggregated_news.year) in str(b)]
                if year_births:
                    wiki_str += f"Notable births in {aggregated_news.year}:\n"
                    for birth in year_births[:5]:
                        wiki_str += f"- {birth}\n"
                    wiki_str += "\n"

            # Deaths from specific year
            if deaths := wiki_data.get("deaths", []):
                year_deaths = [d for d in deaths if str(aggregated_news.year) in str(d)]
                if year_deaths:
                    wiki_str += f"Notable deaths in {aggregated_news.year}:\n"
                    for death in year_deaths[:5]:
                        wiki_str += f"- {death}\n"
                    wiki_str += "\n"

            sections.append(wiki_str)

        if not sections:
            return "No source material available. Generate contextually appropriate content for the era."

        return "\n---\n".join(sections)

    def _get_era_context(self, year: int) -> str:
        """
        Get era-appropriate context for newspaper generation

        Args:
            year: The year of the newspaper

        Returns:
            String describing the era context
        """
        if year < 1800:
            return "Early modern period - formal, elaborate prose style"
        elif year < 1850:
            return "Early 19th century - formal Victorian beginnings, moral overtones"
        elif year < 1900:
            return "Victorian era - ornate language, sensationalism, moral commentary"
        elif year < 1920:
            return "Progressive Era - muckraking journalism, reform movements"
        elif year < 1945:
            return "Interwar period - radio age, Depression, war coverage"
        elif year < 1970:
            return "Post-war era - Cold War, civil rights, space race"
        elif year < 1990:
            return "Late 20th century - Watergate influence, investigative journalism"
        elif year < 2010:
            return "Digital transition era - 24-hour news cycle emerging"
        else:
            return "Contemporary era - fast-paced, digital-native journalism"

    def generate_fallback_newspaper(
        self,
        year: int,
        month: int,
        day: int,
        style: str = "modern"
    ) -> NewspaperContent:
        """
        Generate a fallback newspaper when no sources are available

        This creates a placeholder newspaper with era-appropriate content
        when all news sources fail or return no results.

        Args:
            year: Year
            month: Month (1-12)
            day: Day of month (1-31)
            style: Journalism style

        Returns:
            NewspaperContent with placeholder content
        """
        date_str = f"{month}/{day}/{year}"
        era_context = self._get_era_context(year)

        return NewspaperContent(
            headline=f"The Daily Chronicle - {date_str}",
            date_display=date_str,
            sections=[
                {
                    "name": "WORLD EVENTS",
                    "articles": [{
                        "headline": "News Archives Unavailable",
                        "content": f"Historical news archives for {date_str} are currently unavailable. "
                                   f"This date falls within the {era_context.split(' - ')[0]}. "
                                   "Configure news API keys in Settings to access historical archives, "
                                   "or check back later for Wikipedia historical context.",
                        "year": year,
                        "source": "system",
                        "significance": "Configure news sources for historical content"
                    }]
                },
                {"name": "SCIENCE & DISCOVERY", "articles": []},
                {"name": "ARTS & CULTURE", "articles": []},
                {"name": "NOTABLE FIGURES", "articles": []}
            ],
            style=style,
            generation_metadata={
                "model": "fallback",
                "prompt_hash": "",
                "year": year,
                "is_year_specific": True,
                "sources_used": [],
                "sources_failed": {"all": "No sources available or configured"},
                "is_fallback": True
            }
        )


# Singleton instance factory
_service_instance: Optional[NewspaperService] = None


def get_newspaper_service(
    api_key: Optional[str] = None,
    force_new: bool = False,
) -> NewspaperService:
    """
    Get or create NewspaperService instance

    Args:
        api_key: Optional API key override
        force_new: Force creation of new instance

    Returns:
        NewspaperService instance
    """
    global _service_instance

    if force_new or _service_instance is None or api_key:
        _service_instance = NewspaperService(api_key=api_key)

    return _service_instance
