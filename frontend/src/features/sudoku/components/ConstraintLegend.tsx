/**
 * Constraint Legend Component
 *
 * Shows the active constraints with their astrological meanings
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Star, Circle, Thermometer, Target, HelpCircle } from 'lucide-react'
import type { Constraint } from '../types'
import { CONSTRAINT_COLORS } from '../types'

interface ConstraintLegendProps {
  constraints: Constraint[]
  expanded?: boolean
  onToggle?: () => void
}

const CONSTRAINT_ICONS: Record<string, React.ElementType> = {
  renban: Circle,
  german_whispers: Star,
  killer_cage: Target,
  thermometer: Thermometer,
  between_line: HelpCircle,
  arrow: HelpCircle
}

const CONSTRAINT_RULES: Record<string, string> = {
  renban: 'Consecutive digits in any order',
  german_whispers: 'Adjacent cells differ by 5+',
  killer_cage: 'Cells sum to target, no repeats',
  thermometer: 'Strictly increasing from bulb',
  between_line: 'Middle cells between endpoints',
  arrow: 'Circle equals sum of arrow cells'
}

export const ConstraintLegend = ({
  constraints,
  expanded = true,
  onToggle
}: ConstraintLegendProps) => {
  // Group constraints by type
  const constraintsByType = constraints.reduce((acc, c) => {
    if (!acc[c.constraint_type]) {
      acc[c.constraint_type] = []
    }
    acc[c.constraint_type].push(c)
    return acc
  }, {} as Record<string, Constraint[]>)

  const types = Object.keys(constraintsByType)

  if (types.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-400">
        <p>Classic Sudoku</p>
        <p className="text-sm mt-1">No variant constraints active</p>
      </div>
    )
  }

  return (
    <motion.div
      className="bg-gray-800/50 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between
                   hover:bg-gray-700/50 transition-colors"
      >
        <span className="font-medium text-white">
          Constraints ({constraints.length})
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-gray-400"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {types.map(type => {
                const items = constraintsByType[type]
                const colors = CONSTRAINT_COLORS[type as keyof typeof CONSTRAINT_COLORS]
                const Icon = CONSTRAINT_ICONS[type] || Circle
                const rule = CONSTRAINT_RULES[type]

                return (
                  <div
                    key={type}
                    className="space-y-2"
                  >
                    {/* Type header */}
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${colors.fill}`}>
                        <Icon className={`w-4 h-4 ${colors.line.replace('stroke-', 'text-')}`} />
                      </div>
                      <div>
                        <span className="font-medium text-white">
                          {colors.label}
                        </span>
                        <span className="text-gray-500 ml-2 text-sm">
                          ({items.length})
                        </span>
                      </div>
                    </div>

                    {/* Rule description */}
                    <p className="text-sm text-gray-400 pl-8">
                      {rule}
                    </p>

                    {/* Individual constraints with astrological meaning */}
                    <div className="space-y-1 pl-8">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-gray-500 flex items-start gap-2"
                        >
                          <span className="text-purple-400 mt-0.5">*</span>
                          <span>
                            {item.description || `${item.planets?.join(' & ') || 'Transit'} aspect`}
                            {item.target !== undefined && (
                              <span className="text-amber-400 ml-1">= {item.target}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
