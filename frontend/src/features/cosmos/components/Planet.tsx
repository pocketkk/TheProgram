import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sphere, Ring, Text, Billboard, Html } from '@react-three/drei'
import * as THREE from 'three'
import { PlanetData, getZodiacSign } from '@/lib/astronomy/planetaryData'
import { AstroSymbol } from './AstroSymbol'
import {
  calculateMeanAnomaly,
  degreesToRadians,
  normalizeAngle,
  daysSinceJ2000,
} from '../utils/calculations'

interface PlanetProps {
  data: PlanetData
  julianDay: number
  scale?: number
  showPlanet?: boolean // Show/hide the planet sphere itself (independent of footprint)
  showOrbit?: boolean
  showLabel?: boolean
  showTrail?: boolean
  showFootprints?: boolean
  showPlanetToFootprintLines?: boolean
  isRetrograde?: boolean
  onClick?: () => void
  positionOverride?: { x: number; y: number; z: number } | null
  hideOrbit?: boolean // Hide orbit line (used in geocentric mode)
  isHighlighted?: boolean // Special highlight effect when selected from key
  speed?: number // Days per frame (for adjusting trail length)
  allPlanetPositions?: Array<{ name: string; position: THREE.Vector3; color: string }> // All planet 3D positions for compass
}

// Planet-specific material properties for realism
const getPlanetRoughness = (planetName: string): number => {
  const roughnessMap: Record<string, number> = {
    Mercury: 0.9, // Rocky, cratered surface
    Venus: 0.3, // Thick atmosphere, smoother appearance
    Earth: 0.6, // Mix of water and land
    Mars: 0.8, // Dry, dusty surface
    Jupiter: 0.4, // Gas giant, cloud bands
    Saturn: 0.5, // Gas giant with less contrast
    Uranus: 0.3, // Smooth ice giant
    Neptune: 0.3, // Smooth ice giant
  }
  return roughnessMap[planetName] || 0.7
}

const getPlanetMetalness = (planetName: string): number => {
  const metalnessMap: Record<string, number> = {
    Mercury: 0.4, // High metal content
    Venus: 0.1, // Atmosphere dominant
    Earth: 0.2, // Water reflects light
    Mars: 0.15, // Iron oxide
    Jupiter: 0.1, // Gas
    Saturn: 0.1, // Gas
    Uranus: 0.2, // Ice/methane
    Neptune: 0.2, // Ice/methane
  }
  return metalnessMap[planetName] || 0.2
}

const getPlanetEmissive = (planetName: string): number => {
  const emissiveMap: Record<string, number> = {
    Mercury: 0.1,
    Venus: 0.15, // Bright atmosphere
    Earth: 0.12,
    Mars: 0.08,
    Jupiter: 0.2, // Gas giant, more internal heat
    Saturn: 0.15,
    Uranus: 0.1,
    Neptune: 0.12,
  }
  return emissiveMap[planetName] || 0.1
}

const getAtmosphereColor = (planetName: string): string => {
  const atmosphereMap: Record<string, string> = {
    Mercury: '#8C7853', // No atmosphere, use planet color
    Venus: '#FFE4B5', // Yellowish atmosphere
    Earth: '#4A90E2', // Blue atmosphere
    Mars: '#E27B58', // Reddish dust
    Jupiter: '#D4A574', // Brownish-yellow bands
    Saturn: '#F4E4C1', // Pale yellow
    Uranus: '#4FD0E7', // Cyan
    Neptune: '#4B70DD', // Deep blue
  }
  return atmosphereMap[planetName] || '#FFFFFF'
}

const getAtmosphereOpacity = (planetName: string): number => {
  const opacityMap: Record<string, number> = {
    Mercury: 0, // No atmosphere
    Venus: 0.25, // Thick atmosphere
    Earth: 0.15, // Visible atmosphere
    Mars: 0.08, // Thin atmosphere
    Jupiter: 0.2, // Gas giant
    Saturn: 0.18, // Gas giant
    Uranus: 0.15, // Ice giant
    Neptune: 0.15, // Ice giant
  }
  return opacityMap[planetName] || 0.1
}

export const Planet = ({
  data,
  julianDay,
  scale = 1,
  showPlanet = true,
  showOrbit = true,
  showLabel = true,
  showTrail = false,
  showFootprints = true,
  showPlanetToFootprintLines = true,
  isRetrograde = false,
  onClick,
  positionOverride = null,
  hideOrbit = false,
  isHighlighted = false,
  speed = 1,
  allPlanetPositions = [],
}: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  // Dynamic label scaling based on camera distance
  const [labelScale, setLabelScale] = useState(1)

  // Trail tracking system
  const [trailPositions, setTrailPositions] = useState<THREE.Vector3[]>([])
  const [footprintTrailPositions, setFootprintTrailPositions] = useState<THREE.Vector3[]>([])
  const previousJulianDayRef = useRef(julianDay)
  // Adjust trail length based on speed with diminishing reduction (square root)
  // Ensures trails remain visually significant even at high speeds
  // At 1 day/frame: 225 points
  // At 7 days/frame: ~85 points
  // At 30 days/frame: ~75 points (minimum)
  // At 365 days/frame: ~75 points (minimum)
  const maxTrailLength = Math.max(75, Math.round(225 / Math.sqrt(speed)))
  const maxFootprintTrailLength = Math.max(30, Math.round(75 / Math.sqrt(speed)))

  // Calculate orbital position and zodiac sign
  const { position, zodiacColor, zodiacSign, eclipticLongitude } = useMemo(() => {
    // If position override is provided (geocentric mode), use it
    if (positionOverride) {
      const x = positionOverride.x * scale
      const y = positionOverride.y * scale
      const z = positionOverride.z * scale

      // Still calculate ecliptic longitude for zodiac sign
      const days = daysSinceJ2000(julianDay)
      const meanAnomaly = calculateMeanAnomaly(data.orbitPeriod, days)
      const eclipticLongitude = normalizeAngle(meanAnomaly)
      const sign = getZodiacSign(eclipticLongitude)

      // Safety check for undefined sign
      if (!sign) {
        console.error('Undefined zodiac sign for', data.name, 'at longitude', eclipticLongitude)
        return {
          position: new THREE.Vector3(x, y, z),
          zodiacColor: '#FFFFFF',
          zodiacSign: { name: 'Unknown', symbol: '?', color: '#FFFFFF', element: 'unknown', startDegree: 0, endDegree: 0 },
          eclipticLongitude: 0
        }
      }

      return {
        position: new THREE.Vector3(x, y, z),
        zodiacColor: sign.color,
        zodiacSign: sign,
        eclipticLongitude
      }
    }

    // Normal heliocentric calculation
    const days = daysSinceJ2000(julianDay)

    // Mean anomaly
    const meanAnomaly = calculateMeanAnomaly(data.orbitPeriod, days)
    const angle = degreesToRadians(meanAnomaly)

    // Apply inclination
    const inclinationRad = degreesToRadians(data.inclination)

    const x = data.orbitRadius * Math.cos(angle) * scale
    const y = data.orbitRadius * Math.sin(inclinationRad) * Math.sin(angle) * scale
    const z = data.orbitRadius * Math.sin(angle) * Math.cos(inclinationRad) * scale

    // Calculate ecliptic longitude (in degrees, 0-360)
    const eclipticLongitude = normalizeAngle(meanAnomaly)

    // Get zodiac sign and color for this planet's position
    const sign = getZodiacSign(eclipticLongitude)

    // Safety check for undefined sign
    if (!sign) {
      console.error('Undefined zodiac sign for', data.name, 'at longitude', eclipticLongitude)
      return {
        position: new THREE.Vector3(x, y, z),
        zodiacColor: '#FFFFFF',
        zodiacSign: { name: 'Unknown', symbol: '?', color: '#FFFFFF', element: 'unknown', startDegree: 0, endDegree: 0 },
        eclipticLongitude: 0
      }
    }

    return {
      position: new THREE.Vector3(x, y, z),
      zodiacColor: sign.color,
      zodiacSign: sign,
      eclipticLongitude
    }
  }, [data, julianDay, scale, positionOverride])

  // Calculate detailed footprint information
  const footprintInfo = useMemo(() => {
    // Degree within the current zodiac sign (0-30)
    const degreeInSign = eclipticLongitude % 30
    const degrees = Math.floor(degreeInSign)
    const minutes = Math.floor((degreeInSign - degrees) * 60)

    // Human Design gate (1-64) - simplified calculation based on ecliptic longitude
    // Each gate is approximately 5.625 degrees (360 / 64)
    const gateNumber = Math.floor(eclipticLongitude / 5.625) + 1

    return {
      degreeInSign,
      formattedDegree: `${degrees}°${minutes}'`,
      gateNumber: gateNumber > 64 ? 64 : gateNumber,
      isRetrograde: isRetrograde || false
    }
  }, [eclipticLongitude, isRetrograde])

  // Update trail when position changes
  useEffect(() => {
    if (!showTrail) {
      // Clear trail when disabled
      if (trailPositions.length > 0) {
        setTrailPositions([])
      }
      if (footprintTrailPositions.length > 0) {
        setFootprintTrailPositions([])
      }
      previousJulianDayRef.current = julianDay
      return
    }

    // Detect significant time jumps (user scrubbing timeline)
    // Threshold scales with speed: normal playback at high speeds shouldn't reset trails
    const julianDayDiff = Math.abs(julianDay - previousJulianDayRef.current)
    const resetThreshold = speed * 50 // Allow jumps up to 50 frames worth of time
    if (julianDayDiff > resetThreshold) {
      // Reset trail on large time jumps (user scrubbing, not normal playback)
      setTrailPositions([position.clone()])
      // Base position for footprint (projected onto bowl bottom)
      const basePosition = new THREE.Vector3(position.x, -2.98, position.z)
      setFootprintTrailPositions([basePosition])
      previousJulianDayRef.current = julianDay
      return
    }

    // Add current position to trail
    setTrailPositions((prev) => {
      const newTrail = [...prev, position.clone()]
      // Keep only the last maxTrailLength positions
      if (newTrail.length > maxTrailLength) {
        return newTrail.slice(newTrail.length - maxTrailLength)
      }
      return newTrail
    })

    // Add current base position to footprint trail
    const basePosition = new THREE.Vector3(position.x, -2.98, position.z)
    setFootprintTrailPositions((prev) => {
      const newTrail = [...prev, basePosition]
      // Keep only the last maxFootprintTrailLength positions
      if (newTrail.length > maxFootprintTrailLength) {
        return newTrail.slice(newTrail.length - maxFootprintTrailLength)
      }
      return newTrail
    })

    previousJulianDayRef.current = julianDay
  }, [position, julianDay, showTrail, maxTrailLength, maxFootprintTrailLength, speed])

  // Improved planet size normalization - makes all planets clearly visible
  // while maintaining relative size differences
  const displayRadius = useMemo(() => {
    const minSize = 0.08 // Minimum size for smallest planets
    const maxSize = 0.45  // Maximum size for largest planets

    // Normalize using power function for better visual balance
    // This makes small planets much more visible while keeping relative differences
    const normalized = Math.pow(data.radius / 70000, 0.4) // Power of 0.4 for gentle scaling
    return minSize + (normalized * (maxSize - minSize))
  }, [data.radius])

  // Rotation and pulsing glow animation
  useFrame((state) => {
    if (meshRef.current && data.rotationPeriod > 0) {
      meshRef.current.rotation.y += 0.01 / data.rotationPeriod
    }

    // Subtle pulsing glow effect to make planets more noticeable
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1
      glowRef.current.scale.setScalar(pulse)
    }

    // Calculate label scale based on camera distance
    // Labels maintain consistent size regardless of zoom level
    const distanceToCamera = camera.position.distanceTo(position)
    const baseDistance = 15 // Reference distance for scale = 1
    const minScale = 0.5 // Minimum scale when very close
    const maxScale = 2.5 // Maximum scale when far away

    // Inverse scaling: closer = smaller labels, farther = larger labels
    const calculatedScale = Math.max(minScale, Math.min(maxScale, baseDistance / distanceToCamera))
    setLabelScale(calculatedScale)
  })

  // Create orbit path
  const orbitPoints = useMemo(() => {
    const points = []
    const segments = 128
    const inclinationRad = (data.inclination * Math.PI) / 180

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = data.orbitRadius * Math.cos(angle) * scale
      const y = data.orbitRadius * Math.sin(inclinationRad) * Math.sin(angle) * scale
      const z = data.orbitRadius * Math.sin(angle) * Math.cos(inclinationRad) * scale
      points.push(new THREE.Vector3(x, y, z))
    }

    return points
  }, [data.orbitRadius, data.inclination, scale])

  return (
    <group ref={groupRef}>
      {/* Orbital path - only show heliocentric orbits, not in geocentric mode */}
      {showOrbit && data.orbitRadius > 0 && !hideOrbit && (
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
            opacity={0.2}
          />
        </line>
      )}

      {/* Motion trail - shows historical path with fade effect */}
      {showTrail && trailPositions.length > 1 && (() => {
        // Create color array with fading opacity
        const colors = new Float32Array(trailPositions.length * 4) // RGBA for each point
        const baseColor = new THREE.Color(zodiacColor)

        for (let i = 0; i < trailPositions.length; i++) {
          const t = i / (trailPositions.length - 1) // 0 to 1 (oldest to newest)
          const alpha = Math.pow(t, 2) * 0.7 // Quadratic fade: oldest = 0, newest = 0.7

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
        // Create color array with fading opacity for footprint trail
        const colors = new Float32Array(footprintTrailPositions.length * 4) // RGBA for each point
        const baseColor = new THREE.Color(zodiacColor)

        for (let i = 0; i < footprintTrailPositions.length; i++) {
          const t = i / (footprintTrailPositions.length - 1) // 0 to 1 (oldest to newest)
          const alpha = Math.pow(t, 2) * 0.7 // Quadratic fade: oldest = 0, newest = 0.7

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

      {/* Radiant projection from planet to footprint */}
      {showFootprints && showPlanetToFootprintLines && (
        <>
          {/* Core bright beam */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    position.x, position.y - displayRadius, position.z,  // Start at bottom of planet
                    position.x, -3, position.z  // Base of bowl (y = -3)
                  ]),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={zodiacColor}
              transparent
              opacity={0.4}
              linewidth={1}
              blending={THREE.AdditiveBlending}
            />
          </line>

          {/* Inner glow layer */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    position.x, position.y - displayRadius, position.z,
                    position.x, -3, position.z
                  ]),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={zodiacColor}
              transparent
              opacity={0.2}
              linewidth={2}
              blending={THREE.AdditiveBlending}
            />
          </line>

          {/* Outer soft glow */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    position.x, position.y - displayRadius, position.z,
                    position.x, -3, position.z
                  ]),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={zodiacColor}
              transparent
              opacity={0.1}
              linewidth={3}
              blending={THREE.AdditiveBlending}
            />
          </line>
        </>
      )}

      {/* Current footprint - ring with planet position markers */}
      {showFootprints && (
        <group position={[position.x, -2.98, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* Single orbit ring showing all planet positions */}
          <mesh>
            <ringGeometry args={[0.52, 0.54, 64]} />
            <meshBasicMaterial
              color={zodiacColor}
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outer glow for ring */}
          <mesh>
            <ringGeometry args={[0.50, 0.56, 64]} />
            <meshBasicMaterial
              color={zodiacColor}
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Footprint Information Display - curved around ring */}
          <group>
            {/* Top: Zodiac sign with degree */}
            <Billboard
              position={[0, 0.72, 0]}
              follow={true}
              lockX={false}
              lockY={false}
              lockZ={false}
            >
              <Text
                fontSize={0.09}
                color={zodiacColor}
                anchorX="center"
                anchorY="middle"
              >
                {zodiacSign.symbol} {footprintInfo.formattedDegree}
              </Text>
            </Billboard>

            {/* Right: Human Design Gate badge */}
            <Billboard
              position={[0.72, 0, 0]}
              follow={true}
              lockX={false}
              lockY={false}
              lockZ={false}
            >
              <group>
                {/* Badge background */}
                <mesh position={[0, 0, -0.01]}>
                  <planeGeometry args={[0.18, 0.08]} />
                  <meshBasicMaterial
                    color="#4a1d96"
                    transparent
                    opacity={0.8}
                  />
                </mesh>
                <Text
                  fontSize={0.06}
                  color="#a78bfa"
                  anchorX="center"
                  anchorY="middle"
                >
                  G{footprintInfo.gateNumber}
                </Text>
              </group>
            </Billboard>

            {/* Bottom: Zodiac sign name */}
            <Billboard
              position={[0, -0.72, 0]}
              follow={true}
              lockX={false}
              lockY={false}
              lockZ={false}
            >
              <Text
                fontSize={0.07}
                color={zodiacColor}
                anchorX="center"
                anchorY="middle"
              >
                {zodiacSign.name}
              </Text>
            </Billboard>

            {/* Left: Retrograde indicator (if retrograde) */}
            {footprintInfo.isRetrograde && (
              <Billboard
                position={[-0.72, 0, 0]}
                follow={true}
                lockX={false}
                lockY={false}
                lockZ={false}
              >
                <group>
                  {/* Badge background */}
                  <mesh position={[0, 0, -0.01]}>
                    <planeGeometry args={[0.12, 0.12]} />
                    <meshBasicMaterial
                      color="#dc2626"
                      transparent
                      opacity={0.8}
                    />
                  </mesh>
                  <Text
                    fontSize={0.09}
                    color="#fca5a5"
                    anchorX="center"
                    anchorY="middle"
                  >
                    ℞
                  </Text>
                </group>
              </Billboard>
            )}
          </group>

          {/* Innermost circle - thin */}
          <mesh>
            <ringGeometry args={[0.06, 0.08, 32]} />
            <meshBasicMaterial
              color={data.color}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Second circle - getting thicker */}
          <mesh>
            <ringGeometry args={[0.12, 0.18, 32]} />
            <meshBasicMaterial
              color={data.color}
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Third circle - thickest (peak) */}
          <mesh>
            <ringGeometry args={[0.22, 0.3, 32]} />
            <meshBasicMaterial
              color={data.color}
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outermost circle - thin again */}
          <mesh>
            <ringGeometry args={[0.34, 0.36, 32]} />
            <meshBasicMaterial
              color={data.color}
              transparent
              opacity={0.15}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Central glow disc - just a point */}
          <mesh>
            <circleGeometry args={[0.015, 16]} />
            <meshBasicMaterial
              color={data.color}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Planet group */}
      {showPlanet && (
        <group position={position}>
        {/* Main planet sphere with enhanced materials */}
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
            roughness={getPlanetRoughness(data.name)}
            metalness={getPlanetMetalness(data.name)}
            emissive={data.color}
            emissiveIntensity={getPlanetEmissive(data.name) * 2.5}
            envMapIntensity={0.8}
          />
        </Sphere>

        {/* Atmospheric rim light effect */}
        <Sphere args={[displayRadius * 1.05, 16, 16]}>
          <meshBasicMaterial
            color={getAtmosphereColor(data.name)}
            transparent
            opacity={getAtmosphereOpacity(data.name)}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </Sphere>

        {/* Inner glow - bright and prominent - ZODIAC COLORED HALO */}
        <Sphere args={[displayRadius * 1.15, 12, 12]}>
          <meshBasicMaterial
            color={isRetrograde ? '#FF6347' : zodiacColor}
            transparent
            opacity={isRetrograde ? 0.25 : 0.22}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>

        {/* Mid glow layer - pulsing - ZODIAC COLORED HALO */}
        <Sphere ref={glowRef} args={[displayRadius * 1.3, 8, 8]}>
          <meshBasicMaterial
            color={isRetrograde ? '#FF4500' : zodiacColor}
            transparent
            opacity={isRetrograde ? 0.15 : 0.16}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>

        {/* Outer glow layer - soft halo - ZODIAC COLORED HALO */}
        <Sphere args={[displayRadius * 1.6, 8, 8]}>
          <meshBasicMaterial
            color={isRetrograde ? '#FF4500' : zodiacColor}
            transparent
            opacity={isRetrograde ? 0.08 : 0.10}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>

        {/* Retrograde indicator - extra pulsing ring */}
        {isRetrograde && (
          <Sphere args={[displayRadius * 1.8, 8, 8]}>
            <meshBasicMaterial
              color="#FF6B6B"
              transparent
              opacity={0.2}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </Sphere>
        )}

        {/* Highlight effect - bright pulsing ring when selected from key */}
        {isHighlighted && (
          <>
            {/* Inner bright highlight ring */}
            <Sphere args={[displayRadius * 2.0, 16, 16]}>
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
            <Sphere ref={glowRef} args={[displayRadius * 2.5, 16, 16]}>
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
            <Sphere args={[displayRadius * 3.0, 12, 12]}>
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

        {/* Planet rings with enhanced visuals */}
        {data.hasRings && (
          <group rotation-x={Math.PI / 2}>
            {/* Saturn's prominent rings */}
            {data.name === 'Saturn' && (
              <>
                {/* Inner C Ring */}
                <Ring args={[displayRadius * 1.3, displayRadius * 1.7, 32]}>
                  <meshBasicMaterial
                    color="#B8A072"
                    transparent
                    opacity={0.3}
                    side={THREE.DoubleSide}
                  />
                </Ring>

                {/* Bright B Ring */}
                <Ring args={[displayRadius * 1.75, displayRadius * 2.3, 32]}>
                  <meshBasicMaterial
                    color="#D4B896"
                    transparent
                    opacity={0.7}
                    side={THREE.DoubleSide}
                  />
                </Ring>

                {/* Cassini Division (gap) */}
                {/* A Ring */}
                <Ring args={[displayRadius * 2.35, displayRadius * 2.8, 32]}>
                  <meshBasicMaterial
                    color="#C8A882"
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                  />
                </Ring>

                {/* Faint outer rings */}
                <Ring args={[displayRadius * 2.85, displayRadius * 3.2, 32]}>
                  <meshBasicMaterial
                    color="#A89070"
                    transparent
                    opacity={0.2}
                    side={THREE.DoubleSide}
                  />
                </Ring>
              </>
            )}

            {/* Jupiter's faint rings */}
            {data.name === 'Jupiter' && (
              <Ring args={[displayRadius * 1.8, displayRadius * 2.5, 32]}>
                <meshBasicMaterial
                  color="#D4A574"
                  transparent
                  opacity={0.15}
                  side={THREE.DoubleSide}
                />
              </Ring>
            )}

            {/* Uranus's dark rings */}
            {data.name === 'Uranus' && (
              <>
                <Ring args={[displayRadius * 1.6, displayRadius * 1.65, 32]}>
                  <meshBasicMaterial
                    color="#2F4F6F"
                    transparent
                    opacity={0.4}
                    side={THREE.DoubleSide}
                  />
                </Ring>
                <Ring args={[displayRadius * 1.8, displayRadius * 1.85, 32]}>
                  <meshBasicMaterial
                    color="#2F4F6F"
                    transparent
                    opacity={0.35}
                    side={THREE.DoubleSide}
                  />
                </Ring>
              </>
            )}
          </group>
        )}

        {/* Planet label - elevated without connecting line */}
        {showLabel && (
          <Html
            position={[0, displayRadius * 7, 0]}
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
                planet={data.name.toLowerCase()}
                size={28}
                color={isRetrograde ? '#FF6B6B' : 'white'}
              />
              <span
                style={{
                  color: isRetrograde ? '#FF6B6B' : 'white',
                  fontSize: '26px',
                  fontWeight: '600',
                  textShadow: '0 0 8px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 0.9)',
                  letterSpacing: '0.5px',
                }}
              >
                {data.name}{isRetrograde ? ' ℞' : ''}
              </span>
            </div>
          </Html>
        )}
      </group>
      )}
    </group>
  )
}
