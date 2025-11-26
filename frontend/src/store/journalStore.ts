/**
 * Journal Store
 *
 * State management for journal entries using Zustand.
 * Part of Phase 2: Journal System
 */
import { create } from 'zustand'
import * as journalApi from '@/lib/api/journal'
import type { JournalEntry, JournalEntryWithContext, JournalEntryCreate, JournalEntryUpdate, JournalSearchParams } from '@/lib/api/journal'

interface JournalState {
  // State
  entries: JournalEntry[]
  currentEntry: JournalEntryWithContext | null
  isLoading: boolean
  isEditing: boolean
  error: string | null

  // Filters
  searchQuery: string
  selectedTags: string[]
  selectedMood: string | null
  dateFrom: string | null
  dateTo: string | null

  // Available options
  allTags: string[]
  allMoods: string[]

  // Actions
  fetchEntries: (params?: journalApi.JournalListParams) => Promise<void>
  fetchEntry: (entryId: string) => Promise<void>
  createEntry: (data: JournalEntryCreate) => Promise<JournalEntry>
  updateEntry: (entryId: string, data: JournalEntryUpdate) => Promise<JournalEntry>
  deleteEntry: (entryId: string) => Promise<void>
  searchEntries: (params: JournalSearchParams) => Promise<void>

  // Filter actions
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[]) => void
  setSelectedMood: (mood: string | null) => void
  setDateRange: (from: string | null, to: string | null) => void
  clearFilters: () => void

  // Options actions
  fetchAllTags: () => Promise<void>
  fetchAllMoods: () => Promise<void>

  // UI actions
  setEditing: (editing: boolean) => void
  clearCurrentEntry: () => void
  clearError: () => void
}

export const useJournalStore = create<JournalState>((set, get) => ({
  // Initial state
  entries: [],
  currentEntry: null,
  isLoading: false,
  isEditing: false,
  error: null,

  searchQuery: '',
  selectedTags: [],
  selectedMood: null,
  dateFrom: null,
  dateTo: null,

  allTags: [],
  allMoods: [],

  // Fetch entries
  fetchEntries: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const { selectedTags, selectedMood, dateFrom, dateTo } = get()
      const entries = await journalApi.listJournalEntries({
        ...params,
        tag: selectedTags[0], // API supports single tag filter
        mood: selectedMood || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      set({ entries, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch entries', isLoading: false })
    }
  },

  // Fetch single entry
  fetchEntry: async (entryId) => {
    set({ isLoading: true, error: null })
    try {
      const entry = await journalApi.getJournalEntry(entryId)
      set({ currentEntry: entry, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch entry', isLoading: false })
    }
  },

  // Create entry
  createEntry: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const entry = await journalApi.createJournalEntry(data)
      set(state => ({
        entries: [entry, ...state.entries],
        isLoading: false,
        isEditing: false,
      }))
      return entry
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create entry', isLoading: false })
      throw error
    }
  },

  // Update entry
  updateEntry: async (entryId, data) => {
    set({ isLoading: true, error: null })
    try {
      const entry = await journalApi.updateJournalEntry(entryId, data)
      set(state => ({
        entries: state.entries.map(e => e.id === entryId ? entry : e),
        currentEntry: state.currentEntry?.id === entryId
          ? { ...state.currentEntry, ...entry }
          : state.currentEntry,
        isLoading: false,
        isEditing: false,
      }))
      return entry
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update entry', isLoading: false })
      throw error
    }
  },

  // Delete entry
  deleteEntry: async (entryId) => {
    set({ isLoading: true, error: null })
    try {
      await journalApi.deleteJournalEntry(entryId)
      set(state => ({
        entries: state.entries.filter(e => e.id !== entryId),
        currentEntry: state.currentEntry?.id === entryId ? null : state.currentEntry,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete entry', isLoading: false })
      throw error
    }
  },

  // Search entries
  searchEntries: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const response = await journalApi.searchJournalEntries(params)
      set({ entries: response.entries, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to search entries', isLoading: false })
    }
  },

  // Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setSelectedMood: (mood) => set({ selectedMood: mood }),
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  clearFilters: () => set({
    searchQuery: '',
    selectedTags: [],
    selectedMood: null,
    dateFrom: null,
    dateTo: null,
  }),

  // Fetch all tags
  fetchAllTags: async () => {
    try {
      const tags = await journalApi.getAllTags()
      set({ allTags: tags })
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  },

  // Fetch all moods
  fetchAllMoods: async () => {
    try {
      const moods = await journalApi.getAllMoods()
      set({ allMoods: moods })
    } catch (error) {
      console.error('Failed to fetch moods:', error)
    }
  },

  // UI actions
  setEditing: (editing) => set({ isEditing: editing }),
  clearCurrentEntry: () => set({ currentEntry: null }),
  clearError: () => set({ error: null }),
}))
