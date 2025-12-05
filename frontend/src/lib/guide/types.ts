/**
 * Guide Module Type Definitions
 *
 * Type definitions for guide-compatible modules that enable
 * the guide agent to navigate and control UI modules.
 */

/**
 * Describes a capability that a module provides
 */
export interface ModuleCapability {
  id: string
  name: string
  description: string
  inputSchema?: Record<string, unknown>
}

/**
 * An action that can be executed by the guide agent
 */
export interface ModuleAction {
  id: string
  name: string
  description: string
  inputSchema?: Record<string, {
    type: string
    description?: string
    enum?: string[]
    required?: boolean
  }>
  execute: (input: Record<string, unknown>) => void | Promise<void>
}

/**
 * A query that returns state information
 */
export interface ModuleQuery {
  id: string
  name: string
  description: string
  execute: () => unknown
}

/**
 * A custom event that can be triggered
 */
export interface ModuleEvent {
  id: string
  eventName: string
  description: string
}

/**
 * Capabilities exposed by a guide module
 */
export interface ModuleCapabilities {
  actions: ModuleAction[]
  queries: ModuleQuery[]
  events: ModuleEvent[]
}

/**
 * Full module interface for guide compatibility
 */
export interface GuideModule {
  /** Unique identifier for the module */
  id: string
  /** Human-readable module name */
  name: string
  /** Pages where this module is active (route paths) */
  pages: string[]
  /** Module capabilities */
  capabilities: ModuleCapabilities
}

/**
 * Element info returned from element discovery
 */
export interface GuideElement {
  testId: string
  ariaLabel?: string
  type: 'button' | 'select' | 'input' | 'toggle' | 'tab' | 'center' | 'channel' | 'other'
  isVisible: boolean
  isDisabled: boolean
  currentValue?: string | boolean
}

/**
 * Result from executing an action
 */
export interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

/**
 * Result from executing a query
 */
export interface QueryResult<T = unknown> {
  success: boolean
  error?: string
  data?: T
}

/**
 * Registry interface exposed on window object
 */
export interface GuideModuleRegistry {
  /** Register a module */
  register: (module: GuideModule) => void
  /** Unregister a module */
  unregister: (moduleId: string) => void
  /** Get all registered modules */
  getModules: () => GuideModule[]
  /** Get module by ID */
  getModule: (moduleId: string) => GuideModule | undefined
  /** Discover all capabilities across modules */
  discoverCapabilities: () => {
    moduleId: string
    moduleName: string
    capabilities: ModuleCapabilities
  }[]
  /** Execute an action on a specific module */
  executeAction: (moduleId: string, actionId: string, input?: Record<string, unknown>) => Promise<ActionResult>
  /** Execute a query on a specific module */
  executeQuery: <T = unknown>(moduleId: string, queryId: string) => Promise<QueryResult<T>>
  /** Discover elements on the current page */
  discoverElements: (moduleId?: string) => GuideElement[]
}

// Extend Window interface
declare global {
  interface Window {
    __guideModuleRegistry?: GuideModuleRegistry
  }
}
