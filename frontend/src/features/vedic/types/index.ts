/**
 * Vedic Chart Type Definitions
 */

// Chart style options
export type VedicChartStyle = 'north' | 'south'
export type DivisionalChartType = 'd1' | 'd9'

// Ayanamsa systems
export type AyanamsaSystem =
  | 'lahiri'
  | 'raman'
  | 'krishnamurti'
  | 'yukteshwar'
  | 'fagan_bradley'
  | 'true_chitrapaksha'
  | 'true_revati'
  | 'true_pushya'

// Planetary dignity states
export type PlanetaryDignity = 'exalted' | 'debilitated' | 'own_sign' | 'moolatrikona' | 'neutral'

// Nakshatra information
export interface NakshatraInfo {
  name: string
  number: number
  lord: string
  pada: number
  start_degree: number
  end_degree: number
}

// Planet position in Vedic chart
export interface VedicPlanetPosition {
  name: string
  longitude: number
  sign: number
  signName: string
  degreeInSign: number
  house: number
  retrograde: boolean
  nakshatra?: NakshatraInfo
  dignity?: PlanetaryDignity
}

// House data
export interface VedicHouse {
  number: number
  sign: number
  signName: string
  cusp: number
  planets: string[]
}

// D1 chart data structure
export interface D1ChartData {
  division: number
  name: string
  planets: Record<string, VedicPlanetPosition>
  houses: {
    ascendant: number
    mc: number
    cusps: number[]
  }
  nakshatras: Record<string, NakshatraInfo>
  dignities: Record<string, PlanetaryDignity>
}

// Divisional chart data
export interface DivisionalChartData {
  division: number
  name: string
  planets: Record<string, VedicPlanetPosition>
  houses: {
    ascendant: number
    mc: number
    cusps: number[]
  }
}

// Complete Vedic chart response
export interface VedicChartData {
  id: string
  d1: D1ChartData
  divisional_charts?: {
    d9?: DivisionalChartData
    [key: string]: DivisionalChartData | undefined
  }
  calculation_info: {
    julian_day: number
    ayanamsa: string
    ayanamsa_value: number
    house_system: string
    birth_datetime: string
    latitude: number
    longitude: number
  }
}

// Chart calculation options
export interface VedicChartOptions {
  ayanamsa: AyanamsaSystem
  houseSystem: string
  includeDivisionals: DivisionalChartType[]
}

// Store state type
export interface VedicStoreState {
  // Chart data
  chart: VedicChartData | null
  birthDataId: string | null

  // Loading states
  isLoading: boolean
  error: string | null

  // UI state
  chartStyle: VedicChartStyle
  activeDivisional: DivisionalChartType
  selectedHouse: number | null
  selectedPlanet: string | null

  // Calculation options
  ayanamsa: AyanamsaSystem
  houseSystem: string

  // Actions
  calculateChart: (birthDataId: string) => Promise<void>
  setChartStyle: (style: VedicChartStyle) => void
  setActiveDivisional: (chart: DivisionalChartType) => void
  setSelectedHouse: (house: number | null) => void
  setSelectedPlanet: (planet: string | null) => void
  setAyanamsa: (ayanamsa: AyanamsaSystem) => void
  setHouseSystem: (system: string) => void
  reset: () => void
}
