"""
Pydantic schemas for Variant Sudoku API
"""

from typing import List, Tuple, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class ConstraintType(str, Enum):
    """Types of variant sudoku constraints"""
    RENBAN = "renban"
    GERMAN_WHISPERS = "german_whispers"
    KILLER_CAGE = "killer_cage"
    THERMOMETER = "thermometer"
    BETWEEN_LINE = "between_line"
    ARROW = "arrow"


class Difficulty(str, Enum):
    """Puzzle difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class ConstraintSchema(BaseModel):
    """Schema for a single variant constraint"""
    constraint_type: ConstraintType
    cells: List[List[int]] = Field(..., description="List of [row, col] pairs")
    target: Optional[int] = Field(None, description="Target sum for killer cages")
    source_aspect: Optional[str] = Field(None, description="Astrological aspect that created this")
    planets: Optional[List[str]] = Field(None, description="Planets involved in the aspect")
    description: Optional[str] = Field(None, description="Human-readable explanation")


class PuzzleGenerateRequest(BaseModel):
    """Request to generate a new sudoku puzzle"""
    birth_data_id: Optional[str] = Field(None, description="Birth data ID for personalized transits")
    date: Optional[str] = Field(None, description="Date for transits (ISO format), defaults to today")
    difficulty: Difficulty = Field(Difficulty.MEDIUM, description="Puzzle difficulty")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")


class PuzzleResponse(BaseModel):
    """Response containing a sudoku puzzle"""
    grid: List[List[int]] = Field(..., description="9x9 grid with 0 for empty cells")
    constraints: List[ConstraintSchema] = Field(..., description="Variant constraints")
    difficulty: str
    transit_date: str
    transit_summary: str
    seed: int
    puzzle_id: str = Field(..., description="Unique ID for this puzzle instance")


class PuzzleWithSolutionResponse(PuzzleResponse):
    """Puzzle response including solution (for internal use)"""
    solution: List[List[int]]


class HintRequest(BaseModel):
    """Request for a hint"""
    puzzle_id: str
    grid: List[List[int]] = Field(..., description="Current state of the grid")


class HintResponse(BaseModel):
    """Response with a solving hint"""
    cell: List[int] = Field(..., description="[row, col] of the hint cell")
    value: int
    technique: str = Field(..., description="Solving technique name")
    explanation: str


class CheckSolutionRequest(BaseModel):
    """Request to check a solution attempt"""
    puzzle_id: str
    grid: List[List[int]] = Field(..., description="User's current grid")


class SolutionError(BaseModel):
    """Details about a solution error"""
    cell: Optional[List[int]] = None
    your_value: Optional[int] = None
    correct_value: Optional[int] = None
    constraint_index: Optional[int] = None
    type: str
    message: Optional[str] = None
    cells: Optional[List[List[int]]] = None
    values: Optional[List[int]] = None


class CheckSolutionResponse(BaseModel):
    """Response from checking a solution"""
    is_complete: bool
    is_correct: bool
    errors: List[SolutionError] = Field(default_factory=list)


class RevealSolutionRequest(BaseModel):
    """Request to reveal the full solution"""
    puzzle_id: str


class RevealSolutionResponse(BaseModel):
    """Response with the full solution"""
    solution: List[List[int]]


class TransitAspectInfo(BaseModel):
    """Simplified transit aspect information for puzzle context"""
    transit_planet: str
    natal_planet: Optional[str] = None
    aspect: str
    orb: float
    significance: str


class PuzzleContextResponse(BaseModel):
    """Extended puzzle response with astrological context"""
    puzzle: PuzzleResponse
    transit_aspects: List[TransitAspectInfo]
    astrological_theme: str = Field(..., description="Overall theme based on transits")
