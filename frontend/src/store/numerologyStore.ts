/**
 * Numerology Store
 *
 * Zustand store for numerology calculations and profiles.
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { create } from 'zustand'
import {
  getAllMeanings,
  getNumberMeaning,
  calculateProfile,
  analyzeName,
  calculateCompatibility,
  getDailyNumber,
  type NumberMeaning,
  type NumerologyProfile,
  type NameAnalysis,
  type CompatibilityResult,
  type DailyNumber,
  type ProfileRequest,
} from '@/lib/api/numerology'

interface NumerologyState {
  // Data
  meanings: Record<number, NumberMeaning>
  currentProfile: NumerologyProfile | null
  nameAnalysis: NameAnalysis | null
  compatibility: CompatibilityResult | null
  dailyNumber: DailyNumber | null
  profileHistory: NumerologyProfile[]

  // UI State
  isLoading: boolean
  isCalculating: boolean
  error: string | null
  selectedNumber: number | null

  // Actions
  fetchAllMeanings: () => Promise<void>
  fetchNumberMeaning: (number: number) => Promise<NumberMeaning | null>
  calculateFullProfile: (request: ProfileRequest) => Promise<NumerologyProfile | null>
  analyzeNameNumber: (name: string) => Promise<NameAnalysis | null>
  checkCompatibility: (number1: number, number2: number) => Promise<CompatibilityResult | null>
  fetchDailyNumber: () => Promise<void>
  setSelectedNumber: (number: number | null) => void
  clearProfile: () => void
  clearError: () => void
}

export const useNumerologyStore = create<NumerologyState>((set, get) => ({
  // Initial state
  meanings: {},
  currentProfile: null,
  nameAnalysis: null,
  compatibility: null,
  dailyNumber: null,
  profileHistory: [],
  isLoading: false,
  isCalculating: false,
  error: null,
  selectedNumber: null,

  // Actions
  fetchAllMeanings: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getAllMeanings()
      set({ meanings: data.meanings, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch meanings',
        isLoading: false,
      })
    }
  },

  fetchNumberMeaning: async (number: number) => {
    set({ isLoading: true, error: null })
    try {
      const meaning = await getNumberMeaning(number)
      set((state) => ({
        meanings: { ...state.meanings, [number]: meaning },
        selectedNumber: number,
        isLoading: false,
      }))
      return meaning
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch number meaning',
        isLoading: false,
      })
      return null
    }
  },

  calculateFullProfile: async (request: ProfileRequest) => {
    set({ isCalculating: true, error: null })
    try {
      const profile = await calculateProfile(request)
      set((state) => ({
        currentProfile: profile,
        profileHistory: [profile, ...state.profileHistory].slice(0, 10), // Keep last 10
        isCalculating: false,
      }))
      return profile
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate profile',
        isCalculating: false,
      })
      return null
    }
  },

  analyzeNameNumber: async (name: string) => {
    set({ isCalculating: true, error: null })
    try {
      const analysis = await analyzeName(name)
      set({ nameAnalysis: analysis, isCalculating: false })
      return analysis
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze name',
        isCalculating: false,
      })
      return null
    }
  },

  checkCompatibility: async (number1: number, number2: number) => {
    set({ isCalculating: true, error: null })
    try {
      const result = await calculateCompatibility(number1, number2)
      set({ compatibility: result, isCalculating: false })
      return result
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate compatibility',
        isCalculating: false,
      })
      return null
    }
  },

  fetchDailyNumber: async () => {
    set({ isLoading: true, error: null })
    try {
      const daily = await getDailyNumber()
      set({ dailyNumber: daily, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch daily number',
        isLoading: false,
      })
    }
  },

  setSelectedNumber: (number: number | null) => {
    set({ selectedNumber: number })
  },

  clearProfile: () => {
    set({ currentProfile: null, nameAnalysis: null, compatibility: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))
