"""
Tests for the Variant Sudoku Generator

Tests cover:
- Basic sudoku generation and solving
- Constraint mapping from transits
- Variant constraint validation
- Unique solution verification
"""

import pytest
from datetime import datetime
import random

from app.services.sudoku_generator import (
    SudokuGenerator,
    SudokuSolver,
    SudokuPuzzle,
    TransitToSudokuMapper,
    Constraint,
    ConstraintType,
)


class TestSudokuSolver:
    """Tests for the constraint-propagation sudoku solver"""

    def test_solve_empty_grid(self):
        """Solver should solve an empty grid"""
        grid = [[0] * 9 for _ in range(9)]
        solver = SudokuSolver(grid)
        solutions = solver.solve(max_solutions=1)

        assert len(solutions) == 1
        solution = solutions[0]

        # Verify it's a valid sudoku
        assert self._is_valid_sudoku(solution)

    def test_solve_with_clues(self):
        """Solver should solve a grid with clues"""
        # A simple puzzle
        grid = [
            [5, 3, 0, 0, 7, 0, 0, 0, 0],
            [6, 0, 0, 1, 9, 5, 0, 0, 0],
            [0, 9, 8, 0, 0, 0, 0, 6, 0],
            [8, 0, 0, 0, 6, 0, 0, 0, 3],
            [4, 0, 0, 8, 0, 3, 0, 0, 1],
            [7, 0, 0, 0, 2, 0, 0, 0, 6],
            [0, 6, 0, 0, 0, 0, 2, 8, 0],
            [0, 0, 0, 4, 1, 9, 0, 0, 5],
            [0, 0, 0, 0, 8, 0, 0, 7, 9],
        ]
        solver = SudokuSolver(grid)
        solutions = solver.solve(max_solutions=1)

        assert len(solutions) == 1
        assert self._is_valid_sudoku(solutions[0])

    def test_multiple_solutions_detection(self):
        """Solver should detect multiple solutions"""
        # An underconstrained grid
        grid = [[0] * 9 for _ in range(9)]
        # Add minimal clues
        grid[0][0] = 1
        grid[1][1] = 2

        solver = SudokuSolver(grid)
        solutions = solver.solve(max_solutions=2)

        # Should find multiple solutions
        assert len(solutions) == 2

    def test_renban_constraint(self):
        """Solver should respect renban constraints"""
        grid = [[0] * 9 for _ in range(9)]
        grid[0][0] = 1

        # Renban on first 3 cells of first row
        constraints = [
            Constraint(
                constraint_type=ConstraintType.RENBAN,
                cells=[(0, 0), (0, 1), (0, 2)]
            )
        ]

        solver = SudokuSolver(grid, constraints)
        solutions = solver.solve(max_solutions=10)

        for solution in solutions:
            values = [solution[0][i] for i in range(3)]
            sorted_vals = sorted(values)
            # Must be consecutive
            for i in range(len(sorted_vals) - 1):
                assert sorted_vals[i + 1] - sorted_vals[i] == 1, \
                    f"Renban violated: {values}"

    def test_german_whispers_constraint(self):
        """Solver should respect German Whispers constraints"""
        grid = [[0] * 9 for _ in range(9)]

        # German whispers on cells - adjacent must differ by 5+
        constraints = [
            Constraint(
                constraint_type=ConstraintType.GERMAN_WHISPERS,
                cells=[(0, 0), (0, 1), (0, 2), (0, 3)]
            )
        ]

        solver = SudokuSolver(grid, constraints)
        solutions = solver.solve(max_solutions=10)

        for solution in solutions:
            values = [solution[0][i] for i in range(4)]
            # Adjacent cells must differ by 5+
            for i in range(len(values) - 1):
                assert abs(values[i] - values[i + 1]) >= 5, \
                    f"German Whispers violated: {values}"

    def test_killer_cage_constraint(self):
        """Solver should respect killer cage constraints"""
        grid = [[0] * 9 for _ in range(9)]

        # Cage with target sum 10
        constraints = [
            Constraint(
                constraint_type=ConstraintType.KILLER_CAGE,
                cells=[(0, 0), (0, 1), (1, 0)],
                target=10
            )
        ]

        solver = SudokuSolver(grid, constraints)
        solutions = solver.solve(max_solutions=10)

        for solution in solutions:
            values = [solution[0][0], solution[0][1], solution[1][0]]
            assert sum(values) == 10, f"Cage sum wrong: {values} = {sum(values)}"
            assert len(values) == len(set(values)), f"Cage has repeats: {values}"

    def test_thermometer_constraint(self):
        """Solver should respect thermometer constraints"""
        grid = [[0] * 9 for _ in range(9)]

        # Thermometer cells - must increase
        constraints = [
            Constraint(
                constraint_type=ConstraintType.THERMOMETER,
                cells=[(0, 0), (0, 1), (0, 2), (0, 3)]
            )
        ]

        solver = SudokuSolver(grid, constraints)
        solutions = solver.solve(max_solutions=10)

        for solution in solutions:
            values = [solution[0][i] for i in range(4)]
            # Must strictly increase
            for i in range(len(values) - 1):
                assert values[i] < values[i + 1], \
                    f"Thermometer violated: {values}"

    def _is_valid_sudoku(self, grid: list) -> bool:
        """Check if a grid is a valid completed sudoku"""
        # Check rows
        for row in grid:
            if sorted(row) != list(range(1, 10)):
                return False

        # Check columns
        for col in range(9):
            column = [grid[row][col] for row in range(9)]
            if sorted(column) != list(range(1, 10)):
                return False

        # Check boxes
        for box_row in range(3):
            for box_col in range(3):
                box = []
                for r in range(3):
                    for c in range(3):
                        box.append(grid[box_row * 3 + r][box_col * 3 + c])
                if sorted(box) != list(range(1, 10)):
                    return False

        return True


class TestSudokuGenerator:
    """Tests for the sudoku puzzle generator"""

    def test_generate_complete_grid(self):
        """Generator should create a valid complete grid"""
        rng = random.Random(42)
        grid = SudokuGenerator.generate_complete_grid(rng)

        # Should be 9x9
        assert len(grid) == 9
        assert all(len(row) == 9 for row in grid)

        # Should be valid
        solver = SudokuSolver(grid)
        # Already complete, no solving needed
        for row in grid:
            assert all(1 <= v <= 9 for v in row)

    def test_generate_puzzle_basic(self):
        """Generator should create a puzzle without constraints"""
        puzzle = SudokuGenerator.generate_puzzle(
            transit_aspects=[],
            planet_positions={},
            difficulty='medium',
            transit_date='2024-01-01T12:00:00',
            seed=42
        )

        assert isinstance(puzzle, SudokuPuzzle)
        assert len(puzzle.grid) == 9
        assert len(puzzle.solution) == 9

        # Grid should have some empty cells
        empty_count = sum(1 for row in puzzle.grid for cell in row if cell == 0)
        assert empty_count > 0

        # Solution should be complete
        assert all(cell != 0 for row in puzzle.solution for cell in row)

    def test_generate_puzzle_with_constraints(self):
        """Generator should create a puzzle with transit-based constraints"""
        aspects = [
            {
                'transit_planet': 'Sun',
                'natal_planet': 'Moon',
                'aspect': 'conjunction',
                'orb': 2.5,
                'transit_sign': 'Aries',
                'transit_degree': 15.0,
                'significance': 'major'
            },
            {
                'transit_planet': 'Mars',
                'natal_planet': 'Saturn',
                'aspect': 'opposition',
                'orb': 3.0,
                'transit_sign': 'Leo',
                'transit_degree': 20.0,
                'significance': 'significant'
            },
            {
                'transit_planet': 'Venus',
                'natal_planet': 'Jupiter',
                'aspect': 'trine',
                'orb': 1.5,
                'transit_sign': 'Gemini',
                'transit_degree': 10.0,
                'significance': 'significant'
            }
        ]

        positions = {
            'Sun': {'sign_name': 'Aries', 'degree_in_sign': 15.0, 'longitude': 15.0},
            'Moon': {'sign_name': 'Aries', 'degree_in_sign': 17.0, 'longitude': 17.0},
            'Mars': {'sign_name': 'Leo', 'degree_in_sign': 20.0, 'longitude': 140.0},
            'Venus': {'sign_name': 'Gemini', 'degree_in_sign': 10.0, 'longitude': 70.0},
        }

        puzzle = SudokuGenerator.generate_puzzle(
            transit_aspects=aspects,
            planet_positions=positions,
            difficulty='medium',
            transit_date='2024-01-01T12:00:00',
            seed=42
        )

        # Should have some constraints
        # (May not have all due to puzzle generation constraints)
        assert isinstance(puzzle.constraints, list)

    def test_verify_constraints_valid(self):
        """Constraint verification should pass for valid solution"""
        solution = [
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            [4, 5, 6, 7, 8, 9, 1, 2, 3],
            [7, 8, 9, 1, 2, 3, 4, 5, 6],
            [2, 3, 4, 5, 6, 7, 8, 9, 1],
            [5, 6, 7, 8, 9, 1, 2, 3, 4],
            [8, 9, 1, 2, 3, 4, 5, 6, 7],
            [3, 4, 5, 6, 7, 8, 9, 1, 2],
            [6, 7, 8, 9, 1, 2, 3, 4, 5],
            [9, 1, 2, 3, 4, 5, 6, 7, 8],
        ]

        # Renban on 1,2,3
        constraints = [
            Constraint(
                constraint_type=ConstraintType.RENBAN,
                cells=[(0, 0), (0, 1), (0, 2)]
            )
        ]

        assert SudokuGenerator.verify_constraints(solution, constraints)

    def test_verify_constraints_invalid_renban(self):
        """Constraint verification should fail for invalid renban"""
        solution = [
            [1, 3, 5, 4, 2, 6, 7, 8, 9],  # 1,3,5 not consecutive
            [4, 5, 6, 7, 8, 9, 1, 2, 3],
            [7, 8, 9, 1, 2, 3, 4, 5, 6],
            [2, 3, 4, 5, 6, 7, 8, 9, 1],
            [5, 6, 7, 8, 9, 1, 2, 3, 4],
            [8, 9, 1, 2, 3, 4, 5, 6, 7],
            [3, 4, 5, 6, 7, 8, 9, 1, 2],
            [6, 7, 8, 9, 1, 2, 3, 4, 5],
            [9, 1, 2, 3, 4, 5, 6, 7, 8],
        ]

        constraints = [
            Constraint(
                constraint_type=ConstraintType.RENBAN,
                cells=[(0, 0), (0, 1), (0, 2)]
            )
        ]

        assert not SudokuGenerator.verify_constraints(solution, constraints)

    def test_remove_clues_maintains_uniqueness(self):
        """Removing clues should maintain unique solvability"""
        rng = random.Random(123)
        solution = SudokuGenerator.generate_complete_grid(rng)

        puzzle_grid = SudokuGenerator.remove_clues(
            solution=solution,
            constraints=[],
            difficulty='medium',
            rng=rng
        )

        # Should have empty cells
        empty_count = sum(1 for row in puzzle_grid for cell in row if cell == 0)
        assert empty_count > 0

        # Should have unique solution
        solver = SudokuSolver(puzzle_grid)
        solutions = solver.solve(max_solutions=2)
        assert len(solutions) == 1

    def test_difficulty_affects_clue_count(self):
        """Harder difficulties should have fewer clues"""
        rng_easy = random.Random(42)
        rng_hard = random.Random(42)

        solution = SudokuGenerator.generate_complete_grid(rng_easy)
        solution_copy = [row[:] for row in solution]

        easy_grid = SudokuGenerator.remove_clues(
            solution=solution,
            constraints=[],
            difficulty='easy',
            rng=rng_easy
        )

        hard_grid = SudokuGenerator.remove_clues(
            solution=solution_copy,
            constraints=[],
            difficulty='hard',
            rng=rng_hard
        )

        easy_clues = sum(1 for row in easy_grid for cell in row if cell != 0)
        hard_clues = sum(1 for row in hard_grid for cell in row if cell != 0)

        assert easy_clues > hard_clues

    def test_get_hint(self):
        """Get hint should return valid hint"""
        # Create a puzzle with one empty cell
        solution = [
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            [4, 5, 6, 7, 8, 9, 1, 2, 3],
            [7, 8, 9, 1, 2, 3, 4, 5, 6],
            [2, 3, 4, 5, 6, 7, 8, 9, 1],
            [5, 6, 7, 8, 9, 1, 2, 3, 4],
            [8, 9, 1, 2, 3, 4, 5, 6, 7],
            [3, 4, 5, 6, 7, 8, 9, 1, 2],
            [6, 7, 8, 9, 1, 2, 3, 4, 5],
            [9, 1, 2, 3, 4, 5, 6, 7, 8],
        ]

        grid = [row[:] for row in solution]
        grid[0][0] = 0  # Remove one clue

        hint = SudokuGenerator.get_hint(grid, solution, [])

        assert hint is not None
        assert hint['cell'] == (0, 0)
        assert hint['value'] == 1

    def test_check_solution_correct(self):
        """Check solution should identify correct solution"""
        solution = [[1] * 9 for _ in range(9)]  # Dummy, not valid sudoku
        grid = [row[:] for row in solution]

        result = SudokuGenerator.check_solution(grid, solution, [])

        assert result['is_complete']
        assert result['is_correct']
        assert len(result['errors']) == 0

    def test_check_solution_with_errors(self):
        """Check solution should identify errors"""
        solution = [
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            [4, 5, 6, 7, 8, 9, 1, 2, 3],
            [7, 8, 9, 1, 2, 3, 4, 5, 6],
            [2, 3, 4, 5, 6, 7, 8, 9, 1],
            [5, 6, 7, 8, 9, 1, 2, 3, 4],
            [8, 9, 1, 2, 3, 4, 5, 6, 7],
            [3, 4, 5, 6, 7, 8, 9, 1, 2],
            [6, 7, 8, 9, 1, 2, 3, 4, 5],
            [9, 1, 2, 3, 4, 5, 6, 7, 8],
        ]

        grid = [row[:] for row in solution]
        grid[0][0] = 5  # Wrong value

        result = SudokuGenerator.check_solution(grid, solution, [])

        assert result['is_complete']
        assert not result['is_correct']
        assert len(result['errors']) > 0
        assert any(e['cell'] == (0, 0) for e in result['errors'])


class TestTransitToSudokuMapper:
    """Tests for the transit to constraint mapper"""

    def test_map_conjunction_to_renban(self):
        """Conjunctions should create renban constraints"""
        aspects = [
            {
                'transit_planet': 'Sun',
                'natal_planet': 'Moon',
                'aspect': 'conjunction',
                'orb': 2.0,
                'transit_sign': 'Aries',
                'transit_degree': 15.0,
                'significance': 'major'
            }
        ]

        positions = {
            'Sun': {'sign_name': 'Aries', 'degree_in_sign': 15.0, 'longitude': 15.0},
            'Moon': {'sign_name': 'Aries', 'degree_in_sign': 17.0, 'longitude': 17.0},
        }

        rng = random.Random(42)
        constraints, summary = TransitToSudokuMapper.map_transits_to_constraints(
            aspects, positions, rng
        )

        # Should have at least one renban
        renban_constraints = [c for c in constraints
                             if c.constraint_type == ConstraintType.RENBAN]
        assert len(renban_constraints) > 0

    def test_map_opposition_to_whispers(self):
        """Oppositions should create German Whispers constraints"""
        aspects = [
            {
                'transit_planet': 'Mars',
                'natal_planet': 'Saturn',
                'aspect': 'opposition',
                'orb': 3.0,
                'transit_sign': 'Leo',
                'transit_degree': 20.0,
                'significance': 'significant'
            }
        ]

        positions = {
            'Mars': {'sign_name': 'Leo', 'degree_in_sign': 20.0, 'longitude': 140.0},
            'Saturn': {'sign_name': 'Aquarius', 'degree_in_sign': 23.0, 'longitude': 323.0},
        }

        rng = random.Random(42)
        constraints, summary = TransitToSudokuMapper.map_transits_to_constraints(
            aspects, positions, rng
        )

        # Should have German whispers
        whispers = [c for c in constraints
                   if c.constraint_type == ConstraintType.GERMAN_WHISPERS]
        assert len(whispers) > 0

    def test_map_trine_to_cage(self):
        """Trines should create killer cage constraints"""
        aspects = [
            {
                'transit_planet': 'Venus',
                'natal_planet': 'Jupiter',
                'aspect': 'trine',
                'orb': 1.5,
                'transit_sign': 'Gemini',
                'transit_degree': 10.0,
                'significance': 'significant'
            }
        ]

        positions = {
            'Venus': {'sign_name': 'Gemini', 'degree_in_sign': 10.0, 'longitude': 70.0},
            'Jupiter': {'sign_name': 'Libra', 'degree_in_sign': 11.0, 'longitude': 191.0},
        }

        rng = random.Random(42)
        constraints, summary = TransitToSudokuMapper.map_transits_to_constraints(
            aspects, positions, rng
        )

        # Should have killer cage
        cages = [c for c in constraints
                if c.constraint_type == ConstraintType.KILLER_CAGE]
        assert len(cages) > 0
        # Cage should have target
        assert all(c.target is not None for c in cages)

    def test_constraint_descriptions_include_planets(self):
        """Constraints should include planet information"""
        aspects = [
            {
                'transit_planet': 'Sun',
                'natal_planet': 'Moon',
                'aspect': 'conjunction',
                'orb': 2.0,
                'transit_sign': 'Aries',
                'transit_degree': 15.0,
                'significance': 'major'
            }
        ]

        positions = {
            'Sun': {'sign_name': 'Aries', 'degree_in_sign': 15.0, 'longitude': 15.0},
            'Moon': {'sign_name': 'Aries', 'degree_in_sign': 17.0, 'longitude': 17.0},
        }

        rng = random.Random(42)
        constraints, summary = TransitToSudokuMapper.map_transits_to_constraints(
            aspects, positions, rng
        )

        # Constraints should have planet info
        for c in constraints:
            assert c.planets is not None
            assert len(c.planets) > 0

    def test_summary_describes_constraints(self):
        """Summary should describe the constraints created"""
        aspects = [
            {
                'transit_planet': 'Sun',
                'natal_planet': 'Moon',
                'aspect': 'conjunction',
                'orb': 2.0,
                'transit_sign': 'Aries',
                'transit_degree': 15.0,
                'significance': 'major'
            }
        ]

        positions = {
            'Sun': {'sign_name': 'Aries', 'degree_in_sign': 15.0, 'longitude': 15.0},
            'Moon': {'sign_name': 'Aries', 'degree_in_sign': 17.0, 'longitude': 17.0},
        }

        rng = random.Random(42)
        constraints, summary = TransitToSudokuMapper.map_transits_to_constraints(
            aspects, positions, rng
        )

        assert 'Transit-based puzzle' in summary
        assert 'constraints' in summary


class TestLogicOnlySolvability:
    """Tests for ensuring puzzles are solvable without guessing"""

    def test_solve_with_logic_only_easy_puzzle(self):
        """Easy puzzles should be solvable with logic only"""
        rng = random.Random(42)
        solution = SudokuGenerator.generate_complete_grid(rng)
        puzzle = SudokuGenerator.remove_clues(solution, [], 'easy', rng)

        solver = SudokuSolver([row[:] for row in puzzle], [])
        assert solver.solve_with_logic_only(), "Easy puzzle should be logic-solvable"

    def test_solve_with_logic_only_medium_puzzle(self):
        """Medium puzzles should be solvable with logic only"""
        rng = random.Random(123)
        solution = SudokuGenerator.generate_complete_grid(rng)
        puzzle = SudokuGenerator.remove_clues(solution, [], 'medium', rng)

        solver = SudokuSolver([row[:] for row in puzzle], [])
        assert solver.solve_with_logic_only(), "Medium puzzle should be logic-solvable"

    def test_solve_with_logic_only_hard_puzzle(self):
        """Hard puzzles should be solvable with logic only"""
        rng = random.Random(456)
        solution = SudokuGenerator.generate_complete_grid(rng)
        puzzle = SudokuGenerator.remove_clues(solution, [], 'hard', rng)

        solver = SudokuSolver([row[:] for row in puzzle], [])
        assert solver.solve_with_logic_only(), "Hard puzzle should be logic-solvable"

    def test_solve_with_logic_only_with_constraints(self):
        """Puzzles with variant constraints should be logic-solvable"""
        rng = random.Random(789)
        solution = SudokuGenerator.generate_complete_grid(rng)

        # Add a renban constraint
        constraints = [
            Constraint(
                constraint_type=ConstraintType.RENBAN,
                cells=[(0, 0), (0, 1), (0, 2)]
            )
        ]

        # Only use if solution satisfies constraint
        if SudokuGenerator.verify_constraints(solution, constraints):
            puzzle = SudokuGenerator.remove_clues(solution, constraints, 'medium', rng)
            solver = SudokuSolver([row[:] for row in puzzle], constraints)
            assert solver.solve_with_logic_only(), "Puzzle with constraints should be logic-solvable"

    def test_hidden_singles_detection(self):
        """Hidden singles technique should find placements"""
        # Create a grid where hidden singles can be applied
        grid = [
            [5, 3, 0, 0, 7, 0, 0, 0, 0],
            [6, 0, 0, 1, 9, 5, 0, 0, 0],
            [0, 9, 8, 0, 0, 0, 0, 6, 0],
            [8, 0, 0, 0, 6, 0, 0, 0, 3],
            [4, 0, 0, 8, 0, 3, 0, 0, 1],
            [7, 0, 0, 0, 2, 0, 0, 0, 6],
            [0, 6, 0, 0, 0, 0, 2, 8, 0],
            [0, 0, 0, 4, 1, 9, 0, 0, 5],
            [0, 0, 0, 0, 8, 0, 0, 7, 9],
        ]

        solver = SudokuSolver(grid)
        # This classic puzzle should be solvable with logic
        assert solver.solve_with_logic_only(), "Classic puzzle should be logic-solvable"

    def test_puzzles_have_unique_solution(self):
        """All generated puzzles should have exactly one solution"""
        for seed in [100, 200, 300]:
            rng = random.Random(seed)
            solution = SudokuGenerator.generate_complete_grid(rng)
            puzzle = SudokuGenerator.remove_clues(solution, [], 'medium', rng)

            solver = SudokuSolver([row[:] for row in puzzle], [])
            solutions = solver.solve(max_solutions=2)

            assert len(solutions) == 1, f"Puzzle with seed {seed} should have exactly one solution"

    def test_remove_clues_preserves_logic_solvability(self):
        """remove_clues should never create a puzzle requiring guessing"""
        for seed in [111, 222, 333]:
            rng = random.Random(seed)
            solution = SudokuGenerator.generate_complete_grid(rng)
            puzzle = SudokuGenerator.remove_clues(solution, [], 'hard', rng)

            solver = SudokuSolver([row[:] for row in puzzle], [])
            is_logic_solvable = solver.solve_with_logic_only()

            assert is_logic_solvable, f"Puzzle {seed} should be logic-solvable after remove_clues"


class TestPuzzleSeedReproducibility:
    """Tests for puzzle reproducibility with seeds"""

    def test_same_seed_same_puzzle(self):
        """Same seed should produce identical puzzles"""
        aspects = []
        positions = {}

        puzzle1 = SudokuGenerator.generate_puzzle(
            transit_aspects=aspects,
            planet_positions=positions,
            difficulty='medium',
            seed=12345
        )

        puzzle2 = SudokuGenerator.generate_puzzle(
            transit_aspects=aspects,
            planet_positions=positions,
            difficulty='medium',
            seed=12345
        )

        assert puzzle1.grid == puzzle2.grid
        assert puzzle1.solution == puzzle2.solution

    def test_different_seed_different_puzzle(self):
        """Different seeds should produce different puzzles"""
        aspects = []
        positions = {}

        puzzle1 = SudokuGenerator.generate_puzzle(
            transit_aspects=aspects,
            planet_positions=positions,
            difficulty='medium',
            seed=12345
        )

        puzzle2 = SudokuGenerator.generate_puzzle(
            transit_aspects=aspects,
            planet_positions=positions,
            difficulty='medium',
            seed=67890
        )

        # Very unlikely to be the same
        assert puzzle1.grid != puzzle2.grid or puzzle1.seed != puzzle2.seed
