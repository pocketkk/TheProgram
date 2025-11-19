import { useMemo } from 'react'
import { Line, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { ZODIAC_SIGNS } from '@/lib/astronomy/planetaryData'

interface HouseSystemProps {
  julianDay: number
  showHouses?: boolean
  houseSystem?: 'equal' | 'placidus' | 'whole-sign'
  ascendantDegree?: number // If provided, use this as 1st house cusp, otherwise calculate
}

/**
 * Calculate Ascendant (Rising Sign) based on time and location
 * For now using simplified calculation - in reality this requires exact time and coordinates
 */
function calculateAscendant(julianDay: number): number {
  // Simplified: Use the Sun's position as a proxy for demonstration
  // In reality, ascendant depends on local sidereal time and latitude
  const daysSinceJ2000 = julianDay - 2451545.0
  const sunLongitude = (280.459 + 0.98564736 * daysSinceJ2000) % 360

  // For demonstration, offset by 90° (ascendant is typically ~6 hours ahead)
  return (sunLongitude + 90) % 360
}

/**
 * Calculate house cusps based on the house system
 */
function calculateHouseCusps(
  ascendantDegree: number,
  houseSystem: 'equal' | 'placidus' | 'whole-sign'
): number[] {
  const cusps: number[] = []

  switch (houseSystem) {
    case 'equal':
      // Equal house: Each house is exactly 30°
      for (let i = 0; i < 12; i++) {
        cusps.push((ascendantDegree + i * 30) % 360)
      }
      break

    case 'whole-sign':
      // Whole sign: Each house starts at 0° of a sign
      const ascendantSign = Math.floor(ascendantDegree / 30)
      for (let i = 0; i < 12; i++) {
        cusps.push(((ascendantSign + i) * 30) % 360)
      }
      break

    case 'placidus':
      // Placidus is complex and requires latitude/time
      // For now, fall back to equal house
      for (let i = 0; i < 12; i++) {
        cusps.push((ascendantDegree + i * 30) % 360)
      }
      break
  }

  return cusps
}

export const HouseSystem = ({
  julianDay,
  showHouses = true,
  houseSystem = 'equal',
  ascendantDegree
}: HouseSystemProps) => {
  const { cusps, houseLabels } = useMemo(() => {
    if (!showHouses) return { cusps: [], houseLabels: [] }

    // Calculate or use provided ascendant
    const asc = ascendantDegree !== undefined ? ascendantDegree : calculateAscendant(julianDay)

    // Calculate house cusps
    const houseCusps = calculateHouseCusps(asc, houseSystem)

    // Create house labels with zodiac signs
    const labels = houseCusps.map((cuspDegree, index) => {
      const houseNumber = index + 1
      const signIndex = Math.floor(cuspDegree / 30)
      const zodiacSign = ZODIAC_SIGNS[signIndex]
      const degreeInSign = Math.floor(cuspDegree % 30)

      return {
        houseNumber,
        cuspDegree,
        zodiacSign,
        degreeInSign,
        // Special labels for important houses
        specialName:
          houseNumber === 1 ? 'ASC' :
          houseNumber === 4 ? 'IC' :
          houseNumber === 7 ? 'DSC' :
          houseNumber === 10 ? 'MC' :
          null
      }
    })

    return { cusps: houseCusps, houseLabels: labels }
  }, [julianDay, showHouses, houseSystem, ascendantDegree])

  if (!showHouses || cusps.length === 0) {
    return null
  }

  const radius = 15.5 // Outer radius for house lines (outside zodiac ring)
  const innerRadius = 12.5 // Inner radius
  const labelRadius = 17 // Radius for labels

  return (
    <group>
      {/* House cusp lines */}
      {cusps.map((cuspDegree, index) => {
        // Convert degree to radians (0° = 3 o'clock, counterclockwise)
        const angle = ((cuspDegree - 90) * Math.PI) / 180

        const x1 = Math.cos(angle) * innerRadius
        const z1 = Math.sin(angle) * innerRadius
        const x2 = Math.cos(angle) * radius
        const z2 = Math.sin(angle) * radius

        // Special houses (1, 4, 7, 10) get thicker lines
        const isAngular = index === 0 || index === 3 || index === 6 || index === 9
        const lineWidth = isAngular ? 0.025 : 0.015
        const opacity = isAngular ? 0.8 : 0.5

        return (
          <Line
            key={`house-cusp-${index}`}
            points={[
              new THREE.Vector3(x1, 0, z1),
              new THREE.Vector3(x2, 0, z2)
            ]}
            color={isAngular ? '#FFD700' : '#87CEEB'}
            lineWidth={lineWidth}
            transparent={true}
            opacity={opacity}
            depthWrite={false}
          />
        )
      })}

      {/* House number labels */}
      {houseLabels.map((label, index) => {
        const midAngle = ((label.cuspDegree + 15 - 90) * Math.PI) / 180 // Middle of house
        const x = Math.cos(midAngle) * labelRadius
        const z = Math.sin(midAngle) * labelRadius

        return (
          <group key={`house-label-${index}`} position={[x, 0, z]}>
            {/* House number */}
            <Billboard
              follow={true}
              lockX={false}
              lockY={false}
              lockZ={false}
            >
              <Text
                position={[0, 0.5, 0]}
                fontSize={0.6}
                color="#FFFFFF"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="#000000"
              >
                {label.specialName || `${label.houseNumber}`}
              </Text>

              {/* Zodiac sign and degree on cusp */}
              <Text
                position={[0, -0.3, 0]}
                fontSize={0.3}
                color="#CCCCCC"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#000000"
              >
                {`${label.zodiacSign.symbol}${label.degreeInSign}°`}
              </Text>
            </Billboard>
          </group>
        )
      })}

      {/* House rings - subtle circles showing house boundaries */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[innerRadius - 0.05, innerRadius + 0.05, 64]} />
        <meshBasicMaterial
          color="#87CEEB"
          transparent={true}
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[radius - 0.05, radius + 0.05, 64]} />
        <meshBasicMaterial
          color="#FFD700"
          transparent={true}
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Shaded house sections (alternating for visibility) */}
      {cusps.map((cuspDegree, index) => {
        if (index % 2 === 1) return null // Only shade every other house

        const startAngle = ((cuspDegree - 90) * Math.PI) / 180
        const endAngle = ((cusps[(index + 1) % 12] - 90) * Math.PI) / 180

        // Create arc shape
        const arcShape = new THREE.Shape()
        arcShape.absarc(0, 0, radius, startAngle, endAngle, false)
        arcShape.absarc(0, 0, innerRadius, endAngle, startAngle, true)
        arcShape.closePath()

        const geometry = new THREE.ShapeGeometry(arcShape)

        return (
          <mesh
            key={`house-shade-${index}`}
            geometry={geometry}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.01, 0]}
          >
            <meshBasicMaterial
              color="#1a1a3e"
              transparent={true}
              opacity={0.2}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
