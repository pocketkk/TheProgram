import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { PLANETS, calculatePlanetPosition, calculateAllGeocentricPositions, calculateAspect, Aspect } from '@/lib/astronomy/planetaryData'
import { detectAllPatterns, PlanetPosition as PatternPlanetPos } from '@/lib/astronomy/aspectPatterns'
import { calculateAngleFromCoordinates } from '../utils/calculations'

interface PlanetPosition {
  name: string
  position: THREE.Vector3
  color: string
}

interface AspectLinesProps {
  julianDay: number
  scale?: number
  showAspects?: boolean
  showPatterns?: boolean
  referenceFrame?: 'heliocentric' | 'geocentric'
  planetPositions?: PlanetPosition[]
}

interface AspectConnection {
  from: THREE.Vector3
  to: THREE.Vector3
  aspect: Aspect
  strength: number // 0-1, based on orb (1 = exact, 0 = at orb limit)
  planets: [string, string] // planet names
}

export const AspectLines = ({
  julianDay,
  scale = 2,
  showAspects = true,
  showPatterns = true,
  referenceFrame = 'heliocentric',
  planetPositions: providedPlanetPositions
}: AspectLinesProps) => {
  const { aspectConnections, patterns, planetPositionMap, sunPosition: _sunPosition } = useMemo(() => {
    if (!showAspects && !showPatterns) return { aspectConnections: [], patterns: [], planetPositionMap: new Map(), sunPosition: null }

    const connections: AspectConnection[] = []

    // Use provided planet positions if available, otherwise calculate them
    let planetPositions: Array<{ name: string; position: THREE.Vector3; angle: number }> = []
    const positionMap = new Map<string, THREE.Vector3>()
    let sunPos: THREE.Vector3 | null = null

    if (providedPlanetPositions && providedPlanetPositions.length > 0) {
      // Use the provided positions from SolarSystemScene (already correctly scaled and positioned)
      // Extract sun position and filter it out from planet-to-planet aspects
      providedPlanetPositions.forEach(p => {
        if (p.name === 'sun') {
          sunPos = p.position
          positionMap.set(p.name, p.position)
        } else {
          const _planetData = PLANETS[p.name]
          // Calculate angle from position for aspect calculations
          const angle = calculateAngleFromCoordinates(p.position.x, p.position.z)
          positionMap.set(p.name, p.position)
          planetPositions.push({
            name: p.name,
            position: p.position,
            angle: angle
          })
        }
      })
    } else {
      // Fallback: calculate positions ourselves (old behavior)
      const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

      // Get geocentric positions if in geocentric mode
      const geocentricPositions = referenceFrame === 'geocentric'
        ? calculateAllGeocentricPositions(julianDay)
        : null

      planetNames.forEach(name => {
        const planetData = PLANETS[name]

        // Use geocentric or heliocentric position based on reference frame
        const pos = geocentricPositions && geocentricPositions[name]
          ? geocentricPositions[name]
          : calculatePlanetPosition(planetData, julianDay)

        // Apply scaling based on planet distance (same as in Planet component)
        let scaleFactor = scale
        if (name === 'jupiter') scaleFactor = scale * 0.6
        else if (name === 'saturn') scaleFactor = scale * 0.4
        else if (name === 'uranus') scaleFactor = scale * 0.25
        else if (name === 'neptune') scaleFactor = scale * 0.2
        else if (name === 'pluto') scaleFactor = scale * 0.12

        const position = new THREE.Vector3(pos.x * scaleFactor, pos.y * scaleFactor, pos.z * scaleFactor)

        planetPositions.push({
          name,
          position,
          angle: pos.angle
        })

        positionMap.set(name, position)
      })
    }

    // Check all planet pairs for aspects
    if (showAspects) {
      for (let i = 0; i < planetPositions.length; i++) {
        for (let j = i + 1; j < planetPositions.length; j++) {
          const planet1 = planetPositions[i]
          const planet2 = planetPositions[j]

          const aspect = calculateAspect(planet1.angle, planet2.angle)

          if (aspect) {
            // Calculate actual angular difference
            const angleDiff = Math.abs(((planet1.angle - planet2.angle + 180) % 360) - 180)
            const orbDeviation = Math.abs(angleDiff - aspect.angle)

            // Calculate strength (1 = exact aspect, 0 = at orb limit)
            const strength = 1 - (orbDeviation / aspect.orb)

            connections.push({
              from: planet1.position,
              to: planet2.position,
              aspect,
              strength: Math.max(0, Math.min(1, strength)),
              planets: [planet1.name, planet2.name]
            })
          }
        }
      }

      // Add radial lines from all planets to the sun
      if (sunPos) {
        planetPositions.forEach(planet => {
          connections.push({
            from: planet.position,
            to: sunPos as THREE.Vector3,
            aspect: {
              name: 'Radial',
              angle: 0,
              type: 'major' as const,
              orb: 0,
              color: '#FFD700' // Gold color for sun radial lines
            },
            strength: 1.0, // Always full strength for radial lines
            planets: [planet.name, 'sun']
          })
        })
      }
    }

    // Detect aspect patterns
    let detectedPatterns: ReturnType<typeof detectAllPatterns> = []
    if (showPatterns) {
      const patternPositions: PatternPlanetPos[] = planetPositions.map(p => ({
        name: p.name,
        angle: p.angle,
        x: p.position.x,
        y: p.position.y,
        z: p.position.z
      }))

      detectedPatterns = detectAllPatterns(patternPositions)
    }

    return {
      aspectConnections: connections,
      patterns: detectedPatterns,
      planetPositionMap: positionMap,
      sunPosition: sunPos
    }
  }, [julianDay, scale, showAspects, showPatterns, referenceFrame, providedPlanetPositions])

  if (!showAspects && !showPatterns) {
    return null
  }

  return (
    <group>
      {/* Render aspect patterns with filled shapes */}
      {showPatterns && patterns.map((pattern, patternIndex) => {
        const positions = pattern.planets
          .map(name => planetPositionMap.get(name))
          .filter(pos => pos !== undefined) as THREE.Vector3[]

        if (positions.length < 3) return null

        // Create geometry for the pattern shape
        const shapeGeometry = new THREE.BufferGeometry()
        const vertices: number[] = []

        // Add vertices for the shape (triangulated)
        if (pattern.type === 'grand-trine' || pattern.type === 'kite') {
          // Triangular or kite shape - create triangulated mesh
          for (let i = 1; i < positions.length - 1; i++) {
            vertices.push(
              positions[0].x, positions[0].y, positions[0].z,
              positions[i].x, positions[i].y, positions[i].z,
              positions[i + 1].x, positions[i + 1].y, positions[i + 1].z
            )
          }
        } else if (pattern.type === 't-square') {
          // T-shape - draw triangle
          vertices.push(
            positions[0].x, positions[0].y, positions[0].z,
            positions[1].x, positions[1].y, positions[1].z,
            positions[2].x, positions[2].y, positions[2].z
          )
        } else if (pattern.type === 'grand-cross' && positions.length === 4) {
          // Cross shape - create two triangles
          vertices.push(
            positions[0].x, positions[0].y, positions[0].z,
            positions[1].x, positions[1].y, positions[1].z,
            positions[2].x, positions[2].y, positions[2].z,

            positions[0].x, positions[0].y, positions[0].z,
            positions[2].x, positions[2].y, positions[2].z,
            positions[3].x, positions[3].y, positions[3].z
          )
        } else if (pattern.type === 'yod') {
          // Triangle for yod
          vertices.push(
            positions[0].x, positions[0].y, positions[0].z,
            positions[1].x, positions[1].y, positions[1].z,
            positions[2].x, positions[2].y, positions[2].z
          )
        }

        if (vertices.length === 0) return null

        shapeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        shapeGeometry.computeVertexNormals()

        const opacity = 0.15 * pattern.strength

        return (
          <group key={`pattern-${patternIndex}`}>
            {/* Filled shape */}
            <mesh geometry={shapeGeometry}>
              <meshBasicMaterial
                color={pattern.color}
                transparent={true}
                opacity={opacity}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Highlighted edges of the pattern */}
            {positions.map((pos, i) => {
              const nextPos = positions[(i + 1) % positions.length]
              const lineWidth = 0.025 * pattern.strength
              const edgeOpacity = 0.8 * pattern.strength

              return (
                <Line
                  key={`pattern-edge-${patternIndex}-${i}`}
                  points={[pos, nextPos]}
                  color={pattern.color}
                  lineWidth={lineWidth}
                  transparent={true}
                  opacity={edgeOpacity}
                  // @ts-ignore
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              )
            })}
          </group>
        )
      })}

      {/* Render regular aspect lines */}
      {showAspects && aspectConnections.map((connection, index) => {
        // Check if this connection is part of a pattern - if so, dim it
        const partOfPattern = patterns.some(pattern =>
          pattern.planets.includes(connection.planets[0]) &&
          pattern.planets.includes(connection.planets[1])
        )

        // Calculate line opacity based on strength
        const baseOpacity = connection.aspect.type === 'major' ? 0.6 : 0.4
        const patternDimming = partOfPattern ? 0.5 : 1.0 // Dim lines that are part of patterns
        const opacity = baseOpacity * connection.strength * patternDimming

        // Calculate line width based on strength and aspect importance
        const baseWidth = connection.aspect.type === 'major' ? 0.015 : 0.01
        const lineWidth = baseWidth * (0.5 + connection.strength * 0.5)

        return (
          <Line
            key={`aspect-${index}`}
            points={[connection.from, connection.to]}
            color={connection.aspect.color}
            lineWidth={lineWidth}
            transparent={true}
            opacity={opacity}
            // @ts-ignore - drei Line doesn't expose blending in types but supports it
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        )
      })}
    </group>
  )
}
