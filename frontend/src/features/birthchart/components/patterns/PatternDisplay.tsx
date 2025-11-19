/**
 * PatternDisplay - Container for displaying all detected patterns
 */

import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import type { AspectPattern } from '@/lib/astrology/patterns'
import { PatternCard } from './PatternCard'

interface PatternDisplayProps {
  patterns: AspectPattern[]
}

export function PatternDisplay({ patterns }: PatternDisplayProps) {
  if (patterns.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 px-6 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-cosmic-800/50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-cosmic-400" />
        </div>
        <h3 className="text-lg font-bold text-cosmic-200 mb-2">
          No Patterns Detected
        </h3>
        <p className="text-sm text-cosmic-400 max-w-md">
          No special aspect patterns were found in this chart. Patterns like Grand Trines,
          T-Squares, and Yods require specific planetary configurations.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4"
      >
        <div>
          <h2 className="text-xl font-bold text-gradient-celestial">
            Aspect Patterns
          </h2>
          <p className="text-sm text-cosmic-400 mt-1">
            {patterns.length} special configuration{patterns.length !== 1 ? 's' : ''} detected
          </p>
        </div>
      </motion.div>

      {/* Pattern cards */}
      <div className="space-y-3">
        {patterns.map((pattern, index) => (
          <PatternCard key={`${pattern.type}-${index}`} pattern={pattern} index={index} />
        ))}
      </div>

      {/* Help text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30"
      >
        <p className="text-xs text-cosmic-400 leading-relaxed">
          <strong className="text-cosmic-300">Tip:</strong> Click "Show on Chart" to
          highlight the pattern's planets and connecting aspects on the birth chart wheel.
          Patterns are sorted by strength, with the most significant configurations shown first.
        </p>
      </motion.div>
    </div>
  )
}
