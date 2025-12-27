/**
 * AjnaCenter - Triangle pointing down with gates inside
 * Gates: 47, 24, 4 (top row), 17, 43, 11 (bottom row)
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const AJNA_GATES = [47, 24, 4, 17, 43, 11] as const

// Triangle size
const SIZE = 70
const HEIGHT = SIZE * 0.866  // ~60.6

// Gates positioned at the EDGES for channel connections
const GATE_POSITIONS: Record<number, Position> = {
  // Top edge - gates connecting to Head (at top boundary)
  47: { x: -24, y: -32 },
  24: { x: 0, y: -32 },
  4: { x: 24, y: -32 },
  // Bottom tip - gates connecting to Throat (near apex)
  17: { x: -14, y: 32 },
  43: { x: 0, y: 32 },
  11: { x: 14, y: 32 },
}

export const AjnaCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  // Triangle pointing DOWN
  const points = `${-SIZE / 2},${-HEIGHT / 2} ${SIZE / 2},${-HEIGHT / 2} 0,${HEIGHT / 2}`

  return (
    <g transform={`translate(${x}, ${y})`} className="ajna-center">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={SIZES.centerStroke}
        onClick={onCenterClick}
        cursor={onCenterClick ? 'pointer' : 'default'}
      />
      {/* Gates inside */}
      {AJNA_GATES.map((gate) => {
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

export const getAjnaGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default AjnaCenter
