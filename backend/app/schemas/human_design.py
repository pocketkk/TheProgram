"""
Human Design Schemas

Pydantic schemas for Human Design calculations and responses.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


# ==============================================================================
# ENUMS
# ==============================================================================

class ZodiacType(str, Enum):
    TROPICAL = "tropical"
    SIDEREAL = "sidereal"


class SiderealMethod(str, Enum):
    SHIFT_POSITIONS = "shift_positions"  # Apply ayanamsa to planet positions
    SHIFT_WHEEL = "shift_wheel"          # Shift gate wheel by ayanamsa


class HDType(str, Enum):
    MANIFESTOR = "Manifestor"
    GENERATOR = "Generator"
    MANIFESTING_GENERATOR = "Manifesting Generator"
    PROJECTOR = "Projector"
    REFLECTOR = "Reflector"


class HDAuthority(str, Enum):
    EMOTIONAL = "Emotional"
    SACRAL = "Sacral"
    SPLENIC = "Splenic"
    EGO_MANIFESTED = "Ego Manifested"
    EGO_PROJECTED = "Ego Projected"
    SELF_PROJECTED = "Self-Projected"
    MENTAL = "Mental/Environment"
    LUNAR = "Lunar"
    NONE = "None"


class HDDefinition(str, Enum):
    NONE = "No Definition"
    SINGLE = "Single Definition"
    SPLIT = "Split Definition"
    TRIPLE_SPLIT = "Triple Split"
    QUADRUPLE_SPLIT = "Quadruple Split"


class CrossType(str, Enum):
    RIGHT_ANGLE = "Right Angle"
    JUXTAPOSITION = "Juxtaposition"
    LEFT_ANGLE = "Left Angle"


# ==============================================================================
# NESTED RESPONSE MODELS
# ==============================================================================

class GateActivation(BaseModel):
    """A single gate activation with full details."""
    gate: int = Field(..., ge=1, le=64, description="Gate number (1-64)")
    line: int = Field(..., ge=1, le=6, description="Line (1-6)")
    color: int = Field(..., ge=1, le=6, description="Color (1-6)")
    tone: int = Field(..., ge=1, le=6, description="Tone (1-6)")
    base: int = Field(..., ge=1, le=5, description="Base (1-5)")

    planet: str = Field(..., description="Planet that activates this gate")
    longitude: float = Field(..., description="Ecliptic longitude in degrees")
    sign: str = Field(..., description="Zodiac sign")
    degree_in_sign: float = Field(..., description="Degree within sign")

    gate_name: str = Field(..., description="Name of the gate")
    gate_keyword: str = Field(..., description="Keyword for the gate")

    class Config:
        json_schema_extra = {
            "example": {
                "gate": 1,
                "line": 4,
                "color": 2,
                "tone": 3,
                "base": 1,
                "planet": "Sun",
                "longitude": 276.5,
                "sign": "Capricorn",
                "degree_in_sign": 6.5,
                "gate_name": "The Creative",
                "gate_keyword": "Expression"
            }
        }


class ChannelDefinition(BaseModel):
    """A defined channel connecting two centers."""
    gate1: int = Field(..., description="First gate of the channel")
    gate2: int = Field(..., description="Second gate of the channel")
    name: str = Field(..., description="Channel name")
    center1: str = Field(..., description="First center")
    center2: str = Field(..., description="Second center")
    circuit: str = Field(..., description="Circuit type")
    description: str = Field(..., description="Channel description")

    # Which activations define this channel
    gate1_activations: List[str] = Field(default_factory=list, description="Planets activating gate1")
    gate2_activations: List[str] = Field(default_factory=list, description="Planets activating gate2")

    # Whether activation is from Personality, Design, or both
    activation_type: str = Field(..., description="'personality', 'design', or 'both'")


class CenterDefinition(BaseModel):
    """Definition status of a center."""
    name: str = Field(..., description="Center name")
    defined: bool = Field(..., description="Whether the center is defined")

    # Which gates are activated in this center
    activated_gates: List[int] = Field(default_factory=list, description="All activated gates")

    # Which channels define this center
    defining_channels: List[str] = Field(default_factory=list, description="Channel names that define this center")

    # Center metadata
    theme: str = Field(..., description="Center's theme")
    biological_correlation: str = Field(..., description="Biological correlation")
    not_self_theme: str = Field(..., description="Not-self theme")


class ProfileInfo(BaseModel):
    """Profile information."""
    personality_line: int = Field(..., ge=1, le=6, description="Personality Sun line")
    design_line: int = Field(..., ge=1, le=6, description="Design Sun line")
    name: str = Field(..., description="Profile name (e.g., '3/5 Martyr/Heretic')")
    angle: str = Field(..., description="Cross angle type")
    description: str = Field(..., description="Profile description")


class IncarnationCross(BaseModel):
    """Incarnation Cross information."""
    name: str = Field(..., description="Cross name")
    cross_type: CrossType = Field(..., description="Right Angle, Juxtaposition, or Left Angle")
    quarter: str = Field(..., description="Quarter of the wheel")

    personality_sun_gate: int = Field(..., description="Personality Sun gate")
    personality_earth_gate: int = Field(..., description="Personality Earth gate")
    design_sun_gate: int = Field(..., description="Design Sun gate")
    design_earth_gate: int = Field(..., description="Design Earth gate")

    description: str = Field(default="", description="Cross description")


class Variables(BaseModel):
    """Advanced: Variables (arrows) for PHS and environment."""
    # Design Sun determines digestion (left variable)
    design_sun_color: int = Field(..., description="Design Sun color")
    design_sun_tone: int = Field(..., description="Design Sun tone")
    digestion: str = Field(..., description="Digestion strategy")

    # Personality Sun determines cognition (right variable)
    personality_sun_color: int = Field(..., description="Personality Sun color")
    personality_sun_tone: int = Field(..., description="Personality Sun tone")
    cognition: str = Field(..., description="Cognitive style")

    # Design Node determines environment
    design_node_color: int = Field(..., description="Design North Node color")
    design_node_tone: int = Field(..., description="Design North Node tone")
    environment: str = Field(..., description="Optimal environment")

    # Personality Node determines perspective
    personality_node_color: int = Field(..., description="Personality North Node color")
    personality_node_tone: int = Field(..., description="Personality North Node tone")
    perspective: str = Field(..., description="Perspective/motivation")

    # Arrow directions (left/right for each)
    left_arrow_1: str = Field(..., description="First left arrow direction")
    left_arrow_2: str = Field(..., description="Second left arrow direction")
    right_arrow_1: str = Field(..., description="First right arrow direction")
    right_arrow_2: str = Field(..., description="Second right arrow direction")


# ==============================================================================
# REQUEST SCHEMAS
# ==============================================================================

class HDCalculationRequest(BaseModel):
    """Request to calculate a Human Design chart."""
    birth_data_id: str = Field(..., description="UUID of the birth data record")

    zodiac_type: ZodiacType = Field(
        default=ZodiacType.TROPICAL,
        description="Zodiac system to use"
    )
    sidereal_method: SiderealMethod = Field(
        default=SiderealMethod.SHIFT_POSITIONS,
        description="Method for sidereal calculation (only used if zodiac_type is sidereal)"
    )
    ayanamsa: str = Field(
        default="lahiri",
        description="Ayanamsa to use for sidereal calculations"
    )

    include_variables: bool = Field(
        default=True,
        description="Whether to include Variables (arrows) calculation"
    )
    chart_name: Optional[str] = Field(
        default=None,
        description="Optional name for the chart"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "birth_data_id": "123e4567-e89b-12d3-a456-426614174000",
                "zodiac_type": "tropical",
                "include_variables": True,
                "chart_name": "My Human Design Chart"
            }
        }


class HDInterpretationRequest(BaseModel):
    """Request for AI interpretation of HD element."""
    chart_id: Optional[str] = Field(None, description="Chart ID for context")
    element_type: str = Field(
        ...,
        description="Type of element: 'type', 'profile', 'channel', 'gate', 'authority', 'full'"
    )
    element_id: Optional[str] = Field(
        None,
        description="Specific element identifier (e.g., gate number, channel name)"
    )
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional context for the interpretation"
    )


# ==============================================================================
# RESPONSE SCHEMAS
# ==============================================================================

class HDChartResponse(BaseModel):
    """Complete Human Design chart response."""
    id: Optional[str] = Field(None, description="Chart ID if saved")
    birth_data_id: str = Field(..., description="Birth data ID")

    # Core HD elements
    hd_type: HDType = Field(..., description="Human Design Type")
    strategy: str = Field(..., description="Life strategy")
    authority: HDAuthority = Field(..., description="Inner authority")
    authority_description: str = Field(..., description="Authority guidance")
    signature: str = Field(..., description="Type signature theme")
    not_self: str = Field(..., description="Not-self theme")

    # Profile
    profile: ProfileInfo = Field(..., description="Profile information")

    # Definition
    definition: HDDefinition = Field(..., description="Definition type")
    definition_description: str = Field(..., description="Definition explanation")

    # Planetary activations
    personality_activations: Dict[str, GateActivation] = Field(
        ..., description="Personality (conscious) planetary activations"
    )
    design_activations: Dict[str, GateActivation] = Field(
        ..., description="Design (unconscious) planetary activations"
    )

    # Centers
    centers: Dict[str, CenterDefinition] = Field(..., description="9 centers with definition status")
    defined_centers: List[str] = Field(..., description="List of defined center names")
    undefined_centers: List[str] = Field(..., description="List of undefined center names")

    # Channels
    channels: List[ChannelDefinition] = Field(..., description="Defined channels")

    # All activated gates (for visualization)
    all_activated_gates: List[int] = Field(..., description="All gates with activations")
    personality_gates: List[int] = Field(..., description="Gates activated by Personality")
    design_gates: List[int] = Field(..., description="Gates activated by Design")

    # Incarnation Cross
    incarnation_cross: IncarnationCross = Field(..., description="Incarnation Cross")

    # Variables (optional)
    variables: Optional[Variables] = Field(None, description="Variables/arrows if calculated")

    # Timing information
    personality_datetime: datetime = Field(..., description="Birth datetime (Personality)")
    design_datetime: datetime = Field(..., description="Design datetime (~88 days before)")
    design_days_before: float = Field(..., description="Actual days before birth for Design")

    # Calculation metadata
    calculation_info: Dict[str, Any] = Field(
        default_factory=dict,
        description="Calculation metadata (zodiac, ayanamsa, etc.)"
    )

    created_at: Optional[datetime] = Field(None, description="When chart was created")

    class Config:
        json_schema_extra = {
            "example": {
                "hd_type": "Generator",
                "strategy": "To Respond",
                "authority": "Sacral",
                "profile": {
                    "personality_line": 3,
                    "design_line": 5,
                    "name": "3/5 Martyr/Heretic",
                    "angle": "Right Angle"
                },
                "definition": "Single Definition"
            }
        }


class HDGateInfo(BaseModel):
    """Information about a single gate."""
    number: int
    name: str
    keyword: str
    description: str = ""
    i_ching_name: str
    center: str
    circuit: Optional[str] = None
    channel_partner: Optional[int] = None
    channel_name: Optional[str] = None
    line_descriptions: Dict[int, str] = Field(default_factory=dict)


class HDChannelInfo(BaseModel):
    """Information about a single channel."""
    gate1: int
    gate2: int
    name: str
    center1: str
    center2: str
    circuit: str
    description: str


class HDCenterInfo(BaseModel):
    """Information about a single center."""
    name: str
    biological: str
    theme: str
    function: str
    defined_theme: str
    undefined_theme: str
    not_self: str
    gates: List[int]
    is_motor: bool
    is_pressure: bool


class HDTypeInfo(BaseModel):
    """Information about a Human Design Type."""
    name: str
    strategy: str
    signature: str
    not_self: str
    aura: str
    percentage: str
    description: str


# ==============================================================================
# AI INTERPRETATION RESPONSES
# ==============================================================================

class HDTypeInterpretationResponse(BaseModel):
    """AI interpretation of Type, Strategy, and Authority."""
    hd_type: str
    strategy: str
    authority: str
    interpretation: str


class HDProfileInterpretationResponse(BaseModel):
    """AI interpretation of Profile."""
    profile: str
    interpretation: str


class HDChannelInterpretationResponse(BaseModel):
    """AI interpretation of a Channel."""
    channel_name: str
    gates: List[int]
    interpretation: str


class HDGateInterpretationResponse(BaseModel):
    """AI interpretation of a Gate."""
    gate: int
    gate_name: str
    planet: str
    line: int
    is_personality: bool
    interpretation: str


class HDFullReadingResponse(BaseModel):
    """AI-generated full Human Design reading."""
    chart_id: Optional[str]
    hd_type: str
    profile: str
    authority: str
    definition: str
    reading: str
    sections: Dict[str, str] = Field(
        default_factory=dict,
        description="Reading broken into sections (type, profile, centers, channels, guidance)"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ==============================================================================
# LIST RESPONSES
# ==============================================================================

class HDGatesListResponse(BaseModel):
    """Response for listing all gates."""
    gates: List[HDGateInfo]
    count: int = 64


class HDChannelsListResponse(BaseModel):
    """Response for listing all channels."""
    channels: List[HDChannelInfo]
    count: int = 36


class HDCentersListResponse(BaseModel):
    """Response for listing all centers."""
    centers: List[HDCenterInfo]
    count: int = 9


class HDTypesListResponse(BaseModel):
    """Response for listing all types."""
    types: List[HDTypeInfo]
    count: int = 5
