/**
 * Transit Dashboard - Real-time transit analysis
 *
 * Part of Phase 3: Advanced Transit Analysis
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Calendar,
  Moon,
  Sun,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Clock,
  Star,
  Sparkles,
  X,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@/components/ui'
import { useTransitStore } from '@/store/transitStore'
import { listBirthData, type BirthDataResponse } from '@/lib/api/birthData'
import {
  getSignificanceColor,
  getAspectSymbol,
  getPlanetSymbol,
  getPlanetDisplayName,
  formatTransit,
  formatTransitFull,
  getThemeDescription
} from '@/lib/api/transits'

// Moon phase icons
const moonPhaseIcons: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

export function TransitDashboard() {
  const {
    currentTransits,
    upcomingTransits,
    dailySnapshot,
    selectedTransit,
    selectedInterpretation,
    currentBirthDataId,
    zodiac,
    daysAhead,
    transitDate,
    isLoading,
    error,
    lastUpdated,
    setBirthDataId,
    setZodiac,
    setDaysAhead,
    setTransitDate,
    fetchCurrentTransits,
    fetchUpcomingTransits,
    fetchDailySnapshot,
    selectTransit,
    clearSelectedTransit,
    refreshAll,
    clearError,
  } = useTransitStore()

  const [birthDataList, setBirthDataList] = useState<BirthDataResponse[]>([])

  // Load birth data on mount
  useEffect(() => {
    const loadBirthData = async () => {
      try {
        const data = await listBirthData()
        setBirthDataList(data)
        if (data.length > 0 && !currentBirthDataId) {
          setBirthDataId(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load birth data:', err)
      }
    }
    loadBirthData()
  }, [currentBirthDataId, setBirthDataId])

  // Fetch transits when birth data or date changes
  useEffect(() => {
    if (currentBirthDataId) {
      refreshAll()
    }
  }, [currentBirthDataId, zodiac, transitDate])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentBirthDataId) {
        fetchCurrentTransits()
        fetchDailySnapshot()
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentBirthDataId, fetchCurrentTransits, fetchDailySnapshot])

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gradient-celestial flex items-center gap-3">
              <Activity className="h-8 w-8 text-celestial-gold" />
              Transit Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Real-time planetary transits to your natal chart
            </p>
            {/* Prominent transit date display */}
            <div className="mt-3 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-celestial-gold" />
              <span className="text-lg font-medium text-white">
                {transitDate
                  ? new Date(transitDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Right Now'
                }
              </span>
              {transitDate && (
                <button
                  onClick={() => setTransitDate(null)}
                  className="text-xs text-celestial-gold hover:text-celestial-gold/80 underline"
                >
                  Reset to Now
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Transit date picker */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={transitDate || new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const today = new Date().toISOString().split('T')[0]
                  setTransitDate(e.target.value === today ? null : e.target.value)
                }}
                className="px-3 py-2 bg-cosmic-900 border border-cosmic-light/20 rounded-lg
                         text-white focus:outline-none focus:border-celestial-gold/50
                         [color-scheme:dark]"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTransitDate(null)}
                className={transitDate === null ? 'bg-celestial-gold/20 text-celestial-gold' : ''}
              >
                Today
              </Button>
            </div>

            {/* Birth data selector */}
            <select
              value={currentBirthDataId || ''}
              onChange={e => setBirthDataId(e.target.value)}
              className="px-4 py-2 bg-cosmic-900 border border-cosmic-light/20 rounded-lg
                       text-white focus:outline-none focus:border-celestial-gold/50
                       [&>option]:bg-cosmic-900 [&>option]:text-white"
            >
              <option value="">Select chart...</option>
              {birthDataList.map(bd => (
                <option key={bd.id} value={bd.id}>
                  {bd.city || 'Unknown'} - {bd.birth_date}
                </option>
              ))}
            </select>

            {/* Zodiac toggle */}
            <div className="flex items-center gap-2 bg-cosmic-dark/50 rounded-lg p-1">
              <button
                onClick={() => setZodiac('tropical')}
                className={`px-3 py-1 rounded text-sm transition-colors
                          ${zodiac === 'tropical'
                            ? 'bg-celestial-gold/20 text-celestial-gold'
                            : 'text-gray-400 hover:text-white'
                          }`}
              >
                Tropical
              </button>
              <button
                onClick={() => setZodiac('sidereal')}
                className={`px-3 py-1 rounded text-sm transition-colors
                          ${zodiac === 'sidereal'
                            ? 'bg-celestial-gold/20 text-celestial-gold'
                            : 'text-gray-400 hover:text-white'
                          }`}
              >
                Sidereal
              </button>
            </div>

            {/* Refresh button */}
            <Button
              variant="ghost"
              onClick={() => refreshAll()}
              disabled={isLoading || !currentBirthDataId}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </motion.div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between"
        >
          <span className="text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {!currentBirthDataId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-16 w-16 mx-auto text-gray-600 mb-6" />
            <h3 className="text-xl font-heading text-white mb-2">Select a Chart</h3>
            <p className="text-gray-500">
              Choose a birth chart to see current transits
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Daily Snapshot */}
          <div className="lg:col-span-1 space-y-6">
            {/* Moon Phase Card */}
            {dailySnapshot && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Moon className="h-5 w-5 text-celestial-purple" />
                      Today's Sky
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <span className="text-4xl">{moonPhaseIcons[dailySnapshot.moon_phase] || '🌙'}</span>
                        <p className="text-sm text-gray-400 mt-1">{dailySnapshot.moon_phase}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400 flex items-center gap-1 justify-end">
                          <span className="text-lg text-celestial-purple">{getPlanetSymbol('Moon')}</span>
                          Moon in
                        </p>
                        <p className="text-lg font-medium text-white">{dailySnapshot.moon_sign}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-lg text-celestial-gold">{getPlanetSymbol('Sun')}</span>
                      Sun in {dailySnapshot.sun_sign}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Themes Card */}
            {currentTransits?.summary?.themes && currentTransits.summary.themes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-celestial-gold" />
                      Current Themes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentTransits.summary.themes.map((theme, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-celestial-gold" />
                          <div>
                            <p className="text-white capitalize">{theme}</p>
                            <p className="text-xs text-gray-500">{getThemeDescription(theme)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Summary Stats */}
            {currentTransits?.summary && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Transit Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-celestial-pink/10 rounded-lg">
                        <p className="text-2xl font-bold text-celestial-pink">
                          {currentTransits.summary.major_count}
                        </p>
                        <p className="text-xs text-gray-400">Major</p>
                      </div>
                      <div className="text-center p-3 bg-celestial-gold/10 rounded-lg">
                        <p className="text-2xl font-bold text-celestial-gold">
                          {currentTransits.summary.significant_count}
                        </p>
                        <p className="text-xs text-gray-400">Significant</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500 text-center">
                      {currentTransits.summary.total_transits} total active transits
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Middle Column - Active Transits */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-celestial-gold" />
                      Active Transits
                    </span>
                    <Badge>{currentTransits?.transits?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {isLoading && !currentTransits ? (
                      <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : currentTransits?.transits?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No significant transits
                      </div>
                    ) : (
                      <AnimatePresence>
                        {currentTransits?.transits?.slice(0, 15).map((transit, i) => (
                          <motion.button
                            key={`${transit.transit_planet}-${transit.natal_planet}-${transit.aspect}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => selectTransit(transit)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors
                                      ${selectedTransit === transit
                                        ? 'border-celestial-gold bg-celestial-gold/10'
                                        : 'border-cosmic-light/10 hover:border-celestial-gold/30'
                                      }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {/* Planet symbols display */}
                                <div className="flex items-center gap-1 text-lg font-serif" title={formatTransitFull(transit)}>
                                  <span className="text-celestial-gold">{getPlanetSymbol(transit.transit_planet)}</span>
                                  {transit.transit_retrograde && <span className="text-celestial-pink text-sm">℞</span>}
                                  <span className={getSignificanceColor(transit.significance)}>{getAspectSymbol(transit.aspect)}</span>
                                  <span className="text-celestial-purple">{getPlanetSymbol(transit.natal_planet)}</span>
                                </div>
                                <div>
                                  <p className="text-sm text-white">
                                    {getPlanetDisplayName(transit.transit_planet)}{' '}
                                    <span className="text-gray-500">{transit.aspect}</span>{' '}
                                    {getPlanetDisplayName(transit.natal_planet)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {transit.orb.toFixed(1)}° {transit.is_applying ? 'applying' : 'separating'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className={getSignificanceColor(transit.significance)}>
                                {transit.significance}
                              </Badge>
                            </div>
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Upcoming & Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Selected Transit Detail */}
            <AnimatePresence>
              {selectedTransit && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="border-celestial-gold/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Transit Detail</CardTitle>
                        <button
                          onClick={clearSelectedTransit}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <p className="text-2xl font-medium text-white">
                            {formatTransit(selectedTransit)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Transit Planet</p>
                            <p className="text-white">
                              {selectedTransit.transit_planet} in {selectedTransit.transit_sign}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedTransit.transit_degree.toFixed(1)}°
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Natal Planet</p>
                            <p className="text-white">
                              {selectedTransit.natal_planet} in {selectedTransit.natal_sign}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedTransit.natal_degree.toFixed(1)}°
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-cosmic-dark/30 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Duration Estimate</p>
                          <p className="text-white">{selectedTransit.estimated_duration}</p>
                        </div>

                        {selectedInterpretation && (
                          <div className="p-4 bg-celestial-gold/10 rounded-lg border border-celestial-gold/20">
                            <p className="text-celestial-gold font-medium mb-2">
                              {selectedInterpretation.theme}
                            </p>
                            <p className="text-sm text-gray-300 mb-3">
                              {selectedInterpretation.description}
                            </p>
                            <p className="text-xs text-gray-400">
                              <span className="text-celestial-gold">Advice:</span>{' '}
                              {selectedInterpretation.advice}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upcoming Transits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-celestial-purple" />
                      Upcoming
                    </span>
                    <select
                      value={daysAhead}
                      onChange={e => {
                        setDaysAhead(Number(e.target.value))
                        fetchUpcomingTransits(undefined, Number(e.target.value))
                      }}
                      className="text-xs bg-cosmic-900 border border-cosmic-light/20 rounded
                               px-2 py-1 text-white [&>option]:bg-cosmic-900 [&>option]:text-white"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {upcomingTransits.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No major transits upcoming
                      </p>
                    ) : (
                      upcomingTransits.slice(0, 10).map((transit, i) => (
                        <div
                          key={i}
                          className="p-3 bg-cosmic-dark/30 rounded-lg flex items-center justify-between"
                          title={formatTransitFull(transit)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {/* Planet symbols */}
                              <div className="flex items-center gap-1 text-lg font-serif">
                                <span className="text-celestial-gold">{getPlanetSymbol(transit.transit_planet)}</span>
                                <span className={getSignificanceColor(transit.significance)}>{getAspectSymbol(transit.aspect)}</span>
                                <span className="text-celestial-purple">{getPlanetSymbol(transit.natal_planet)}</span>
                              </div>
                              <p className="text-sm text-white">
                                {getPlanetDisplayName(transit.natal_planet)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(transit.first_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={getSignificanceColor(transit.significance)}
                          >
                            {transit.significance}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransitDashboard
