/**
 * Interactive Birth Chart Page
 * Comprehensive astrological birth chart with planets, houses, and aspects
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Calendar, MapPin, Clock, Eye, EyeOff, Sparkles, Download, Filter, Edit, Hexagon } from 'lucide-react'
import { calculateBirthChart, assignHousesToPlanets, calculateHouses } from '@/lib/astrology/calculator'
import { calculateTransitChart } from '@/lib/astrology/chartTypes/transitCalculator'
import { calculateProgressedChart, getProgressedAge } from '@/lib/astrology/chartTypes/progressedCalculator'
import { detectPatterns } from '@/lib/astrology/patterns'
import { BirthChartWheel } from './components/BirthChartWheel'
import { PlanetInfo } from './components/PlanetInfo'
import { HouseInfo } from './components/HouseInfo'
import { ElementBalanceChart } from './components/ElementBalanceChart'
import { ModalityChart } from './components/ModalityChart'
import { AspectGroup } from './components/AspectGroup'
import { ChartTypeSelector } from './components/ChartTypeSelector'
import { PatternDisplay } from './components/patterns/PatternDisplay'
import { BirthDataEditor } from './components/BirthDataEditor'
import { ExportDialog } from './components/ExportDialog'
import { GenerateInterpretationsButton } from './components/GenerateInterpretationsButton'
import { PeopleSidebar } from './components/PeopleSidebar'
import { AddPersonModal } from './components/AddPersonModal'
import { GuestChartBanner } from './components/GuestChartBanner'
import { ChartGlowEffect } from './components/ChartGlowEffect'
import { NotesPanel } from './components/NotesPanel'
import type { ExportSettings } from './components/ExportDialog'
import { Button } from '@/components/ui'
import { exportChartAsPNG, downloadBlob, generateFilename } from './utils/export'
import { exportChartAsPDF } from './utils/exportPDF'
import { useChartStore } from './stores/chartStore'
import { usePeopleStore } from './stores/peopleStore'
import type { BirthData } from '@/lib/astrology/types'
import type { ChartType } from './stores/chartStore'
import { PLANETS } from '@/lib/astrology/types'
import { pageVariants, tabContentVariants } from './animations'
import { useResponsive, useIsMobile } from './utils/responsive'
import { InterpretationsProvider } from './contexts/InterpretationsContext'
import { getChart, calculateChart, getOrCreateChart, type ChartResponse } from '@/lib/api/charts'
import { generateChartInterpretations } from '@/lib/api/interpretations'
import type { GenerateInterpretationRequest } from '@/types/interpretation'
import { createBirthData } from '@/lib/api/birthData'
import { getPersonColor } from './constants/personColors'

// Default birth data
const DEFAULT_BIRTH_DATA: BirthData = {
  date: new Date('1974-09-16T07:14:00-07:00'), // September 16, 1974, 7:14 AM PDT
  latitude: 44.0521, // Eugene, Oregon
  longitude: -123.0868,
}

const DEFAULT_LOCATION_NAME = 'Eugene, Oregon'

export interface BirthChartPageProps {
  /**
   * Optional chart ID to load from database
   * If provided, chart will be loaded from the database instead of calculating client-side
   */
  chartId?: string | null
}

export function BirthChartPage({ chartId: chartIdProp }: BirthChartPageProps = {}) {
  // Get chart ID from prop or localStorage
  const [chartId] = useState<string | undefined>(() => {
    if (chartIdProp) {
      console.log('[BirthChartPage] Using chartId from prop:', chartIdProp)
      return chartIdProp
    }
    try {
      const saved = localStorage.getItem('lastViewedChartId')
      console.log('[BirthChartPage] Loaded chartId from localStorage:', saved)
      return saved || undefined
    } catch (err) {
      console.error('[BirthChartPage] Error loading chart ID from localStorage:', err)
      return undefined
    }
  })

  console.log('[BirthChartPage] Initialized with chartId:', chartId)

  // State for loading saved charts
  const [savedChart, setSavedChart] = useState<ChartResponse | null>(null)
  const [_isLoadingChart, setIsLoadingChart] = useState(false)
  const [_chartLoadError, setChartLoadError] = useState<string | null>(null)

  // State for transit/progressed charts (separate from natal chart)
  const [transitChart, setTransitChart] = useState<ChartResponse | null>(null)
  const [isLoadingTransitChart, setIsLoadingTransitChart] = useState(false)

  // Load birth data from localStorage or use default
  const [birthData, setBirthData] = useState<BirthData>(() => {
    try {
      const saved = localStorage.getItem('birthData')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert date string back to Date object
        return {
          ...parsed,
          date: new Date(parsed.date),
        }
      }
    } catch (err) {
      console.error('Error loading birth data from localStorage:', err)
    }
    return DEFAULT_BIRTH_DATA
  })

  const [locationName, setLocationName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('birthLocationName')
      if (saved) return saved
    } catch (err) {
      console.error('Error loading location name from localStorage:', err)
    }
    return DEFAULT_LOCATION_NAME
  })

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [showAspects, setShowAspects] = useState(true)
  const [showHouseNumbers, setShowHouseNumbers] = useState(true)
  const [activeTab, setActiveTab] = useState<'planets' | 'houses' | 'aspects' | 'patterns'>('planets')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('natal')
  const [requestedTransitDate, setRequestedTransitDate] = useState<string | null>(null) // For companion-requested transit dates
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false)

  // People store for managing multiple charts
  const {
    people,
    selectedPersonId,
    loadPeople,
    selectPerson,
    getSelectedPerson,
    isViewingPrimary,
    getPrimaryPerson,
  } = usePeopleStore()

  // Get current person being viewed
  const selectedPerson = getSelectedPerson()
  const isGuestChart = !isViewingPrimary()
  const personColor = selectedPerson ? getPersonColor(selectedPerson.color, selectedPerson.relationship_type) : null

  // Debug: Track render count
  const renderCount = useRef(0)
  renderCount.current++
  console.log('[BirthChartPage] RENDER #', renderCount.current, '- chartType:', chartType, 'requestedTransitDate:', requestedTransitDate)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingInterpretations, setIsGeneratingInterpretations] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const chartWheelRef = useRef<HTMLDivElement>(null)
  const responsiveConfig = useResponsive()
  const isMobile = useIsMobile()

  // Save birth data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('birthData', JSON.stringify(birthData))
    } catch (err) {
      console.error('Error saving birth data to localStorage:', err)
    }
  }, [birthData])

  // Save location name to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('birthLocationName', locationName)
    } catch (err) {
      console.error('Error saving location name to localStorage:', err)
    }
  }, [locationName])

  // Load people list on mount
  useEffect(() => {
    loadPeople()
  }, [loadPeople])

  // Load chart when selected person changes
  useEffect(() => {
    const loadSelectedPersonChart = async () => {
      if (!selectedPerson) return

      // Update birth data from selected person
      if (selectedPerson.birth_date) {
        const birthDate = new Date(selectedPerson.birth_date)
        // Add birth time if available
        if (selectedPerson.birth_time) {
          const [hours, minutes, seconds] = selectedPerson.birth_time.split(':').map(Number)
          birthDate.setHours(hours || 0, minutes || 0, seconds || 0)
        }

        setBirthData({
          date: birthDate,
          latitude: Number(selectedPerson.latitude),
          longitude: Number(selectedPerson.longitude),
        })

        // Update location name
        const locationParts = [
          selectedPerson.city,
          selectedPerson.state_province,
          selectedPerson.country,
        ].filter(Boolean)
        setLocationName(locationParts.join(', ') || 'Unknown Location')
      }

      // Try to load existing chart for this person
      setIsLoadingChart(true)
      try {
        // Use getOrCreateChart to either find existing or create new natal chart
        const chart = await getOrCreateChart({
          birth_data_id: selectedPerson.id,
          chart_type: 'natal',
          astro_system: zodiacSystem === 'vedic' ? 'vedic' : 'western',
          house_system: houseSystem,
          zodiac_type: zodiacSystem === 'vedic' ? 'sidereal' : 'tropical',
          ayanamsa: zodiacSystem === 'vedic' ? ayanamsa : undefined,
        })
        setSavedChart(chart)
      } catch (error) {
        console.error('[BirthChartPage] Error loading chart for selected person:', error)
        setSavedChart(null)
      } finally {
        setIsLoadingChart(false)
      }
    }

    loadSelectedPersonChart()
  }, [selectedPersonId, selectedPerson?.id])

  // Save chart ID to localStorage whenever savedChart changes
  useEffect(() => {
    console.log('[BirthChartPage] savedChart changed:', savedChart?.id)
    if (savedChart?.id) {
      try {
        console.log('[BirthChartPage] Saving chartId to localStorage:', savedChart.id)
        localStorage.setItem('lastViewedChartId', savedChart.id)
        console.log('[BirthChartPage] Saved! Verify:', localStorage.getItem('lastViewedChartId'))
      } catch (err) {
        console.error('[BirthChartPage] Error saving chart ID to localStorage:', err)
      }
    } else {
      console.log('[BirthChartPage] savedChart.id is null/undefined, not saving to localStorage')
    }
  }, [savedChart])

  // Load saved chart from database if chart ID is provided
  // OR load most recent chart if no chartId
  useEffect(() => {
    const loadChart = async () => {
      setIsLoadingChart(true)
      setChartLoadError(null)

      try {
        let chart
        if (chartId) {
          console.log('[BirthChartPage] Loading chart by ID:', chartId)
          chart = await getChart(chartId)
        } else {
          // No chartId - check if there are any charts in the database
          console.log('[BirthChartPage] No chartId, checking for existing charts...')
          // For now, just skip loading - we'll add a "load recent chart" feature later
          setIsLoadingChart(false)
          return
        }
        setSavedChart(chart)
      } catch (error) {
        console.error('Error loading saved chart:', error)
        setChartLoadError(error instanceof Error ? error.message : 'Failed to load chart')
        setSavedChart(null)
        // Clear invalid chart ID from localStorage
        if (chartId) {
          console.log('[BirthChartPage] Clearing invalid chart ID from localStorage:', chartId)
          try {
            localStorage.removeItem('lastViewedChartId')
          } catch (err) {
            console.error('[BirthChartPage] Error clearing localStorage:', err)
          }
        }
      } finally {
        setIsLoadingChart(false)
      }
    }

    loadChart()
  }, [chartId])

  // Handle birth data update
  const handleSaveBirthData = (newData: BirthData, newLocationName: string) => {
    setBirthData(newData)
    setLocationName(newLocationName)
  }

  // Get filter state from store
  const {
    visibility,
    setAspectVisibility,
    setMaxOrb,
    zodiacSystem,
    ayanamsa,
    houseSystem,
    includeNakshatras,
    includeWesternAspects,
    includeMinorAspects,
    addChart,
    setActiveChart: setStoreActiveChart
  } = useChartStore()

  // Load or create transit chart when chart type changes to transit
  // This enables server-side transit calculations with proper chart_id for interpretations
  useEffect(() => {
    // Create AbortController for this effect to prevent race conditions
    const controller = new AbortController()

    console.log('[BirthChartPage] Transit chart useEffect running - chartType:', chartType, 'birthDataId:', savedChart?.birth_data_id, 'requestedTransitDate:', requestedTransitDate)

    const loadTransitChart = async () => {
      // Only handle transit type for now; skip if no birth data source
      if (chartType !== 'transit') {
        console.log('[BirthChartPage] Not transit chart type, clearing transitChart state')
        setTransitChart(null)
        return
      }

      // Need birth_data_id to create transit chart
      // Get it from savedChart if available
      const birthDataId = savedChart?.birth_data_id
      if (!birthDataId) {
        console.log('[BirthChartPage] Cannot load transit chart - no birth_data_id available, savedChart:', savedChart ? 'exists' : 'null')
        return
      }

      setIsLoadingTransitChart(true)
      try {
        // Use get-or-create to either find existing transit chart or create new one
        const currentAstroSystem = zodiacSystem === 'vedic' ? 'vedic' : 'western'
        console.log('[BirthChartPage] Loading transit chart for date:', requestedTransitDate || 'current')
        const transitChartResult = await getOrCreateChart({
          birth_data_id: birthDataId,
          chart_type: 'transit',
          astro_system: currentAstroSystem,
          house_system: houseSystem,
          zodiac_type: zodiacSystem === 'vedic' ? 'sidereal' : 'tropical',
          ayanamsa: zodiacSystem === 'vedic' ? ayanamsa : undefined,
          // Use requested transit date if specified, otherwise backend defaults to current UTC time
          transit_date: requestedTransitDate || undefined,
        }, controller.signal)

        // Check if aborted before updating state
        if (controller.signal.aborted) {
          console.log('[BirthChartPage] Transit chart load aborted, not updating state')
          return
        }

        console.log('[BirthChartPage] Transit chart loaded/created:', transitChartResult.id)
        setTransitChart(transitChartResult)
      } catch (error) {
        // Ignore abort errors - they're expected when switching chart types rapidly
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[BirthChartPage] Transit chart load aborted (expected during chart type switch)')
          return
        }
        if (controller.signal.aborted) {
          console.log('[BirthChartPage] Transit chart request was aborted, ignoring error')
          return
        }
        console.error('[BirthChartPage] Error loading transit chart:', error)
        setTransitChart(null)
      } finally {
        // Only update loading state if not aborted
        if (!controller.signal.aborted) {
          setIsLoadingTransitChart(false)
        }
      }
    }

    loadTransitChart()

    // Cleanup: abort any pending request when dependencies change or component unmounts
    return () => {
      console.log('[BirthChartPage] Cleanup: aborting pending transit chart request')
      controller.abort()
    }
  }, [chartType, savedChart?.birth_data_id, zodiacSystem, houseSystem, ayanamsa, requestedTransitDate])

  /**
   * Convert frontend chart format to database format
   * Frontend has planets as array [{name: 'Sun', ...}, {name: 'Moon', ...}]
   * Database expects object {sun: {...}, moon: {...}}
   */
  const _convertChartToDbFormat = (frontendChart: any): any => {
    // Map frontend planet names to database keys
    const planetNameToKey: Record<string, string> = {
      'Sun': 'sun',
      'Moon': 'moon',
      'Mercury': 'mercury',
      'Venus': 'venus',
      'Mars': 'mars',
      'Jupiter': 'jupiter',
      'Saturn': 'saturn',
      'Uranus': 'uranus',
      'Neptune': 'neptune',
      'Pluto': 'pluto',
      'Chiron': 'chiron',
      'Lilith': 'lilith_mean',
      'North Node': 'true_node',
      'South Node': 'south_node',
    }

    // Convert planets array to object
    const planetsObj: Record<string, any> = {}
    if (Array.isArray(frontendChart.planets)) {
      frontendChart.planets.forEach((planet: any) => {
        const key = planetNameToKey[planet.name] || planet.name.toLowerCase()
        planetsObj[key] = {
          longitude: planet.longitude,
          latitude: planet.latitude || 0,
          distance: planet.distance || 0,
          speed_longitude: planet.speed || 0,
          retrograde: planet.isRetrograde || false,
          sign_name: planet.sign,
          degree_in_sign: planet.degree + (planet.minute || 0) / 60,
          house: planet.house,
        }
      })
    }

    // Keep houses as array of objects (AI interpreter needs this format)
    const housesArray = Array.isArray(frontendChart.houses)
      ? frontendChart.houses.map((house: any) => ({
          number: house.number,
          sign: house.sign,
          cusp: house.cusp,
          degree: house.degree,
          minute: house.minute,
        }))
      : []

    // Also create houses metadata for chart calculations
    const housesMetadata: any = {
      cusps: housesArray.map((h: any) => h.cusp),
      ascendant: frontendChart.ascendant,
      mc: frontendChart.midheaven || frontendChart.mc,
      vertex: frontendChart.vertex || 0,
      armc: frontendChart.armc || 0,
      equatorial_ascendant: frontendChart.equatorialAscendant || 0,
      co_ascendant_koch: frontendChart.coAscendantKoch || 0,
    }

    // Convert aspects array - lowercase planet names and aspect types
    const aspectsArray = Array.isArray(frontendChart.aspects)
      ? frontendChart.aspects.map((aspect: any) => ({
          planet1: (planetNameToKey[aspect.planet1] || aspect.planet1.toLowerCase()).replace(' ', '_'),
          planet2: (planetNameToKey[aspect.planet2] || aspect.planet2.toLowerCase()).replace(' ', '_'),
          aspect_type: aspect.type.toLowerCase(),
          angle: aspect.angle,
          orb: aspect.orb,
          applying: aspect.isApplying || false,
        }))
      : []

    // Build database format chart
    return {
      planets: planetsObj,
      houses: housesArray,  // Array of house objects for AI interpreter
      aspects: aspectsArray,
      patterns: frontendChart.patterns || [],
      houses_metadata: housesMetadata,  // Metadata for chart calculations
      calculation_info: {
        birth_datetime: frontendChart.date?.toISOString() || new Date().toISOString(),
        latitude: frontendChart.latitude,
        longitude: frontendChart.longitude,
        house_system: 'placidus',
        zodiac_type: 'tropical',
      },
    }
  }

  /**
   * Convert database chart format to frontend format
   * Database stores planets as object {sun: {...}, moon: {...}}
   * Frontend expects array [{name: 'Sun', ...}, {name: 'Moon', ...}]
   */
  const convertChartFormat = (dbChart: any): any => {
    if (!dbChart.planets || Array.isArray(dbChart.planets)) {
      // Already in correct format or no planets
      return dbChart
    }

    // Helper to ensure valid numbers (not NaN or undefined)
    const ensureNumber = (val: any, defaultVal: number = 0) => {
      const num = Number(val)
      return isNaN(num) ? defaultVal : num
    }

    // Map database planet keys to frontend names, symbols, and colors
    const planetConfig: Record<string, { name: string; symbol: string; color: string }> = {
      sun: { name: 'Sun', symbol: '☉', color: '#FDB813' },
      moon: { name: 'Moon', symbol: '☽', color: '#C0C0C0' },
      mercury: { name: 'Mercury', symbol: '☿', color: '#8B7355' },
      venus: { name: 'Venus', symbol: '♀', color: '#FFC0CB' },
      mars: { name: 'Mars', symbol: '♂', color: '#DC143C' },
      jupiter: { name: 'Jupiter', symbol: '♃', color: '#DAA520' },
      saturn: { name: 'Saturn', symbol: '♄', color: '#B8860B' },
      uranus: { name: 'Uranus', symbol: '♅', color: '#4FD0E0' },
      neptune: { name: 'Neptune', symbol: '♆', color: '#4169E1' },
      pluto: { name: 'Pluto', symbol: '♇', color: '#8B4513' },
      chiron: { name: 'Chiron', symbol: '⚷', color: '#9370DB' },
      lilith_mean: { name: 'Lilith', symbol: '⚸', color: '#8B008B' },
      true_node: { name: 'North Node', symbol: '☊', color: '#00CED1' },
    }

    // Helper to get element and modality from sign
    const getSignProperties = (signName: string) => {
      const signs: Record<string, { element: string; modality: string }> = {
        Aries: { element: 'Fire', modality: 'Cardinal' },
        Taurus: { element: 'Earth', modality: 'Fixed' },
        Gemini: { element: 'Air', modality: 'Mutable' },
        Cancer: { element: 'Water', modality: 'Cardinal' },
        Leo: { element: 'Fire', modality: 'Fixed' },
        Virgo: { element: 'Earth', modality: 'Mutable' },
        Libra: { element: 'Air', modality: 'Cardinal' },
        Scorpio: { element: 'Water', modality: 'Fixed' },
        Sagittarius: { element: 'Fire', modality: 'Mutable' },
        Capricorn: { element: 'Earth', modality: 'Cardinal' },
        Aquarius: { element: 'Air', modality: 'Fixed' },
        Pisces: { element: 'Water', modality: 'Mutable' },
      }
      return signs[signName] || { element: 'Earth', modality: 'Cardinal' }
    }

    // Convert planets object to array
    const planetsArray = Object.entries(dbChart.planets)
      .filter(([_, planetData]) => planetData !== null) // Filter out null values
      .map(([key, planetData]: [string, any]) => {
        const config = planetConfig[key] || { name: key, symbol: '○', color: '#FFFFFF' }
        const signProps = getSignProperties(planetData.sign_name)
        const degree = planetData.degree_in_sign || 0

        return {
          name: config.name,
          symbol: config.symbol,
          color: config.color,
          longitude: ensureNumber(planetData.longitude, 0),
          latitude: ensureNumber(planetData.latitude, 0),
          distance: ensureNumber(planetData.distance, 0),
          speed: ensureNumber(planetData.speed_longitude, 0),
          isRetrograde: planetData.retrograde || false,
          sign: planetData.sign_name || 'Aries',
          degree: Math.floor(ensureNumber(degree, 0)),
          minute: Math.floor((ensureNumber(degree, 0) % 1) * 60),
          house: ensureNumber(planetData.house, 1),
          element: signProps.element as any,
          modality: signProps.modality as any,
        }
      })

    // Convert houses to frontend format
    let housesArray = dbChart.houses

    // Handle old format: { cusps: [...], ascendant: ..., mc: ... }
    if (dbChart.houses && !Array.isArray(dbChart.houses) && dbChart.houses.cusps) {
      // Database format: { cusps: [113.3, 133.4, ...], ascendant: 94.5, ... }
      // Frontend format: [{ number: 1, cusp: 113.3, sign: 'Cancer', ... }, ...]
      housesArray = dbChart.houses.cusps.slice(0, 12).map((cusp: number, index: number) => {
        const validCusp = ensureNumber(cusp, 0)
        const normalizedCusp = ((validCusp % 360) + 360) % 360
        const signIndex = Math.floor(normalizedCusp / 30)
        const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
        const sign = signNames[signIndex]
        const degreeInSign = normalizedCusp % 30

        return {
          number: index + 1,
          cusp: normalizedCusp,
          sign: sign,
          degree: Math.floor(degreeInSign),
          minute: Math.floor((degreeInSign % 1) * 60),
        }
      })
    }
    // Handle new format: array of house objects (already in correct format)
    else if (Array.isArray(dbChart.houses) && dbChart.houses.length > 0) {
      housesArray = dbChart.houses
    }

    // IMPORTANT: Recalculate houses from birth data to fix timezone/calculation issues
    // The database may have stored houses calculated with incorrect timezone handling
    if (dbChart.calculation_info && dbChart.calculation_info.birth_datetime) {
      const birthDate = new Date(dbChart.calculation_info.birth_datetime)
      const lat = ensureNumber(dbChart.calculation_info.latitude, 0)
      const lon = ensureNumber(dbChart.calculation_info.longitude, 0)

      // Only recalculate if we have valid coordinates
      if (lat !== 0 || lon !== 0) {
        const recalculatedHouses = calculateHouses(birthDate, lat, lon)
        if (recalculatedHouses && recalculatedHouses.length === 12) {
          housesArray = recalculatedHouses
        }
      }
    }

    // Convert aspects - capitalize planet names and fix field names
    let aspectsArray = dbChart.aspects || []
    if (Array.isArray(aspectsArray) && aspectsArray.length > 0 && aspectsArray[0].planet1) {
      // Map aspect types from database to frontend format
      const aspectTypeMap: Record<string, string> = {
        conjunction: 'Conjunction',
        sextile: 'Sextile',
        square: 'Square',
        trine: 'Trine',
        opposition: 'Opposition',
        quincunx: 'Quincunx',
        semisextile: 'Semisextile',
        semisquare: 'Semisquare',
        sesquiquadrate: 'Sesquiquadrate',
      }

      aspectsArray = aspectsArray.map((aspect: any) => {
        const p1 = aspect.planet1 || ''
        const p2 = aspect.planet2 || ''
        const config1 = planetConfig[p1] || { name: p1, symbol: '○', color: '#FFFFFF' }
        const config2 = planetConfig[p2] || { name: p2, symbol: '○', color: '#FFFFFF' }

        const aspectType = aspect.aspect_type || aspect.type || 'conjunction'
        const capitalizedType = aspectTypeMap[aspectType.toLowerCase()] || 'Conjunction'

        return {
          planet1: config1.name,
          planet2: config2.name,
          type: capitalizedType,
          angle: aspect.angle || 0,
          orb: aspect.orb || 0,
          isApplying: aspect.applying !== null ? aspect.applying : false,
        }
      })
    }

    // Preserve important chart metadata
    const chartMetadata: any = {}

    // Use recalculated houses for ascendant and MC (house 1 and house 10 cusps)
    if (Array.isArray(housesArray) && housesArray.length === 12) {
      chartMetadata.ascendant = housesArray[0]?.cusp || 0
      chartMetadata.mc = housesArray[9]?.cusp || 0
      chartMetadata.midheaven = housesArray[9]?.cusp || 0
    } else {
      // Fall back to old metadata if houses aren't available
      const metadata = dbChart.houses_metadata ||
        (dbChart.houses && typeof dbChart.houses === 'object' && !Array.isArray(dbChart.houses) ? dbChart.houses : null)

      if (metadata) {
        const mcValue = ensureNumber(metadata.mc, 0)
        chartMetadata.ascendant = ensureNumber(metadata.ascendant, 0)
        chartMetadata.mc = mcValue
        chartMetadata.midheaven = mcValue
        chartMetadata.vertex = ensureNumber(metadata.vertex, 0)
        chartMetadata.armc = ensureNumber(metadata.armc, 0)
        chartMetadata.equatorialAscendant = ensureNumber(metadata.equatorial_ascendant, 0)
        chartMetadata.coAscendantKoch = ensureNumber(metadata.co_ascendant_koch, 0)
      }
    }

    // Recalculate house assignments if we have valid houses
    // This is needed because database may not store house assignments
    let finalPlanetsArray = planetsArray
    if (Array.isArray(housesArray) && housesArray.length === 12) {
      // Check if all planets are in house 1 (indicates missing house assignments)
      const allInHouse1 = planetsArray.every((p: any) => p.house === 1)
      if (allInHouse1 && planetsArray.length > 0) {
        // Recalculate house assignments based on planet longitudes and house cusps
        const recalculatedPlanets = assignHousesToPlanets(planetsArray, housesArray)
        // Merge house assignments back into original objects (preserving color, symbol, etc.)
        finalPlanetsArray = planetsArray.map((planet: any, index: number) => ({
          ...planet,
          house: recalculatedPlanets[index]?.house ?? planet.house,
        }))
      }
    }

    // Build the converted chart, preserving all original fields
    const convertedChart = {
      ...dbChart, // Preserve all original fields (calculation_info, astro_system, etc.)
      ...chartMetadata, // Add extracted metadata (ascendant, mc, etc.)
      planets: finalPlanetsArray,
      houses: housesArray || [],
      aspects: aspectsArray,
    }

    // If we have calculation_info, extract useful fields to top level for compatibility
    if (dbChart.calculation_info) {
      convertedChart.latitude = ensureNumber(dbChart.calculation_info.latitude, 0)
      convertedChart.longitude = ensureNumber(dbChart.calculation_info.longitude, 0)
      convertedChart.date = dbChart.calculation_info.birth_datetime
        ? new Date(dbChart.calculation_info.birth_datetime)
        : new Date()
    }

    return convertedChart
  }

  // Calculate chart based on selected type or use saved chart data
  const chart = useMemo(() => {
    console.log('[BirthChartPage] useMemo running - chartType:', chartType, 'savedChart:', !!savedChart, 'transitChart:', !!transitChart, 'requestedTransitDate:', requestedTransitDate)

    try {
    // If we have a saved chart and it's natal type, use its data
    // BUT only if the astro system matches AND the data is valid
    if (savedChart && savedChart.chart_type === 'natal' && chartType === 'natal') {
      const currentAstroSystem = zodiacSystem === 'vedic' ? 'vedic' : 'western'
      // Only use saved chart if astro systems match
      if (savedChart.astro_system === currentAstroSystem) {
        const converted = convertChartFormat(savedChart.chart_data)
        // Validate that the converted chart has actual planet data
        // If it's empty or invalid, fall through to client-side calculation
        if (converted?.planets && Array.isArray(converted.planets) && converted.planets.length > 0) {
          return converted
        }
        console.log('[BirthChartPage] Saved chart has invalid/empty data, falling through to client-side calculation')
      } else {
        // Astro systems don't match - fall through to client-side calculation
        console.log(`[BirthChartPage] Zodiac system changed from ${savedChart.astro_system} to ${currentAstroSystem}, recalculating client-side`)
      }
    }

    // For transit type, prefer server-side data if available (has proper chart_id for interpretations)
    if (chartType === 'transit' && transitChart) {
      console.log('[BirthChartPage] Using server-side transit chart data')
      return convertChartFormat(transitChart.chart_data)
    }

    // Otherwise calculate client-side (fallback)
    console.log('[BirthChartPage] Client-side calculation for chartType:', chartType, 'requestedTransitDate:', requestedTransitDate, 'birthData:', birthData ? 'exists' : 'null')
    switch (chartType) {
      case 'transit': {
        // Client-side fallback when server-side isn't available yet
        // Use requestedTransitDate if set (from companion), otherwise current time
        const transitDate = requestedTransitDate ? new Date(requestedTransitDate) : new Date()
        console.log('[BirthChartPage] Calculating transit chart for date:', transitDate.toISOString(), 'using birthData:', {
          date: birthData?.date?.toISOString?.() || 'invalid',
          lat: birthData?.latitude,
          lon: birthData?.longitude
        })
        try {
          const transitResult = calculateTransitChart({
            natalData: birthData,
            transitDate: transitDate
          })
          console.log('[BirthChartPage] Transit chart calculation SUCCESS:', {
            planetsCount: transitResult?.planets?.length ?? 0,
            housesCount: transitResult?.houses?.length ?? 0,
            aspectsCount: transitResult?.aspects?.length ?? 0,
            ascendant: transitResult?.ascendant
          })
          return transitResult
        } catch (transitError) {
          console.error('[BirthChartPage] Transit chart calculation FAILED:', transitError)
          // Fall through to natal calculation as ultimate fallback
          console.log('[BirthChartPage] Falling back to natal chart calculation')
          return calculateBirthChart(birthData, zodiacSystem)
        }
      }
      case 'progressed':
        return calculateProgressedChart({ natalData: birthData })
      case 'natal':
      default: {
        const natalResult = calculateBirthChart(birthData, zodiacSystem)
        console.log('[BirthChartPage] Natal chart result:', {
          planetsCount: natalResult?.planets?.length ?? 0,
          housesCount: natalResult?.houses?.length ?? 0,
          ascendant: natalResult?.ascendant
        })
        return natalResult
      }
    }
    } catch (error) {
      console.error('[BirthChartPage] Error in chart useMemo:', error)
      // Return a minimal valid chart to prevent crash
      return {
        planets: [],
        houses: [],
        aspects: [],
        ascendant: 0,
        midheaven: 0,
      }
    }
  }, [savedChart, transitChart, birthData, chartType, zodiacSystem, requestedTransitDate])

  // Determine which chart ID to use for interpretations based on chart type
  const activeChartId = useMemo(() => {
    switch (chartType) {
      case 'transit':
        return transitChart?.id ?? null
      case 'natal':
      default:
        return savedChart?.id ?? chartId ?? null
    }
  }, [chartType, transitChart?.id, savedChart?.id, chartId])

  // Sync chart data to store for AI companion access
  useEffect(() => {
    if (chart && activeChartId) {
      console.log('[BirthChartPage] Syncing chart to store:', activeChartId)
      addChart(activeChartId, chart)
      setStoreActiveChart(activeChartId)
    }
  }, [chart, activeChartId, addChart, setStoreActiveChart])

  // Get chart title and subtitle based on type
  const chartInfo = useMemo(() => {
    const now = new Date()
    switch (chartType) {
      case 'transit':
        return {
          title: 'Current Transits',
          subtitle: `As of ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        }
      case 'progressed':
        return {
          title: 'Progressed Chart',
          subtitle: `Age ${getProgressedAge(birthData)} (1 day = 1 year)`,
        }
      case 'natal':
      default:
        return {
          title: 'Birth Chart',
          subtitle: 'Astrological Natal Chart Analysis',
        }
    }
  }, [chartType, birthData])

  // Detect if current settings differ from saved chart settings
  // NOTE: Zodiac system changes (Western/Vedic) are handled by client-side calculation,
  // so we DON'T trigger recalculate for those. Only trigger for settings that require
  // server-side recalculation (house system, hybrid options, etc.)
  const settingsChanged = useMemo(() => {
    if (!savedChart) return false

    const savedParams = savedChart.calculation_params || {}

    // Check settings that require server-side recalculation
    // NOTE: astro_system and zodiac_type changes are handled by client-side calculation,
    // so we intentionally do NOT check those here to avoid prompting recalculation
    if (savedChart.house_system !== houseSystem) return true

    // Check hybrid options (use defaults when savedParams doesn't have the value)
    if ((savedParams.include_nakshatras ?? false) !== includeNakshatras) return true
    if ((savedParams.include_western_aspects ?? false) !== includeWesternAspects) return true
    if ((savedParams.include_minor_aspects ?? false) !== includeMinorAspects) return true

    return false
  }, [savedChart, houseSystem, includeNakshatras, includeWesternAspects, includeMinorAspects])

  // Group aspects by planet in traditional order
  const aspectsByPlanet = useMemo(() => {
    // Guard: Return empty array if chart data is not yet available
    if (!chart?.planets || !chart?.aspects) {
      return []
    }

    const planetOrder = PLANETS.map((p: { name: string }) => p.name)

    return planetOrder
      .map(planetName => {
        const planet = chart.planets.find((p: { name: string }) => p.name === planetName)
        if (!planet) return null

        const planetAspects = chart.aspects.filter(
          (aspect: { planet1: string; planet2: string }) => aspect.planet1 === planetName || aspect.planet2 === planetName
        )

        return {
          planet,
          aspects: planetAspects,
        }
      })
      .filter((item): item is { planet: any; aspects: any[] } =>
        item !== null && item.aspects.length > 0
      )
  }, [chart?.planets, chart?.aspects])

  // Detect aspect patterns in the chart
  const patterns = useMemo(() => {
    if (!chart?.planets || !chart?.aspects) {
      return []
    }
    return detectPatterns(chart)
  }, [chart])

  // Handle export
  const handleExport = async (settings: ExportSettings) => {
    setIsExporting(true)

    try {
      const svgElement = chartWheelRef.current?.querySelector('svg')

      if (!svgElement) {
        throw new Error('Chart SVG not found')
      }

      if (settings.format === 'png') {
        // Export as PNG
        const blob = await exportChartAsPNG(svgElement, { size: settings.imageSize })
        const filename = generateFilename('birth-chart', 'png')
        downloadBlob(blob, filename)
      } else {
        // Export as PDF
        const blob = await exportChartAsPDF(
          chart,
          birthData,
          settings.includeWheel ? svgElement : null,
          {
            paperSize: settings.paperSize,
            includeWheel: settings.includeWheel,
            includePlanets: settings.includePlanets,
            includeHouses: settings.includeHouses,
            includeAspects: settings.includeAspects,
          }
        )
        const filename = generateFilename('birth-chart', 'pdf')
        downloadBlob(blob, filename)
      }

      setExportDialogOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export chart. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Handle recalculate chart with new settings
  const handleRecalculateChart = async () => {
    if (!savedChart) return

    setIsRecalculating(true)
    setGenerationError(null)

    try {
      // Recalculate with current settings
      const newChart = await calculateChart({
        birth_data_id: savedChart.birth_data_id,
        chart_name: savedChart.chart_name || `Birth Chart`,
        chart_type: 'natal',
        astro_system: zodiacSystem === 'vedic' ? 'vedic' : 'western',
        house_system: houseSystem,
        zodiac_type: zodiacSystem === 'vedic' ? 'sidereal' : 'tropical',
        ayanamsa: zodiacSystem === 'vedic' ? ayanamsa : undefined,
        include_nakshatras: includeNakshatras,
        include_western_aspects: includeWesternAspects,
        include_minor_aspects: includeMinorAspects,
      })

      // Update saved chart with new calculation
      setSavedChart(newChart)
      console.log('[BirthChartPage] Chart recalculated with new settings')
    } catch (error) {
      console.error('Recalculation failed:', error)
      setGenerationError(error instanceof Error ? error.message : 'Failed to recalculate chart')
    } finally {
      setIsRecalculating(false)
    }
  }

  // Listen for companion-triggered chart recalculation
  useEffect(() => {
    const handleCompanionRecalculate = () => {
      console.log('[BirthChartPage] Received companion-recalculate-chart event')
      handleRecalculateChart()
    }

    window.addEventListener('companion-recalculate-chart', handleCompanionRecalculate)
    return () => {
      window.removeEventListener('companion-recalculate-chart', handleCompanionRecalculate)
    }
  }, [handleRecalculateChart])

  // Listen for companion-triggered transit date changes
  // IMPORTANT: Empty dependency array - this listener should only be registered once
  // and should NOT be re-registered when chartType or requestedTransitDate changes
  useEffect(() => {
    const handleCompanionSetTransitDate = (event: CustomEvent<{ date: string | null }>) => {
      const { date } = event.detail
      console.log('[BirthChartPage] Received companion-set-transit-date event:', date)
      // Store the requested transit date and switch to transit chart type
      // Both state setters are called in the same event handler, so React batches them
      setRequestedTransitDate(date)
      setChartType('transit')
      console.log('[BirthChartPage] State setters called - chartType: transit, requestedTransitDate:', date)
    }

    window.addEventListener('companion-set-transit-date', handleCompanionSetTransitDate as EventListener)
    return () => {
      window.removeEventListener('companion-set-transit-date', handleCompanionSetTransitDate as EventListener)
    }
  }, []) // Empty deps - listener should be stable

  // Handle generate/regenerate interpretations
  const handleGenerateInterpretations = async () => {
    // Capture current config at start - will check if changed before applying results
    const configSnapshot = {
      zodiacSystem,
      chartType,
      activeChartId,
    }

    setIsGeneratingInterpretations(true)
    setGenerationError(null)

    try {
      let targetChartId: string

      // For transit charts, use the transit chart ID
      if (chartType === 'transit' && transitChart) {
        targetChartId = transitChart.id
      }
      // For natal charts, use saved chart if available
      else if (savedChart) {
        targetChartId = savedChart.id
      } else {
        // Create a new chart in the database
        // Single-user mode - no client needed

        // Extract date and time parts properly
        const year = birthData.date.getFullYear()
        const month = String(birthData.date.getMonth() + 1).padStart(2, '0')
        const day = String(birthData.date.getDate()).padStart(2, '0')
        const hours = String(birthData.date.getHours()).padStart(2, '0')
        const minutes = String(birthData.date.getMinutes()).padStart(2, '0')
        const seconds = String(birthData.date.getSeconds()).padStart(2, '0')

        // Get timezone offset in minutes
        const timezoneOffset = birthData.date.getTimezoneOffset()

        // Determine IANA timezone based on offset (this is a simplified mapping)
        // For a production app, you'd want to use a library like moment-timezone
        let timezone = 'America/Los_Angeles' // Default to PST/PDT
        if (timezoneOffset === 420) {
          timezone = 'America/Los_Angeles' // PDT (UTC-7)
        } else if (timezoneOffset === 480) {
          timezone = 'America/Los_Angeles' // PST (UTC-8)
        } else if (timezoneOffset === 360) {
          timezone = 'America/Denver' // MDT
        } else if (timezoneOffset === 300) {
          timezone = 'America/Chicago' // CDT
        } else if (timezoneOffset === 240) {
          timezone = 'America/New_York' // EDT
        }

        // Create birth data from current state
        const birthDataRecord = await createBirthData({
          birth_date: `${year}-${month}-${day}`,
          birth_time: `${hours}:${minutes}:${seconds}`,
          time_unknown: false,
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          timezone: timezone,
          utc_offset: -timezoneOffset, // JavaScript gives offset in minutes, negative of UTC offset
          city: locationName.split(',')[0].trim(),
          state_province: locationName.split(',')[1]?.trim() || null,
          country: 'USA',
          rodden_rating: 'A',
        })

        // Calculate chart server-side with all settings from the store
        // This uses Swiss Ephemeris and supports all Vedic features
        const newChart = await calculateChart({
          birth_data_id: birthDataRecord.id,
          chart_name: `Birth Chart - ${locationName}`,
          chart_type: 'natal',
          astro_system: zodiacSystem === 'vedic' ? 'vedic' : 'western',
          house_system: houseSystem,
          zodiac_type: zodiacSystem === 'vedic' ? 'sidereal' : 'tropical',
          ayanamsa: zodiacSystem === 'vedic' ? ayanamsa : undefined,
          // Hybrid chart options
          include_nakshatras: includeNakshatras,
          include_western_aspects: includeWesternAspects,
          include_minor_aspects: includeMinorAspects,
        })

        targetChartId = newChart.id
        // Don't set savedChart yet - wait until after generation completes
      }

      // Generate interpretations
      // Now with async/parallel processing - blazing fast! ⚡
      const request: GenerateInterpretationRequest = {
        element_types: ['planet', 'house', 'aspect', 'pattern'],  // All element types!
        regenerate_existing: true, // Regenerate even if interpretations exist
        ai_model: 'claude-haiku-4-5-20251001'
      }

      const result = await generateChartInterpretations(targetChartId, request)

      console.log(`Generated ${result.generated_count} interpretations, skipped ${result.skipped_count}`)

      if (result.errors && result.errors.length > 0) {
        setGenerationError(`Generated with ${result.errors.length} errors: ${result.errors.join(', ')}`)
      }

      // Check if config changed during generation - if so, discard results
      // This prevents race conditions when user switches zodiac system mid-generation
      if (zodiacSystem !== configSnapshot.zodiacSystem ||
          chartType !== configSnapshot.chartType) {
        console.log('[BirthChartPage] Config changed during generation, discarding results')
        setGenerationError('Settings changed during generation. Please regenerate interpretations.')
        return
      }

      // Success - fetch the chart to ensure we have the latest data
      // This also triggers InterpretationsProvider to reload interpretations
      const updatedChart = await getChart(targetChartId)

      // Update the appropriate chart state based on chart type
      if (chartType === 'transit') {
        setTransitChart(updatedChart)
      } else {
        setSavedChart(updatedChart)
      }
    } catch (error) {
      console.error('Failed to generate interpretations:', error)
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate interpretations')
    } finally {
      setIsGeneratingInterpretations(false)
    }
  }

  // Handler for returning to primary chart
  const handleReturnToMyChart = () => {
    const primary = getPrimaryPerson()
    if (primary) {
      selectPerson(primary.id)
    }
  }

  return (
    <InterpretationsProvider chartId={activeChartId} zodiacSystem={zodiacSystem}>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-slate-950 via-cosmic-950 to-slate-900 flex"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
      {/* People Sidebar */}
      <PeopleSidebar onAddPerson={() => setIsAddPersonModalOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="border-b border-cosmic-700/50 bg-cosmic-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-cosmic-600 to-cosmic-500 p-2">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-gradient-celestial">
                  {chartInfo.title}
                </h1>
                <p className="text-sm text-cosmic-300">{chartInfo.subtitle}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditorOpen(true)}
                variant="ghost"
                size="sm"
                className="text-cosmic-300 hover:text-white"
                data-testid="birthchart-btn-edit-birth-data"
              >
                <Edit className="w-4 h-4" />
                <span className="ml-2">Edit Birth Data</span>
              </Button>

              {/* Zodiac System Selector */}
              <select
                value={zodiacSystem}
                onChange={(e) => useChartStore.getState().setZodiacSystem(e.target.value as any)}
                className="px-3 py-1.5 text-sm bg-cosmic-800/50 text-cosmic-200 border border-cosmic-700 rounded-lg hover:bg-cosmic-700/50 transition-colors cursor-pointer"
                data-testid="birthchart-select-zodiac-system"
                aria-label="Select zodiac system"
              >
                <option value="western">Western</option>
                <option value="vedic">Vedic</option>
              </select>

              <Button
                onClick={() => setShowAspects(!showAspects)}
                variant="ghost"
                size="sm"
                className="text-cosmic-300 hover:text-white"
                title="Toggle aspects"
                data-testid="birthchart-btn-toggle-aspects"
                aria-label="Toggle aspect visibility"
              >
                {showAspects ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {!isMobile && <span className="ml-2">Aspects</span>}
              </Button>

              <Button
                onClick={() => setShowHouseNumbers(!showHouseNumbers)}
                variant="ghost"
                size="sm"
                className="text-cosmic-300 hover:text-white"
                title="Toggle house numbers"
                data-testid="birthchart-btn-toggle-houses"
                aria-label="Toggle house numbers"
              >
                {showHouseNumbers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {!isMobile && <span className="ml-2">Houses</span>}
              </Button>

              <Button
                onClick={() => {
                  const newOrientation = visibility.orientation === 'natal' ? 'natural' : 'natal'
                  useChartStore.setState(state => ({
                    visibility: { ...state.visibility, orientation: newOrientation }
                  }))
                }}
                variant="ghost"
                size="sm"
                className="text-cosmic-300 hover:text-white"
                title={visibility.orientation === 'natal' ? 'Switch to Natural Wheel (Aries at left)' : 'Switch to Natal Chart (Ascendant at left)'}
                data-testid="birthchart-btn-toggle-orientation"
                aria-label={visibility.orientation === 'natal' ? 'Switch to Natural Wheel' : 'Switch to Natal Chart'}
              >
                <Hexagon className="w-4 h-4" />
                {!isMobile && <span className="ml-2">{visibility.orientation === 'natal' ? 'Natal' : 'Natural'}</span>}
              </Button>

              <Button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                variant="ghost"
                size="sm"
                className={`text-cosmic-300 hover:text-white ${showFilterPanel ? 'bg-cosmic-800/50' : ''}`}
                title="Aspect filters"
                data-testid="birthchart-btn-filters"
                aria-label="Open aspect filters"
              >
                <Filter className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Filters</span>}
              </Button>

              <Button
                onClick={() => setExportDialogOpen(true)}
                variant="ghost"
                size="sm"
                className="text-cosmic-300 hover:text-white"
                title="Export chart"
                data-testid="birthchart-btn-export"
                aria-label="Export chart"
              >
                <Download className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Export</span>}
              </Button>
            </div>
          </div>

          {/* Aspect Filter Panel */}
          <AnimatePresence>
            {showFilterPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-cosmic-700/30"
              >
                <div className="px-4 py-2 bg-cosmic-900/20">
                  <div className="flex items-center gap-6">
                    {/* Aspect Type Toggles */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-cosmic-300">Aspect Types:</span>
                      <Button
                        onClick={() =>
                          setAspectVisibility('major', !visibility.aspectTypes.major)
                        }
                        size="sm"
                        variant={visibility.aspectTypes.major ? 'primary' : 'ghost'}
                        className={`text-xs ${
                          visibility.aspectTypes.major
                            ? 'bg-cosmic-600 hover:bg-cosmic-500'
                            : 'text-cosmic-400 hover:text-white'
                        }`}
                        data-testid="birthchart-filter-major-aspects"
                      >
                        Major
                      </Button>
                      <Button
                        onClick={() =>
                          setAspectVisibility('minor', !visibility.aspectTypes.minor)
                        }
                        size="sm"
                        variant={visibility.aspectTypes.minor ? 'primary' : 'ghost'}
                        className={`text-xs ${
                          visibility.aspectTypes.minor
                            ? 'bg-cosmic-600 hover:bg-cosmic-500'
                            : 'text-cosmic-400 hover:text-white'
                        }`}
                        data-testid="birthchart-filter-minor-aspects"
                      >
                        Minor
                      </Button>
                    </div>

                    {/* Orb Slider */}
                    <div className="flex items-center gap-3 flex-1 max-w-md">
                      <span className="text-sm text-cosmic-300">Max Orb:</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={visibility.maxOrb}
                        onChange={e => setMaxOrb(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-cosmic-800 rounded-lg appearance-none cursor-pointer slider"
                        data-testid="birthchart-slider-max-orb"
                        aria-label="Adjust maximum orb"
                      />
                      <span className="text-sm font-bold text-cosmic-200 min-w-[3rem]">
                        {visibility.maxOrb.toFixed(1)}°
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Birth Info and Chart Type Selector */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-cosmic-300">
                <Calendar className="w-4 h-4" />
                <span>
                  {birthData.date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-cosmic-300">
                <Clock className="w-4 h-4" />
                <span>
                  {birthData.date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-cosmic-300">
                <MapPin className="w-4 h-4" />
                <span>{locationName}</span>
                <span className="text-cosmic-500">
                  ({birthData.latitude.toFixed(2)}°, {birthData.longitude.toFixed(2)}°)
                </span>
              </div>
            </div>

            {/* Chart Type Selector */}
            <div className="ml-auto">
              <ChartTypeSelector value={chartType} onChange={setChartType} />
            </div>
          </div>

          {/* Settings Changed Banner */}
          <AnimatePresence>
            {settingsChanged && savedChart && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 px-4 py-2 bg-amber-900/30 border border-amber-600/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-200 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Chart settings have changed. Recalculate to see updated positions.</span>
                  </div>
                  <Button
                    onClick={handleRecalculateChart}
                    disabled={isRecalculating}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    {isRecalculating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                        />
                        Recalculating...
                      </>
                    ) : (
                      'Recalculate Chart'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Guest Chart Banner - shows when viewing someone else's chart */}
      {isGuestChart && selectedPerson && (
        <GuestChartBanner
          person={selectedPerson}
          onReturnToMyChart={handleReturnToMyChart}
        />
      )}

      {/* Main Content */}
      <div className="max-w-full mx-auto px-6 py-4">
        <div className={`flex ${responsiveConfig.stackLayout ? 'flex-col' : 'flex-row'} gap-12`}>
          {/* Left Column: Chart Wheel and Key Info */}
          <div className={`flex flex-col ${responsiveConfig.stackLayout ? 'w-full' : 'flex-shrink-0'}`} style={{ width: responsiveConfig.stackLayout ? '100%' : `${responsiveConfig.chartSize + 40}px` }}>
            {/* Chart Wheel with glow effect for guest charts */}
            <ChartGlowEffect color={personColor} enabled={isGuestChart}>
              <div className="bg-gradient-to-br from-cosmic-900/50 to-cosmic-800/50 rounded-2xl p-5 border border-cosmic-700/50 backdrop-blur-sm">
                {/* Debug: Log chart data before rendering */}
                {(() => {
                  console.log('[BirthChartPage] Rendering BirthChartWheel with chart:', {
                    chartType,
                    hasChart: !!chart,
                    planetsCount: chart?.planets?.length ?? 0,
                    housesCount: chart?.houses?.length ?? 0,
                    ascendant: chart?.ascendant,
                    requestedTransitDate
                  })
                  return null
                })()}
                {chart && chart.planets && chart.planets.length > 0 ? (
                  <BirthChartWheel
                    ref={chartWheelRef}
                    chart={chart}
                    showAspects={showAspects && responsiveConfig.features.showAspectLines}
                    showHouseNumbers={showHouseNumbers && responsiveConfig.features.showHouseNumbers}
                    size={responsiveConfig.chartSize}
                  />
                ) : (
                  <div className="flex items-center justify-center" style={{ width: responsiveConfig.chartSize, height: responsiveConfig.chartSize }}>
                    <div className="text-cosmic-400 text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-cosmic-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Loading chart data...</p>
                      <p className="text-xs mt-1">Type: {chartType} | Transit Date: {requestedTransitDate || 'none'}</p>
                    </div>
                  </div>
                )}
              </div>
            </ChartGlowEffect>

            {/* Key Points */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-2 border border-cosmic-700/50">
                <div className="text-xs text-cosmic-400 mb-1">Ascendant</div>
                <div className="text-base font-bold text-yellow-400">
                  {chart?.houses?.[0]?.degree ?? (chart?.ascendant != null ? Math.floor(chart.ascendant % 30) : '--')}°{' '}
                  {chart?.houses?.[0]?.sign ?? ''}
                  {chart?.houses?.[0]?.minute != null && <span className="text-sm">{chart.houses[0].minute}'</span>}
                </div>
              </div>
              <div className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-2 border border-cosmic-700/50">
                <div className="text-xs text-cosmic-400 mb-1">Midheaven</div>
                <div className="text-base font-bold text-blue-400">
                  {chart?.houses?.[9]?.degree ?? (chart?.midheaven != null ? Math.floor(chart.midheaven % 30) : '--')}°{' '}
                  {chart?.houses?.[9]?.sign ?? ''}
                  {chart?.houses?.[9]?.minute != null && <span className="text-sm">{chart.houses[9].minute}'</span>}
                </div>
              </div>
            </div>

            {/* Balance Charts */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ElementBalanceChart chart={chart} size={180} />
              <ModalityChart chart={chart} />
            </div>
          </div>

          {/* Right Column: Information Panels */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="flex gap-2 mb-2 flex-wrap">
              <button
                onClick={() => setActiveTab('planets')}
                className={`flex-1 min-w-[120px] px-2 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'planets'
                    ? 'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg'
                    : 'bg-cosmic-900/50 text-cosmic-400 hover:bg-cosmic-800/50'
                }`}
                data-testid="birthchart-tab-planets"
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Planets
              </button>
              <button
                onClick={() => setActiveTab('houses')}
                className={`flex-1 min-w-[120px] px-2 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'houses'
                    ? 'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg'
                    : 'bg-cosmic-900/50 text-cosmic-400 hover:bg-cosmic-800/50'
                }`}
                data-testid="birthchart-tab-houses"
              >
                <Star className="w-4 h-4 inline mr-2" />
                Houses
              </button>
              <button
                onClick={() => setActiveTab('aspects')}
                className={`flex-1 min-w-[120px] px-2 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'aspects'
                    ? 'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg'
                    : 'bg-cosmic-900/50 text-cosmic-400 hover:bg-cosmic-800/50'
                }`}
                data-testid="birthchart-tab-aspects"
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Aspects
              </button>
              <button
                onClick={() => setActiveTab('patterns')}
                className={`flex-1 min-w-[120px] px-2 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'patterns'
                    ? 'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg'
                    : 'bg-cosmic-900/50 text-cosmic-400 hover:bg-cosmic-800/50'
                }`}
                data-testid="birthchart-tab-patterns"
              >
                <Hexagon className="w-4 h-4 inline mr-2" />
                Patterns
                {patterns.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-cosmic-500/30 text-cosmic-200">
                    {patterns.length}
                  </span>
                )}
              </button>
            </div>

            {/* Generate Interpretations Button */}
            <div className="mb-3">
              <GenerateInterpretationsButton
                onClick={handleGenerateInterpretations}
                isGenerating={isGeneratingInterpretations}
                hasSavedChart={!!savedChart}
              />
              {generationError && (
                <div className="mt-2 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
                  {generationError}
                </div>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-3" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '400px' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'planets' && (
                  <motion.div
                    key="planets"
                    variants={tabContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="grid grid-cols-1 2xl:grid-cols-2 gap-2"
                  >
                    {(chart?.planets ?? []).map((planet: any, index: number) => (
                      <PlanetInfo key={planet.name} planet={planet} index={index} />
                    ))}
                  </motion.div>
                )}

                {activeTab === 'houses' && (
                  <motion.div
                    key="houses"
                    variants={tabContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="grid grid-cols-1 2xl:grid-cols-2 gap-2"
                  >
                    {(chart?.houses ?? []).map((house: any, index: number) => (
                      <HouseInfo
                        key={house.number}
                        house={house}
                        planets={chart?.planets ?? []}
                        index={index}
                      />
                    ))}
                  </motion.div>
                )}

                {activeTab === 'aspects' && (
                  <motion.div
                    key="aspects"
                    variants={tabContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-2"
                  >
                    {aspectsByPlanet.length > 0 ? (
                      aspectsByPlanet.map((group, index) => (
                        <AspectGroup
                          key={group.planet.name}
                          planet={group.planet}
                          aspects={group.aspects}
                          index={index}
                        />
                      ))
                    ) : (
                      <div className="text-center text-cosmic-400 py-8">
                        No major aspects found
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'patterns' && (
                  <motion.div
                    key="patterns"
                    variants={tabContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <PatternDisplay patterns={patterns} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Birth Data Editor Dialog */}
      <BirthDataEditor
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialData={birthData}
        initialLocationName={locationName}
        onSave={handleSaveBirthData}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Notes Panel - shown for all people */}
      {selectedPerson && (
        <div className="max-w-full mx-auto px-6 pb-6">
          <NotesPanel person={selectedPerson} />
        </div>
      )}

      </div>{/* End of Main Content Area wrapper */}

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddPersonModalOpen}
        onClose={() => setIsAddPersonModalOpen(false)}
      />
    </motion.div>
    </InterpretationsProvider>
  )
}
