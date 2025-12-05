/**
 * VoiceControls - Voice chat interface controls
 * Shows microphone button, voice state indicator, and voice/text toggle
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Settings, Loader2, Phone, PhoneOff } from 'lucide-react'
import { useVoiceChat, VoiceSettings, VoiceState } from '../hooks/useVoiceChat'
import { getVoiceSettings, getVoiceOptions, updateVoiceSettings, VoiceInfo } from '@/lib/api/voice'

interface VoiceControlsProps {
  onSwitchToText: () => void
  textMessages: Array<{ role: string; content: string }>
}

export function VoiceControls({ onSwitchToText, textMessages }: VoiceControlsProps) {
  const [voiceSettings, setVoiceSettingsState] = useState<VoiceSettings | null>(null)
  const [voiceOptions, setVoiceOptions] = useState<VoiceInfo[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const {
    voiceConnectionStatus,
    voiceState,
    isVoiceActive,
    transcript,
    connect,
    disconnect,
    startListening,
    stopListening,
    syncHistoryFromText,
  } = useVoiceChat(voiceSettings || undefined)

  // Load voice settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settings, options] = await Promise.all([
          getVoiceSettings(),
          getVoiceOptions(),
        ])
        setVoiceSettingsState(settings)
        setVoiceOptions(options.voices)
      } catch (error) {
        console.error('Failed to load voice settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Sync text history when switching to voice
  useEffect(() => {
    if (isVoiceActive && textMessages.length > 0) {
      syncHistoryFromText(textMessages)
    }
  }, [isVoiceActive, textMessages, syncHistoryFromText])

  // Handle voice button click
  const handleVoiceToggle = useCallback(async () => {
    if (voiceState === 'listening') {
      stopListening()
    } else if (isVoiceActive) {
      try {
        await startListening()
      } catch (error) {
        console.error('Failed to start listening:', error)
      }
    } else {
      // Start new voice session
      try {
        await connect()
        await startListening()
      } catch (error) {
        console.error('Failed to start voice chat:', error)
      }
    }
  }, [voiceState, isVoiceActive, startListening, stopListening, connect])

  // Handle end call
  const handleEndCall = useCallback(() => {
    disconnect()
    onSwitchToText()
  }, [disconnect, onSwitchToText])

  // Handle settings update
  const handleSettingsUpdate = async (updates: Partial<VoiceSettings>) => {
    try {
      const newSettings = await updateVoiceSettings(updates)
      setVoiceSettingsState(newSettings)
    } catch (error) {
      console.error('Failed to update voice settings:', error)
    }
  }

  // Get state indicator color
  const getStateColor = (state: VoiceState) => {
    switch (state) {
      case 'listening':
        return 'bg-red-500'
      case 'processing':
        return 'bg-yellow-500'
      case 'speaking':
        return 'bg-green-500'
      default:
        return 'bg-slate-500'
    }
  }

  // Get state label
  const getStateLabel = (state: VoiceState) => {
    switch (state) {
      case 'listening':
        return 'Listening...'
      case 'processing':
        return 'Processing...'
      case 'speaking':
        return 'Speaking...'
      default:
        return 'Ready'
    }
  }

  if (voiceConnectionStatus === 'no_api_key') {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <MicOff className="w-8 h-8 text-slate-500 mb-2" />
        <p className="text-sm text-slate-400 mb-2">
          Voice chat requires a Google API key
        </p>
        <button
          onClick={onSwitchToText}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          Switch to text chat
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Voice Status & Transcript Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Voice State Indicator */}
        <div className="mb-6">
          <motion.div
            className={`w-4 h-4 rounded-full ${getStateColor(voiceState)}`}
            animate={{
              scale: voiceState === 'listening' ? [1, 1.2, 1] : 1,
              opacity: voiceState === 'idle' ? 0.5 : 1,
            }}
            transition={{
              duration: 1,
              repeat: voiceState === 'listening' ? Infinity : 0,
            }}
          />
        </div>

        {/* State Label */}
        <p className="text-sm text-slate-400 mb-4">{getStateLabel(voiceState)}</p>

        {/* Live Transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xs text-center"
            >
              <p className="text-sm text-slate-300 italic">"{transcript}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Status */}
        {voiceConnectionStatus === 'connecting' && (
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-4">
            <Loader2 size={14} className="animate-spin" />
            Connecting...
          </div>
        )}
      </div>

      {/* Voice Controls */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center justify-center gap-4">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full transition-colors ${
              isMuted
                ? 'bg-slate-700 text-slate-400'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Main Voice Button */}
          <motion.button
            onClick={handleVoiceToggle}
            disabled={voiceConnectionStatus === 'connecting'}
            className={`p-5 rounded-full transition-colors ${
              voiceState === 'listening'
                ? 'bg-red-500 text-white'
                : voiceState === 'speaking'
                  ? 'bg-green-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            } disabled:opacity-50`}
            whileTap={{ scale: 0.95 }}
          >
            {voiceState === 'processing' ? (
              <Loader2 size={28} className="animate-spin" />
            ) : voiceState === 'listening' ? (
              <Mic size={28} />
            ) : (
              <Mic size={28} />
            )}
          </motion.button>

          {/* End Call Button */}
          {isVoiceActive && (
            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
              title="End voice chat"
            >
              <PhoneOff size={20} />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
            title="Voice settings"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Switch to Text */}
        <div className="flex justify-center mt-4">
          <button
            onClick={onSwitchToText}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Switch to text chat
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && voiceSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-700/50 bg-slate-800/50 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Voice Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Voice
                </label>
                <select
                  value={voiceSettings.voice_name}
                  onChange={(e) => handleSettingsUpdate({ voice_name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {voiceOptions.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Response Length */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Response Length
                </label>
                <div className="flex gap-2">
                  {(['brief', 'medium', 'detailed'] as const).map((length) => (
                    <button
                      key={length}
                      onClick={() => handleSettingsUpdate({ response_length: length })}
                      className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                        voiceSettings.response_length === length
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {length.charAt(0).toUpperCase() + length.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Personality
                </label>
                <input
                  type="text"
                  value={voiceSettings.personality}
                  onChange={(e) => handleSettingsUpdate({ personality: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g., mystical guide"
                />
              </div>

              {/* Speaking Style */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Speaking Style
                </label>
                <input
                  type="text"
                  value={voiceSettings.speaking_style}
                  onChange={(e) => handleSettingsUpdate({ speaking_style: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g., warm and contemplative"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default VoiceControls
