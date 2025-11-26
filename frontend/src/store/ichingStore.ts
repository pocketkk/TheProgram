/**
 * I-Ching Store
 *
 * Zustand store for I-Ching readings and hexagram data.
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { create } from 'zustand'
import {
  getAllHexagrams,
  getHexagram,
  getTrigrams,
  performReading,
  quickCast,
  getDailyHexagram,
  searchHexagrams,
  type Hexagram,
  type Trigram,
  type Reading,
  type DailyHexagram,
  type ReadingRequest,
} from '@/lib/api/iching'

interface IChingState {
  // Data
  hexagrams: Record<number, Hexagram>
  trigrams: Record<string, Trigram>
  currentReading: Reading | null
  dailyHexagram: DailyHexagram | null
  readingHistory: Reading[]
  searchResults: Hexagram[]

  // UI State
  isLoading: boolean
  isReadingInProgress: boolean
  error: string | null
  selectedHexagram: Hexagram | null
  castingMethod: 'coins' | 'yarrow'

  // Actions
  fetchAllHexagrams: () => Promise<void>
  fetchHexagram: (number: number) => Promise<Hexagram | null>
  fetchTrigrams: () => Promise<void>
  performNewReading: (request: ReadingRequest) => Promise<Reading | null>
  performQuickCast: () => Promise<Reading | null>
  fetchDailyHexagram: () => Promise<void>
  searchForHexagrams: (keyword: string) => Promise<void>
  setCastingMethod: (method: 'coins' | 'yarrow') => void
  selectHexagram: (hexagram: Hexagram | null) => void
  clearCurrentReading: () => void
  clearError: () => void
}

export const useIChingStore = create<IChingState>((set, get) => ({
  // Initial state
  hexagrams: {},
  trigrams: {},
  currentReading: null,
  dailyHexagram: null,
  readingHistory: [],
  searchResults: [],
  isLoading: false,
  isReadingInProgress: false,
  error: null,
  selectedHexagram: null,
  castingMethod: 'coins',

  // Actions
  fetchAllHexagrams: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getAllHexagrams()
      set({ hexagrams: data.hexagrams, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch hexagrams',
        isLoading: false,
      })
    }
  },

  fetchHexagram: async (number: number) => {
    set({ isLoading: true, error: null })
    try {
      const hexagram = await getHexagram(number)
      // Update in local cache
      set((state) => ({
        hexagrams: { ...state.hexagrams, [number]: hexagram },
        selectedHexagram: hexagram,
        isLoading: false,
      }))
      return hexagram
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch hexagram',
        isLoading: false,
      })
      return null
    }
  },

  fetchTrigrams: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getTrigrams()
      set({ trigrams: data.trigrams, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch trigrams',
        isLoading: false,
      })
    }
  },

  performNewReading: async (request: ReadingRequest) => {
    set({ isReadingInProgress: true, error: null })
    try {
      const reading = await performReading({
        ...request,
        method: request.method || get().castingMethod,
      })
      set((state) => ({
        currentReading: reading,
        readingHistory: [reading, ...state.readingHistory].slice(0, 20), // Keep last 20
        isReadingInProgress: false,
      }))
      return reading
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to perform reading',
        isReadingInProgress: false,
      })
      return null
    }
  },

  performQuickCast: async () => {
    set({ isReadingInProgress: true, error: null })
    try {
      const reading = await quickCast(get().castingMethod)
      set((state) => ({
        currentReading: reading,
        readingHistory: [reading, ...state.readingHistory].slice(0, 20),
        isReadingInProgress: false,
      }))
      return reading
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to cast hexagram',
        isReadingInProgress: false,
      })
      return null
    }
  },

  fetchDailyHexagram: async () => {
    set({ isLoading: true, error: null })
    try {
      const daily = await getDailyHexagram()
      set({ dailyHexagram: daily, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch daily hexagram',
        isLoading: false,
      })
    }
  },

  searchForHexagrams: async (keyword: string) => {
    set({ isLoading: true, error: null })
    try {
      const results = await searchHexagrams(keyword)
      set({ searchResults: results.matches, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to search hexagrams',
        isLoading: false,
      })
    }
  },

  setCastingMethod: (method: 'coins' | 'yarrow') => {
    set({ castingMethod: method })
  },

  selectHexagram: (hexagram: Hexagram | null) => {
    set({ selectedHexagram: hexagram })
  },

  clearCurrentReading: () => {
    set({ currentReading: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))
