import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

export interface TrailRendererProps {
  positions: THREE.Vector3[]
  color: string
  opacity?: number
  lineWidth?: number
  fadeEffect?: boolean
}

/**
 * Renders a trail as a thick line in 3D space
 * Uses drei Line (Line2) for proper line width support
 */
export const TrailRenderer: React.FC<TrailRendererProps> = ({
  positions,
  color,
  opacity = 0.8,
  lineWidth = 2,
}) => {
  // Sample every Nth point to reduce complexity for Line2
  const points = useMemo(() => {
    if (positions.length < 2) return null
    // Sample every 3rd point for smoother rendering
    const sampled = positions.filter((_, i) => i % 3 === 0 || i === positions.length - 1)
    if (sampled.length < 2) return positions.slice(-2)
    return sampled
  }, [positions])

  if (!points || points.length < 2) {
    return null
  }

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
    />
  )
}
