/**
 * HeadCenter - Triangle pointing up with gates inside
 * Gates: 64, 61, 63
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const HEAD_GATES = [64, 61, 63] as const

// Triangle size
const SIZE = 70
const HEIGHT = SIZE * 0.866  // ~60.6

// Gates positioned at the BOTTOM EDGE (boundary) connecting to Ajna
const GATE_POSITIONS: Record<number, Position> = {
  64: { x: -24, y: 32 },  // Left - at bottom edge
  61: { x: 0, y: 32 },    // Center - at bottom edge
  63: { x: 24, y: 32 },   // Right - at bottom edge
}

export const HeadCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  // Triangle pointing UP
  const points = `0,${-HEIGHT / 2} ${-SIZE / 2},${HEIGHT / 2} ${SIZE / 2},${HEIGHT / 2}`

  return (
    <g transform={`translate(${x}, ${y})`} className="head-center">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={SIZES.centerStroke}
        onClick={onCenterClick}
        cursor={onCenterClick ? 'pointer' : 'default'}
      />
      {/* Gates inside the triangle */}
      {HEAD_GATES.map((gate) => {
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

export const getHeadGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default HeadCenter
