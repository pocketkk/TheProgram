/**
 * Vedic Planet Badge Component
 *
 * Displays a planet with its Vedic-specific information:
 * - Abbreviation and full name
 * - Retrograde indicator
 * - Dignity coloring
 * - Nakshatra and pada info
 */
import React from 'react'
import { motion } from 'framer-motion'
import {
  PLANET_ABBREVIATIONS,
  PLANET_NAMES,
  PLANET_COLORS,
  DIGNITY_COLORS,
  DIGNITY_LABELS,
  VEDIC_SIGNS,
  formatDegree,
} from '../utils/vedicConstants'
import type { VedicPlanetPosition, NakshatraInfo, PlanetaryDignity } from '../types'

interface VedicPlanetBadgeProps {
  planetName: string
  planet: VedicPlanetPosition
  dignity?: PlanetaryDignity
  nakshatra?: NakshatraInfo
  isSelected?: boolean
  isHovered?: boolean
  compact?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const VedicPlanetBadge: React.FC<VedicPlanetBadgeProps> = ({
  planetName,
  planet,
  dignity,
  nakshatra,
  isSelected = false,
  isHovered = false,
  compact = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const abbr = PLANET_ABBREVIATIONS[planetName] || planetName.slice(0, 2).toUpperCase()
  const fullName = PLANET_NAMES[planetName] || planetName
  const color = PLANET_COLORS[planetName] || '#fff'
  const dignityColor = dignity ? DIGNITY_COLORS[dignity] : undefined
  const dignityLabel = dignity ? DIGNITY_LABELS[dignity] : undefined
  const sign = VEDIC_SIGNS[planet.sign]

  if (compact) {
    return (
      <motion.div
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer
          ${isSelected ? 'bg-celestial-gold/20 ring-2 ring-celestial-gold' : 'bg-cosmic-800/90'}
          ${isHovered ? 'bg-cosmic-700/90' : ''}
          hover:bg-cosmic-700/90 transition-all duration-200
        `}
        style={{
          boxShadow: isSelected
            ? '0 0 16px rgba(247, 179, 43, 0.4)'
            : isHovered
            ? '0 0 12px rgba(183, 148, 246, 0.3)'
            : 'none'
        }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <span
          className="font-bold text-sm"
          style={{
            color: dignityColor || color,
            textShadow: `0 0 8px ${dignityColor || color}, 0 0 4px ${dignityColor || color}`
          }}
        >
          {abbr}
        </span>
        {planet.retrograde && (
          <span
            className="text-celestial-pink text-xs font-bold"
            style={{ textShadow: '0 0 6px rgba(255, 110, 199, 0.8)' }}
          >
            R
          </span>
        )}
        <span
          className="text-cosmic-200 text-xs font-medium"
          style={{ textShadow: '0 0 6px rgba(212, 186, 255, 0.4)' }}
        >
          {sign.symbol}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`
        p-4 rounded-lg cursor-pointer border
        ${isSelected ? 'bg-celestial-gold/15 ring-2 ring-celestial-gold border-celestial-gold/50' : 'bg-cosmic-800/80 border-cosmic-600/40'}
        ${isHovered ? 'bg-cosmic-700/80 border-cosmic-500/60' : ''}
        hover:bg-cosmic-700/80 transition-all duration-200
      `}
      style={{
        boxShadow: isSelected
          ? '0 0 20px rgba(247, 179, 43, 0.4), 0 4px 12px rgba(0, 0, 0, 0.5)'
          : isHovered
          ? '0 0 16px rgba(183, 148, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Header: Planet name and retrograde */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: `${color}25`,
              color: dignityColor || color,
              border: `2.5px solid ${dignityColor || color}`,
              boxShadow: `0 0 12px ${dignityColor || color}40`,
              textShadow: `0 0 6px ${dignityColor || color}`
            }}
          >
            {abbr}
          </span>
          <div>
            <span
              className="text-cosmic-50 font-semibold text-base"
              style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' }}
            >
              {fullName}
            </span>
            {planet.retrograde && (
              <span
                className="ml-1.5 text-celestial-pink text-xs font-bold"
                style={{ textShadow: '0 0 8px rgba(255, 110, 199, 0.8)' }}
              >
                (R)
              </span>
            )}
          </div>
        </div>
        {dignityLabel && (
          <span
            className="text-xs px-2.5 py-1 rounded font-semibold"
            style={{
              backgroundColor: `${dignityColor}25`,
              color: dignityColor,
              border: `1px solid ${dignityColor}40`,
              textShadow: `0 0 6px ${dignityColor}50`
            }}
          >
            {dignityLabel}
          </span>
        )}
      </div>

      {/* Position info */}
      <div className="text-sm text-cosmic-300 space-y-1.5">
        <div className="flex justify-between">
          <span className="font-medium">Sign:</span>
          <span
            className="text-cosmic-100 font-semibold"
            style={{ textShadow: '0 0 6px rgba(212, 186, 255, 0.3)' }}
          >
            {sign.name} ({sign.sanskrit})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Degree:</span>
          <span
            className="text-cosmic-100 font-semibold"
            style={{ textShadow: '0 0 6px rgba(212, 186, 255, 0.3)' }}
          >
            {formatDegree(planet.degreeInSign || planet.longitude % 30)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">House:</span>
          <span
            className="text-cosmic-100 font-semibold"
            style={{ textShadow: '0 0 6px rgba(212, 186, 255, 0.3)' }}
          >
            {planet.house}
          </span>
        </div>
      </div>

      {/* Nakshatra info */}
      {nakshatra && (
        <div className="mt-3 pt-3 border-t border-cosmic-600/50 text-sm">
          <div className="flex justify-between text-cosmic-300">
            <span className="font-medium">Nakshatra:</span>
            <span
              className="text-celestial-purple font-semibold"
              style={{ textShadow: '0 0 8px rgba(183, 148, 246, 0.5)' }}
            >
              {nakshatra.name}
            </span>
          </div>
          <div className="flex justify-between text-cosmic-300 mt-1">
            <span className="font-medium">Pada:</span>
            <span
              className="text-cosmic-100 font-semibold"
              style={{ textShadow: '0 0 6px rgba(212, 186, 255, 0.3)' }}
            >
              {nakshatra.pada}
            </span>
          </div>
          <div className="flex justify-between text-cosmic-300 mt-1">
            <span className="font-medium">Lord:</span>
            <span
              className="text-cosmic-100 font-semibold capitalize"
              style={{ textShadow: '0 0 6px rgba(212, 186, 255, 0.3)' }}
            >
              {nakshatra.lord}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
