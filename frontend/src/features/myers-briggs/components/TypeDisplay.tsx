/**
 * TypeDisplay Component
 *
 * Displays the main Myers-Briggs type visualization with the 4-letter code,
 * type name, and preference strengths.
 */
import { motion } from 'framer-motion'
import {
  getTypeColor,
  getTemperamentColor,
  formatPreferenceStrength,
} from '@/lib/api/myersBriggs'
import type { MBTypeResponse } from '../types'

interface TypeDisplayProps {
  mbType: MBTypeResponse
  onDichotomyHover?: (dichotomy: string | null) => void
}

export function TypeDisplay({ mbType, onDichotomyHover }: TypeDisplayProps) {
  const typeColor = getTypeColor(mbType.type_code)
  const tempColor = getTemperamentColor(mbType.temperament)

  return (
    <div className="glass rounded-xl p-6">
      {/* Main Type Display */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block"
        >
          <div
            className="text-6xl font-bold tracking-wider mb-2"
            style={{ color: typeColor }}
          >
            {mbType.type_code}
          </div>
          <div className="text-xl text-gray-300 font-medium">
            {mbType.type_name}
          </div>
          <div
            className="text-sm mt-1"
            style={{ color: tempColor }}
          >
            {mbType.temperament} Temperament
          </div>
        </motion.div>
      </div>

      {/* Preference Bars */}
      <div className="space-y-4">
        {mbType.dichotomies.map((dichotomy, index) => (
          <motion.div
            key={dichotomy.dichotomy}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            onMouseEnter={() => onDichotomyHover?.(dichotomy.dichotomy)}
            onMouseLeave={() => onDichotomyHover?.(null)}
            className="cursor-pointer"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-400">
                {dichotomy.first_option}
              </span>
              <span className="text-xs text-gray-500">
                {dichotomy.dichotomy}
              </span>
              <span className="text-sm text-gray-400">
                {dichotomy.second_option}
              </span>
            </div>

            <div className="relative h-8 bg-cosmic-800 rounded-full overflow-hidden">
              {/* First option bar */}
              <motion.div
                className="absolute left-0 top-0 h-full rounded-l-full"
                style={{
                  backgroundColor: dichotomy.preference === dichotomy.first_option
                    ? typeColor
                    : 'rgba(107, 114, 128, 0.3)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${dichotomy.first_score}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              />

              {/* Second option bar */}
              <motion.div
                className="absolute right-0 top-0 h-full rounded-r-full"
                style={{
                  backgroundColor: dichotomy.preference === dichotomy.second_option
                    ? typeColor
                    : 'rgba(107, 114, 128, 0.3)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${dichotomy.second_score}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              />

              {/* Center line */}
              <div className="absolute left-1/2 top-0 w-px h-full bg-cosmic-600 -ml-px" />

              {/* Preference indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: typeColor,
                  }}
                >
                  {dichotomy.preference} ({formatPreferenceStrength(dichotomy.strength)})
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-sm text-gray-400 text-center"
      >
        {mbType.description}
      </motion.div>
    </div>
  )
}
