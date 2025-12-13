/**
 * Interactive Sudoku Grid Component
 *
 * Features:
 * - 9x9 grid with box boundaries
 * - Keyboard input for numbers
 * - Pencil marks (candidates) support
 * - Visual constraint overlays
 * - Cell selection and highlighting
 * - Error highlighting
 */

import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Constraint, CellSelection, SolutionError } from '../types'
import { CONSTRAINT_COLORS } from '../types'

// Pencil marks stored as a map of "row-col" -> Set of candidate digits
export type PencilMarks = Map<string, Set<number>>

interface SudokuGridProps {
  grid: number[][]
  originalGrid: number[][]  // For identifying fixed cells
  constraints: Constraint[]
  selectedCell: CellSelection
  onCellSelect: (row: number, col: number) => void
  onCellInput: (value: number) => void
  pencilMarks: PencilMarks
  onPencilMarkToggle: (row: number, col: number, value: number) => void
  pencilMode: boolean
  errors?: SolutionError[]
  highlightedCells?: [number, number][]  // For hints
  isComplete?: boolean
}

const CELL_SIZE = 48
const GRID_SIZE = CELL_SIZE * 9
const BOX_BORDER = 2
const CELL_BORDER = 1

export const SudokuGrid = ({
  grid,
  originalGrid,
  constraints,
  selectedCell,
  onCellSelect,
  onCellInput,
  pencilMarks,
  onPencilMarkToggle,
  pencilMode,
  errors = [],
  highlightedCells = [],
  isComplete = false
}: SudokuGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return

      const { row, col } = selectedCell

      // Don't allow editing fixed cells
      if (originalGrid[row][col] !== 0) return

      // Number input (1-9)
      if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key)

        // Shift+number or pencil mode = toggle pencil mark
        if (e.shiftKey || pencilMode) {
          // Only allow pencil marks on empty cells
          if (grid[row][col] === 0) {
            onPencilMarkToggle(row, col, num)
          }
        } else {
          // Normal input - clear pencil marks and set value
          onCellInput(num)
        }
        e.preventDefault()
      }
      // Clear cell
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        onCellInput(0)
        e.preventDefault()
      }
      // Arrow navigation
      else if (e.key === 'ArrowUp' && row > 0) {
        onCellSelect(row - 1, col)
        e.preventDefault()
      }
      else if (e.key === 'ArrowDown' && row < 8) {
        onCellSelect(row + 1, col)
        e.preventDefault()
      }
      else if (e.key === 'ArrowLeft' && col > 0) {
        onCellSelect(row, col - 1)
        e.preventDefault()
      }
      else if (e.key === 'ArrowRight' && col < 8) {
        onCellSelect(row, col + 1)
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, originalGrid, grid, onCellInput, onCellSelect, onPencilMarkToggle, pencilMode])

  // Get pencil marks for a cell
  const getCellPencilMarks = useCallback((row: number, col: number): Set<number> => {
    return pencilMarks.get(`${row}-${col}`) || new Set()
  }, [pencilMarks])

  // Check if a cell has an error
  const hasError = useCallback((row: number, col: number) => {
    return errors.some(e =>
      e.cell && e.cell[0] === row && e.cell[1] === col
    )
  }, [errors])

  // Check if a cell is highlighted (hint)
  const isHighlighted = useCallback((row: number, col: number) => {
    return highlightedCells.some(([r, c]) => r === row && c === col)
  }, [highlightedCells])

  // Check if cell is in same row/col/box as selected
  const isRelated = useCallback((row: number, col: number) => {
    if (!selectedCell) return false
    const { row: sr, col: sc } = selectedCell
    if (row === sr && col === sc) return false

    // Same row or column
    if (row === sr || col === sc) return true

    // Same box
    const boxRow = Math.floor(row / 3)
    const boxCol = Math.floor(col / 3)
    const sBoxRow = Math.floor(sr / 3)
    const sBoxCol = Math.floor(sc / 3)
    return boxRow === sBoxRow && boxCol === sBoxCol
  }, [selectedCell])

  // Render pencil marks in a 3x3 grid
  const renderPencilMarks = (marks: Set<number>) => {
    if (marks.size === 0) return null

    return (
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <span
            key={num}
            className={`text-[10px] flex items-center justify-center
                       ${marks.has(num) ? 'text-blue-400' : 'text-transparent'}`}
          >
            {num}
          </span>
        ))}
      </div>
    )
  }

  // Render constraint overlays
  const renderConstraints = () => {
    return constraints.map((constraint, idx) => {
      const colors = CONSTRAINT_COLORS[constraint.constraint_type]
      const cells = constraint.cells

      if (cells.length < 2) return null

      if (constraint.constraint_type === 'killer_cage') {
        return renderKillerCage(constraint, idx, colors)
      }

      return renderLine(constraint, idx, colors)
    })
  }

  const renderLine = (constraint: Constraint, idx: number, colors: { line: string; fill: string }) => {
    const cells = constraint.cells
    const isWhispers = constraint.constraint_type === 'german_whispers'
    const isThermo = constraint.constraint_type === 'thermometer'

    // Calculate center points of cells
    const points = cells.map(([r, c]) => ({
      x: c * CELL_SIZE + CELL_SIZE / 2,
      y: r * CELL_SIZE + CELL_SIZE / 2
    }))

    // Build path
    const pathData = points.map((p, i) =>
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    ).join(' ')

    return (
      <g key={`constraint-${idx}`}>
        {/* Line shadow/glow */}
        <path
          d={pathData}
          fill="none"
          strokeWidth={isThermo ? 18 : 10}
          className={`${colors.line} opacity-30`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          strokeWidth={isThermo ? 12 : 6}
          className={colors.line}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={isWhispers ? '8 4' : undefined}
        />
        {/* Thermometer bulb */}
        {isThermo && points.length > 0 && (
          <circle
            cx={points[0].x}
            cy={points[0].y}
            r={14}
            className={`${colors.line} ${colors.fill}`}
            strokeWidth={3}
          />
        )}
      </g>
    )
  }

  const renderKillerCage = (constraint: Constraint, idx: number, colors: { line: string; fill: string }) => {
    const cells = constraint.cells
    if (cells.length === 0) return null

    // Create cage outline path (simplified - just outlines all cells)
    const padding = 4
    const pathParts: string[] = []

    cells.forEach(([r, c]) => {
      const x = c * CELL_SIZE + padding
      const y = r * CELL_SIZE + padding
      const w = CELL_SIZE - padding * 2
      const h = CELL_SIZE - padding * 2
      pathParts.push(`M ${x} ${y} h ${w} v ${h} h ${-w} Z`)
    })

    // First cell for the target number
    const firstCell = cells[0]
    const targetX = firstCell[1] * CELL_SIZE + 4
    const targetY = firstCell[0] * CELL_SIZE + 12

    return (
      <g key={`cage-${idx}`}>
        {/* Cage fill */}
        <path
          d={pathParts.join(' ')}
          className={colors.fill}
          strokeWidth={0}
        />
        {/* Cage outline */}
        <path
          d={pathParts.join(' ')}
          fill="none"
          strokeWidth={1.5}
          className={colors.line}
          strokeDasharray="4 2"
        />
        {/* Target sum */}
        {constraint.target !== undefined && (
          <text
            x={targetX}
            y={targetY}
            className="fill-amber-300 text-[10px] font-bold"
          >
            {constraint.target}
          </text>
        )}
      </g>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ width: GRID_SIZE, height: GRID_SIZE }}
    >
      {/* SVG for constraints */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={GRID_SIZE}
        height={GRID_SIZE}
        style={{ zIndex: 1 }}
      >
        {renderConstraints()}
      </svg>

      {/* Grid cells */}
      <div
        className="grid gap-0 bg-gray-700 rounded-lg overflow-hidden"
        style={{
          gridTemplateColumns: 'repeat(9, 1fr)',
          width: GRID_SIZE,
          height: GRID_SIZE
        }}
      >
        {Array.from({ length: 81 }).map((_, index) => {
          const row = Math.floor(index / 9)
          const col = index % 9
          const value = grid[row][col]
          const isFixed = originalGrid[row][col] !== 0
          const isSelected = selectedCell?.row === row && selectedCell?.col === col
          const isRelatedCell = isRelated(row, col)
          const hasCellError = hasError(row, col)
          const isCellHighlighted = isHighlighted(row, col)
          const cellPencilMarks = getCellPencilMarks(row, col)

          // Box borders
          const borderRight = (col + 1) % 3 === 0 && col !== 8 ? BOX_BORDER : CELL_BORDER
          const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? BOX_BORDER : CELL_BORDER

          return (
            <motion.button
              key={`cell-${row}-${col}`}
              onClick={() => onCellSelect(row, col)}
              className={`
                relative flex items-center justify-center
                text-2xl font-mono transition-colors
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                ${isFixed ? 'font-bold text-white' : 'text-purple-300'}
                ${isSelected
                  ? 'bg-purple-600/40 ring-2 ring-purple-400'
                  : isRelatedCell
                    ? 'bg-purple-900/30'
                    : 'bg-gray-800'
                }
                ${hasCellError ? 'bg-red-900/40 text-red-400' : ''}
                ${isCellHighlighted ? 'bg-yellow-500/30 animate-pulse' : ''}
                ${isComplete && !hasCellError ? 'bg-green-900/20' : ''}
              `}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRight: `${borderRight}px solid rgb(55, 65, 81)`,
                borderBottom: `${borderBottom}px solid rgb(55, 65, 81)`,
                zIndex: 2
              }}
              whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}
              whileTap={{ scale: 0.95 }}
            >
              {value !== 0 ? (
                <span className={hasCellError ? 'text-red-400' : ''}>
                  {value}
                </span>
              ) : (
                renderPencilMarks(cellPencilMarks)
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Box dividers overlay for emphasis */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={GRID_SIZE}
        height={GRID_SIZE}
        style={{ zIndex: 3 }}
      >
        {/* Vertical box lines */}
        <line x1={CELL_SIZE * 3} y1={0} x2={CELL_SIZE * 3} y2={GRID_SIZE}
          className="stroke-gray-500" strokeWidth={2} />
        <line x1={CELL_SIZE * 6} y1={0} x2={CELL_SIZE * 6} y2={GRID_SIZE}
          className="stroke-gray-500" strokeWidth={2} />
        {/* Horizontal box lines */}
        <line x1={0} y1={CELL_SIZE * 3} x2={GRID_SIZE} y2={CELL_SIZE * 3}
          className="stroke-gray-500" strokeWidth={2} />
        <line x1={0} y1={CELL_SIZE * 6} x2={GRID_SIZE} y2={CELL_SIZE * 6}
          className="stroke-gray-500" strokeWidth={2} />
      </svg>
    </div>
  )
}
