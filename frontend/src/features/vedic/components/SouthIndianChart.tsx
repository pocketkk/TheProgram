/**
 * South Indian Chart Component
 *
 * Displays a Vedic chart in the South Indian format:
 * - Fixed 4x4 grid with 12 outer cells for signs
 * - Signs are fixed in position (Aries at top-left inner)
 * - Houses rotate based on Ascendant position
 */
import React from 'react'
import { motion } from 'framer-motion'
import {
  getSouthIndianCells,
  getSouthIndianCellCenters,
  getPlanetPositionsInCell,
} from '../utils/chartLayout'
import {
  VEDIC_SIGNS,
  PLANET_ABBREVIATIONS,
  PLANET_COLORS,
  DIGNITY_COLORS,
  CLASSICAL_PLANETS,
  getSignFromLongitude,
  getHouseForSign,
  formatDegree,
} from '../utils/vedicConstants'
import type { VedicPlanetPosition } from '../types'

interface SouthIndianChartProps {
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

export const SouthIndianChart: React.FC<SouthIndianChartProps> = ({
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
  const cells = getSouthIndianCells(size)
  const cellCenters = getSouthIndianCellCenters(size)
  const cellWidth = size / 4
  const ascendantSign = getSignFromLongitude(ascendant)

  // Group planets by sign
  const planetsBySign: Record<number, string[]> = {}
  for (const [name, planet] of Object.entries(planets)) {
    if (!CLASSICAL_PLANETS.includes(name)) continue
    const sign = planet.sign
    if (!planetsBySign[sign]) planetsBySign[sign] = []
    planetsBySign[sign].push(name)
  }

  // Render a single cell
  const renderCell = (signIndex: number) => {
    const cell = cells[signIndex]
    const sign = VEDIC_SIGNS[signIndex]
    const houseNumber = getHouseForSign(signIndex, ascendantSign)
    const isAscendant = houseNumber === 1
    const planetsInSign = planetsBySign[signIndex] || []
    const isSelected = selectedHouse === houseNumber
    const isHovered = hoveredHouse === houseNumber

    // Get planet positions within the cell
    const planetPositions = getPlanetPositionsInCell(
      cellCenters[signIndex],
      planetsInSign.length,
      cellWidth
    )

    return (
      <g key={signIndex}>
        {/* Cell background */}
        <motion.rect
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
          fill={isAscendant ? 'rgba(247, 179, 43, 0.2)' : 'rgba(26, 11, 46, 0.85)'}
          stroke={isSelected ? '#f7b32b' : isHovered ? '#b794f6' : 'rgba(183, 148, 246, 0.3)'}
          strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
          className="cursor-pointer transition-all duration-200"
          onClick={() => onHouseClick?.(houseNumber)}
          onMouseEnter={() => onHouseHover?.(houseNumber)}
          onMouseLeave={() => onHouseHover?.(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: signIndex * 0.03 }}
        />

        {/* House number (top-left) */}
        <text
          x={cell.x + 6}
          y={cell.y + 16}
          fill={isAscendant ? '#f7b32b' : '#b794f6'}
          fontSize={13}
          fontWeight="bold"
          style={{
            textShadow: isAscendant
              ? '0 0 10px rgba(247, 179, 43, 0.6), 0 0 5px rgba(247, 179, 43, 0.4)'
              : '0 0 8px rgba(183, 148, 246, 0.5)'
          }}
        >
          {houseNumber}
        </text>

        {/* Sign symbol (top-right) */}
        <text
          x={cell.x + cell.width - 6}
          y={cell.y + 16}
          fill={isAscendant ? '#f7b32b' : '#d4baff'}
          fontSize={12}
          textAnchor="end"
          fontWeight="600"
          style={{
            textShadow: isAscendant
              ? '0 0 8px rgba(247, 179, 43, 0.5)'
              : '0 0 8px rgba(212, 186, 255, 0.4)'
          }}
        >
          {sign.symbol}
        </text>

        {/* Ascendant marker */}
        {isAscendant && (
          <text
            x={cell.x + cell.width / 2}
            y={cell.y + 16}
            fill="#f7b32b"
            fontSize={11}
            textAnchor="middle"
            fontWeight="bold"
            style={{
              textShadow: '0 0 10px rgba(247, 179, 43, 0.6), 0 0 5px rgba(247, 179, 43, 0.4)'
            }}
          >
            Asc
          </text>
        )}

        {/* Planets */}
        {planetsInSign.map((planetName, idx) => {
          const planet = planets[planetName]
          const position = planetPositions[idx]
          const abbr = PLANET_ABBREVIATIONS[planetName] || planetName.slice(0, 2)
          const dignity = dignities[planetName]
          const color = dignity ? DIGNITY_COLORS[dignity] : PLANET_COLORS[planetName] || '#fff'
          const isRetrograde = planet.retrograde
          const isPlanetSelected = selectedPlanet === planetName
          const isPlanetHovered = hoveredPlanet === planetName

          return (
            <g key={planetName}>
              {/* Selection/hover ring */}
              {(isPlanetSelected || isPlanetHovered) && (
                <circle
                  cx={position[0]}
                  cy={position[1]}
                  r={15}
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
                cx={position[0]}
                cy={position[1]}
                r={12}
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
                x={position[0]}
                y={position[1] + 4}
                fill={color}
                fontSize={11}
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
      className="vedic-chart south-indian"
    >
      {/* Background */}
      <defs>
        <radialGradient id="vedic-bg-south">
          <stop offset="0%" stopColor="#0a0118" />
          <stop offset="50%" stopColor="#120525" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <filter id="vedic-glow-south">
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
        fill="url(#vedic-bg-south)"
        rx={8}
      />

      {/* Outer border */}
      <rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        fill="none"
        stroke="rgba(183, 148, 246, 0.4)"
        strokeWidth={2.5}
        rx={8}
        style={{
          filter: 'drop-shadow(0 0 4px rgba(183, 148, 246, 0.3))'
        }}
      />

      {/* Center empty area - draw border */}
      <rect
        x={cellWidth}
        y={cellWidth}
        width={cellWidth * 2}
        height={cellWidth * 2}
        fill="url(#vedic-bg-south)"
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
        South Indian
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

      {/* Render all 12 cells */}
      {Object.keys(cells).map((signIndex) => renderCell(parseInt(signIndex)))}
    </svg>
  )
}
