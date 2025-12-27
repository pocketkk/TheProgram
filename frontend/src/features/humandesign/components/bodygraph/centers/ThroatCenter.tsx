/**
 * ThroatCenter - Square shape with gates at perimeter edges
 * 11 gates total - positioned at the boundary for channel connections
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const THROAT_GATES = [62, 23, 56, 16, 20, 35, 12, 45, 31, 8, 33] as const

// Square size
const SIZE = 80

// Gates positioned at the EDGES of the square (at the boundary, not inside)
// This matches traditional HD charts where gates sit at channel connection points
const GATE_POSITIONS: Record<number, Position> = {
  // Top edge - gates connecting to Ajna (y at boundary)
  62: { x: -26, y: -40 },
  23: { x: 0, y: -40 },
  56: { x: 26, y: -40 },
  // Left edge - gates connecting to Spleen (x at boundary)
  16: { x: -40, y: -10 },
  20: { x: -40, y: 14 },
  // Right edge - gates connecting to Solar Plexus, Heart (x at boundary)
  35: { x: 40, y: -14 },
  12: { x: 40, y: 6 },
  45: { x: 40, y: 26 },
  // Bottom edge - gates connecting to G Center (y at boundary)
  31: { x: -26, y: 40 },
  8: { x: 0, y: 40 },
  33: { x: 26, y: 40 },
}

export const ThroatCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  return (
    <g transform={`translate(${x}, ${y})`} className="throat-center">
      <rect
        x={-SIZE / 2}
        y={-SIZE / 2}
        width={SIZE}
        height={SIZE}
        rx={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={SIZES.centerStroke}
        onClick={onCenterClick}
        cursor={onCenterClick ? 'pointer' : 'default'}
      />
      {/* Gates inside */}
      {THROAT_GATES.map((gate) => {
        const pos = GATE_POSITIONS[gate]
        const activation = gateActivations?.get(gate) || 'none'
        return (
          <GateCircle
            key={gate}
            gate={gate}
            x={pos.x}
            y={pos.y}
            activation={activation}
          />
        )
      })}
    </g>
  )
}

export const getThroatGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default ThroatCenter
