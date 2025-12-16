/**
 * Interactive Sudoku Grid Component
 *
 * Features:
 * - 9x9 grid with box boundaries
 * - Multi-cell drag selection
 * - Corner marks (pencil marks in corners)
 * - Center marks (candidates in center)
 * - Visual constraint overlays
 * - Cell selection and highlighting
 * - Error highlighting
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import type { Constraint, CellSelection, SolutionError, MarkMode } from '../types'
import { CONSTRAINT_COLORS } from '../types'

// Marks stored as a map of "row-col" -> Set of candidate digits
export type CellMarks = Map<string, Set<number>>

interface SudokuGridProps {
  grid: number[][]
  originalGrid: number[][]  // For identifying fixed cells
  constraints: Constraint[]
  selectedCells: Set<string>  // Set of "row-col" strings
  onCellSelect: (row: number, col: number, addToSelection?: boolean) => void
  onSelectionChange: (cells: Set<string>) => void
  onCellInput: (value: number) => void
  cornerMarks: CellMarks  // Corner pencil marks
  centerMarks: CellMarks  // Center candidate marks
  onMarkToggle: (cells: Set<string>, value: number, markType: 'corner' | 'center') => void
  markMode: MarkMode
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
  selectedCells,
  onCellSelect,
  onSelectionChange,
  onCellInput,
  cornerMarks,
  centerMarks,
  onMarkToggle,
  markMode,
  errors = [],
  highlightedCells = [],
  isComplete = false
}: SudokuGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null)

  // Get cell from mouse position
  const getCellFromPoint = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const col = Math.floor(x / CELL_SIZE)
    const row = Math.floor(y / CELL_SIZE)
    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      return { row, col }
    }
    return null
  }, [])

  // Get cells in rectangle between two points
  const getCellsInRect = useCallback((start: { row: number; col: number }, end: { row: number; col: number }): Set<string> => {
    const cells = new Set<string>()
    const minRow = Math.min(start.row, end.row)
    const maxRow = Math.max(start.row, end.row)
    const minCol = Math.min(start.col, end.col)
    const maxCol = Math.max(start.col, end.col)

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        cells.add(`${r}-${c}`)
      }
    }
    return cells
  }, [])

  // Mouse handlers for drag selection
  const handleMouseDown = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()

    // Shift+click to add to selection
    if (e.shiftKey && selectedCells.size > 0) {
      onCellSelect(row, col, true)
    } else {
      // Start new selection
      setIsDragging(true)
      setDragStart({ row, col })
      onSelectionChange(new Set([`${row}-${col}`]))
    }
  }, [selectedCells, onCellSelect, onSelectionChange])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return

    const cell = getCellFromPoint(e.clientX, e.clientY)
    if (cell) {
      const newSelection = getCellsInRect(dragStart, cell)
      onSelectionChange(newSelection)
    }
  }, [isDragging, dragStart, getCellFromPoint, getCellsInRect, onSelectionChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
  }, [])

  // Global mouse up to handle drag ending outside grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setDragStart(null)
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  // Get first selected cell for keyboard navigation
  const getFirstSelectedCell = useCallback((): CellSelection => {
    if (selectedCells.size === 0) return null
    const first = Array.from(selectedCells)[0]
    const [row, col] = first.split('-').map(Number)
    return { row, col }
  }, [selectedCells])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const firstCell = getFirstSelectedCell()
      if (!firstCell) return

      const { row, col } = firstCell

      // Number input (1-9)
      if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key)

        if (markMode === 'corner' || (markMode === 'digit' && e.shiftKey)) {
          // Corner marks - only on empty cells
          const validCells = new Set<string>()
          selectedCells.forEach(key => {
            const [r, c] = key.split('-').map(Number)
            if (originalGrid[r][c] === 0 && grid[r][c] === 0) {
              validCells.add(key)
            }
          })
          if (validCells.size > 0) {
            onMarkToggle(validCells, num, 'corner')
          }
        } else if (markMode === 'center' || (markMode === 'digit' && e.ctrlKey)) {
          // Center marks - only on empty cells
          const validCells = new Set<string>()
          selectedCells.forEach(key => {
            const [r, c] = key.split('-').map(Number)
            if (originalGrid[r][c] === 0 && grid[r][c] === 0) {
              validCells.add(key)
            }
          })
          if (validCells.size > 0) {
            onMarkToggle(validCells, num, 'center')
          }
        } else {
          // Normal digit input - only if single cell selected
          if (selectedCells.size === 1 && originalGrid[row][col] === 0) {
            onCellInput(num)
          }
        }
        e.preventDefault()
      }
      // Clear cell
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        if (selectedCells.size === 1 && originalGrid[row][col] === 0) {
          onCellInput(0)
        }
        e.preventDefault()
      }
      // Arrow navigation
      else if (e.key === 'ArrowUp' && row > 0) {
        onSelectionChange(new Set([`${row - 1}-${col}`]))
        e.preventDefault()
      }
      else if (e.key === 'ArrowDown' && row < 8) {
        onSelectionChange(new Set([`${row + 1}-${col}`]))
        e.preventDefault()
      }
      else if (e.key === 'ArrowLeft' && col > 0) {
        onSelectionChange(new Set([`${row}-${col - 1}`]))
        e.preventDefault()
      }
      else if (e.key === 'ArrowRight' && col < 8) {
        onSelectionChange(new Set([`${row}-${col + 1}`]))
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCells, originalGrid, grid, onCellInput, onSelectionChange, onMarkToggle, markMode, getFirstSelectedCell])

  // Get marks for a cell
  const getCellCornerMarks = useCallback((row: number, col: number): Set<number> => {
    return cornerMarks.get(`${row}-${col}`) || new Set()
  }, [cornerMarks])

  const getCellCenterMarks = useCallback((row: number, col: number): Set<number> => {
    return centerMarks.get(`${row}-${col}`) || new Set()
  }, [centerMarks])

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

  // Check if cell is in same row/col/box as any selected cell
  const isRelated = useCallback((row: number, col: number) => {
    if (selectedCells.size === 0) return false
    if (selectedCells.has(`${row}-${col}`)) return false

    for (const key of selectedCells) {
      const [sr, sc] = key.split('-').map(Number)

      // Same row or column
      if (row === sr || col === sc) return true

      // Same box
      const boxRow = Math.floor(row / 3)
      const boxCol = Math.floor(col / 3)
      const sBoxRow = Math.floor(sr / 3)
      const sBoxCol = Math.floor(sc / 3)
      if (boxRow === sBoxRow && boxCol === sBoxCol) return true
    }
    return false
  }, [selectedCells])

  // Render corner marks (small digits in corners)
  const renderCornerMarks = (marks: Set<number>) => {
    if (marks.size === 0) return null

    // Position marks in corners: TL, TR, BL, BR, then middle positions if needed
    const positions = [
      { top: '1px', left: '2px' },      // 1 - top-left
      { top: '1px', right: '2px' },     // 2 - top-right
      { bottom: '1px', left: '2px' },   // 3 - bottom-left
      { bottom: '1px', right: '2px' },  // 4 - bottom-right
      { top: '1px', left: '50%', transform: 'translateX(-50%)' },     // 5 - top-center
      { bottom: '1px', left: '50%', transform: 'translateX(-50%)' },  // 6 - bottom-center
      { top: '50%', left: '2px', transform: 'translateY(-50%)' },     // 7 - left-center
      { top: '50%', right: '2px', transform: 'translateY(-50%)' },    // 8 - right-center
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } // 9 - center
    ]

    const sortedMarks = Array.from(marks).sort((a, b) => a - b)

    return (
      <>
        {sortedMarks.map((num, idx) => (
          <span
            key={num}
            className="absolute text-[9px] font-bold text-blue-400"
            style={positions[idx] || positions[0]}
          >
            {num}
          </span>
        ))}
      </>
    )
  }

  // Render center marks (candidates in center)
  const renderCenterMarks = (marks: Set<number>) => {
    if (marks.size === 0) return null

    const sortedMarks = Array.from(marks).sort((a, b) => a - b)
    const text = sortedMarks.join('')

    return (
      <span
        className="absolute text-[11px] font-medium text-amber-400"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          letterSpacing: '-0.5px'
        }}
      >
        {text}
      </span>
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

    const padding = 3

    // Create a set for quick lookup of which cells are in the cage
    const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`))

    // Check if a cell is in the cage
    const inCage = (r: number, c: number) => cellSet.has(`${r},${c}`)

    // Build path by tracing the perimeter of each cell, only drawing boundary edges
    const pathParts: string[] = []

    cells.forEach(([r, c]) => {
      const cellLeft = c * CELL_SIZE
      const cellRight = (c + 1) * CELL_SIZE
      const cellTop = r * CELL_SIZE
      const cellBottom = (r + 1) * CELL_SIZE

      // Check which edges this cell has (boundary edges only)
      const hasTop = !inCage(r - 1, c)
      const hasBottom = !inCage(r + 1, c)
      const hasLeft = !inCage(r, c - 1)
      const hasRight = !inCage(r, c + 1)

      // Top edge
      if (hasTop) {
        const padLeft = hasLeft
        const padRight = hasRight
        const startX = padLeft ? cellLeft + padding : cellLeft
        const endX = padRight ? cellRight - padding : cellRight
        const y = cellTop + padding
        pathParts.push(`M ${startX} ${y} L ${endX} ${y}`)
      }

      // Bottom edge
      if (hasBottom) {
        const padLeft = hasLeft
        const padRight = hasRight
        const startX = padLeft ? cellLeft + padding : cellLeft
        const endX = padRight ? cellRight - padding : cellRight
        const y = cellBottom - padding
        pathParts.push(`M ${startX} ${y} L ${endX} ${y}`)
      }

      // Left edge
      if (hasLeft) {
        const padTop = hasTop
        const padBottom = hasBottom
        const startY = padTop ? cellTop + padding : cellTop
        const endY = padBottom ? cellBottom - padding : cellBottom
        const x = cellLeft + padding
        pathParts.push(`M ${x} ${startY} L ${x} ${endY}`)
      }

      // Right edge
      if (hasRight) {
        const padTop = hasTop
        const padBottom = hasBottom
        const startY = padTop ? cellTop + padding : cellTop
        const endY = padBottom ? cellBottom - padding : cellBottom
        const x = cellRight - padding
        pathParts.push(`M ${x} ${startY} L ${x} ${endY}`)
      }

      // Internal L-corner connectors
      if (hasBottom && !hasLeft && inCage(r + 1, c - 1) && !inCage(r + 1, c)) {
        pathParts.push(`M ${cellLeft} ${cellBottom - padding} L ${cellLeft - padding} ${cellBottom}`)
      }
      if (hasBottom && !hasRight && inCage(r + 1, c + 1) && !inCage(r + 1, c)) {
        pathParts.push(`M ${cellRight} ${cellBottom - padding} L ${cellRight + padding} ${cellBottom}`)
      }
      if (hasTop && !hasLeft && inCage(r - 1, c - 1) && !inCage(r - 1, c)) {
        pathParts.push(`M ${cellLeft} ${cellTop + padding} L ${cellLeft - padding} ${cellTop}`)
      }
      if (hasTop && !hasRight && inCage(r - 1, c + 1) && !inCage(r - 1, c)) {
        pathParts.push(`M ${cellRight} ${cellTop + padding} L ${cellRight + padding} ${cellTop}`)
      }
      if (hasLeft && !hasTop && inCage(r - 1, c - 1) && !inCage(r, c - 1)) {
        pathParts.push(`M ${cellLeft + padding} ${cellTop} L ${cellLeft} ${cellTop - padding}`)
      }
      if (hasLeft && !hasBottom && inCage(r + 1, c - 1) && !inCage(r, c - 1)) {
        pathParts.push(`M ${cellLeft + padding} ${cellBottom} L ${cellLeft} ${cellBottom + padding}`)
      }
      if (hasRight && !hasTop && inCage(r - 1, c + 1) && !inCage(r, c + 1)) {
        pathParts.push(`M ${cellRight - padding} ${cellTop} L ${cellRight} ${cellTop - padding}`)
      }
      if (hasRight && !hasBottom && inCage(r + 1, c + 1) && !inCage(r, c + 1)) {
        pathParts.push(`M ${cellRight - padding} ${cellBottom} L ${cellRight} ${cellBottom + padding}`)
      }
    })

    // First cell for the target number (top-left most cell)
    const sortedCells = [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const firstCell = sortedCells[0]
    const targetX = firstCell[1] * CELL_SIZE + padding + 2
    const targetY = firstCell[0] * CELL_SIZE + padding + 10

    return (
      <g key={`cage-${idx}`}>
        <path
          d={pathParts.join(' ')}
          fill="none"
          strokeWidth={1.5}
          className={colors.line}
          strokeDasharray="4 2"
          strokeLinecap="square"
        />
        {constraint.target !== undefined && (
          <text
            x={targetX}
            y={targetY}
            className="fill-amber-300 text-[10px] font-bold"
            style={{ zIndex: 25 }}
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
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG for constraints - high z-index to stay above cell hover states */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={GRID_SIZE}
        height={GRID_SIZE}
        style={{ zIndex: 10 }}
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
          const isSelected = selectedCells.has(`${row}-${col}`)
          const isRelatedCell = isRelated(row, col)
          const hasCellError = hasError(row, col)
          const isCellHighlighted = isHighlighted(row, col)
          const cellCornerMarks = getCellCornerMarks(row, col)
          const cellCenterMarks = getCellCenterMarks(row, col)

          // Box borders
          const borderRight = (col + 1) % 3 === 0 && col !== 8 ? BOX_BORDER : CELL_BORDER
          const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? BOX_BORDER : CELL_BORDER

          // Calculate background color with priority order
          let bgColor = 'rgb(31, 41, 55)' // gray-800 default
          if (isRelatedCell) bgColor = 'rgba(30, 58, 138, 0.5)' // blue-900/50
          if (isSelected) bgColor = 'rgba(147, 51, 234, 0.5)' // purple-600/50
          if (hasCellError) bgColor = 'rgba(127, 29, 29, 0.5)' // red-900/50
          if (isCellHighlighted) bgColor = 'rgba(234, 179, 8, 0.4)' // yellow-500/40
          if (isComplete && !hasCellError) bgColor = 'rgba(20, 83, 45, 0.3)' // green-900/30

          return (
            <motion.div
              key={`cell-${row}-${col}`}
              onMouseDown={(e) => handleMouseDown(e, row, col)}
              className={`
                relative flex items-center justify-center
                text-2xl font-mono transition-colors cursor-pointer
                ${isFixed ? 'font-bold text-white' : 'text-purple-300'}
                ${isSelected ? 'ring-2 ring-purple-400 ring-inset' : ''}
                ${hasCellError ? 'text-red-400' : ''}
                ${isCellHighlighted ? 'animate-pulse' : ''}
              `}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRight: `${borderRight}px solid rgb(55, 65, 81)`,
                borderBottom: `${borderBottom}px solid rgb(55, 65, 81)`,
                zIndex: 2,
                backgroundColor: bgColor
              }}
              whileTap={{ scale: 0.95 }}
            >
              {value !== 0 ? (
                <span
                  className={`relative ${hasCellError ? 'text-red-400' : ''}`}
                  style={{ zIndex: 20 }}
                >
                  {value}
                </span>
              ) : (
                <div className="absolute inset-0" style={{ zIndex: 20 }}>
                  {renderCornerMarks(cellCornerMarks)}
                  {renderCenterMarks(cellCenterMarks)}
                </div>
              )}
            </motion.div>
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
