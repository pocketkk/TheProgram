/**
 * Planet Prompt Store
 *
 * Manages user preferences for planet/celestial body prompts including:
 * - Active tradition (Astronomical, Mythological, Custom)
 * - Custom prompt overrides per planet
 * - Persistence to localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Import default prompts
import { PLANETS, getPlanetByKey } from '../constants/planets'

// Planet traditions
export type PlanetTradition = 'astronomical' | 'mythological' | 'custom'

export const PLANET_TRADITION_LABELS: Record<PlanetTradition, string> = {
  astronomical: 'Astronomical',
  mythological: 'Mythological',
  custom: 'Custom',
}

export const PLANET_TRADITION_DESCRIPTIONS: Record<PlanetTradition, string> = {
  astronomical: 'Scientific depictions of planets as celestial bodies in space',
  mythological: 'Roman/Greek deity personifications with symbolic elements',
  custom: 'Your own personalized prompts for each celestial body',
}

interface PlanetPromptState {
  // Active tradition
  activeTradition: PlanetTradition

  // Custom prompts for each planet (planetKey -> prompt)
  customPrompts: Record<string, string>

  // Track if user has modified any prompts within a tradition
  modifiedPrompts: Record<string, string>

  // Actions
  setTradition: (tradition: PlanetTradition) => void
  updatePrompt: (planetKey: string, prompt: string) => void
  resetPrompt: (planetKey: string) => void
  resetAllPrompts: () => void
  getPromptForPlanet: (planetKey: string) => string
  isPromptModified: (planetKey: string) => boolean
  getModifiedCount: () => number
}

export const usePlanetPromptStore = create<PlanetPromptState>()(
  persist(
    (set, get) => ({
      // Default to Astronomical tradition
      activeTradition: 'astronomical',

      // Custom prompts (only used when tradition is 'custom' or as overrides)
      customPrompts: {},

      // Modified prompts within current tradition
      modifiedPrompts: {},

      // Set the active tradition
      setTradition: (tradition: PlanetTradition) => {
        set({
          activeTradition: tradition,
          // Clear modifications when switching traditions
          modifiedPrompts: {},
        })
      },

      // Update a single planet's prompt
      updatePrompt: (planetKey: string, prompt: string) => {
        const { activeTradition } = get()

        if (activeTradition === 'custom') {
          set(state => ({
            customPrompts: {
              ...state.customPrompts,
              [planetKey]: prompt,
            },
          }))
        } else {
          set(state => ({
            modifiedPrompts: {
              ...state.modifiedPrompts,
              [planetKey]: prompt,
            },
          }))
        }
      },

      // Reset a single planet's prompt to tradition default
      resetPrompt: (planetKey: string) => {
        const { activeTradition } = get()

        if (activeTradition === 'custom') {
          set(state => {
            const { [planetKey]: _, ...rest } = state.customPrompts
            return { customPrompts: rest }
          })
        } else {
          set(state => {
            const { [planetKey]: _, ...rest } = state.modifiedPrompts
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

      // Get the effective prompt for a planet
      getPromptForPlanet: (planetKey: string) => {
        const { activeTradition, customPrompts, modifiedPrompts } = get()

        // Check for modified prompt first (tradition-specific override)
        if (activeTradition !== 'custom' && modifiedPrompts[planetKey]) {
          return modifiedPrompts[planetKey]
        }

        // For custom tradition, use custom prompts or fall back to astronomical
        if (activeTradition === 'custom') {
          if (customPrompts[planetKey]) {
            return customPrompts[planetKey]
          }
          // Fall back to astronomical default
          const planet = getPlanetByKey(planetKey)
          return planet?.defaultPrompt ?? ''
        }

        // For astronomical (default), get from planets.ts
        if (activeTradition === 'astronomical') {
          const planet = getPlanetByKey(planetKey)
          return planet?.defaultPrompt ?? ''
        }

        // For mythological, load from separate file
        const traditionPrompts = getTraditionPrompts(activeTradition)
        if (traditionPrompts[planetKey]) {
          return traditionPrompts[planetKey]
        }

        // Ultimate fallback to astronomical
        const planet = getPlanetByKey(planetKey)
        return planet?.defaultPrompt ?? ''
      },

      // Check if a planet's prompt has been modified from tradition default
      isPromptModified: (planetKey: string) => {
        const { activeTradition, customPrompts, modifiedPrompts } = get()

        if (activeTradition === 'custom') {
          return planetKey in customPrompts
        }

        return planetKey in modifiedPrompts
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
      name: 'planet-prompts-storage',
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
 */
function getTraditionPrompts(tradition: PlanetTradition): Record<string, string> {
  // Return cached prompts if already loaded
  if (traditionPromptsCache[tradition]) {
    return traditionPromptsCache[tradition]
  }

  if (tradition === 'mythological') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mythModule = require('../constants/planetsMythological')
      traditionPromptsCache.mythological = mythModule.MYTHOLOGICAL_PROMPTS || {}
    } catch {
      traditionPromptsCache.mythological = {}
    }
    return traditionPromptsCache.mythological
  }

  return {}
}

/**
 * Get all planets with their effective prompts for current tradition
 */
export function getAllPlanetPrompts(): Array<{ key: string; name: string; prompt: string; isModified: boolean }> {
  const store = usePlanetPromptStore.getState()

  return PLANETS.map(planet => ({
    key: planet.key,
    name: planet.name,
    prompt: store.getPromptForPlanet(planet.key),
    isModified: store.isPromptModified(planet.key),
  }))
}
