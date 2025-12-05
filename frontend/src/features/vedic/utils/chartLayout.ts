/**
 * Vedic Chart Layout Utilities
 * SVG coordinate calculations for North and South Indian chart styles
 */

// Point type for SVG coordinates
export type Point = [number, number]

// Grid position for South Indian chart
export interface GridPosition {
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * North Indian Chart Layout
 * Diamond pattern with ascendant at top center
 *
 * Visual layout (house numbers):
 *       ┌─────┐
 *      /12\ 1 /2\
 *     /─────────\
 *    │ 11 │   │ 3 │
 *    │────│   │────│
 *    │ 10 │   │ 4 │
 *     \─────────/
 *      \9 / 7 \5/
 *       └──8──┘
 */

// Get North Indian chart house polygons for a given size
export function getNorthIndianHousePolygons(size: number): Record<number, Point[]> {
  const center = size / 2
  const unit = size / 4 // Quarter of the chart

  // House 1 is always at the top (diamond at top center)
  return {
    1: [
      [center, 0],           // Top
      [center + unit, unit], // Right
      [center, unit * 2],    // Bottom
      [center - unit, unit], // Left
    ],
    2: [
      [center + unit, unit], // Left point
      [size, 0],             // Top right corner
      [size, unit * 2],      // Bottom right
      [center + unit * 2, unit * 2], // Bottom left
    ],
    3: [
      [size, unit * 2],      // Top
      [size, center],        // Right
      [center + unit * 2, center], // Center
      [center + unit * 2, unit * 2], // Back up
    ],
    4: [
      [size, center],        // Top
      [size, unit * 3],      // Bottom right
      [center + unit * 2, unit * 3], // Bottom
      [center + unit * 2, center], // Back up
    ],
    5: [
      [size, unit * 3],      // Top right
      [size, size],          // Bottom right corner
      [center + unit, unit * 3], // Left point
      [center + unit * 2, unit * 3], // Back
    ],
    6: [
      [center + unit, unit * 3], // Top
      [size, size],          // Right corner
      [center, size],        // Bottom center
      [center, unit * 2 + unit], // Up to center
    ],
    7: [
      [center, size],        // Bottom
      [center - unit, unit * 3], // Left
      [center, unit * 2],    // Top
      [center + unit, unit * 3], // Right
    ],
    8: [
      [center - unit, unit * 3], // Right point
      [center, size],        // Bottom
      [0, size],             // Bottom left corner
      [0, unit * 3],         // Up
    ],
    9: [
      [0, unit * 3],         // Top
      [center - unit * 2, unit * 3], // Right
      [center - unit * 2, center], // Center
      [0, center],           // Left
    ],
    10: [
      [0, center],           // Top
      [center - unit * 2, center], // Right
      [center - unit * 2, unit * 2], // Bottom right
      [0, unit * 2],         // Left
    ],
    11: [
      [0, unit * 2],         // Bottom
      [center - unit * 2, unit * 2], // Right
      [center - unit, unit], // Top right
      [0, 0],                // Top left corner
    ],
    12: [
      [center - unit, unit], // Right point
      [center, 0],           // Top
      [0, 0],                // Top left corner
      [0, unit * 2],         // Bottom
    ],
  }
}

// Get center point for each North Indian house (for planet placement)
export function getNorthIndianHouseCenters(size: number): Record<number, Point> {
  const center = size / 2
  const unit = size / 4
  const smallOffset = unit * 0.5
  const largeOffset = unit * 1.5

  return {
    1: [center, unit],                           // Top center diamond
    2: [center + largeOffset, smallOffset + unit * 0.3],  // Top right
    3: [size - smallOffset, center - unit * 0.5], // Right upper
    4: [size - smallOffset, center + unit * 0.5], // Right lower
    5: [center + largeOffset, size - smallOffset - unit * 0.3], // Bottom right
    6: [center + unit * 0.5, size - unit],       // Bottom right of center
    7: [center, size - unit],                    // Bottom center diamond
    8: [center - unit * 0.5, size - unit],       // Bottom left of center
    9: [smallOffset, center + unit * 0.5],       // Left lower
    10: [smallOffset, center - unit * 0.5],      // Left upper
    11: [center - largeOffset, smallOffset + unit * 0.3], // Top left
    12: [center - unit * 0.5, unit],             // Left of house 1
  }
}

/**
 * South Indian Chart Layout
 * Fixed 4x4 grid with 12 outer cells for signs
 * Signs are fixed; Aries is always at row 0, col 1
 *
 * Grid layout (sign positions - 0-indexed):
 * ┌────┬────┬────┬────┐
 * │ 11 │  0 │  1 │  2 │   (Pi, Ar, Ta, Ge)
 * ├────┼────┴────┼────┤
 * │ 10 │        │  3 │   (Aq,      , Ca)
 * ├────┤        ├────┤
 * │  9 │        │  4 │   (Cap,     , Le)
 * ├────┼────┬────┼────┤
 * │  8 │  7 │  6 │  5 │   (Sg, Sc, Li, Vi)
 * └────┴────┴────┴────┘
 */

// Fixed sign positions in South Indian chart (sign index -> grid position)
export const SOUTH_INDIAN_SIGN_GRID: Record<number, { row: number; col: number }> = {
  0: { row: 0, col: 1 },  // Aries
  1: { row: 0, col: 2 },  // Taurus
  2: { row: 0, col: 3 },  // Gemini
  3: { row: 1, col: 3 },  // Cancer
  4: { row: 2, col: 3 },  // Leo
  5: { row: 3, col: 3 },  // Virgo
  6: { row: 3, col: 2 },  // Libra
  7: { row: 3, col: 1 },  // Scorpio
  8: { row: 3, col: 0 },  // Sagittarius
  9: { row: 2, col: 0 },  // Capricorn
  10: { row: 1, col: 0 }, // Aquarius
  11: { row: 0, col: 0 }, // Pisces
}

// Get South Indian grid cell positions for a given size
export function getSouthIndianCells(size: number): Record<number, GridPosition> {
  const cellWidth = size / 4
  const cellHeight = size / 4
  const cells: Record<number, GridPosition> = {}

  for (const [signIndex, pos] of Object.entries(SOUTH_INDIAN_SIGN_GRID)) {
    const index = parseInt(signIndex)
    cells[index] = {
      row: pos.row,
      col: pos.col,
      x: pos.col * cellWidth,
      y: pos.row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    }
  }

  return cells
}

// Get center point for each South Indian cell (for labels and planets)
export function getSouthIndianCellCenters(size: number): Record<number, Point> {
  const cells = getSouthIndianCells(size)
  const centers: Record<number, Point> = {}

  for (const [signIndex, cell] of Object.entries(cells)) {
    centers[parseInt(signIndex)] = [
      cell.x + cell.width / 2,
      cell.y + cell.height / 2,
    ]
  }

  return centers
}

// Convert polygon points to SVG path string
export function polygonToPath(points: Point[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  return `M ${first[0]},${first[1]} ${rest.map(p => `L ${p[0]},${p[1]}`).join(' ')} Z`
}

// Get SVG rect attributes for South Indian cell
export function getCellRect(cell: GridPosition): { x: number; y: number; width: number; height: number } {
  return {
    x: cell.x,
    y: cell.y,
    width: cell.width,
    height: cell.height,
  }
}

// Calculate planet positions within a cell (handles multiple planets)
export function getPlanetPositionsInCell(
  cellCenter: Point,
  planetCount: number,
  cellWidth: number
): Point[] {
  if (planetCount === 0) return []
  if (planetCount === 1) return [cellCenter]

  const positions: Point[] = []
  const spacing = cellWidth * 0.35
  const startX = cellCenter[0] - (spacing * (planetCount - 1)) / 2
  const y = cellCenter[1] + cellWidth * 0.15 // Slightly below center

  for (let i = 0; i < planetCount; i++) {
    positions.push([startX + i * spacing, y])
  }

  return positions
}

// Get house number display position (top-left corner of cell)
export function getHouseNumberPosition(cell: GridPosition): Point {
  return [cell.x + 4, cell.y + 14]
}

// Get sign label position (top area of cell)
export function getSignLabelPosition(cell: GridPosition): Point {
  return [cell.x + cell.width / 2, cell.y + 14]
}
