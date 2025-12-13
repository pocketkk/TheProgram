/**
 * Location History Store
 *
 * Zustand store for managing location history state.
 */
import { create } from 'zustand'
import * as api from '@/lib/api/locationHistory'
import type {
  LocationImport,
  LocationRecord,
  SignificantLocation,
  ImportResult,
  ImportStats,
  TimelineEntry,
  ResidenceHistory,
} from '@/lib/api/locationHistory'

interface LocationHistoryState {
  // Data
  imports: LocationImport[]
  records: LocationRecord[]
  significantLocations: SignificantLocation[]
  timeline: TimelineEntry[]
  residenceHistory: ResidenceHistory | null
  stats: ImportStats | null

  // UI State
  isLoading: boolean
  isImporting: boolean
  error: string | null
  selectedImportId: string | null
  selectedLocationId: string | null

  // Filters
  dateRange: { from: string | null; to: string | null }
  locationTypeFilter: string | null

  // Actions - Imports
  fetchImports: () => Promise<void>
  fetchStats: () => Promise<void>
  importFile: (
    file: File,
    source: 'google_takeout' | 'apple' | 'gpx',
    options?: { dateFrom?: string; dateTo?: string }
  ) => Promise<ImportResult>
  deleteImport: (importId: string) => Promise<void>

  // Actions - Records
  fetchRecords: (params?: api.LocationRecordListParams) => Promise<void>
  updateRecord: (
    recordId: string,
    data: { place_name?: string; place_type?: string }
  ) => Promise<void>
  deleteRecord: (recordId: string) => Promise<void>

  // Actions - Significant Locations
  fetchSignificantLocations: (params?: {
    location_type?: string
    is_residence?: boolean
  }) => Promise<void>
  createSignificantLocation: (
    data: api.SignificantLocationCreate
  ) => Promise<SignificantLocation>
  updateSignificantLocation: (
    locationId: string,
    data: api.SignificantLocationUpdate
  ) => Promise<void>
  deleteSignificantLocation: (locationId: string) => Promise<void>

  // Actions - Timeline
  fetchTimeline: (
    dateFrom: string,
    dateTo: string,
    groupBy?: 'day' | 'week' | 'month'
  ) => Promise<void>
  fetchResidenceHistory: () => Promise<void>

  // UI Actions
  setSelectedImportId: (id: string | null) => void
  setSelectedLocationId: (id: string | null) => void
  setDateRange: (from: string | null, to: string | null) => void
  setLocationTypeFilter: (type: string | null) => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  imports: [],
  records: [],
  significantLocations: [],
  timeline: [],
  residenceHistory: null,
  stats: null,
  isLoading: false,
  isImporting: false,
  error: null,
  selectedImportId: null,
  selectedLocationId: null,
  dateRange: { from: null, to: null },
  locationTypeFilter: null,
}

export const useLocationHistoryStore = create<LocationHistoryState>(
  (set, get) => ({
    ...initialState,

    // =========================================================================
    // Import Actions
    // =========================================================================

    fetchImports: async () => {
      set({ isLoading: true, error: null })
      try {
        const imports = await api.listImports()
        set({ imports, isLoading: false })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch imports',
          isLoading: false,
        })
      }
    },

    fetchStats: async () => {
      set({ isLoading: true, error: null })
      try {
        const stats = await api.getImportStats()
        set({ stats, isLoading: false })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch stats',
          isLoading: false,
        })
      }
    },

    importFile: async (file, source, options) => {
      set({ isImporting: true, error: null })
      try {
        const result = await api.importLocationHistory(file, source, options)

        // Refresh imports and stats after successful import
        await get().fetchImports()
        await get().fetchStats()

        set({ isImporting: false })
        return result
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Import failed',
          isImporting: false,
        })
        throw error
      }
    },

    deleteImport: async (importId) => {
      set({ isLoading: true, error: null })
      try {
        await api.deleteImport(importId)
        set((state) => ({
          imports: state.imports.filter((i) => i.id !== importId),
          isLoading: false,
        }))
        // Refresh stats
        await get().fetchStats()
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to delete import',
          isLoading: false,
        })
        throw error
      }
    },

    // =========================================================================
    // Record Actions
    // =========================================================================

    fetchRecords: async (params) => {
      set({ isLoading: true, error: null })
      try {
        const records = await api.listLocationRecords(params)
        set({ records, isLoading: false })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch records',
          isLoading: false,
        })
      }
    },

    updateRecord: async (recordId, data) => {
      set({ isLoading: true, error: null })
      try {
        const updated = await api.updateLocationRecord(recordId, data)
        set((state) => ({
          records: state.records.map((r) => (r.id === recordId ? updated : r)),
          isLoading: false,
        }))
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to update record',
          isLoading: false,
        })
        throw error
      }
    },

    deleteRecord: async (recordId) => {
      set({ isLoading: true, error: null })
      try {
        await api.deleteLocationRecord(recordId)
        set((state) => ({
          records: state.records.filter((r) => r.id !== recordId),
          isLoading: false,
        }))
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to delete record',
          isLoading: false,
        })
        throw error
      }
    },

    // =========================================================================
    // Significant Location Actions
    // =========================================================================

    fetchSignificantLocations: async (params) => {
      set({ isLoading: true, error: null })
      try {
        const significantLocations = await api.listSignificantLocations(params)
        set({ significantLocations, isLoading: false })
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : 'Failed to fetch locations',
          isLoading: false,
        })
      }
    },

    createSignificantLocation: async (data) => {
      set({ isLoading: true, error: null })
      try {
        const location = await api.createSignificantLocation(data)
        set((state) => ({
          significantLocations: [location, ...state.significantLocations],
          isLoading: false,
        }))
        return location
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : 'Failed to create location',
          isLoading: false,
        })
        throw error
      }
    },

    updateSignificantLocation: async (locationId, data) => {
      set({ isLoading: true, error: null })
      try {
        const updated = await api.updateSignificantLocation(locationId, data)
        set((state) => ({
          significantLocations: state.significantLocations.map((l) =>
            l.id === locationId ? updated : l
          ),
          isLoading: false,
        }))
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : 'Failed to update location',
          isLoading: false,
        })
        throw error
      }
    },

    deleteSignificantLocation: async (locationId) => {
      set({ isLoading: true, error: null })
      try {
        await api.deleteSignificantLocation(locationId)
        set((state) => ({
          significantLocations: state.significantLocations.filter(
            (l) => l.id !== locationId
          ),
          isLoading: false,
        }))
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : 'Failed to delete location',
          isLoading: false,
        })
        throw error
      }
    },

    // =========================================================================
    // Timeline Actions
    // =========================================================================

    fetchTimeline: async (dateFrom, dateTo, groupBy = 'day') => {
      set({ isLoading: true, error: null })
      try {
        const timeline = await api.getLocationTimeline(dateFrom, dateTo, groupBy)
        set({ timeline, isLoading: false })
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : 'Failed to fetch timeline',
          isLoading: false,
        })
      }
    },

    fetchResidenceHistory: async () => {
      set({ isLoading: true, error: null })
      try {
        const residenceHistory = await api.getResidenceHistory()
        set({ residenceHistory, isLoading: false })
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch residence history',
          isLoading: false,
        })
      }
    },

    // =========================================================================
    // UI Actions
    // =========================================================================

    setSelectedImportId: (id) => set({ selectedImportId: id }),
    setSelectedLocationId: (id) => set({ selectedLocationId: id }),
    setDateRange: (from, to) => set({ dateRange: { from, to } }),
    setLocationTypeFilter: (type) => set({ locationTypeFilter: type }),
    clearError: () => set({ error: null }),
    reset: () => set(initialState),
  })
)
