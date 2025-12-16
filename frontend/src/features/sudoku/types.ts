/**
 * Types for the Sudoku feature
 */

export type ConstraintType = 'renban' | 'german_whispers' | 'killer_cage' | 'thermometer' | 'between_line' | 'arrow'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type CellSelection = { row: number; col: number } | null
export type MultiCellSelection = Set<string>  // Set of "row-col" strings
export type MarkMode = 'digit' | 'corner' | 'center'  // Normal input, corner pencil marks, center candidates

export interface Constraint {
  constraint_type: ConstraintType
  cells: [number, number][]
  target?: number
  source_aspect?: string
  planets?: string[]
  description?: string
}

export interface SudokuPuzzle {
  grid: number[][]
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

export interface HintInfo {
  cell: [number, number]
  value: number
  technique: string
  explanation: string
}

export interface SolutionError {
  cell?: [number, number]
  type: string
  message?: string
}

// Constraint colors for visualization
export const CONSTRAINT_COLORS: Record<ConstraintType, { line: string; fill: string; label: string }> = {
  renban: {
    line: 'stroke-purple-400',
    fill: 'fill-purple-500/20',
    label: 'Renban'
  },
  german_whispers: {
    line: 'stroke-green-400',
    fill: 'fill-green-500/20',
    label: 'Whispers'
  },
  killer_cage: {
    line: 'stroke-amber-400',
    fill: 'fill-amber-500/20',
    label: 'Cage'
  },
  thermometer: {
    line: 'stroke-gray-400',
    fill: 'fill-gray-500/30',
    label: 'Thermo'
  },
  between_line: {
    line: 'stroke-cyan-400',
    fill: 'fill-cyan-500/20',
    label: 'Between'
  },
  arrow: {
    line: 'stroke-rose-400',
    fill: 'fill-rose-500/20',
    label: 'Arrow'
  }
}
