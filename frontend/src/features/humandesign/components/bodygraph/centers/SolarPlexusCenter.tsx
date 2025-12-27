/**
 * SolarPlexusCenter - Triangle pointing LEFT toward body center (Emotional center)
 * Gates: 22, 36, 37, 6, 49, 55, 30
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import { GateCircle } from '../shared/GateCircle'
import type { CenterProps, Position } from '../types'

export const SOLAR_PLEXUS_GATES = [22, 36, 37, 6, 49, 55, 30] as const

// Triangle dimensions - pointing LEFT (apex on left, base on right)
const SIZE = 70
const HEIGHT = SIZE * 0.866 // Equilateral triangle height ratio

// Gates positioned at triangle EDGES for channel connections
const GATE_POSITIONS: Record<number, Position> = {
  // Left apex side (toward center body) - gates at the point extending left
  // 22->12 Throat, 36->35 Throat, 37->40 Heart, 6->59 Sacral
  22: { x: -30, y: -18 },
  36: { x: -35, y: -6 },
  37: { x: -35, y: 6 },
  6: { x: -30, y: 18 },
  // Right edge (base of triangle, toward Root)
  // 49->19, 55->39, 30->41
  49: { x: 28, y: -20 },
  55: { x: 28, y: 0 },
  30: { x: 28, y: 20 },
}

export const SolarPlexusCenter: React.FC<CenterProps> = ({
  x,
  y,
  defined,
  gateActivations,
  onCenterClick,
}) => {
  const fill = defined ? COLORS.definedFill : COLORS.undefinedFill
  const stroke = defined ? COLORS.definedStroke : COLORS.undefinedStroke

  // Triangle pointing LEFT (apex on left, base/vertical edge on right)
  const points = `${-SIZE / 2},0 ${SIZE / 2},${-HEIGHT / 2} ${SIZE / 2},${HEIGHT / 2}`

  return (
    <g transform={`translate(${x}, ${y})`} className="solar-plexus-center">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={SIZES.centerStroke}
        onClick={onCenterClick}
        cursor={onCenterClick ? 'pointer' : 'default'}
      />
      {/* Gates inside */}
      {SOLAR_PLEXUS_GATES.map((gate) => {
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

export const getSolarPlexusGatePosition = (gate: number, centerX: number, centerY: number): Position | null => {
  const relPos = GATE_POSITIONS[gate]
  if (!relPos) return null
  return { x: centerX + relPos.x, y: centerY + relPos.y }
}

export default SolarPlexusCenter
