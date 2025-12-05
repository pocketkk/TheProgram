/**
 * Guide Module Registry
 *
 * Central registry singleton for managing guide-compatible modules.
 * Exposes on window.__guideModuleRegistry for guide agent access.
 */

import type {
  GuideModule,
  GuideModuleRegistry,
  ModuleCapabilities,
  ActionResult,
  QueryResult,
  GuideElement,
} from './types'

class ModuleRegistry implements GuideModuleRegistry {
  private modules: Map<string, GuideModule> = new Map()

  /**
   * Register a module with the registry
   */
  register(module: GuideModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`[Guide Registry] Module "${module.id}" already registered, replacing...`)
    }
    this.modules.set(module.id, module)
    console.debug(`[Guide Registry] Registered module: ${module.id}`)
  }

  /**
   * Unregister a module
   */
  unregister(moduleId: string): void {
    if (this.modules.delete(moduleId)) {
      console.debug(`[Guide Registry] Unregistered module: ${moduleId}`)
    }
  }

  /**
   * Get all registered modules
   */
  getModules(): GuideModule[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get a specific module by ID
   */
  getModule(moduleId: string): GuideModule | undefined {
    return this.modules.get(moduleId)
  }

  /**
   * Discover all capabilities across all registered modules
   */
  discoverCapabilities(): {
    moduleId: string
    moduleName: string
    capabilities: ModuleCapabilities
  }[] {
    return Array.from(this.modules.values()).map((module) => ({
      moduleId: module.id,
      moduleName: module.name,
      capabilities: module.capabilities,
    }))
  }

  /**
   * Execute an action on a specific module
   */
  async executeAction(
    moduleId: string,
    actionId: string,
    input?: Record<string, unknown>
  ): Promise<ActionResult> {
    const module = this.modules.get(moduleId)
    if (!module) {
      return { success: false, error: `Module "${moduleId}" not found` }
    }

    const action = module.capabilities.actions.find((a) => a.id === actionId)
    if (!action) {
      return { success: false, error: `Action "${actionId}" not found in module "${moduleId}"` }
    }

    try {
      const result = await action.execute(input || {})
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Execute a query on a specific module
   */
  async executeQuery<T = unknown>(
    moduleId: string,
    queryId: string
  ): Promise<QueryResult<T>> {
    const module = this.modules.get(moduleId)
    if (!module) {
      return { success: false, error: `Module "${moduleId}" not found` }
    }

    const query = module.capabilities.queries.find((q) => q.id === queryId)
    if (!query) {
      return { success: false, error: `Query "${queryId}" not found in module "${moduleId}"` }
    }

    try {
      const data = query.execute() as T
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Discover interactive elements on the current page
   * Searches for elements with data-testid attributes
   */
  discoverElements(moduleId?: string): GuideElement[] {
    const elements: GuideElement[] = []
    const prefix = moduleId ? `${moduleId}-` : ''

    // Find all elements with data-testid
    const testIdElements = document.querySelectorAll('[data-testid]')

    testIdElements.forEach((el) => {
      const testId = el.getAttribute('data-testid') || ''

      // Filter by module prefix if specified
      if (moduleId && !testId.startsWith(prefix)) {
        return
      }

      const ariaLabel = el.getAttribute('aria-label') || undefined
      const tagName = el.tagName.toLowerCase()
      const isButton = tagName === 'button' || el.getAttribute('role') === 'button'
      const isSelect = tagName === 'select'
      const isInput = tagName === 'input' || tagName === 'textarea'
      const isToggle = testId.includes('toggle')
      const isTab = testId.includes('tab')
      const isCenter = testId.includes('center')
      const isChannel = testId.includes('channel')

      // Determine element type
      let type: GuideElement['type'] = 'other'
      if (isButton) type = 'button'
      else if (isSelect) type = 'select'
      else if (isInput) type = 'input'
      else if (isToggle) type = 'toggle'
      else if (isTab) type = 'tab'
      else if (isCenter) type = 'center'
      else if (isChannel) type = 'channel'

      // Check visibility
      const style = window.getComputedStyle(el)
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden'

      // Check disabled state
      const isDisabled =
        el.hasAttribute('disabled') ||
        el.getAttribute('aria-disabled') === 'true'

      // Get current value for inputs/selects
      let currentValue: string | boolean | undefined
      if (isSelect && el instanceof HTMLSelectElement) {
        currentValue = el.value
      } else if (isInput && el instanceof HTMLInputElement) {
        if (el.type === 'checkbox') {
          currentValue = el.checked
        } else {
          currentValue = el.value
        }
      }

      elements.push({
        testId,
        ariaLabel,
        type,
        isVisible,
        isDisabled,
        currentValue,
      })
    })

    return elements
  }
}

// Create singleton instance
const registry = new ModuleRegistry()

/**
 * Initialize the registry on the window object
 * Should be called once during app initialization
 */
export function initializeGuideRegistry(): void {
  if (typeof window !== 'undefined') {
    window.__guideModuleRegistry = registry
    console.debug('[Guide Registry] Initialized on window.__guideModuleRegistry')
  }
}

/**
 * Get the registry instance
 */
export function getGuideRegistry(): GuideModuleRegistry {
  return registry
}

/**
 * Register a module (convenience function)
 */
export function registerGuideModule(module: GuideModule): void {
  registry.register(module)
}

/**
 * Unregister a module (convenience function)
 */
export function unregisterGuideModule(moduleId: string): void {
  registry.unregister(moduleId)
}

export default registry
