/**
 * Tarot Store
 *
 * State management for Tarot readings using Zustand.
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { create } from 'zustand'
import * as tarotApi from '@/lib/api/tarot'
import type {
  TarotCard,
  TarotReading,
  TarotSpread,
  DailyCardResponse,
  SpreadType
} from '@/lib/api/tarot'

interface TarotState {
  // Deck data
  deck: TarotCard[]
  spreads: Record<string, TarotSpread>

  // Current reading
  currentReading: TarotReading | null
  selectedSpread: SpreadType
  question: string

  // Daily card
  dailyCard: DailyCardResponse | null

  // Reading history (session only)
  readingHistory: TarotReading[]

  // Selected card for detail view
  selectedCard: TarotCard | null

  // UI State
  isLoading: boolean
  error: string | null

  // Actions
  loadDeck: () => Promise<void>
  loadSpreads: () => Promise<void>
  setSelectedSpread: (spread: SpreadType) => void
  setQuestion: (question: string) => void

  performReading: () => Promise<void>
  clearReading: () => void

  getDailyCard: () => Promise<void>

  selectCard: (card: TarotCard | null) => void

  clearError: () => void
}

export const useTarotStore = create<TarotState>((set, get) => ({
  // Initial state
  deck: [],
  spreads: {},
  currentReading: null,
  selectedSpread: 'three_card',
  question: '',
  dailyCard: null,
  readingHistory: [],
  selectedCard: null,
  isLoading: false,
  error: null,

  // Load the deck
  loadDeck: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await tarotApi.getDeck()
      set({ deck: response.deck, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load deck',
        isLoading: false
      })
    }
  },

  // Load available spreads
  loadSpreads: async () => {
    try {
      const response = await tarotApi.getSpreads()
      set({ spreads: response.spreads })
    } catch (error) {
      console.error('Failed to load spreads:', error)
    }
  },

  setSelectedSpread: (spread) => set({ selectedSpread: spread }),
  setQuestion: (question) => set({ question }),

  // Perform a reading
  performReading: async () => {
    const { selectedSpread, question } = get()

    set({ isLoading: true, error: null })
    try {
      const reading = await tarotApi.performReading({
        spread_type: selectedSpread,
        question: question || undefined,
        allow_reversed: true
      })

      set((state) => ({
        currentReading: reading,
        readingHistory: [reading, ...state.readingHistory].slice(0, 10), // Keep last 10
        isLoading: false
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to perform reading',
        isLoading: false
      })
    }
  },

  clearReading: () => set({ currentReading: null, question: '' }),

  // Get daily card
  getDailyCard: async () => {
    set({ isLoading: true, error: null })
    try {
      const card = await tarotApi.getCardOfTheDay()
      set({ dailyCard: card, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get daily card',
        isLoading: false
      })
    }
  },

  selectCard: (card) => set({ selectedCard: card }),

  clearError: () => set({ error: null })
}))
