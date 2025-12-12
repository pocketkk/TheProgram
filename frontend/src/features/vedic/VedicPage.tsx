/**
 * Vedic Page
 *
 * Main page for Vedic chart visualization with traditional square chart formats.
 * Supports both North Indian (diamond) and South Indian (grid) chart styles.
 */
import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useVedicStore } from './stores/vedicStore'
import { VedicSquareChart } from './components/VedicSquareChart'
import { VedicPlanetBadge } from './components/VedicPlanetBadge'
import { YogasPanel } from './components/YogasPanel'
import { AshtakavargaPanel } from './components/AshtakavargaPanel'
import { DashaTimeline } from '@/features/birthchart/components/DashaTimeline'
import { useDasha } from '@/features/birthchart/hooks/useDasha'
import { useYogas } from './hooks/useYogas'
import { useAshtakavarga } from './hooks/useAshtakavarga'
import { listBirthData } from '@/lib/api/birthData'
import {
  CLASSICAL_PLANETS,
  VEDIC_SIGNS,
  getSignFromLongitude,
  getHouseForSign,
} from './utils/vedicConstants'
import type { VedicPlanetPosition, PlanetaryDignity, AyanamsaSystem } from './types'

interface VedicPageProps {
  birthDataId?: string | null
}

export const VedicPage: React.FC<VedicPageProps> = ({ birthDataId: propBirthDataId }) => {
  // Auto-select first birth data if none provided
  const [birthDataId, setBirthDataId] = useState<string | null>(propBirthDataId || null)
  const [loadingBirthData, setLoadingBirthData] = useState(!propBirthDataId)
  const [rightPanelTab, setRightPanelTab] = useState<'planets' | 'houses' | 'dasha' | 'yogas' | 'ashtakavarga'>('planets')

  // Fetch first birth data if not provided
  useEffect(() => {
    if (propBirthDataId) {
      setBirthDataId(propBirthDataId)
      setLoadingBirthData(false)
      return
    }

    const fetchBirthData = async () => {
      try {
        const data = await listBirthData()
        if (data.length > 0) {
          setBirthDataId(data[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch birth data:', error)
      } finally {
        setLoadingBirthData(false)
      }
    }

    fetchBirthData()
  }, [propBirthDataId])

  const {
    chart,
    isLoading,
    error,
    chartStyle,
    activeDivisional,
    selectedHouse,
    selectedPlanet,
    hoveredHouse,
    hoveredPlanet,
    ayanamsa,
    houseSystem,
    calculateChart,
    setChartStyle,
    setActiveDivisional,
    setSelectedHouse,
    setSelectedPlanet,
    setHoveredHouse,
    setHoveredPlanet,
    setAyanamsa,
    setHouseSystem,
  } = useVedicStore()

  // Dasha data
  const {
    dashaData,
    isLoading: isDashaLoading,
    fetchDashaForBirthData,
  } = useDasha()

  // Yogas data
  const {
    yogasData,
    isLoading: isYogasLoading,
    fetchYogasForBirthData,
  } = useYogas()

  // Ashtakavarga data
  const {
    ashtakavargaData,
    isLoading: isAshtakavargaLoading,
    fetchAshtakavargaForBirthData,
  } = useAshtakavarga()

  // Calculate chart when birthDataId or settings change
  useEffect(() => {
    if (birthDataId) {
      calculateChart(birthDataId)
    }
  }, [birthDataId, ayanamsa, houseSystem, calculateChart])

  // Fetch dasha when birthDataId changes
  useEffect(() => {
    if (birthDataId) {
      fetchDashaForBirthData(birthDataId, { ayanamsa })
    }
  }, [birthDataId, ayanamsa, fetchDashaForBirthData])

  // Fetch yogas when birthDataId changes
  useEffect(() => {
    if (birthDataId) {
      fetchYogasForBirthData(birthDataId, { ayanamsa })
    }
  }, [birthDataId, ayanamsa, fetchYogasForBirthData])

  // Fetch ashtakavarga when birthDataId changes
  useEffect(() => {
    if (birthDataId) {
      fetchAshtakavargaForBirthData(birthDataId, { ayanamsa })
    }
  }, [birthDataId, ayanamsa, fetchAshtakavargaForBirthData])

  // Recalculate handler for controls
  const handleRecalculate = useCallback(() => {
    if (birthDataId) {
      calculateChart(birthDataId)
    }
  }, [birthDataId, calculateChart])

  // Get chart data for current divisional
  const getChartData = () => {
    if (!chart?.chart_data) return null

    if (activeDivisional === 'd1') {
      return chart.chart_data.d1 || chart.chart_data
    } else if (activeDivisional === 'd9') {
      return chart.chart_data.divisional_charts?.d9 || null
    }
    return null
  }

  const chartData = getChartData()

  // Loading birth data
  if (loadingBirthData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-celestial-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading birth data...</p>
        </div>
      </div>
    )
  }

  // No birth data available
  if (!birthDataId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-celestial-gold/10 flex items-center justify-center">
            <span className="text-3xl">🕉️</span>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Vedic Chart</h2>
          <p className="text-gray-400 mb-4">
            No birth data available. Please create a birth chart first to view
            your Vedic chart.
          </p>
          <p className="text-sm text-gray-500">
            Go to Dashboard to create your first birth chart.
          </p>
        </div>
      </div>
    )
  }

  // Loading chart
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-celestial-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Calculating Vedic chart...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Error</h2>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  // No chart data
  if (!chartData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center p-8">
          <p className="text-gray-400">No chart data available</p>
        </div>
      </div>
    )
  }

  // Extract data
  const rawPlanets = chartData.planets || {}
  const ascendant = chartData.houses?.ascendant || 0
  const dignities = chartData.dignities || {}
  const nakshatras = chartData.nakshatras || {}
  const hasD9 = !!chart?.chart_data?.divisional_charts?.d9
  const ascendantSign = getSignFromLongitude(ascendant)

  // Map backend planet names to Vedic names and calculate Ketu
  const planets: Record<string, VedicPlanetPosition> = {}
  for (const [name, planetData] of Object.entries(rawPlanets)) {
    if (!planetData) continue
    const planet = planetData as VedicPlanetPosition
    if (!planet.sign && planet.sign !== 0) continue

    // Map north_node to rahu
    if (name === 'north_node') {
      planets['rahu'] = planet
      // Calculate ketu (180 degrees opposite)
      const ketuLongitude = (planet.longitude + 180) % 360
      const ketuSign = Math.floor(ketuLongitude / 30)
      planets['ketu'] = {
        ...planet,
        longitude: ketuLongitude,
        sign: ketuSign,
        degreeInSign: ketuLongitude % 30,
        signName: VEDIC_SIGNS[ketuSign]?.name || '',
      }
    } else if (name === 'south_node') {
      // If backend sends south_node directly, use it as ketu
      planets['ketu'] = planet
    } else {
      planets[name] = planet
    }
  }

  // Add house numbers to planets
  const planetsWithHouses: Record<string, VedicPlanetPosition> = {}
  for (const [name, planetData] of Object.entries(planets)) {
    if (!planetData) continue // Skip null/undefined planet data
    const planet = planetData as VedicPlanetPosition
    if (!planet.sign && planet.sign !== 0) continue // Skip if no sign data
    planetsWithHouses[name] = {
      ...planet,
      house: planet.house || getHouseForSign(planet.sign, ascendantSign),
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-cosmic-dark h-full overflow-hidden">
      {/* Top Menu Bar - All Controls */}
      <motion.div
        className="shrink-0 flex items-center gap-6 px-4 py-3 bg-slate-900/80 border-b border-slate-700/50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* Divisional Chart Tabs */}
        <div className="flex gap-1 p-1 bg-slate-800/60 rounded-lg">
          <button
            onClick={() => setActiveDivisional('d1')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeDivisional === 'd1'
                ? 'bg-cosmic-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            D-1 Rasi
          </button>
          <button
            onClick={() => setActiveDivisional('d9')}
            disabled={!hasD9}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeDivisional === 'd9'
                ? 'bg-cosmic-600 text-white'
                : 'text-slate-400 hover:text-white'
            } ${!hasD9 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            D-9 Navamsa
          </button>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        {/* Chart Style Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Style:</span>
          <div className="flex gap-1 p-1 bg-slate-800/60 rounded-lg">
            <button
              onClick={() => setChartStyle('south')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                chartStyle === 'south'
                  ? 'bg-cosmic-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              South
            </button>
            <button
              onClick={() => setChartStyle('north')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                chartStyle === 'north'
                  ? 'bg-cosmic-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              North
            </button>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        {/* Ayanamsa Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Ayanamsa:</span>
          <select
            value={ayanamsa}
            onChange={(e) => { setAyanamsa(e.target.value as AyanamsaSystem); handleRecalculate(); }}
            className="bg-slate-800 text-white text-xs rounded px-2 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cosmic-500"
          >
            <option value="lahiri">Lahiri</option>
            <option value="raman">Raman</option>
            <option value="krishnamurti">KP</option>
            <option value="fagan_bradley">Fagan-Bradley</option>
          </select>
        </div>

        {/* House System Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Houses:</span>
          <select
            value={houseSystem}
            onChange={(e) => { setHouseSystem(e.target.value); handleRecalculate(); }}
            className="bg-slate-800 text-white text-xs rounded px-2 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cosmic-500"
          >
            <option value="whole_sign">Whole Sign</option>
            <option value="equal">Equal</option>
            <option value="placidus">Placidus</option>
          </select>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chart Area - 55% width */}
        <motion.div
          className="flex-[55] flex items-start justify-center pt-2 min-w-0 min-h-0 overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <VedicSquareChart
            planets={planetsWithHouses}
            ascendant={ascendant}
            dignities={dignities}
            chartStyle={chartStyle}
            size="100%"
            selectedHouse={selectedHouse}
            selectedPlanet={selectedPlanet}
            hoveredHouse={hoveredHouse}
            hoveredPlanet={hoveredPlanet}
            onHouseClick={setSelectedHouse}
            onPlanetClick={setSelectedPlanet}
            onHouseHover={setHoveredHouse}
            onPlanetHover={setHoveredPlanet}
          />
        </motion.div>

        {/* Right Panel - 45% width */}
        <motion.div
          className="flex-[45] flex flex-col min-h-0 border-l border-slate-700/50 bg-slate-900/30"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          {/* Tab Buttons */}
          <div className="flex flex-wrap gap-1 p-2 bg-slate-800/40 shrink-0">
            {[
              { id: 'planets', label: 'Planets' },
              { id: 'houses', label: 'Houses' },
              { id: 'yogas', label: 'Yogas' },
              { id: 'ashtakavarga', label: 'SAV' },
              { id: 'dasha', label: 'Dasha' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightPanelTab(tab.id as typeof rightPanelTab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  rightPanelTab === tab.id
                    ? 'bg-cosmic-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {rightPanelTab === 'planets' && (
              // Planets list
              CLASSICAL_PLANETS.filter(name => planetsWithHouses[name]).map((name) => {
                const planet = planetsWithHouses[name]
                if (!planet) return null
                return (
                  <VedicPlanetBadge
                    key={name}
                    planetName={name}
                    planet={planet}
                    dignity={dignities[name] as PlanetaryDignity}
                    nakshatra={nakshatras[name]}
                    isSelected={selectedPlanet === name}
                    isHovered={hoveredPlanet === name}
                    onClick={() => setSelectedPlanet(selectedPlanet === name ? null : name)}
                    onMouseEnter={() => setHoveredPlanet(name)}
                    onMouseLeave={() => setHoveredPlanet(null)}
                  />
                )
              })
            )}

            {rightPanelTab === 'houses' && (
              // Houses grid
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((house) => {
                  const signIndex = (ascendantSign + house - 1) % 12
                  const housePlanets = CLASSICAL_PLANETS.filter(
                    name => planetsWithHouses[name] && planetsWithHouses[name].house === house
                  )
                  const isSelected = selectedHouse === house
                  const isHovered = hoveredHouse === house

                  return (
                    <div
                      key={house}
                      onClick={() => setSelectedHouse(isSelected ? null : house)}
                      onMouseEnter={() => setHoveredHouse(house)}
                      onMouseLeave={() => setHoveredHouse(null)}
                      className={`
                        p-3 rounded-lg cursor-pointer text-sm transition-colors
                        ${isSelected ? 'bg-amber-500/20 ring-1 ring-amber-500' : 'bg-slate-800/60'}
                        ${isHovered && !isSelected ? 'bg-slate-700/60' : ''}
                        ${house === 1 ? 'ring-1 ring-amber-500/30' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">House {house}</span>
                        {house === 1 && <span className="text-amber-400 text-xs">ASC</span>}
                      </div>
                      <div className="text-slate-400 text-xs mb-2">
                        {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][signIndex]}
                      </div>
                      {housePlanets.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {housePlanets.map(name => (
                            <span
                              key={name}
                              className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300"
                            >
                              {name.charAt(0).toUpperCase() + name.slice(1)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">Empty</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {rightPanelTab === 'yogas' && (
              <YogasPanel yogasData={yogasData} isLoading={isYogasLoading} />
            )}

            {rightPanelTab === 'ashtakavarga' && (
              <AshtakavargaPanel data={ashtakavargaData} isLoading={isAshtakavargaLoading} />
            )}

            {rightPanelTab === 'dasha' && (
              // Dasha timeline
              dashaData ? (
                <DashaTimeline dashaData={dashaData} isLoading={isDashaLoading} />
              ) : (
                <div className="text-center text-slate-500 py-8">
                  <p>Loading Dasha data...</p>
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
