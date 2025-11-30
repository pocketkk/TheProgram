/**
 * Tarot Prompt Store
 *
 * Manages user preferences for tarot card prompts including:
 * - Active tradition (RWS, Thoth, Marseille, Custom)
 * - Custom prompt overrides per card
 * - Persistence to localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Import default prompts
import { FULL_TAROT_DECK, getCardByKey } from '../constants/tarotCards'

// Tarot traditions
export type TarotTradition = 'rws' | 'thoth' | 'marseille' | 'custom'

export const TAROT_TRADITION_LABELS: Record<TarotTradition, string> = {
  rws: 'Rider-Waite-Smith',
  thoth: 'Thoth (Crowley)',
  marseille: 'Marseille',
  custom: 'Custom',
}

export const TAROT_TRADITION_DESCRIPTIONS: Record<TarotTradition, string> = {
  rws: 'Classic symbolism from the 1909 Rider-Waite deck by Pamela Colman Smith',
  thoth: 'Aleister Crowley\'s occult-influenced imagery with Egyptian and Kabbalistic themes',
  marseille: 'Traditional French tarot with minimalist woodcut style and bold colors',
  custom: 'Your own personalized prompts for each card',
}

interface TarotPromptState {
  // Active tradition
  activeTradition: TarotTradition

  // Custom prompts for each card (cardKey -> prompt)
  customPrompts: Record<string, string>

  // Track if user has modified any prompts within a tradition
  // This is separate from customPrompts to track "dirty" state
  modifiedPrompts: Record<string, string>

  // Actions
  setTradition: (tradition: TarotTradition) => void
  updatePrompt: (cardKey: string, prompt: string) => void
  resetPrompt: (cardKey: string) => void
  resetAllPrompts: () => void
  getPromptForCard: (cardKey: string) => string
  isPromptModified: (cardKey: string) => boolean
  getModifiedCount: () => number
}

// Default prompts are stored in tarotCards.ts (RWS style)
// Additional traditions will be lazy-loaded from separate files

export const useTarotPromptStore = create<TarotPromptState>()(
  persist(
    (set, get) => ({
      // Default to RWS tradition
      activeTradition: 'rws',

      // Custom prompts (only used when tradition is 'custom' or as overrides)
      customPrompts: {},

      // Modified prompts within current tradition
      modifiedPrompts: {},

      // Set the active tradition
      setTradition: (tradition: TarotTradition) => {
        set({
          activeTradition: tradition,
          // Clear modifications when switching traditions (they're tradition-specific)
          modifiedPrompts: {},
        })
      },

      // Update a single card's prompt
      updatePrompt: (cardKey: string, prompt: string) => {
        const { activeTradition } = get()

        if (activeTradition === 'custom') {
          // For custom tradition, store in customPrompts
          set(state => ({
            customPrompts: {
              ...state.customPrompts,
              [cardKey]: prompt,
            },
          }))
        } else {
          // For other traditions, store in modifiedPrompts (as overrides)
          set(state => ({
            modifiedPrompts: {
              ...state.modifiedPrompts,
              [cardKey]: prompt,
            },
          }))
        }
      },

      // Reset a single card's prompt to tradition default
      resetPrompt: (cardKey: string) => {
        const { activeTradition } = get()

        if (activeTradition === 'custom') {
          set(state => {
            const { [cardKey]: _, ...rest } = state.customPrompts
            return { customPrompts: rest }
          })
        } else {
          set(state => {
            const { [cardKey]: _, ...rest } = state.modifiedPrompts
            return { modifiedPrompts: rest }
          })
        }
      },

      // Reset all prompts to tradition defaults
      resetAllPrompts: () => {
        const { activeTradition } = get()

        if (activeTradition === 'custom') {
          set({ customPrompts: {} })
        } else {
          set({ modifiedPrompts: {} })
        }
      },

      // Get the effective prompt for a card
      getPromptForCard: (cardKey: string) => {
        const { activeTradition, customPrompts, modifiedPrompts } = get()

        // Check for modified prompt first (tradition-specific override)
        if (activeTradition !== 'custom' && modifiedPrompts[cardKey]) {
          return modifiedPrompts[cardKey]
        }

        // For custom tradition, use custom prompts or fall back to RWS
        if (activeTradition === 'custom') {
          if (customPrompts[cardKey]) {
            return customPrompts[cardKey]
          }
          // Fall back to RWS default
          const card = getCardByKey(cardKey)
          return card?.defaultPrompt ?? ''
        }

        // For standard traditions, get from their respective constants
        // RWS is the default in tarotCards.ts
        if (activeTradition === 'rws') {
          const card = getCardByKey(cardKey)
          return card?.defaultPrompt ?? ''
        }

        // Thoth and Marseille will be loaded from separate files
        // For now, return RWS as placeholder (files will be created)
        const traditionPrompts = getTraditionPrompts(activeTradition)
        if (traditionPrompts[cardKey]) {
          return traditionPrompts[cardKey]
        }

        // Ultimate fallback to RWS
        const card = getCardByKey(cardKey)
        return card?.defaultPrompt ?? ''
      },

      // Check if a card's prompt has been modified from tradition default
      isPromptModified: (cardKey: string) => {
        const { activeTradition, customPrompts, modifiedPrompts } = get()

        if (activeTradition === 'custom') {
          return cardKey in customPrompts
        }

        return cardKey in modifiedPrompts
      },

      // Get count of modified prompts
      getModifiedCount: () => {
        const { activeTradition, customPrompts, modifiedPrompts } = get()

        if (activeTradition === 'custom') {
          return Object.keys(customPrompts).length
        }

        return Object.keys(modifiedPrompts).length
      },
    }),
    {
      name: 'tarot-prompts-storage',
      partialize: state => ({
        activeTradition: state.activeTradition,
        customPrompts: state.customPrompts,
        modifiedPrompts: state.modifiedPrompts,
      }),
    }
  )
)

// Lazy-loaded tradition prompts cache
const traditionPromptsCache: Record<string, Record<string, string>> = {}

/**
 * Get prompts for a specific tradition
 * Traditions other than RWS are loaded dynamically
 */
function getTraditionPrompts(tradition: TarotTradition): Record<string, string> {
  // Return cached prompts if already loaded
  if (traditionPromptsCache[tradition]) {
    return traditionPromptsCache[tradition]
  }

  if (tradition === 'thoth') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const thothModule = require('../constants/tarotThoth')
      traditionPromptsCache.thoth = thothModule.THOTH_PROMPTS || {}
    } catch {
      traditionPromptsCache.thoth = {}
    }
    return traditionPromptsCache.thoth
  }

  if (tradition === 'marseille') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const marseilleModule = require('../constants/tarotMarseille')
      traditionPromptsCache.marseille = marseilleModule.MARSEILLE_PROMPTS || {}
    } catch {
      traditionPromptsCache.marseille = {}
    }
    return traditionPromptsCache.marseille
  }

  return {}
}

/**
 * Get all cards with their effective prompts for current tradition
 */
export function getAllCardPrompts(): Array<{ key: string; name: string; prompt: string; isModified: boolean }> {
  const store = useTarotPromptStore.getState()

  return FULL_TAROT_DECK.map(card => ({
    key: card.key,
    name: card.name,
    prompt: store.getPromptForCard(card.key),
    isModified: store.isPromptModified(card.key),
  }))
}
