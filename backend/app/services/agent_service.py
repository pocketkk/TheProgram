"""
AI Agent Service for Consciousness Exploration Guide

Provides agentic conversation capabilities with tool use for UI control,
chart interpretation, and multi-paradigm synthesis.
"""
import os
import asyncio
import json
from typing import Dict, List, Optional, Any, AsyncGenerator
from anthropic import AsyncAnthropic
import logging

logger = logging.getLogger(__name__)


# Tool definitions for Claude
NAVIGATION_TOOLS = [
    {
        "name": "navigate_to_page",
        "description": "Navigate to a specific page in the application",
        "input_schema": {
            "type": "object",
            "properties": {
                "page": {
                    "type": "string",
                    "enum": ["dashboard", "birthchart", "cosmos", "journal", "timeline", "canvas", "settings", "help"],
                    "description": "The page to navigate to"
                }
            },
            "required": ["page"]
        }
    }
]

CHART_MANAGEMENT_TOOLS = [
    {
        "name": "load_chart",
        "description": "Load a specific chart by ID into the active view",
        "input_schema": {
            "type": "object",
            "properties": {
                "chart_id": {"type": "string", "description": "UUID of the chart to load"}
            },
            "required": ["chart_id"]
        }
    },
    {
        "name": "set_zodiac_system",
        "description": "Change the zodiac calculation system",
        "input_schema": {
            "type": "object",
            "properties": {
                "system": {
                    "type": "string",
                    "enum": ["western", "vedic", "human-design"],
                    "description": "The zodiac system to use"
                }
            },
            "required": ["system"]
        }
    },
    {
        "name": "set_house_system",
        "description": "Change the house calculation system",
        "input_schema": {
            "type": "object",
            "properties": {
                "system": {
                    "type": "string",
                    "enum": ["placidus", "koch", "whole_sign", "equal", "campanus", "regiomontanus", "porphyry", "morinus"],
                    "description": "The house system to use"
                }
            },
            "required": ["system"]
        }
    },
    {
        "name": "set_ayanamsa",
        "description": "Set the ayanamsa for Vedic/sidereal calculations",
        "input_schema": {
            "type": "object",
            "properties": {
                "ayanamsa": {
                    "type": "string",
                    "enum": ["lahiri", "raman", "krishnamurti", "yukteshwar", "jn_bhasin", "fagan_bradley"],
                    "description": "The ayanamsa system to use"
                }
            },
            "required": ["ayanamsa"]
        }
    }
]

INTERACTION_TOOLS = [
    {
        "name": "select_planet",
        "description": "Select and highlight a planet in the chart, showing its aspects",
        "input_schema": {
            "type": "object",
            "properties": {
                "planet": {
                    "type": "string",
                    "enum": ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "North Node", "South Node", "Lilith"],
                    "description": "The planet to select"
                }
            },
            "required": ["planet"]
        }
    },
    {
        "name": "select_house",
        "description": "Select and highlight a specific house in the chart",
        "input_schema": {
            "type": "object",
            "properties": {
                "house_number": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 12,
                    "description": "The house number (1-12)"
                }
            },
            "required": ["house_number"]
        }
    },
    {
        "name": "select_aspect",
        "description": "Highlight a specific aspect between two planets",
        "input_schema": {
            "type": "object",
            "properties": {
                "planet1": {"type": "string", "description": "First planet in the aspect"},
                "planet2": {"type": "string", "description": "Second planet in the aspect"}
            },
            "required": ["planet1", "planet2"]
        }
    },
    {
        "name": "highlight_pattern",
        "description": "Highlight an aspect pattern (Grand Trine, T-Square, Yod, etc.)",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern_type": {
                    "type": "string",
                    "enum": ["GrandTrine", "GrandCross", "TSquare", "Yod", "Kite", "MysticRectangle", "Stellium"],
                    "description": "The type of pattern to highlight"
                },
                "pattern_index": {
                    "type": "integer",
                    "description": "Index of the pattern if multiple exist (0-based)"
                }
            },
            "required": ["pattern_type"]
        }
    },
    {
        "name": "clear_selection",
        "description": "Clear all selections and highlights from the chart",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
]

VISIBILITY_TOOLS = [
    {
        "name": "toggle_layer",
        "description": "Show or hide a chart layer",
        "input_schema": {
            "type": "object",
            "properties": {
                "layer": {
                    "type": "string",
                    "enum": ["zodiac", "houses", "planets", "aspects", "houseNumbers", "degreeMarkers", "planetLabels"],
                    "description": "The layer to toggle"
                },
                "visible": {
                    "type": "boolean",
                    "description": "Whether the layer should be visible"
                }
            },
            "required": ["layer", "visible"]
        }
    },
    {
        "name": "set_aspect_filter",
        "description": "Filter which types of aspects are shown",
        "input_schema": {
            "type": "object",
            "properties": {
                "show_major": {"type": "boolean", "description": "Show major aspects (conjunction, trine, square, opposition, sextile)"},
                "show_minor": {"type": "boolean", "description": "Show minor aspects (quincunx, semisextile, etc.)"},
                "max_orb": {"type": "number", "minimum": 0, "maximum": 15, "description": "Maximum orb in degrees"}
            }
        }
    },
    {
        "name": "set_chart_orientation",
        "description": "Change how the chart wheel is oriented",
        "input_schema": {
            "type": "object",
            "properties": {
                "orientation": {
                    "type": "string",
                    "enum": ["natal", "natural"],
                    "description": "natal = Ascendant at left, natural = Aries at left"
                }
            },
            "required": ["orientation"]
        }
    }
]

INFORMATION_TOOLS = [
    {
        "name": "get_chart_data",
        "description": "Get detailed data about the current active chart including planets, houses, and aspects",
        "input_schema": {
            "type": "object",
            "properties": {
                "include_aspects": {"type": "boolean", "default": True},
                "include_patterns": {"type": "boolean", "default": True}
            }
        }
    },
    {
        "name": "get_planet_info",
        "description": "Get detailed information about a specific planet in the current chart",
        "input_schema": {
            "type": "object",
            "properties": {
                "planet": {"type": "string", "description": "The planet name"}
            },
            "required": ["planet"]
        }
    },
    {
        "name": "get_house_info",
        "description": "Get information about a house including planets in it and its ruling planet",
        "input_schema": {
            "type": "object",
            "properties": {
                "house_number": {"type": "integer", "minimum": 1, "maximum": 12}
            },
            "required": ["house_number"]
        }
    },
    {
        "name": "list_available_charts",
        "description": "Get a list of all saved charts the user has",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    }
]

# Phase 2: Journal Tools
JOURNAL_TOOLS = [
    {
        "name": "create_journal_entry",
        "description": "Create a new journal entry for consciousness exploration. Use this when the user wants to record insights, reflections, or experiences.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title for the journal entry (optional)"},
                "content": {"type": "string", "description": "The journal content/reflection"},
                "mood": {
                    "type": "string",
                    "enum": ["reflective", "anxious", "inspired", "peaceful", "curious", "melancholic", "joyful", "contemplative", "energized", "confused", "grateful", "frustrated", "hopeful", "neutral", "overwhelmed"],
                    "description": "Current mood/emotional state"
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tags to categorize the entry (e.g., 'dream', 'transit', 'insight')"
                }
            },
            "required": ["content"]
        }
    },
    {
        "name": "search_journal",
        "description": "Search through journal entries. Use to help the user recall past insights or find patterns.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query for content"},
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by tags"
                },
                "mood": {"type": "string", "description": "Filter by mood"},
                "limit": {"type": "integer", "default": 5, "description": "Max entries to return"}
            }
        }
    },
    {
        "name": "get_recent_journal_entries",
        "description": "Get the user's most recent journal entries",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 5, "description": "Number of entries to retrieve"}
            }
        }
    },
    {
        "name": "get_journal_moods",
        "description": "Get a summary of the user's mood patterns from their journal entries",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "default": 30, "description": "Number of days to analyze"}
            }
        }
    }
]

# Phase 2: Timeline Tools
TIMELINE_TOOLS = [
    {
        "name": "create_timeline_event",
        "description": "Create a life event on the user's personal timeline. Use this to help them track significant moments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Event title"},
                "description": {"type": "string", "description": "Event description"},
                "event_date": {"type": "string", "description": "Date of the event (YYYY-MM-DD format)"},
                "event_time": {"type": "string", "description": "Time of the event (HH:MM format, optional)"},
                "category": {
                    "type": "string",
                    "enum": ["career", "relationship", "health", "spiritual", "travel", "financial", "creative", "education", "family", "personal"],
                    "description": "Category of the event"
                },
                "importance": {
                    "type": "string",
                    "enum": ["minor", "moderate", "major", "transformative"],
                    "description": "How significant this event is"
                }
            },
            "required": ["title", "event_date"]
        }
    },
    {
        "name": "get_timeline_events",
        "description": "Get life events from the user's timeline within a date range",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                "end_date": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                "category": {"type": "string", "description": "Filter by category"},
                "importance": {"type": "string", "description": "Filter by importance level"}
            }
        }
    },
    {
        "name": "get_transit_context",
        "description": "Get transit context and astrological analysis for a specific date",
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "description": "Date to analyze (YYYY-MM-DD)"},
                "include_analysis": {"type": "boolean", "default": True, "description": "Include AI analysis"}
            },
            "required": ["date"]
        }
    },
    {
        "name": "correlate_events_transits",
        "description": "Find correlations between life events and transit patterns",
        "input_schema": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string", "description": "Specific event to analyze"},
                "date_range_days": {"type": "integer", "default": 30, "description": "Days around the event to search"}
            }
        }
    }
]

# Phase 2: Canvas Tools
CANVAS_TOOLS = [
    {
        "name": "create_canvas",
        "description": "Create a new exploration canvas for visual chart analysis",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name for the canvas"},
                "description": {"type": "string", "description": "Description of what this canvas explores"},
                "background_type": {
                    "type": "string",
                    "enum": ["grid", "dots", "cosmic", "blank"],
                    "default": "cosmic"
                }
            },
            "required": ["name"]
        }
    },
    {
        "name": "add_to_canvas",
        "description": "Add chart elements or notes to an existing canvas",
        "input_schema": {
            "type": "object",
            "properties": {
                "canvas_id": {"type": "string", "description": "ID of the canvas to add to"},
                "item_type": {
                    "type": "string",
                    "enum": ["planet", "aspect", "pattern", "note", "insight", "house"],
                    "description": "Type of item to add"
                },
                "item_data": {
                    "type": "object",
                    "description": "Data for the item (varies by type)"
                },
                "position_x": {"type": "number", "description": "X position on canvas"},
                "position_y": {"type": "number", "description": "Y position on canvas"}
            },
            "required": ["canvas_id", "item_type"]
        }
    },
    {
        "name": "add_chart_to_canvas",
        "description": "Add all elements from a chart to a canvas for exploration",
        "input_schema": {
            "type": "object",
            "properties": {
                "canvas_id": {"type": "string", "description": "ID of the canvas"},
                "chart_id": {"type": "string", "description": "ID of the chart to add"},
                "elements": {
                    "type": "array",
                    "items": {"type": "string", "enum": ["planets", "aspects", "houses", "patterns"]},
                    "description": "Which chart elements to add"
                }
            },
            "required": ["canvas_id", "chart_id"]
        }
    },
    {
        "name": "list_canvases",
        "description": "Get a list of the user's exploration canvases",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "arrange_canvas",
        "description": "Automatically arrange items on a canvas in a meaningful layout",
        "input_schema": {
            "type": "object",
            "properties": {
                "canvas_id": {"type": "string", "description": "ID of the canvas"},
                "arrangement": {
                    "type": "string",
                    "enum": ["circular", "grid", "cluster", "timeline"],
                    "description": "Arrangement style"
                }
            },
            "required": ["canvas_id", "arrangement"]
        }
    }
]

# Combine all tools
ALL_TOOLS = (
    NAVIGATION_TOOLS +
    CHART_MANAGEMENT_TOOLS +
    INTERACTION_TOOLS +
    VISIBILITY_TOOLS +
    INFORMATION_TOOLS +
    JOURNAL_TOOLS +
    TIMELINE_TOOLS +
    CANVAS_TOOLS
)

# Tools that execute on frontend (return instruction to client)
FRONTEND_TOOLS = {
    "navigate_to_page", "load_chart", "set_zodiac_system", "set_house_system",
    "set_ayanamsa", "select_planet", "select_house", "select_aspect",
    "highlight_pattern", "clear_selection", "toggle_layer", "set_aspect_filter",
    "set_chart_orientation",
    # Phase 2 frontend tools (trigger UI updates)
    "arrange_canvas"
}

# Tools that execute on backend (return data)
BACKEND_TOOLS = {
    "get_chart_data", "get_planet_info", "get_house_info", "list_available_charts",
    # Phase 2 backend tools (Journal)
    "create_journal_entry", "search_journal", "get_recent_journal_entries", "get_journal_moods",
    # Phase 2 backend tools (Timeline)
    "create_timeline_event", "get_timeline_events", "get_transit_context", "correlate_events_transits",
    # Phase 2 backend tools (Canvas)
    "create_canvas", "add_to_canvas", "add_chart_to_canvas", "list_canvases"
}


def build_system_prompt(
    user_preferences: Optional[Dict[str, Any]] = None,
    chart_context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Build the system prompt for the consciousness exploration guide.

    Args:
        user_preferences: User's paradigm preferences and settings
        chart_context: Current chart data for context

    Returns:
        Complete system prompt string
    """
    preferences = user_preferences or {}

    enabled_paradigms = preferences.get('enabled_paradigms', ['astrology', 'tarot', 'jungian'])
    synthesis_depth = preferences.get('synthesis_depth', 'balanced')

    synthesis_instructions = {
        'single': "Focus on one paradigm at a time unless the user explicitly asks for synthesis.",
        'light': "Occasionally mention connections to other paradigms when highly relevant.",
        'balanced': "Weave in 2-3 paradigm perspectives naturally when interpreting.",
        'deep': "Always synthesize multiple paradigms into unified insights, showing how they illuminate each other."
    }

    base_prompt = f"""You are a guide to consciousness exploration, fluent in multiple wisdom traditions. You help users understand themselves through various symbolic and psychological systems while respecting each tradition's integrity.

YOUR PARADIGM EXPERTISE:
- Astrology: Western (tropical), Vedic (sidereal with nakshatras), Human Design gates and channels
- Tarot: Major and Minor Arcana, archetypal meanings, spread interpretation
- I-Ching: 64 hexagrams, changing lines, situational wisdom
- Jungian Psychology: Archetypes, shadow work, individuation, dream analysis
- Numerology: Life path, expression numbers, personal year cycles
- Kabbalah: Tree of Life, Sephiroth, paths and their correspondences
- Dream Interpretation: Symbolic analysis, archetypal patterns, personal meaning

USER'S ENABLED PARADIGMS: {', '.join(enabled_paradigms)}
SYNTHESIS STYLE: {synthesis_instructions.get(synthesis_depth, synthesis_instructions['balanced'])}

YOUR CAPABILITIES:
- Birth Chart Analysis: Navigate charts, select planets/aspects, explain patterns
- Journal: Help users record reflections and insights, search past entries, track moods
- Timeline: Create life events, correlate experiences with transits
- Canvas: Create visual explorations by arranging chart elements on a freeform canvas

YOUR PERSONALITY:
- Warm, wise, and curious - like a trusted mentor
- Clear and accessible while maintaining precision
- Proactive - point out interesting patterns you notice
- Respectful - honor the depth of each tradition without superficial conflation

TOOL USE GUIDELINES:
- Use navigation tools to show the user what you're explaining
- Select/highlight elements as you discuss them so they can see what you mean
- When explaining a planet, select it. When discussing a pattern, highlight it.
- Use information tools to get accurate data before making specific claims
- Offer to create journal entries when the user shares insights
- Suggest adding significant moments to their timeline
- Create canvases to help visualize complex chart dynamics
- Be proactive but not overwhelming - actions should enhance understanding

OUTPUT FORMAT:
- Write in plain text without markdown formatting
- Be conversational and personal
- Keep responses focused and meaningful
"""

    # Add chart context if available
    if chart_context:
        chart_summary = _summarize_chart_context(chart_context)
        base_prompt += f"\n\nCURRENT CHART CONTEXT:\n{chart_summary}"

    return base_prompt


def _summarize_chart_context(chart_context: Dict[str, Any]) -> str:
    """Create a concise summary of chart context for the system prompt."""
    parts = []

    if 'sun' in chart_context.get('planets', {}):
        sun = chart_context['planets']['sun']
        parts.append(f"Sun: {sun.get('sign_name', 'Unknown')} ({sun.get('degree_in_sign', 0):.1f}°)")

    if 'moon' in chart_context.get('planets', {}):
        moon = chart_context['planets']['moon']
        parts.append(f"Moon: {moon.get('sign_name', 'Unknown')} ({moon.get('degree_in_sign', 0):.1f}°)")

    if 'ascendant' in chart_context.get('houses', {}):
        asc = chart_context['houses']['ascendant']
        parts.append(f"Ascendant: {asc:.1f}°")

    if chart_context.get('patterns'):
        pattern_types = [p.get('type', 'Unknown') for p in chart_context['patterns']]
        if pattern_types:
            parts.append(f"Patterns: {', '.join(pattern_types)}")

    return '\n'.join(parts) if parts else "No chart currently loaded"


class AgentService:
    """
    Agentic AI service for the consciousness exploration guide.

    Handles multi-turn conversations with tool use for UI control
    and multi-paradigm interpretation synthesis.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-20250514"
    ):
        """
        Initialize the agent service.

        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
            model: Model to use for conversations (Sonnet recommended for tool use)
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key required. Set ANTHROPIC_API_KEY environment variable.")

        self.client = AsyncAnthropic(api_key=self.api_key)
        self.model = model
        self.tools = ALL_TOOLS

    async def process_message(
        self,
        message: str,
        conversation_history: List[Dict[str, Any]],
        chart_context: Optional[Dict[str, Any]] = None,
        user_preferences: Optional[Dict[str, Any]] = None,
        db_session: Optional[Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process a user message and stream responses.

        Args:
            message: User's message
            conversation_history: Previous messages in the conversation
            chart_context: Current chart data
            user_preferences: User's paradigm preferences
            db_session: Database session for backend tool execution

        Yields:
            Response chunks with types: 'text_delta', 'tool_call', 'tool_result', 'complete'
        """
        system_prompt = build_system_prompt(user_preferences, chart_context)

        # Build messages including history
        messages = list(conversation_history)
        messages.append({"role": "user", "content": message})

        full_response = ""
        tool_calls_made = []

        try:
            # Create streaming message with tools
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=2000,
                system=system_prompt,
                messages=messages,
                tools=self.tools
            ) as stream:
                current_tool_call = None

                async for event in stream:
                    if event.type == "content_block_start":
                        if hasattr(event.content_block, 'type'):
                            if event.content_block.type == "tool_use":
                                current_tool_call = {
                                    "id": event.content_block.id,
                                    "name": event.content_block.name,
                                    "input": ""
                                }

                    elif event.type == "content_block_delta":
                        if hasattr(event.delta, 'text'):
                            # Text response
                            text = event.delta.text
                            full_response += text
                            yield {
                                "type": "text_delta",
                                "content": text
                            }
                        elif hasattr(event.delta, 'partial_json'):
                            # Tool input being built
                            if current_tool_call:
                                current_tool_call["input"] += event.delta.partial_json

                    elif event.type == "content_block_stop":
                        if current_tool_call:
                            # Parse the accumulated JSON input
                            try:
                                current_tool_call["input"] = json.loads(current_tool_call["input"])
                            except json.JSONDecodeError:
                                current_tool_call["input"] = {}

                            tool_calls_made.append(current_tool_call)

                            # Determine if frontend or backend tool
                            if current_tool_call["name"] in FRONTEND_TOOLS:
                                yield {
                                    "type": "tool_call",
                                    "id": current_tool_call["id"],
                                    "name": current_tool_call["name"],
                                    "input": current_tool_call["input"],
                                    "execute_on": "frontend"
                                }
                            else:
                                # Execute backend tool and yield result
                                result = await self._execute_backend_tool(
                                    current_tool_call["name"],
                                    current_tool_call["input"],
                                    chart_context,
                                    db_session
                                )
                                yield {
                                    "type": "tool_result",
                                    "id": current_tool_call["id"],
                                    "name": current_tool_call["name"],
                                    "result": result
                                }

                            current_tool_call = None

            # Yield completion
            yield {
                "type": "complete",
                "full_response": full_response,
                "tool_calls": tool_calls_made
            }

        except Exception as e:
            logger.error(f"Error processing agent message: {e}")
            yield {
                "type": "error",
                "error": str(e)
            }

    async def _execute_backend_tool(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        chart_context: Optional[Dict[str, Any]],
        db_session: Optional[Any]
    ) -> Dict[str, Any]:
        """
        Execute a backend tool and return its result.

        Args:
            tool_name: Name of the tool to execute
            tool_input: Input parameters for the tool
            chart_context: Current chart context
            db_session: Database session

        Returns:
            Tool execution result
        """
        try:
            if tool_name == "get_chart_data":
                if not chart_context:
                    return {"success": False, "error": "No chart currently loaded"}

                result = {"success": True}
                if tool_input.get("include_aspects", True):
                    result["aspects"] = chart_context.get("aspects", [])
                if tool_input.get("include_patterns", True):
                    result["patterns"] = chart_context.get("patterns", [])
                result["planets"] = chart_context.get("planets", {})
                result["houses"] = chart_context.get("houses", {})
                return result

            elif tool_name == "get_planet_info":
                planet_name = tool_input.get("planet", "").lower()
                if not chart_context or not chart_context.get("planets"):
                    return {"success": False, "error": "No chart data available"}

                planet_data = chart_context["planets"].get(planet_name)
                if not planet_data:
                    return {"success": False, "error": f"Planet '{planet_name}' not found in chart"}

                return {"success": True, "planet": planet_data}

            elif tool_name == "get_house_info":
                house_num = tool_input.get("house_number", 1)
                if not chart_context or not chart_context.get("houses"):
                    return {"success": False, "error": "No chart data available"}

                houses = chart_context.get("houses", {})
                cusps = houses.get("cusps", [])

                if house_num < 1 or house_num > len(cusps):
                    return {"success": False, "error": f"House {house_num} not found"}

                # Find planets in this house
                planets_in_house = []
                for name, data in chart_context.get("planets", {}).items():
                    if data.get("house") == house_num:
                        planets_in_house.append(name)

                return {
                    "success": True,
                    "house": {
                        "number": house_num,
                        "cusp": cusps[house_num - 1] if cusps else None,
                        "planets": planets_in_house
                    }
                }

            elif tool_name == "list_available_charts":
                # This would query the database
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                # TODO: Query charts from database
                return {"success": True, "charts": [], "message": "Chart listing not yet implemented"}

            # ============================================
            # Phase 2: Journal Tools
            # ============================================
            elif tool_name == "create_journal_entry":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.journal_entry import JournalEntry
                    from datetime import date
                    import json as json_lib

                    entry = JournalEntry(
                        entry_date=date.today().isoformat(),
                        title=tool_input.get("title"),
                        content=tool_input.get("content", ""),
                        mood=tool_input.get("mood"),
                        tags=json_lib.dumps(tool_input.get("tags", [])) if tool_input.get("tags") else None
                    )
                    db_session.add(entry)
                    db_session.commit()

                    return {
                        "success": True,
                        "entry_id": str(entry.id),
                        "message": "Journal entry created successfully"
                    }
                except Exception as e:
                    logger.error(f"Error creating journal entry: {e}")
                    return {"success": False, "error": str(e)}

            elif tool_name == "search_journal":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.journal_entry import JournalEntry
                    from sqlalchemy import or_

                    query = db_session.query(JournalEntry)

                    search_query = tool_input.get("query")
                    if search_query:
                        query = query.filter(
                            or_(
                                JournalEntry.title.contains(search_query),
                                JournalEntry.content.contains(search_query)
                            )
                        )

                    mood = tool_input.get("mood")
                    if mood:
                        query = query.filter(JournalEntry.mood == mood)

                    limit = tool_input.get("limit", 5)
                    entries = query.order_by(JournalEntry.entry_date.desc()).limit(limit).all()

                    return {
                        "success": True,
                        "entries": [
                            {
                                "id": str(e.id),
                                "title": e.title,
                                "preview": e.content[:200] + "..." if len(e.content) > 200 else e.content,
                                "mood": e.mood,
                                "date": e.entry_date
                            }
                            for e in entries
                        ],
                        "count": len(entries)
                    }
                except Exception as e:
                    logger.error(f"Error searching journal: {e}")
                    return {"success": False, "error": str(e)}

            elif tool_name == "get_recent_journal_entries":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.journal_entry import JournalEntry

                    limit = tool_input.get("limit", 5)
                    entries = db_session.query(JournalEntry).order_by(
                        JournalEntry.entry_date.desc()
                    ).limit(limit).all()

                    return {
                        "success": True,
                        "entries": [
                            {
                                "id": str(e.id),
                                "title": e.title,
                                "preview": e.content[:200] + "..." if len(e.content) > 200 else e.content,
                                "mood": e.mood,
                                "date": e.entry_date
                            }
                            for e in entries
                        ]
                    }
                except Exception as e:
                    logger.error(f"Error getting recent entries: {e}")
                    return {"success": False, "error": str(e)}

            elif tool_name == "get_journal_moods":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.journal_entry import JournalEntry
                    from datetime import date, timedelta
                    from sqlalchemy import func

                    days = tool_input.get("days", 30)
                    start_date = (date.today() - timedelta(days=days)).isoformat()

                    mood_counts = db_session.query(
                        JournalEntry.mood,
                        func.count(JournalEntry.id).label('count')
                    ).filter(
                        JournalEntry.entry_date >= start_date,
                        JournalEntry.mood.isnot(None)
                    ).group_by(JournalEntry.mood).all()

                    return {
                        "success": True,
                        "mood_summary": {mood: count for mood, count in mood_counts if mood},
                        "period_days": days
                    }
                except Exception as e:
                    logger.error(f"Error getting mood summary: {e}")
                    return {"success": False, "error": str(e)}

            # ============================================
            # Phase 2: Timeline Tools
            # ============================================
            elif tool_name == "create_timeline_event":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.user_event import UserEvent
                    import json as json_lib

                    # Get birth_data_id from context or use first available
                    birth_data_id = chart_context.get("birth_data_id") if chart_context else None
                    if not birth_data_id:
                        from app.models_sqlite.birth_data import BirthData
                        first_bd = db_session.query(BirthData).first()
                        birth_data_id = str(first_bd.id) if first_bd else None

                    if not birth_data_id:
                        return {"success": False, "error": "No birth data available to associate event with"}

                    event = UserEvent(
                        birth_data_id=birth_data_id,
                        event_date=tool_input.get("event_date"),
                        event_time=tool_input.get("event_time"),
                        title=tool_input.get("title"),
                        description=tool_input.get("description"),
                        category=tool_input.get("category", "personal"),
                        importance=tool_input.get("importance", "moderate"),
                        tags=json_lib.dumps(tool_input.get("tags", [])) if tool_input.get("tags") else None
                    )
                    db_session.add(event)
                    db_session.commit()

                    return {
                        "success": True,
                        "event_id": str(event.id),
                        "message": f"Event '{tool_input.get('title')}' created for {tool_input.get('event_date')}"
                    }
                except Exception as e:
                    logger.error(f"Error creating timeline event: {e}")
                    return {"success": False, "error": str(e)}

            elif tool_name == "get_timeline_events":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.user_event import UserEvent

                    query = db_session.query(UserEvent)

                    start_date = tool_input.get("start_date")
                    end_date = tool_input.get("end_date")
                    if start_date:
                        query = query.filter(UserEvent.event_date >= start_date)
                    if end_date:
                        query = query.filter(UserEvent.event_date <= end_date)

                    category = tool_input.get("category")
                    if category:
                        query = query.filter(UserEvent.category == category)

                    importance = tool_input.get("importance")
                    if importance:
                        query = query.filter(UserEvent.importance == importance)

                    events = query.order_by(UserEvent.event_date.desc()).limit(50).all()

                    return {
                        "success": True,
                        "events": [
                            {
                                "id": str(e.id),
                                "title": e.title,
                                "date": e.event_date,
                                "category": e.category,
                                "importance": e.importance,
                                "description": e.description[:100] + "..." if e.description and len(e.description) > 100 else e.description
                            }
                            for e in events
                        ],
                        "count": len(events)
                    }
                except Exception as e:
                    logger.error(f"Error getting timeline events: {e}")
                    return {"success": False, "error": str(e)}

            elif tool_name == "get_transit_context":
                # This would integrate with the chart calculator for transit analysis
                target_date = tool_input.get("date")
                return {
                    "success": True,
                    "date": target_date,
                    "message": "Transit context calculation would go here",
                    "note": "Full transit analysis requires chart calculator integration"
                }

            elif tool_name == "correlate_events_transits":
                return {
                    "success": True,
                    "message": "Event-transit correlation analysis not yet implemented",
                    "note": "This feature will analyze astrological patterns around life events"
                }

            # ============================================
            # Phase 2: Canvas Tools
            # ============================================
            elif tool_name == "create_canvas":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.canvas_board import CanvasBoard

                    canvas = CanvasBoard(
                        name=tool_input.get("name"),
                        description=tool_input.get("description"),
                        background_type=tool_input.get("background_type", "cosmic")
                    )
                    db_session.add(canvas)
                    db_session.commit()

                    return {
                        "success": True,
                        "canvas_id": str(canvas.id),
                        "message": f"Canvas '{tool_input.get('name')}' created"
                    }
                except Exception as e:
                    logger.error(f"Error creating canvas: {e}")
                    return {"success": False, "error": str(e)}

            elif tool_name == "add_to_canvas":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.canvas_board import CanvasItem
                    import json as json_lib

                    item = CanvasItem(
                        board_id=tool_input.get("canvas_id"),
                        item_type=tool_input.get("item_type"),
                        item_data=json_lib.dumps(tool_input.get("item_data", {})),
                        position_x=tool_input.get("position_x", 100),
                        position_y=tool_input.get("position_y", 100)
                    )
                    db_session.add(item)
                    db_session.commit()

                    return {
                        "success": True,
                        "item_id": str(item.id),
                        "message": f"Added {tool_input.get('item_type')} to canvas"
                    }
                except Exception as e:
                    logger.error(f"Error adding to canvas: {e}")
                    return {"success": False, "error": str(e)}

            elif tool_name == "add_chart_to_canvas":
                # This would extract chart elements and add them to the canvas
                return {
                    "success": True,
                    "message": "Chart elements added to canvas",
                    "note": "Full implementation would extract planets, aspects, etc. from the chart"
                }

            elif tool_name == "list_canvases":
                if not db_session:
                    return {"success": False, "error": "Database not available"}

                try:
                    from app.models_sqlite.canvas_board import CanvasBoard

                    canvases = db_session.query(CanvasBoard).order_by(
                        CanvasBoard.updated_at.desc()
                    ).limit(20).all()

                    return {
                        "success": True,
                        "canvases": [
                            {
                                "id": str(c.id),
                                "name": c.name,
                                "description": c.description,
                                "background_type": c.background_type,
                                "updated_at": c.updated_at.isoformat() if c.updated_at else None
                            }
                            for c in canvases
                        ]
                    }
                except Exception as e:
                    logger.error(f"Error listing canvases: {e}")
                    return {"success": False, "error": str(e)}

            else:
                return {"success": False, "error": f"Unknown tool: {tool_name}"}

        except Exception as e:
            logger.error(f"Error executing backend tool {tool_name}: {e}")
            return {"success": False, "error": str(e)}

    async def get_proactive_insight(
        self,
        trigger: str,
        context: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Generate a proactive insight based on context.

        Args:
            trigger: What triggered this insight (page_change, element_hover, pattern_detected)
            context: Relevant context for the insight
            user_preferences: User's paradigm preferences

        Returns:
            Insight message or None if not appropriate
        """
        prompts = {
            "page_change": f"The user just navigated to the {context.get('page', 'unknown')} page. Generate a brief, friendly greeting or observation (1-2 sentences max). Be warm but not overwhelming.",

            "element_hover": f"The user is looking at {context.get('element_type', 'an element')}: {context.get('element_name', 'unknown')}. Generate a brief intriguing question or observation (1 sentence) that might spark their curiosity.",

            "pattern_detected": f"The chart contains a {context.get('pattern_type', 'significant pattern')} involving {context.get('planets', 'multiple planets')}. Generate a brief exciting observation (1-2 sentences) about what this rare pattern might mean.",

            "inactivity": "The user has been quietly contemplating their chart. Generate a gentle, curious question (1 sentence) that might help them explore further."
        }

        prompt = prompts.get(trigger)
        if not prompt:
            return None

        try:
            response = await self.client.messages.create(
                model="claude-haiku-4-5-20251001",  # Use Haiku for quick insights
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating proactive insight: {e}")
            return None
