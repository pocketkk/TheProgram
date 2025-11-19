import { useMemo } from 'react'
import * as THREE from 'three'

export interface OrbitPathProps {
  orbitRadius: number
  inclination: number
  scale: number
  color: string
  opacity?: number
  segments?: number
}

/**
 * Renders an orbital path as an elliptical line
 * Used for planets orbiting the Sun or satellites orbiting planets
 */
export const OrbitPath: React.FC<OrbitPathProps> = ({
  orbitRadius,
  inclination,
  scale,
  color,
  opacity = 0.2,
  segments = 128,
}) => {
  // Calculate orbit path points
  const orbitPoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    const inclinationRad = (inclination * Math.PI) / 180

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = orbitRadius * Math.cos(angle) * scale
      const y = orbitRadius * Math.sin(inclinationRad) * Math.sin(angle) * scale
      const z = orbitRadius * Math.sin(angle) * Math.cos(inclinationRad) * scale
      points.push(new THREE.Vector3(x, y, z))
    }

    return points
  }, [orbitRadius, inclination, scale, segments])

  if (orbitRadius === 0) {
    return null // No orbit for stationary bodies
  }

  return (
    <line>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          args={[
            new Float32Array(orbitPoints.flatMap((p) => [p.x, p.y, p.z])),
            3,
          ]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  )
}
