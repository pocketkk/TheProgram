/**
 * Sudoku API client
 *
 * API for variant sudoku puzzle generation based on astrological transits
 */
import { apiClient, getErrorMessage } from './client'

// Types
export type ConstraintType = 'renban' | 'german_whispers' | 'killer_cage' | 'thermometer' | 'between_line' | 'arrow'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface Constraint {
  constraint_type: ConstraintType
  cells: [number, number][]  // [row, col] pairs
  target?: number            // For killer cages
  source_aspect?: string     // Astrological aspect
  planets?: string[]         // Involved planets
  description?: string       // Human-readable explanation
}

export interface SudokuPuzzle {
  grid: number[][]           // 9x9 grid, 0 = empty
  constraints: Constraint[]
  difficulty: string
  transit_date: string
  transit_summary: string
  seed: number
  puzzle_id: string
}

export interface TransitAspectInfo {
  transit_planet: string
  natal_planet?: string
  aspect: string
  orb: number
  significance: string
}

export interface PuzzleWithContext {
  puzzle: SudokuPuzzle
  transit_aspects: TransitAspectInfo[]
  astrological_theme: string
}

export interface GeneratePuzzleRequest {
  birth_data_id?: string
  date?: string
  difficulty?: Difficulty
  seed?: number
}

export interface HintRequest {
  puzzle_id: string
  grid: number[][]
}

export interface HintResponse {
  cell: [number, number]
  value: number
  technique: string
  explanation: string
}

export interface SolutionError {
  cell?: [number, number]
  your_value?: number
  correct_value?: number
  constraint_index?: number
  type: string
  message?: string
  cells?: [number, number][]
  values?: number[]
}

export interface CheckSolutionResponse {
  is_complete: boolean
  is_correct: boolean
  errors: SolutionError[]
}

export interface ConstraintGuide {
  type: string
  name: string
  rules: string
  astrological_meaning: string
  visualization: string
}

export interface ConstraintsGuideResponse {
  constraints: ConstraintGuide[]
  tips: string[]
}

// API Functions

export async function generatePuzzle(request: GeneratePuzzleRequest = {}): Promise<SudokuPuzzle> {
  try {
    const response = await apiClient.post('/sudoku/generate', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function generatePuzzleWithContext(request: GeneratePuzzleRequest = {}): Promise<PuzzleWithContext> {
  try {
    const response = await apiClient.post('/sudoku/generate-with-context', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function getDailyPuzzle(difficulty: Difficulty = 'medium'): Promise<SudokuPuzzle> {
  try {
    const response = await apiClient.get(`/sudoku/daily?difficulty=${difficulty}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function getHint(puzzleId: string, grid: number[][]): Promise<HintResponse> {
  try {
    const response = await apiClient.post('/sudoku/hint', {
      puzzle_id: puzzleId,
      grid
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function checkSolution(puzzleId: string, grid: number[][]): Promise<CheckSolutionResponse> {
  try {
    const response = await apiClient.post('/sudoku/check', {
      puzzle_id: puzzleId,
      grid
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function revealSolution(puzzleId: string): Promise<number[][]> {
  try {
    const response = await apiClient.post('/sudoku/reveal', {
      puzzle_id: puzzleId
    })
    return response.data.solution
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function getConstraintsGuide(): Promise<ConstraintsGuideResponse> {
  try {
    const response = await apiClient.get('/sudoku/constraints-guide')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
