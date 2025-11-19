/**
 * Element Balance Chart
 * Displays planet distribution across Fire, Earth, Air, Water elements in a donut chart
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { BirthChart } from '@/lib/astrology/types'
import { pieChartVariants, listItemVariants, withReducedMotion } from '../animations'

interface ElementBalanceChartProps {
  chart: BirthChart
  size?: number
}

const ELEMENT_COLORS = {
  Fire: '#FF6B6B',
  Earth: '#8B7355',
  Air: '#4ECDC4',
  Water: '#4169E1',
}

export function ElementBalanceChart({ chart, size = 200 }: ElementBalanceChartProps) {
  const elementData = useMemo(() => {
    // Count planets by element
    const counts: Record<string, number> = {
      Fire: 0,
      Earth: 0,
      Air: 0,
      Water: 0,
    }

    chart.planets.forEach(planet => {
      counts[planet.element] = (counts[planet.element] || 0) + 1
    })

    const total = chart.planets.length

    // Create data array
    return Object.entries(counts).map(([element, count]) => ({
      element,
      count,
      percentage: (count / total) * 100,
      color: ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS],
    }))
  }, [chart.planets])

  const center = size / 2
  const outerRadius = size / 2 - 10
  const innerRadius = outerRadius * 0.6

  // Calculate SVG arc paths
  const createArcPath = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
    const startOuter = polarToCartesian(center, center, outerR, endAngle)
    const endOuter = polarToCartesian(center, center, outerR, startAngle)
    const startInner = polarToCartesian(center, center, innerR, endAngle)
    const endInner = polarToCartesian(center, center, innerR, startAngle)

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

    return [
      'M', startOuter.x, startOuter.y,
      'A', outerR, outerR, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', innerR, innerR, 0, largeArcFlag, 1, startInner.x, startInner.y,
      'Z'
    ].join(' ')
  }

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  // Calculate angles for each segment
  let currentAngle = 0
  const segments = elementData.map(data => {
    const startAngle = currentAngle
    const angle = (data.percentage / 100) * 360
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    return {
      ...data,
      startAngle,
      endAngle,
      midAngle: startAngle + angle / 2,
    }
  })

  return (
    <div className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-3 border border-cosmic-700/50">
      <h3 className="text-xs font-semibold text-cosmic-300 mb-2">Element Balance</h3>

      <div className="flex items-center justify-center">
        <svg width={size} height={size} className="drop-shadow-lg">
          <defs>
            {elementData.map(data => (
              <filter key={`glow-${data.element}`} id={`glow-${data.element}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Donut segments */}
          {segments.map((segment, index) => {
            if (segment.count === 0) return null

            const labelPos = polarToCartesian(
              center,
              center,
              outerRadius - 20,
              segment.midAngle
            )

            return (
              <g key={segment.element}>
                <motion.path
                  d={createArcPath(segment.startAngle, segment.endAngle, outerRadius, innerRadius)}
                  fill={segment.color}
                  stroke={segment.color}
                  strokeWidth={1}
                  filter={`url(#glow-${segment.element})`}
                  custom={index * 0.15}
                  variants={withReducedMotion(pieChartVariants)}
                  initial="initial"
                  animate="animate"
                  whileHover={{ opacity: 1, scale: 1.02 }}
                  className="cursor-pointer transition-all"
                />

                {/* Count label in segment */}
                <motion.text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={16}
                  fontWeight="bold"
                  className="pointer-events-none drop-shadow-lg"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.15 + 0.5, duration: 0.3 }}
                >
                  {segment.count}
                </motion.text>
              </g>
            )
          })}

          {/* Center circle */}
          <circle cx={center} cy={center} r={innerRadius} fill="url(#chartBg)" />
          <circle cx={center} cy={center} r={innerRadius} fill="rgba(26, 26, 46, 0.9)" />
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 grid grid-cols-2 gap-1">
        {elementData.map((data, i) => (
          <motion.div
            key={data.element}
            className="flex items-center gap-1.5"
            custom={i}
            variants={withReducedMotion(listItemVariants)}
            initial="initial"
            animate="animate"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="text-xs text-cosmic-300">
              {data.element}: {data.count}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
