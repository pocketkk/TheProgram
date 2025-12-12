/**
 * CompanionPanel - Unified conversation interface with integrated voice
 * Single chat interface with text input + mic button
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2, Loader2, Sparkles, Key, ExternalLink, Mic, MicOff } from 'lucide-react'
import { useCompanionStore } from '../stores/companionStore'
import { useCompanionActions } from '../hooks/useCompanionActions'
import { useHybridVoiceChat } from '../hooks/useHybridVoiceChat'
import { CompanionAvatar } from './CompanionAvatar'

interface CompanionPanelProps {
  onMinimize: () => void
}

export function CompanionPanel({ onMinimize }: CompanionPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeEdge, setResizeEdge] = useState<'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null>(null)

  const {
    messages,
    avatarState,
    isGenerating,
    currentAction,
    connectionStatus,
    pendingInsights,
    preferences,
    setPanelSize,
  } = useCompanionStore()

  const { sendMessage, clearHistory, connect, isConnected } = useCompanionActions()

  // Hybrid voice
  const {
    connectionStatus: voiceStatus,
    voiceState,
    sttReady,
    ttsReady,
    connect: connectVoice,
    startListening,
    stopListening,
  } = useHybridVoiceChat()

  // Panel size constraints
  const MIN_WIDTH = 320
  const MIN_HEIGHT = 400
  const MAX_WIDTH = 800
  const MAX_HEIGHT = 900

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-connect text chat on panel open
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      connect()
    }
  }, [connectionStatus, connect])

  // Resize handlers
  const handleMouseDown = useCallback((edge: typeof resizeEdge) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeEdge(edge)
  }, [])

  useEffect(() => {
    if (!isResizing || !resizeEdge || !panelRef.current) return

    const startWidth = preferences.panelWidth
    const startHeight = preferences.panelHeight
    const startX = window.event instanceof MouseEvent ? window.event.clientX : 0
    const startY = window.event instanceof MouseEvent ? window.event.clientY : 0

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = startWidth
      let newHeight = startHeight
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      if (resizeEdge.includes('e')) newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + deltaX))
      if (resizeEdge.includes('w')) newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth - deltaX))
      if (resizeEdge.includes('n')) newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight - deltaY))
      if (resizeEdge.includes('s')) newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + deltaY))

      setPanelSize(newWidth, newHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      setResizeEdge(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeEdge, preferences.panelWidth, preferences.panelHeight, setPanelSize])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating || !isConnected) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Handle mic button click
  const handleMicClick = async () => {
    if (voiceState === 'listening') {
      stopListening()
    } else if (voiceState === 'idle' || voiceState === 'speaking') {
      try {
        if (voiceStatus !== 'connected') {
          await connectVoice()
        }
        await startListening()
      } catch (error) {
        console.error('Failed to start listening:', error)
      }
    }
  }

  // Get mic button styling based on voice state
  const getMicButtonStyle = () => {
    switch (voiceState) {
      case 'listening':
        return 'bg-red-500 hover:bg-red-400 text-white'
      case 'transcribing':
        return 'bg-yellow-500 text-white'
      case 'thinking':
        return 'bg-purple-500 text-white'
      case 'speaking':
        return 'bg-green-500 text-white'
      default:
        return 'bg-slate-700 hover:bg-slate-600 text-slate-300'
    }
  }

  const undismissedInsights = pendingInsights.filter(i => !i.dismissed)

  // Status text
  const getStatusText = () => {
    if (voiceState === 'listening') return 'Listening...'
    if (voiceState === 'transcribing') return 'Transcribing...'
    if (voiceState === 'thinking') return 'Thinking...'
    if (voiceState === 'speaking') return 'Speaking...'
    if (isGenerating) return 'Thinking...'
    if (isConnected) return 'Ready to explore'
    if (connectionStatus === 'no_api_key') return 'API key needed'
    return 'Connecting...'
  }

  return (
    <motion.div
      ref={panelRef}
      data-guide-panel
      className="flex flex-col bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden relative select-none"
      style={{
        width: preferences.panelWidth,
        height: preferences.panelHeight,
        cursor: isResizing ? 'grabbing' : 'default'
      }}
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <CompanionAvatar state={avatarState} size={36} />
          <div>
            <h3 className="text-white font-medium text-sm">Guide</h3>
            <p className="text-slate-400 text-xs">{getStatusText()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice Status Indicators */}
          {voiceStatus === 'connected' && (
            <div className="flex items-center gap-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${sttReady ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-500'}`}>
                STT
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${ttsReady ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-500'}`}>
                TTS
              </span>
            </div>
          )}
          <button
            onClick={clearHistory}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onMinimize}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Minimize"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Action indicator */}
      <AnimatePresence>
        {currentAction && (
          <motion.div
            className="px-4 py-2 bg-indigo-500/20 border-b border-indigo-500/30 flex items-center gap-2 text-sm text-indigo-300"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Loader2 size={14} className="animate-spin" />
            <span className="capitalize">{currentAction.type.replace(/_/g, ' ')}...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proactive insights */}
      <AnimatePresence>
        {undismissedInsights.length > 0 && (
          <motion.div
            className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {undismissedInsights.slice(0, 1).map(insight => (
              <div key={insight.id} className="flex items-start gap-2 text-sm text-amber-200">
                <Sparkles size={14} className="mt-0.5 flex-shrink-0" />
                <p className="line-clamp-2">{insight.message}</p>
                <button
                  onClick={() => useCompanionStore.getState().dismissInsight(insight.id)}
                  className="text-amber-400 hover:text-amber-200 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {connectionStatus === 'no_api_key' ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <Key className="w-8 h-8 text-amber-400" />
            </div>
            <h4 className="text-white font-medium mb-2">API Key Required</h4>
            <p className="text-sm text-slate-400 mb-4">
              Add your Anthropic API key in Settings to enable the Guide.
            </p>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('companion-navigate', { detail: { page: 'settings' } }))
                onMinimize()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
            >
              <Key size={16} />
              Configure API Key
            </button>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Get your key at console.anthropic.com
              <ExternalLink size={12} />
            </a>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 px-6">
            <CompanionAvatar state="curious" size={64} className="mb-4" />
            <p className="text-sm">Hello! I'm your guide to consciousness exploration.</p>
            <p className="text-xs mt-2 text-slate-500">
              Type a message or click the mic to speak.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {['Tell me about my Sun', 'What patterns do you see?'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(message => (
            <motion.div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content || (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Loader2 size={12} className="animate-spin" />
                      Thinking...
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input with mic button */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Ask your guide...' : 'Connecting...'}
            disabled={!isConnected || voiceState === 'listening'}
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            style={{ maxHeight: 100 }}
          />
          {/* Mic Button */}
          <motion.button
            type="button"
            onClick={handleMicClick}
            disabled={voiceState === 'transcribing' || voiceState === 'thinking'}
            className={`p-2.5 rounded-xl transition-colors disabled:opacity-50 ${getMicButtonStyle()}`}
            whileTap={{ scale: 0.95 }}
            animate={voiceState === 'listening' ? { scale: [1, 1.05, 1] } : {}}
            transition={voiceState === 'listening' ? { duration: 1, repeat: Infinity } : {}}
            title={voiceState === 'listening' ? 'Stop listening' : 'Start voice input'}
          >
            {voiceState === 'listening' ? <Mic size={18} /> : <MicOff size={18} />}
          </motion.button>
          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isGenerating || !isConnected}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>
            Paradigms: {preferences.enabledParadigms.slice(0, 2).join(', ')}
            {preferences.enabledParadigms.length > 2 && '...'}
          </span>
          <span className="capitalize">{preferences.synthesisDepth} synthesis</span>
        </div>
      </form>

      {/* Resize handles */}
      <div className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-indigo-500/30" onMouseDown={handleMouseDown('n')} />
      <div className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-indigo-500/30" onMouseDown={handleMouseDown('s')} />
      <div className="absolute top-0 bottom-0 left-0 w-1 cursor-w-resize hover:bg-indigo-500/30" onMouseDown={handleMouseDown('w')} />
      <div className="absolute top-0 bottom-0 right-0 w-1 cursor-e-resize hover:bg-indigo-500/30" onMouseDown={handleMouseDown('e')} />
      <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-indigo-500/50 rounded-tl-2xl" onMouseDown={handleMouseDown('nw')} />
      <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-indigo-500/50 rounded-tr-2xl" onMouseDown={handleMouseDown('ne')} />
      <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-indigo-500/50 rounded-bl-2xl" onMouseDown={handleMouseDown('sw')} />
      <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-indigo-500/50 rounded-br-2xl" onMouseDown={handleMouseDown('se')} />
    </motion.div>
  )
}

export default CompanionPanel
