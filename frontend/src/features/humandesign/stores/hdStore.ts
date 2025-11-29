/**
 * Human Design state store
 */
import { create } from 'zustand'
import {
  HDChartResponse,
  HDFullReadingResponse,
  calculateHDChart,
  getFullHDReading,
} from '@/lib/api/humanDesign'
import type { Selection, HDViewMode } from '../types'

interface HDStore {
  // Chart data
  chart: HDChartResponse | null
  reading: HDFullReadingResponse | null

  // Loading states
  isLoading: boolean
  isLoadingReading: boolean
  error: string | null

  // UI state
  viewMode: HDViewMode
  selection: Selection
  showDesignGates: boolean
  showPersonalityGates: boolean
  showChannels: boolean
  highlightedCenter: string | null
  highlightedGate: number | null
  highlightedChannel: string | null

  // Calculation options
  zodiac: 'tropical' | 'sidereal'
  siderealMethod: 'shift_positions' | 'shift_wheel'
  ayanamsa: string
  includeVariables: boolean

  // Actions
  calculateChart: (birthDataId: string) => Promise<void>
  generateReading: (birthDataId: string) => Promise<void>
  setViewMode: (mode: HDViewMode) => void
  setSelection: (selection: Selection) => void
  clearSelection: () => void
  toggleDesignGates: () => void
  togglePersonalityGates: () => void
  toggleChannels: () => void
  setHighlightedCenter: (center: string | null) => void
  setHighlightedGate: (gate: number | null) => void
  setHighlightedChannel: (channel: string | null) => void
  setZodiac: (zodiac: 'tropical' | 'sidereal') => void
  setSiderealMethod: (method: 'shift_positions' | 'shift_wheel') => void
  setAyanamsa: (ayanamsa: string) => void
  setIncludeVariables: (include: boolean) => void
  reset: () => void
}

const initialState = {
  chart: null,
  reading: null,
  isLoading: false,
  isLoadingReading: false,
  error: null,
  viewMode: 'bodygraph' as HDViewMode,
  selection: { type: 'none' as const, id: null },
  showDesignGates: true,
  showPersonalityGates: true,
  showChannels: true,
  highlightedCenter: null,
  highlightedGate: null,
  highlightedChannel: null,
  zodiac: 'tropical' as const,
  siderealMethod: 'shift_positions' as const,
  ayanamsa: 'lahiri',
  includeVariables: true,
}

export const useHDStore = create<HDStore>((set, get) => ({
  ...initialState,

  calculateChart: async (birthDataId: string) => {
    set({ isLoading: true, error: null })

    try {
      const { zodiac, siderealMethod, ayanamsa, includeVariables } = get()

      const chart = await calculateHDChart(birthDataId, {
        zodiac,
        sidereal_method: zodiac === 'sidereal' ? siderealMethod : undefined,
        ayanamsa: zodiac === 'sidereal' ? ayanamsa : undefined,
        include_variables: includeVariables,
      })

      set({ chart, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate chart',
        isLoading: false
      })
    }
  },

  generateReading: async (birthDataId: string) => {
    set({ isLoadingReading: true, error: null })

    try {
      const { zodiac, siderealMethod, ayanamsa, includeVariables } = get()

      const reading = await getFullHDReading(birthDataId, {
        zodiac,
        sidereal_method: zodiac === 'sidereal' ? siderealMethod : undefined,
        ayanamsa: zodiac === 'sidereal' ? ayanamsa : undefined,
        include_variables: includeVariables,
      })

      set({ reading, isLoadingReading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate reading',
        isLoadingReading: false
      })
    }
  },

  setViewMode: (viewMode) => set({ viewMode }),

  setSelection: (selection) => set({ selection }),

  clearSelection: () => set({ selection: { type: 'none', id: null } }),

  toggleDesignGates: () => set((state) => ({
    showDesignGates: !state.showDesignGates
  })),

  togglePersonalityGates: () => set((state) => ({
    showPersonalityGates: !state.showPersonalityGates
  })),

  toggleChannels: () => set((state) => ({
    showChannels: !state.showChannels
  })),

  setHighlightedCenter: (highlightedCenter) => set({ highlightedCenter }),

  setHighlightedGate: (highlightedGate) => set({ highlightedGate }),

  setHighlightedChannel: (highlightedChannel) => set({ highlightedChannel }),

  setZodiac: (zodiac) => set({ zodiac }),

  setSiderealMethod: (siderealMethod) => set({ siderealMethod }),

  setAyanamsa: (ayanamsa) => set({ ayanamsa }),

  setIncludeVariables: (includeVariables) => set({ includeVariables }),

  reset: () => set(initialState),
}))
