/**
 * Transit-to-Natal Aspect Lines
 * Displays aspect lines between transiting planets and natal planets
 */

import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { calculateTransitAspects, NatalPlanetPosition } from '../../../lib/astronomy/birthChart'
import { calculatePlanetPosition, PLANETS } from '../../../lib/astronomy/planetaryData'

interface TransitAspectLinesProps {
  julianDay: number
  natalPlanets: Record<string, NatalPlanetPosition>
  scale?: number
  enabled?: boolean
}

export const TransitAspectLines: React.FC<TransitAspectLinesProps> = ({
  julianDay,
  natalPlanets,
  scale = 15,
  enabled = true,
}) => {
  const groupRef = useRef<THREE.Group>(null)

  // Calculate current transit positions
  const transitPositions = useMemo(() => {
    const positions: Record<string, { angle: number; x: number; y: number; z: number }> = {}

    const planetNames = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

    for (const name of planetNames) {
      const planet = PLANETS[name]
      if (planet) {
        const pos = calculatePlanetPosition(planet, julianDay)
        positions[name] = {
          angle: pos.angle,
          x: pos.x * scale,
          y: pos.y * scale,
          z: pos.z * scale,
        }
      }
    }

    return positions
  }, [julianDay, scale])

  // Calculate transit-to-natal aspects
  const aspects = useMemo(() => {
    return calculateTransitAspects(transitPositions, natalPlanets)
  }, [transitPositions, natalPlanets])

  // Pulsing animation
  useFrame((state) => {
    if (groupRef.current && enabled) {
      const pulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.1 + 0.9
      groupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Line) {
          const material = child.material as THREE.LineBasicMaterial
          material.opacity = pulse * 0.4
        }
      })
    }
  })

  if (!enabled) return null

  return (
    <group ref={groupRef}>
      {aspects.map((aspect, index) => {
        const transitPos = transitPositions[aspect.transitPlanet]
        const natalPos = natalPlanets[aspect.natalPlanet]

        if (!transitPos || !natalPos) return null

        const natalScaledPos = {
          x: natalPos.x * scale,
          y: natalPos.y * scale,
          z: natalPos.z * scale,
        }

        // Create line points
        const points = [
          new THREE.Vector3(transitPos.x, transitPos.y, transitPos.z),
          new THREE.Vector3(natalScaledPos.x, natalScaledPos.y, natalScaledPos.z),
        ]

        // Vary opacity based on aspect exactness
        const opacity = 0.3 + aspect.exactness * 0.3

        return (
          <Line
            key={`transit-aspect-${index}`}
            points={points}
            color={aspect.color}
            lineWidth={2}
            transparent
            opacity={opacity}
            dashed
            dashSize={0.5}
            gapSize={0.3}
          />
        )
      })}
    </group>
  )
}
