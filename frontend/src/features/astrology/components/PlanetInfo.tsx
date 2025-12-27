/**
 * Planet Information Panel
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { PlanetPosition } from '@/lib/astrology/types'
import { PLANETS } from '@/lib/astrology/types'
import { getPlanetInSignInterpretation } from '@/lib/astrology/calculator'
import { cardVariants, withReducedMotion } from '../animations'
import { useChartInteractions } from '../hooks/useChartInteractions'
import { useInterpretations } from '../contexts/InterpretationsContext'
import { getGateAtDegree, getChannelForGate } from '@/lib/astronomy/humanDesignGates'

interface PlanetInfoProps {
  planet: PlanetPosition
  index: number
}

export function PlanetInfo({ planet, index }: PlanetInfoProps) {
  const planetConfig = PLANETS.find(p => p.name === planet.name)
  const fallbackInterpretation = getPlanetInSignInterpretation(planet.name, planet.sign)
  const { getInterpretationFor } = useInterpretations()
  const { onPlanetClick, isSelected } = useChartInteractions()
  const selected = isSelected('planet', planet.name)
  const [isExpanded, setIsExpanded] = useState(false)

  // Get AI interpretation, fall back to static interpretation
  const aiInterpretation = getInterpretationFor('planet', planet.name.toLowerCase())
  const interpretation = aiInterpretation?.ai_description || fallbackInterpretation

  // Calculate HD gate and line
  const gate = getGateAtDegree(planet.longitude)
  let hdGate = null
  let hdLine = null
  if (gate) {
    const degreeInGate = planet.longitude - gate.startDegree
    hdLine = Math.floor(degreeInGate / 0.9375) + 1
    hdGate = gate
  }

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <motion.div
      custom={index}
      variants={withReducedMotion(cardVariants)}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.01, borderColor: 'rgba(78, 205, 196, 0.5)' }}
      onClick={() => onPlanetClick(planet)}
      className={`bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-2 border transition-all backdrop-blur-sm min-w-[320px] cursor-pointer ${
        selected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-cosmic-700/50'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Planet symbol */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shadow-lg flex-shrink-0"
          style={{ backgroundColor: planetConfig?.color, color: '#000' }}
        >
          {planet.symbol}
        </div>

        {/* Planet details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-heading font-bold text-white">{planet.name}</h3>
              {planet.isRetrograde && (
                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                  ℞
                </span>
              )}
            </div>
            <button
              onClick={toggleExpanded}
              className="text-cosmic-400 hover:text-cosmic-200 transition-colors text-sm"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>

          {/* Position - Always visible */}
          <div className="flex items-center gap-1.5 text-xs mb-1">
            <span className="text-cosmic-300">
              {planet.degree}° {planet.sign} {planet.minute}'
            </span>
            <span className="text-cosmic-500">•</span>
            <span className="text-cosmic-400">House {planet.house}</span>
          </div>

          {/* HD Gate - Always visible */}
          {hdGate && (() => {
            const channel = getChannelForGate(hdGate.number)
            return (
              <div className="flex items-center gap-1.5 text-xs mb-1">
                <span className="text-purple-400 font-semibold">
                  Gate {hdGate.number}.{hdLine}
                </span>
                <span className="text-cosmic-500">•</span>
                <span className="text-cosmic-300">{hdGate.name}</span>
                {channel && (
                  <>
                    <span className="text-cosmic-500">•</span>
                    <span className="text-cosmic-400 italic">{channel.name}</span>
                  </>
                )}
              </div>
            )
          })()}

          {/* Collapsible details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Element and Modality */}
                <div className="flex gap-1.5 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-cosmic-800/50 text-cosmic-300 rounded border border-cosmic-700/50">
                    {planet.element}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 bg-cosmic-800/50 text-cosmic-300 rounded border border-cosmic-700/50">
                    {planet.modality}
                  </span>
                </div>

                {/* Human Design Gate */}
                {hdGate && (
                  <div className="mb-1 p-1.5 bg-cosmic-800/30 rounded border border-cosmic-700/30">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-purple-400">
                        Gate {hdGate.number}.{hdLine}
                      </span>
                      <span className="text-xs text-cosmic-400">•</span>
                      <span className="text-xs text-cosmic-300">{hdGate.name}</span>
                    </div>
                    <p className="text-xs text-cosmic-400 leading-relaxed">
                      Human Design: {planet.name} activates Gate {hdGate.number} (The Gate of {hdGate.name}), Line {hdLine}
                    </p>
                  </div>
                )}

                {/* Interpretation */}
                <p className="text-xs text-cosmic-200 italic leading-relaxed">{interpretation}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
