/**
 * North Indian Chart Component
 *
 * Displays a Vedic chart in the North Indian format:
 * - Diamond pattern with ascendant at top center
 * - Houses are fixed positions, signs rotate
 * - House 1 always at top center diamond
 */
import React from 'react'
import { motion } from 'framer-motion'
import {
  getNorthIndianHousePolygons,
  getNorthIndianHouseCenters,
  polygonToPath,
} from '../utils/chartLayout'
import {
  VEDIC_SIGNS,
  PLANET_ABBREVIATIONS,
  PLANET_COLORS,
  DIGNITY_COLORS,
  CLASSICAL_PLANETS,
  getSignFromLongitude,
} from '../utils/vedicConstants'
import type { VedicPlanetPosition } from '../types'

interface NorthIndianChartProps {
  planets: Record<string, VedicPlanetPosition>
  ascendant: number
  dignities?: Record<string, string>
  size?: number
  selectedHouse?: number | null
  selectedPlanet?: string | null
  hoveredHouse?: number | null
  hoveredPlanet?: string | null
  onHouseClick?: (house: number) => void
  onPlanetClick?: (planet: string) => void
  onHouseHover?: (house: number | null) => void
  onPlanetHover?: (planet: string | null) => void
}

export const NorthIndianChart: React.FC<NorthIndianChartProps> = ({
  planets,
  ascendant,
  dignities = {},
  size = 400,
  selectedHouse,
  selectedPlanet,
  hoveredHouse,
  hoveredPlanet,
  onHouseClick,
  onPlanetClick,
  onHouseHover,
  onPlanetHover,
}) => {
  const housePolygons = getNorthIndianHousePolygons(size)
  const houseCenters = getNorthIndianHouseCenters(size)
  const ascendantSign = getSignFromLongitude(ascendant)

  // Group planets by house (1-12)
  const planetsByHouse: Record<number, string[]> = {}
  for (const [name, planet] of Object.entries(planets)) {
    if (!CLASSICAL_PLANETS.includes(name)) continue
    const house = planet.house || 1
    if (!planetsByHouse[house]) planetsByHouse[house] = []
    planetsByHouse[house].push(name)
  }

  // Get sign for a given house number
  const getSignForHouse = (houseNumber: number): number => {
    return (ascendantSign + houseNumber - 1) % 12
  }

  // Render a single house
  const renderHouse = (houseNumber: number) => {
    const polygon = housePolygons[houseNumber]
    const center = houseCenters[houseNumber]
    const signIndex = getSignForHouse(houseNumber)
    const sign = VEDIC_SIGNS[signIndex]
    const planetsInHouse = planetsByHouse[houseNumber] || []
    const isAscendant = houseNumber === 1
    const isSelected = selectedHouse === houseNumber
    const isHovered = hoveredHouse === houseNumber

    const pathD = polygonToPath(polygon)

    // Calculate planet positions within the house
    const getPlanetOffset = (idx: number, total: number): [number, number] => {
      if (total === 1) return [0, 8]
      const angle = (idx / total) * Math.PI * 2 - Math.PI / 2
      const radius = 18
      return [Math.cos(angle) * radius, Math.sin(angle) * radius + 8]
    }

    return (
      <g key={houseNumber}>
        {/* House polygon */}
        <motion.path
          d={pathD}
          fill={isAscendant ? 'rgba(247, 179, 43, 0.2)' : 'rgba(26, 11, 46, 0.85)'}
          stroke={isSelected ? '#f7b32b' : isHovered ? '#b794f6' : 'rgba(183, 148, 246, 0.3)'}
          strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
          className="cursor-pointer transition-all duration-200"
          onClick={() => onHouseClick?.(houseNumber)}
          onMouseEnter={() => onHouseHover?.(houseNumber)}
          onMouseLeave={() => onHouseHover?.(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: houseNumber * 0.03 }}
        />

        {/* House number */}
        <text
          x={center[0]}
          y={center[1] - 20}
          fill={isAscendant ? '#f7b32b' : '#b794f6'}
          fontSize={13}
          fontWeight="bold"
          textAnchor="middle"
          style={{
            textShadow: isAscendant
              ? '0 0 12px rgba(247, 179, 43, 0.6), 0 0 6px rgba(247, 179, 43, 0.4)'
              : '0 0 10px rgba(183, 148, 246, 0.5), 0 0 5px rgba(183, 148, 246, 0.3)'
          }}
        >
          {houseNumber}
        </text>

        {/* Sign symbol */}
        <text
          x={center[0]}
          y={center[1] - 6}
          fill={isAscendant ? '#f7b32b' : '#d4baff'}
          fontSize={12}
          textAnchor="middle"
          fontWeight="600"
          style={{
            textShadow: isAscendant
              ? '0 0 8px rgba(247, 179, 43, 0.5)'
              : '0 0 8px rgba(212, 186, 255, 0.4)'
          }}
        >
          {sign.symbol}
        </text>

        {/* Planets */}
        {planetsInHouse.map((planetName, idx) => {
          const planet = planets[planetName]
          const [offsetX, offsetY] = getPlanetOffset(idx, planetsInHouse.length)
          const x = center[0] + offsetX
          const y = center[1] + offsetY
          const abbr = PLANET_ABBREVIATIONS[planetName] || planetName.slice(0, 2)
          const dignity = dignities[planetName]
          const color = DIGNITY_COLORS[dignity] || PLANET_COLORS[planetName] || '#fff'
          const isRetrograde = planet.retrograde
          const isPlanetSelected = selectedPlanet === planetName
          const isPlanetHovered = hoveredPlanet === planetName

          return (
            <g key={planetName}>
              {/* Selection/hover ring */}
              {(isPlanetSelected || isPlanetHovered) && (
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill="none"
                  stroke={isPlanetSelected ? '#f7b32b' : '#b794f6'}
                  strokeWidth={2.5}
                  opacity={0.9}
                  style={{
                    filter: `drop-shadow(0 0 8px ${isPlanetSelected ? 'rgba(247, 179, 43, 0.6)' : 'rgba(183, 148, 246, 0.6)'})`
                  }}
                />
              )}

              {/* Planet circle */}
              <motion.circle
                cx={x}
                cy={y}
                r={11}
                fill="rgba(10, 1, 24, 0.95)"
                stroke={color}
                strokeWidth={2}
                className="cursor-pointer transition-all duration-200"
                style={{
                  filter: `drop-shadow(0 0 6px ${color})`
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onPlanetClick?.(planetName)
                }}
                onMouseEnter={() => onPlanetHover?.(planetName)}
                onMouseLeave={() => onPlanetHover?.(null)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05, type: 'spring' }}
              />

              {/* Planet abbreviation */}
              <text
                x={x}
                y={y + 3.5}
                fill={color}
                fontSize={10}
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
                style={{
                  textShadow: `0 0 8px ${color}, 0 0 4px ${color}`
                }}
              >
                {abbr}
                {isRetrograde && (
                  <tspan fill="#ff6ec7" fontSize={7} style={{ textShadow: '0 0 6px rgba(255, 110, 199, 0.8)' }}>R</tspan>
                )}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="vedic-chart north-indian"
    >
      {/* Background */}
      <defs>
        <radialGradient id="vedic-bg-north">
          <stop offset="0%" stopColor="#0a0118" />
          <stop offset="50%" stopColor="#120525" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <filter id="vedic-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={0}
        y={0}
        width={size}
        height={size}
        fill="url(#vedic-bg-north)"
        rx={8}
      />

      {/* Outer border - diamond shape */}
      <path
        d={`M ${size / 2},0 L ${size},${size / 2} L ${size / 2},${size} L 0,${size / 2} Z`}
        fill="none"
        stroke="rgba(183, 148, 246, 0.4)"
        strokeWidth={2.5}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(183, 148, 246, 0.3))'
        }}
      />

      {/* Inner cross lines */}
      <line
        x1={0}
        y1={size / 2}
        x2={size}
        y2={size / 2}
        stroke="rgba(183, 148, 246, 0.25)"
        strokeWidth={1.5}
      />
      <line
        x1={size / 2}
        y1={0}
        x2={size / 2}
        y2={size}
        stroke="rgba(183, 148, 246, 0.25)"
        strokeWidth={1.5}
      />

      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2 - 10}
        fill="#8f6fc4"
        fontSize={13}
        textAnchor="middle"
        fontWeight="600"
        style={{
          textShadow: '0 0 8px rgba(143, 111, 196, 0.5)'
        }}
      >
        North Indian
      </text>
      <text
        x={size / 2}
        y={size / 2 + 10}
        fill="#f7b32b"
        fontSize={16}
        fontWeight="bold"
        textAnchor="middle"
        style={{
          textShadow: '0 0 12px rgba(247, 179, 43, 0.6), 0 0 6px rgba(247, 179, 43, 0.4)'
        }}
      >
        {VEDIC_SIGNS[ascendantSign].sanskrit}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 26}
        fill="#b794f6"
        fontSize={12}
        textAnchor="middle"
        fontWeight="600"
        style={{
          textShadow: '0 0 8px rgba(183, 148, 246, 0.5)'
        }}
      >
        Lagna
      </text>

      {/* Render all 12 houses */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((house) => renderHouse(house))}
    </svg>
  )
}
