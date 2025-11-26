/**
 * Companion Feature - AI Consciousness Exploration Guide
 *
 * A floating companion that provides multi-paradigm chart interpretation
 * and can control the UI to guide users through their exploration.
 */

export { FloatingCompanion } from './FloatingCompanion'
export { CompanionAvatar } from './components/CompanionAvatar'
export { CompanionBubble } from './components/CompanionBubble'
export { CompanionPanel } from './components/CompanionPanel'

export { useCompanionStore } from './stores/companionStore'
export type {
  AvatarState,
  CompanionPosition,
  Message,
  ToolCall,
  Insight,
  Paradigm,
  SynthesisDepth,
  CompanionPreferences,
  ConnectionStatus,
  CurrentAction,
} from './stores/companionStore'

export { useCompanionActions } from './hooks/useCompanionActions'
