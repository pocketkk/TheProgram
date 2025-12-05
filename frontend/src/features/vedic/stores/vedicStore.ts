/**
 * Vedic Chart State Store
 */
import { create } from 'zustand'
import { calculateChart, type ChartCalculationResponse } from '@/lib/api/charts'
import type {
  VedicChartStyle,
  DivisionalChartType,
  AyanamsaSystem,
} from '../types'

interface VedicStore {
  // Chart data
  chart: ChartCalculationResponse | null
  birthDataId: string | null

  // Loading states
  isLoading: boolean
  error: string | null

  // UI state
  chartStyle: VedicChartStyle
  activeDivisional: DivisionalChartType
  selectedHouse: number | null
  selectedPlanet: string | null
  hoveredHouse: number | null
  hoveredPlanet: string | null

  // Calculation options
  ayanamsa: AyanamsaSystem
  houseSystem: string

  // Actions
  calculateChart: (birthDataId: string) => Promise<void>
  setChartStyle: (style: VedicChartStyle) => void
  setActiveDivisional: (chart: DivisionalChartType) => void
  setSelectedHouse: (house: number | null) => void
  setSelectedPlanet: (planet: string | null) => void
  setHoveredHouse: (house: number | null) => void
  setHoveredPlanet: (planet: string | null) => void
  setAyanamsa: (ayanamsa: AyanamsaSystem) => void
  setHouseSystem: (system: string) => void
  reset: () => void
}

const initialState = {
  chart: null,
  birthDataId: null,
  isLoading: false,
  error: null,
  chartStyle: 'south' as VedicChartStyle,
  activeDivisional: 'd1' as DivisionalChartType,
  selectedHouse: null,
  selectedPlanet: null,
  hoveredHouse: null,
  hoveredPlanet: null,
  ayanamsa: 'lahiri' as AyanamsaSystem,
  houseSystem: 'whole_sign',
}

export const useVedicStore = create<VedicStore>((set, get) => ({
  ...initialState,

  calculateChart: async (birthDataId: string) => {
    set({ isLoading: true, error: null, birthDataId })

    try {
      const { ayanamsa, houseSystem } = get()

      const chart = await calculateChart({
        birth_data_id: birthDataId,
        chart_type: 'natal',
        astro_system: 'vedic',
        ayanamsa,
        house_system: houseSystem,
        zodiac_type: 'sidereal',
      })

      set({ chart, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate Vedic chart',
        isLoading: false,
      })
    }
  },

  setChartStyle: (chartStyle) => set({ chartStyle }),

  setActiveDivisional: (activeDivisional) => set({ activeDivisional }),

  setSelectedHouse: (selectedHouse) => set({ selectedHouse }),

  setSelectedPlanet: (selectedPlanet) => set({ selectedPlanet }),

  setHoveredHouse: (hoveredHouse) => set({ hoveredHouse }),

  setHoveredPlanet: (hoveredPlanet) => set({ hoveredPlanet }),

  setAyanamsa: (ayanamsa) => set({ ayanamsa }),

  setHouseSystem: (houseSystem) => set({ houseSystem }),

  reset: () => set(initialState),
}))
