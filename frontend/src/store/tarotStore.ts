/**
 * Tarot Store
 *
 * State management for Tarot readings using Zustand.
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tarotApi from '@/lib/api/tarot'
import type {
  TarotCard,
  TarotReading,
  TarotSpread,
  DailyCardResponse,
  SpreadType
} from '@/lib/api/tarot'
import type { CollectionInfo, ImageInfo } from '@/types/image'

interface TarotState {
  // Deck data
  deck: TarotCard[]
  spreads: Record<string, TarotSpread>

  // Custom deck selection
  selectedDeckId: string | null  // null = use default symbols
  availableDecks: CollectionInfo[]
  deckImages: Map<string, ImageInfo>  // Map of item_key -> ImageInfo
  cardBackUrl: string | null  // URL for the card back image

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

  // Custom deck actions
  loadAvailableDecks: () => Promise<void>
  selectDeck: (deckId: string | null) => Promise<void>
  getCardImage: (cardId: string) => ImageInfo | undefined
  getCardBackUrl: () => string | null

  performReading: () => Promise<void>
  clearReading: () => void

  getDailyCard: () => Promise<void>

  selectCard: (card: TarotCard | null) => void

  clearError: () => void
}

// Import image API functions
import { listCollections, getCollection } from '@/lib/api/images'

/**
 * Convert backend card ID to image item_key format
 * Backend uses: major_0, wands_1, wands_page
 * Images use: major_00, wands_01, wands_11
 */
function cardIdToItemKey(cardId: string): string {
  const parts = cardId.split('_')
  if (parts.length !== 2) return cardId

  const [suit, value] = parts

  // Handle court cards (page, knight, queen, king)
  const courtMap: Record<string, string> = {
    'page': '11',
    'knight': '12',
    'queen': '13',
    'king': '14',
  }

  if (courtMap[value]) {
    return `${suit}_${courtMap[value]}`
  }

  // Handle number cards - pad to 2 digits
  const num = parseInt(value, 10)
  if (!isNaN(num)) {
    return `${suit}_${num.toString().padStart(2, '0')}`
  }

  return cardId
}

export const useTarotStore = create<TarotState>()(
  persist(
    (set, get) => ({
  // Initial state
  deck: [],
  spreads: {},
  selectedDeckId: null,
  availableDecks: [],
  deckImages: new Map(),
  cardBackUrl: null,
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

  // Load available custom tarot decks
  loadAvailableDecks: async () => {
    try {
      const decks = await listCollections({ collection_type: 'tarot_deck' })
      // Only include decks that have at least some images
      const decksWithImages = decks.filter(d => d.image_count > 0)
      set({ availableDecks: decksWithImages })
    } catch (error) {
      console.error('Failed to load available decks:', error)
    }
  },

  // Select a deck and load its images
  selectDeck: async (deckId: string | null) => {
    if (!deckId) {
      // Clear to default symbols
      set({ selectedDeckId: null, deckImages: new Map(), cardBackUrl: null })
      return
    }

    try {
      const collection = await getCollection(deckId)
      // Build a map of item_key -> ImageInfo for quick lookup
      // Use most recent image for each item_key
      const imageMap = new Map<string, ImageInfo>()
      const sortedImages = [...collection.images].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      sortedImages.forEach((img) => {
        if (img.item_key && !imageMap.has(img.item_key)) {
          imageMap.set(img.item_key, img)
        }
      })
      set({
        selectedDeckId: deckId,
        deckImages: imageMap,
        cardBackUrl: collection.card_back_url || null,
      })
    } catch (error) {
      console.error('Failed to load deck images:', error)
      set({ selectedDeckId: null, deckImages: new Map(), cardBackUrl: null })
    }
  },

  // Get image for a specific card ID
  getCardImage: (cardId: string) => {
    const { deckImages } = get()
    // Convert backend card ID to image item_key format
    const itemKey = cardIdToItemKey(cardId)
    return deckImages.get(itemKey)
  },

  // Get card back URL
  getCardBackUrl: () => {
    return get().cardBackUrl
  },

  clearError: () => set({ error: null })
    }),
    {
      name: 'tarot-store',
      partialize: (state) => ({
        selectedDeckId: state.selectedDeckId,
      }),
    }
  )
)
