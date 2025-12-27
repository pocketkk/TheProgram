/**
 * ChannelLine - Draws a curved channel between two gate positions
 */
import React from 'react'
import { COLORS, SIZES } from '../constants'
import type { Position, GateActivationType } from '../types'

interface ChannelLineProps {
  startPos: Position
  endPos: Position
  isActive: boolean
  activationType: GateActivationType
  isHighlighted?: boolean
  onClick?: () => void
}

export const ChannelLine: React.FC<ChannelLineProps> = ({
  startPos,
  endPos,
  isActive,
  activationType,
  isHighlighted = false,
  onClick,
}) => {
  // Calculate control points for a smooth curve
  const dx = endPos.x - startPos.x
  const dy = endPos.y - startPos.y
  const midX = (startPos.x + endPos.x) / 2
  const midY = (startPos.y + endPos.y) / 2

  // Determine curve direction based on relative positions
  let ctrlX = midX
  let ctrlY = midY

  // Add slight curve for visual appeal (deterministic)
  // Vertical channels: curve based on which side of center
  if (Math.abs(dx) < 30) {
    // Use start position to determine consistent curve direction
    ctrlX = midX + (startPos.x < 180 ? -6 : 6)
  }
  // Diagonal channels: smooth curve outward
  else {
    const curveOffset = Math.min(Math.abs(dx) * 0.15, 20)
    ctrlX = midX + (dx > 0 ? curveOffset : -curveOffset)
    ctrlY = midY - Math.abs(dy) * 0.1
  }

  const pathD = `M ${startPos.x} ${startPos.y} Q ${ctrlX} ${ctrlY} ${endPos.x} ${endPos.y}`

  // Determine colors
  const color = !isActive
    ? COLORS.inactiveChannel
    : activationType === 'personality'
    ? COLORS.personalityChannel
    : activationType === 'design'
    ? COLORS.designChannel
    : COLORS.bothChannel

  const strokeWidth = isActive
    ? isHighlighted
      ? SIZES.channelStroke + 2
      : SIZES.channelStroke
    : SIZES.channelStrokeInactive

  const opacity = isActive ? 1 : 0.4

  return (
    <g onClick={onClick} cursor={onClick ? 'pointer' : 'default'}>
      {/* Glow effect for active/highlighted channels */}
      {isActive && (
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 6}
          strokeLinecap="round"
          opacity={0.2}
        />
      )}

      {/* Main channel line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
    </g>
  )
}

export default ChannelLine
