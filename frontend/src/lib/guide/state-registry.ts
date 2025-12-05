/**
 * Guide State Registry
 *
 * Central state manager for exposing UI state to the guide agent.
 * Exposes on window.__guideState for guide agent access.
 */

import type {
  GuideState,
  GlobalGuideState,
  GuideStateRegistry,
} from './state-types'

type StateSubscriber = (state: GuideState) => void

class StateRegistry implements GuideStateRegistry {
  private state: GuideState = {
    global: {
      currentPage: '',
      activeBirthDataId: null,
      hasOpenModal: false,
      isLoading: false,
    },
  }

  private subscribers: Set<StateSubscriber> = new Set()

  /**
   * Get the full state snapshot
   */
  getState(): GuideState {
    return { ...this.state }
  }

  /**
   * Get state for a specific module
   */
  getModuleState<K extends keyof GuideState>(module: K): GuideState[K] | undefined {
    return this.state[module]
  }

  /**
   * Check if a specific modal is open
   */
  isModalOpen(modalName: string): boolean {
    // Check in each module's state for modal-related properties
    const { birthChart, humanDesign, transits, studio } = this.state

    // Birth Chart modals
    if (birthChart) {
      if (modalName === 'editor' && birthChart.isEditorOpen) return true
      if (modalName === 'export' && birthChart.exportDialogOpen) return true
    }

    // Studio modals
    if (studio) {
      if (modalName === 'createDeck' && studio.tarot.isCreateModalOpen) return true
      if (modalName === 'tarotSettings' && studio.tarot.isSettingsModalOpen) return true
      if (modalName === 'createPlanetSet' && studio.planet.isCreateModalOpen) return true
      if (modalName === 'planetSettings' && studio.planet.isSettingsModalOpen) return true
    }

    // Generic check for any modal
    if (modalName === 'any') {
      return this.state.global.hasOpenModal
    }

    return false
  }

  /**
   * Check if any loading is in progress
   */
  isLoading(): boolean {
    const { global, birthChart, humanDesign, transits, studio } = this.state

    if (global.isLoading) return true
    if (birthChart?.isLoading) return true
    if (humanDesign?.isLoading) return true
    if (transits?.isLoading) return true
    if (studio?.tarot.isGenerating || studio?.planet.isGenerating) return true

    return false
  }

  /**
   * Get the current page
   */
  getCurrentPage(): string {
    return this.state.global.currentPage
  }

  /**
   * Subscribe to state changes
   * Returns an unsubscribe function
   */
  subscribe(callback: StateSubscriber): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(): void {
    const stateCopy = this.getState()
    this.subscribers.forEach((callback) => {
      try {
        callback(stateCopy)
      } catch (error) {
        console.error('[Guide State] Subscriber error:', error)
      }
    })
  }

  /**
   * Update module state
   */
  updateModuleState<K extends keyof Omit<GuideState, 'global'>>(
    module: K,
    state: Partial<GuideState[K]>
  ): void {
    this.state = {
      ...this.state,
      [module]: {
        ...this.state[module],
        ...state,
      },
    }

    // Update global hasOpenModal flag
    this.updateGlobalModalState()

    this.notifySubscribers()
    console.debug(`[Guide State] Updated ${module}:`, state)
  }

  /**
   * Clear module state on unmount
   */
  clearModuleState(module: keyof Omit<GuideState, 'global'>): void {
    const newState = { ...this.state }
    delete newState[module]
    this.state = newState

    // Update global hasOpenModal flag
    this.updateGlobalModalState()

    this.notifySubscribers()
    console.debug(`[Guide State] Cleared ${module}`)
  }

  /**
   * Update global state
   */
  updateGlobalState(state: Partial<GlobalGuideState>): void {
    this.state = {
      ...this.state,
      global: {
        ...this.state.global,
        ...state,
      },
    }
    this.notifySubscribers()
    console.debug('[Guide State] Updated global:', state)
  }

  /**
   * Update the global hasOpenModal flag based on module states
   */
  private updateGlobalModalState(): void {
    const { birthChart, studio } = this.state

    const hasModal =
      birthChart?.isEditorOpen ||
      birthChart?.exportDialogOpen ||
      studio?.tarot.isCreateModalOpen ||
      studio?.tarot.isSettingsModalOpen ||
      studio?.planet.isCreateModalOpen ||
      studio?.planet.isSettingsModalOpen ||
      false

    if (this.state.global.hasOpenModal !== hasModal) {
      this.state.global.hasOpenModal = hasModal
    }
  }
}

// Create singleton instance
const stateRegistry = new StateRegistry()

/**
 * Initialize the state registry on the window object
 * Should be called once during app initialization
 */
export function initializeGuideStateRegistry(): void {
  if (typeof window !== 'undefined') {
    window.__guideState = stateRegistry
    console.debug('[Guide State] Initialized on window.__guideState')
  }
}

/**
 * Get the state registry instance
 */
export function getGuideStateRegistry(): GuideStateRegistry {
  return stateRegistry
}

/**
 * Update module state (convenience function)
 */
export function updateGuideModuleState<K extends keyof Omit<GuideState, 'global'>>(
  module: K,
  state: Partial<GuideState[K]>
): void {
  stateRegistry.updateModuleState(module, state)
}

/**
 * Clear module state (convenience function)
 */
export function clearGuideModuleState(module: keyof Omit<GuideState, 'global'>): void {
  stateRegistry.clearModuleState(module)
}

/**
 * Update global state (convenience function)
 */
export function updateGuideGlobalState(state: Partial<GlobalGuideState>): void {
  stateRegistry.updateGlobalState(state)
}

export default stateRegistry
