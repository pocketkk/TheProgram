/**
 * Myers-Briggs state store
 */
import { create } from 'zustand'
import {
  MBTypeResponse,
  MBFullReadingResponse,
  calculateMBType,
  getFullMBReading,
} from '@/lib/api/myersBriggs'
import type { Selection, MBViewMode } from '../types'

interface MBStore {
  // Type data
  mbType: MBTypeResponse | null
  reading: MBFullReadingResponse | null

  // Loading states
  isLoading: boolean
  isLoadingReading: boolean
  error: string | null

  // UI state
  viewMode: MBViewMode
  selection: Selection
  highlightedDichotomy: string | null
  highlightedFunction: string | null

  // Calculation options
  includeCorrelations: boolean

  // Actions
  calculateType: (birthDataId: string) => Promise<void>
  generateReading: (birthDataId: string) => Promise<void>
  setViewMode: (mode: MBViewMode) => void
  setSelection: (selection: Selection) => void
  clearSelection: () => void
  setHighlightedDichotomy: (dichotomy: string | null) => void
  setHighlightedFunction: (func: string | null) => void
  setIncludeCorrelations: (include: boolean) => void
  reset: () => void
}

const initialState = {
  mbType: null,
  reading: null,
  isLoading: false,
  isLoadingReading: false,
  error: null,
  viewMode: 'overview' as MBViewMode,
  selection: { type: 'none' as const, id: null },
  highlightedDichotomy: null,
  highlightedFunction: null,
  includeCorrelations: false,
}

export const useMBStore = create<MBStore>((set, get) => ({
  ...initialState,

  calculateType: async (birthDataId: string) => {
    set({ isLoading: true, error: null })

    try {
      const { includeCorrelations } = get()

      const mbType = await calculateMBType(birthDataId, {
        include_cognitive_stack: true,
        include_correlations: includeCorrelations,
      })

      set({ mbType, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate type',
        isLoading: false
      })
    }
  },

  generateReading: async (birthDataId: string) => {
    set({ isLoadingReading: true, error: null })

    try {
      const { includeCorrelations } = get()

      const reading = await getFullMBReading(birthDataId, includeCorrelations)

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

  setHighlightedDichotomy: (highlightedDichotomy) => set({ highlightedDichotomy }),

  setHighlightedFunction: (highlightedFunction) => set({ highlightedFunction }),

  setIncludeCorrelations: (includeCorrelations) => set({ includeCorrelations }),

  reset: () => set(initialState),
}))
