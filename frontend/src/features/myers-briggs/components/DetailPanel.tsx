/**
 * DetailPanel Component
 *
 * Displays detailed information about the selected MB type element.
 */
import { motion } from 'framer-motion'
import { Check, AlertCircle } from 'lucide-react'
import { getTypeColor } from '@/lib/api/myersBriggs'
import type { MBTypeResponse, DichotomyScore } from '../types'

interface DetailPanelProps {
  mbType: MBTypeResponse
  selectedDichotomy?: string | null
}

export function DetailPanel({ mbType, selectedDichotomy }: DetailPanelProps) {
  const typeColor = getTypeColor(mbType.type_code)

  // Find selected dichotomy details
  const dichotomy = selectedDichotomy
    ? mbType.dichotomies.find(d => d.dichotomy === selectedDichotomy)
    : null

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      {/* Strengths Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          Strengths
        </h3>
        <ul className="space-y-2">
          {mbType.strengths.map((strength, index) => (
            <motion.li
              key={strength}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-2 text-sm text-gray-300"
            >
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: typeColor }}
              />
              {strength}
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Challenges Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Growth Areas
        </h3>
        <ul className="space-y-2">
          {mbType.challenges.map((challenge, index) => (
            <motion.li
              key={challenge}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-2 text-sm text-gray-300"
            >
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-amber-500" />
              {challenge}
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Selected Dichotomy Details */}
      {dichotomy && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-cosmic-700"
        >
          <h3 className="text-lg font-semibold text-white mb-3">
            {dichotomy.dichotomy} Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Your Preference:</span>
              <span
                className="text-lg font-bold"
                style={{ color: typeColor }}
              >
                {dichotomy.preference}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Strength:</span>
              <span className="text-sm text-gray-300">
                {Math.round(dichotomy.strength)}%
              </span>
            </div>
            {dichotomy.contributing_factors.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Contributing Factors:
                </span>
                <div className="flex flex-wrap gap-1">
                  {dichotomy.contributing_factors.map((factor) => (
                    <span
                      key={factor}
                      className="text-xs px-2 py-1 rounded-full bg-cosmic-800 text-gray-400"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Preference Strengths Summary */}
      <div className="pt-4 border-t border-cosmic-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          All Preference Strengths
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(mbType.preference_strengths).map(([letter, strength]) => (
            <div
              key={letter}
              className="text-center p-2 rounded bg-cosmic-800"
            >
              <div
                className="text-lg font-bold"
                style={{
                  color: mbType.type_code.includes(letter) ? typeColor : '#6B7280'
                }}
              >
                {letter}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(strength)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
