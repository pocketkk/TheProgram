/**
 * Centralized Birth Chart State Management
 * Handles multiple charts, selection states, and interactions
 */

import { create } from 'zustand'
import type { BirthChart, PlanetPosition, Aspect, House } from '@/lib/astrology/types'
import type { AspectPattern } from '@/lib/astrology/patterns'

export type ChartType = 'natal' | 'transit' | 'progressed' | 'synastry' | 'composite'
export type ZodiacSystem = 'western' | 'vedic' | 'human-design'

export interface ChartSelection {
  type: 'planet' | 'house' | 'aspect' | null
  id: string | null
  data?: PlanetPosition | House | Aspect
}

export type ChartOrientation = 'natural' | 'natal'

export interface ChartVisibility {
  zodiac: boolean
  houses: boolean
  planets: boolean
  aspects: boolean
  aspectTypes: {
    major: boolean // conjunction, trine, square, opposition, sextile
    minor: boolean // semisquare, sesquiquadrate, quincunx, etc.
  }
  maxOrb: number // Maximum orb in degrees for aspect filtering (0-10)
  houseNumbers: boolean
  degreeMarkers: boolean
  planetLabels: boolean
  orientation: ChartOrientation // 'natural' (Aries at 9 o'clock) or 'natal' (Ascendant at 9 o'clock)
  additionalPoints: {
    nodes: boolean
    chiron: boolean
    asteroids: boolean
    arabicParts: boolean
    fixedStars: boolean
  }
}

export interface ChartInteraction {
  hoveredElement: ChartSelection | null
  selectedElement: ChartSelection | null
  highlightedAspects: string[] // aspect IDs related to selected planet
  activeHouse: number | null
  comparisonMode: boolean
  comparedPlanets: [string | null, string | null]
  selectedPattern: AspectPattern | null
}

interface ChartStore {
  // Charts
  charts: Map<string, BirthChart>
  activeChartId: string | null
  chartType: ChartType
  zodiacSystem: ZodiacSystem

  // Visibility
  visibility: ChartVisibility

  // Interactions
  interaction: ChartInteraction

  // Chart Management
  addChart: (id: string, chart: BirthChart) => void
  removeChart: (id: string) => void
  setActiveChart: (id: string) => void
  getActiveChart: () => BirthChart | null
  setZodiacSystem: (system: ZodiacSystem) => void

  // Visibility Controls
  toggleLayer: (layer: keyof Omit<ChartVisibility, 'aspectTypes' | 'additionalPoints' | 'maxOrb'>) => void
  setAspectVisibility: (type: 'major' | 'minor', visible: boolean) => void
  setMaxOrb: (orb: number) => void
  setAdditionalPointVisibility: (
    point: keyof ChartVisibility['additionalPoints'],
    visible: boolean
  ) => void

  // Interaction Management
  setHoveredElement: (selection: ChartSelection | null) => void
  setSelectedElement: (selection: ChartSelection | null) => void
  setActiveHouse: (houseNumber: number | null) => void
  setSelectedPattern: (pattern: AspectPattern | null) => void
  toggleComparisonMode: () => void
  setComparedPlanet: (index: 0 | 1, planetName: string | null) => void
  clearInteractions: () => void

  // Computed Helpers
  getRelatedAspects: (planetName: string) => Aspect[]
  getPlanetsInHouse: (houseNumber: number) => PlanetPosition[]
}

export const useChartStore = create<ChartStore>((set, get) => ({
  // Initial State
  charts: new Map(),
  activeChartId: null,
  chartType: 'natal',
  zodiacSystem: 'western',

  visibility: {
    zodiac: true,
    houses: true,
    planets: true,
    aspects: true,
    aspectTypes: {
      major: true,
      minor: true,
    },
    maxOrb: 10, // Default: show all aspects up to 10° orb
    houseNumbers: true,
    degreeMarkers: true,
    planetLabels: true,
    orientation: 'natal', // Default: Ascendant at 9 o'clock
    additionalPoints: {
      nodes: false,
      chiron: false,
      asteroids: false,
      arabicParts: false,
      fixedStars: false,
    },
  },

  interaction: {
    hoveredElement: null,
    selectedElement: null,
    highlightedAspects: [],
    activeHouse: null,
    comparisonMode: false,
    comparedPlanets: [null, null],
    selectedPattern: null,
  },

  // Chart Management
  addChart: (id, chart) => {
    set(state => {
      const newCharts = new Map(state.charts)
      newCharts.set(id, chart)
      return {
        charts: newCharts,
        activeChartId: state.activeChartId || id,
      }
    })
  },

  removeChart: id => {
    set(state => {
      const newCharts = new Map(state.charts)
      newCharts.delete(id)
      return {
        charts: newCharts,
        activeChartId: state.activeChartId === id ? null : state.activeChartId,
      }
    })
  },

  setActiveChart: id => {
    set({ activeChartId: id })
  },

  getActiveChart: () => {
    const state = get()
    return state.activeChartId ? state.charts.get(state.activeChartId) || null : null
  },

  setZodiacSystem: system => {
    set({ zodiacSystem: system })
  },

  // Visibility Controls
  toggleLayer: layer => {
    set(state => ({
      visibility: {
        ...state.visibility,
        [layer]: !state.visibility[layer],
      },
    }))
  },

  setAspectVisibility: (type, visible) => {
    set(state => ({
      visibility: {
        ...state.visibility,
        aspectTypes: {
          ...state.visibility.aspectTypes,
          [type]: visible,
        },
      },
    }))
  },

  setMaxOrb: orb => {
    set(state => ({
      visibility: {
        ...state.visibility,
        maxOrb: orb,
      },
    }))
  },

  setAdditionalPointVisibility: (point, visible) => {
    set(state => ({
      visibility: {
        ...state.visibility,
        additionalPoints: {
          ...state.visibility.additionalPoints,
          [point]: visible,
        },
      },
    }))
  },

  // Interaction Management
  setHoveredElement: selection => {
    set(state => ({
      interaction: {
        ...state.interaction,
        hoveredElement: selection,
      },
    }))
  },

  setSelectedElement: selection => {
    set(state => {
      // Calculate related aspects if planet is selected
      let highlightedAspects: string[] = []
      if (selection?.type === 'planet' && selection.id) {
        const chart = get().getActiveChart()
        if (chart) {
          highlightedAspects = chart.aspects
            .filter(a => a.planet1 === selection.id || a.planet2 === selection.id)
            .map(a => `${a.planet1}-${a.planet2}`)
        }
      }

      return {
        interaction: {
          ...state.interaction,
          selectedElement: selection,
          highlightedAspects,
        },
      }
    })
  },

  setActiveHouse: houseNumber => {
    set(state => ({
      interaction: {
        ...state.interaction,
        activeHouse: houseNumber,
      },
    }))
  },

  setSelectedPattern: pattern => {
    set(state => ({
      interaction: {
        ...state.interaction,
        selectedPattern: pattern,
      },
    }))
  },

  toggleComparisonMode: () => {
    set(state => ({
      interaction: {
        ...state.interaction,
        comparisonMode: !state.interaction.comparisonMode,
        comparedPlanets: [null, null],
      },
    }))
  },

  setComparedPlanet: (index, planetName) => {
    set(state => {
      const newComparedPlanets: [string | null, string | null] = [...state.interaction.comparedPlanets]
      newComparedPlanets[index] = planetName
      return {
        interaction: {
          ...state.interaction,
          comparedPlanets: newComparedPlanets,
        },
      }
    })
  },

  clearInteractions: () => {
    set(state => ({
      interaction: {
        ...state.interaction,
        hoveredElement: null,
        selectedElement: null,
        highlightedAspects: [],
        activeHouse: null,
        selectedPattern: null,
      },
    }))
  },

  // Computed Helpers
  getRelatedAspects: planetName => {
    const chart = get().getActiveChart()
    if (!chart) return []
    return chart.aspects.filter(a => a.planet1 === planetName || a.planet2 === planetName)
  },

  getPlanetsInHouse: houseNumber => {
    const chart = get().getActiveChart()
    if (!chart) return []
    return chart.planets.filter(p => p.house === houseNumber)
  },
}))
