/**
 * PatternCard - Display individual aspect pattern with details
 */

import { motion } from 'framer-motion'
import type { AspectPattern } from '@/lib/astrology/patterns'
import { Button } from '@/components/ui'
import { PLANETS } from '@/lib/astrology/types'
import { useChartStore } from '../../stores/chartStore'

interface PatternCardProps {
  pattern: AspectPattern
  index: number
}

/**
 * Get icon/symbol for pattern type
 */
function getPatternIcon(type: AspectPattern['type']): string {
  const icons: Record<string, string> = {
    GrandTrine: '🔺',
    TSquare: '⊤',
    Yod: '☝',
    GrandCross: '✚',
    Kite: '🪁',
    Stellium: '⭐',
    MysticRectangle: '▭',
    GrandSextile: '✡',
    Cradle: '⚖',
  }
  return icons[type] || '⬡'
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

/**
 * Get planet symbol from name
 */
function getPlanetSymbol(planetName: string): string {
  const planet = PLANETS.find(p => p.name === planetName)
  return planet?.symbol || planetName
}

export function PatternCard({ pattern, index }: PatternCardProps) {
  const { setSelectedPattern } = useChartStore()
  const selectedPattern = useChartStore(state => state.interaction.selectedPattern)

  const isSelected = selectedPattern?.type === pattern.type &&
                     selectedPattern?.planets.every((p, i) => p === pattern.planets[i])

  const color = getPatternColor(pattern.type)
  const icon = getPatternIcon(pattern.type)

  const handleShowOnChart = () => {
    if (isSelected) {
      setSelectedPattern(null)
    } else {
      setSelectedPattern(pattern)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-lg border backdrop-blur-sm transition-all ${
        isSelected
          ? 'bg-cosmic-800/80 border-2'
          : 'bg-cosmic-900/50 border-cosmic-700/50 hover:bg-cosmic-800/60'
      }`}
      style={isSelected ? { borderColor: color } : {}}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-white">{pattern.description}</h3>
              {pattern.element && (
                <p className="text-xs text-cosmic-300">
                  Element: {pattern.element}
                </p>
              )}
            </div>
          </div>

          {/* Strength indicator */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-cosmic-400">Strength</div>
            <div className="flex items-center gap-1">
              <div className="w-16 h-2 bg-cosmic-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pattern.strength}%` }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-bold text-cosmic-200 min-w-[2rem]">
                {pattern.strength}%
              </span>
            </div>
          </div>
        </div>

        {/* Planets involved */}
        <div className="mb-3">
          <div className="text-xs text-cosmic-400 mb-2">Planets involved:</div>
          <div className="flex flex-wrap gap-2">
            {pattern.planets.map((planetName, i) => {
              const planet = PLANETS.find(p => p.name === planetName)
              return (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-cosmic-800/50 border border-cosmic-700/50"
                >
                  <span
                    className="text-lg font-bold"
                    style={{ color: planet?.color || '#fff' }}
                  >
                    {getPlanetSymbol(planetName)}
                  </span>
                  <span className="text-xs text-cosmic-300">{planetName}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Interpretation */}
        <div className="mb-3">
          <p className="text-sm text-cosmic-200 leading-relaxed">
            {pattern.interpretation}
          </p>
        </div>

        {/* Action button */}
        <Button
          onClick={handleShowOnChart}
          variant={isSelected ? 'primary' : 'ghost'}
          size="sm"
          className={`w-full ${
            isSelected
              ? 'text-white'
              : 'text-cosmic-300 hover:text-white border border-cosmic-700/50'
          }`}
          style={
            isSelected
              ? { backgroundColor: color, borderColor: color }
              : {}
          }
        >
          {isSelected ? 'Hide from Chart' : 'Show on Chart'}
        </Button>
      </div>
    </motion.div>
  )
}
