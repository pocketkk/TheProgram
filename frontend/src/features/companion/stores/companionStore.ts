/**
 * AI Companion State Management
 * Handles conversation state, avatar animations, and UI tool execution
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Avatar states for morphing animation
export type AvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'acting'
  | 'curious'
  | 'celebrating'

// Companion position options
export type CompanionPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'

// Message types
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  executeOn: 'frontend' | 'backend'
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: unknown
}

// Proactive insight
export interface Insight {
  id: string
  message: string
  trigger: string
  timestamp: Date
  dismissed: boolean
}

// Paradigm types
export type Paradigm =
  | 'astrology'
  | 'tarot'
  | 'i_ching'
  | 'jungian'
  | 'numerology'
  | 'kabbalah'
  | 'dreams'

export type SynthesisDepth = 'single' | 'light' | 'balanced' | 'deep'

// User preferences for AI companion
export interface CompanionPreferences {
  enabledParadigms: Paradigm[]
  synthesisDepth: SynthesisDepth
  position: CompanionPosition
  proactiveInsights: boolean
}

// WebSocket connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Current action being performed
export interface CurrentAction {
  type: string
  target: string
  startTime: Date
}

interface CompanionStore {
  // UI State
  isExpanded: boolean
  position: CompanionPosition

  // Avatar
  avatarState: AvatarState

  // Connection
  connectionStatus: ConnectionStatus
  sessionId: string | null

  // Conversation
  messages: Message[]
  isGenerating: boolean
  currentAction: CurrentAction | null
  currentToolCalls: ToolCall[]

  // Proactive insights
  pendingInsights: Insight[]

  // Preferences
  preferences: CompanionPreferences

  // UI Actions
  expand: () => void
  minimize: () => void
  setPosition: (position: CompanionPosition) => void

  // Avatar Actions
  setAvatarState: (state: AvatarState) => void

  // Connection Actions
  setConnectionStatus: (status: ConnectionStatus) => void
  setSessionId: (id: string | null) => void

  // Conversation Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  appendToLastMessage: (content: string) => void
  setIsGenerating: (generating: boolean) => void
  setCurrentAction: (action: CurrentAction | null) => void
  clearMessages: () => void

  // Tool Call Actions
  addToolCall: (toolCall: Omit<ToolCall, 'status'>) => void
  updateToolCallStatus: (
    id: string,
    status: ToolCall['status'],
    result?: unknown
  ) => void
  clearToolCalls: () => void

  // Insight Actions
  addInsight: (insight: Omit<Insight, 'id' | 'timestamp' | 'dismissed'>) => void
  dismissInsight: (id: string) => void
  clearInsights: () => void

  // Preference Actions
  setPreferences: (preferences: Partial<CompanionPreferences>) => void
  toggleParadigm: (paradigm: Paradigm) => void
  setSynthesisDepth: (depth: SynthesisDepth) => void
}

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15)

export const useCompanionStore = create<CompanionStore>()(
  persist(
    (set, _get) => ({
      // Initial UI State
      isExpanded: false,
      position: 'bottom-right',

      // Initial Avatar State
      avatarState: 'idle',

      // Initial Connection State
      connectionStatus: 'disconnected',
      sessionId: null,

      // Initial Conversation State
      messages: [],
      isGenerating: false,
      currentAction: null,
      currentToolCalls: [],

      // Initial Insights
      pendingInsights: [],

      // Initial Preferences
      preferences: {
        enabledParadigms: ['astrology', 'tarot', 'jungian'],
        synthesisDepth: 'balanced',
        position: 'bottom-right',
        proactiveInsights: true,
      },

      // UI Actions
      expand: () => set({ isExpanded: true }),
      minimize: () => set({ isExpanded: false }),
      setPosition: position =>
        set(state => ({
          position,
          preferences: { ...state.preferences, position },
        })),

      // Avatar Actions
      setAvatarState: avatarState => set({ avatarState }),

      // Connection Actions
      setConnectionStatus: connectionStatus => set({ connectionStatus }),
      setSessionId: sessionId => set({ sessionId }),

      // Conversation Actions
      addMessage: message =>
        set(state => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: generateId(),
              timestamp: new Date(),
            },
          ],
        })),

      appendToLastMessage: content =>
        set(state => {
          const messages = [...state.messages]
          const lastMessage = messages[messages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            messages[messages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + content,
            }
          }
          return { messages }
        }),

      setIsGenerating: isGenerating =>
        set(state => ({
          isGenerating,
          avatarState: isGenerating
            ? 'thinking'
            : state.currentAction
              ? 'acting'
              : 'idle',
        })),

      setCurrentAction: currentAction =>
        set({
          currentAction,
          avatarState: currentAction ? 'acting' : 'idle',
        }),

      clearMessages: () => set({ messages: [] }),

      // Tool Call Actions
      addToolCall: toolCall =>
        set(state => ({
          currentToolCalls: [
            ...state.currentToolCalls,
            { ...toolCall, status: 'pending' },
          ],
        })),

      updateToolCallStatus: (id, status, result) =>
        set(state => ({
          currentToolCalls: state.currentToolCalls.map(tc =>
            tc.id === id ? { ...tc, status, result } : tc
          ),
        })),

      clearToolCalls: () => set({ currentToolCalls: [] }),

      // Insight Actions
      addInsight: insight =>
        set(state => ({
          pendingInsights: [
            ...state.pendingInsights,
            {
              ...insight,
              id: generateId(),
              timestamp: new Date(),
              dismissed: false,
            },
          ],
        })),

      dismissInsight: id =>
        set(state => ({
          pendingInsights: state.pendingInsights.map(i =>
            i.id === id ? { ...i, dismissed: true } : i
          ),
        })),

      clearInsights: () => set({ pendingInsights: [] }),

      // Preference Actions
      setPreferences: preferences =>
        set(state => ({
          preferences: { ...state.preferences, ...preferences },
        })),

      toggleParadigm: paradigm =>
        set(state => {
          const { enabledParadigms } = state.preferences
          const newParadigms = enabledParadigms.includes(paradigm)
            ? enabledParadigms.filter(p => p !== paradigm)
            : [...enabledParadigms, paradigm]
          return {
            preferences: {
              ...state.preferences,
              enabledParadigms: newParadigms,
            },
          }
        }),

      setSynthesisDepth: synthesisDepth =>
        set(state => ({
          preferences: { ...state.preferences, synthesisDepth },
        })),
    }),
    {
      name: 'companion-storage',
      partialize: state => ({
        // Only persist preferences and position
        preferences: state.preferences,
        position: state.position,
      }),
    }
  )
)
