/**
 * Birth Chart Wheel - SVG-based circular astrological chart
 */

import { motion } from 'framer-motion'
import { useRef, useMemo, forwardRef, useState, useCallback } from 'react'
import type { BirthChart, AspectType } from '@/lib/astrology/types'
import { ZODIAC_SIGNS, PLANETS, ASPECT_CONFIG } from '@/lib/astrology/types'
import { HUMAN_DESIGN_GATES, getGateAtDegree } from '@/lib/astronomy/humanDesignGates'
import { useChartInteractions, useChartKeyboardNav } from '../hooks/useChartInteractions'
import { useChartStore } from '../stores/chartStore'
import { ChartTooltip } from './ChartTooltip'
import { DegreeMarkersLayer } from './layers/DegreeMarkersLayer'
import { PatternHighlight } from './patterns/PatternHighlight'
import { clusterPlanets, type ClusteredPlanet } from '../utils/planetClustering'
import {
  wheelVariants,
  zodiacSegmentVariants,
  houseCuspVariants,
  aspectLineVariants,
  planetEntranceVariants,
  retrogradeVariants,
  withReducedMotion,
} from '../animations'

interface BirthChartWheelProps {
  chart: BirthChart
  showAspects?: boolean
  showHouseNumbers?: boolean
  size?: number
}

export const BirthChartWheel = forwardRef<HTMLDivElement, BirthChartWheelProps>(
  ({ chart, showAspects = true, showHouseNumbers = true, size = 600 }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = (ref as React.RefObject<HTMLDivElement>) || containerRef
  const visibility = useChartStore(state => state.visibility)
  const selectedPattern = useChartStore(state => state.interaction.selectedPattern)
  const activeHouse = useChartStore(state => state.interaction.activeHouse)
  const {
    onPlanetHover,
    onPlanetClick,
    onHouseClick,
    isSelected,
    isHighlighted,
  } = useChartInteractions()

  // Enable keyboard navigation
  useChartKeyboardNav()

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 3))
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.5))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [zoom, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const center = size / 2
  const outerRadius = size / 2 - 20
  const innerRadius = outerRadius * 0.75
  const planetRadius = outerRadius * 0.65
  const houseRadius = outerRadius * 0.6

  // Define major and minor aspect types
  const majorAspects: AspectType[] = ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition']
  const minorAspects: AspectType[] = ['Quincunx', 'Semisextile', 'Semisquare', 'Sesquiquadrate']

  // Filter aspects based on visibility settings
  const filteredAspects = useMemo(() => {
    return chart.aspects.filter(aspect => {
      // Filter by orb
      if (aspect.orb > visibility.maxOrb) return false

      // Filter by aspect type (major/minor)
      const isMajor = majorAspects.includes(aspect.type)
      const isMinor = minorAspects.includes(aspect.type)

      if (isMajor && !visibility.aspectTypes.major) return false
      if (isMinor && !visibility.aspectTypes.minor) return false

      return true
    })
  }, [chart.aspects, visibility.maxOrb, visibility.aspectTypes.major, visibility.aspectTypes.minor])

  // Apply planet clustering to prevent overlaps
  const clusteredPlanets: ClusteredPlanet[] = useMemo(() => {
    return clusterPlanets(chart.planets)
  }, [chart.planets])

  /**
   * Convert longitude to SVG coordinates
   * Supports both natural (Aries at 9 o'clock) and natal (Ascendant at 9 o'clock) orientations
   */
  const polarToCartesian = (angle: number, radius: number) => {
    let rotatedAngle: number

    if (visibility.orientation === 'natural') {
      // Natural wheel: Aries (0°) at 9 o'clock (180° in SVG), counterclockwise
      rotatedAngle = angle + 180
    } else {
      // Natal wheel: Ascendant at 9 o'clock (180° in SVG), counterclockwise
      rotatedAngle = angle - chart.ascendant + 180
    }

    const adjustedAngle = (360 - rotatedAngle) * (Math.PI / 180)
    return {
      x: center + radius * Math.cos(adjustedAngle),
      y: center - radius * Math.sin(adjustedAngle),
    }
  }

  /**
   * Create arc path for zodiac signs
   */
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(startAngle, radius)
    const end = polarToCartesian(endAngle, radius)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  /**
   * Create a closed segment path (for zodiac signs and house overlays)
   */
  const createSegmentPath = (startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) => {
    // Normalize angles to handle wrap-around
    let normalizedEnd = endAngle
    if (normalizedEnd < startAngle) normalizedEnd += 360

    const angularDiff = normalizedEnd - startAngle
    const largeArc = angularDiff > 180 ? 1 : 0

    const outerStart = polarToCartesian(startAngle, outerRadius)
    const outerEnd = polarToCartesian(normalizedEnd, outerRadius)
    const innerEnd = polarToCartesian(normalizedEnd, innerRadius)
    const innerStart = polarToCartesian(startAngle, innerRadius)

    return `
      M ${outerStart.x} ${outerStart.y}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}
      L ${innerEnd.x} ${innerEnd.y}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}
      Z
    `
  }

  /**
   * Get color for zodiac element
   */
  const getElementColor = (element: string) => {
    const colors = {
      Fire: '#FF6B6B',
      Earth: '#8B7355',
      Air: '#4ECDC4',
      Water: '#4169E1',
    }
    return colors[element as keyof typeof colors] || '#888'
  }

  return (
    <div ref={chartRef} className="relative" style={{ width: size, height: size }}>
      <ChartTooltip containerRef={chartRef} />

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 bg-cosmic-800/90 hover:bg-cosmic-700 border border-cosmic-600 rounded text-cosmic-200 flex items-center justify-center transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 bg-cosmic-800/90 hover:bg-cosmic-700 border border-cosmic-600 rounded text-cosmic-200 flex items-center justify-center transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleResetZoom}
          className="w-8 h-8 bg-cosmic-800/90 hover:bg-cosmic-700 border border-cosmic-600 rounded text-cosmic-200 flex items-center justify-center transition-colors text-xs"
          title="Reset Zoom"
        >
          ⟲
        </button>
      </div>

      <div
        className="overflow-hidden select-none"
        style={{
          width: size,
          height: size,
          cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          pointerEvents: 'auto'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            width: size,
            height: size,
            pointerEvents: 'none'
          }}
        >
          <motion.svg
            ref={svgRef}
            width={size}
            height={size}
            className="drop-shadow-2xl"
            variants={withReducedMotion(wheelVariants)}
            initial="initial"
            animate="animate"
          >
        <defs>
          {/* Radial gradient for background */}
          <radialGradient id="chartBg">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0f0f1e" />
          </radialGradient>

          {/* Glow filters for planets */}
          <filter id="planetGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Circular paths for curved zodiac labels */}
          {ZODIAC_SIGNS.map((sign, index) => {
            const startAngle = index * 30
            const endAngle = (index + 1) * 30
            const labelRadius = outerRadius * 0.79

            // Create arc path for this zodiac sign segment (clockwise to curve outward)
            const startPos = polarToCartesian(startAngle, labelRadius)
            const endPos = polarToCartesian(endAngle, labelRadius)

            return (
              <path
                key={`label-path-${sign.name}`}
                id={`label-path-${sign.name}`}
                d={`M ${startPos.x} ${startPos.y} A ${labelRadius} ${labelRadius} 0 0 1 ${endPos.x} ${endPos.y}`}
                fill="none"
              />
            )
          })}

          {/* Circular paths for curved HD gate name labels */}
          {HUMAN_DESIGN_GATES.map((gate, index) => {
            const centerDegree = (gate.startDegree + gate.endDegree) / 2
            const nextGate = HUMAN_DESIGN_GATES[(index + 1) % HUMAN_DESIGN_GATES.length]
            const nextCenterDegree = (nextGate.startDegree + nextGate.endDegree) / 2

            // Calculate the arc between this gate and the next
            let startAngle = centerDegree
            let endAngle = nextCenterDegree
            if (endAngle < startAngle) endAngle += 360

            const nameRadius = outerRadius * 0.92
            const startPos = polarToCartesian(startAngle, nameRadius)
            const endPos = polarToCartesian(endAngle, nameRadius)

            return (
              <path
                key={`gate-name-path-${index}`}
                id={`gate-name-path-${index}`}
                d={`M ${startPos.x} ${startPos.y} A ${nameRadius} ${nameRadius} 0 0 1 ${endPos.x} ${endPos.y}`}
                fill="none"
              />
            )
          })}
        </defs>

        {/* Background circle */}
        <circle cx={center} cy={center} r={outerRadius} fill="url(#chartBg)" />

        {/* Zodiac sign rings */}
        {ZODIAC_SIGNS.map(sign => {
          const index = ZODIAC_SIGNS.indexOf(sign)
          const startAngle = index * 30
          const endAngle = (index + 1) * 30
          const midAngle = startAngle + 15
          const color = getElementColor(sign.element)

          const labelPos = polarToCartesian(midAngle, outerRadius - 30)

          return (
            <motion.g
              key={sign.name}
              custom={index}
              variants={withReducedMotion(zodiacSegmentVariants)}
              initial="initial"
              animate="animate"
            >
              {/* Sign segment background */}
              <path
                d={createSegmentPath(startAngle, endAngle, outerRadius, innerRadius)}
                fill={color}
                fillOpacity={0.1}
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.3}
              />

              {/* Sign symbol and name (curved label) */}
              <text
                fill={color}
                fontSize={12}
                fontWeight="400"
                letterSpacing="0.5"
                className="pointer-events-none"
              >
                <textPath
                  href={`#label-path-${sign.name}`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {sign.symbol} {sign.name.toUpperCase()}
                </textPath>
              </text>
            </motion.g>
          )
        })}

        {/* Degree ruler ring - measuring tape style */}
        {(() => {
          const degreeRingRadius = outerRadius + 1
          const tickMarks = []
          const degreeLabels = []

          // Add tick marks every degree (pointing inward)
          for (let degree = 0; degree < 360; degree += 1) {
            const angle = degree

            // Find which zodiac sign this degree is in
            const zodiacIndex = Math.floor(degree / 30)
            const color = getElementColor(ZODIAC_SIGNS[zodiacIndex].element)

            // Visual hierarchy: zodiac boundaries (30°) > major (10°) > medium (5°) > minor (1°)
            let tickLength = 4  // Minor tick
            let tickOpacity = 0.3
            let strokeWidth = 1

            if (degree % 30 === 0) {
              tickLength = 15 // Zodiac boundary - longest
              tickOpacity = 0.8
              strokeWidth = 2
            } else if (degree % 10 === 0) {
              tickLength = 10 // Major tick
              tickOpacity = 0.6
              strokeWidth = 1.5
            } else if (degree % 5 === 0) {
              tickLength = 7 // Medium tick
              tickOpacity = 0.45
              strokeWidth = 1
            }

            // Ticks point inward
            const outerPoint = polarToCartesian(angle, degreeRingRadius)
            const innerPoint = polarToCartesian(angle, degreeRingRadius - tickLength)

            tickMarks.push(
              <line
                key={`tick-${degree}`}
                x1={outerPoint.x}
                y1={outerPoint.y}
                x2={innerPoint.x}
                y2={innerPoint.y}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeOpacity={tickOpacity}
              />
            )
          }

          // Add degree labels every 10 degrees (outside the ring)
          for (let degree = 0; degree < 360; degree += 10) {
            const angle = degree
            const zodiacIndex = Math.floor(degree / 30)
            const color = getElementColor(ZODIAC_SIGNS[zodiacIndex].element)

            // Major zodiac boundaries are larger
            const isMajor = degree % 30 === 0
            const fontSize = isMajor ? 12 : 9
            const fontWeight = isMajor ? 'bold' : '600'

            const labelPos = polarToCartesian(angle, degreeRingRadius + 15)

            degreeLabels.push(
              <text
                key={`degree-label-${degree}`}
                x={labelPos.x}
                y={labelPos.y}
                fontSize={fontSize}
                fill={color}
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight={fontWeight}
              >
                {degree}°
              </text>
            )
          }

          return (
            <g>
              {/* Border ring */}
              <circle
                cx={center}
                cy={center}
                r={degreeRingRadius}
                fill="none"
                stroke="#888"
                strokeWidth={1.5}
                strokeOpacity={0.4}
              />
              {tickMarks}
              {degreeLabels}
            </g>
          )
        })()}

        {/* Human Design gates ruler ring */}
        {(() => {
          const gatesRingRadius = outerRadius * 0.97
          const tickMarks = []
          const gateLabels = []

          HUMAN_DESIGN_GATES.forEach((gate, index) => {
            // Calculate center position of gate
            const centerDegree = (gate.startDegree + gate.endDegree) / 2
            const angle = centerDegree

            // Find which zodiac sign this gate is in
            const zodiacIndex = Math.floor(centerDegree / 30)
            const color = getElementColor(ZODIAC_SIGNS[zodiacIndex].element)

            // Major tick mark for gate center (extending inward)
            const tickLength = 12
            const outerPoint = polarToCartesian(angle, gatesRingRadius)
            const innerPoint = polarToCartesian(angle, gatesRingRadius - tickLength)

            tickMarks.push(
              <line
                key={`gate-tick-${index}`}
                x1={outerPoint.x}
                y1={outerPoint.y}
                x2={innerPoint.x}
                y2={innerPoint.y}
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.7}
              />
            )

            // Add 5 minor tick marks for the 6 lines within each gate
            for (let line = 1; line < 6; line++) {
              const lineDegree = gate.startDegree + (line * 0.9375)
              const lineAngle = lineDegree
              const lineTickLength = 6
              const lineOuterPoint = polarToCartesian(lineAngle, gatesRingRadius)
              const lineInnerPoint = polarToCartesian(lineAngle, gatesRingRadius - lineTickLength)

              tickMarks.push(
                <line
                  key={`gate-line-tick-${index}-${line}`}
                  x1={lineOuterPoint.x}
                  y1={lineOuterPoint.y}
                  x2={lineInnerPoint.x}
                  y2={lineInnerPoint.y}
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
              )
            }

            // Gate number label
            const labelPos = polarToCartesian(angle, gatesRingRadius - 20)
            gateLabels.push(
              <text
                key={`gate-label-${index}`}
                x={labelPos.x}
                y={labelPos.y}
                fontSize={8}
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
                stroke={color}
                strokeWidth={0.3}
              >
                {gate.number}
              </text>
            )

            // Gate names removed - too small to be useful
          })

          // Planet indicators on HD ring
          const planetIndicators: JSX.Element[] = []

          // Check which planets have major aspects
          const planetsWithAspects = new Set<string>()
          chart.aspects.forEach((aspect) => {
            if (['Conjunction', 'Trine', 'Square', 'Opposition', 'Sextile'].includes(aspect.type)) {
              planetsWithAspects.add(aspect.planet1)
              planetsWithAspects.add(aspect.planet2)
            }
          })

          chart.planets.forEach((planet) => {
            const planetConfig = PLANETS.find(p => p.name === planet.name)
            const angle = planet.longitude
            const indicatorLength = 15
            const hasAspect = planetsWithAspects.has(planet.name)

            // Tick pointing inward from the ring
            const outerPoint = polarToCartesian(angle, gatesRingRadius + 2)
            const innerPoint = polarToCartesian(angle, gatesRingRadius - indicatorLength)

            planetIndicators.push(
              <line
                key={`planet-indicator-${planet.name}`}
                x1={outerPoint.x}
                y1={outerPoint.y}
                x2={innerPoint.x}
                y2={innerPoint.y}
                stroke={planetConfig?.color || '#fff'}
                strokeWidth={hasAspect ? 3.5 : 2.5}
                strokeOpacity={hasAspect ? 1 : 0.9}
              />
            )

            // Small circle at the outer point
            planetIndicators.push(
              <circle
                key={`planet-indicator-dot-${planet.name}`}
                cx={outerPoint.x}
                cy={outerPoint.y}
                r={hasAspect ? 4 : 3}
                fill={planetConfig?.color || '#fff'}
                stroke={hasAspect ? planetConfig?.color : '#000'}
                strokeWidth={hasAspect ? 1.5 : 0.5}
              />
            )

            // Add outer ring for planets with aspects
            if (hasAspect) {
              planetIndicators.push(
                <circle
                  key={`planet-aspect-ring-${planet.name}`}
                  cx={outerPoint.x}
                  cy={outerPoint.y}
                  r={7}
                  fill="none"
                  stroke={planetConfig?.color || '#fff'}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />
              )
            }
          })

          return (
            <g>
              {/* Border ring */}
              <circle
                cx={center}
                cy={center}
                r={gatesRingRadius}
                fill="none"
                stroke="#666"
                strokeWidth={1}
                strokeOpacity={0.3}
              />
              {tickMarks}
              {gateLabels}
              {planetIndicators}
            </g>
          )
        })()}

        {/* Degree markers - removed to avoid interference with planet labels */}

        {/* House cusps */}
        {chart.houses.map((house, index) => {
          const angle = house.cusp
          const start = polarToCartesian(angle, innerRadius)
          const end = polarToCartesian(angle, 0) // Extend to center
          const labelPos = polarToCartesian(angle + 15, outerRadius * 0.2)
          const selected = isSelected('house', String(house.number))

          // Calculate house segment for overlay
          const nextHouse = chart.houses[(index + 1) % chart.houses.length]
          let nextAngle = nextHouse.cusp
          if (nextAngle < angle) nextAngle += 360

          return (
            <motion.g
              key={house.number}
              className="cursor-pointer"
              onClick={() => onHouseClick(house)}
              custom={index * 0.03}
              variants={withReducedMotion(houseCuspVariants)}
              initial="initial"
              animate="animate"
            >
              {/* House cusp line */}
              <motion.line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={selected ? '#60a5fa' : '#4a5568'}
                strokeWidth={selected ? 3 : 2}
                strokeDasharray="4 4"
                className="transition-all"
              />

              {/* House number */}
              {showHouseNumbers && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fontSize={14}
                  fill={selected ? '#60a5fa' : '#a0aec0'}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="600"
                  className="transition-colors pointer-events-none"
                >
                  {house.number}
                </text>
              )}
            </motion.g>
          )
        })}

        {/* Aspect lines */}
        {showAspects &&
          filteredAspects.map((aspect, index) => {
            const planet1 = chart.planets.find(p => p.name === aspect.planet1)
            const planet2 = chart.planets.find(p => p.name === aspect.planet2)

            if (!planet1 || !planet2) return null

            const pos1 = polarToCartesian(planet1.longitude, planetRadius - 40)
            const pos2 = polarToCartesian(planet2.longitude, planetRadius - 40)

            const config = ASPECT_CONFIG[aspect.type]

            // Check if this aspect is highlighted (related to selected planet)
            const highlighted = isHighlighted(aspect.planet1) || isHighlighted(aspect.planet2)

            return (
              <motion.line
                key={`aspect-${index}`}
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke={config.color}
                strokeWidth={highlighted ? 3 : aspect.orb < 2 ? 2 : 1}
                strokeOpacity={highlighted ? 0.8 : 0.3}
                strokeDasharray={aspect.isApplying ? 'none' : '4 4'}
                custom={index * 0.02}
                variants={withReducedMotion(aspectLineVariants)}
                initial="initial"
                animate="animate"
                className="transition-all duration-200"
              />
            )
          })}

        {/* Pattern Highlight */}
        {selectedPattern && (
          <PatternHighlight
            pattern={selectedPattern}
            planets={clusteredPlanets}
            polarToCartesian={polarToCartesian}
            planetRadius={planetRadius}
          />
        )}

        {/* Planets (with clustering) */}
        {clusteredPlanets.map((planet, index) => {
          // Use actual longitude instead of displayAngle to fix positioning
          const displayPos = polarToCartesian(planet.longitude, planetRadius)
          const actualPos = polarToCartesian(planet.longitude, planetRadius - 40)
          const planetConfig = PLANETS.find(p => p.name === planet.name)
          const selected = isSelected('planet', planet.name)
          const highlighted = isHighlighted(planet.name)

          // Check if planet should be dimmed (not in active house)
          const inActiveHouse = activeHouse === null || planet.house === activeHouse
          const opacity = activeHouse !== null && !inActiveHouse ? 0.3 : 1

          return (
            <motion.g
              key={planet.name}
              custom={index}
              variants={withReducedMotion(planetEntranceVariants)}
              initial="initial"
              animate="animate"
              onMouseEnter={() => onPlanetHover(planet)}
              onMouseLeave={() => onPlanetHover(null)}
              style={{ opacity }}
            >
              {/* Connection line to actual position (if clustered) */}
              {planet.isClustered && (
                <line
                  x1={displayPos.x}
                  y1={displayPos.y}
                  x2={actualPos.x}
                  y2={actualPos.y}
                  stroke="#8b5cf6"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                  strokeDasharray="2 2"
                  className="pointer-events-none"
                />
              )}

              {/* Selection ring (yellow circle like pattern highlights) */}
              {selected && (
                <circle
                  cx={displayPos.x}
                  cy={displayPos.y}
                  r={18}
                  fill="none"
                  stroke="#eab308"
                  strokeWidth={2.5}
                  strokeOpacity={0.8}
                />
              )}

              {/* Highlight ring */}
              {!selected && highlighted && (
                <circle
                  cx={displayPos.x}
                  cy={displayPos.y}
                  r={16}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
              )}

              {/* Planet circle */}
              <circle
                cx={displayPos.x}
                cy={displayPos.y}
                r={10}
                fill={planetConfig?.color || '#fff'}
                filter="url(#planetGlow)"
                className="hover:brightness-125 transition-all"
              />

              {/* Planet symbol */}
              <text
                x={displayPos.x}
                y={displayPos.y}
                fontSize={14}
                fill="#000"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {planet.symbol}
              </text>

              {/* HD Gate info (to the left of planet) */}
              {(() => {
                const gate = getGateAtDegree(planet.longitude)
                if (gate) {
                  const degreeInGate = planet.longitude - gate.startDegree
                  const lineNumber = Math.floor(degreeInGate / 0.9375) + 1
                  return (
                    <text
                      x={displayPos.x - 20}
                      y={displayPos.y}
                      fontSize={9}
                      fill={planetConfig?.color || '#fff'}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontWeight="600"
                      className="pointer-events-none"
                      fillOpacity={0.9}
                    >
                      {gate.number}.{lineNumber}
                    </text>
                  )
                }
                return null
              })()}

              {/* Retrograde indicator */}
              {planet.isRetrograde && (
                <motion.text
                  x={displayPos.x + 15}
                  y={displayPos.y - 10}
                  fontSize={10}
                  fill="#ff6b6b"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none"
                  variants={withReducedMotion(retrogradeVariants)}
                  initial="initial"
                  animate="animate"
                >
                  ℞
                </motion.text>
              )}

              {/* Planet name label (positioned towards center) */}
              {(() => {
                // Adjust offset based on planet position to maintain consistent visual spacing
                // Top/bottom planets (near 90°/270°) need less offset than side planets
                const angle = planet.longitude
                const normalizedAngle = angle % 360

                // Calculate how "vertical" the position is (0 = horizontal, 1 = vertical)
                const verticalness = Math.abs(Math.sin((normalizedAngle * Math.PI) / 180))

                // Reduce offset for vertical positions (30 for vertical, 50 for horizontal)
                const dynamicOffset = 50 - (verticalness * 20)

                const labelPos = polarToCartesian(angle, planetRadius - dynamicOffset)

                // Add degree and sign
                const positionLabel = ` | ${planet.degree}° ${planet.sign}`

                return (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    fontSize={10}
                    fill={planetConfig?.color || '#fff'}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {planet.name}{positionLabel}
                  </text>
                )
              })()}
            </motion.g>
          )
        })}

        {/* Ascendant marker */}
        <g>
          {(() => {
            const ascPos = polarToCartesian(chart.ascendant, outerRadius + 10)
            return (
              <>
                <circle cx={ascPos.x} cy={ascPos.y} r={8} fill="#FFD700" />
                <text
                  x={ascPos.x}
                  y={ascPos.y}
                  fontSize={12}
                  fill="#000"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="bold"
                >
                  AC
                </text>
              </>
            )
          })()}
        </g>

        {/* Midheaven marker */}
        <g>
          {(() => {
            const mcPos = polarToCartesian(chart.midheaven, outerRadius + 10)
            return (
              <>
                <circle cx={mcPos.x} cy={mcPos.y} r={8} fill="#87CEEB" />
                <text
                  x={mcPos.x}
                  y={mcPos.y}
                  fontSize={12}
                  fill="#000"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="bold"
                >
                  MC
                </text>
              </>
            )
          })()}
        </g>

        {/* Center point */}
        <circle cx={center} cy={center} r={3} fill="#a0aec0" />
          </motion.svg>
        </div>
      </div>
    </div>
  )
})

BirthChartWheel.displayName = "BirthChartWheel"
