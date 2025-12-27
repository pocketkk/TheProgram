/**
 * House Information Panel
 */

import { motion } from 'framer-motion'
import type { House, PlanetPosition } from '@/lib/astrology/types'
import { getHouseInterpretation } from '@/lib/astrology/calculator'
import { PLANETS } from '@/lib/astrology/types'
import { cardVariants, withReducedMotion } from '../animations'
import { useInterpretations } from '../contexts/InterpretationsContext'

interface HouseInfoProps {
  house: House
  planets: PlanetPosition[]
  index: number
}

export function HouseInfo({ house, planets, index }: HouseInfoProps) {
  const planetsInHouse = planets.filter(p => p.house === house.number)
  const { getInterpretationFor } = useInterpretations()

  // Get AI interpretation if available, fallback to static interpretation
  const aiInterpretation = getInterpretationFor('house', `house_${house.number}`)
  const interpretation = aiInterpretation?.ai_description || getHouseInterpretation(house.number)

  const houseColors = [
    '#FF6B6B', // 1st - Red
    '#8B7355', // 2nd - Brown
    '#4ECDC4', // 3rd - Cyan
    '#4169E1', // 4th - Blue
    '#FFD700', // 5th - Gold
    '#8B4513', // 6th - Saddle Brown
    '#FFC0CB', // 7th - Pink
    '#DC143C', // 8th - Crimson
    '#DAA520', // 9th - Goldenrod
    '#4FD0E0', // 10th - Light Cyan
    '#8B7355', // 11th - Brown
    '#4169E1', // 12th - Royal Blue
  ]

  const color = houseColors[house.number - 1]

  return (
    <motion.div
      custom={index}
      variants={withReducedMotion(cardVariants)}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.01, borderColor: 'rgba(78, 205, 196, 0.5)' }}
      className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-2 border border-cosmic-700/50 transition-all backdrop-blur-sm min-w-[320px]"
    >
      <div className="flex items-start gap-2">
        {/* House number */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shadow-lg border-2 flex-shrink-0"
          style={{ borderColor: color, color }}
        >
          {house.number}
        </div>

        {/* House details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-heading font-bold text-white mb-0.5">
            {house.number === 1 && '1st - Self & Identity'}
            {house.number === 2 && '2nd - Values & Resources'}
            {house.number === 3 && '3rd - Communication'}
            {house.number === 4 && '4th - Home & Family'}
            {house.number === 5 && '5th - Creativity & Romance'}
            {house.number === 6 && '6th - Health & Service'}
            {house.number === 7 && '7th - Partnerships'}
            {house.number === 8 && '8th - Transformation'}
            {house.number === 9 && '9th - Philosophy & Travel'}
            {house.number === 10 && '10th - Career & Status'}
            {house.number === 11 && '11th - Friendships & Ideals'}
            {house.number === 12 && '12th - Subconscious'}
          </h3>

          {/* Cusp position */}
          <div className="text-xs text-cosmic-300 mb-1">
            Cusp: {house.degree}° {house.sign} {house.minute}'
          </div>

          {/* Interpretation */}
          <p className="text-xs text-cosmic-200 italic mb-1.5 leading-relaxed">{interpretation}</p>

          {/* Planets in house */}
          {planetsInHouse.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-cosmic-700/50">
              <div className="text-xs font-semibold text-cosmic-400 mb-1">
                Planets in this house:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {planetsInHouse.map(planet => {
                  const planetConfig = PLANETS.find(p => p.name === planet.name)
                  return (
                    <div
                      key={planet.name}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border"
                      style={{
                        backgroundColor: `${planetConfig?.color}20`,
                        borderColor: `${planetConfig?.color}50`,
                        color: planetConfig?.color,
                      }}
                    >
                      <span className="text-sm">{planet.symbol}</span>
                      <span className="font-medium">{planet.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
