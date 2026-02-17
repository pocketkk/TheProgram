import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkles,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Zap,
  Globe,
  Maximize2,
  Settings,
  TrendingUp as _TrendingUp,
  TrendingDown,
  Circle,
  Star,
  BookOpen,
  Lock,
  Unlock,
  RotateCcw,
  Search,
  X,
  Sun,
  Orbit,
  Keyboard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2 as _Share2,
  Check as _Check,
  Ruler,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { SolarSystemScene } from './components/SolarSystemScene'
import { celestialBodies, getPlanets as _getPlanets } from './data'
import { UNIT_CONVERSIONS } from './constants'
import { dateToJulianDay, ZODIAC_SIGNS as _ZODIAC_SIGNS, getRetrogradeStatus } from '@/lib/astronomy/planetaryData'
import { getPlanetInfo, formatZodiacPosition, getElementDescription } from '@/lib/astronomy/planetInfo'
import { getDignityIcon, getDignityLabel } from '@/lib/astronomy/planetaryDignities'
import { BirthChartForm } from './components/BirthChartForm'
import { BirthChartManager } from './components/BirthChartManager'
import { DateTimePicker } from './components/DateTimePicker'
import { getActiveChart } from '@/lib/astronomy/birthChart'
import { PlanetIcon } from './components/PlanetIcon'
import type { BodyVisibility } from './types/celestialBody'
import { useKeyboardShortcuts, type KeyboardShortcut } from './hooks/useKeyboardShortcuts'

/**
 * Unified state structure for each celestial body
 * Consolidates all visibility and interaction state
 */
interface BodyState {
  /** Visibility settings for different visual elements */
  visibility: BodyVisibility
  /** Whether this body is currently selected */
  isSelected: boolean
  /** Optional custom scale multiplier for this body */
  customScale?: number
}

/**
 * Create initial state for all celestial bodies
 * Generates default visibility and interaction state for each body
 */
const createInitialBodyStates = (): Record<string, BodyState> => {
  const states: Record<string, BodyState> = {}

  // Include all celestial bodies except Moon (Moon uses Earth's controls)
  celestialBodies.forEach(body => {
    if (body.id !== 'moon') {
      states[body.id] = {
        visibility: {
          body: true,
          orbit: true,
          label: false, // Labels off by default - press L to toggle
          trail: true, // Trails on by default
          footprint: false, // Footprints off by default - cleaner view
          projectionLine: false, // Projection lines off by default
          glow: true,
          rings: true,
        },
        isSelected: false,
        customScale: undefined,
      }
    }
  })

  return states
}

/**
 * Convert Julian Day to JavaScript Date
 */
function julianDayToDate(jd: number): Date {
  const a = jd + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)

  const day = e - Math.floor((153 * m + 2) / 5) + 1
  const month = m + 3 - 12 * Math.floor(m / 10)
  const year = 100 * b + d - 4800 + Math.floor(m / 10)

  // Calculate time
  const fraction = jd - Math.floor(jd) + 0.5
  const hours = Math.floor(fraction * 24)
  const minutes = Math.floor((fraction * 24 - hours) * 60)
  const seconds = Math.floor(((fraction * 24 - hours) * 60 - minutes) * 60)

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
}


/**
 * Type definition for view presets
 */
type ViewPreset = {
  name: string
  description: string
  icon: LucideIcon
  bodies: string[]
}

/**
 * View preset configurations
 * Defines which bodies are visible for each preset
 */
const VIEW_PRESETS: Record<string, ViewPreset> = {
  'inner-system': {
    name: 'Inner Solar System',
    description: 'Sun, Mercury, Venus, Earth, Mars',
    icon: Sun,
    bodies: ['sun', 'mercury', 'venus', 'earth', 'mars', 'moon'],
  },
  'outer-planets': {
    name: 'Outer Planets',
    description: 'Jupiter, Saturn, Uranus, Neptune, Pluto',
    icon: Orbit,
    bodies: ['sun', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'],
  },
  'gas-giants': {
    name: 'Gas Giants',
    description: 'Jupiter and Saturn',
    icon: Circle,
    bodies: ['sun', 'jupiter', 'saturn'],
  },
  'ice-giants': {
    name: 'Ice Giants',
    description: 'Uranus and Neptune',
    icon: Circle,
    bodies: ['sun', 'uranus', 'neptune'],
  },
  'terrestrial': {
    name: 'Terrestrial Planets',
    description: 'Mercury, Venus, Earth, Mars',
    icon: Globe,
    bodies: ['sun', 'mercury', 'venus', 'earth', 'mars'],
  },
  'all': {
    name: 'All Bodies',
    description: 'Show everything',
    icon: Star,
    bodies: celestialBodies.map(b => b.id),
  },
}

/**
 * Date presets for common astronomical events and reference dates
 */
const DATE_PRESETS = [
  {
    id: 'today',
    label: 'Today',
    getDate: () => new Date(),
    getJulianDay: () => dateToJulianDay(new Date()),
  },
  {
    id: 'j2000',
    label: 'J2000 Epoch',
    getDate: () => new Date('2000-01-01T12:00:00Z'),
    getJulianDay: () => 2451545.0,
  },
  {
    id: 'summer-2024',
    label: 'Summer Solstice 2024',
    getDate: () => new Date('2024-06-20T20:51:00Z'),
    getJulianDay: () => dateToJulianDay(new Date('2024-06-20T20:51:00Z')),
  },
  {
    id: 'winter-2024',
    label: 'Winter Solstice 2024',
    getDate: () => new Date('2024-12-21T09:21:00Z'),
    getJulianDay: () => dateToJulianDay(new Date('2024-12-21T09:21:00Z')),
  },
  {
    id: 'vernal-2025',
    label: 'Vernal Equinox 2025',
    getDate: () => new Date('2025-03-20T09:01:00Z'),
    getJulianDay: () => dateToJulianDay(new Date('2025-03-20T09:01:00Z')),
  },
  {
    id: 'autumnal-2025',
    label: 'Autumnal Equinox 2025',
    getDate: () => new Date('2025-09-22T18:20:00Z'),
    getJulianDay: () => dateToJulianDay(new Date('2025-09-22T18:20:00Z')),
  },
] as const

/**
 * Collapsible section component for settings panel
 */
const CollapsibleSection: React.FC<{
  id: string
  title: string
  isCollapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ id: _id, title, isCollapsed, onToggle, children }) => {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 rounded-t transition-colors text-white"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
        />
      </button>
      {!isCollapsed && (
        <div className="px-4 py-3 bg-gray-900 rounded-b">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Cinematic demo sequence — introduces each body with a camera swoopand title card.
 * Total runtime: 30 s (speed=0.6 d/frame × 600 frames at 50 ms = 30 s).
 */
interface CinematicShot {
  id: string | null    // planet id, or null for "pull back to full system"
  title: string
  epithet: string
  color: string        // glow / accent color matching the planet
  time: number         // ms from demo start when this shot fires
}

const CINEMATIC_SEQUENCE: CinematicShot[] = [
  { id: 'sun',     title: 'SOL',     epithet: 'The Eternal Light',   color: '#FFD700', time: 0     },
  { id: 'mercury', title: 'MERCURY', epithet: 'The Messenger',        color: '#C4B5A5', time: 3000  },
  { id: 'venus',   title: 'VENUS',   epithet: 'The Morning Star',     color: '#DEB887', time: 6000  },
  { id: 'earth',   title: 'EARTH',   epithet: 'Our Home',             color: '#4FA4E8', time: 9000  },
  { id: 'mars',    title: 'MARS',    epithet: 'God of War',           color: '#CD5C5C', time: 12000 },
  { id: 'jupiter', title: 'JUPITER', epithet: 'The Great Benefic',    color: '#C88B3A', time: 15000 },
  { id: 'saturn',  title: 'SATURN',  epithet: 'Lord of Time',         color: '#E4D191', time: 18000 },
  { id: 'uranus',  title: 'URANUS',  epithet: 'The Awakener',         color: '#72C8C8', time: 21000 },
  { id: 'neptune', title: 'NEPTUNE', epithet: 'The Mystic',           color: '#4169E1', time: 24000 },
  { id: null,      title: '',        epithet: '',                     color: '',        time: 27000 }, // pull back
]

const DEMO_DURATION_MS = 30_000

export const CosmicVisualizerPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [julianDay, setJulianDay] = useState(dateToJulianDay(new Date()))
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1) // Days per frame
  const [stepSize, setStepSize] = useState(1) // Step size for fine control
  const [showHouses, setShowHouses] = useState(false)
  const [showFootprints, setShowFootprints] = useState(true)
  const [showFootprintConnections, setShowFootprintConnections] = useState(false)
  const [showAspects, setShowAspects] = useState(true)
  const [showPatterns, setShowPatterns] = useState(true)

  // === Distance Measurement ===
  const [measurementMode, setMeasurementMode] = useState(false)
  const [selectedForMeasurement, setSelectedForMeasurement] = useState<string[]>([])
  const [measurements, setMeasurements] = useState<Array<{
    id: string
    body1: string
    body2: string
    distanceAU: number
    distanceKm: number
  }>>([])

  // === Unified Body State Management ===
  const [bodyStates, setBodyStates] = useState<Record<string, BodyState>>(() =>
    createInitialBodyStates()
  )

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('')

  // View preset tracking
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Collapsed sections state - default to minimal UI for immersive view
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'display-options': true,  // Collapsed by default
    'per-planet-controls': true,  // Collapsed by default
    'view-mode': false,
    'birth-chart': true,  // Collapsed by default
    'visual-effects': true,  // Collapsed by default
    'view-presets': true,  // Collapsed by default
    'bottom-panel': true,  // Time controls collapsed by default - cleaner view
  })

  /**
   * Export current 3D view as PNG image
   */
  const exportToPNG = useCallback(() => {
    try {
      // Get the canvas element from Three.js
      const canvas = document.querySelector('canvas')
      if (!canvas) {
        console.error('Canvas not found')
        return
      }

      // Create filename with current date
      const date = currentDate.toISOString().split('T')[0]
      const time = currentDate.toTimeString().split(' ')[0].replace(/:/g, '-')
      const filename = `cosmic-view-${date}-${time}.png`

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create image blob')
          return
        }

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()

        // Cleanup
        URL.revokeObjectURL(url)

        // Show success feedback
        console.log(`Exported view to ${filename}`)
      }, 'image/png', 1.0) // Quality: 1.0 = maximum
    } catch (error) {
      console.error('Failed to export PNG:', error)
    }
  }, [currentDate])

  /**
   * Update visibility for a specific body
   */
  const updateBodyVisibility = (
    bodyId: string,
    updates: Partial<BodyVisibility>
  ) => {
    setBodyStates(prev => ({
      ...prev,
      [bodyId]: {
        ...prev[bodyId],
        visibility: {
          ...prev[bodyId].visibility,
          ...updates,
        },
      },
    }))
  }

  /**
   * Update multiple bodies at once (for bulk operations like "show all")
   */
  const updateMultipleBodies = (
    updates: Partial<BodyVisibility>
  ) => {
    setBodyStates(prev => {
      const newStates = { ...prev }
      Object.keys(newStates).forEach(bodyId => {
        newStates[bodyId] = {
          ...newStates[bodyId],
          visibility: {
            ...newStates[bodyId].visibility,
            ...updates,
          },
        }
      })
      return newStates
    })
  }

  /**
   * Toggle body selection state
   */
  const _toggleBodySelection = (bodyId: string) => {
    setBodyStates(prev => ({
      ...prev,
      [bodyId]: {
        ...prev[bodyId],
        isSelected: !prev[bodyId].isSelected,
      },
    }))
  }

  /**
   * Filter bodies based on search query with smart keyword matching
   */
  const filteredBodies = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.keys(bodyStates)
    }

    const query = searchQuery.toLowerCase().trim()

    return Object.keys(bodyStates).filter(bodyId => {
      const body = celestialBodies.find(b => b.id === bodyId)
      if (!body) return false

      // Match by multiple criteria
      const matchName = body.name.toLowerCase().includes(query)
      const matchId = bodyId.toLowerCase().includes(query)
      const matchType = body.type?.toLowerCase().includes(query)

      // Special keywords for planet groups
      const matchKeywords =
        (query === 'inner' && ['mercury', 'venus', 'earth', 'mars'].includes(bodyId)) ||
        (query === 'outer' && ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(bodyId)) ||
        (query === 'gas' && ['jupiter', 'saturn'].includes(bodyId)) ||
        (query === 'ice' && ['uranus', 'neptune'].includes(bodyId)) ||
        (query === 'terrestrial' && ['mercury', 'venus', 'earth', 'mars'].includes(bodyId)) ||
        (query === 'giant' && ['jupiter', 'saturn', 'uranus', 'neptune'].includes(bodyId))

      return matchName || matchId || matchType || matchKeywords
    })
  }, [searchQuery, bodyStates])

  /**
   * Highlight search query in text
   */
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text

    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-500 text-black px-1 rounded">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  }


  /**
   * Apply a view preset to show/hide specific bodies
   */
  const applyViewPreset = (presetId: keyof typeof VIEW_PRESETS) => {
    const preset = VIEW_PRESETS[presetId]

    setBodyStates(prev => {
      const newStates = { ...prev }

      // Hide all bodies first
      Object.keys(newStates).forEach(bodyId => {
        newStates[bodyId] = {
          ...newStates[bodyId],
          visibility: {
            ...newStates[bodyId].visibility,
            body: false,
          },
        }
      })

      // Show only bodies in the preset
      preset.bodies.forEach(bodyId => {
        if (newStates[bodyId]) {
          newStates[bodyId] = {
            ...newStates[bodyId],
            visibility: {
              ...newStates[bodyId].visibility,
              body: true,
            },
          }
        }
      })

      return newStates
    })

    setActivePreset(presetId)
    localStorage.setItem('cosmic-view-preset', presetId)
  }

  const [cameraMode, setCameraMode] = useState<'default' | 'earth'>('default')
  const [referenceFrame, setReferenceFrame] = useState<'heliocentric' | 'geocentric'>('geocentric')
  const [selectedPlanets, setSelectedPlanets] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [cameraLocked, setCameraLocked] = useState(true)
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0)

  // Visual settings
  const [zodiacBrightness, setZodiacBrightness] = useState(1.0) // 0.5 to 2
  const [zodiacGlowRadius, setZodiacGlowRadius] = useState(1.0) // 0.5 to 2.5
  const [stadiumOpacity, setStadiumOpacity] = useState(0.5) // 0.1 to 1.0
  const [showBackground, setShowBackground] = useState(false) // Toggle zodiac background colors

  // Birth chart state
  const [showBirthChartForm, setShowBirthChartForm] = useState(false)
  const [showBirthChartManager, setShowBirthChartManager] = useState(false)
  const [activeChartId, setActiveChartId] = useState<string | null>(null)
  const [showNatalOverlay, setShowNatalOverlay] = useState(false)
  const [showTransitAspects, setShowTransitAspects] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [_shareSuccess, _setShareSuccess] = useState(false)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)

  const intervalIdRef = useRef<number | null>(null)

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [demoEventLabel, setDemoEventLabel] = useState<string | null>(null)
  const demoEndDateRef = useRef<Date | null>(null)
  const demoStartDateRef = useRef<Date | null>(null)
  const prevRetroRef = useRef<Record<string, boolean>>({})
  const retroCheckCounter = useRef(0)
  const eventLabelTimerRef = useRef<number | null>(null)

  // Cinematic camera state
  const [cinematicTargetId, setCinematicTargetId] = useState<string | null>(null)
  const [cinematicTitle, setCinematicTitle] = useState<CinematicShot | null>(null)
  const cinemaTimersRef = useRef<number[]>([])

  const startDemo = useCallback(() => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    demoStartDateRef.current = oneYearAgo
    demoEndDateRef.current = new Date()
    prevRetroRef.current = {}
    retroCheckCounter.current = 0

    setCurrentDate(oneYearAgo)
    setReferenceFrame('geocentric')
    setSpeed(0.6)
    updateMultipleBodies({ trail: true })
    setIsDemoMode(true)
    setDemoEventLabel(null)

    // Schedule cinematic sequence
    cinemaTimersRef.current.forEach(clearTimeout)
    cinemaTimersRef.current = []
    CINEMATIC_SEQUENCE.forEach((shot) => {
      const id = window.setTimeout(() => {
        setCinematicTargetId(shot.id)
        setCinematicTitle(shot.id !== null ? shot : null)
      }, shot.time)
      cinemaTimersRef.current.push(id)
    })
    // Auto-stop after full duration
    const endId = window.setTimeout(() => {
      setIsDemoMode(false)
      setIsPlaying(false)
      setCinematicTargetId(null)
      setCinematicTitle(null)
    }, DEMO_DURATION_MS)
    cinemaTimersRef.current.push(endId)

    setIsPlaying(true)
  }, [updateMultipleBodies])

  const stopDemo = useCallback(() => {
    cinemaTimersRef.current.forEach(clearTimeout)
    cinemaTimersRef.current = []
    setIsDemoMode(false)
    setDemoEventLabel(null)
    setIsPlaying(false)
    setCinematicTargetId(null)
    setCinematicTitle(null)
    if (eventLabelTimerRef.current !== null) {
      clearTimeout(eventLabelTimerRef.current)
      eventLabelTimerRef.current = null
    }
  }, [])

  // Retrograde detection during demo
  useEffect(() => {
    if (!isDemoMode || !isPlaying) return

    retroCheckCounter.current += 1
    if (retroCheckCounter.current % 5 !== 0) return // check every 5 frames

    const currentRetro = getRetrogradeStatus(julianDay)
    const prev = prevRetroRef.current

    const PLANET_NAMES: Record<string, string> = {
      mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
      jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus',
      neptune: 'Neptune', pluto: 'Pluto',
    }

    for (const [planet, isRetro] of Object.entries(currentRetro)) {
      const wasRetro = prev[planet] ?? false
      if (isRetro && !wasRetro) {
        const label = `${PLANET_NAMES[planet] ?? planet} retrograde`
        setDemoEventLabel(label)
        if (eventLabelTimerRef.current !== null) clearTimeout(eventLabelTimerRef.current)
        eventLabelTimerRef.current = window.setTimeout(() => setDemoEventLabel(null), 3000)
      } else if (!isRetro && wasRetro) {
        const label = `${PLANET_NAMES[planet] ?? planet} direct`
        setDemoEventLabel(label)
        if (eventLabelTimerRef.current !== null) clearTimeout(eventLabelTimerRef.current)
        eventLabelTimerRef.current = window.setTimeout(() => setDemoEventLabel(null), 3000)
      }
    }

    prevRetroRef.current = currentRetro
  }, [julianDay, isDemoMode, isPlaying])

  // Stop demo when we reach today
  useEffect(() => {
    if (!isDemoMode || !demoEndDateRef.current) return
    if (currentDate >= demoEndDateRef.current) {
      stopDemo()
    }
  }, [currentDate, isDemoMode, stopDemo])

  // Update Julian day when date changes
  useEffect(() => {
    setJulianDay(dateToJulianDay(currentDate))
  }, [currentDate])

  // Single effect to manage animation - simplified and bulletproof
  useEffect(() => {
    // ALWAYS clear any existing interval first
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }

    // If not playing, we're done
    if (!isPlaying) {
      return
    }

    // Start new interval — use ms arithmetic so fractional speeds (e.g. 0.6) work correctly
    const MS_PER_DAY = 86_400_000
    intervalIdRef.current = window.setInterval(() => {
      setCurrentDate((prev) => new Date(prev.getTime() + speed * MS_PER_DAY))
    }, 50)

    // Cleanup function
    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
    }
  }, [isPlaying, speed])

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
    }
  }, [])

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F to focus search (only when settings panel is open)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && showSettings) {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder="Search planets..."]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, showSettings])

  // Load saved preset from localStorage on mount
  useEffect(() => {
    const savedPreset = localStorage.getItem('cosmic-view-preset')
    if (savedPreset && VIEW_PRESETS[savedPreset as keyof typeof VIEW_PRESETS]) {
      applyViewPreset(savedPreset as keyof typeof VIEW_PRESETS)
    }
  }, []) // Empty dependency array - only run on mount

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('cosmic-collapsed-sections', JSON.stringify(collapsedSections))
  }, [collapsedSections])

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cosmic-collapsed-sections')
    if (saved) {
      try {
        setCollapsedSections(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to parse collapsed sections from localStorage:', error)
      }
    }
  }, [])

  // Comprehensive keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = useMemo(() => {
    // Map number keys to planets (1-9 for planets, 0 for sun)
    const planetShortcuts: KeyboardShortcut[] = [
      { key: '1', description: 'Toggle Mercury', action: () => updateBodyVisibility('mercury', { body: !bodyStates.mercury?.visibility.body }) },
      { key: '2', description: 'Toggle Venus', action: () => updateBodyVisibility('venus', { body: !bodyStates.venus?.visibility.body }) },
      { key: '3', description: 'Toggle Earth', action: () => updateBodyVisibility('earth', { body: !bodyStates.earth?.visibility.body }) },
      { key: '4', description: 'Toggle Mars', action: () => updateBodyVisibility('mars', { body: !bodyStates.mars?.visibility.body }) },
      { key: '5', description: 'Toggle Jupiter', action: () => updateBodyVisibility('jupiter', { body: !bodyStates.jupiter?.visibility.body }) },
      { key: '6', description: 'Toggle Saturn', action: () => updateBodyVisibility('saturn', { body: !bodyStates.saturn?.visibility.body }) },
      { key: '7', description: 'Toggle Uranus', action: () => updateBodyVisibility('uranus', { body: !bodyStates.uranus?.visibility.body }) },
      { key: '8', description: 'Toggle Neptune', action: () => updateBodyVisibility('neptune', { body: !bodyStates.neptune?.visibility.body }) },
      { key: '9', description: 'Toggle Pluto', action: () => updateBodyVisibility('pluto', { body: !bodyStates.pluto?.visibility.body }) },
      { key: '0', description: 'Toggle Sun', action: () => updateBodyVisibility('sun', { body: !bodyStates.sun?.visibility.body }) },
    ]

    // Control shortcuts
    const controlShortcuts: KeyboardShortcut[] = [
      { key: ' ', description: 'Play/Pause', action: () => setIsPlaying(prev => !prev) },
      { key: 't', description: 'Toggle All Trails', action: () => {
        const anyTrailsOn = Object.values(bodyStates).some(state => state.visibility.trail)
        updateMultipleBodies({ trail: !anyTrailsOn })
      }},
      { key: 'o', description: 'Toggle All Orbits', action: () => {
        const anyOrbitsOn = Object.values(bodyStates).some(state => state.visibility.orbit)
        updateMultipleBodies({ orbit: !anyOrbitsOn })
      }},
      { key: 'l', description: 'Toggle All Labels', action: () => {
        const anyLabelsOn = Object.values(bodyStates).some(state => state.visibility.label)
        updateMultipleBodies({ label: !anyLabelsOn })
      }},
      { key: 'f', description: 'Toggle Footprints', action: () => setShowFootprints(prev => !prev) },
      { key: 'r', description: 'Reset Camera', action: () => setResetCameraTrigger(prev => prev + 1) },
      { key: '?', shiftKey: true, description: 'Show Help', action: () => setShowKeyboardHelp(true) },
      { key: 'h', description: 'Show Help', action: () => setShowKeyboardHelp(true) },
      { key: 's', description: 'Toggle Settings', action: () => setShowSettings(prev => !prev) },
      { key: 'a', description: 'Toggle Aspects', action: () => setShowAspects(prev => !prev) },
    ]

    // Speed controls
    const speedShortcuts: KeyboardShortcut[] = [
      { key: '+', description: 'Increase Speed', action: () => {
        const speeds = [1, 7, 30, 365]
        const currentIndex = speeds.indexOf(speed)
        if (currentIndex < speeds.length - 1) {
          setSpeed(speeds[currentIndex + 1])
        }
      }},
      { key: '=', description: 'Increase Speed (alternate)', action: () => {
        const speeds = [1, 7, 30, 365]
        const currentIndex = speeds.indexOf(speed)
        if (currentIndex < speeds.length - 1) {
          setSpeed(speeds[currentIndex + 1])
        }
      }},
      { key: '-', description: 'Decrease Speed', action: () => {
        const speeds = [1, 7, 30, 365]
        const currentIndex = speeds.indexOf(speed)
        if (currentIndex > 0) {
          setSpeed(speeds[currentIndex - 1])
        }
      }},
    ]

    // Reference frame shortcuts
    const frameShortcuts: KeyboardShortcut[] = [
      { key: 'g', description: 'Toggle Geocentric/Heliocentric', action: () => setReferenceFrame(prev => prev === 'heliocentric' ? 'geocentric' : 'heliocentric') },
      { key: 'c', description: 'Toggle Camera Lock', action: () => setCameraLocked(prev => !prev) },
    ]

    return [...planetShortcuts, ...controlShortcuts, ...speedShortcuts, ...frameShortcuts]
  }, [bodyStates, updateBodyVisibility, updateMultipleBodies, setIsPlaying, setShowFootprints, setCameraLocked, setResetCameraTrigger, setSpeed, setReferenceFrame, setShowKeyboardHelp, setShowSettings, setShowAspects, speed])

  // Apply shortcuts
  useKeyboardShortcuts(shortcuts)

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsPlaying((prev) => {
      console.log('Toggle play/pause:', !prev)
      return !prev
    })
  }

  const handleSpeedChange = () => {
    const speeds = [1, 7, 30, 365]
    const currentIndex = speeds.indexOf(speed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setSpeed(speeds[nextIndex])
    // Pause when changing speed
    setIsPlaying(false)
  }

  const handleSkipForward = () => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + speed * 10)
    setCurrentDate(next)
    setIsPlaying(false)
  }

  const handleSkipBack = () => {
    const prev = new Date(currentDate)
    prev.setDate(prev.getDate() - speed * 10)
    setCurrentDate(prev)
    setIsPlaying(false)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
    setIsPlaying(false)
  }


  const stepForward = (days: number) => {
    setJulianDay(prev => prev + days)
    const newDate = julianDayToDate(julianDay + days)
    setCurrentDate(newDate)
    setIsPlaying(false)
  }

  const stepBackward = (days: number) => {
    setJulianDay(prev => prev - days)
    const newDate = julianDayToDate(julianDay - days)
    setCurrentDate(newDate)
    setIsPlaying(false)
  }


  const _handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const dateValue = e.target.value
    if (!dateValue) return

    // Parse date string (YYYY-MM-DD format from date input)
    const parts = dateValue.split('-').map(Number)
    if (parts.length !== 3) return

    const [year, month, day] = parts

    // Create new date in UTC to avoid timezone issues
    // Preserve the current time
    const newDate = new Date(Date.UTC(
      year,
      month - 1,  // JavaScript months are 0-indexed
      day,
      currentDate.getUTCHours(),
      currentDate.getUTCMinutes(),
      currentDate.getUTCSeconds(),
      currentDate.getUTCMilliseconds()
    ))

    if (!isNaN(newDate.getTime())) {
      setCurrentDate(newDate)
      setJulianDay(dateToJulianDay(newDate))  // Update julian day so planets move!
      console.log(`[handleDateBlur] Date changed to: ${newDate.toISOString()}, JD: ${dateToJulianDay(newDate)}`)
    }
  }

  const _handleTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const timeValue = e.target.value
    if (!timeValue) return

    const timeParts = timeValue.split(':').map(Number)

    if (timeParts.length >= 2 && !timeParts.some(isNaN)) {
      // Create new date with updated time in UTC to avoid timezone issues
      const newDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
        timeParts[0] || 0,
        timeParts[1] || 0,
        timeParts[2] || 0,
        0
      ))

      setCurrentDate(newDate)
      setJulianDay(dateToJulianDay(newDate))  // Update julian day so planets move!
      console.log(`[handleTimeBlur] Time changed to: ${newDate.toISOString()}, JD: ${dateToJulianDay(newDate)}`)
    }
  }

  // Format speed display with actual time rates
  const getSpeedLabel = () => {
    // Animation runs at 50ms per frame = 20 frames per second
    const FRAMES_PER_SECOND = 1000 / 50 // 20 fps
    const daysPerSecond = speed * FRAMES_PER_SECOND

    if (speed === 1) {
      return `1 Day (${daysPerSecond.toFixed(0)} days/sec)`
    }
    if (speed === 7) {
      return `1 Week (${daysPerSecond.toFixed(0)} days/sec)`
    }
    if (speed === 30) {
      const monthsPerSec = daysPerSecond / 30
      return `1 Month (~${monthsPerSec.toFixed(1)} months/sec)`
    }
    if (speed === 365) {
      const yearsPerSec = daysPerSecond / 365
      return `1 Year (~${yearsPerSec.toFixed(1)} years/sec)`
    }

    // Custom speed - show appropriate units
    if (daysPerSecond < 1) {
      return `${daysPerSecond.toFixed(2)} days/sec`
    } else if (daysPerSecond < 30) {
      return `${daysPerSecond.toFixed(1)} days/sec`
    } else if (daysPerSecond < 365) {
      const monthsPerSec = daysPerSecond / 30
      return `~${monthsPerSec.toFixed(1)} months/sec`
    } else {
      const yearsPerSec = daysPerSecond / 365
      return `~${yearsPerSec.toFixed(2)} years/sec`
    }
  }

  // Extract visibility maps for SolarSystemScene compatibility
  const visiblePlanets = useMemo(() => {
    const result: Record<string, boolean> = {}
    Object.entries(bodyStates).forEach(([id, state]) => {
      result[id] = state.visibility.body
    })
    return result
  }, [bodyStates])

  const visiblePlanetOrbits = useMemo(() => {
    const result: Record<string, boolean> = {}
    Object.entries(bodyStates).forEach(([id, state]) => {
      result[id] = state.visibility.orbit
    })
    return result
  }, [bodyStates])

  const visiblePlanetLabels = useMemo(() => {
    // Hide all labels when modals are open to prevent z-index issues
    const hideAllLabels = showBirthChartForm || showBirthChartManager || showDateTimePicker

    const result: Record<string, boolean> = {}
    Object.entries(bodyStates).forEach(([id, state]) => {
      result[id] = hideAllLabels ? false : state.visibility.label
    })
    return result
  }, [bodyStates, showBirthChartForm, showBirthChartManager, showDateTimePicker])

  const visiblePlanetTrails = useMemo(() => {
    const result: Record<string, boolean> = {}
    Object.entries(bodyStates).forEach(([id, state]) => {
      result[id] = state.visibility.trail
    })
    return result
  }, [bodyStates])

  const visiblePlanetFootprints = useMemo(() => {
    const result: Record<string, boolean> = {}
    Object.entries(bodyStates).forEach(([id, state]) => {
      result[id] = state.visibility.footprint
    })
    return result
  }, [bodyStates])

  const visiblePlanetToFootprintLines = useMemo(() => {
    const result: Record<string, boolean> = {}
    Object.entries(bodyStates).forEach(([id, state]) => {
      result[id] = state.visibility.projectionLine
    })
    return result
  }, [bodyStates])

  // Get detailed planet information for all selected planets
  const planetsInfo = useMemo(() => {
    return selectedPlanets.map(planetName => ({
      name: planetName,
      info: getPlanetInfo(planetName, julianDay)
    }))
  }, [selectedPlanets, julianDay])

  /**
   * Calculate distance between two celestial bodies
   * Note: This is a placeholder that uses approximate orbital distances
   * In a full implementation, this would access actual 3D positions from the scene
   */
  const calculateDistance = useCallback((body1Id: string, body2Id: string) => {
    // Get planet information for both bodies at current time
    const planet1 = getPlanetInfo(body1Id, julianDay)
    const planet2 = getPlanetInfo(body2Id, julianDay)

    if (!planet1 || !planet2) {
      return { distanceAU: 0, distanceKm: 0 }
    }

    // Use approximate calculation based on orbital distances
    // This is simplified - a full implementation would use actual 3D coordinates
    const r1 = planet1.distanceFromSun
    const r2 = planet2.distanceFromSun

    // Convert ecliptic longitudes to radians
    const theta1 = (planet1.eclipticLongitude * Math.PI) / 180
    const theta2 = (planet2.eclipticLongitude * Math.PI) / 180

    // Calculate distance using law of cosines in the ecliptic plane
    // d = sqrt(r1^2 + r2^2 - 2*r1*r2*cos(theta2 - theta1))
    const distanceAU = Math.sqrt(
      r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(theta2 - theta1)
    )

    const distanceKm = distanceAU * UNIT_CONVERSIONS.AU_TO_KM

    return { distanceAU, distanceKm }
  }, [julianDay])

  // Handler to toggle planet selection or handle measurement mode
  const handlePlanetClick = useCallback((planetName: string) => {
    if (measurementMode) {
      // Add to measurement selection
      setSelectedForMeasurement(prev => {
        const newSelection = [...prev, planetName]

        // If we have 2 bodies, calculate and store measurement
        if (newSelection.length === 2) {
          const [body1, body2] = newSelection
          const { distanceAU, distanceKm } = calculateDistance(body1, body2)

          setMeasurements(prevMeasurements => [...prevMeasurements, {
            id: `${body1}-${body2}-${Date.now()}`,
            body1,
            body2,
            distanceAU,
            distanceKm,
          }])

          // Reset selection for next measurement
          return []
        }

        return newSelection
      })
    } else {
      // Normal selection behavior
      setSelectedPlanets(prev => {
        if (prev.includes(planetName)) {
          // Remove planet if already selected
          return prev.filter(p => p !== planetName)
        } else {
          // Add planet to selection
          return [...prev, planetName]
        }
      })
    }
  }, [measurementMode, calculateDistance])

  // Load active birth chart
  const activeChart = useMemo(() => {
    if (!activeChartId) return null
    return getActiveChart()
  }, [activeChartId])

  // Sync julian day when active chart changes
  useEffect(() => {
    if (activeChart && activeChart.julianDay) {
      console.log(`[CosmicVisualizerPage] Setting date to birth chart: ${activeChart.name}`)
      console.log(`[CosmicVisualizerPage] Birth date: ${activeChart.birthDate} ${activeChart.birthTime}`)
      console.log(`[CosmicVisualizerPage] Julian Day: ${activeChart.julianDay}`)
      setJulianDay(activeChart.julianDay)
      setIsPlaying(false) // Stop animation when loading birth chart
    }
  }, [activeChart])

  // Birth chart handlers
  const handleChartCreated = (chartId: string) => {
    setActiveChartId(chartId)
    setShowNatalOverlay(true)
  }

  const handleChartSelected = (chartId: string | null) => {
    setActiveChartId(chartId)
    if (chartId) {
      setShowNatalOverlay(true)
    } else {
      setShowNatalOverlay(false)
      setShowTransitAspects(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Subtle, minimal chrome */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900/40 backdrop-blur-sm border-b border-cosmic-700/30 px-4 py-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-gradient-to-br from-cosmic-600/80 to-cosmic-500/80 p-1.5">
              <Sparkles className="h-4 w-4 text-white/90" />
            </div>
            <h1 className="text-lg font-heading font-semibold text-white/90">
              Cosmic Visualizer
            </h1>
          </div>

          {/* Minimal toolbar - most controls in Settings panel */}
          <div className="flex items-center gap-2">
            <Button
              variant={cameraMode === 'earth' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setCameraMode(cameraMode === 'earth' ? 'default' : 'earth')}
              className="gap-1.5"
            >
              {cameraMode === 'earth' ? <Globe className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {cameraMode === 'earth' ? 'Earth View' : 'Full View'}
            </Button>

            {/* Reference Frame Selector */}
            <select
              value={referenceFrame}
              onChange={(e) => setReferenceFrame(e.target.value as 'heliocentric' | 'geocentric')}
              className="px-3 py-1.5 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50
                text-white text-sm hover:bg-cosmic-800/50 transition-colors
                focus:outline-none focus:ring-2 focus:ring-cosmic-500/50 focus:border-cosmic-500"
            >
              <option value="heliocentric">☉ Heliocentric</option>
              <option value="geocentric">🌍 Geocentric</option>
            </select>

            {/* Settings toggle - all other controls accessible here */}
            <Button
              variant={showSettings ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings & Controls (S)"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main visualization area */}
      <div className="flex-1 relative">
        {/* 3D Scene */}
        <div className="absolute inset-0">
          <SolarSystemScene
            julianDay={julianDay}
            showAspects={showAspects}
            showPatterns={showPatterns}
            showHouses={showHouses}
            showFootprints={showFootprints}
            showFootprintConnections={showFootprintConnections}
            visiblePlanets={visiblePlanets}
            visiblePlanetFootprints={visiblePlanetFootprints}
            visiblePlanetOrbits={visiblePlanetOrbits}
            visiblePlanetLabels={visiblePlanetLabels}
            visiblePlanetTrails={visiblePlanetTrails}
            visiblePlanetToFootprintLines={visiblePlanetToFootprintLines}
            showSunFootprint={visiblePlanetFootprints.sun !== false}
            showSunToFootprintLine={visiblePlanetToFootprintLines.sun !== false}
            cameraMode={cameraMode}
            referenceFrame={referenceFrame}
            zodiacBrightness={zodiacBrightness}
            zodiacGlowRadius={zodiacGlowRadius}
            stadiumOpacity={stadiumOpacity}
            showBackground={showBackground}
            birthChart={activeChart}
            showNatalOverlay={showNatalOverlay}
            showTransitAspects={showTransitAspects}
            onPlanetClick={handlePlanetClick}
            speed={speed}
            cameraLocked={cameraLocked}
            resetCameraTrigger={resetCameraTrigger}
            cinematicTargetId={isDemoMode ? cinematicTargetId : undefined}
            cinematicColor={cinematicTitle?.color}
          />
        </div>

        {/* Demo Mode — "Watch the year unfold" invite button */}
        <AnimatePresence>
          {!isDemoMode && !isPlaying && (
            <motion.button
              key="demo-invite"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={startDemo}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2
                px-5 py-2.5 rounded-full
                bg-cosmic-900/70 border border-cosmic-500/40 backdrop-blur-sm
                text-cosmic-300 hover:text-white hover:border-cosmic-400/70
                text-sm font-medium transition-all hover:bg-cosmic-800/80
                shadow-lg shadow-cosmic-900/40"
            >
              <Play className="h-4 w-4" />
              Watch the last year unfold
            </motion.button>
          )}
        </AnimatePresence>

        {/* Demo Mode — cinematic title card (center stage) */}
        <AnimatePresence mode="wait">
          {isDemoMode && cinematicTitle && (
            <motion.div
              key={cinematicTitle.title}
              initial={{ opacity: 0, y: 60, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 1.06 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none pt-6"
              style={{ zIndex: 10 }}
            >
              <div className="text-center select-none">
                {/* Planet name — enormous, letter-spaced */}
                <div
                  className="font-heading font-black tracking-[0.18em] leading-none"
                  style={{
                    fontSize: 'clamp(4rem, 12vw, 9rem)',
                    color: '#ffffff',
                    textShadow: [
                      `0 0 60px ${cinematicTitle.color}cc`,
                      `0 0 120px ${cinematicTitle.color}66`,
                      `0 0 200px ${cinematicTitle.color}33`,
                      '0 2px 8px rgba(0,0,0,0.8)',
                    ].join(', '),
                    WebkitTextStroke: `1px ${cinematicTitle.color}44`,
                  }}
                >
                  {cinematicTitle.title}
                </div>

                {/* Divider line in planet color */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                  className="mt-4 mb-3 mx-auto h-px w-64"
                  style={{ background: `linear-gradient(to right, transparent, ${cinematicTitle.color}cc, transparent)` }}
                />

                {/* Epithet */}
                <div
                  className="tracking-[0.35em] uppercase font-light"
                  style={{
                    fontSize: 'clamp(0.75rem, 2vw, 1.1rem)',
                    color: `${cinematicTitle.color}dd`,
                    textShadow: `0 0 30px ${cinematicTitle.color}88`,
                    letterSpacing: '0.35em',
                  }}
                >
                  {cinematicTitle.epithet}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo Mode — bottom HUD: retrograde events, progress bar, stop */}
        <AnimatePresence>
          {isDemoMode && (
            <motion.div
              key="demo-hud"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
            >
              {/* Retrograde / station event pill */}
              <AnimatePresence>
                {demoEventLabel && (
                  <motion.div
                    key={demoEventLabel}
                    initial={{ opacity: 0, scale: 0.85, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -6 }}
                    className="px-4 py-1 rounded-full backdrop-blur-sm text-white text-xs font-semibold
                      border shadow-lg"
                    style={{
                      background: 'rgba(15,10,40,0.75)',
                      borderColor: 'rgba(139,92,246,0.5)',
                      boxShadow: '0 0 16px rgba(139,92,246,0.3)',
                    }}
                  >
                    ↺ {demoEventLabel}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress timeline */}
              {demoStartDateRef.current && demoEndDateRef.current && (
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-xs tabular-nums">
                    {demoStartDateRef.current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <div className="w-52 h-0.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(to right, ${cinematicTitle?.color ?? '#8B5CF6'}, #ffffff88)`,
                        width: `${Math.min(100, Math.max(0,
                          (currentDate.getTime() - demoStartDateRef.current.getTime()) /
                          (demoEndDateRef.current.getTime() - demoStartDateRef.current.getTime()) * 100
                        ))}%`,
                        transition: 'width 0.1s linear',
                      }}
                    />
                  </div>
                  <span className="text-white/40 text-xs tabular-nums">
                    {demoEndDateRef.current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}

              <button
                onClick={stopDemo}
                className="pointer-events-auto text-white/25 hover:text-white/60 text-xs transition-colors mt-0.5"
              >
                stop
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comprehensive Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute top-20 right-4 glass-strong rounded-xl p-4 border border-cosmic-700/50 w-80 max-h-[calc(100vh-160px)] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-800/95 -mx-4 -mt-4 px-4 py-3 rounded-t-xl border-b border-cosmic-700/50">
                <h3 className="font-heading font-bold text-lg text-gradient-celestial flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Display Toggles Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Display Options
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">Show Houses</span>
                    <input
                      type="checkbox"
                      checked={showHouses}
                      onChange={(e) => setShowHouses(e.target.checked)}
                      className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">Show Footprints</span>
                    <input
                      type="checkbox"
                      checked={showFootprints}
                      onChange={(e) => setShowFootprints(e.target.checked)}
                      className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">Footprint Connections</span>
                    <input
                      type="checkbox"
                      checked={showFootprintConnections}
                      onChange={(e) => setShowFootprintConnections(e.target.checked)}
                      className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">Aspect Lines</span>
                    <input
                      type="checkbox"
                      checked={showAspects}
                      onChange={(e) => setShowAspects(e.target.checked)}
                      className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">Aspect Patterns</span>
                    <input
                      type="checkbox"
                      checked={showPatterns}
                      onChange={(e) => setShowPatterns(e.target.checked)}
                      className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">Sun Footprint</span>
                    <input
                      type="checkbox"
                      checked={bodyStates.sun?.visibility.footprint ?? true}
                      onChange={(e) => updateBodyVisibility('sun', { footprint: e.target.checked })}
                      className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-300">Sun Glow Line</span>
                    <input
                      type="checkbox"
                      checked={bodyStates.sun?.visibility.projectionLine ?? true}
                      onChange={(e) => updateBodyVisibility('sun', { projectionLine: e.target.checked })}
                      className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                    />
                  </label>
                </div>
              </div>

              {/* View Presets */}
              <CollapsibleSection
                id="view-presets"
                title="View Presets"
                isCollapsed={collapsedSections['view-presets']}
                onToggle={() => setCollapsedSections(prev => ({...prev, 'view-presets': !prev['view-presets']}))}
              >
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(VIEW_PRESETS).map(([id, preset]) => {
                    const Icon = preset.icon
                    return (
                      <button
                        key={id}
                        onClick={() => applyViewPreset(id as keyof typeof VIEW_PRESETS)}
                        className={`px-3 py-2 rounded text-sm transition-colors ${
                          activePreset === id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                        title={preset.description}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{preset.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CollapsibleSection>

              {/* Individual Planet Toggles Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Circle className="h-4 w-4" />
                    Per-Planet Controls
                  </h4>

                  {/* Preset buttons */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        // Show all controls
                        updateMultipleBodies({
                          body: true,
                          orbit: true,
                          label: true,
                          trail: true,
                          footprint: true,
                          projectionLine: true,
                          glow: true,
                          rings: true,
                        })
                      }}
                      className="px-2 py-1 text-[10px] rounded bg-cosmic-800/50 text-green-400 hover:bg-cosmic-700/50 hover:text-green-300 transition-colors"
                      title="Enable all planet controls"
                    >
                      Show All
                    </button>
                    <button
                      onClick={() => {
                        // Hide all controls except planet visibility
                        updateMultipleBodies({
                          orbit: false,
                          label: false,
                          trail: false,
                          footprint: false,
                          projectionLine: false,
                        })
                      }}
                      className="px-2 py-1 text-[10px] rounded bg-cosmic-800/50 text-orange-400 hover:bg-cosmic-700/50 hover:text-orange-300 transition-colors"
                      title="Disable all controls (keep planets visible)"
                    >
                      Hide All
                    </button>
                    <button
                      onClick={() => {
                        // Reset to defaults
                        updateMultipleBodies({
                          body: true,
                          orbit: true,
                          label: true,
                          trail: false, // Trails off by default
                          footprint: true,
                          projectionLine: true,
                          glow: true,
                          rings: true,
                        })
                      }}
                      className="px-2 py-1 text-[10px] rounded bg-cosmic-800/50 text-blue-400 hover:bg-cosmic-700/50 hover:text-blue-300 transition-colors"
                      title="Reset all controls to default values"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Search/Filter */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search planets..."
                      className="w-full px-3 py-2 pl-10 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Result count and hints */}
                  {searchQuery && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-400">
                        Showing {filteredBodies.length} of {Object.keys(bodyStates).length} bodies
                      </p>
                      {filteredBodies.length === 0 && (
                        <p className="text-xs text-gray-500">
                          Try: inner, outer, gas, ice, terrestrial, giant
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Column headers with select/deselect all */}
                <div className="grid grid-cols-[1fr,repeat(6,auto)] gap-1.5 mb-3 pb-2 border-b border-cosmic-700/30">
                  <div className="text-xs text-gray-400 font-medium">Planet</div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium" title="Show/hide planet sphere">Planet</span>
                    <button
                      onClick={() => {
                        const allSelected = Object.values(bodyStates).every(state => state.visibility.body)
                        updateMultipleBodies({ body: !allSelected })
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cosmic-800/50 text-blue-400 hover:bg-cosmic-700/50 hover:text-blue-300 transition-colors"
                    >
                      {Object.values(bodyStates).every(state => state.visibility.body) ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium" title="Show/hide orbital path">Orbit</span>
                    <button
                      onClick={() => {
                        const allSelected = Object.values(bodyStates).every(state => state.visibility.orbit)
                        updateMultipleBodies({ orbit: !allSelected })
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cosmic-800/50 text-blue-400 hover:bg-cosmic-700/50 hover:text-blue-300 transition-colors"
                    >
                      {Object.values(bodyStates).every(state => state.visibility.orbit) ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium" title="Show/hide planet label">Label</span>
                    <button
                      onClick={() => {
                        const allSelected = Object.values(bodyStates).every(state => state.visibility.label)
                        updateMultipleBodies({ label: !allSelected })
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cosmic-800/50 text-blue-400 hover:bg-cosmic-700/50 hover:text-blue-300 transition-colors"
                    >
                      {Object.values(bodyStates).every(state => state.visibility.label) ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium" title="Show/hide motion trail">Trail</span>
                    <button
                      onClick={() => {
                        const allSelected = Object.values(bodyStates).every(state => state.visibility.trail)
                        updateMultipleBodies({ trail: !allSelected })
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cosmic-800/50 text-blue-400 hover:bg-cosmic-700/50 hover:text-blue-300 transition-colors"
                    >
                      {Object.values(bodyStates).every(state => state.visibility.trail) ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium" title="Show/hide zodiac footprint">Footprint</span>
                    <button
                      onClick={() => {
                        const allSelected = Object.values(bodyStates).every(state => state.visibility.footprint)
                        updateMultipleBodies({ footprint: !allSelected })
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cosmic-800/50 text-blue-400 hover:bg-cosmic-700/50 hover:text-blue-300 transition-colors"
                    >
                      {Object.values(bodyStates).every(state => state.visibility.footprint) ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium" title="Show/hide glow line to footprint">Glow</span>
                    <button
                      onClick={() => {
                        const allSelected = Object.values(bodyStates).every(state => state.visibility.projectionLine)
                        updateMultipleBodies({ projectionLine: !allSelected })
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cosmic-800/50 text-blue-400 hover:bg-cosmic-700/50 hover:text-blue-300 transition-colors"
                    >
                      {Object.values(bodyStates).every(state => state.visibility.projectionLine) ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Planet rows */}
                <div className="space-y-0">
                  {filteredBodies.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">
                      No bodies found matching "{searchQuery}"
                    </p>
                  ) : (
                    filteredBodies.map((planet, index) => {
                    const _isOuter = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(planet)
                    const isFirstOuter = planet === 'jupiter'
                    const isEven = index % 2 === 0

                    return (
                      <div key={planet}>
                        {/* Separator before outer planets */}
                        {isFirstOuter && (
                          <div className="my-2 border-t border-cosmic-600/30 pt-2">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 px-1">Outer Planets</div>
                          </div>
                        )}

                        <div
                          className={`grid grid-cols-[1fr,repeat(6,auto)] gap-1.5 items-center px-2 py-2 rounded transition-colors ${
                            isEven ? 'bg-cosmic-900/30' : 'bg-cosmic-900/10'
                          } hover:bg-cosmic-800/40`}
                        >
                          <span className="text-sm text-gray-300 capitalize font-medium">
                            {highlightMatch(planet, searchQuery)}
                          </span>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={bodyStates[planet]?.visibility.body ?? true}
                              onChange={(e) => updateBodyVisibility(planet, { body: e.target.checked })}
                              className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700 cursor-pointer hover:border-cosmic-500 transition-colors"
                              title={`Toggle ${planet} visibility`}
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={bodyStates[planet]?.visibility.orbit ?? true}
                              onChange={(e) => updateBodyVisibility(planet, { orbit: e.target.checked })}
                              className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700 cursor-pointer hover:border-cosmic-500 transition-colors"
                              title={`Toggle ${planet} orbit`}
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={bodyStates[planet]?.visibility.label ?? true}
                              onChange={(e) => updateBodyVisibility(planet, { label: e.target.checked })}
                              className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700 cursor-pointer hover:border-cosmic-500 transition-colors"
                              title={`Toggle ${planet} label`}
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={bodyStates[planet]?.visibility.trail ?? false}
                              onChange={(e) => updateBodyVisibility(planet, { trail: e.target.checked })}
                              className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700 cursor-pointer hover:border-cosmic-500 transition-colors"
                              title={`Toggle ${planet} trail`}
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={bodyStates[planet]?.visibility.footprint ?? true}
                              onChange={(e) => updateBodyVisibility(planet, { footprint: e.target.checked })}
                              className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700 cursor-pointer hover:border-cosmic-500 transition-colors"
                              title={`Toggle ${planet} footprint`}
                            />
                          </div>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={bodyStates[planet]?.visibility.projectionLine ?? true}
                              onChange={(e) => updateBodyVisibility(planet, { projectionLine: e.target.checked })}
                              className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700 cursor-pointer hover:border-cosmic-500 transition-colors"
                              title={`Toggle ${planet} glow line`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                  )}
                </div>
              </div>

              {/* View Mode Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  View Mode
                </h4>
                <div className="space-y-2">
                  <label className="block text-xs text-gray-400 mb-1">Camera</label>
                  <select
                    value={cameraMode}
                    onChange={(e) => setCameraMode(e.target.value as 'default' | 'earth')}
                    className="w-full px-3 py-2 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50 text-white text-sm"
                  >
                    <option value="default">Full View</option>
                    <option value="earth">Earth View</option>
                  </select>

                  <label className="block text-xs text-gray-400 mb-1 mt-3">Reference Frame</label>
                  <select
                    value={referenceFrame}
                    onChange={(e) => setReferenceFrame(e.target.value as 'heliocentric' | 'geocentric')}
                    className="w-full px-3 py-2 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50 text-white text-sm"
                  >
                    <option value="heliocentric">☉ Heliocentric</option>
                    <option value="geocentric">🌍 Geocentric</option>
                  </select>

                  {/* Camera Controls */}
                  <div className="mt-4 pt-3 border-t border-cosmic-700/30">
                    <label className="block text-xs text-gray-400 mb-2">Camera Controls</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCameraLocked(!cameraLocked)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                          cameraLocked
                            ? 'bg-cosmic-600 text-white'
                            : 'bg-cosmic-900/50 text-gray-300 hover:bg-cosmic-800/50'
                        }`}
                      >
                        {cameraLocked ? '🔒 Locked' : '🔓 Free'}
                      </button>
                      <button
                        onClick={() => setResetCameraTrigger(prev => prev + 1)}
                        className="px-3 py-2 rounded-lg bg-cosmic-900/50 text-gray-300 hover:bg-cosmic-800/50 text-sm transition-colors"
                      >
                        ↺ Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tools Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Tools
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={exportToPNG}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-cosmic-900/50 text-gray-300 hover:bg-cosmic-800/50 text-sm transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export as PNG
                  </button>
                  <button
                    onClick={() => setShowKeyboardHelp(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-cosmic-900/50 text-gray-300 hover:bg-cosmic-800/50 text-sm transition-colors"
                  >
                    <Keyboard className="h-4 w-4" />
                    Keyboard Shortcuts
                  </button>
                </div>
              </div>

              {/* Birth Chart Section */}
              {activeChart && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Birth Chart: {activeChart.name}
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-300">Show Natal Overlay</span>
                      <input
                        type="checkbox"
                        checked={showNatalOverlay}
                        onChange={(e) => setShowNatalOverlay(e.target.checked)}
                        className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-300">Show Transit Aspects</span>
                      <input
                        type="checkbox"
                        checked={showTransitAspects}
                        onChange={(e) => setShowTransitAspects(e.target.checked)}
                        className="w-4 h-4 rounded bg-cosmic-900/50 border-cosmic-700"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Visual Effects Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Visual Effects
                </h4>

                {/* Zodiac Brightness Slider */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Zodiac Brightness: {zodiacBrightness.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={zodiacBrightness}
                    onChange={(e) => setZodiacBrightness(parseFloat(e.target.value))}
                    className="w-full h-2 bg-cosmic-900/50 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cosmic-500
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-cosmic-500
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Dim</span>
                    <span>Bright</span>
                  </div>
                </div>

                {/* Zodiac Glow Radius Slider */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Zodiac Glow Radius: {zodiacGlowRadius.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={zodiacGlowRadius}
                    onChange={(e) => setZodiacGlowRadius(parseFloat(e.target.value))}
                    className="w-full h-2 bg-cosmic-900/50 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cosmic-500
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-cosmic-500
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Thin</span>
                    <span>Thick</span>
                  </div>
                </div>

                {/* Stadium Opacity Slider */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stadium Opacity: {stadiumOpacity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={stadiumOpacity}
                    onChange={(e) => setStadiumOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-cosmic-900/50 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cosmic-500
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-cosmic-500
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Transparent</span>
                    <span>Solid</span>
                  </div>
                </div>

                {/* Background Colors Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    Zodiac Background Colors
                  </label>
                  <button
                    onClick={() => setShowBackground(!showBackground)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showBackground ? 'bg-cosmic-500' : 'bg-cosmic-900/50'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showBackground ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Planets Info - Multiple panels horizontal */}
        <div className="absolute top-4 left-4 flex flex-row gap-3 max-w-[calc(100vw-200px)] overflow-x-auto pointer-events-none">
          <AnimatePresence>
            {planetsInfo.map(({ name, info: planetInfo }, index) => planetInfo && (
              <motion.div
                key={name}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-strong rounded-xl p-4 border border-cosmic-700/50 w-80 flex-shrink-0 pointer-events-auto max-h-[calc(100vh-100px)] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PlanetIcon planet={name} size={48} />
                    <div>
                      <h3 className="font-heading font-bold text-xl text-gradient-celestial">
                        {planetInfo.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span style={{ color: planetInfo.zodiacSign.color }}>
                          {formatZodiacPosition(planetInfo)}
                        </span>
                        {planetInfo.isRetrograde && (
                          <span className="text-red-400 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Retrograde
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePlanetClick(name)}
                  >
                    ×
                  </Button>
                </div>

            {/* Zodiac Sign Section */}
            <div className="mb-4 pb-4 border-b border-cosmic-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl" style={{ color: planetInfo.zodiacSign.color }}>
                  {planetInfo.zodiacSign.symbol}
                </span>
                <div>
                  <h4 className="font-semibold text-white">{planetInfo.zodiacSign.name}</h4>
                  <p className="text-xs text-gray-400 capitalize">
                    {planetInfo.zodiacSign.element} element
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                {getElementDescription(planetInfo.zodiacSign.element)}
              </p>
            </div>

            {/* Dignity Section */}
            {planetInfo.dignity.type !== 'peregrine' && (
              <div className="mb-4 pb-4 border-b border-cosmic-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getDignityIcon(planetInfo.dignity.type)}</span>
                  <div>
                    <h4 className="font-semibold" style={{ color: planetInfo.dignity.color }}>
                      {getDignityLabel(planetInfo.dignity.type)}
                    </h4>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-gray-400">Strength:</span>
                      <div className="flex gap-0.5">
                        {[...Array(Math.abs(planetInfo.dignity.strength))].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: planetInfo.dignity.color }}
                          />
                        ))}
                      </div>
                      <span className="text-gray-400">
                        ({planetInfo.dignity.strength > 0 ? '+' : ''}{planetInfo.dignity.strength})
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-300">
                  {planetInfo.dignity.description}
                </p>
              </div>
            )}

            {/* Orbital Data */}
            <div className="mb-4 pb-4 border-b border-cosmic-700/50">
              <h4 className="font-semibold text-white mb-2 text-sm">Orbital Data</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance from Sun:</span>
                  <span className="text-white">{planetInfo.distanceFromSun.toFixed(2)} AU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Orbital Period:</span>
                  <span className="text-white">
                    {planetInfo.orbitalPeriod < 365
                      ? `${planetInfo.orbitalPeriod.toFixed(0)} days`
                      : `${(planetInfo.orbitalPeriod / 365.25).toFixed(1)} years`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rotation Period:</span>
                  <span className="text-white">
                    {planetInfo.rotationPeriod < 1
                      ? `${(planetInfo.rotationPeriod * 24).toFixed(1)} hours`
                      : `${planetInfo.rotationPeriod.toFixed(1)} days`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ecliptic Longitude:</span>
                  <span className="text-white">{planetInfo.eclipticLongitude.toFixed(2)}°</span>
                </div>
              </div>
            </div>

            {/* Aspects */}
            {planetInfo.aspects.length > 0 && (
              <div>
                <h4 className="font-semibold text-white mb-2 text-sm flex items-center gap-2">
                  <Circle className="h-3 w-3" />
                  Active Aspects
                </h4>
                <div className="space-y-2">
                  {planetInfo.aspects.map((aspect, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{aspect.planetSymbol}</span>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {aspect.aspect.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            to {aspect.planetName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-xs font-medium mb-1"
                          style={{ color: aspect.aspect.color }}
                        >
                          {aspect.aspect.angle}°
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 bg-cosmic-900 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${aspect.strength * 100}%`,
                                backgroundColor: aspect.aspect.color
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">
                            {(aspect.strength * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          orb: {aspect.orb.toFixed(1)}°
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No aspects message */}
            {planetInfo.aspects.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-4">
                No major aspects detected at this time
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>

        {/* Measurement Mode Selection Indicator */}
        {measurementMode && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-40">
            {selectedForMeasurement.length === 0 && 'Click first body'}
            {selectedForMeasurement.length === 1 && (
              <span>
                Click second body (selected: <span className="font-semibold capitalize">{selectedForMeasurement[0]}</span>)
              </span>
            )}
          </div>
        )}

        {/* Measurement Display Panel */}
        {measurements.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-90 p-4 rounded shadow-lg max-w-sm z-40">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-semibold">Measurements</h3>
              <button
                onClick={() => setMeasurements([])}
                className="text-gray-400 hover:text-white"
                title="Clear all measurements"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {measurements.map(measurement => (
                <div key={measurement.id} className="text-sm text-gray-300 border-l-2 border-blue-500 pl-2">
                  <div className="font-medium capitalize">
                    {measurement.body1} ↔ {measurement.body2}
                  </div>
                  <div className="text-xs">
                    {measurement.distanceAU.toFixed(4)} AU
                  </div>
                  <div className="text-xs text-gray-400">
                    {(measurement.distanceKm / 1000000).toFixed(2)} million km
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
  </div>

      {/* Time Controls */}
      <div className="glass-strong border-t border-cosmic-700/50">
        {/* Collapsible Header */}
        <button
          onClick={() => setCollapsedSections(prev => ({...prev, 'bottom-panel': !prev['bottom-panel']}))}
          className="w-full flex items-center justify-between px-4 py-2 hover:bg-cosmic-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cosmic-400" />
            <span className="text-sm font-semibold text-white">Time Controls</span>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-cosmic-400 transition-transform ${collapsedSections['bottom-panel'] ? '-rotate-90' : ''}`}
          />
        </button>

        {/* Collapsible Content */}
        {!collapsedSections['bottom-panel'] && (
          <div className="p-3 pt-0">
            {/* Current Date & Time Display - Clickable */}
            <button
              onClick={() => setShowDateTimePicker(true)}
              className="w-full text-center mb-2 px-4 py-2 rounded-lg hover:bg-cosmic-800/30 transition-all group cursor-pointer"
            >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Calendar className="h-5 w-5 text-cosmic-400 group-hover:text-cosmic-300 transition-colors" />
            <span className="text-lg font-heading font-bold text-gradient-celestial group-hover:scale-105 transition-transform">
              {currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="text-lg font-heading font-bold text-cosmic-400 group-hover:text-cosmic-300 transition-colors">
              {currentDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </span>
          </div>
          <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
            Julian Day: {julianDay.toFixed(6)} • Click to edit
          </div>
        </button>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <button
            onClick={handleSkipBack}
            className="px-3 py-1.5 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={handlePlayPause}
            className="px-4 py-1.5 rounded-lg bg-cosmic-600 text-white text-sm font-medium hover:bg-cosmic-500 transition-colors flex items-center gap-2"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={handleSkipForward}
            className="px-3 py-1.5 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            onClick={handleSpeedChange}
            className="px-3 py-1.5 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors flex items-center gap-1"
          >
            <Zap className="h-4 w-4" />
            {getSpeedLabel()}
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Date/Time Presets */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-2 text-center">Quick Dates</label>
          <div className="grid grid-cols-3 gap-2 max-w-2xl mx-auto">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  const jd = preset.getJulianDay()
                  setJulianDay(jd)
                  setCurrentDate(preset.getDate())
                  setIsPlaying(false)
                }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
                title={`Julian Day: ${preset.getJulianDay().toFixed(2)}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>


        {/* Fine Step Controls */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <button
            onClick={() => stepBackward(stepSize)}
            className="px-3 py-1.5 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors flex items-center gap-1"
            title={`Go back ${stepSize} day${stepSize > 1 ? 's' : ''}`}
          >
            <ChevronLeft className="h-4 w-4" />
            Step Back
          </button>

          <select
            value={stepSize}
            onChange={(e) => setStepSize(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-cosmic-900/50 border border-cosmic-700/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-cosmic-500/50 focus:border-cosmic-500"
          >
            <option value={1}>1 Day</option>
            <option value={7}>1 Week</option>
            <option value={30}>1 Month</option>
            <option value={365}>1 Year</option>
          </select>

          <button
            onClick={() => stepForward(stepSize)}
            className="px-3 py-1.5 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors flex items-center gap-1"
            title={`Go forward ${stepSize} day${stepSize > 1 ? 's' : ''}`}
          >
            Step Forward
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
          </div>
        )}
      </div>

      {/* Date/Time Picker Modal */}
      {showDateTimePicker && (
        <DateTimePicker
          currentDate={currentDate}
          onDateChange={(newDate) => {
            setCurrentDate(newDate)
            setJulianDay(dateToJulianDay(newDate))
            setIsPlaying(false)
          }}
          onClose={() => setShowDateTimePicker(false)}
          julianDay={julianDay}
        />
      )}

      {/* Birth Chart Modals */}
      {showBirthChartForm && (
        <BirthChartForm
          onClose={() => setShowBirthChartForm(false)}
          onChartCreated={handleChartCreated}
        />
      )}

      {showBirthChartManager && (
        <BirthChartManager
          onClose={() => setShowBirthChartManager(false)}
          onChartSelected={handleChartSelected}
          onCreateNew={() => {
            setShowBirthChartManager(false)
            setShowBirthChartForm(true)
          }}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            className="bg-gray-900 p-6 rounded-lg max-w-3xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Planet Controls */}
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Planet Visibility</h3>
                <div className="grid grid-cols-2 gap-2">
                  {shortcuts.filter(s => /^\d$/.test(s.key)).map(shortcut => (
                    <div key={shortcut.key} className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-mono min-w-[32px] text-center">
                        {shortcut.key}
                      </kbd>
                      <span className="text-gray-300 text-sm">{shortcut.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Controls</h3>
                <div className="grid grid-cols-1 gap-2">
                  {shortcuts.filter(s => [' ', 't', 'o', 'l', 'f', 'r', 'g', 'c', 's', 'a'].includes(s.key) || (s.key === '?' && s.shiftKey) || s.key === 'h').map(shortcut => (
                    <div key={shortcut.key + (shortcut.shiftKey ? '-shift' : '')} className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-mono min-w-[60px] text-center">
                        {shortcut.shiftKey ? 'Shift+' : ''}{shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase()}
                      </kbd>
                      <span className="text-gray-300 text-sm">{shortcut.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Speed */}
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Speed</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-mono min-w-[60px] text-center">
                      +/=
                    </kbd>
                    <span className="text-gray-300 text-sm">Increase Speed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-mono min-w-[60px] text-center">
                      -
                    </kbd>
                    <span className="text-gray-300 text-sm">Decrease Speed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                Press <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono">Esc</kbd> or click outside to close
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
