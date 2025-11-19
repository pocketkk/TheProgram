import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'

export interface SatelliteData {
  name: string
  symbol: string
  color: string
  radius: number // relative to parent planet
  orbitRadius: number // distance from parent in parent radii units
  orbitPeriod: number // Earth days
  rotationPeriod: number // Earth days
  inclination: number // degrees
  glowColor?: string
}

interface SatelliteProps {
  data: SatelliteData
  parentPosition: THREE.Vector3
  parentRadius: number // Visual radius of parent for scaling
  julianDay: number
  showOrbit?: boolean
  showLabel?: boolean
  onClick?: () => void
}

export const Satellite = ({
  data,
  parentPosition,
  parentRadius,
  julianDay,
  showOrbit = true,
  showLabel = true,
  onClick,
}: SatelliteProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  // Calculate orbital position around parent planet
  const position = useMemo(() => {
    // J2000.0 epoch
    const J2000 = 2451545.0
    const daysSinceJ2000 = julianDay - J2000

    // Mean anomaly
    const meanAnomaly = (360 / data.orbitPeriod) * daysSinceJ2000
    const angle = (meanAnomaly * Math.PI) / 180

    // Apply inclination
    const inclinationRad = (data.inclination * Math.PI) / 180

    // Calculate position relative to parent
    // Scale orbit radius by parent's visual radius to keep it visible
    const orbitDistance = data.orbitRadius * parentRadius

    const x = parentPosition.x + orbitDistance * Math.cos(angle)
    const y = parentPosition.y + orbitDistance * Math.sin(inclinationRad) * Math.sin(angle)
    const z = parentPosition.z + orbitDistance * Math.sin(angle) * Math.cos(inclinationRad)

    return new THREE.Vector3(x, y, z)
  }, [data, julianDay, parentPosition, parentRadius])

  // Satellite size - much smaller than planets
  const displayRadius = useMemo(() => {
    // Satellites are scaled relative to their parent planet's visual size
    return parentRadius * data.radius
  }, [data.radius, parentRadius])

  // Rotation animation
  useFrame((state) => {
    if (meshRef.current && data.rotationPeriod > 0) {
      meshRef.current.rotation.y += 0.01 / data.rotationPeriod
    }

    // Subtle pulsing glow effect
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1
      glowRef.current.scale.setScalar(pulse)
    }
  })

  // Create orbit path around parent
  const orbitPoints = useMemo(() => {
    const points = []
    const segments = 64
    const inclinationRad = (data.inclination * Math.PI) / 180
    const orbitDistance = data.orbitRadius * parentRadius

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = parentPosition.x + orbitDistance * Math.cos(angle)
      const y = parentPosition.y + orbitDistance * Math.sin(inclinationRad) * Math.sin(angle)
      const z = parentPosition.z + orbitDistance * Math.sin(angle) * Math.cos(inclinationRad)
      points.push(new THREE.Vector3(x, y, z))
    }

    return points
  }, [data.orbitRadius, data.inclination, parentPosition, parentRadius])

  return (
    <group>
      {/* Orbital path around parent */}
      {showOrbit && (
        <line>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(orbitPoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={data.color}
            transparent
            opacity={0.3}
          />
        </line>
      )}

      {/* Satellite group */}
      <group position={position}>
        {/* Main satellite sphere */}
        <Sphere
          ref={meshRef}
          args={[displayRadius, 32, 32]}
          onClick={onClick}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <meshStandardMaterial
            color={data.color}
            roughness={0.9}
            metalness={0.2}
            emissive={data.color}
            emissiveIntensity={0.3}
            envMapIntensity={0.8}
          />
        </Sphere>

        {/* Inner glow */}
        <Sphere args={[displayRadius * 1.15, 16, 16]}>
          <meshBasicMaterial
            color={data.glowColor || data.color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>

        {/* Mid glow layer - pulsing */}
        <Sphere ref={glowRef} args={[displayRadius * 1.3, 12, 12]}>
          <meshBasicMaterial
            color={data.glowColor || data.color}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>

        {/* Outer glow layer */}
        <Sphere args={[displayRadius * 1.5, 12, 12]}>
          <meshBasicMaterial
            color={data.glowColor || data.color}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>

        {/* Satellite label */}
        {showLabel && (
          <Billboard
            follow={true}
            lockX={false}
            lockY={false}
            lockZ={false}
          >
            <Text
              position={[0, displayRadius * 1.8, 0]}
              fontSize={0.08}
              color="white"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.01}
              outlineColor="#000000"
              outlineOpacity={0.8}
            >
              {data.symbol} {data.name}
            </Text>
          </Billboard>
        )}
      </group>
    </group>
  )
}
