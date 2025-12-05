/**
 * Guide State Type Definitions
 *
 * Type definitions for state exposed to the guide agent,
 * enabling it to query current UI state and verify actions.
 */

/**
 * Birth Chart module state
 */
export interface BirthChartGuideState {
  /** Current zodiac system (western, vedic) */
  zodiacSystem: 'western' | 'vedic'
  /** Current ayanamsa for Vedic calculations */
  ayanamsa: string
  /** Current house system */
  houseSystem: string
  /** Currently selected planet */
  selectedPlanet: string | null
  /** Currently selected house */
  selectedHouse: number | null
  /** Currently selected aspect */
  selectedAspect: string | null
  /** Whether aspects are shown */
  showAspects: boolean
  /** Whether houses are shown */
  showHouses: boolean
  /** Whether minor aspects are shown */
  showMinorAspects: boolean
  /** Whether filter panel is open */
  showFilterPanel: boolean
  /** Whether editor modal is open */
  isEditorOpen: boolean
  /** Whether export dialog is open */
  exportDialogOpen: boolean
  /** Active tab (planets, houses, aspects, patterns) */
  activeTab: string
  /** Whether chart is loading */
  isLoading: boolean
}

/**
 * Human Design module state
 */
export interface HumanDesignGuideState {
  /** Current view mode */
  viewMode: 'bodygraph' | 'activations' | 'reading'
  /** Whether channels are shown */
  showChannels: boolean
  /** Whether personality gates are shown */
  showPersonalityGates: boolean
  /** Whether design gates are shown */
  showDesignGates: boolean
  /** Current zodiac system */
  zodiac: 'tropical' | 'sidereal'
  /** Current sidereal method */
  siderealMethod: string
  /** Current ayanamsa */
  ayanamsa: string
  /** Highlighted center */
  highlightedCenter: string | null
  /** Highlighted channel */
  highlightedChannel: string | null
  /** Currently selected element */
  selectedElement: {
    type: 'center' | 'channel' | 'gate' | null
    id: string | null
  }
  /** Whether data is loading */
  isLoading: boolean
}

/**
 * Transits module state
 */
export interface TransitsGuideState {
  /** Current transit date (null = now) */
  transitDate: string | null
  /** Current zodiac system */
  zodiac: 'tropical' | 'sidereal'
  /** Days ahead for upcoming transits */
  daysAhead: number
  /** Currently selected birth data ID */
  selectedBirthDataId: string | null
  /** Currently selected transit */
  selectedTransit: {
    transitPlanet: string
    natalPlanet: string
    aspect: string
  } | null
  /** Whether data is loading */
  isLoading: boolean
  /** Last update timestamp */
  lastUpdated: string | null
}

/**
 * Studio module state
 */
export interface StudioGuideState {
  /** Active section (tarot, planets) */
  activeSection: 'tarot' | 'planets'
  /** Tarot-specific state */
  tarot: {
    /** Currently selected deck ID */
    selectedDeckId: string | null
    /** Whether create modal is open */
    isCreateModalOpen: boolean
    /** Whether settings modal is open */
    isSettingsModalOpen: boolean
    /** Whether generation is in progress */
    isGenerating: boolean
    /** Current filter */
    filter: string
  }
  /** Planet-specific state */
  planet: {
    /** Currently selected set ID */
    selectedSetId: string | null
    /** Whether create modal is open */
    isCreateModalOpen: boolean
    /** Whether settings modal is open */
    isSettingsModalOpen: boolean
    /** Whether generation is in progress */
    isGenerating: boolean
    /** Current filter */
    filter: string
  }
}

/**
 * Global application state
 */
export interface GlobalGuideState {
  /** Current page/route */
  currentPage: string
  /** Active birth data ID (used across modules) */
  activeBirthDataId: string | null
  /** Whether any modal is open */
  hasOpenModal: boolean
  /** Whether any data is loading */
  isLoading: boolean
}

/**
 * Combined guide state
 */
export interface GuideState {
  global: GlobalGuideState
  birthChart?: BirthChartGuideState
  humanDesign?: HumanDesignGuideState
  transits?: TransitsGuideState
  studio?: StudioGuideState
}

/**
 * State update payload
 */
export interface StateUpdatePayload {
  module: keyof Omit<GuideState, 'global'>
  state: Partial<GuideState[keyof Omit<GuideState, 'global'>]>
}

/**
 * State registry interface exposed on window object
 */
export interface GuideStateRegistry {
  /** Get the full state snapshot */
  getState: () => GuideState
  /** Get state for a specific module */
  getModuleState: <K extends keyof GuideState>(module: K) => GuideState[K] | undefined
  /** Check if a specific modal is open */
  isModalOpen: (modalName: string) => boolean
  /** Check if any loading is in progress */
  isLoading: () => boolean
  /** Get the current page */
  getCurrentPage: () => string
  /** Subscribe to state changes */
  subscribe: (callback: (state: GuideState) => void) => () => void
  /** Update module state (internal use) */
  updateModuleState: <K extends keyof Omit<GuideState, 'global'>>(
    module: K,
    state: Partial<GuideState[K]>
  ) => void
  /** Clear module state on unmount (internal use) */
  clearModuleState: (module: keyof Omit<GuideState, 'global'>) => void
  /** Update global state (internal use) */
  updateGlobalState: (state: Partial<GlobalGuideState>) => void
}

// Extend Window interface
declare global {
  interface Window {
    __guideState?: GuideStateRegistry
  }
}
