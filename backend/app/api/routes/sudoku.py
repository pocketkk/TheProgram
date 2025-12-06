"""
API routes for Variant Sudoku Puzzle Generator

Generates unique, logic-solvable sudoku puzzles with variant constraints
based on daily astrological transits.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Dict, Optional
import uuid
import hashlib

from app.core.database import get_db
from app.models.birth_data import BirthData
from app.services.sudoku_generator import (
    SudokuGenerator,
    SudokuPuzzle,
    Constraint,
    ConstraintType as ServiceConstraintType,
)
from app.services.transit_calculator import TransitCalculator
from app.utils.ephemeris import EphemerisCalculator
from app.schemas.sudoku import (
    PuzzleGenerateRequest,
    PuzzleResponse,
    PuzzleWithSolutionResponse,
    ConstraintSchema,
    ConstraintType,
    HintRequest,
    HintResponse,
    CheckSolutionRequest,
    CheckSolutionResponse,
    SolutionError,
    RevealSolutionRequest,
    RevealSolutionResponse,
    PuzzleContextResponse,
    TransitAspectInfo,
)

router = APIRouter()

# In-memory storage for active puzzles (for hints and solution checking)
# In a production app, this would be Redis or similar
_active_puzzles: Dict[str, SudokuPuzzle] = {}


def _generate_puzzle_id(seed: int, date_str: str) -> str:
    """Generate a unique puzzle ID based on seed and date"""
    hash_input = f"{seed}-{date_str}".encode()
    return hashlib.sha256(hash_input).hexdigest()[:16]


def _constraint_to_schema(constraint: Constraint) -> ConstraintSchema:
    """Convert service Constraint to API schema"""
    return ConstraintSchema(
        constraint_type=ConstraintType(constraint.constraint_type.value),
        cells=[list(cell) for cell in constraint.cells],
        target=constraint.target,
        source_aspect=constraint.source_aspect,
        planets=constraint.planets,
        description=constraint.description,
    )


def _get_current_planet_positions(transit_datetime: datetime) -> Dict:
    """Get current positions of all planets"""
    jd = EphemerisCalculator.datetime_to_julian_day(transit_datetime, 0)

    planets = [
        'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
        'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
        'Chiron', 'North Node'
    ]

    positions = {}
    for planet in planets:
        try:
            pos = EphemerisCalculator.calculate_planet_position(planet.lower().replace(' ', '_'), jd)
            if pos:
                positions[planet] = pos
        except Exception:
            continue

    return positions


def _get_transit_aspects_for_date(
    transit_datetime: datetime,
    birth_data: Optional[BirthData] = None
) -> list:
    """
    Get transit aspects for a given date.
    If birth_data is provided, calculates transits to natal chart.
    Otherwise, generates aspects between current planet positions.
    """
    positions = _get_current_planet_positions(transit_datetime)

    if birth_data:
        # Calculate natal chart positions
        natal_datetime = datetime.combine(birth_data.date_of_birth, birth_data.time_of_birth)
        natal_jd = EphemerisCalculator.datetime_to_julian_day(
            natal_datetime,
            birth_data.timezone_offset or 0
        )

        natal_positions = {}
        for planet in positions.keys():
            try:
                pos = EphemerisCalculator.calculate_planet_position(
                    planet.lower().replace(' ', '_'),
                    natal_jd
                )
                if pos:
                    natal_positions[planet] = pos
            except Exception:
                continue

        # Calculate transits to natal
        aspects = TransitCalculator.calculate_current_transits(natal_positions, transit_datetime)
        return aspects.get('aspects', [])

    # Generate mundane aspects (current planets to each other)
    aspects = []
    planet_list = list(positions.keys())

    aspect_definitions = {
        'conjunction': {'angle': 0, 'orb': 10},
        'opposition': {'angle': 180, 'orb': 8},
        'trine': {'angle': 120, 'orb': 6},
        'square': {'angle': 90, 'orb': 6},
        'sextile': {'angle': 60, 'orb': 4},
        'quincunx': {'angle': 150, 'orb': 3},
    }

    for i, p1 in enumerate(planet_list):
        for p2 in planet_list[i+1:]:
            pos1 = positions[p1]
            pos2 = positions[p2]

            lon1 = pos1.get('longitude', 0)
            lon2 = pos2.get('longitude', 0)

            angle = abs(lon1 - lon2)
            if angle > 180:
                angle = 360 - angle

            for aspect_name, aspect_def in aspect_definitions.items():
                orb = abs(angle - aspect_def['angle'])
                if orb <= aspect_def['orb']:
                    # Determine significance
                    outer_planets = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
                    personal_planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']

                    if p1 in outer_planets and p2 in personal_planets:
                        significance = 'major'
                    elif p1 in personal_planets and p2 in outer_planets:
                        significance = 'major'
                    elif p1 in outer_planets or p2 in outer_planets:
                        significance = 'significant'
                    else:
                        significance = 'moderate'

                    aspects.append({
                        'transit_planet': p1,
                        'natal_planet': p2,
                        'aspect': aspect_name,
                        'orb': orb,
                        'transit_sign': pos1.get('sign_name', 'Unknown'),
                        'transit_degree': pos1.get('degree_in_sign', 0),
                        'significance': significance,
                    })

    return aspects


def _generate_astrological_theme(aspects: list) -> str:
    """Generate a theme description based on the aspects"""
    if not aspects:
        return "A day of quiet celestial energy invites focused contemplation."

    themes = []

    # Count aspect types
    conjunctions = sum(1 for a in aspects if a.get('aspect') == 'conjunction')
    oppositions = sum(1 for a in aspects if a.get('aspect') == 'opposition')
    trines = sum(1 for a in aspects if a.get('aspect') == 'trine')
    squares = sum(1 for a in aspects if a.get('aspect') == 'square')

    if conjunctions > 2:
        themes.append("powerful merging of energies")
    if oppositions > 1:
        themes.append("balancing opposing forces")
    if trines > 2:
        themes.append("flowing harmonious energy")
    if squares > 2:
        themes.append("dynamic tension requiring action")

    # Check for significant planet involvement
    outer_involved = any(
        a.get('transit_planet') in ['Pluto', 'Neptune', 'Uranus']
        for a in aspects if a.get('significance') in ['major', 'significant']
    )
    if outer_involved:
        themes.append("transformative outer planet influences")

    if not themes:
        themes = ["subtle celestial guidance"]

    return f"Today's puzzle reflects {', '.join(themes)}. " \
           f"The variant constraints emerge from the cosmic patterns above."


@router.post("/generate", response_model=PuzzleResponse)
async def generate_puzzle(
    request: PuzzleGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a new variant sudoku puzzle based on astrological transits.

    The puzzle constraints (renban lines, German whispers, killer cages, etc.)
    are derived from the current planetary aspects:
    - Conjunctions create renban lines (consecutive unity)
    - Oppositions/squares create German whispers (tension = difference)
    - Trines/sextiles create killer cages (harmony = sum)
    - Planetary motion creates thermometers (movement = increase)
    """
    try:
        # Parse date
        if request.date:
            transit_date = datetime.fromisoformat(request.date.replace('Z', '+00:00'))
        else:
            transit_date = datetime.now()

        # Get birth data if provided
        birth_data = None
        if request.birth_data_id:
            birth_data = db.query(BirthData).filter(
                BirthData.id == request.birth_data_id
            ).first()

        # Get transit aspects
        aspects = _get_transit_aspects_for_date(transit_date, birth_data)

        # Get current planet positions
        positions = _get_current_planet_positions(transit_date)

        # Generate puzzle
        puzzle = SudokuGenerator.generate_puzzle(
            transit_aspects=aspects,
            planet_positions=positions,
            difficulty=request.difficulty.value,
            transit_date=transit_date.isoformat(),
            seed=request.seed
        )

        # Generate puzzle ID and store for later operations
        puzzle_id = _generate_puzzle_id(puzzle.seed, puzzle.transit_date)
        _active_puzzles[puzzle_id] = puzzle

        # Clean up old puzzles (keep last 100)
        if len(_active_puzzles) > 100:
            oldest_keys = list(_active_puzzles.keys())[:-100]
            for key in oldest_keys:
                del _active_puzzles[key]

        return PuzzleResponse(
            grid=puzzle.grid,
            constraints=[_constraint_to_schema(c) for c in puzzle.constraints],
            difficulty=puzzle.difficulty,
            transit_date=puzzle.transit_date,
            transit_summary=puzzle.transit_summary,
            seed=puzzle.seed,
            puzzle_id=puzzle_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating puzzle: {str(e)}")


@router.post("/generate-with-context", response_model=PuzzleContextResponse)
async def generate_puzzle_with_context(
    request: PuzzleGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a puzzle with extended astrological context information.
    Includes the transit aspects that shaped the puzzle constraints.
    """
    try:
        # Parse date
        if request.date:
            transit_date = datetime.fromisoformat(request.date.replace('Z', '+00:00'))
        else:
            transit_date = datetime.now()

        # Get birth data if provided
        birth_data = None
        if request.birth_data_id:
            birth_data = db.query(BirthData).filter(
                BirthData.id == request.birth_data_id
            ).first()

        # Get transit aspects
        aspects = _get_transit_aspects_for_date(transit_date, birth_data)

        # Get current planet positions
        positions = _get_current_planet_positions(transit_date)

        # Generate puzzle
        puzzle = SudokuGenerator.generate_puzzle(
            transit_aspects=aspects,
            planet_positions=positions,
            difficulty=request.difficulty.value,
            transit_date=transit_date.isoformat(),
            seed=request.seed
        )

        puzzle_id = _generate_puzzle_id(puzzle.seed, puzzle.transit_date)
        _active_puzzles[puzzle_id] = puzzle

        # Build transit info
        transit_info = [
            TransitAspectInfo(
                transit_planet=a.get('transit_planet', ''),
                natal_planet=a.get('natal_planet'),
                aspect=a.get('aspect', ''),
                orb=a.get('orb', 0),
                significance=a.get('significance', 'minor')
            )
            for a in aspects[:10]  # Limit to top 10 aspects
        ]

        theme = _generate_astrological_theme(aspects)

        return PuzzleContextResponse(
            puzzle=PuzzleResponse(
                grid=puzzle.grid,
                constraints=[_constraint_to_schema(c) for c in puzzle.constraints],
                difficulty=puzzle.difficulty,
                transit_date=puzzle.transit_date,
                transit_summary=puzzle.transit_summary,
                seed=puzzle.seed,
                puzzle_id=puzzle_id
            ),
            transit_aspects=transit_info,
            astrological_theme=theme
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating puzzle: {str(e)}")


@router.post("/hint", response_model=HintResponse)
async def get_hint(request: HintRequest):
    """
    Get a hint for the next logical step in solving the puzzle.

    Returns the cell, value, technique used, and an explanation
    of how to find it using logic.
    """
    puzzle = _active_puzzles.get(request.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found. Generate a new puzzle first.")

    hint = SudokuGenerator.get_hint(
        grid=request.grid,
        solution=puzzle.solution,
        constraints=puzzle.constraints
    )

    if not hint:
        raise HTTPException(status_code=400, detail="No hint available - puzzle may be complete.")

    return HintResponse(
        cell=list(hint['cell']),
        value=hint['value'],
        technique=hint['technique'],
        explanation=hint['explanation']
    )


@router.post("/check", response_model=CheckSolutionResponse)
async def check_solution(request: CheckSolutionRequest):
    """
    Check the user's current grid against the solution.

    Returns whether the puzzle is complete, correct, and lists any errors
    including standard sudoku violations and variant constraint violations.
    """
    puzzle = _active_puzzles.get(request.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found. Generate a new puzzle first.")

    result = SudokuGenerator.check_solution(
        grid=request.grid,
        solution=puzzle.solution,
        constraints=puzzle.constraints
    )

    # Convert errors to schema format
    errors = []
    for error in result['errors']:
        errors.append(SolutionError(
            cell=list(error['cell']) if error.get('cell') else None,
            your_value=error.get('your_value'),
            correct_value=error.get('correct_value'),
            constraint_index=error.get('constraint_index'),
            type=error['type'],
            message=error.get('message'),
            cells=[list(c) for c in error['cells']] if error.get('cells') else None,
            values=error.get('values'),
        ))

    return CheckSolutionResponse(
        is_complete=result['is_complete'],
        is_correct=result['is_correct'],
        errors=errors
    )


@router.post("/reveal", response_model=RevealSolutionResponse)
async def reveal_solution(request: RevealSolutionRequest):
    """
    Reveal the complete solution for a puzzle.

    Use sparingly - solving with logic is the goal!
    """
    puzzle = _active_puzzles.get(request.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found. Generate a new puzzle first.")

    return RevealSolutionResponse(solution=puzzle.solution)


@router.get("/daily")
async def get_daily_puzzle(
    difficulty: str = "medium",
    db: Session = Depends(get_db)
):
    """
    Get today's daily puzzle.

    The puzzle is seeded by the current date, so everyone gets
    the same puzzle for the same day and difficulty level.
    """
    today = date.today()

    # Create a consistent seed from the date
    seed = int(today.strftime("%Y%m%d")) + hash(difficulty) % 1000

    request = PuzzleGenerateRequest(
        date=datetime.combine(today, datetime.min.time()).isoformat(),
        difficulty=difficulty,
        seed=seed
    )

    return await generate_puzzle(request, db)


@router.get("/constraints-guide")
async def get_constraints_guide():
    """
    Get information about the variant sudoku constraints used in puzzles.

    Returns descriptions and rules for each constraint type, along with
    their astrological significance.
    """
    return {
        "constraints": [
            {
                "type": "renban",
                "name": "Renban Line",
                "rules": "Cells on the line contain a set of consecutive digits in any order. "
                         "For example, a 4-cell renban could contain 3,4,5,6 (in any arrangement).",
                "astrological_meaning": "Created by planetary conjunctions. When planets unite in the "
                                       "sky, they create a continuous flow of energy - just as consecutive "
                                       "digits flow naturally from one to the next.",
                "visualization": "Purple/pink line connecting cells"
            },
            {
                "type": "german_whispers",
                "name": "German Whispers",
                "rules": "Adjacent cells on the line must differ by at least 5. "
                         "Valid pairs: (1,6), (1,7), (1,8), (1,9), (2,7), (2,8), (2,9), "
                         "(3,8), (3,9), (4,9), and their reverses.",
                "astrological_meaning": "Created by oppositions and squares. These tense aspects "
                                       "demand significant difference - the energies cannot coexist "
                                       "harmoniously, just as adjacent whisper cells cannot be close in value.",
                "visualization": "Green wavy line connecting cells"
            },
            {
                "type": "killer_cage",
                "name": "Killer Cage",
                "rules": "Cells in the cage sum to the target number shown. "
                         "Digits cannot repeat within a cage.",
                "astrological_meaning": "Created by trines and sextiles. These harmonious aspects "
                                       "bring energies together in a balanced sum - cooperation and "
                                       "synthesis, each part contributing to the whole.",
                "visualization": "Dashed outline with sum in corner"
            },
            {
                "type": "thermometer",
                "name": "Thermometer",
                "rules": "Digits must strictly increase from the bulb (round end) to the tip. "
                         "Each cell must be larger than the previous.",
                "astrological_meaning": "Created by planetary motion. As planets move through the zodiac, "
                                       "they trace a path of increasing degrees - growth, development, "
                                       "and forward motion through celestial space.",
                "visualization": "Gray thermometer shape, bulb indicates start"
            }
        ],
        "tips": [
            "Start by identifying which cells are constrained by variant rules",
            "German whispers cells can only contain 1-4 or 6-9 (5 is impossible)",
            "Renban lines define the possible range of digits within",
            "Killer cages with known sums can eliminate many candidates",
            "Thermometers set minimum/maximum values for each position"
        ]
    }
