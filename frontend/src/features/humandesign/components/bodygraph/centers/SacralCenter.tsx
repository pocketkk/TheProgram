/**
 * SacralCenter - Square (Life force/Sexuality center) with gates inside
 * Gates: 5, 14, 29, 27, 34, 59, 42, 3, 9
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const SACRAL_GATES = [5, 14, 29, 27, 34, 59, 42, 3, 9] as const

const SIZE = 70

// Gates positioned at the EDGES for channel connections
const GATE_POSITIONS: Record<number, Position> = {
  // Top edge - gates connecting to G Center (y at boundary)
  5: { x: -22, y: -35 },
  14: { x: 0, y: -35 },
  29: { x: 22, y: -35 },
  // Left edge - gates connecting to Spleen
  34: { x: -35, y: -8 },
  27: { x: -35, y: 12 },
  // Right edge - gates connecting to Solar Plexus
  59: { x: 35, y: 0 },
  // Bottom edge - gates connecting to Root (y at boundary)
  42: { x: -22, y: 35 },
  3: { x: 0, y: 35 },
  9: { x: 22, y: 35 },
}

export const SacralCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  return (
    <g transform={`translate(${x}, ${y})`} className="sacral-center">
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
      {SACRAL_GATES.map((gate) => {
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

export const getSacralGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default SacralCenter
