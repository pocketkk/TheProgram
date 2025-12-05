"""
Myers-Briggs Schemas

Pydantic schemas for Myers-Briggs personality type calculations and responses.
Based on astrological correspondences to derive personality type.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


# ==============================================================================
# ENUMS
# ==============================================================================

class MBDichotomy(str, Enum):
    """The four dichotomies of Myers-Briggs."""
    EXTRAVERSION_INTROVERSION = "E/I"
    SENSING_INTUITION = "S/N"
    THINKING_FEELING = "T/F"
    JUDGING_PERCEIVING = "J/P"


class MBPreference(str, Enum):
    """Individual preference codes."""
    EXTRAVERSION = "E"
    INTROVERSION = "I"
    SENSING = "S"
    INTUITION = "N"
    THINKING = "T"
    FEELING = "F"
    JUDGING = "J"
    PERCEIVING = "P"


class MBType(str, Enum):
    """The 16 Myers-Briggs personality types."""
    ISTJ = "ISTJ"
    ISFJ = "ISFJ"
    INFJ = "INFJ"
    INTJ = "INTJ"
    ISTP = "ISTP"
    ISFP = "ISFP"
    INFP = "INFP"
    INTP = "INTP"
    ESTP = "ESTP"
    ESFP = "ESFP"
    ENFP = "ENFP"
    ENTP = "ENTP"
    ESTJ = "ESTJ"
    ESFJ = "ESFJ"
    ENFJ = "ENFJ"
    ENTJ = "ENTJ"


class MBTemperament(str, Enum):
    """Keirsey's four temperaments."""
    GUARDIAN = "Guardian"      # SJ types
    ARTISAN = "Artisan"        # SP types
    IDEALIST = "Idealist"      # NF types
    RATIONAL = "Rational"      # NT types


class CognitiveFunctionPosition(str, Enum):
    """Cognitive function stack positions."""
    DOMINANT = "Dominant"
    AUXILIARY = "Auxiliary"
    TERTIARY = "Tertiary"
    INFERIOR = "Inferior"


# ==============================================================================
# NESTED RESPONSE MODELS
# ==============================================================================

class DichotomyScore(BaseModel):
    """Score for a single dichotomy."""
    dichotomy: str = Field(..., description="The dichotomy (E/I, S/N, T/F, J/P)")
    preference: str = Field(..., description="The dominant preference letter")
    strength: float = Field(..., ge=0, le=100, description="Strength of preference (0-100)")
    first_option: str = Field(..., description="First option (E, S, T, J)")
    second_option: str = Field(..., description="Second option (I, N, F, P)")
    first_score: float = Field(..., description="Score for first option")
    second_score: float = Field(..., description="Score for second option")
    contributing_factors: List[str] = Field(
        default_factory=list,
        description="Astrological factors contributing to this score"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "dichotomy": "E/I",
                "preference": "I",
                "strength": 72.5,
                "first_option": "E",
                "second_option": "I",
                "first_score": 27.5,
                "second_score": 72.5,
                "contributing_factors": ["Sun in Cancer", "Moon in Pisces", "Ascendant in Virgo"]
            }
        }


class CognitiveFunction(BaseModel):
    """A cognitive function in the stack."""
    function: str = Field(..., description="Function code (e.g., Fi, Te, Ni)")
    name: str = Field(..., description="Full name (e.g., Introverted Feeling)")
    position: CognitiveFunctionPosition = Field(..., description="Position in stack")
    description: str = Field(..., description="What this function does")


class TypeProfile(BaseModel):
    """Profile information for an MBTI type."""
    type_code: str = Field(..., description="4-letter type code")
    name: str = Field(..., description="Type nickname (e.g., The Architect)")
    temperament: MBTemperament = Field(..., description="Keirsey temperament")
    description: str = Field(..., description="Type description")
    strengths: List[str] = Field(..., description="Key strengths")
    challenges: List[str] = Field(..., description="Potential challenges")
    cognitive_stack: List[CognitiveFunction] = Field(
        ..., description="Cognitive function stack (dominant to inferior)"
    )


class AstrologicalCorrelation(BaseModel):
    """How a birth chart element correlates to MB preferences."""
    element: str = Field(..., description="Astrological element (e.g., Sun in Aries)")
    influences: Dict[str, float] = Field(
        ..., description="Influence weights on each preference"
    )
    explanation: str = Field(..., description="Why this correlation exists")


# ==============================================================================
# REQUEST SCHEMAS
# ==============================================================================

class MBCalculationRequest(BaseModel):
    """Request to calculate Myers-Briggs type from birth data."""
    birth_data_id: str = Field(..., description="UUID of the birth data record")

    include_cognitive_stack: bool = Field(
        default=True,
        description="Whether to include cognitive function stack"
    )
    include_correlations: bool = Field(
        default=False,
        description="Whether to include astrological correlation details"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "birth_data_id": "123e4567-e89b-12d3-a456-426614174000",
                "include_cognitive_stack": True,
                "include_correlations": False
            }
        }


class MBInterpretationRequest(BaseModel):
    """Request for AI interpretation of MB type."""
    type_code: str = Field(..., description="4-letter type code")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional context for interpretation"
    )


# ==============================================================================
# RESPONSE SCHEMAS
# ==============================================================================

class MBTypeResponse(BaseModel):
    """Complete Myers-Briggs type response."""
    id: Optional[str] = Field(None, description="Calculation ID if saved")
    birth_data_id: str = Field(..., description="Birth data ID")

    # Core type
    type_code: str = Field(..., description="4-letter type code (e.g., INTJ)")
    type_name: str = Field(..., description="Type nickname")
    temperament: str = Field(..., description="Keirsey temperament")

    # Dichotomy scores
    dichotomies: List[DichotomyScore] = Field(
        ..., description="Scores for each of the 4 dichotomies"
    )

    # Preference strengths summary
    preference_strengths: Dict[str, float] = Field(
        ..., description="Map of each letter to its strength (0-100)"
    )

    # Type description
    description: str = Field(..., description="Description of this type")
    strengths: List[str] = Field(..., description="Key strengths")
    challenges: List[str] = Field(..., description="Potential challenges")

    # Cognitive functions
    cognitive_stack: Optional[List[CognitiveFunction]] = Field(
        None, description="Cognitive function stack if requested"
    )

    # Astrological correlations
    correlations: Optional[List[AstrologicalCorrelation]] = Field(
        None, description="Astrological correlations if requested"
    )

    # Calculation metadata
    calculation_info: Dict[str, Any] = Field(
        default_factory=dict,
        description="Calculation metadata"
    )

    created_at: Optional[datetime] = Field(None, description="When calculated")

    class Config:
        json_schema_extra = {
            "example": {
                "type_code": "INTJ",
                "type_name": "The Architect",
                "temperament": "Rational",
                "dichotomies": [
                    {"dichotomy": "E/I", "preference": "I", "strength": 72.5}
                ],
                "description": "Strategic, logical, and independent thinkers"
            }
        }


class MBTypeInfo(BaseModel):
    """Information about a single MB type."""
    type_code: str
    name: str
    temperament: str
    description: str
    cognitive_functions: List[str]
    famous_examples: List[str] = Field(default_factory=list)
    percentage: str = Field(..., description="Estimated population percentage")


class MBTypesListResponse(BaseModel):
    """Response for listing all 16 types."""
    types: List[MBTypeInfo]
    count: int = 16


class MBDichotomyInfo(BaseModel):
    """Information about a dichotomy."""
    code: str
    name: str
    first_pole: str
    second_pole: str
    first_description: str
    second_description: str


class MBDichotomiesListResponse(BaseModel):
    """Response for listing all dichotomies."""
    dichotomies: List[MBDichotomyInfo]
    count: int = 4


# ==============================================================================
# AI INTERPRETATION RESPONSES
# ==============================================================================

class MBTypeInterpretationResponse(BaseModel):
    """AI interpretation of MB type."""
    type_code: str
    interpretation: str


class MBFullReadingResponse(BaseModel):
    """AI-generated full MB reading."""
    birth_data_id: str
    type_code: str
    reading: str
    sections: Dict[str, str] = Field(
        default_factory=dict,
        description="Reading sections (overview, strengths, challenges, growth, relationships)"
    )
    generated_at: datetime = Field(default_factory=datetime.utcnow)
