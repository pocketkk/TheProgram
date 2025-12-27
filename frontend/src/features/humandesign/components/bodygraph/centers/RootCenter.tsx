/**
 * RootCenter - Square (Pressure/Adrenaline center) with gates inside
 * Gates: 58, 38, 54, 52, 60, 53, 19, 39, 41
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const ROOT_GATES = [58, 38, 54, 52, 60, 53, 19, 39, 41] as const

const SIZE = 70

// Gates positioned at the EDGES for channel connections
const GATE_POSITIONS: Record<number, Position> = {
  // Top edge - gates connecting to Sacral (y at boundary)
  53: { x: -18, y: -35 },
  60: { x: 0, y: -35 },
  52: { x: 18, y: -35 },
  // Left edge - gates connecting to Spleen (x at boundary)
  54: { x: -35, y: -12 },
  38: { x: -35, y: 4 },
  58: { x: -35, y: 20 },
  // Right edge - gates connecting to Solar Plexus (x at boundary)
  19: { x: 35, y: -12 },
  39: { x: 35, y: 4 },
  41: { x: 35, y: 20 },
}

export const RootCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  return (
    <g transform={`translate(${x}, ${y})`} className="root-center">
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
      {ROOT_GATES.map((gate) => {
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

export const getRootGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default RootCenter
