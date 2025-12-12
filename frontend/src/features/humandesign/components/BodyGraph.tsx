/**
 * Body Graph SVG visualization - Sacred Geometry Edition
 *
 * An ethereal, bioluminescent visualization of the Human Design body graph.
 * Energy flows like rivers of light through defined channels.
 * Centers pulse with life. Gates mark the doorways of consciousness.
 */
import React, { useMemo } from 'react'
import { useHDStore } from '../stores/hdStore'
import {
  BODYGRAPH_LAYOUT,
  CHANNEL_CONNECTIONS,
  GATE_POSITIONS,
} from '../types'
import type { CenterDefinition, ChannelDefinition, GateActivation } from '../types'

interface BodyGraphProps {
  className?: string
}

// Center visual configuration with intelligent label positioning (compact sizes)
const CENTER_CONFIG: Record<string, {
  shape: 'triangle' | 'triangle_down' | 'square' | 'diamond' | 'crown'
  size: number
  label: string
  labelPosition: 'below' | 'left' | 'right'  // Preferred position relative to center
  labelOffset: number  // Base offset from center edge
}> = {
  head: { shape: 'crown', size: 28, label: 'Head', labelPosition: 'right', labelOffset: 22 },
  ajna: { shape: 'triangle_down', size: 26, label: 'Ajna', labelPosition: 'right', labelOffset: 20 },
  throat: { shape: 'square', size: 26, label: 'Throat', labelPosition: 'right', labelOffset: 22 },
  g_center: { shape: 'diamond', size: 30, label: 'G', labelPosition: 'right', labelOffset: 24 },
  heart: { shape: 'triangle', size: 22, label: 'Heart', labelPosition: 'left', labelOffset: 18 },
  sacral: { shape: 'square', size: 28, label: 'Sacral', labelPosition: 'below', labelOffset: 24 },
  solar_plexus: { shape: 'triangle', size: 24, label: 'Solar Plexus', labelPosition: 'right', labelOffset: 20 },
  spleen: { shape: 'triangle', size: 24, label: 'Spleen', labelPosition: 'left', labelOffset: 20 },
  root: { shape: 'square', size: 28, label: 'Root', labelPosition: 'below', labelOffset: 24 },
}

// Custom bezier paths for channels - designed to flow naturally around the body
// Format: { offset, curve, tension, gateOffset } - gateOffset positions gates further from centers
const CHANNEL_PATHS: Record<string, {
  offset?: number
  curve?: 'left' | 'right' | 'none'
  tension?: number
  gateOffset?: number  // Distance from center for gate markers (default 18)
}> = {
  // Head to Ajna - fan out slightly
  '64-47': { offset: -12, curve: 'left', gateOffset: 14 },
  '61-24': { offset: 0, curve: 'none', gateOffset: 14 },
  '63-4': { offset: 12, curve: 'right', gateOffset: 14 },
  // Ajna to Throat - spread gates to avoid overlap
  '17-62': { offset: -15, curve: 'left', gateOffset: 16 },
  '43-23': { offset: 0, curve: 'none', gateOffset: 16 },
  '11-56': { offset: 15, curve: 'right', gateOffset: 16 },
  // Throat to G Center - spread wide to avoid congestion
  '8-1': { offset: -20, curve: 'left', tension: 0.3, gateOffset: 20 },
  '31-7': { offset: -8, curve: 'left', gateOffset: 18 },
  '33-13': { offset: 8, curve: 'right', gateOffset: 18 },
  '20-10': { offset: 20, curve: 'right', tension: 0.3, gateOffset: 20 },
  // Throat to Heart - curve wide left
  '45-21': { offset: -25, curve: 'left', tension: 0.5, gateOffset: 18 },
  // Throat to Solar Plexus - curve right around G center (moderate curve)
  '35-36': { offset: 35, curve: 'right', tension: 0.5, gateOffset: 20 },
  '12-22': { offset: 42, curve: 'right', tension: 0.5, gateOffset: 22 },
  // Throat to Spleen - curve WIDE left
  '16-48': { offset: -55, curve: 'left', tension: 0.65, gateOffset: 24 },
  '20-57': { offset: -45, curve: 'left', tension: 0.7, gateOffset: 22 },
  // Throat to Sacral - curve to avoid G
  '20-34': { offset: -15, curve: 'left', tension: 0.3, gateOffset: 22 },
  // G to Heart - curve left
  '25-51': { offset: -20, curve: 'left', tension: 0.4, gateOffset: 16 },
  // G to Sacral - spread out
  '15-5': { offset: -15, curve: 'left', gateOffset: 22 },
  '2-14': { offset: 0, curve: 'none', gateOffset: 20 },
  '46-29': { offset: 15, curve: 'right', gateOffset: 22 },
  // G to Spleen - curve wide left
  '10-57': { offset: -35, curve: 'left', tension: 0.5, gateOffset: 20 },
  // Heart to Spleen
  '26-44': { offset: -10, curve: 'left', gateOffset: 16 },
  '44-26': { offset: -10, curve: 'left', gateOffset: 16 },
  // Heart to Solar Plexus - wide curve underneath
  '40-37': { offset: 45, curve: 'right', tension: 0.6, gateOffset: 22 },
  '37-40': { offset: 45, curve: 'right', tension: 0.6, gateOffset: 22 },
  // Sacral to Solar Plexus - curve right
  '59-6': { offset: 25, curve: 'right', tension: 0.4, gateOffset: 18 },
  // Sacral to Spleen - curve left
  '27-50': { offset: -30, curve: 'left', tension: 0.4, gateOffset: 20 },
  '34-57': { offset: -25, curve: 'left', tension: 0.5, gateOffset: 20 },
  // Sacral to Root - spread out
  '3-60': { offset: -18, curve: 'left', gateOffset: 20 },
  '9-52': { offset: 0, curve: 'none', gateOffset: 18 },
  '42-53': { offset: 18, curve: 'right', gateOffset: 20 },
  '5-15': { offset: 0, curve: 'none', gateOffset: 18 },
  // Solar Plexus to Root - curve right
  '49-19': { offset: 30, curve: 'right', tension: 0.5, gateOffset: 20 },
  '55-39': { offset: 22, curve: 'right', tension: 0.4, gateOffset: 18 },
  '30-41': { offset: 14, curve: 'right', tension: 0.3, gateOffset: 18 },
  // Spleen to Root - curve left
  '54-32': { offset: -14, curve: 'left', tension: 0.3, gateOffset: 18 },
  '28-38': { offset: -22, curve: 'left', tension: 0.4, gateOffset: 18 },
  '18-58': { offset: -30, curve: 'left', tension: 0.5, gateOffset: 20 },
}

// Center collision radii (how far paths should stay from centers)
const CENTER_COLLISION_RADIUS: Record<string, number> = {
  head: 18,
  ajna: 16,
  throat: 18,
  g_center: 22,
  heart: 14,
  sacral: 18,
  solar_plexus: 16,
  spleen: 16,
  root: 18,
}

// Sample a point on a cubic Bezier curve at parameter t
const sampleBezier = (
  t: number,
  x1: number, y1: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  x2: number, y2: number
): { x: number; y: number } => {
  const mt = 1 - t
  return {
    x: mt * mt * mt * x1 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x2,
    y: mt * mt * mt * y1 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y2
  }
}

// Check if a path passes through any center (excluding endpoints)
const checkPathCenterCollision = (
  x1: number, y1: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  x2: number, y2: number,
  endpointCenters: [string, string]
): { collides: boolean; center: string | null; direction: 'left' | 'right' | null } => {
  // Sample the path at multiple points
  const samples = 10

  for (let i = 1; i < samples; i++) {
    const t = i / samples
    const point = sampleBezier(t, x1, y1, cx1, cy1, cx2, cy2, x2, y2)

    // Check against all centers except endpoints
    for (const [centerName, centerPos] of Object.entries(BODYGRAPH_LAYOUT.centers)) {
      if (endpointCenters.includes(centerName)) continue

      const radius = CENTER_COLLISION_RADIUS[centerName] || 16
      const dx = point.x - centerPos.x
      const dy = point.y - centerPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < radius) {
        // Determine which direction to push based on center position relative to path
        const midX = (x1 + x2) / 2
        const direction = centerPos.x < midX ? 'right' : 'left'
        return { collides: true, center: centerName, direction }
      }
    }
  }

  return { collides: false, center: null, direction: null }
}

// Generate smooth bezier path for a channel with center collision avoidance
const generateChannelPath = (
  x1: number, y1: number,
  x2: number, y2: number,
  channelId: string,
  endpointCenters: [string, string] = ['', '']
): string => {
  const config = CHANNEL_PATHS[channelId] || { offset: 0, curve: 'none', tension: 0.3 }
  let { offset = 0, curve = 'none', tension = 0.3 } = config

  // Calculate direction and perpendicular
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len === 0) return `M ${x1} ${y1} L ${x2} ${y2}`

  // Unit vectors
  const ux = dx / len
  const uy = dy / len
  const px = -uy // perpendicular
  const py = ux

  // For straight paths, check if we need to curve to avoid centers
  if (curve === 'none' && offset === 0) {
    // Check if straight line would pass through any center
    const ctrl1X = x1 + dx * 0.25
    const ctrl1Y = y1 + dy * 0.25
    const ctrl2X = x1 + dx * 0.75
    const ctrl2Y = y1 + dy * 0.75

    const collision = checkPathCenterCollision(
      x1, y1, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, x2, y2, endpointCenters
    )

    if (!collision.collides) {
      return `M ${x1} ${y1} L ${x2} ${y2}`
    }

    // Need to curve around - set initial curve direction
    curve = collision.direction || 'left'
    offset = collision.direction === 'left' ? -20 : 20
    tension = 0.4
  }

  // Iteratively increase offset until path clears all centers
  const maxIterations = 8
  const offsetIncrement = 15

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const curveOffset = offset + (curve === 'left' ? -15 : curve === 'right' ? 15 : 0)
    const perpOffset = curveOffset * (1 + tension)

    const ctrl1X = x1 + dx * 0.25 + px * perpOffset * 0.5
    const ctrl1Y = y1 + dy * 0.25 + py * perpOffset * 0.5
    const ctrl2X = x1 + dx * 0.75 + px * perpOffset * 0.5
    const ctrl2Y = y1 + dy * 0.75 + py * perpOffset * 0.5

    const collision = checkPathCenterCollision(
      x1, y1, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, x2, y2, endpointCenters
    )

    if (!collision.collides) {
      return `M ${x1} ${y1} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${x2} ${y2}`
    }

    // Increase offset in the current direction
    if (curve === 'left') {
      offset -= offsetIncrement
    } else {
      offset += offsetIncrement
    }
  }

  // Return best effort path after max iterations
  const curveOffset = offset + (curve === 'left' ? -15 : curve === 'right' ? 15 : 0)
  const perpOffset = curveOffset * (1 + tension)

  const ctrl1X = x1 + dx * 0.25 + px * perpOffset * 0.5
  const ctrl1Y = y1 + dy * 0.25 + py * perpOffset * 0.5
  const ctrl2X = x1 + dx * 0.75 + px * perpOffset * 0.5
  const ctrl2Y = y1 + dy * 0.75 + py * perpOffset * 0.5

  return `M ${x1} ${y1} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${x2} ${y2}`
}

// Gates displayed inside/around each center - ONLY shows activated gates for clean visualization
const CenterGates: React.FC<{
  center: string
  x: number
  y: number
  gates: number[]
  activeGates: Map<number, 'personality' | 'design' | 'both'>
  centerSize: number
}> = ({ x, y, gates, activeGates, centerSize }) => {
  // Filter to only activated gates for this center
  const activatedGates = gates.filter(gate => activeGates.has(gate))
  const gateCount = activatedGates.length

  if (gateCount === 0) return null

  // Position gates based on how many are activated (much cleaner layout)
  const getGatePosition = (index: number): { gx: number; gy: number } => {
    if (gateCount === 1) {
      // Single gate - center it
      return { gx: x, gy: y }
    } else if (gateCount <= 3) {
      // Small number - arrange in a tight cluster
      const radius = centerSize * 0.25
      const angle = -90 + (index / gateCount) * 360
      const rad = (angle * Math.PI) / 180
      return { gx: x + Math.cos(rad) * radius, gy: y + Math.sin(rad) * radius }
    } else if (gateCount <= 5) {
      // Medium number - one ring
      const radius = centerSize * 0.32
      const angle = -90 + (index / gateCount) * 360
      const rad = (angle * Math.PI) / 180
      return { gx: x + Math.cos(rad) * radius, gy: y + Math.sin(rad) * radius }
    } else {
      // More gates - center one + outer ring
      if (index === 0) {
        return { gx: x, gy: y }
      }
      const radius = centerSize * 0.38
      const angle = -90 + ((index - 1) / (gateCount - 1)) * 360
      const rad = (angle * Math.PI) / 180
      return { gx: x + Math.cos(rad) * radius, gy: y + Math.sin(rad) * radius }
    }
  }

  // Larger font since we have fewer gates to display
  const fontSize = gateCount > 5 ? 5.5 : gateCount > 3 ? 6 : 7

  return (
    <g className="center-gates">
      {activatedGates.map((gate, index) => {
        const { gx, gy } = getGatePosition(index)
        const activation = activeGates.get(gate)

        // Text colors based on activation type
        const textColor = activation === 'personality' ? '#FCA5A5' :
                          activation === 'design' ? '#A5B4FC' :
                          '#FCD34D' // both

        return (
          <text
            key={gate}
            x={gx}
            y={gy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize={fontSize}
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{
              textShadow: '0 0 4px currentColor',
            }}
          >
            {gate}
          </text>
        )
      })}
    </g>
  )
}

// Badge dimensions for collision detection
const BADGE_WIDTH = 24
const BADGE_HEIGHT = 11
const BADGE_PADDING = 3 // Minimum gap between badges

// Badge position type for collision detection
interface BadgePosition {
  channelId: string
  x: number
  y: number
  activationType: 'personality' | 'design' | 'both'
  isHighlighted: boolean
  path: string
}

// Badge position adjustments - t parameter positions badge along the curve
// t=0.5 is midpoint, lower values = closer to first center, higher = closer to second
// Badges on channels that pass through crowded areas need custom t values to spread out
const BADGE_OFFSETS: Record<string, { t: number }> = {
  // Head-Ajna channels - position near head
  '64-47': { t: 0.3 },
  '61-24': { t: 0.3 },
  '63-4': { t: 0.3 },
  // Ajna-Throat - position near ajna
  '17-62': { t: 0.35 },
  '43-23': { t: 0.35 },
  '11-56': { t: 0.35 },
  // Throat-G channels - spread out
  '8-1': { t: 0.3 },
  '31-7': { t: 0.4 },
  '33-13': { t: 0.6 },
  '20-10': { t: 0.7 },
  // Throat-Solar Plexus - position on the outer curve, away from center
  '35-36': { t: 0.65 },
  '12-22': { t: 0.35 },
  // Throat-Spleen - position on outer curve
  '16-48': { t: 0.65 },
  '20-57': { t: 0.35 },
  // Throat-Heart
  '45-21': { t: 0.6 },
  // G-Sacral - spread vertically
  '15-5': { t: 0.35 },
  '2-14': { t: 0.5 },
  '46-29': { t: 0.65 },
  // Sacral-Root - spread out
  '3-60': { t: 0.35 },
  '9-52': { t: 0.5 },
  '42-53': { t: 0.65 },
  // Solar Plexus-Root
  '49-19': { t: 0.6 },
  '55-39': { t: 0.5 },
  '30-41': { t: 0.4 },
  // Spleen-Root
  '54-32': { t: 0.4 },
  '28-38': { t: 0.5 },
  '18-58': { t: 0.6 },
  // Sacral-Solar Plexus
  '59-6': { t: 0.55 },
  // Sacral-Spleen
  '27-50': { t: 0.45 },
  '34-57': { t: 0.55 },
  // G-Spleen
  '10-57': { t: 0.6 },
  // G-Heart
  '25-51': { t: 0.5 },
  // Heart-Spleen
  '26-44': { t: 0.5 },
  // Heart-Solar Plexus
  '40-37': { t: 0.5 },
}

// Calculate point on cubic Bezier curve at parameter t
const bezierPoint = (t: number, p0: number, p1: number, p2: number, p3: number): number => {
  const mt = 1 - t
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

// Calculate initial badge position for a channel path
const calculateBadgePosition = (
  path: string,
  channelId: string
): { x: number; y: number } | null => {
  const offsetConfig = BADGE_OFFSETS[channelId]
  const t = offsetConfig?.t ?? 0.5

  // Try Bezier curve first
  const bezierMatch = path.match(/M\s*([\d.-]+)\s*([\d.-]+)\s*C\s*([\d.-]+)\s*([\d.-]+),\s*([\d.-]+)\s*([\d.-]+),\s*([\d.-]+)\s*([\d.-]+)/)

  if (bezierMatch) {
    const startX = parseFloat(bezierMatch[1])
    const startY = parseFloat(bezierMatch[2])
    const ctrl1X = parseFloat(bezierMatch[3])
    const ctrl1Y = parseFloat(bezierMatch[4])
    const ctrl2X = parseFloat(bezierMatch[5])
    const ctrl2Y = parseFloat(bezierMatch[6])
    const endX = parseFloat(bezierMatch[7])
    const endY = parseFloat(bezierMatch[8])

    return {
      x: bezierPoint(t, startX, ctrl1X, ctrl2X, endX),
      y: bezierPoint(t, startY, ctrl1Y, ctrl2Y, endY)
    }
  }

  // Fall back to straight line
  const lineMatch = path.match(/M\s*([\d.-]+)\s*([\d.-]+)\s*L\s*([\d.-]+)\s*([\d.-]+)/)
  if (!lineMatch) return null

  const startX = parseFloat(lineMatch[1])
  const startY = parseFloat(lineMatch[2])
  const endX = parseFloat(lineMatch[3])
  const endY = parseFloat(lineMatch[4])

  return {
    x: startX + (endX - startX) * t,
    y: startY + (endY - startY) * t
  }
}

// Badge collision radius for centers (slightly larger than center size + badge half-size)
const BADGE_CENTER_COLLISION_RADIUS: Record<string, number> = {
  head: 24,
  ajna: 22,
  throat: 24,
  g_center: 28,
  heart: 20,
  sacral: 26,
  solar_plexus: 22,
  spleen: 22,
  root: 26,
}

// Resolve collisions between badges AND with centers
const resolveBadgeCollisions = (badges: BadgePosition[]): BadgePosition[] => {
  if (badges.length === 0) return badges

  const resolved = badges.map(b => ({ ...b }))
  const iterations = 25 // Number of iterations to resolve collisions

  for (let iter = 0; iter < iterations; iter++) {
    let hasCollision = false

    // Check badge-to-badge collisions
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const a = resolved[i]
        const b = resolved[j]

        // Skip if either badge position is invalid
        if (isNaN(a.x) || isNaN(a.y) || isNaN(b.x) || isNaN(b.y)) continue

        // Calculate overlap amounts
        const overlapX = (BADGE_WIDTH + BADGE_PADDING) - Math.abs(a.x - b.x)
        const overlapY = (BADGE_HEIGHT + BADGE_PADDING) - Math.abs(a.y - b.y)

        // Check if bounding boxes overlap
        if (overlapX > 0 && overlapY > 0) {
          hasCollision = true

          // Push apart along axis with smaller overlap (more efficient resolution)
          if (overlapX < overlapY) {
            // Push horizontally
            const pushX = overlapX / 2 + 0.5
            if (a.x < b.x) {
              resolved[i].x -= pushX
              resolved[j].x += pushX
            } else {
              resolved[i].x += pushX
              resolved[j].x -= pushX
            }
          } else {
            // Push vertically
            const pushY = overlapY / 2 + 0.5
            if (a.y < b.y) {
              resolved[i].y -= pushY
              resolved[j].y += pushY
            } else {
              resolved[i].y += pushY
              resolved[j].y -= pushY
            }
          }
        }
      }
    }

    // Check badge-to-center collisions
    for (let i = 0; i < resolved.length; i++) {
      const badge = resolved[i]

      // Skip if badge position is invalid
      if (isNaN(badge.x) || isNaN(badge.y)) continue

      for (const [centerName, centerPos] of Object.entries(BODYGRAPH_LAYOUT.centers)) {
        const radius = BADGE_CENTER_COLLISION_RADIUS[centerName] || 24
        const dx = badge.x - centerPos.x
        const dy = badge.y - centerPos.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < radius) {
          hasCollision = true

          // Push badge away from center
          if (distance < 1) {
            // Badge is nearly on center - push in a default direction (left)
            resolved[i].x -= radius
          } else {
            // Push along the vector from center to badge
            const pushDistance = radius - distance + 2
            const ux = dx / distance
            const uy = dy / distance
            resolved[i].x += ux * pushDistance
            resolved[i].y += uy * pushDistance
          }
        }
      }
    }

    if (!hasCollision) break
  }

  return resolved
}

// Channel badge showing channel ID (for active channels)
// Now accepts pre-calculated x, y from collision detection
const ChannelBadge: React.FC<{
  x: number
  y: number
  channelId: string
  activationType: 'personality' | 'design' | 'both'
  isHighlighted: boolean
}> = ({ x, y, channelId, activationType, isHighlighted }) => {
  // Badge colors
  const bgColor = activationType === 'personality' ? '#7F1D1D' :
                  activationType === 'design' ? '#312E81' :
                  '#78350F'
  const borderColor = activationType === 'personality' ? '#EF4444' :
                      activationType === 'design' ? '#6366F1' :
                      '#F59E0B'
  const textColor = activationType === 'personality' ? '#FEE2E2' :
                    activationType === 'design' ? '#E0E7FF' :
                    '#FEF3C7'

  return (
    <g
      className="channel-badge"
      style={{
        filter: isHighlighted ? `drop-shadow(0 0 4px ${borderColor})` : `drop-shadow(0 1px 2px rgba(0,0,0,0.5))`,
      }}
    >
      {/* Badge background */}
      <rect
        x={x - BADGE_WIDTH / 2}
        y={y - BADGE_HEIGHT / 2}
        width={BADGE_WIDTH}
        height={BADGE_HEIGHT}
        rx={3}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={isHighlighted ? 1 : 0.5}
        opacity={isHighlighted ? 1 : 0.9}
      />
      {/* Channel ID text */}
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={6}
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {channelId}
      </text>
    </g>
  )
}

// Ethereal center shape
const CenterShape: React.FC<{
  center: string
  x: number
  y: number
  defined: boolean
  isHighlighted: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}> = ({ center, x, y, defined, isHighlighted, onClick, onMouseEnter, onMouseLeave }) => {
  const config = CENTER_CONFIG[center]
  const size = config.size
  const glowId = `glow-${center}`

  // Shape points
  let shapeElement: React.ReactNode

  if (config.shape === 'crown') {
    // Crown/lotus shape for Head center - like a crown with 3 points
    const h = size * 0.75
    const w = size * 0.6
    // Crown with three peaks
    const path = `
      M ${x - w} ${y + h * 0.3}
      L ${x - w * 0.6} ${y - h * 0.3}
      L ${x - w * 0.3} ${y + h * 0.1}
      L ${x} ${y - h * 0.5}
      L ${x + w * 0.3} ${y + h * 0.1}
      L ${x + w * 0.6} ${y - h * 0.3}
      L ${x + w} ${y + h * 0.3}
      Q ${x + w * 0.8} ${y + h * 0.5} ${x} ${y + h * 0.5}
      Q ${x - w * 0.8} ${y + h * 0.5} ${x - w} ${y + h * 0.3}
      Z
    `
    shapeElement = <path d={path} />
  } else if (config.shape === 'triangle_down') {
    // Inverted triangle for Ajna (third eye)
    const h = size * 0.866
    const points = `${x - size / 2},${y - h / 2} ${x + size / 2},${y - h / 2} ${x},${y + h / 2}`
    shapeElement = <polygon points={points} />
  } else if (config.shape === 'triangle') {
    // Upward triangle (heart, solar_plexus, spleen)
    const pointUp = ['heart', 'solar_plexus', 'spleen'].includes(center)
    const h = size * 0.866
    const points = pointUp
      ? `${x},${y - h / 2} ${x - size / 2},${y + h / 2} ${x + size / 2},${y + h / 2}`
      : `${x - size / 2},${y - h / 2} ${x + size / 2},${y - h / 2} ${x},${y + h / 2}`
    shapeElement = <polygon points={points} />
  } else if (config.shape === 'diamond') {
    const s = size * 0.7
    const points = `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`
    shapeElement = <polygon points={points} />
  } else {
    const s = size / 2
    shapeElement = <rect x={x - s} y={y - s} width={size} height={size} rx={4} />
  }

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      cursor="pointer"
      style={{ transition: 'all 0.3s ease' }}
    >
      {/* Outer glow for defined centers */}
      {defined && (
        <g filter={`url(#${glowId})`} opacity={isHighlighted ? 0.9 : 0.6}>
          {React.cloneElement(shapeElement as React.ReactElement, {
            fill: '#F59E0B',
            stroke: 'none',
          })}
        </g>
      )}

      {/* Main shape */}
      {React.cloneElement(shapeElement as React.ReactElement, {
        fill: defined ? 'url(#centerGradientDefined)' : 'url(#centerGradientUndefined)',
        stroke: defined ? '#FCD34D' : '#475569',
        strokeWidth: isHighlighted ? 2.5 : 1.5,
        opacity: isHighlighted ? 1 : 0.95,
        style: {
          transition: 'all 0.3s ease',
          filter: defined ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' : undefined,
        },
      })}

      {/* Inner highlight for defined */}
      {defined && (
        <g opacity={0.4}>
          {React.cloneElement(shapeElement as React.ReactElement, {
            fill: 'none',
            stroke: '#FEF3C7',
            strokeWidth: 1,
            transform: `translate(0, -1)`,
          })}
        </g>
      )}

      {/* Breathing animation overlay for defined centers */}
      {defined && (
        <g className="breathing-pulse">
          {React.cloneElement(shapeElement as React.ReactElement, {
            fill: 'url(#pulseGradient)',
            stroke: 'none',
            opacity: 0.3,
            style: {
              animation: 'breathe 3s ease-in-out infinite',
            },
          })}
        </g>
      )}
    </g>
  )
}

// Energy channel with flowing animation
const EnergyChannel: React.FC<{
  channelId: string
  path: string
  isActive: boolean
  isHighlighted: boolean
  activationType: 'personality' | 'design' | 'both' | 'none'
  gates: [number, number]
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}> = ({ channelId, path, isActive, isHighlighted, activationType, gates, onClick, onMouseEnter, onMouseLeave }) => {
  // Color based on activation type - using solid colors for reliability
  const getStrokeColor = () => {
    if (!isActive) return '#374151'  // Lighter gray for inactive
    switch (activationType) {
      case 'personality': return '#EF4444'  // Red
      case 'design': return '#6366F1'       // Blue/Indigo
      case 'both': return '#F59E0B'         // Amber (fallback, we render dual lines for 'both')
      default: return '#FCD34D'             // Gold
    }
  }

  const baseWidth = isActive ? 3.5 : 1.5
  const width = isHighlighted ? baseWidth + 1.5 : baseWidth
  const isBoth = activationType === 'both'

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      cursor="pointer"
    >
      {/* Glow layer for active channels */}
      {isActive && (
        <>
          {isBoth ? (
            // Dual glow for both activation - red and blue
            <>
              <path
                d={path}
                fill="none"
                stroke="#EF4444"
                strokeWidth={width + 6}
                strokeLinecap="round"
                opacity={isHighlighted ? 0.25 : 0.15}
                style={{ filter: 'blur(4px)' }}
              />
              <path
                d={path}
                fill="none"
                stroke="#6366F1"
                strokeWidth={width + 6}
                strokeLinecap="round"
                opacity={isHighlighted ? 0.25 : 0.15}
                style={{ filter: 'blur(4px)' }}
              />
            </>
          ) : (
            <path
              d={path}
              fill="none"
              stroke={activationType === 'personality' ? '#EF4444' : '#6366F1'}
              strokeWidth={width + 6}
              strokeLinecap="round"
              opacity={isHighlighted ? 0.3 : 0.18}
              style={{ filter: 'blur(4px)' }}
            />
          )}
        </>
      )}

      {/* Base channel path - dark outline behind colored stroke */}
      <path
        d={path}
        fill="none"
        stroke="#0F172A"
        strokeWidth={width + 2}
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Main colored stroke - alternating dashed lines for 'both' activation */}
      {isBoth && isActive ? (
        // Render alternating dashed red and blue lines
        <>
          {/* Personality (red) dashed line */}
          <path
            d={path}
            fill="none"
            stroke="#EF4444"
            strokeWidth={width}
            strokeLinecap="butt"
            strokeDasharray="8 8"
            strokeDashoffset="0"
            opacity={1}
          />
          {/* Design (blue) dashed line - offset to fill gaps */}
          <path
            d={path}
            fill="none"
            stroke="#6366F1"
            strokeWidth={width}
            strokeLinecap="butt"
            strokeDasharray="8 8"
            strokeDashoffset="8"
            opacity={1}
          />
        </>
      ) : (
        <path
          d={path}
          fill="none"
          stroke={isActive ? getStrokeColor() : '#374151'}
          strokeWidth={width}
          strokeLinecap="round"
          opacity={1}
        />
      )}

      {/* Animated energy particles for active channels */}
      {isActive && (
        <>
          <path
            d={path}
            fill="none"
            stroke="url(#energyParticles)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="3 18"
            opacity={0.75}
            style={{
              animation: 'flowEnergy 2s linear infinite',
            }}
          />
          <path
            d={path}
            fill="none"
            stroke="url(#energyParticles)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="3 18"
            strokeDashoffset={10}
            opacity={0.5}
            style={{
              animation: 'flowEnergy 2s linear infinite',
              animationDelay: '0.5s',
            }}
          />
        </>
      )}

      {/* Channel badges now rendered in a separate layer on top of centers */}
    </g>
  )
}

// Gate markers along channel - positioned using channel-specific offsets
// Shows on ALL channels (active and inactive)
const GateMarkers: React.FC<{
  path: string
  gates: [number, number]
  channelId: string
  activationType: 'personality' | 'design' | 'both' | 'none'
  isHighlighted: boolean
}> = ({ path, gates, channelId, activationType, isHighlighted }) => {
  const isActive = activationType !== 'none'

  // Get channel-specific gate offset
  const config = CHANNEL_PATHS[channelId] || {}
  const gateOffset = config.gateOffset || 18

  // Parse path to get start and end points
  const pathMatch = path.match(/M\s*([\d.-]+)\s*([\d.-]+)/)
  const endMatch = path.match(/([\d.-]+)\s*([\d.-]+)\s*$/)

  if (!pathMatch || !endMatch) return null

  const startX = parseFloat(pathMatch[1])
  const startY = parseFloat(pathMatch[2])
  const endX = parseFloat(endMatch[1])
  const endY = parseFloat(endMatch[2])

  const dx = endX - startX
  const dy = endY - startY
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len === 0) return null

  const ux = dx / len
  const uy = dy / len

  // Position gates using channel-specific offset
  const gate1X = startX + ux * gateOffset
  const gate1Y = startY + uy * gateOffset
  const gate2X = endX - ux * gateOffset
  const gate2Y = endY - uy * gateOffset

  // Color scheme - muted for inactive channels
  const gateTextColor = !isActive ? '#9CA3AF' :
                        activationType === 'personality' ? '#FEE2E2' :
                        activationType === 'design' ? '#E0E7FF' :
                        activationType === 'both' ? '#FEF3C7' : '#E2E8F0'
  const gateBg = !isActive ? '#374151' :
                 activationType === 'personality' ? '#B91C1C' :
                 activationType === 'design' ? '#4338CA' :
                 activationType === 'both' ? '#B45309' : '#475569'
  const glowColor = !isActive ? '#4B5563' :
                    activationType === 'personality' ? '#EF4444' :
                    activationType === 'design' ? '#6366F1' :
                    activationType === 'both' ? '#F59E0B' : '#64748B'

  // Smaller gates for inactive channels
  const size = !isActive ? 5.5 : (isHighlighted ? 7 : 6)
  const fontSize = !isActive ? 4 : (isHighlighted ? 5.5 : 5)

  return (
    <g className="gate-markers" opacity={isActive ? 1 : 0.7}>
      {/* Gate 1 */}
      <g style={{ filter: isHighlighted && isActive ? `drop-shadow(0 0 3px ${glowColor})` : undefined }}>
        <circle cx={gate1X} cy={gate1Y} r={size + 1} fill={glowColor} opacity={isActive ? 0.2 : 0.1} />
        <circle cx={gate1X} cy={gate1Y} r={size} fill={gateBg} stroke={glowColor} strokeWidth={0.4} />
        <text
          x={gate1X}
          y={gate1Y + 0.2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={gateTextColor}
          fontSize={fontSize}
          fontWeight={isActive ? "600" : "500"}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {gates[0]}
        </text>
      </g>

      {/* Gate 2 */}
      <g style={{ filter: isHighlighted && isActive ? `drop-shadow(0 0 3px ${glowColor})` : undefined }}>
        <circle cx={gate2X} cy={gate2Y} r={size + 1} fill={glowColor} opacity={isActive ? 0.2 : 0.1} />
        <circle cx={gate2X} cy={gate2Y} r={size} fill={gateBg} stroke={glowColor} strokeWidth={0.4} />
        <text
          x={gate2X}
          y={gate2Y + 0.2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={gateTextColor}
          fontSize={fontSize}
          fontWeight={isActive ? "600" : "500"}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {gates[1]}
        </text>
      </g>
    </g>
  )
}

// Ethereal human silhouette - aligned with compact center positions
const EtherealSilhouette: React.FC = () => (
  <g opacity={0.04}>
    <defs>
      <linearGradient id="silhouetteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="30%" stopColor="#818CF8" />
        <stop offset="70%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#4F46E5" />
      </linearGradient>
      <radialGradient id="silhouetteGlow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="crownGlow" cx="50%" cy="100%" r="70%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Aura glow behind seated figure - wider to encompass all centers */}
    <ellipse cx={160} cy={210} rx={130} ry={140} fill="url(#silhouetteGlow)" />
    {/* Crown/enlightenment glow above head - above head center y=32 */}
    <ellipse cx={160} cy={8} rx={45} ry={30} fill="url(#crownGlow)" />

    {/* Seated Buddha silhouette - WIDE body to encompass all centers */}
    {/* Centers: Heart/Spleen at x=102, Solar Plexus at x=218 */}

    {/* Head with ushnisha (crown protuberance) - LARGER head */}
    <ellipse cx={160} cy={52} rx={26} ry={28} fill="url(#silhouetteGradient)" />
    <ellipse cx={160} cy={22} rx={14} ry={16} fill="url(#silhouetteGradient)" />

    {/* Neck */}
    <rect x={152} y={70} width={16} height={16} rx={4} fill="url(#silhouetteGradient)" />

    {/* Round Buddha torso - wide belly encompassing side centers */}
    <path
      d="M145 84
         Q120 95 105 120
         Q88 150 85 190
         Q82 230 95 265
         Q110 295 140 305
         Q160 310 180 305
         Q210 295 225 265
         Q238 230 235 190
         Q232 150 215 120
         Q200 95 175 84
         Z"
      fill="url(#silhouetteGradient)"
    />

    {/* Left arm - flowing smoothly from torso to lap */}
    <path
      d="M85 120
         Q55 145 48 185
         Q42 225 55 260
         Q70 290 115 295
         Q105 280 95 260
         Q75 225 78 185
         Q82 150 95 125
         Z"
      fill="url(#silhouetteGradient)"
    />
    {/* Right arm - distinct, flowing from shoulder to lap */}
    <path
      d="M235 120
         Q265 145 272 185
         Q278 225 265 260
         Q250 290 205 295
         Q215 280 225 260
         Q245 225 242 185
         Q238 150 225 125
         Z"
      fill="url(#silhouetteGradient)"
    />

    {/* Hands in lap - dhyana mudra */}
    <ellipse cx={160} cy={292} rx={38} ry={15} fill="url(#silhouetteGradient)" />

    {/* Crossed legs in lotus position - LARGER legs */}
    {/* Left leg - fuller */}
    <path
      d="M115 305
         Q65 322 38 355
         Q20 385 38 402
         Q65 420 120 412
         Q158 404 165 385
         L165 355
         Q145 368 105 375
         Q72 375 78 352
         Q88 330 125 315
         Z"
      fill="url(#silhouetteGradient)"
    />
    {/* Right leg - fuller */}
    <path
      d="M205 305
         Q255 322 282 355
         Q300 385 282 402
         Q255 420 200 412
         Q162 404 155 385
         L155 355
         Q175 368 215 375
         Q248 375 242 352
         Q232 330 195 315
         Z"
      fill="url(#silhouetteGradient)"
    />

    {/* Base/cushion hint - wider */}
    <ellipse cx={160} cy={412} rx={85} ry={14} fill="url(#silhouetteGradient)" opacity={0.4} />
  </g>
)

// Main component
export const BodyGraph: React.FC<BodyGraphProps> = ({
  className = '',
}) => {
  // Use viewBox for scalable SVG - it will fill its container
  const viewBoxWidth = BODYGRAPH_LAYOUT.width
  const viewBoxHeight = BODYGRAPH_LAYOUT.height
  const {
    chart,
    showChannels,
    highlightedCenter,
    highlightedChannel,
    setHighlightedCenter,
    setHighlightedChannel,
    setSelection,
  } = useHDStore()

  // Process chart data
  const { activeChannels, channelActivationTypes, centerDefinitions, activeGates } = useMemo(() => {
    if (!chart) {
      return {
        activeChannels: new Set<string>(),
        channelActivationTypes: new Map<string, 'personality' | 'design' | 'both'>(),
        centerDefinitions: new Map<string, boolean>(),
        activeGates: new Map<number, 'personality' | 'design' | 'both'>(),
      }
    }

    const personalityArr = Array.isArray(chart.personality_activations) ? chart.personality_activations : []
    const designArr = Array.isArray(chart.design_activations) ? chart.design_activations : []
    const channelsArr = Array.isArray(chart.channels) ? chart.channels : []
    const centersArr = Array.isArray(chart.centers) ? chart.centers : []

    const personality = new Set(personalityArr.map((a: GateActivation) => a.gate))
    const design = new Set(designArr.map((a: GateActivation) => a.gate))

    // Store both directions of channel IDs for consistent lookup
    const channels = new Set<string>()
    channelsArr.forEach((c: ChannelDefinition) => {
      if (c.channel_id) {
        channels.add(c.channel_id)
        // Also add reverse direction
        const [g1, g2] = c.channel_id.split('-')
        channels.add(`${g2}-${g1}`)
      }
    })

    // Build active gates map with activation type
    const gatesMap = new Map<number, 'personality' | 'design' | 'both'>()
    personalityArr.forEach((a: GateActivation) => {
      gatesMap.set(a.gate, design.has(a.gate) ? 'both' : 'personality')
    })
    designArr.forEach((a: GateActivation) => {
      if (!gatesMap.has(a.gate)) {
        gatesMap.set(a.gate, 'design')
      }
    })

    // Determine activation type for each channel
    // Store both directions of channel ID to ensure lookup works
    const activationTypes = new Map<string, 'personality' | 'design' | 'both'>()
    channelsArr.forEach((c: ChannelDefinition) => {
      const channelId = c.channel_id
      if (!channelId) return

      const [gate1, gate2] = channelId.split('-').map(Number)
      const hasPersonality = personality.has(gate1) || personality.has(gate2)
      const hasDesign = design.has(gate1) || design.has(gate2)

      let activationType: 'personality' | 'design' | 'both'
      if (hasPersonality && hasDesign) {
        activationType = 'both'
      } else if (hasPersonality) {
        activationType = 'personality'
      } else {
        activationType = 'design'
      }

      // Store both directions so lookup works regardless of ID format
      activationTypes.set(channelId, activationType)
      activationTypes.set(`${gate2}-${gate1}`, activationType)
    })

    const centerDefs = new Map(centersArr.map((c: CenterDefinition) => [c.center, c.defined]))

    return {
      activeChannels: channels,
      channelActivationTypes: activationTypes,
      centerDefinitions: centerDefs,
      activeGates: gatesMap,
    }
  }, [chart])

  // Compute badge positions with collision detection
  const resolvedBadgePositions = useMemo(() => {
    const badges: BadgePosition[] = []

    // First pass: collect all active badge initial positions
    CHANNEL_CONNECTIONS.forEach((channel) => {
      const [center1, center2] = channel.centers
      const pos1 = BODYGRAPH_LAYOUT.centers[center1]
      const pos2 = BODYGRAPH_LAYOUT.centers[center2]

      if (!pos1 || !pos2) return

      const isActive = activeChannels.has(channel.id) ||
        activeChannels.has(`${channel.gates[1]}-${channel.gates[0]}`)

      if (!isActive) return

      const activationType = channelActivationTypes.get(channel.id) ||
        channelActivationTypes.get(`${channel.gates[1]}-${channel.gates[0]}`)

      if (!activationType) return

      const path = generateChannelPath(pos1.x, pos1.y, pos2.x, pos2.y, channel.id, [center1, center2])
      const position = calculateBadgePosition(path, channel.id)

      // Validate position is valid (not null and not NaN)
      if (position && !isNaN(position.x) && !isNaN(position.y)) {
        badges.push({
          channelId: channel.id,
          x: position.x,
          y: position.y,
          activationType,
          isHighlighted: highlightedChannel === channel.id,
          path
        })
      }
    })

    // Second pass: resolve collisions
    const resolved = resolveBadgeCollisions(badges)

    // Filter out any badges that got NaN positions from collision resolution
    return resolved.filter(b => !isNaN(b.x) && !isNaN(b.y))
  }, [activeChannels, channelActivationTypes, highlightedChannel])

  // Compute label positions with collision avoidance against badges
  const labelPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = {}
    const LABEL_HEIGHT = 10
    const LABEL_PADDING = 4

    Object.entries(BODYGRAPH_LAYOUT.centers).forEach(([centerName, centerPos]) => {
      const config = CENTER_CONFIG[centerName]
      if (!config) return

      // Calculate base label position
      let labelX: number
      let labelY: number
      let anchor: 'start' | 'middle' | 'end'

      if (config.labelPosition === 'left') {
        labelX = centerPos.x - config.labelOffset
        labelY = centerPos.y + 3
        anchor = 'end'
      } else if (config.labelPosition === 'right') {
        labelX = centerPos.x + config.labelOffset
        labelY = centerPos.y + 3
        anchor = 'start'
      } else { // below
        labelX = centerPos.x
        labelY = centerPos.y + config.labelOffset
        anchor = 'middle'
      }

      // Estimate label width based on text length
      const labelWidth = config.label.length * 5.5

      // Check for collisions with badges
      let hasCollision = false
      for (const badge of resolvedBadgePositions) {
        const badgeLeft = badge.x - BADGE_WIDTH / 2 - LABEL_PADDING
        const badgeRight = badge.x + BADGE_WIDTH / 2 + LABEL_PADDING
        const badgeTop = badge.y - BADGE_HEIGHT / 2 - LABEL_PADDING
        const badgeBottom = badge.y + BADGE_HEIGHT / 2 + LABEL_PADDING

        // Calculate label bounds
        let labelLeft: number, labelRight: number
        if (anchor === 'end') {
          labelLeft = labelX - labelWidth
          labelRight = labelX
        } else if (anchor === 'start') {
          labelLeft = labelX
          labelRight = labelX + labelWidth
        } else {
          labelLeft = labelX - labelWidth / 2
          labelRight = labelX + labelWidth / 2
        }
        const labelTop = labelY - LABEL_HEIGHT / 2
        const labelBottom = labelY + LABEL_HEIGHT / 2

        // Check overlap
        if (labelLeft < badgeRight && labelRight > badgeLeft &&
            labelTop < badgeBottom && labelBottom > badgeTop) {
          hasCollision = true

          // Try to move label away from badge
          if (config.labelPosition === 'right' || config.labelPosition === 'left') {
            // Move vertically to avoid
            if (badge.y < labelY) {
              labelY = badgeBottom + LABEL_HEIGHT / 2 + 2
            } else {
              labelY = badgeTop - LABEL_HEIGHT / 2 - 2
            }
          } else {
            // Move horizontally to avoid
            if (badge.x < labelX) {
              labelX = badgeRight + labelWidth / 2 + 2
            } else {
              labelX = badgeLeft - labelWidth / 2 - 2
            }
          }
          break
        }
      }

      positions[centerName] = { x: labelX, y: labelY, anchor }
    })

    return positions
  }, [resolvedBadgePositions])

  const handleCenterClick = (center: string) => {
    const centersArr = Array.isArray(chart?.centers) ? chart.centers : []
    const centerData = centersArr.find((c: CenterDefinition) => c.center === center)
    setSelection({ type: 'center', id: center, data: centerData })
  }

  const handleChannelClick = (channelId: string) => {
    const channelsArr = Array.isArray(chart?.channels) ? chart.channels : []
    const channelData = channelsArr.find((c: ChannelDefinition) => c.channel_id === channelId)
    setSelection({ type: 'channel', id: channelId, data: channelData })
  }

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Glow filters for each center */}
        {Object.keys(CENTER_CONFIG).map(center => (
          <filter key={center} id={`glow-${center}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}

        {/* Center gradients */}
        <linearGradient id="centerGradientDefined" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="30%" stopColor="#FCD34D" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id="centerGradientUndefined" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Pulse gradient for breathing animation */}
        <radialGradient id="pulseGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
        </radialGradient>

        {/* Channel gradients */}
        <linearGradient id="personalityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>

        <linearGradient id="designGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        <linearGradient id="bothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="25%" stopColor="#EF4444" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="75%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A5B4FC" />
        </linearGradient>

        <linearGradient id="channelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Energy particle gradient */}
        <linearGradient id="energyParticles" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Cosmic ambient glow */}
        <radialGradient id="cosmicGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.08" />
          <stop offset="40%" stopColor="#4F46E5" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
        </radialGradient>

        {/* Sacred geometry pattern */}
        <pattern id="sacredGeometry" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#6366F1" strokeWidth="0.15" opacity="0.15" />
          <circle cx="20" cy="20" r="12" fill="none" stroke="#818CF8" strokeWidth="0.1" opacity="0.1" />
          <circle cx="20" cy="20" r="6" fill="none" stroke="#A5B4FC" strokeWidth="0.1" opacity="0.08" />
        </pattern>

        {/* Soft glow filter */}
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes breathe {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.05); }
          }
          @keyframes flowEnergy {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -48; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes drift {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.7; }
          }
          @keyframes orbitalSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Transparent background - inherits from page */}
      <rect width="100%" height="100%" fill="transparent" />

      {/* Subtle sacred geometry background */}
      <rect width="100%" height="100%" fill="url(#sacredGeometry)" opacity="0.3" />

      {/* Cosmic ambient glow behind bodygraph - centered on G at y=178 */}
      <ellipse cx={160} cy={180} rx={110} ry={160} fill="url(#cosmicGlow)" />

      {/* Distant stars */}
      <g className="stars" opacity="0.35">
        {[...Array(10)].map((_, i) => (
          <circle
            key={`star-${i}`}
            cx={20 + ((i * 47) % 280)}
            cy={12 + ((i * 61) % 380)}
            r={0.35 + (i % 3) * 0.2}
            fill="#E0E7FF"
            style={{
              animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.3) % 2}s`,
            }}
          />
        ))}
      </g>

      {/* Ethereal human silhouette */}
      <EtherealSilhouette />

      {/* Channels */}
      {showChannels && (
        <g className="channels">
          {CHANNEL_CONNECTIONS.map((channel) => {
            const [center1, center2] = channel.centers
            const pos1 = BODYGRAPH_LAYOUT.centers[center1]
            const pos2 = BODYGRAPH_LAYOUT.centers[center2]

            if (!pos1 || !pos2) return null

            const isActive = activeChannels.has(channel.id) ||
              activeChannels.has(`${channel.gates[1]}-${channel.gates[0]}`)

            const activationType = channelActivationTypes.get(channel.id) ||
              channelActivationTypes.get(`${channel.gates[1]}-${channel.gates[0]}`) || 'none'

            const path = generateChannelPath(pos1.x, pos1.y, pos2.x, pos2.y, channel.id, [center1, center2])

            return (
              <EnergyChannel
                key={channel.id}
                channelId={channel.id}
                path={path}
                isActive={isActive}
                isHighlighted={highlightedChannel === channel.id}
                activationType={isActive ? activationType : 'none'}
                gates={channel.gates}
                onClick={() => handleChannelClick(channel.id)}
                onMouseEnter={() => setHighlightedChannel(channel.id)}
                onMouseLeave={() => setHighlightedChannel(null)}
              />
            )
          })}
        </g>
      )}

      {/* Centers */}
      <g className="centers">
        {Object.entries(BODYGRAPH_LAYOUT.centers).map(([center, pos]) => {
          const defined = centerDefinitions.get(center) ?? false
          const isHighlighted = highlightedCenter === center
          const config = CENTER_CONFIG[center]
          const centerGates = GATE_POSITIONS[center] || []

          return (
            <g key={center}>
              {/* Center shape first (background) */}
              <CenterShape
                center={center}
                x={pos.x}
                y={pos.y}
                defined={defined}
                isHighlighted={isHighlighted}
                onClick={() => handleCenterClick(center)}
                onMouseEnter={() => setHighlightedCenter(center)}
                onMouseLeave={() => setHighlightedCenter(null)}
              />
              {/* Gates rendered on top of center shape */}
              <CenterGates
                center={center}
                x={pos.x}
                y={pos.y}
                gates={centerGates}
                activeGates={activeGates}
                centerSize={config.size}
              />
              {/* Center label - positioned with collision avoidance */}
              {labelPositions[center] && (
                <text
                  x={labelPositions[center].x}
                  y={labelPositions[center].y}
                  textAnchor={labelPositions[center].anchor}
                  fill={defined ? '#FCD34D' : '#64748B'}
                  fontSize={9}
                  fontWeight={defined ? 500 : 400}
                  letterSpacing={0.5}
                  opacity={0.9}
                >
                  {config.label}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* Channel badges - rendered on top of centers with collision detection */}
      {showChannels && (
        <g className="channel-badges">
          {resolvedBadgePositions.map((badge) => (
            <ChannelBadge
              key={`badge-${badge.channelId}`}
              x={badge.x}
              y={badge.y}
              channelId={badge.channelId}
              activationType={badge.activationType}
              isHighlighted={highlightedChannel === badge.channelId}
            />
          ))}
        </g>
      )}

      {/* Minimal floating legend - top left */}
      <g className="legend" transform="translate(8, 8)" opacity={0.7}>
        <g className="flex items-center gap-1">
          <circle cx={5} cy={5} r={4} fill="url(#centerGradientDefined)" />
          <text x={12} y={8} fill="#E2E8F0" fontSize={7} opacity={0.8}>Defined</text>
          <circle cx={55} cy={5} r={4} fill="url(#centerGradientUndefined)" stroke="#475569" strokeWidth={0.5} />
          <text x={62} y={8} fill="#E2E8F0" fontSize={7} opacity={0.8}>Open</text>
        </g>
      </g>

      {/* Channel type legend - top right */}
      <g className="channel-legend" transform={`translate(${BODYGRAPH_LAYOUT.width - 90}, 8)`} opacity={0.7}>
        <line x1={0} y1={5} x2={10} y2={5} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
        <text x={14} y={8} fill="#E2E8F0" fontSize={6} opacity={0.8}>Pers</text>
        <line x1={38} y1={5} x2={48} y2={5} stroke="#6366F1" strokeWidth={2} strokeLinecap="round" />
        <text x={52} y={8} fill="#E2E8F0" fontSize={6} opacity={0.8}>Design</text>
      </g>
    </svg>
  )
}

export default BodyGraph
