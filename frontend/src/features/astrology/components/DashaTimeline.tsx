/**
 * DashaTimeline Component
 *
 * Visual timeline displaying Vimsottari Dasha periods (Mahadashas and Antardashas).
 * Color-coded by planetary ruler with expandable sub-periods.
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import type { DashaResponse, Mahadasha, DashaPeriod } from '@/lib/api/dasha'

interface DashaTimelineProps {
  dashaData: DashaResponse | null
  isLoading?: boolean
}

export const DashaTimeline = ({ dashaData, isLoading }: DashaTimelineProps) => {
  const [expandedMahadasha, setExpandedMahadasha] = useState<number | null>(null)

  const now = useMemo(() => new Date(), [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-celestial-gold" />
            Vimsottari Dasha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-cosmic-800 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!dashaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-celestial-gold" />
            Vimsottari Dasha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-4">
            Calculate a Vedic chart to view Dasha periods
          </p>
        </CardContent>
      </Card>
    )
  }

  const { mahadashas, current_mahadasha, current_antardasha, calculation_info, summary } = dashaData

  const isPeriodCurrent = (period: DashaPeriod | Mahadasha) => {
    const start = new Date(period.start_date)
    const end = new Date(period.end_date)
    return now >= start && now < end
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDuration = (years: number) => {
    if (years >= 1) {
      const wholeYears = Math.floor(years)
      const months = Math.round((years - wholeYears) * 12)
      if (months === 0) return `${wholeYears}y`
      return `${wholeYears}y ${months}m`
    }
    return `${Math.round(years * 12)}m`
  }

  const toggleMahadasha = (index: number) => {
    setExpandedMahadasha(expandedMahadasha === index ? null : index)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-celestial-gold" />
            Vimsottari Dasha
          </CardTitle>
          {summary && (
            <Badge variant="secondary" className="font-mono">
              {summary.current_period_string}
            </Badge>
          )}
        </div>
        {calculation_info && (
          <p className="text-sm text-gray-400 mt-1">
            Birth nakshatra: <span className="text-celestial-pink">{calculation_info.nakshatra.name}</span>
            {' '}(Lord: {calculation_info.starting_planet.charAt(0).toUpperCase() + calculation_info.starting_planet.slice(1)})
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Current Period Summary */}
        {current_mahadasha && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg glass border border-celestial-gold/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-celestial-gold" />
              <span className="text-sm font-medium">Current Period</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-2xl"
                style={{ color: current_mahadasha.color }}
              >
                {current_mahadasha.symbol}
              </span>
              <div>
                <p className="font-semibold">
                  {current_mahadasha.planet_name}
                  {current_antardasha && (
                    <span className="text-gray-400">
                      {' - '}{current_antardasha.planet_name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(current_mahadasha.start_date)} → {formatDate(current_mahadasha.end_date)}
                  {summary?.time_remaining_in_mahadasha && (
                    <span className="ml-2 text-celestial-gold">
                      ({formatDuration(summary.time_remaining_in_mahadasha.years)} remaining)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        <div className="space-y-2">
          {mahadashas.map((maha, index) => {
            const isCurrent = isPeriodCurrent(maha)
            const isExpanded = expandedMahadasha === index
            const hasAntardashas = maha.antardashas && maha.antardashas.length > 0

            return (
              <motion.div
                key={`${maha.planet}-${maha.start_date}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Mahadasha Row */}
                <div
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer
                    ${isCurrent
                      ? 'bg-gradient-to-r from-cosmic-700/50 to-transparent border-l-4'
                      : 'hover:bg-cosmic-800/50'
                    }
                  `}
                  style={{ borderColor: isCurrent ? maha.color : 'transparent' }}
                  onClick={() => hasAntardashas && toggleMahadasha(index)}
                >
                  {/* Expand/Collapse Icon */}
                  {hasAntardashas ? (
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </motion.div>
                  ) : (
                    <div className="w-4" />
                  )}

                  {/* Planet Symbol */}
                  <span
                    className="text-xl w-8 text-center"
                    style={{ color: maha.color }}
                  >
                    {maha.symbol}
                  </span>

                  {/* Period Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                        {maha.planet_name}
                      </span>
                      {isCurrent && (
                        <Badge variant="celestial" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {formatDate(maha.start_date)} → {formatDate(maha.end_date)}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-sm text-gray-400 font-mono">
                    {formatDuration(maha.duration_years)}
                  </span>
                </div>

                {/* Antardashas (Sub-periods) */}
                <AnimatePresence>
                  {isExpanded && hasAntardashas && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-8 pl-4 border-l border-cosmic-700 mt-1 space-y-1">
                        {maha.antardashas!.map((antar, antarIndex) => {
                          const isAntarCurrent = isPeriodCurrent(antar)

                          return (
                            <div
                              key={antarIndex}
                              className={`
                                flex items-center gap-3 p-2 rounded transition-all
                                ${isAntarCurrent
                                  ? 'bg-cosmic-800/50 border-l-2'
                                  : 'hover:bg-cosmic-800/30'
                                }
                              `}
                              style={{ borderColor: isAntarCurrent ? antar.color : 'transparent' }}
                            >
                              <span
                                className="text-sm"
                                style={{ color: antar.color }}
                              >
                                {antar.symbol}
                              </span>
                              <span className={`text-sm flex-1 ${isAntarCurrent ? 'text-white' : 'text-gray-400'}`}>
                                {antar.planet_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(antar.start_date)}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                {formatDuration(antar.duration_years)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-cosmic-700">
          <p className="text-xs text-gray-500 mb-2">Planetary Lords</p>
          <div className="flex flex-wrap gap-2">
            {[
              { symbol: '☉', name: 'Sun', color: '#FFD700' },
              { symbol: '☽', name: 'Moon', color: '#C0C0C0' },
              { symbol: '♂', name: 'Mars', color: '#DC143C' },
              { symbol: '☿', name: 'Mercury', color: '#228B22' },
              { symbol: '♃', name: 'Jupiter', color: '#FFD700' },
              { symbol: '♀', name: 'Venus', color: '#FF69B4' },
              { symbol: '♄', name: 'Saturn', color: '#4169E1' },
              { symbol: '☊', name: 'Rahu', color: '#4B0082' },
              { symbol: '☋', name: 'Ketu', color: '#8B4513' },
            ].map(({ symbol, name, color }) => (
              <span
                key={name}
                className="text-sm px-2 py-1 rounded bg-cosmic-800/50"
                title={name}
              >
                <span style={{ color }}>{symbol}</span>
                <span className="text-gray-400 ml-1">{name}</span>
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DashaTimeline
