/**
 * Timeline View Store
 *
 * State management for the Timeline calendar and day view.
 * Manages navigation, newspaper state, and UI modes.
 */
import { create } from 'zustand'

interface NewspaperContent {
  headline: string
  date_display: string
  sections: Array<{
    name: string
    articles: Array<{
      headline: string
      content: string
      year: number
      significance?: string
    }>
  }>
  style: 'victorian' | 'modern'
}

interface TimelineViewState {
  // Navigation
  currentMonth: number
  currentYear: number

  // Day View
  selectedDay: string | null  // YYYY-MM-DD or null
  dayViewMode: 'combined' | 'newspaper' | 'transits' | 'journal'

  // Newspaper state
  newspaperPage: number
  activeSection: string
  newspaperData: Record<string, NewspaperContent>  // Cached by MM-DD
  newspaperStyle: 'victorian' | 'modern'

  // Loading states
  isLoadingNewspaper: boolean
  isLoadingTransits: boolean

  // Actions
  setMonth: (month: number, year: number) => void
  nextMonth: () => void
  prevMonth: () => void
  goToToday: () => void
  selectDay: (date: string | null) => void
  setDayViewMode: (mode: TimelineViewState['dayViewMode']) => void
  setNewspaperPage: (page: number) => void
  flipNewspaperPage: (direction: 'next' | 'prev') => void
  setActiveSection: (section: string) => void
  setNewspaperStyle: (style: 'victorian' | 'modern') => void
  cacheNewspaperData: (monthDay: string, data: NewspaperContent) => void
  setLoadingNewspaper: (loading: boolean) => void
  setLoadingTransits: (loading: boolean) => void
}

export const useTimelineViewStore = create<TimelineViewState>((set, get) => ({
  // Initial state - current month
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDay: null,
  dayViewMode: 'combined',
  newspaperPage: 0,
  activeSection: 'FRONT PAGE',
  newspaperData: {},
  newspaperStyle: 'victorian',
  isLoadingNewspaper: false,
  isLoadingTransits: false,

  // Navigation actions
  setMonth: (month, year) => {
    set({ currentMonth: month, currentYear: year })
  },

  nextMonth: () => {
    const { currentMonth, currentYear } = get()
    if (currentMonth === 11) {
      set({ currentMonth: 0, currentYear: currentYear + 1 })
    } else {
      set({ currentMonth: currentMonth + 1 })
    }
  },

  prevMonth: () => {
    const { currentMonth, currentYear } = get()
    if (currentMonth === 0) {
      set({ currentMonth: 11, currentYear: currentYear - 1 })
    } else {
      set({ currentMonth: currentMonth - 1 })
    }
  },

  goToToday: () => {
    const now = new Date()
    set({
      currentMonth: now.getMonth(),
      currentYear: now.getFullYear(),
      selectedDay: null
    })
  },

  // Day view actions
  selectDay: (date) => {
    set({
      selectedDay: date,
      // Reset newspaper to first page when changing days
      newspaperPage: date ? 0 : get().newspaperPage,
      activeSection: date ? 'FRONT PAGE' : get().activeSection
    })
  },

  setDayViewMode: (mode) => set({ dayViewMode: mode }),

  // Newspaper actions
  setNewspaperPage: (page) => set({ newspaperPage: page }),

  flipNewspaperPage: (direction) => {
    const { newspaperPage } = get()
    if (direction === 'next') {
      set({ newspaperPage: newspaperPage + 1 })
    } else if (direction === 'prev' && newspaperPage > 0) {
      set({ newspaperPage: newspaperPage - 1 })
    }
  },

  setActiveSection: (section) => set({ activeSection: section }),

  setNewspaperStyle: (style) => set({ newspaperStyle: style }),

  cacheNewspaperData: (monthDay, data) => {
    set((state) => ({
      newspaperData: {
        ...state.newspaperData,
        [monthDay]: data
      }
    }))
  },

  // Loading state actions
  setLoadingNewspaper: (loading) => set({ isLoadingNewspaper: loading }),
  setLoadingTransits: (loading) => set({ isLoadingTransits: loading })
}))
