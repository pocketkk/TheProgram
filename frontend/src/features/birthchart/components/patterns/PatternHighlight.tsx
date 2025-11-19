/**
 * PatternHighlight - Visual overlay for highlighting aspect patterns on the wheel
 */

import { motion } from 'framer-motion'
import type { AspectPattern } from '@/lib/astrology/patterns'
import type { ClusteredPlanet } from '../../utils/planetClustering'

interface PatternHighlightProps {
  pattern: AspectPattern
  planets: ClusteredPlanet[]
  polarToCartesian: (angle: number, radius: number) => { x: number; y: number }
  planetRadius: number
}

/**
 * Get color for pattern type
 */
function getPatternColor(type: AspectPattern['type']): string {
  const colors: Record<string, string> = {
    GrandTrine: '#10b981', // Green
    TSquare: '#ef4444', // Red
    Yod: '#a855f7', // Purple
    GrandCross: '#f97316', // Orange
    Kite: '#3b82f6', // Blue
    Stellium: '#eab308', // Yellow
    MysticRectangle: '#8b5cf6', // Violet
    GrandSextile: '#06b6d4', // Cyan
    Cradle: '#ec4899', // Pink
  }
  return colors[type] || '#64748b'
}

export function PatternHighlight({
  pattern,
  planets,
  polarToCartesian,
  planetRadius,
}: PatternHighlightProps) {
  const color = getPatternColor(pattern.type)

  // Get positions of planets in the pattern
  const patternPlanets = pattern.planets
    .map(name => planets.find(p => p.name === name))
    .filter((p): p is ClusteredPlanet => p !== undefined)

  if (patternPlanets.length === 0) return null

  return (
    <g className="pattern-highlight">
      {/* Draw connecting lines between pattern planets */}
      {patternPlanets.map((planet1, i) =>
        patternPlanets.slice(i + 1).map((planet2, j) => {
          const pos1 = polarToCartesian(planet1.longitude, planetRadius - 40)
          const pos2 = polarToCartesian(planet2.longitude, planetRadius - 40)

          return (
            <motion.line
              key={`pattern-line-${i}-${j}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={color}
              strokeWidth={2.5}
              strokeOpacity={0.7}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{
                pathLength: { duration: 0.8, delay: i * 0.1 },
                opacity: { duration: 0.3 },
              }}
            />
          )
        })
      )}

      {/* Draw filled polygon shape for the pattern (optional, for Grand Trine, etc.) */}
      {pattern.type === 'GrandTrine' && patternPlanets.length === 3 && (
        <motion.polygon
          points={patternPlanets
            .map(planet => {
              const pos = polarToCartesian(planet.longitude, planetRadius - 40)
              return `${pos.x},${pos.y}`
            })
            .join(' ')}
          fill={color}
          fillOpacity={0.1}
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.5}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Highlight rings around involved planets */}
      {patternPlanets.map((planet, i) => {
        const pos = polarToCartesian(planet.longitude, planetRadius)

        return (
          <g key={`highlight-${i}`}>
            {/* Outer pulsing ring */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={22}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeOpacity={0.6}
              initial={{ r: 18, opacity: 0 }}
              animate={{
                r: [18, 24, 18],
                opacity: [0.6, 0.3, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />

            {/* Inner solid ring */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={18}
              fill="none"
              stroke={color}
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            />
          </g>
        )
      })}

      {/* Label for pattern type */}
      {patternPlanets.length > 0 && (
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {(() => {
            // Calculate center of pattern based on longitudes
            const centerAngle =
              patternPlanets.reduce((sum, p) => sum + p.longitude, 0) /
              patternPlanets.length
            const labelPos = polarToCartesian(centerAngle, planetRadius - 80)

            return (
              <>
                {/* Background for label */}
                <rect
                  x={labelPos.x - 45}
                  y={labelPos.y - 12}
                  width={90}
                  height={24}
                  rx={4}
                  fill="#1a1a2e"
                  fillOpacity={0.9}
                  stroke={color}
                  strokeWidth={1.5}
                />
                {/* Pattern name text */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fontSize={11}
                  fontWeight="bold"
                  fill={color}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {pattern.description}
                </text>
              </>
            )
          })()}
        </motion.g>
      )}
    </g>
  )
}
