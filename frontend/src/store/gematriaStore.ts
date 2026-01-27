/**
 * Gematria Store
 *
 * Zustand store for gematria calculations and analysis.
 */
import { create } from 'zustand'
import {
  calculateGematria,
  analyzeName,
  getEquivalences,
  getNumberMeaning,
  getAllMeanings,
  getProfileGematria,
  type AllSystemsResult,
  type GematriaResult,
  type EquivalentWord,
  type NumberMeaning,
  type GematriaSystem,
} from '@/lib/api/gematria'

interface GematriaState {
  // Data
  currentAnalysis: AllSystemsResult | null
  meanings: Record<number, NumberMeaning>
  equivalences: EquivalentWord[]
  selectedValue: number | null
  selectedSystem: GematriaSystem

  // History
  analysisHistory: Array<{
    text: string
    analysis: AllSystemsResult
    timestamp: number
  }>

  // UI State
  isLoading: boolean
  isCalculating: boolean
  error: string | null

  // Actions
  calculate: (text: string, system?: GematriaSystem) => Promise<AllSystemsResult | GematriaResult | null>
  analyze: (name: string) => Promise<AllSystemsResult | null>
  fetchEquivalences: (value: number, system?: 'hebrew' | 'english') => Promise<EquivalentWord[]>
  fetchMeaning: (value: number) => Promise<NumberMeaning | null>
  fetchAllMeanings: () => Promise<void>
  analyzeProfile: (profileId: string) => Promise<AllSystemsResult | null>
  setSelectedValue: (value: number | null) => void
  setSelectedSystem: (system: GematriaSystem) => void
  clearAnalysis: () => void
  clearError: () => void
}

export const useGematriaStore = create<GematriaState>((set, get) => ({
  // Initial state
  currentAnalysis: null,
  meanings: {},
  equivalences: [],
  selectedValue: null,
  selectedSystem: 'all',
  analysisHistory: [],
  isLoading: false,
  isCalculating: false,
  error: null,

  // Actions
  calculate: async (text: string, system: GematriaSystem = 'all') => {
    set({ isCalculating: true, error: null })
    try {
      const result = await calculateGematria(text, system)

      // If result has 'systems', it's an AllSystemsResult
      if ('systems' in result) {
        set((state) => ({
          currentAnalysis: result,
          analysisHistory: [
            { text, analysis: result, timestamp: Date.now() },
            ...state.analysisHistory,
          ].slice(0, 20), // Keep last 20
          isCalculating: false,
        }))
        return result
      }

      // Single system result - wrap it
      const wrapped: AllSystemsResult = {
        original_text: text,
        systems: { [system as string]: result },
      }
      set((state) => ({
        currentAnalysis: wrapped,
        analysisHistory: [
          { text, analysis: wrapped, timestamp: Date.now() },
          ...state.analysisHistory,
        ].slice(0, 20),
        isCalculating: false,
      }))
      return result
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate gematria',
        isCalculating: false,
      })
      return null
    }
  },

  analyze: async (name: string) => {
    set({ isCalculating: true, error: null })
    try {
      const result = await analyzeName(name)
      set((state) => ({
        currentAnalysis: result,
        analysisHistory: [
          { text: name, analysis: result, timestamp: Date.now() },
          ...state.analysisHistory,
        ].slice(0, 20),
        isCalculating: false,
      }))
      return result
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze name',
        isCalculating: false,
      })
      return null
    }
  },

  fetchEquivalences: async (value: number, system: 'hebrew' | 'english' = 'hebrew') => {
    set({ isLoading: true, error: null })
    try {
      const result = await getEquivalences(value, system)
      set({ equivalences: result.words, selectedValue: value, isLoading: false })
      return result.words
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch equivalences',
        isLoading: false,
      })
      return []
    }
  },

  fetchMeaning: async (value: number) => {
    set({ isLoading: true, error: null })
    try {
      const result = await getNumberMeaning(value)
      if (result.has_known_meaning) {
        const meaning: NumberMeaning = {
          name: result.name!,
          meaning: result.meaning!,
          keywords: result.keywords!,
          hebrew_connection: result.hebrew_connection,
        }
        set((state) => ({
          meanings: { ...state.meanings, [value]: meaning },
          isLoading: false,
        }))
        return meaning
      }
      set({ isLoading: false })
      return null
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch meaning',
        isLoading: false,
      })
      return null
    }
  },

  fetchAllMeanings: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await getAllMeanings()
      set({ meanings: result.meanings, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch meanings',
        isLoading: false,
      })
    }
  },

  analyzeProfile: async (profileId: string) => {
    set({ isCalculating: true, error: null })
    try {
      const result = await getProfileGematria(profileId)
      set((state) => ({
        currentAnalysis: result.analysis,
        analysisHistory: [
          {
            text: result.profile_name,
            analysis: result.analysis,
            timestamp: Date.now(),
          },
          ...state.analysisHistory,
        ].slice(0, 20),
        isCalculating: false,
      }))
      return result.analysis
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze profile',
        isCalculating: false,
      })
      return null
    }
  },

  setSelectedValue: (value: number | null) => {
    set({ selectedValue: value })
  },

  setSelectedSystem: (system: GematriaSystem) => {
    set({ selectedSystem: system })
  },

  clearAnalysis: () => {
    set({ currentAnalysis: null, equivalences: [], selectedValue: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))
