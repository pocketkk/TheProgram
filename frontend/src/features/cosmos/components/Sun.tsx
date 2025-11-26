import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sphere, Html } from '@react-three/drei'
import * as THREE from 'three'
import { getZodiacSign } from '@/lib/astronomy/planetaryData'
import { AstroSymbol } from './AstroSymbol'
import { calculateAngleFromCoordinates } from '../utils/calculations'

interface SunProps {
  position?: [number, number, number]
  scale?: number
  showFootprints?: boolean
  showPlanetToFootprintLines?: boolean
  showLabel?: boolean
  showTrail?: boolean
  julianDay?: number
  onClick?: () => void
  isHighlighted?: boolean
  speed?: number
  showSun?: boolean
}

export const Sun = ({
  position = [0, 0, 0],
  scale: _scale = 1,
  showFootprints = true,
  showPlanetToFootprintLines = true,
  showLabel = true,
  showTrail = false,
  julianDay = 0,
  onClick,
  isHighlighted = false,
  speed = 1,
  showSun = true,
}: SunProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const corona1Ref = useRef<THREE.Mesh>(null)
  const corona2Ref = useRef<THREE.Mesh>(null)
  const corona3Ref = useRef<THREE.Mesh>(null)
  const flareRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const { camera: _camera } = useThree()

  // Trail tracking system (like planets have)
  const [trailPositions, setTrailPositions] = useState<THREE.Vector3[]>([])
  const [footprintTrailPositions, setFootprintTrailPositions] = useState<THREE.Vector3[]>([])
  const previousJulianDayRef = useRef(julianDay)
  const maxTrailLength = Math.max(75, Math.round(225 / Math.sqrt(speed)))
  const maxFootprintTrailLength = Math.max(30, Math.round(75 / Math.sqrt(speed)))

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    // Rotate sun surface
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001
    }

    // Pulsing corona effect
    if (corona1Ref.current) {
      corona1Ref.current.scale.setScalar(1 + Math.sin(time * 0.5) * 0.05)
    }
    if (corona2Ref.current) {
      corona2Ref.current.scale.setScalar(1 + Math.sin(time * 0.3 + 1) * 0.08)
    }
    if (corona3Ref.current) {
      corona3Ref.current.scale.setScalar(1 + Math.sin(time * 0.2 + 2) * 0.1)
    }

    // Rotating solar flare effect
    if (flareRef.current) {
      flareRef.current.rotation.z = time * 0.1
    }

    // Subtle pulsing glow effect for highlight
    if (glowRef.current && isHighlighted) {
      const pulse = Math.sin(time * 2) * 0.1 + 1
      glowRef.current.scale.setScalar(pulse)
    }
  })

  const sunRadius = 0.25

  // Calculate zodiac sign for Sun's position
  const zodiacInfo = useMemo(() => {
    // For geocentric mode, Sun's position changes, so we calculate its zodiac sign
    // In heliocentric mode (position = [0,0,0]), this represents the theoretical position
    if (julianDay === 0) {
      // Default to Aries when no julian day provided
      return {
        zodiacColor: '#FF6B6B',
        zodiacSign: getZodiacSign(0)
      }
    }

    // Calculate ecliptic longitude based on Sun's position
    const eclipticLongitude = calculateAngleFromCoordinates(position[0], position[2])
    const sign = getZodiacSign(eclipticLongitude)

    return {
      zodiacColor: sign?.color || '#FFD700',
      zodiacSign: sign
    }
  }, [position, julianDay])

  // Convert position array to Vector3 for trail tracking
  const positionVec = useMemo(() => new THREE.Vector3(...position), [position])

  // Update trail when position changes (useful in geocentric mode)
  useEffect(() => {
    if (!showTrail) {
      if (trailPositions.length > 0) {
        setTrailPositions([])
      }
      if (footprintTrailPositions.length > 0) {
        setFootprintTrailPositions([])
      }
      previousJulianDayRef.current = julianDay
      return
    }

    // Detect significant time jumps
    const julianDayDiff = Math.abs(julianDay - previousJulianDayRef.current)
    const resetThreshold = speed * 50
    if (julianDayDiff > resetThreshold) {
      setTrailPositions([positionVec.clone()])
      const basePosition = new THREE.Vector3(position[0], -2.98, position[2])
      setFootprintTrailPositions([basePosition])
      previousJulianDayRef.current = julianDay
      return
    }

    // Add current position to trail
    setTrailPositions((prev) => {
      const newTrail = [...prev, positionVec.clone()]
      if (newTrail.length > maxTrailLength) {
        return newTrail.slice(newTrail.length - maxTrailLength)
      }
      return newTrail
    })

    // Add current base position to footprint trail
    const basePosition = new THREE.Vector3(position[0], -2.98, position[2])
    setFootprintTrailPositions((prev) => {
      const newTrail = [...prev, basePosition]
      if (newTrail.length > maxFootprintTrailLength) {
        return newTrail.slice(newTrail.length - maxFootprintTrailLength)
      }
      return newTrail
    })

    previousJulianDayRef.current = julianDay
  }, [positionVec, julianDay, showTrail, maxTrailLength, maxFootprintTrailLength, speed, position])

  return (
    <>
      {/* Motion trail - shows historical path with fade effect */}
      {showTrail && trailPositions.length > 1 && (() => {
        const colors = new Float32Array(trailPositions.length * 4)
        const baseColor = new THREE.Color(zodiacInfo.zodiacColor)

        for (let i = 0; i < trailPositions.length; i++) {
          const t = i / (trailPositions.length - 1)
          const alpha = Math.pow(t, 2) * 0.7

          colors[i * 4] = baseColor.r
          colors[i * 4 + 1] = baseColor.g
          colors[i * 4 + 2] = baseColor.b
          colors[i * 4 + 3] = alpha
        }

        return (
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(trailPositions.flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
              <bufferAttribute
                attach="attributes-color"
                args={[colors, 4]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              vertexColors
              transparent
              linewidth={2}
              blending={THREE.AdditiveBlending}
            />
          </line>
        )
      })()}

      {/* Footprint trail line at base of bowl */}
      {showTrail && showFootprints && footprintTrailPositions.length > 1 && (() => {
        const colors = new Float32Array(footprintTrailPositions.length * 4)
        const baseColor = new THREE.Color(zodiacInfo.zodiacColor)

        for (let i = 0; i < footprintTrailPositions.length; i++) {
          const t = i / (footprintTrailPositions.length - 1)
          const alpha = Math.pow(t, 2) * 0.7

          colors[i * 4] = baseColor.r
          colors[i * 4 + 1] = baseColor.g
          colors[i * 4 + 2] = baseColor.b
          colors[i * 4 + 3] = alpha
        }

        return (
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(footprintTrailPositions.flatMap((p) => [p.x, p.y, p.z])), 3]}
              />
              <bufferAttribute
                attach="attributes-color"
                args={[colors, 4]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              vertexColors
              transparent
              linewidth={2}
              blending={THREE.AdditiveBlending}
            />
          </line>
        )
      })()}

      {showSun && (
        <group position={position}>
          {/* Bright yellow core */}
          <mesh
            ref={meshRef}
            position={[0, 0, 0]}
            onClick={onClick}
            onPointerOver={(e) => {
              if (onClick) {
                e.stopPropagation()
                document.body.style.cursor = 'pointer'
              }
            }}
            onPointerOut={() => {
              if (onClick) {
                document.body.style.cursor = 'auto'
              }
            }}
          >
            <sphereGeometry args={[sunRadius, 32, 32]} />
            <meshBasicMaterial color="#FFFF00" toneMapped={false} />
          </mesh>

        {/* Inner yellow glow */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[sunRadius * 1.15, 32, 32]} />
          <meshBasicMaterial
            color="#FFFF00"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Outer orange glow */}
        <mesh ref={corona1Ref} position={[0, 0, 0]}>
          <sphereGeometry args={[sunRadius * 1.35, 32, 32]} />
          <meshBasicMaterial
            color="#FFA500"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Extended warm halo */}
        <mesh ref={corona2Ref} position={[0, 0, 0]}>
          <sphereGeometry args={[sunRadius * 1.6, 24, 24]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Point lights for scene illumination */}
        <pointLight position={[0, 0, 0]} intensity={1.5} distance={50} color="#FFFACD" decay={1.5} />
        <pointLight position={[0, 0, 0]} intensity={0.8} distance={80} color="#FFE87C" decay={2} />

        {/* Highlight effect - bright pulsing ring when selected */}
        {isHighlighted && (
          <>
            {/* Inner bright highlight ring */}
            <Sphere args={[sunRadius * 2.0, 16, 16]}>
              <meshBasicMaterial
                color="#00BFFF"
                transparent
                opacity={0.4}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </Sphere>

            {/* Outer pulsing highlight ring */}
            <Sphere ref={glowRef} args={[sunRadius * 2.5, 16, 16]}>
              <meshBasicMaterial
                color="#FFFFFF"
                transparent
                opacity={0.25}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </Sphere>

            {/* Extreme outer highlight glow */}
            <Sphere args={[sunRadius * 3.0, 12, 12]}>
              <meshBasicMaterial
                color="#87CEEB"
                transparent
                opacity={0.15}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </Sphere>
          </>
        )}

        {/* Sun label */}
        {showLabel && (
          <Html
            position={[0, sunRadius * 7, 0]}
            center
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                padding: '6px 12px',
                border: '2px solid #4a1d6f',
                borderRadius: '8px',
                backgroundColor: 'rgba(20, 10, 30, 0.8)',
              }}
            >
              <AstroSymbol
                planet="sun"
                size={28}
                color="white"
              />
              <span
                style={{
                  color: 'white',
                  fontSize: '26px',
                  fontWeight: '600',
                  textShadow: '0 0 8px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 0.9)',
                  letterSpacing: '0.5px',
                }}
              >
                Sun
              </span>
            </div>
          </Html>
        )}
      </group>
      )}

      {/* Radiant projection from sun to footprint - using absolute world coordinates */}
      {showFootprints && showPlanetToFootprintLines && (
        <>
          {/* Core bright beam - brighter for Sun */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    position[0], position[1] - sunRadius, position[2],  // Start at bottom of sun
                    position[0], -3, position[2]  // Base of bowl (y = -3)
                  ]),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.7}
              linewidth={2}
              blending={THREE.AdditiveBlending}
            />
          </line>

          {/* Inner glow layer - brighter for Sun */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    position[0], position[1] - sunRadius, position[2],
                    position[0], -3, position[2]
                  ]),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.5}
              linewidth={3}
              blending={THREE.AdditiveBlending}
            />
          </line>

          {/* Outer soft glow - brighter for Sun */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    position[0], position[1] - sunRadius, position[2],
                    position[0], -3, position[2]
                  ]),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.3}
              linewidth={4}
              blending={THREE.AdditiveBlending}
            />
          </line>
        </>
      )}

      {/* Sun footprint - ring at base of bowl using absolute world coordinates */}
      {showFootprints && (
        <group position={[position[0], -2.98, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* Main ring - larger and brighter for Sun */}
          <mesh>
            <ringGeometry args={[0.72, 0.76, 64]} />
            <meshBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outer glow for ring */}
          <mesh>
            <ringGeometry args={[0.68, 0.80, 64]} />
            <meshBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Central bright spot - larger for Sun */}
          <mesh>
            <circleGeometry args={[0.25, 32]} />
            <meshBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Inner glow - larger for Sun */}
          <mesh>
            <circleGeometry args={[0.40, 32]} />
            <meshBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Extra outer glow for Sun */}
          <mesh>
            <circleGeometry args={[0.60, 32]} />
            <meshBasicMaterial
              color={zodiacInfo.zodiacColor}
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}
    </>
  )
}
