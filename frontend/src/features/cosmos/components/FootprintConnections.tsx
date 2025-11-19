import * as THREE from 'three'
import { calculateAspect } from '@/lib/astronomy/planetaryData'
import { getPlanetInfo } from '@/lib/astronomy/planetInfo'

interface FootprintConnectionsProps {
  planetPositions: Array<{
    name: string
    position: THREE.Vector3
    color: string
  }>
  julianDay: number
  show: boolean
}

/**
 * Renders connection lines between planet footprints that are in aspect
 * Only shows lines when planets have astrological aspects (conjunction, sextile, square, trine, opposition)
 */
export const FootprintConnections = ({ planetPositions, julianDay, show }: FootprintConnectionsProps) => {
  if (!show || planetPositions.length === 0) return null

  const BOWL_FLOOR_Y = -2.98

  // Generate connections only for planets in aspect
  const connections: Array<{
    from: THREE.Vector3
    to: THREE.Vector3
    color: string
  }> = []

  for (let i = 0; i < planetPositions.length; i++) {
    for (let j = i + 1; j < planetPositions.length; j++) {
      const planetA = planetPositions[i]
      const planetB = planetPositions[j]

      // Get ecliptic longitudes for both planets
      const planetAInfo = getPlanetInfo(planetA.name.toLowerCase(), julianDay)
      const planetBInfo = getPlanetInfo(planetB.name.toLowerCase(), julianDay)

      if (!planetAInfo || !planetBInfo) continue

      // Calculate aspect between the two planets
      const aspect = calculateAspect(planetAInfo.eclipticLongitude, planetBInfo.eclipticLongitude)

      // Only create connection if there's an aspect
      if (!aspect) continue

      // Project positions to bowl floor (keep X and Z, set Y to floor level)
      const fromPos = new THREE.Vector3(planetA.position.x, BOWL_FLOOR_Y, planetA.position.z)
      const toPos = new THREE.Vector3(planetB.position.x, BOWL_FLOOR_Y, planetB.position.z)

      connections.push({
        from: fromPos,
        to: toPos,
        color: aspect.color
      })
    }
  }

  return (
    <group>
      {connections.map((connection, idx) => (
        <line key={`footprint-connection-${idx}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  connection.from.x, connection.from.y, connection.from.z,
                  connection.to.x, connection.to.y, connection.to.z
                ]),
                3
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={connection.color}
            transparent
            opacity={0.5}
            linewidth={2}
            blending={THREE.AdditiveBlending}
          />
        </line>
      ))}
    </group>
  )
}
