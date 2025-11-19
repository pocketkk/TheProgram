/**
 * Natal Planet Overlay
 * Displays natal (birth chart) planets overlaid on transiting planets
 */

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { NatalPlanetPosition } from '../../../lib/astronomy/birthChart'
import { PLANETS } from '../../../lib/astronomy/planetaryData'

interface NatalPlanetOverlayProps {
  natalPlanets: Record<string, NatalPlanetPosition>
  scale?: number
  opacity?: number
}

export const NatalPlanetOverlay: React.FC<NatalPlanetOverlayProps> = ({
  natalPlanets,
  scale = 10, // Reduced from 15 to fit inside the bowl (max radius 14)
  opacity = 0.6,
}) => {
  return (
    <group>
      {Object.entries(natalPlanets).map(([planetName, position]) => (
        <NatalPlanet
          key={`natal-${planetName}`}
          planetName={planetName}
          position={position}
          scale={scale}
          opacity={opacity}
        />
      ))}
    </group>
  )
}

interface NatalPlanetProps {
  planetName: string
  position: NatalPlanetPosition
  scale: number
  opacity: number
}

const NatalPlanet: React.FC<NatalPlanetProps> = ({ planetName, position, scale, opacity }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  const planetData = PLANETS[planetName]
  if (!planetData) return null

  const { x, y, z } = position
  const scaledPosition: [number, number, number] = [x * scale, y * scale, z * scale]

  // Pulsing animation for natal planets
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1
      meshRef.current.scale.setScalar(pulse)
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5
    }
  })

  // Calculate visual size (smaller than transiting planets, more consistent sizing)
  const visualRadius = Math.min(planetData.radius * 0.08, 0.12)

  return (
    <group position={scaledPosition}>
      {/* Glowing ring to indicate natal position */}
      <mesh ref={ringRef}>
        <ringGeometry args={[visualRadius * 1.3, visualRadius * 1.6, 24]} />
        <meshBasicMaterial
          color={planetData.color}
          transparent
          opacity={opacity * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Natal planet sphere (outlined/hollow appearance) */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[visualRadius, 16, 16]} />
        <meshBasicMaterial
          color={planetData.color}
          transparent
          opacity={opacity * 0.3}
          wireframe={false}
        />
      </mesh>

      {/* Wireframe overlay for outline effect */}
      <mesh>
        <sphereGeometry args={[visualRadius * 1.05, 12, 12]} />
        <meshBasicMaterial
          color={planetData.color}
          transparent
          opacity={opacity * 0.7}
          wireframe
        />
      </mesh>

      {/* Small glow effect */}
      <mesh>
        <sphereGeometry args={[visualRadius * 1.2, 12, 12]} />
        <meshBasicMaterial
          color={planetData.color}
          transparent
          opacity={opacity * 0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Label */}
      <Html
        position={[0, visualRadius * 2.5, 0]}
        center
        distanceFactor={10}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div className="flex flex-col items-center">
          <div className="px-2 py-1 bg-slate-900/90 border border-purple-500/50 rounded text-white text-xs whitespace-nowrap backdrop-blur-sm">
            <div className="flex items-center space-x-1">
              <span className="text-purple-300">N</span>
              <span>{planetData.symbol}</span>
              <span className="font-medium">{planetData.name}</span>
            </div>
            <div className="text-[10px] text-slate-300 text-center">
              {position.sign} {position.degree}°{position.minute}'
              {position.retrograde && <span className="text-red-400 ml-1">℞</span>}
            </div>
          </div>
        </div>
      </Html>

      {/* Connection line to ecliptic plane */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([0, 0, 0, 0, -visualRadius * 3, 0])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={planetData.color} transparent opacity={opacity * 0.3} />
      </line>
    </group>
  )
}
