/**
 * GCenter - Diamond shape (Identity/Self) with gates inside
 * Gates: 7, 1, 13, 10, 25, 46, 2, 15
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const G_CENTER_GATES = [7, 1, 13, 10, 25, 46, 2, 15] as const

// Diamond size - needs to be large enough to fit gates inside
const SIZE = 55

// Gates positioned at the EDGES of the diamond for channel connections
const GATE_POSITIONS: Record<number, Position> = {
  // Top edge - gates connecting to Throat (along top-left and top-right edges)
  7: { x: -22, y: -40 },
  1: { x: 0, y: -55 },
  13: { x: 22, y: -40 },
  // Left edge - gates connecting to Heart, Spleen
  25: { x: -40, y: -15 },
  10: { x: -40, y: 15 },
  // Right edge - gates connecting to Sacral
  46: { x: 40, y: 0 },
  // Bottom edge - gates connecting to Sacral
  15: { x: -22, y: 40 },
  2: { x: 22, y: 40 },
}

export const GCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  // Diamond shape
  const points = `0,${-SIZE} ${SIZE},0 0,${SIZE} ${-SIZE},0`

  return (
    <g transform={`translate(${x}, ${y})`} className="g-center">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={SIZES.centerStroke}
        onClick={onCenterClick}
        cursor={onCenterClick ? 'pointer' : 'default'}
      />
      {/* Gates inside */}
      {G_CENTER_GATES.map((gate) => {
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

export const getGCenterGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default GCenter
