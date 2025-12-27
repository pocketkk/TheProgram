/**
 * SpleenCenter - Triangle pointing RIGHT toward body center (Intuition/Immune center)
 * Gates: 48, 57, 44, 50, 32, 28, 18
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const SPLEEN_GATES = [48, 57, 44, 50, 32, 28, 18] as const

// Triangle dimensions - pointing RIGHT (apex on right, base on left)
const SIZE = 70
const HEIGHT = SIZE * 0.866 // Equilateral triangle height ratio

// Gates positioned at triangle EDGES for channel connections
const GATE_POSITIONS: Record<number, Position> = {
  // Right apex side (toward center body) - gates at the point extending right
  // 48->16 Throat, 57->34/20/10, 44->26 Heart, 50->27 Sacral
  48: { x: 30, y: -18 },
  57: { x: 35, y: -6 },
  44: { x: 35, y: 6 },
  50: { x: 30, y: 18 },
  // Left edge (base of triangle, toward Root)
  // 32->54, 28->38, 18->58
  32: { x: -28, y: -20 },
  28: { x: -28, y: 0 },
  18: { x: -28, y: 20 },
}

export const SpleenCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  // Triangle pointing RIGHT (apex on right, base/vertical edge on left)
  const points = `${SIZE / 2},0 ${-SIZE / 2},${-HEIGHT / 2} ${-SIZE / 2},${HEIGHT / 2}`

  return (
    <g transform={`translate(${x}, ${y})`} className="spleen-center">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={SIZES.centerStroke}
        onClick={onCenterClick}
        cursor={onCenterClick ? 'pointer' : 'default'}
      />
      {/* Gates inside */}
      {SPLEEN_GATES.map((gate) => {
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

export const getSpleenGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default SpleenCenter
