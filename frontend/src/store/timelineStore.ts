/**
 * Timeline Store
 *
 * State management for user events and transit timeline using Zustand.
 * Part of Phase 2: Transit Timeline
 */
import { create } from 'zustand'
import * as timelineApi from '@/lib/api/timeline'
import type {
  UserEvent,
  UserEventWithTransits,
  UserEventCreate,
  UserEventUpdate,
  TransitContext,
  TimelineRangeResponse
} from '@/lib/api/timeline'

interface TimelineState {
  // State
  events: UserEvent[]
  currentEvent: UserEventWithTransits | null
  timelineData: TimelineRangeResponse | null
  isLoading: boolean
  isEditing: boolean
  error: string | null

  // View settings
  currentBirthDataId: string | null
  viewStartDate: string
  viewEndDate: string
  selectedCategories: string[]
  selectedImportance: string[]

  // Available options
  categories: string[]
  importanceLevels: string[]

  // Event actions
  fetchEvents: (params?: timelineApi.UserEventListParams) => Promise<void>
  fetchEvent: (eventId: string) => Promise<void>
  createEvent: (data: UserEventCreate) => Promise<UserEvent>
  updateEvent: (eventId: string, data: UserEventUpdate) => Promise<UserEvent>
  deleteEvent: (eventId: string) => Promise<void>

  // Timeline actions
  fetchTimelineRange: (birthDataId: string, startDate: string, endDate: string) => Promise<void>

  // Transit context actions
  fetchTransitContext: (birthDataId: string, date: string) => Promise<TransitContext>

  // View actions
  setBirthDataId: (birthDataId: string) => void
  setViewRange: (startDate: string, endDate: string) => void
  setSelectedCategories: (categories: string[]) => void
  setSelectedImportance: (levels: string[]) => void

  // Options actions
  fetchCategories: () => Promise<void>
  fetchImportanceLevels: () => Promise<void>

  // UI actions
  setEditing: (editing: boolean) => void
  clearCurrentEvent: () => void
  clearError: () => void
}

// Helper to get date range defaults (current month)
const getDefaultDateRange = () => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0],
  }
}

const defaultRange = getDefaultDateRange()

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // Initial state
  events: [],
  currentEvent: null,
  timelineData: null,
  isLoading: false,
  isEditing: false,
  error: null,

  currentBirthDataId: null,
  viewStartDate: defaultRange.start,
  viewEndDate: defaultRange.end,
  selectedCategories: [],
  selectedImportance: [],

  categories: [],
  importanceLevels: ['minor', 'moderate', 'major', 'transformative'],

  // Fetch events
  fetchEvents: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const { currentBirthDataId, selectedCategories, viewStartDate, viewEndDate } = get()
      const events = await timelineApi.listUserEvents({
        ...params,
        birth_data_id: params?.birth_data_id || currentBirthDataId || undefined,
        category: selectedCategories[0], // API supports single category
        date_from: viewStartDate,
        date_to: viewEndDate,
      })
      set({ events, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch events', isLoading: false })
    }
  },

  // Fetch single event
  fetchEvent: async (eventId) => {
    set({ isLoading: true, error: null })
    try {
      const event = await timelineApi.getUserEvent(eventId)
      set({ currentEvent: event, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch event', isLoading: false })
    }
  },

  // Create event
  createEvent: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const event = await timelineApi.createUserEvent(data)
      set(state => ({
        events: [event, ...state.events].sort((a, b) =>
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        ),
        isLoading: false,
        isEditing: false,
      }))
      return event
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create event', isLoading: false })
      throw error
    }
  },

  // Update event
  updateEvent: async (eventId, data) => {
    set({ isLoading: true, error: null })
    try {
      const event = await timelineApi.updateUserEvent(eventId, data)
      set(state => ({
        events: state.events.map(e => e.id === eventId ? event : e)
          .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()),
        currentEvent: state.currentEvent?.id === eventId
          ? { ...state.currentEvent, ...event }
          : state.currentEvent,
        isLoading: false,
        isEditing: false,
      }))
      return event
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update event', isLoading: false })
      throw error
    }
  },

  // Delete event
  deleteEvent: async (eventId) => {
    set({ isLoading: true, error: null })
    try {
      await timelineApi.deleteUserEvent(eventId)
      set(state => ({
        events: state.events.filter(e => e.id !== eventId),
        currentEvent: state.currentEvent?.id === eventId ? null : state.currentEvent,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete event', isLoading: false })
      throw error
    }
  },

  // Fetch timeline range
  fetchTimelineRange: async (birthDataId, startDate, endDate) => {
    set({ isLoading: true, error: null })
    try {
      const { selectedCategories } = get()
      const data = await timelineApi.getTimelineRange({
        birth_data_id: birthDataId,
        start_date: startDate,
        end_date: endDate,
        include_events: true,
        include_transits: true,
        event_categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      })
      set({
        timelineData: data,
        currentBirthDataId: birthDataId,
        viewStartDate: startDate,
        viewEndDate: endDate,
        isLoading: false
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch timeline', isLoading: false })
    }
  },

  // Fetch transit context for a date
  fetchTransitContext: async (birthDataId, date) => {
    try {
      return await timelineApi.getTransitContextByDate(birthDataId, date)
    } catch (error) {
      console.error('Failed to fetch transit context:', error)
      throw error
    }
  },

  // View actions
  setBirthDataId: (birthDataId) => set({ currentBirthDataId: birthDataId }),
  setViewRange: (startDate, endDate) => set({ viewStartDate: startDate, viewEndDate: endDate }),
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),
  setSelectedImportance: (levels) => set({ selectedImportance: levels }),

  // Fetch categories
  fetchCategories: async () => {
    try {
      const categories = await timelineApi.getEventCategories()
      set({ categories })
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  },

  // Fetch importance levels
  fetchImportanceLevels: async () => {
    try {
      const levels = await timelineApi.getImportanceLevels()
      set({ importanceLevels: levels })
    } catch (error) {
      console.error('Failed to fetch importance levels:', error)
    }
  },

  // UI actions
  setEditing: (editing) => set({ isEditing: editing }),
  clearCurrentEvent: () => set({ currentEvent: null }),
  clearError: () => set({ error: null }),
}))
