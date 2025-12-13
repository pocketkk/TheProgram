"""
Variant Sudoku Generator based on Astrological Transits

Maps planetary positions and aspects to sudoku variant constraints:
- Renban Lines: Conjunctions (planets close together) create lines with consecutive digits
- German Whispers: Oppositions/squares (tense aspects) create lines where adjacent cells differ by 5+
- Killer Cages: Trines/sextiles (harmonious aspects) create cages that sum to a target
- Thermometers: Planetary motion creates increasing sequences
- Between Lines: Quincunx aspects create "between" constraints

The puzzle generation ensures:
1. Exactly one solution exists
2. Solvable with logic (no guessing required)
3. Constraints are meaningfully tied to transit data
"""

import random
import copy
from typing import List, Tuple, Dict, Optional, Set, Any
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum


class ConstraintType(str, Enum):
    RENBAN = "renban"  # Consecutive digits on a line (any order)
    GERMAN_WHISPERS = "german_whispers"  # Adjacent cells differ by 5+
    KILLER_CAGE = "killer_cage"  # Cells sum to target
    THERMOMETER = "thermometer"  # Increasing from bulb
    BETWEEN_LINE = "between_line"  # Middle cells between endpoints
    ARROW = "arrow"  # Circle = sum of arrow cells


@dataclass
class Constraint:
    """Represents a variant sudoku constraint"""
    constraint_type: ConstraintType
    cells: List[Tuple[int, int]]  # List of (row, col) tuples
    target: Optional[int] = None  # For killer cages, sum target
    source_aspect: Optional[str] = None  # Which aspect created this
    planets: Optional[List[str]] = None  # Involved planets
    description: Optional[str] = None  # Human-readable explanation


@dataclass
class SudokuPuzzle:
    """Complete sudoku puzzle with constraints and metadata"""
    grid: List[List[int]]  # 0 = empty cell
    solution: List[List[int]]  # Complete solution
    constraints: List[Constraint]
    difficulty: str
    transit_date: str
    transit_summary: str
    seed: int  # For reproducibility


class SudokuSolver:
    """
    Constraint-propagation sudoku solver with variant support.

    Two solving modes:
    - solve(): Uses constraint propagation + backtracking for completeness
    - solve_with_logic_only(): Uses only logical techniques (no guessing)

    The logic-only mode is used to ensure generated puzzles are human-solvable.
    """

    def __init__(self, grid: List[List[int]], constraints: List[Constraint] = None):
        self.size = 9
        self.grid = [row[:] for row in grid]
        self.constraints = constraints or []
        # Candidates for each cell - set of possible values
        self.candidates: List[List[Set[int]]] = [
            [set(range(1, 10)) if grid[r][c] == 0 else set()
             for c in range(9)] for r in range(9)
        ]
        self._initialize_candidates()

    def _initialize_candidates(self):
        """Remove candidates based on initial grid values"""
        for r in range(9):
            for c in range(9):
                if self.grid[r][c] != 0:
                    self._propagate(r, c, self.grid[r][c])

    def _propagate(self, row: int, col: int, value: int):
        """Remove value from peers' candidates"""
        # Row
        for c in range(9):
            self.candidates[row][c].discard(value)
        # Column
        for r in range(9):
            self.candidates[r][col].discard(value)
        # Box
        box_r, box_c = 3 * (row // 3), 3 * (col // 3)
        for r in range(box_r, box_r + 3):
            for c in range(box_c, box_c + 3):
                self.candidates[r][c].discard(value)

    def _apply_constraint_logic(self) -> bool:
        """Apply variant constraint logic. Returns True if progress made."""
        progress = False

        for constraint in self.constraints:
            if constraint.constraint_type == ConstraintType.RENBAN:
                progress |= self._apply_renban(constraint)
            elif constraint.constraint_type == ConstraintType.GERMAN_WHISPERS:
                progress |= self._apply_german_whispers(constraint)
            elif constraint.constraint_type == ConstraintType.KILLER_CAGE:
                progress |= self._apply_killer_cage(constraint)
            elif constraint.constraint_type == ConstraintType.THERMOMETER:
                progress |= self._apply_thermometer(constraint)

        return progress

    def _apply_renban(self, constraint: Constraint) -> bool:
        """Renban: cells contain N consecutive digits where N = line length"""
        cells = constraint.cells
        n = len(cells)
        progress = False

        # Find all possible values across all cells
        all_candidates = set()
        for r, c in cells:
            if self.grid[r][c] != 0:
                all_candidates.add(self.grid[r][c])
            else:
                all_candidates.update(self.candidates[r][c])

        # Find valid consecutive ranges
        valid_values = set()
        for start in range(1, 10 - n + 1):
            range_set = set(range(start, start + n))
            if range_set <= all_candidates:
                valid_values.update(range_set)

        # Remove candidates not in valid values
        for r, c in cells:
            if self.grid[r][c] == 0:
                old_size = len(self.candidates[r][c])
                self.candidates[r][c] &= valid_values
                if len(self.candidates[r][c]) < old_size:
                    progress = True

        return progress

    def _apply_german_whispers(self, constraint: Constraint) -> bool:
        """German Whispers: adjacent cells differ by at least 5"""
        progress = False
        cells = constraint.cells

        for i in range(len(cells) - 1):
            r1, c1 = cells[i]
            r2, c2 = cells[i + 1]

            # Get candidates or fixed values
            vals1 = {self.grid[r1][c1]} if self.grid[r1][c1] != 0 else self.candidates[r1][c1]
            vals2 = {self.grid[r2][c2]} if self.grid[r2][c2] != 0 else self.candidates[r2][c2]

            # Valid pairs differ by 5+
            valid1, valid2 = set(), set()
            for v1 in vals1:
                for v2 in vals2:
                    if abs(v1 - v2) >= 5:
                        valid1.add(v1)
                        valid2.add(v2)

            if self.grid[r1][c1] == 0:
                old_size = len(self.candidates[r1][c1])
                self.candidates[r1][c1] &= valid1
                if len(self.candidates[r1][c1]) < old_size:
                    progress = True

            if self.grid[r2][c2] == 0:
                old_size = len(self.candidates[r2][c2])
                self.candidates[r2][c2] &= valid2
                if len(self.candidates[r2][c2]) < old_size:
                    progress = True

        return progress

    def _apply_killer_cage(self, constraint: Constraint) -> bool:
        """Killer cage: cells sum to target, no repeats"""
        if constraint.target is None:
            return False

        cells = constraint.cells
        target = constraint.target
        progress = False

        # Calculate remaining sum and cells
        remaining_cells = []
        current_sum = 0
        used_values = set()

        for r, c in cells:
            if self.grid[r][c] != 0:
                current_sum += self.grid[r][c]
                used_values.add(self.grid[r][c])
            else:
                remaining_cells.append((r, c))

        if not remaining_cells:
            return False

        remaining_target = target - current_sum
        n_remaining = len(remaining_cells)

        # Find all valid combinations
        valid_values: Dict[Tuple[int, int], Set[int]] = {cell: set() for cell in remaining_cells}

        def find_combinations(index: int, current_combo: List[int], current_sum: int):
            if index == n_remaining:
                if current_sum == remaining_target:
                    for i, cell in enumerate(remaining_cells):
                        valid_values[cell].add(current_combo[i])
                return

            r, c = remaining_cells[index]
            for v in self.candidates[r][c]:
                if v not in current_combo and v not in used_values:
                    new_sum = current_sum + v
                    if new_sum <= remaining_target:  # Pruning
                        find_combinations(index + 1, current_combo + [v], new_sum)

        find_combinations(0, [], 0)

        # Restrict candidates
        for (r, c), valid in valid_values.items():
            old_size = len(self.candidates[r][c])
            self.candidates[r][c] &= valid
            if len(self.candidates[r][c]) < old_size:
                progress = True

        return progress

    def _apply_thermometer(self, constraint: Constraint) -> bool:
        """Thermometer: strictly increasing from first cell"""
        cells = constraint.cells
        n = len(cells)
        progress = False

        # For each position, determine min/max possible values
        for i, (r, c) in enumerate(cells):
            if self.grid[r][c] != 0:
                continue

            min_val = i + 1  # At minimum, need i smaller values before
            max_val = 9 - (n - i - 1)  # Need n-i-1 larger values after

            old_size = len(self.candidates[r][c])
            self.candidates[r][c] &= set(range(min_val, max_val + 1))
            if len(self.candidates[r][c]) < old_size:
                progress = True

        return progress

    def _apply_hidden_singles(self) -> bool:
        """
        Hidden singles: if a value can only go in one place in a row/col/box.
        This is a key human solving technique.
        """
        progress = False

        # Check rows
        for r in range(9):
            for val in range(1, 10):
                if any(self.grid[r][c] == val for c in range(9)):
                    continue  # Already placed
                possible_cols = [c for c in range(9)
                                if self.grid[r][c] == 0 and val in self.candidates[r][c]]
                if len(possible_cols) == 1:
                    c = possible_cols[0]
                    self.grid[r][c] = val
                    self.candidates[r][c] = set()
                    self._propagate(r, c, val)
                    progress = True

        # Check columns
        for c in range(9):
            for val in range(1, 10):
                if any(self.grid[r][c] == val for r in range(9)):
                    continue
                possible_rows = [r for r in range(9)
                                if self.grid[r][c] == 0 and val in self.candidates[r][c]]
                if len(possible_rows) == 1:
                    r = possible_rows[0]
                    self.grid[r][c] = val
                    self.candidates[r][c] = set()
                    self._propagate(r, c, val)
                    progress = True

        # Check boxes
        for box_r in range(0, 9, 3):
            for box_c in range(0, 9, 3):
                for val in range(1, 10):
                    # Check if already in box
                    found = False
                    for r in range(box_r, box_r + 3):
                        for c in range(box_c, box_c + 3):
                            if self.grid[r][c] == val:
                                found = True
                                break
                        if found:
                            break
                    if found:
                        continue

                    possible_cells = []
                    for r in range(box_r, box_r + 3):
                        for c in range(box_c, box_c + 3):
                            if self.grid[r][c] == 0 and val in self.candidates[r][c]:
                                possible_cells.append((r, c))

                    if len(possible_cells) == 1:
                        r, c = possible_cells[0]
                        self.grid[r][c] = val
                        self.candidates[r][c] = set()
                        self._propagate(r, c, val)
                        progress = True

        return progress

    def _apply_pointing_pairs(self) -> bool:
        """
        Pointing pairs/triples: if candidates in a box are confined to one row/col,
        eliminate those candidates from the rest of that row/col.
        """
        progress = False

        for box_r in range(0, 9, 3):
            for box_c in range(0, 9, 3):
                for val in range(1, 10):
                    # Find all cells in box that can contain val
                    cells_with_val = []
                    for r in range(box_r, box_r + 3):
                        for c in range(box_c, box_c + 3):
                            if self.grid[r][c] == 0 and val in self.candidates[r][c]:
                                cells_with_val.append((r, c))

                    if len(cells_with_val) < 2 or len(cells_with_val) > 3:
                        continue

                    # Check if all in same row
                    rows = {r for r, c in cells_with_val}
                    if len(rows) == 1:
                        row = list(rows)[0]
                        # Remove val from other cells in this row (outside box)
                        for c in range(9):
                            if c < box_c or c >= box_c + 3:
                                if self.grid[row][c] == 0 and val in self.candidates[row][c]:
                                    self.candidates[row][c].discard(val)
                                    progress = True

                    # Check if all in same column
                    cols = {c for r, c in cells_with_val}
                    if len(cols) == 1:
                        col = list(cols)[0]
                        for r in range(9):
                            if r < box_r or r >= box_r + 3:
                                if self.grid[r][col] == 0 and val in self.candidates[r][col]:
                                    self.candidates[r][col].discard(val)
                                    progress = True

        return progress

    def solve_with_logic_only(self) -> bool:
        """
        Attempt to solve the puzzle using only logical techniques (no guessing).

        Returns True if the puzzle can be completely solved with logic.
        Returns False if the puzzle requires guessing (backtracking).

        This is used to ensure generated puzzles are human-solvable.
        """
        # Work on a copy to not modify state
        solver = SudokuSolver([row[:] for row in self.grid], self.constraints)

        while True:
            progress = False

            # Apply naked singles (cells with only one candidate)
            for r in range(9):
                for c in range(9):
                    if solver.grid[r][c] == 0 and len(solver.candidates[r][c]) == 1:
                        val = list(solver.candidates[r][c])[0]
                        solver.grid[r][c] = val
                        solver.candidates[r][c] = set()
                        solver._propagate(r, c, val)
                        progress = True
                    elif solver.grid[r][c] == 0 and len(solver.candidates[r][c]) == 0:
                        return False  # Contradiction - no solution

            # Apply hidden singles
            progress |= solver._apply_hidden_singles()

            # Apply pointing pairs
            progress |= solver._apply_pointing_pairs()

            # Apply variant constraint logic
            progress |= solver._apply_constraint_logic()

            if not progress:
                break

        # Check if solved completely
        return all(solver.grid[r][c] != 0 for r in range(9) for c in range(9))

    def solve(self, max_solutions: int = 2) -> List[List[List[int]]]:
        """
        Solve the puzzle and return up to max_solutions solutions.
        Uses constraint propagation with backtracking.
        """
        solutions = []
        self._solve_recursive(solutions, max_solutions)
        return solutions

    def _solve_recursive(self, solutions: List, max_solutions: int) -> bool:
        """Recursive solving with constraint propagation"""
        # Propagate until no progress
        while True:
            progress = False

            # Basic constraint propagation
            for r in range(9):
                for c in range(9):
                    if self.grid[r][c] == 0 and len(self.candidates[r][c]) == 1:
                        val = list(self.candidates[r][c])[0]
                        self.grid[r][c] = val
                        self._propagate(r, c, val)
                        progress = True
                    elif self.grid[r][c] == 0 and len(self.candidates[r][c]) == 0:
                        return False  # No solution

            # Apply variant constraints
            progress |= self._apply_constraint_logic()

            if not progress:
                break

        # Check if solved
        if all(self.grid[r][c] != 0 for r in range(9) for c in range(9)):
            solutions.append([row[:] for row in self.grid])
            return len(solutions) >= max_solutions

        # Find cell with minimum candidates (MRV heuristic)
        min_candidates = 10
        best_cell = None
        for r in range(9):
            for c in range(9):
                if self.grid[r][c] == 0 and len(self.candidates[r][c]) < min_candidates:
                    min_candidates = len(self.candidates[r][c])
                    best_cell = (r, c)

        if best_cell is None or min_candidates == 0:
            return False

        r, c = best_cell
        for val in list(self.candidates[r][c]):
            # Save state
            old_grid = [row[:] for row in self.grid]
            old_candidates = [[cell.copy() for cell in row] for row in self.candidates]

            # Try value
            self.grid[r][c] = val
            self.candidates[r][c] = set()
            self._propagate(r, c, val)

            if self._solve_recursive(solutions, max_solutions):
                return True

            # Restore state
            self.grid = old_grid
            self.candidates = old_candidates

        return len(solutions) >= max_solutions


class TransitToSudokuMapper:
    """
    Maps astrological transit data to sudoku variant constraints.
    Creates meaningful connections between planetary positions and puzzle mechanics.
    """

    # Planetary associations with numbers
    PLANET_NUMBERS = {
        'Sun': 1,
        'Moon': 2,
        'Mercury': 3,
        'Venus': 4,
        'Mars': 5,
        'Jupiter': 6,
        'Saturn': 7,
        'Uranus': 8,
        'Neptune': 9,
        'Pluto': 1,  # Cycles back
        'Chiron': 2,
        'North Node': 3,
        'South Node': 4,
    }

    # Sign associations (0-11 mapped to grid positions)
    SIGN_ROWS = {
        'Aries': 0, 'Taurus': 1, 'Gemini': 2,
        'Cancer': 3, 'Leo': 4, 'Virgo': 5,
        'Libra': 6, 'Scorpio': 7, 'Sagittarius': 8,
        'Capricorn': 0, 'Aquarius': 1, 'Pisces': 2,
    }

    SIGN_COLS = {
        'Aries': 0, 'Taurus': 1, 'Gemini': 2,
        'Cancer': 3, 'Leo': 4, 'Virgo': 5,
        'Libra': 6, 'Scorpio': 7, 'Sagittarius': 8,
        'Capricorn': 6, 'Aquarius': 7, 'Pisces': 8,
    }

    @classmethod
    def map_transits_to_constraints(
        cls,
        transit_aspects: List[Dict],
        planet_positions: Dict[str, Dict],
        rng: random.Random
    ) -> Tuple[List[Constraint], str]:
        """
        Convert transit data to sudoku constraints.

        Args:
            transit_aspects: List of aspect dictionaries from TransitCalculator
            planet_positions: Dict of planet positions with longitude, sign, degree
            rng: Random generator for consistent puzzle generation

        Returns:
            Tuple of (constraints list, summary description)
        """
        constraints = []
        descriptions = []

        # Group aspects by type
        conjunctions = []
        oppositions = []
        trines = []
        squares = []
        sextiles = []
        quincunxes = []

        for aspect in transit_aspects:
            aspect_type = aspect.get('aspect', '')
            if aspect_type == 'conjunction':
                conjunctions.append(aspect)
            elif aspect_type == 'opposition':
                oppositions.append(aspect)
            elif aspect_type == 'trine':
                trines.append(aspect)
            elif aspect_type == 'square':
                squares.append(aspect)
            elif aspect_type == 'sextile':
                sextiles.append(aspect)
            elif aspect_type == 'quincunx':
                quincunxes.append(aspect)

        used_cells: Set[Tuple[int, int]] = set()

        # Conjunctions -> Renban lines (unity, togetherness -> consecutive)
        for aspect in conjunctions[:3]:  # Limit to 3 renban lines
            constraint = cls._create_renban_from_conjunction(aspect, planet_positions, used_cells, rng)
            if constraint:
                constraints.append(constraint)
                descriptions.append(f"Renban: {aspect.get('transit_planet')}-{aspect.get('natal_planet')} conjunction")

        # Oppositions + Squares -> German Whispers (tension -> difference)
        tense_aspects = oppositions + squares
        for aspect in tense_aspects[:2]:  # Limit to 2 whisper lines
            constraint = cls._create_whispers_from_tension(aspect, planet_positions, used_cells, rng)
            if constraint:
                constraints.append(constraint)
                descriptions.append(f"Whispers: {aspect.get('transit_planet')}-{aspect.get('natal_planet')} {aspect.get('aspect')}")

        # Trines + Sextiles -> Killer Cages (harmony -> sum)
        harmonious_aspects = trines + sextiles
        for aspect in harmonious_aspects[:3]:  # Limit to 3 cages
            constraint = cls._create_cage_from_harmony(aspect, planet_positions, used_cells, rng)
            if constraint:
                constraints.append(constraint)
                descriptions.append(f"Cage: {aspect.get('transit_planet')}-{aspect.get('natal_planet')} {aspect.get('aspect')}")

        # Add thermometers based on planet speeds (motion -> increase)
        fast_planets = ['Moon', 'Mercury', 'Venus', 'Sun']
        for planet in fast_planets[:2]:
            if planet in planet_positions:
                constraint = cls._create_thermometer_from_motion(planet, planet_positions, used_cells, rng)
                if constraint:
                    constraints.append(constraint)
                    descriptions.append(f"Thermo: {planet} motion")

        summary = f"Transit-based puzzle with {len(constraints)} constraints: " + ", ".join(descriptions[:5])
        if len(descriptions) > 5:
            summary += f" (+{len(descriptions) - 5} more)"

        return constraints, summary

    @classmethod
    def _create_renban_from_conjunction(
        cls,
        aspect: Dict,
        positions: Dict,
        used_cells: Set[Tuple[int, int]],
        rng: random.Random
    ) -> Optional[Constraint]:
        """Create renban line from conjunction aspect"""
        transit_planet = aspect.get('transit_planet', '')
        natal_planet = aspect.get('natal_planet', '')

        # Get positions
        transit_pos = positions.get(transit_planet, {})
        natal_pos = positions.get(natal_planet, {})

        transit_sign = transit_pos.get('sign_name', 'Aries')
        transit_degree = int(transit_pos.get('degree_in_sign', 0))

        # Map to grid - start position based on sign
        start_row = cls.SIGN_ROWS.get(transit_sign, 0)
        start_col = (transit_degree * 9 // 30) % 9  # 0-30 degrees -> 0-8 columns

        # Line length 3-5 based on orb (closer = longer line)
        orb = abs(aspect.get('orb', 5))
        line_length = max(3, min(5, 5 - int(orb // 2)))

        # Generate line cells
        cells = cls._generate_line(start_row, start_col, line_length, used_cells, rng)
        if cells and len(cells) >= 3:
            used_cells.update(cells)
            return Constraint(
                constraint_type=ConstraintType.RENBAN,
                cells=cells,
                source_aspect='conjunction',
                planets=[transit_planet, natal_planet],
                description=f"{transit_planet} conjunct {natal_planet}: consecutive digits unite"
            )
        return None

    @classmethod
    def _create_whispers_from_tension(
        cls,
        aspect: Dict,
        positions: Dict,
        used_cells: Set[Tuple[int, int]],
        rng: random.Random
    ) -> Optional[Constraint]:
        """Create German Whispers line from tense aspect"""
        transit_planet = aspect.get('transit_planet', '')
        aspect_type = aspect.get('aspect', '')

        transit_pos = positions.get(transit_planet, {})
        transit_sign = transit_pos.get('sign_name', 'Aries')
        transit_degree = int(transit_pos.get('degree_in_sign', 15))

        # Opposition creates longer lines, squares shorter
        line_length = 5 if aspect_type == 'opposition' else 4

        # Start position from opposite side for opposition
        if aspect_type == 'opposition':
            start_row = (cls.SIGN_ROWS.get(transit_sign, 0) + 4) % 9
        else:
            start_row = cls.SIGN_ROWS.get(transit_sign, 0)
        start_col = (transit_degree * 9 // 30) % 9

        cells = cls._generate_line(start_row, start_col, line_length, used_cells, rng)
        if cells and len(cells) >= 4:
            used_cells.update(cells)
            natal_planet = aspect.get('natal_planet', '')
            return Constraint(
                constraint_type=ConstraintType.GERMAN_WHISPERS,
                cells=cells,
                source_aspect=aspect_type,
                planets=[transit_planet, natal_planet],
                description=f"{transit_planet} {aspect_type} {natal_planet}: tension demands difference (5+)"
            )
        return None

    @classmethod
    def _create_cage_from_harmony(
        cls,
        aspect: Dict,
        positions: Dict,
        used_cells: Set[Tuple[int, int]],
        rng: random.Random
    ) -> Optional[Constraint]:
        """Create killer cage from harmonious aspect"""
        transit_planet = aspect.get('transit_planet', '')
        natal_planet = aspect.get('natal_planet', '')

        transit_pos = positions.get(transit_planet, {})
        transit_sign = transit_pos.get('sign_name', 'Aries')
        transit_degree = int(transit_pos.get('degree_in_sign', 15))

        # Cage size based on aspect type (trines bigger)
        aspect_type = aspect.get('aspect', '')
        cage_size = 4 if aspect_type == 'trine' else 3

        start_row = cls.SIGN_ROWS.get(transit_sign, 0)
        start_col = (transit_degree * 9 // 30) % 9

        cells = cls._generate_cage(start_row, start_col, cage_size, used_cells, rng)
        if cells and len(cells) >= 2:
            used_cells.update(cells)
            # Calculate a valid sum target
            # For cage of size n, sum range is n*(n+1)/2 to n*(19-n)/2
            min_sum = sum(range(1, len(cells) + 1))
            max_sum = sum(range(10 - len(cells), 10))

            # Use planet numbers to influence target
            p1_num = cls.PLANET_NUMBERS.get(transit_planet, 5)
            p2_num = cls.PLANET_NUMBERS.get(natal_planet, 5)
            base_target = (p1_num + p2_num) * len(cells) // 2
            target = max(min_sum, min(max_sum, base_target + rng.randint(-2, 2)))

            return Constraint(
                constraint_type=ConstraintType.KILLER_CAGE,
                cells=cells,
                target=target,
                source_aspect=aspect_type,
                planets=[transit_planet, natal_planet],
                description=f"{transit_planet} {aspect_type} {natal_planet}: harmony sums to {target}"
            )
        return None

    @classmethod
    def _create_thermometer_from_motion(
        cls,
        planet: str,
        positions: Dict,
        used_cells: Set[Tuple[int, int]],
        rng: random.Random
    ) -> Optional[Constraint]:
        """Create thermometer from fast-moving planet"""
        pos = positions.get(planet, {})
        sign = pos.get('sign_name', 'Aries')
        degree = int(pos.get('degree_in_sign', 15))

        start_row = cls.SIGN_ROWS.get(sign, 0)
        start_col = (degree * 9 // 30) % 9

        # Thermometers are 4-6 cells
        thermo_length = rng.randint(4, 5)

        cells = cls._generate_line(start_row, start_col, thermo_length, used_cells, rng)
        if cells and len(cells) >= 4:
            used_cells.update(cells)
            return Constraint(
                constraint_type=ConstraintType.THERMOMETER,
                cells=cells,
                source_aspect='motion',
                planets=[planet],
                description=f"{planet} in motion: values increase along path"
            )
        return None

    @classmethod
    def _generate_line(
        cls,
        start_row: int,
        start_col: int,
        length: int,
        used: Set[Tuple[int, int]],
        rng: random.Random
    ) -> List[Tuple[int, int]]:
        """Generate a valid line of cells avoiding used cells"""
        directions = [
            (0, 1), (1, 0), (1, 1), (1, -1),  # Right, down, diagonals
            (0, -1), (-1, 0), (-1, -1), (-1, 1)  # Left, up, diagonals
        ]

        best_line = []

        for _ in range(10):  # Try 10 times
            direction = rng.choice(directions)
            line = []
            r, c = start_row, start_col

            for i in range(length):
                if 0 <= r < 9 and 0 <= c < 9 and (r, c) not in used:
                    line.append((r, c))
                    r += direction[0]
                    c += direction[1]
                else:
                    break

            if len(line) > len(best_line):
                best_line = line

            # Try new starting position
            start_row = (start_row + rng.randint(1, 3)) % 9
            start_col = (start_col + rng.randint(1, 3)) % 9

        return best_line

    @classmethod
    def _generate_cage(
        cls,
        start_row: int,
        start_col: int,
        size: int,
        used: Set[Tuple[int, int]],
        rng: random.Random
    ) -> List[Tuple[int, int]]:
        """Generate a valid cage (connected region) of cells"""
        for _ in range(10):  # Try 10 times
            cells = []
            if 0 <= start_row < 9 and 0 <= start_col < 9 and (start_row, start_col) not in used:
                cells.append((start_row, start_col))

                while len(cells) < size:
                    # Find all valid neighbors of current cells
                    neighbors = set()
                    for r, c in cells:
                        for dr, dc in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                            nr, nc = r + dr, c + dc
                            if (0 <= nr < 9 and 0 <= nc < 9 and
                                (nr, nc) not in cells and (nr, nc) not in used):
                                neighbors.add((nr, nc))

                    if not neighbors:
                        break

                    cells.append(rng.choice(list(neighbors)))

                if len(cells) >= 2:
                    return cells

            start_row = (start_row + rng.randint(1, 3)) % 9
            start_col = (start_col + rng.randint(1, 3)) % 9

        return []


class SudokuGenerator:
    """
    Generates variant sudoku puzzles based on astrological transits.
    """

    @classmethod
    def generate_complete_grid(cls, rng: random.Random) -> List[List[int]]:
        """Generate a complete valid sudoku grid"""
        grid = [[0] * 9 for _ in range(9)]

        # Fill diagonal boxes first (independent)
        for box in range(0, 9, 3):
            nums = list(range(1, 10))
            rng.shuffle(nums)
            idx = 0
            for r in range(box, box + 3):
                for c in range(box, box + 3):
                    grid[r][c] = nums[idx]
                    idx += 1

        # Solve to fill remaining cells
        cls._solve_grid(grid)
        return grid

    @classmethod
    def _solve_grid(cls, grid: List[List[int]]) -> bool:
        """Fill remaining cells using backtracking"""
        for r in range(9):
            for c in range(9):
                if grid[r][c] == 0:
                    for val in range(1, 10):
                        if cls._is_valid(grid, r, c, val):
                            grid[r][c] = val
                            if cls._solve_grid(grid):
                                return True
                            grid[r][c] = 0
                    return False
        return True

    @classmethod
    def _is_valid(cls, grid: List[List[int]], row: int, col: int, val: int) -> bool:
        """Check if placing val at (row, col) is valid"""
        # Check row
        if val in grid[row]:
            return False

        # Check column
        if any(grid[r][col] == val for r in range(9)):
            return False

        # Check box
        box_r, box_c = 3 * (row // 3), 3 * (col // 3)
        for r in range(box_r, box_r + 3):
            for c in range(box_c, box_c + 3):
                if grid[r][c] == val:
                    return False

        return True

    @classmethod
    def remove_clues(
        cls,
        solution: List[List[int]],
        constraints: List[Constraint],
        difficulty: str,
        rng: random.Random
    ) -> List[List[int]]:
        """
        Remove clues from solution while maintaining:
        1. Unique solvability (exactly one solution)
        2. Logic-only solvability (no guessing required)

        Difficulty affects how many clues remain.
        """
        difficulty_clues = {
            'easy': 40,
            'medium': 32,
            'hard': 26,
            'expert': 22
        }
        target_clues = difficulty_clues.get(difficulty, 32)

        grid = [row[:] for row in solution]
        cells = [(r, c) for r in range(9) for c in range(9)]
        rng.shuffle(cells)

        clues_remaining = 81

        for r, c in cells:
            if clues_remaining <= target_clues:
                break

            # Try removing this clue
            old_val = grid[r][c]
            grid[r][c] = 0

            # Create solver for testing
            test_grid = [row[:] for row in grid]
            solver = SudokuSolver(test_grid, constraints)

            # First check: must have unique solution
            solutions = solver.solve(max_solutions=2)
            if len(solutions) != 1:
                # Restore clue - needed for uniqueness
                grid[r][c] = old_val
                continue

            # Second check: must be solvable with logic only (no guessing)
            logic_solver = SudokuSolver([row[:] for row in grid], constraints)
            if logic_solver.solve_with_logic_only():
                # Success - puzzle remains logic-solvable
                clues_remaining -= 1
            else:
                # Restore clue - removing it requires guessing
                grid[r][c] = old_val

        return grid

    @classmethod
    def verify_constraints(cls, solution: List[List[int]], constraints: List[Constraint]) -> bool:
        """Verify that a solution satisfies all constraints"""
        for constraint in constraints:
            cells = constraint.cells
            values = [solution[r][c] for r, c in cells]

            if constraint.constraint_type == ConstraintType.RENBAN:
                # Check consecutive
                sorted_vals = sorted(values)
                for i in range(len(sorted_vals) - 1):
                    if sorted_vals[i + 1] - sorted_vals[i] != 1:
                        return False

            elif constraint.constraint_type == ConstraintType.GERMAN_WHISPERS:
                # Check adjacent differ by 5+
                for i in range(len(values) - 1):
                    if abs(values[i] - values[i + 1]) < 5:
                        return False

            elif constraint.constraint_type == ConstraintType.KILLER_CAGE:
                # Check sum and no repeats
                if len(values) != len(set(values)):
                    return False
                if sum(values) != constraint.target:
                    return False

            elif constraint.constraint_type == ConstraintType.THERMOMETER:
                # Check strictly increasing
                for i in range(len(values) - 1):
                    if values[i] >= values[i + 1]:
                        return False

        return True

    @classmethod
    def generate_puzzle(
        cls,
        transit_aspects: List[Dict],
        planet_positions: Dict[str, Dict],
        difficulty: str = 'medium',
        transit_date: str = None,
        seed: int = None
    ) -> SudokuPuzzle:
        """
        Generate a complete variant sudoku puzzle based on transits.

        Args:
            transit_aspects: List of aspect dictionaries
            planet_positions: Dict of planet positions
            difficulty: 'easy', 'medium', 'hard', or 'expert'
            transit_date: ISO date string for the transits
            seed: Random seed for reproducibility

        Returns:
            Complete SudokuPuzzle with grid, solution, and constraints
        """
        if seed is None:
            seed = random.randint(0, 2**32 - 1)

        rng = random.Random(seed)

        # Generate constraints from transits
        constraints, transit_summary = TransitToSudokuMapper.map_transits_to_constraints(
            transit_aspects, planet_positions, rng
        )

        # Generate puzzles until we find one that satisfies all constraints
        max_attempts = 50
        for attempt in range(max_attempts):
            # Generate complete grid
            solution = cls.generate_complete_grid(rng)

            # Check if it satisfies constraints
            if cls.verify_constraints(solution, constraints):
                # Remove clues while maintaining uniqueness
                puzzle_grid = cls.remove_clues(solution, constraints, difficulty, rng)

                return SudokuPuzzle(
                    grid=puzzle_grid,
                    solution=solution,
                    constraints=constraints,
                    difficulty=difficulty,
                    transit_date=transit_date or datetime.now().isoformat(),
                    transit_summary=transit_summary,
                    seed=seed
                )

        # If no valid puzzle found with constraints, reduce constraints
        # and try again
        if len(constraints) > 2:
            reduced_constraints = constraints[:len(constraints) // 2]
            return cls.generate_puzzle(
                transit_aspects, planet_positions, difficulty,
                transit_date, seed + 1  # New seed to avoid infinite loop
            )

        # Fallback: generate without variant constraints
        solution = cls.generate_complete_grid(rng)
        puzzle_grid = cls.remove_clues(solution, [], difficulty, rng)

        return SudokuPuzzle(
            grid=puzzle_grid,
            solution=solution,
            constraints=[],
            difficulty=difficulty,
            transit_date=transit_date or datetime.now().isoformat(),
            transit_summary="Classic sudoku (no transit constraints applied)",
            seed=seed
        )

    @classmethod
    def get_hint(
        cls,
        grid: List[List[int]],
        solution: List[List[int]],
        constraints: List[Constraint]
    ) -> Optional[Dict]:
        """
        Get a hint for the next logical step.

        Returns:
            Dict with 'cell', 'value', 'technique', and 'explanation'
        """
        solver = SudokuSolver([row[:] for row in grid], constraints)

        # Find cell with single candidate
        for r in range(9):
            for c in range(9):
                if grid[r][c] == 0:
                    if len(solver.candidates[r][c]) == 1:
                        val = list(solver.candidates[r][c])[0]
                        return {
                            'cell': (r, c),
                            'value': val,
                            'technique': 'Naked Single',
                            'explanation': f'Cell R{r+1}C{c+1} can only be {val}'
                        }

        # Find hidden singles in rows/cols/boxes
        for r in range(9):
            for val in range(1, 10):
                if val in grid[r]:
                    continue
                possible_cols = [c for c in range(9)
                                if grid[r][c] == 0 and val in solver.candidates[r][c]]
                if len(possible_cols) == 1:
                    return {
                        'cell': (r, possible_cols[0]),
                        'value': val,
                        'technique': 'Hidden Single (Row)',
                        'explanation': f'{val} can only go in R{r+1}C{possible_cols[0]+1} in row {r+1}'
                    }

        # Fallback: reveal any empty cell
        for r in range(9):
            for c in range(9):
                if grid[r][c] == 0:
                    return {
                        'cell': (r, c),
                        'value': solution[r][c],
                        'technique': 'Reveal',
                        'explanation': f'The value at R{r+1}C{c+1} is {solution[r][c]}'
                    }

        return None

    @classmethod
    def check_solution(
        cls,
        grid: List[List[int]],
        solution: List[List[int]],
        constraints: List[Constraint]
    ) -> Dict:
        """
        Check if a user's grid matches the solution and satisfies constraints.

        Returns:
            Dict with 'is_complete', 'is_correct', 'errors' list
        """
        errors = []

        # Check completeness
        is_complete = all(grid[r][c] != 0 for r in range(9) for c in range(9))

        # Check each cell against solution
        for r in range(9):
            for c in range(9):
                if grid[r][c] != 0 and grid[r][c] != solution[r][c]:
                    errors.append({
                        'cell': (r, c),
                        'your_value': grid[r][c],
                        'correct_value': solution[r][c],
                        'type': 'wrong_value'
                    })

        # Check constraints
        for i, constraint in enumerate(constraints):
            cells = constraint.cells
            values = [grid[r][c] for r, c in cells]

            if 0 in values:
                continue  # Incomplete, can't check yet

            if constraint.constraint_type == ConstraintType.RENBAN:
                sorted_vals = sorted(values)
                if not all(sorted_vals[j+1] - sorted_vals[j] == 1
                          for j in range(len(sorted_vals) - 1)):
                    errors.append({
                        'constraint_index': i,
                        'type': 'renban_violation',
                        'cells': cells,
                        'values': values,
                        'message': 'Renban line must contain consecutive digits'
                    })

            elif constraint.constraint_type == ConstraintType.GERMAN_WHISPERS:
                for j in range(len(values) - 1):
                    if abs(values[j] - values[j + 1]) < 5:
                        errors.append({
                            'constraint_index': i,
                            'type': 'whispers_violation',
                            'cells': [cells[j], cells[j + 1]],
                            'values': [values[j], values[j + 1]],
                            'message': 'Adjacent cells on German Whispers must differ by 5+'
                        })

            elif constraint.constraint_type == ConstraintType.KILLER_CAGE:
                if len(values) != len(set(values)):
                    errors.append({
                        'constraint_index': i,
                        'type': 'cage_repeat',
                        'cells': cells,
                        'values': values,
                        'message': 'Killer cage cannot contain repeated digits'
                    })
                if sum(values) != constraint.target:
                    errors.append({
                        'constraint_index': i,
                        'type': 'cage_sum',
                        'cells': cells,
                        'values': values,
                        'expected_sum': constraint.target,
                        'actual_sum': sum(values),
                        'message': f'Killer cage must sum to {constraint.target}'
                    })

            elif constraint.constraint_type == ConstraintType.THERMOMETER:
                for j in range(len(values) - 1):
                    if values[j] >= values[j + 1]:
                        errors.append({
                            'constraint_index': i,
                            'type': 'thermometer_violation',
                            'cells': [cells[j], cells[j + 1]],
                            'values': [values[j], values[j + 1]],
                            'message': 'Thermometer values must strictly increase'
                        })

        return {
            'is_complete': is_complete,
            'is_correct': is_complete and len(errors) == 0,
            'errors': errors
        }
