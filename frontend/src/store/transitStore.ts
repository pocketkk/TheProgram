/**
 * Transit Store
 *
 * State management for transit analysis using Zustand.
 * Part of Phase 3: Advanced Transit Analysis
 */
import { create } from 'zustand'
import * as transitApi from '@/lib/api/transits'
import type {
  CurrentTransitsResponse,
  TransitTimelineResponse,
  UpcomingTransit,
  DailySnapshotResponse,
  TransitAspect,
  TransitInterpretation,
  AIDailyForecastResponse,
  AITransitReportResponse
} from '@/lib/api/transits'

interface TransitState {
  // Current transits
  currentTransits: CurrentTransitsResponse | null
  upcomingTransits: UpcomingTransit[]
  dailySnapshot: DailySnapshotResponse | null

  // Timeline
  timeline: TransitTimelineResponse | null
  timelineStartDate: string
  timelineEndDate: string

  // Selected transit for detail view
  selectedTransit: TransitAspect | null
  selectedInterpretation: TransitInterpretation | null

  // AI Features
  dailyForecast: AIDailyForecastResponse | null
  transitReport: AITransitReportResponse | null
  aiInterpretation: string | null
  isAILoading: boolean

  // Settings
  currentBirthDataId: string | null
  zodiac: 'tropical' | 'sidereal'
  daysAhead: number
  transitDate: string | null  // ISO date string, null = "now"

  // UI State
  isLoading: boolean
  error: string | null
  lastUpdated: string | null

  // Actions
  setBirthDataId: (id: string) => void
  setZodiac: (zodiac: 'tropical' | 'sidereal') => void
  setDaysAhead: (days: number) => void
  setTransitDate: (date: string | null) => void  // null = reset to "now"

  fetchCurrentTransits: (birthDataId?: string, date?: string) => Promise<void>
  fetchUpcomingTransits: (birthDataId?: string, days?: number) => Promise<void>
  fetchDailySnapshot: (birthDataId?: string, date?: string) => Promise<void>
  fetchTimeline: (startDate: string, endDate: string) => Promise<void>

  selectTransit: (transit: TransitAspect) => Promise<void>
  clearSelectedTransit: () => void

  // AI Actions
  fetchDailyForecast: (birthDataId?: string, date?: string) => Promise<void>
  fetchTransitReport: (reportType?: 'comprehensive' | 'highlights' | 'brief') => Promise<void>
  fetchAITransitInterpretation: (transit: TransitAspect) => Promise<void>
  clearAIContent: () => void

  refreshAll: () => Promise<void>
  clearError: () => void
}

// Default date range (current month)
const getDefaultDateRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0) // Next month end
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

const defaultRange = getDefaultDateRange()

export const useTransitStore = create<TransitState>((set, get) => ({
  // Initial state
  currentTransits: null,
  upcomingTransits: [],
  dailySnapshot: null,
  timeline: null,
  timelineStartDate: defaultRange.start,
  timelineEndDate: defaultRange.end,
  selectedTransit: null,
  selectedInterpretation: null,
  // AI Features
  dailyForecast: null,
  transitReport: null,
  aiInterpretation: null,
  isAILoading: false,
  // Settings
  currentBirthDataId: null,
  zodiac: 'tropical',
  daysAhead: 30,
  transitDate: null,  // null = "now"
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Settings actions
  setBirthDataId: (id) => set({ currentBirthDataId: id }),
  setZodiac: (zodiac) => set({ zodiac }),
  setDaysAhead: (days) => set({ daysAhead: days }),
  setTransitDate: (date) => set({ transitDate: date }),

  // Fetch current transits
  fetchCurrentTransits: async (birthDataId, date) => {
    const id = birthDataId || get().currentBirthDataId
    if (!id) {
      set({ error: 'No birth data selected' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const { zodiac, transitDate } = get()
      const targetDate = date ?? transitDate
      // Use POST endpoint when date is specified, GET for "now"
      const transits = targetDate
        ? await transitApi.getCurrentTransits({
            birth_data_id: id,
            transit_date: targetDate,
            zodiac
          })
        : await transitApi.getCurrentTransitsSimple(id, zodiac)
      set({
        currentTransits: transits,
        isLoading: false,
        lastUpdated: new Date().toISOString()
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch transits',
        isLoading: false
      })
    }
  },

  // Fetch upcoming transits
  fetchUpcomingTransits: async (birthDataId, days) => {
    const id = birthDataId || get().currentBirthDataId
    if (!id) return

    set({ isLoading: true, error: null })
    try {
      const { zodiac, daysAhead } = get()
      const response = await transitApi.getUpcomingTransits(id, days || daysAhead, zodiac)
      set({
        upcomingTransits: response.upcoming_transits,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch upcoming transits',
        isLoading: false
      })
    }
  },

  // Fetch daily snapshot
  fetchDailySnapshot: async (birthDataId, date) => {
    const id = birthDataId || get().currentBirthDataId
    if (!id) return

    set({ isLoading: true, error: null })
    try {
      const { zodiac } = get()
      const snapshot = await transitApi.getDailySnapshot(id, date, zodiac)
      set({
        dailySnapshot: snapshot,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch daily snapshot',
        isLoading: false
      })
    }
  },

  // Fetch timeline
  fetchTimeline: async (startDate, endDate) => {
    const { currentBirthDataId, zodiac } = get()
    if (!currentBirthDataId) return

    set({ isLoading: true, error: null, timelineStartDate: startDate, timelineEndDate: endDate })
    try {
      const timeline = await transitApi.getTransitTimeline({
        birth_data_id: currentBirthDataId,
        start_date: startDate,
        end_date: endDate,
        zodiac,
        interval_days: 1
      })
      set({
        timeline,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch timeline',
        isLoading: false
      })
    }
  },

  // Select transit and get interpretation
  selectTransit: async (transit) => {
    set({ selectedTransit: transit, selectedInterpretation: null })
    try {
      const interpretation = await transitApi.getTransitInterpretation(
        transit.transit_planet,
        transit.natal_planet,
        transit.aspect
      )
      set({ selectedInterpretation: interpretation })
    } catch (error) {
      // Non-critical, just log
      console.error('Failed to get interpretation:', error)
    }
  },

  clearSelectedTransit: () => set({ selectedTransit: null, selectedInterpretation: null }),

  // AI Actions
  fetchDailyForecast: async (birthDataId, date) => {
    const id = birthDataId || get().currentBirthDataId
    if (!id) return

    set({ isAILoading: true, error: null })
    try {
      const { zodiac } = get()
      const forecast = await transitApi.getAIDailyForecast(id, date, zodiac)
      set({
        dailyForecast: forecast,
        isAILoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate daily forecast',
        isAILoading: false
      })
    }
  },

  fetchTransitReport: async (reportType = 'comprehensive') => {
    const { currentBirthDataId, zodiac } = get()
    if (!currentBirthDataId) return

    set({ isAILoading: true, error: null })
    try {
      const report = await transitApi.getAITransitReport(currentBirthDataId, reportType, zodiac)
      set({
        transitReport: report,
        isAILoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate transit report',
        isAILoading: false
      })
    }
  },

  fetchAITransitInterpretation: async (transit) => {
    set({ isAILoading: true, aiInterpretation: null })
    try {
      const response = await transitApi.getAITransitInterpretation(transit)
      set({
        aiInterpretation: response.interpretation,
        isAILoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get AI interpretation',
        isAILoading: false
      })
    }
  },

  clearAIContent: () => set({
    dailyForecast: null,
    transitReport: null,
    aiInterpretation: null
  }),

  // Refresh all data
  refreshAll: async () => {
    const { currentBirthDataId, timelineStartDate, timelineEndDate, transitDate } = get()
    if (!currentBirthDataId) return

    await Promise.all([
      get().fetchCurrentTransits(),
      get().fetchUpcomingTransits(),
      get().fetchDailySnapshot(undefined, transitDate || undefined),
      get().fetchTimeline(timelineStartDate, timelineEndDate)
    ])
  },

  clearError: () => set({ error: null })
}))
