/**
 * Aspect Group Component
 * Groups aspects by planet with collapsible sections
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Aspect, PlanetPosition } from '@/lib/astrology/types'
import { ASPECT_CONFIG, PLANETS } from '@/lib/astrology/types'
import { useChartStore } from '../stores/chartStore'
import { listItemVariants, panelVariants, cardVariants, withReducedMotion } from '../animations'
import { useInterpretations } from '../contexts/InterpretationsContext'

interface AspectGroupProps {
  planet: PlanetPosition
  aspects: Aspect[]
  index?: number
  onAspectClick?: (aspect: Aspect) => void
}

export function AspectGroup({ planet, aspects, index = 0, onAspectClick }: AspectGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const setSelectedElement = useChartStore(state => state.setSelectedElement)
  const { getInterpretationFor } = useInterpretations()

  // Get planet color
  const planetConfig = PLANETS.find(p => p.name === planet.name)

  // Handle aspect click - highlight both planets on the wheel
  const handleAspectClick = (aspect: Aspect) => {
    // Select the first planet in the aspect
    setSelectedElement({
      type: 'planet',
      id: aspect.planet1,
      data: planet,
    })

    // Call optional callback
    onAspectClick?.(aspect)
  }

  if (aspects.length === 0) return null

  return (
    <motion.div
      className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg border border-cosmic-700/50 overflow-hidden"
      custom={index}
      variants={withReducedMotion(cardVariants)}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.005, borderColor: 'rgba(78, 205, 196, 0.5)' }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-cosmic-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Planet indicator */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold shadow-lg flex-shrink-0"
            style={{ backgroundColor: planetConfig?.color || '#888' }}
          >
            <span className="text-black drop-shadow">{planet.symbol}</span>
          </div>

          {/* Planet name and count */}
          <div className="text-left">
            <h3 className="text-sm font-bold text-white">{planet.name} Aspects</h3>
            <p className="text-xs text-cosmic-400">
              {aspects.length} aspect{aspects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Expand/collapse icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-cosmic-400" />
        </motion.div>
      </button>

      {/* Aspects list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={withReducedMotion(panelVariants)}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1 border-t border-cosmic-700/30">
              {aspects.map((aspect, index) => {
                const config = ASPECT_CONFIG[aspect.type]
                const otherPlanet = aspect.planet1 === planet.name ? aspect.planet2 : aspect.planet1

                // Build element_key for AI interpretation lookup
                const planet1 = aspect.planet1.toLowerCase().replace(/ /g, '_')
                const planet2 = aspect.planet2.toLowerCase().replace(/ /g, '_')
                const aspectType = aspect.type.toLowerCase().replace(/ /g, '_')
                const elementKey = `${planet1}_${aspectType}_${planet2}`

                // Get AI interpretation
                const aiInterpretation = getInterpretationFor('aspect', elementKey)

                return (
                  <motion.div
                    key={`${aspect.planet1}-${aspect.planet2}-${index}`}
                    custom={index}
                    variants={withReducedMotion(listItemVariants)}
                    initial="initial"
                    animate="animate"
                    className="rounded-lg bg-cosmic-900/50 border border-cosmic-700/30 overflow-hidden"
                  >
                    <motion.button
                      onClick={() => handleAspectClick(aspect)}
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(30, 30, 60, 0.6)' }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-between p-1.5 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {/* Aspect symbol */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shadow-md flex-shrink-0"
                          style={{ backgroundColor: config.color, color: '#000' }}
                        >
                          {config.symbol}
                        </div>

                        {/* Aspect details */}
                        <div className="text-left">
                          <div className="text-xs font-semibold text-white">
                            {aspect.type} {otherPlanet}
                          </div>
                          <div className="text-xs text-cosmic-400">
                            {aspect.angle}° (orb: {aspect.orb.toFixed(2)}°)
                          </div>
                        </div>
                      </div>

                      {/* Applying/Separating badge */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            aspect.isApplying
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {aspect.isApplying ? 'Applying' : 'Separating'}
                        </div>
                        <ChevronRight className="w-3 h-3 text-cosmic-500" />
                      </div>
                    </motion.button>

                    {/* AI Interpretation */}
                    {aiInterpretation && (
                      <div className="px-2 pb-1.5 border-t border-cosmic-700/30 bg-cosmic-900/30">
                        <p className="text-xs text-cosmic-200 italic leading-relaxed">
                          {aiInterpretation.ai_description}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
