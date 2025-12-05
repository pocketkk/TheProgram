/**
 * Guide Module System
 *
 * Provides a standardized interface for modules to expose capabilities
 * to the guide agent, enabling navigation and control of UI elements.
 *
 * Usage:
 * ```typescript
 * import { registerGuideModule, initializeGuideRegistry } from '@/lib/guide'
 *
 * // Initialize once in app entry
 * initializeGuideRegistry()
 *
 * // Register a module
 * registerGuideModule({
 *   id: 'birthchart',
 *   name: 'Birth Chart',
 *   pages: ['birthchart'],
 *   capabilities: {
 *     actions: [...],
 *     queries: [...],
 *     events: [...],
 *   }
 * })
 * ```
 */

// Type exports
export type {
  ModuleCapability,
  ModuleAction,
  ModuleQuery,
  ModuleEvent,
  ModuleCapabilities,
  GuideModule,
  GuideElement,
  ActionResult,
  QueryResult,
  GuideModuleRegistry,
} from './types'

// Registry exports
export {
  initializeGuideRegistry,
  getGuideRegistry,
  registerGuideModule,
  unregisterGuideModule,
} from './registry'

export { default as guideRegistry } from './registry'

// State type exports
export type {
  BirthChartGuideState,
  HumanDesignGuideState,
  TransitsGuideState,
  StudioGuideState,
  GlobalGuideState,
  GuideState,
  StateUpdatePayload,
  GuideStateRegistry,
} from './state-types'

// State registry exports
export {
  initializeGuideStateRegistry,
  getGuideStateRegistry,
  updateGuideModuleState,
  clearGuideModuleState,
  updateGuideGlobalState,
} from './state-registry'

export { default as guideStateRegistry } from './state-registry'
