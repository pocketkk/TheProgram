/**
 * People/Contacts State Management
 *
 * Manages the list of people whose charts the user wants to track,
 * including the user's own (primary) chart.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  listBirthData,
  createBirthData,
  updateBirthData,
  deleteBirthData,
  getPrimaryBirthData,
  type BirthDataResponse,
  type BirthDataCreate,
  type BirthDataUpdate,
  type RelationshipType,
} from '@/lib/api/birthData'

interface PeopleState {
  // Data
  people: BirthDataResponse[]
  selectedPersonId: string | null
  isLoading: boolean
  error: string | null

  // UI State
  sidebarOpen: boolean
  filterByRelationship: RelationshipType | 'all'

  // Actions - Data
  loadPeople: () => Promise<void>
  selectPerson: (id: string | null) => void
  addPerson: (data: BirthDataCreate) => Promise<BirthDataResponse>
  updatePerson: (id: string, data: BirthDataUpdate) => Promise<void>
  removePerson: (id: string) => Promise<void>
  updateNotes: (id: string, notes: string) => Promise<void>

  // Actions - UI
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setFilterByRelationship: (filter: RelationshipType | 'all') => void

  // Computed helpers
  getPrimaryPerson: () => BirthDataResponse | null
  getSelectedPerson: () => BirthDataResponse | null
  getFilteredPeople: () => BirthDataResponse[]
  isViewingPrimary: () => boolean
}

export const usePeopleStore = create<PeopleState>()(
  persist(
    (set, get) => ({
      // Initial state
      people: [],
      selectedPersonId: null,
      isLoading: false,
      error: null,
      sidebarOpen: true,
      filterByRelationship: 'all',

      // Load all people from API
      loadPeople: async () => {
        set({ isLoading: true, error: null })
        try {
          const people = await listBirthData()
          // If no person is selected, select the primary person
          const currentSelected = get().selectedPersonId
          let selectedId = currentSelected

          if (!currentSelected || !people.find((p) => p.id === currentSelected)) {
            const primary = people.find((p) => p.is_primary)
            selectedId = primary?.id ?? people[0]?.id ?? null
          }

          set({ people, selectedPersonId: selectedId, isLoading: false })
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
        }
      },

      // Select a person to view their chart
      selectPerson: (id) => set({ selectedPersonId: id }),

      // Add a new person
      addPerson: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const newPerson = await createBirthData(data)
          set((state) => ({
            people: [...state.people, newPerson],
            selectedPersonId: newPerson.id, // Auto-select new person
            isLoading: false,
          }))
          return newPerson
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
          throw error
        }
      },

      // Update a person
      updatePerson: async (id, data) => {
        set({ isLoading: true, error: null })
        try {
          const updated = await updateBirthData(id, data)
          set((state) => ({
            people: state.people.map((p) => (p.id === id ? updated : p)),
            isLoading: false,
          }))
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
          throw error
        }
      },

      // Remove a person
      removePerson: async (id) => {
        const state = get()
        const person = state.people.find((p) => p.id === id)

        // Don't allow deleting the primary person
        if (person?.is_primary) {
          set({ error: 'Cannot delete your primary chart' })
          return
        }

        set({ isLoading: true, error: null })
        try {
          await deleteBirthData(id)

          // If we deleted the selected person, select the primary
          const newPeople = state.people.filter((p) => p.id !== id)
          let newSelectedId = state.selectedPersonId

          if (state.selectedPersonId === id) {
            const primary = newPeople.find((p) => p.is_primary)
            newSelectedId = primary?.id ?? newPeople[0]?.id ?? null
          }

          set({
            people: newPeople,
            selectedPersonId: newSelectedId,
            isLoading: false,
          })
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false })
          throw error
        }
      },

      // Convenience method to update just notes
      updateNotes: async (id, notes) => {
        await get().updatePerson(id, { notes })
      },

      // UI Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setFilterByRelationship: (filter) => set({ filterByRelationship: filter }),

      // Computed helpers
      getPrimaryPerson: () => {
        return get().people.find((p) => p.is_primary) ?? null
      },

      getSelectedPerson: () => {
        const { people, selectedPersonId } = get()
        return people.find((p) => p.id === selectedPersonId) ?? null
      },

      getFilteredPeople: () => {
        const { people, filterByRelationship } = get()
        if (filterByRelationship === 'all') return people
        return people.filter((p) => p.relationship_type === filterByRelationship)
      },

      isViewingPrimary: () => {
        const { selectedPersonId, people } = get()
        const selected = people.find((p) => p.id === selectedPersonId)
        return selected?.is_primary ?? false
      },
    }),
    {
      name: 'people-storage',
      // Only persist UI preferences, not the actual data
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        selectedPersonId: state.selectedPersonId,
        filterByRelationship: state.filterByRelationship,
      }),
    }
  )
)
