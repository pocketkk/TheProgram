/**
 * GateCircle - Reusable gate display component
 *
 * Renders a numbered circle representing a Human Design gate.
 * Color indicates activation type (personality/design/both/none).
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import type { GateCircleProps } from '../types'

export const GateCircle: React.FC<GateCircleProps> = ({
  gate,
  x,
  y,
  activation,
  size = SIZES.gateCircle,
  onClick,
  isHighlighted = false,
}) => {
  const isActive = activation !== 'none'

  // Determine colors based on activation
  const fillColor = isActive
    ? activation === 'personality'
      ? COLORS.personalityGate
      : activation === 'design'
      ? COLORS.designGate
      : COLORS.bothGate
    : COLORS.inactiveGateFill

  const strokeColor = isActive
    ? activation === 'personality'
      ? COLORS.personalityGate
      : activation === 'design'
      ? COLORS.designGate
      : COLORS.bothGate
    : COLORS.inactiveGateStroke

  const textColor = isActive ? COLORS.gateText : COLORS.gateTextInactive
  const fontSize = size >= SIZES.gateCircle ? SIZES.gateFont : SIZES.gateFontSmall
  const strokeWidth = isHighlighted ? 2.5 : isActive ? 1.5 : 1

  return (
    <g
      onClick={onClick}
      cursor={onClick ? 'pointer' : 'default'}
      className="gate-circle"
    >
      {/* Highlight glow */}
      {isHighlighted && (
        <circle
          cx={x}
          cy={y}
          r={size + 3}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          opacity={0.5}
        />
      )}

      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={size}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Gate number */}
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={fontSize}
        fontWeight={isActive ? 700 : 500}
        style={{ pointerEvents: 'none' }}
      >
        {gate}
      </text>
    </g>
  )
}

export default GateCircle
