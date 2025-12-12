/**
 * Companion Store - Voice Chat Mode Tests
 *
 * Tests for voice/text mode switching and voice-related state management.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCompanionStore } from '../companionStore'
import type { ChatMode } from '../companionStore'

describe('Companion Store - Voice Chat Mode', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCompanionStore.setState({
      chatMode: 'text',
      isExpanded: false,
      avatarState: 'idle',
      connectionStatus: 'disconnected',
      sessionId: null,
      messages: [],
      isGenerating: false,
      currentAction: null,
      currentToolCalls: [],
      pendingInsights: [],
      preferences: {
        enabledParadigms: ['astrology', 'tarot', 'jungian'],
        synthesisDepth: 'balanced',
        position: 'bottom-right',
        proactiveInsights: true,
        panelWidth: 380,
        panelHeight: 520,
      },
    })
  })

  describe('Chat Mode', () => {
    it('should default to text mode', () => {
      const { chatMode } = useCompanionStore.getState()
      expect(chatMode).toBe('text')
    })

    it('should switch to voice mode', () => {
      useCompanionStore.getState().setChatMode('voice')
      const { chatMode } = useCompanionStore.getState()
      expect(chatMode).toBe('voice')
    })

    it('should switch back to text mode', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setChatMode('text')
      const { chatMode } = useCompanionStore.getState()
      expect(chatMode).toBe('text')
    })

    it('should support all chat modes', () => {
      const modes: ChatMode[] = ['text', 'voice']
      modes.forEach(mode => {
        useCompanionStore.getState().setChatMode(mode)
        expect(useCompanionStore.getState().chatMode).toBe(mode)
      })
    })
  })

  describe('Mode Switching with State Preservation', () => {
    it('should preserve messages when switching to voice mode', () => {
      // Add messages in text mode
      useCompanionStore.getState().addMessage({
        role: 'user',
        content: 'Hello guide',
      })
      useCompanionStore.getState().addMessage({
        role: 'assistant',
        content: 'Hello! How can I help you?',
      })

      // Switch to voice mode
      useCompanionStore.getState().setChatMode('voice')

      // Messages should still be there
      const { messages } = useCompanionStore.getState()
      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('Hello guide')
      expect(messages[1].content).toBe('Hello! How can I help you?')
    })

    it('should preserve messages when switching back to text mode', () => {
      // Start in voice mode
      useCompanionStore.getState().setChatMode('voice')

      // Add a message (simulating voice transcription)
      useCompanionStore.getState().addMessage({
        role: 'user',
        content: 'Voice message',
      })

      // Switch to text mode
      useCompanionStore.getState().setChatMode('text')

      // Messages should persist
      const { messages } = useCompanionStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Voice message')
    })

    it('should preserve avatar state during mode switch', () => {
      useCompanionStore.getState().setAvatarState('thinking')
      useCompanionStore.getState().setChatMode('voice')

      const { avatarState } = useCompanionStore.getState()
      expect(avatarState).toBe('thinking')
    })

    it('should preserve preferences during mode switch', () => {
      const customPrefs = {
        enabledParadigms: ['astrology'] as const,
        synthesisDepth: 'deep' as const,
        position: 'top-left' as const,
        proactiveInsights: false,
        panelWidth: 500,
        panelHeight: 600,
      }

      useCompanionStore.getState().setPreferences(customPrefs)
      useCompanionStore.getState().setChatMode('voice')

      const { preferences } = useCompanionStore.getState()
      expect(preferences.synthesisDepth).toBe('deep')
      expect(preferences.panelWidth).toBe(500)
    })
  })

  describe('Voice Mode Avatar States', () => {
    it('should support listening state for voice input', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setAvatarState('listening')

      const { avatarState } = useCompanionStore.getState()
      expect(avatarState).toBe('listening')
    })

    it('should support speaking state for voice output', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setAvatarState('speaking')

      const { avatarState } = useCompanionStore.getState()
      expect(avatarState).toBe('speaking')
    })

    it('should transition through voice states', () => {
      useCompanionStore.getState().setChatMode('voice')

      // User starts speaking
      useCompanionStore.getState().setAvatarState('listening')
      expect(useCompanionStore.getState().avatarState).toBe('listening')

      // Processing
      useCompanionStore.getState().setAvatarState('thinking')
      expect(useCompanionStore.getState().avatarState).toBe('thinking')

      // AI responds
      useCompanionStore.getState().setAvatarState('speaking')
      expect(useCompanionStore.getState().avatarState).toBe('speaking')

      // Return to idle
      useCompanionStore.getState().setAvatarState('idle')
      expect(useCompanionStore.getState().avatarState).toBe('idle')
    })
  })

  describe('Message History in Voice Mode', () => {
    it('should add messages in voice mode', () => {
      useCompanionStore.getState().setChatMode('voice')

      useCompanionStore.getState().addMessage({
        role: 'user',
        content: 'Tell me about my chart',
      })

      const { messages } = useCompanionStore.getState()
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
    })

    it('should append to last message in voice mode (streaming)', () => {
      useCompanionStore.getState().setChatMode('voice')

      // Add initial assistant message
      useCompanionStore.getState().addMessage({
        role: 'assistant',
        content: 'Your chart shows ',
      })

      // Append streamed content
      useCompanionStore.getState().appendToLastMessage('great potential')
      useCompanionStore.getState().appendToLastMessage(' for growth.')

      const { messages } = useCompanionStore.getState()
      expect(messages[0].content).toBe('Your chart shows great potential for growth.')
    })

    it('should clear history in voice mode', () => {
      useCompanionStore.getState().setChatMode('voice')

      useCompanionStore.getState().addMessage({
        role: 'user',
        content: 'Message 1',
      })
      useCompanionStore.getState().addMessage({
        role: 'assistant',
        content: 'Response 1',
      })

      useCompanionStore.getState().clearMessages()

      const { messages } = useCompanionStore.getState()
      expect(messages).toHaveLength(0)
    })
  })

  describe('Session Management in Voice Mode', () => {
    it('should set session ID in voice mode', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setSessionId('voice-session-123')

      const { sessionId } = useCompanionStore.getState()
      expect(sessionId).toBe('voice-session-123')
    })

    it('should preserve session ID when switching modes', () => {
      useCompanionStore.getState().setSessionId('shared-session-456')
      useCompanionStore.getState().setChatMode('voice')

      const { sessionId } = useCompanionStore.getState()
      expect(sessionId).toBe('shared-session-456')
    })

    it('should clear session ID', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setSessionId('voice-session-789')
      useCompanionStore.getState().setSessionId(null)

      const { sessionId } = useCompanionStore.getState()
      expect(sessionId).toBeNull()
    })
  })

  describe('Connection Status in Voice Mode', () => {
    it('should track connection status in voice mode', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setConnectionStatus('connecting')

      expect(useCompanionStore.getState().connectionStatus).toBe('connecting')

      useCompanionStore.getState().setConnectionStatus('connected')
      expect(useCompanionStore.getState().connectionStatus).toBe('connected')
    })

    it('should handle no_api_key status', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setConnectionStatus('no_api_key')

      const { connectionStatus } = useCompanionStore.getState()
      expect(connectionStatus).toBe('no_api_key')
    })

    it('should handle error status', () => {
      useCompanionStore.getState().setChatMode('voice')
      useCompanionStore.getState().setConnectionStatus('error')

      const { connectionStatus } = useCompanionStore.getState()
      expect(connectionStatus).toBe('error')
    })
  })
})
