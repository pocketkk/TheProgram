/**
 * Vedic Square Chart Container
 *
 * Wrapper component that renders either North or South Indian chart style
 * based on user preference. Supports responsive sizing.
 */
import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NorthIndianChart } from './NorthIndianChart'
import { SouthIndianChart } from './SouthIndianChart'
import type { VedicChartStyle, VedicPlanetPosition, DivisionalChartType } from '../types'

interface VedicSquareChartProps {
  // Chart data
  planets: Record<string, VedicPlanetPosition>
  ascendant: number
  dignities?: Record<string, string>

  // Display options
  chartStyle: VedicChartStyle
  size?: number | string // Can be number (pixels) or "100%" for responsive

  // Interaction state
  selectedHouse?: number | null
  selectedPlanet?: string | null
  hoveredHouse?: number | null
  hoveredPlanet?: string | null

  // Event handlers
  onHouseClick?: (house: number) => void
  onPlanetClick?: (planet: string) => void
  onHouseHover?: (house: number | null) => void
  onPlanetHover?: (planet: string | null) => void
}

export const VedicSquareChart: React.FC<VedicSquareChartProps> = ({
  planets,
  ascendant,
  dignities,
  chartStyle,
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [computedSize, setComputedSize] = useState(typeof size === 'number' ? size : 400)

  // Handle responsive sizing
  useEffect(() => {
    if (typeof size === 'number') {
      setComputedSize(size)
      return
    }

    const updateSize = () => {
      if (containerRef.current) {
        // Use viewport height as primary sizing constraint for consistency
        // This ensures D-1 and D-9 are always the same size
        const viewportHeight = window.innerHeight
        const availableHeight = viewportHeight - 130 // Account for header and top bar
        const rect = containerRef.current.getBoundingClientRect()
        const availableWidth = rect.width - 8

        // Use the smaller dimension but cap to ensure consistent sizing
        const chartSize = Math.min(availableWidth, availableHeight)
        setComputedSize(Math.max(400, chartSize))
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    // Also observe container size changes
    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateSize)
      observer.disconnect()
    }
  }, [size])

  const sharedProps = {
    planets,
    ascendant,
    dignities,
    size: computedSize,
    selectedHouse,
    selectedPlanet,
    hoveredHouse,
    hoveredPlanet,
    onHouseClick,
    onPlanetClick,
    onHouseHover,
    onPlanetHover,
  }

  return (
    <div
      ref={containerRef}
      className="vedic-chart-container relative w-full h-full"
      data-chart-container="vedic"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={chartStyle}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {chartStyle === 'north' ? (
            <NorthIndianChart {...sharedProps} />
          ) : (
            <SouthIndianChart {...sharedProps} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
