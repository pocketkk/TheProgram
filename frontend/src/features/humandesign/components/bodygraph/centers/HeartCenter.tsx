/**
 * HeartCenter - Small triangle (Will/Ego center) pointing LEFT toward body center
 * Gates: 21, 51, 26, 40
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const HEART_GATES = [21, 51, 26, 40] as const

const SIZE = 50
const HEIGHT = SIZE * 0.866  // ~43

// Gates positioned at triangle EDGES for channel connections
// Triangle points LEFT - apex at left, base (vertical) on right
const GATE_POSITIONS: Record<number, Position> = {
  // Top edge - 21->45 Throat
  21: { x: 10, y: -24 },
  // Left apex - 51->25 G Center
  51: { x: -26, y: 0 },
  // Right/bottom edges - 26->44 Spleen, 40->37 Solar Plexus
  26: { x: 10, y: 8 },
  40: { x: 10, y: 24 },
}

export const HeartCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  // Triangle pointing LEFT (apex at left, base on right)
  const points = `${-SIZE / 2},0 ${SIZE / 2},${-HEIGHT / 2} ${SIZE / 2},${HEIGHT / 2}`

  return (
    <g transform={`translate(${x}, ${y})`} className="heart-center">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={SIZES.centerStroke}
        onClick={onCenterClick}
        cursor={onCenterClick ? 'pointer' : 'default'}
      />
      {/* Gates inside */}
      {HEART_GATES.map((gate) => {
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

export const getHeartGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default HeartCenter
