/**
 * Vedic House Cell Component
 *
 * Displays house information with:
 * - House number and sign
 * - Planets in the house
 * - House significance
 */
import React from 'react'
import { motion } from 'framer-motion'
import {
  VEDIC_SIGNS,
  PLANET_ABBREVIATIONS,
  PLANET_COLORS,
  DIGNITY_COLORS,
} from '../utils/vedicConstants'
import type { VedicPlanetPosition, PlanetaryDignity } from '../types'

// House meanings in Vedic astrology
const HOUSE_MEANINGS: Record<number, string> = {
  1: 'Self, personality, body',
  2: 'Wealth, family, speech',
  3: 'Siblings, courage, communication',
  4: 'Mother, home, happiness',
  5: 'Children, intelligence, creativity',
  6: 'Enemies, disease, service',
  7: 'Spouse, partnership, business',
  8: 'Longevity, transformation, occult',
  9: 'Fortune, dharma, father',
  10: 'Career, status, authority',
  11: 'Gains, friends, aspirations',
  12: 'Loss, liberation, foreign lands',
}

interface VedicHouseCellProps {
  houseNumber: number
  signIndex: number
  planets: Array<{
    name: string
    position: VedicPlanetPosition
    dignity?: PlanetaryDignity
  }>
  isAscendant?: boolean
  isSelected?: boolean
  isHovered?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const VedicHouseCell: React.FC<VedicHouseCellProps> = ({
  houseNumber,
  signIndex,
  planets,
  isAscendant = false,
  isSelected = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const sign = VEDIC_SIGNS[signIndex]
  const meaning = HOUSE_MEANINGS[houseNumber]

  return (
    <motion.div
      className={`
        p-3 rounded-lg cursor-pointer
        ${isSelected ? 'bg-amber-500/20 ring-1 ring-amber-500' : 'bg-slate-800/60'}
        ${isHovered ? 'bg-slate-700/60' : ''}
        ${isAscendant ? 'ring-1 ring-amber-500/50' : ''}
        hover:bg-slate-700/60 transition-colors
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: houseNumber * 0.03 }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">
            House {houseNumber}
          </span>
          {isAscendant && (
            <span className="text-amber-400 text-xs font-medium px-1.5 py-0.5 bg-amber-500/20 rounded">
              ASC
            </span>
          )}
        </div>
        <span className="text-slate-400 text-sm">
          {sign.symbol} {sign.name}
        </span>
      </div>

      {/* Meaning */}
      <p className="text-slate-500 text-xs mb-2">{meaning}</p>

      {/* Planets in house */}
      {planets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {planets.map(({ name, position, dignity }) => {
            const abbr = PLANET_ABBREVIATIONS[name] || name.slice(0, 2)
            const color = PLANET_COLORS[name] || '#fff'
            const dignityColor = dignity ? DIGNITY_COLORS[dignity] : undefined

            return (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${color}15`,
                  color: dignityColor || color,
                  border: `1px solid ${dignityColor || color}40`,
                }}
              >
                {abbr}
                {position.retrograde && (
                  <span className="text-red-400">R</span>
                )}
              </span>
            )
          })}
        </div>
      ) : (
        <span className="text-slate-600 text-xs italic">Empty</span>
      )}
    </motion.div>
  )
}
