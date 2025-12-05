/**
 * CognitiveStack Component
 *
 * Displays the cognitive function stack for a Myers-Briggs type.
 */
import { motion } from 'framer-motion'
import { getFunctionPositionColor } from '@/lib/api/myersBriggs'
import type { CognitiveFunction } from '../types'

interface CognitiveStackProps {
  stack: CognitiveFunction[]
  onFunctionHover?: (func: string | null) => void
  highlightedFunction?: string | null
}

export function CognitiveStack({
  stack,
  onFunctionHover,
  highlightedFunction,
}: CognitiveStackProps) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Cognitive Function Stack
      </h3>

      <div className="space-y-3">
        {stack.map((func, index) => {
          const positionColor = getFunctionPositionColor(func.position)
          const isHighlighted = highlightedFunction === func.function

          return (
            <motion.div
              key={func.function}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => onFunctionHover?.(func.function)}
              onMouseLeave={() => onFunctionHover?.(null)}
              className={`
                p-4 rounded-lg cursor-pointer transition-all
                ${isHighlighted ? 'ring-2' : ''}
              `}
              style={{
                backgroundColor: isHighlighted
                  ? `${positionColor}20`
                  : 'rgba(55, 65, 81, 0.5)',
                ringColor: isHighlighted ? positionColor : 'transparent',
              }}
            >
              <div className="flex items-center gap-4">
                {/* Position number */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: positionColor }}
                >
                  {index + 1}
                </div>

                {/* Function info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg font-bold"
                      style={{ color: positionColor }}
                    >
                      {func.function}
                    </span>
                    <span className="text-sm text-gray-400">
                      {func.position}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {func.name}
                  </div>
                </div>
              </div>

              {/* Description (shown on hover/highlight) */}
              {isHighlighted && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-gray-600"
                >
                  <p className="text-sm text-gray-400">
                    {func.description}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-cosmic-700">
        <div className="text-xs text-gray-500 mb-2">Function Positions:</div>
        <div className="flex flex-wrap gap-3">
          {['Dominant', 'Auxiliary', 'Tertiary', 'Inferior'].map((pos) => (
            <div key={pos} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getFunctionPositionColor(pos) }}
              />
              <span className="text-xs text-gray-400">{pos}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
