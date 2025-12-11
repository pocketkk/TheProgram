/**
 * Voice Chat Hook
 * Handles WebSocket connection, audio capture, and playback for voice chat
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCompanionStore } from '../stores/companionStore'
import { useChartStore } from '@/features/birthchart/stores/chartStore'

// Audio configuration
const INPUT_SAMPLE_RATE = 16000 // 16kHz for input
const OUTPUT_SAMPLE_RATE = 24000 // 24kHz for output

export interface VoiceSettings {
  voice_name: string
  personality: string
  speaking_style: string
  response_length: 'brief' | 'medium' | 'detailed'
  custom_personality: string | null
}

export type VoiceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'no_api_key'

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'

interface UseVoiceChatReturn {
  // State
  voiceConnectionStatus: VoiceConnectionStatus
  voiceState: VoiceState
  isVoiceActive: boolean
  sessionId: string | null
  transcript: string

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  startListening: () => Promise<void>
  stopListening: () => void
  sendTextInVoiceMode: (text: string) => void
  syncHistoryFromText: (history: Array<{ role: string; content: string }>) => void
  clearHistory: () => void
}

// Reconnection constants
const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 30000 // 30 seconds

export function useVoiceChat(voiceSettings?: VoiceSettings): UseVoiceChatReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const playbackStartedRef = useRef(false)  // Prevents multiple playback triggers
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)
  const voiceStateRef = useRef<VoiceState>('idle')
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [voiceConnectionStatus, setVoiceConnectionStatus] = useState<VoiceConnectionStatus>('disconnected')
  const [voiceState, setVoiceStateInternal] = useState<VoiceState>('idle')
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')

  // Wrapper to keep ref in sync with state
  const setVoiceState = useCallback((state: VoiceState) => {
    voiceStateRef.current = state
    setVoiceStateInternal(state)
  }, [])

  const { addMessage, messages } = useCompanionStore()
  const chartStore = useChartStore()

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    )
    return delay
  }, [])

  // Get astrological context for voice session
  const getAstrologicalContext = useCallback(() => {
    const chart = chartStore.getActiveChart()
    if (!chart) return null

    // Get the active chart ID and type from the store (not on chart object)
    const activeChartId = chartStore.activeChartId
    const chartType = chartStore.chartType

    const planets = chart.planets.reduce(
      (acc, p) => {
        acc[p.name.toLowerCase()] = {
          sign_name: p.sign,
          degree_in_sign: p.degree,
          longitude: p.longitude,
          retrograde: p.isRetrograde,
          house: p.house,
        }
        return acc
      },
      {} as Record<string, unknown>
    )

    return {
      // Include chart identification for single-user context
      chart_id: activeChartId,
      chart_name: 'Current Chart', // BirthChart doesn't store name, backend will fill this in
      chart_type: chartType || 'natal',
      // Planet positions
      planets,
      houses: {
        cusps: chart.houses?.map(h => h.cusp) || [],
        ascendant: chart.houses?.find(h => h.number === 1)?.cusp,
        midheaven: chart.houses?.find(h => h.number === 10)?.cusp,
      },
      aspects: chart.aspects.map(a => ({
        planet1: a.planet1,
        planet2: a.planet2,
        type: a.type,
        orb: a.orb,
      })),
    }
  }, [chartStore])

  // Connect to voice WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setVoiceConnectionStatus('connecting')

    // Check if Google API key is configured
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

    try {
      const response = await fetch(`${apiBaseUrl}/voice/status`)
      if (response.ok) {
        const status = await response.json()
        if (!status.available) {
          setVoiceConnectionStatus('no_api_key')
          return
        }
      }
    } catch (error) {
      console.warn('Could not check voice status:', error)
    }

    // Build WebSocket URL
    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss:' : 'ws:'
    const apiHost = apiBaseUrl.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProtocol}//${apiHost}/ws/voice`

    // Return a promise that resolves when WebSocket is open
    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('Voice WebSocket connected')
          wsRef.current = ws
          reconnectAttemptsRef.current = 0 // Reset on successful connection
          resolve()
        }

        ws.onmessage = (event) => {
          handleMessage(event)
        }

        ws.onclose = (event) => {
          console.log('Voice WebSocket closed', event.code, event.reason)
          setVoiceConnectionStatus('disconnected')
          setIsVoiceActive(false)
          wsRef.current = null

          // Attempt reconnection if not intentionally closed
          if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = getReconnectDelay()
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`)

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++
              connect()
            }, delay)
          }
        }

        ws.onerror = (error) => {
          console.error('Voice WebSocket error:', error)
          setVoiceConnectionStatus('error')
          reject(error)
        }
      } catch (error) {
        console.error('Failed to create Voice WebSocket:', error)
        setVoiceConnectionStatus('error')

        // Attempt reconnection on connection failure
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = getReconnectDelay()
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
        reject(error)
      }
    })
  }, [getReconnectDelay])

  // Handle tool commands from voice
  const handleToolCommand = useCallback((toolName: string, toolArgs: Record<string, unknown>) => {
    try {
      switch (toolName) {
        case 'navigate_to_page': {
          // Map API page names to app page names
          const pageMap: Record<string, string> = {
            dashboard: 'dashboard',
            birthchart: 'birthchart',
            cosmos: 'charts',
            charts: 'charts',
            journal: 'journal',
            timeline: 'timeline',
            canvas: 'canvas',
            settings: 'settings',
            help: 'help',
          }
          const page = toolArgs.page as string
          const appPage = pageMap[page] || page
          // Dispatch navigation event for App.tsx to handle
          window.dispatchEvent(
            new CustomEvent('companion-navigate', { detail: { page: appPage } })
          )
          break
        }

        case 'load_chart': {
          const chartId = toolArgs.chart_id as string
          chartStore.setActiveChart(chartId)
          break
        }

        case 'set_zodiac_system': {
          const system = toolArgs.system as 'western' | 'vedic' | 'human-design'
          chartStore.setZodiacSystem(system)
          break
        }

        case 'set_house_system': {
          // Import HouseSystem type for proper typing
          type HouseSystem = 'placidus' | 'koch' | 'whole_sign' | 'equal' | 'campanus' | 'regiomontanus' | 'porphyry' | 'morinus'
          chartStore.setHouseSystem(toolArgs.system as HouseSystem)
          break
        }

        case 'select_planet': {
          // Dispatch event for chart component to handle
          window.dispatchEvent(
            new CustomEvent('select-planet', {
              detail: { planet: toolArgs.planet },
            })
          )
          break
        }

        case 'select_house': {
          // Dispatch event for chart component to handle
          window.dispatchEvent(
            new CustomEvent('select-house', {
              detail: { house: toolArgs.house_number },
            })
          )
          break
        }

        case 'clear_selection': {
          // Dispatch event for chart component to handle
          window.dispatchEvent(new CustomEvent('clear-chart-selection'))
          break
        }

        case 'toggle_layer': {
          // Dispatch event for chart component to handle
          window.dispatchEvent(
            new CustomEvent('toggle-chart-layer', {
              detail: { layer: toolArgs.layer, visible: toolArgs.visible },
            })
          )
          break
        }

        case 'set_transit_date': {
          const date = toolArgs.date as string
          if (date) {
            // Dispatch event for chart component to handle
            window.dispatchEvent(
              new CustomEvent('set-transit-date', {
                detail: { date },
              })
            )
          }
          break
        }

        case 'recalculate_chart': {
          // Dispatch recalculation event
          window.dispatchEvent(new CustomEvent('recalculate-chart'))
          break
        }

        default:
          console.log('[VOICE] Unknown tool command:', toolName)
      }
    } catch (error) {
      console.error('[VOICE] Error executing tool command:', toolName, error)
    }
  }, [chartStore])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'connected':
          setSessionId(data.session_id)
          setVoiceConnectionStatus('connected')
          break

        case 'session_started':
          setIsVoiceActive(true)
          // Don't set to idle here - let startListening set to 'listening'
          console.log('[VOICE] Session started with voice:', data.voice_name, 'current state:', voiceStateRef.current)
          break

        case 'audio_chunk':
          // Clear processing timeout - we're getting a response
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current)
            processingTimeoutRef.current = null
          }
          // Decode and queue audio for playback
          if (data.data) {
            const audioData = base64ToFloat32(data.data)
            audioQueueRef.current.push(audioData)
            console.log('[VOICE] Received audio chunk, queue size:', audioQueueRef.current.length)
            // Only trigger playback start once - the playback loop handles the rest
            if (!isPlayingRef.current && !playbackStartedRef.current) {
              console.log('[VOICE] Starting audio playback')
              playbackStartedRef.current = true
              playAudioQueue()
            }
            setVoiceState('speaking')
          }
          break

        case 'text_delta':
          // Accumulate transcript
          setTranscript(prev => prev + data.content)
          break

        case 'transcript':
          // Full transcript from Gemini
          if (data.role === 'model' && data.text) {
            addMessage({
              role: 'assistant',
              content: data.text,
            })
          }
          setTranscript('')
          break

        case 'turn_complete':
          // Reset playback flags for next response
          playbackStartedRef.current = false
          // If microphone is still active, transition to listening so user can speak
          // Otherwise go to idle
          if (mediaStreamRef.current) {
            console.log('[VOICE] Turn complete - transitioning to LISTENING (mic active)')
            setVoiceState('listening')
          } else {
            console.log('[VOICE] Turn complete - transitioning to idle (no mic)')
            setVoiceState('idle')
          }
          break

        case 'session_stopped':
          setIsVoiceActive(false)
          setVoiceState('idle')
          break

        case 'history_synced':
          console.log('Voice history synced')
          break

        case 'tool_command':
          // Execute tool command from voice (frontend tools)
          console.log('[VOICE] Tool command received:', data.tool_name, data.tool_args)
          handleToolCommand(data.tool_name, data.tool_args)
          break

        case 'error': {
          // Filter out transient errors that don't affect functionality
          const errorMsg = data.error || ''
          if (errorMsg.includes('list index out of range') ||
              errorMsg.includes('IndexError')) {
            // Transient Gemini library error - ignore silently
            console.debug('Voice transient error (ignored):', errorMsg)
          } else {
            console.error('Voice error:', errorMsg)
            if (data.code === 'api_key_missing') {
              setVoiceConnectionStatus('no_api_key')
            }
          }
          break
        }

        case 'pong':
          break

        default:
          console.log('Unknown voice message type:', data.type)
      }
    } catch (error) {
      console.error('Error parsing voice message:', error)
    }
  }, [addMessage, handleToolCommand])

  // Convert base64 PCM to Float32Array for Web Audio
  const base64ToFloat32 = (base64: string): Float32Array => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    // Convert Int16 PCM to Float32
    const int16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0
    }

    return float32
  }

  // Play queued audio with batching for smoother playback
  const playAudioQueue = async () => {
    // Wait for at least some audio to accumulate before playing
    const MIN_CHUNKS_TO_START = 4  // Increased for better buffering
    const MAX_CHUNKS_PER_PLAY = 5  // Combine more chunks for smoother audio

    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      playbackStartedRef.current = false  // Allow new playback to be triggered
      currentSourceRef.current = null
      return
    }

    // If not playing yet, wait for minimum chunks
    if (!isPlayingRef.current && audioQueueRef.current.length < MIN_CHUNKS_TO_START) {
      // Schedule a check after a short delay - playbackStartedRef prevents re-entry
      setTimeout(() => playAudioQueue(), 100)
      return
    }

    isPlayingRef.current = true

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    const ctx = audioContextRef.current

    // Combine multiple chunks for smoother playback
    const chunksToPlay = Math.min(audioQueueRef.current.length, MAX_CHUNKS_PER_PLAY)
    const chunks = audioQueueRef.current.splice(0, chunksToPlay)
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const combinedAudio = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      combinedAudio.set(chunk, offset)
      offset += chunk.length
    }

    const buffer = ctx.createBuffer(1, combinedAudio.length, OUTPUT_SAMPLE_RATE)
    buffer.copyToChannel(combinedAudio, 0)

    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Add gain node for volume control (reduce volume to prevent loudness)
    const gainNode = ctx.createGain()
    gainNode.gain.value = 0.7  // 70% volume
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Track current source for potential cleanup
    currentSourceRef.current = source

    source.onended = () => {
      currentSourceRef.current = null
      playAudioQueue()
    }

    source.start()
  }

  // Stop any currently playing audio
  const stopAudioPlayback = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch {
        // Already stopped
      }
      currentSourceRef.current = null
    }
    audioQueueRef.current = []
    isPlayingRef.current = false
    playbackStartedRef.current = false
  }

  // Start voice session and listening
  const startListening = useCallback(async () => {
    // Stop any currently playing audio to prevent overlap
    stopAudioPlayback()

    // Connect if not already connected
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect()
      // Wait a bit for the 'connected' message to be processed
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Double-check WebSocket is ready
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not ready after connect')
      return
    }

    // Start session if not active
    if (!isVoiceActive) {
      console.log('Sending start_session message')
      wsRef.current.send(JSON.stringify({
        type: 'start_session',
        voice_settings: voiceSettings || {
          voice_name: 'Kore',
          personality: 'mystical guide',
          speaking_style: 'warm and contemplative',
          response_length: 'medium',
        },
        session_id: sessionId,
        astrological_context: getAstrologicalContext(),
      }))
    }

    // Request microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: INPUT_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      mediaStreamRef.current = stream

      // Create audio context for capturing
      const ctx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE })
      const source = ctx.createMediaStreamSource(stream)

      // Use ScriptProcessorNode for capturing audio (deprecated but widely supported)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      let audioChunkCount = 0
      processor.onaudioprocess = (e) => {
        // Use ref to get current voiceState (avoids stale closure)
        if (wsRef.current?.readyState === WebSocket.OPEN && voiceStateRef.current === 'listening') {
          const inputData = e.inputBuffer.getChannelData(0)
          const pcmData = float32ToInt16(inputData)
          const base64 = arrayBufferToBase64(pcmData.buffer)

          wsRef.current.send(JSON.stringify({
            type: 'audio_chunk',
            data: base64,
          }))

          // Log periodically to avoid flooding console
          audioChunkCount++
          if (audioChunkCount % 50 === 0) {
            console.log(`[VOICE] Sent ${audioChunkCount} audio chunks to backend, voiceState: ${voiceStateRef.current}`)
          }
        } else if (audioChunkCount === 0) {
          // Log why we're not sending (only once)
          audioChunkCount = -1  // Mark as logged
          console.log(`[VOICE] Audio processor ready, waiting for listening state. Current: ${voiceStateRef.current}, WS: ${wsRef.current?.readyState}`)
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      console.log('[VOICE] Audio capture initialized, setting state to LISTENING')
      setVoiceState('listening')

    } catch (error) {
      console.error('Failed to access microphone:', error)
      throw error
    }
  }, [connect, voiceSettings, sessionId, isVoiceActive, voiceState, getAstrologicalContext])

  // Convert Float32 to Int16 PCM
  const float32ToInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16
  }

  // Convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBufferLike): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // Stop listening
  const stopListening = useCallback(() => {
    setVoiceState('processing')

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // Signal end of turn
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_turn' }))
    }

    // Set timeout to reset to idle if no response received
    // VAD should trigger a response within ~2-3 seconds after speech stops
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
    }
    processingTimeoutRef.current = setTimeout(() => {
      if (voiceStateRef.current === 'processing') {
        console.warn('Processing timeout - resetting to idle')
        setVoiceState('idle')
      }
    }, 10000) // 10 second timeout
  }, [])

  // Send text while in voice mode
  const sendTextInVoiceMode = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text.trim()) {
      // Add user message to store
      addMessage({ role: 'user', content: text })

      wsRef.current.send(JSON.stringify({
        type: 'text_message',
        content: text,
      }))
    }
  }, [addMessage])

  // Sync history from text chat
  const syncHistoryFromText = useCallback((history: Array<{ role: string; content: string }>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'sync_history',
        history: history.map(m => ({
          role: m.role,
          content: m.content,
          mode: 'text',
        })),
      }))
    }
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear_history' }))
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    // Prevent automatic reconnection
    shouldReconnectRef.current = false

    // Cancel any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Stop session
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_session' }))
    }

    // Stop listening and any audio playback
    stopListening()
    stopAudioPlayback()

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setVoiceConnectionStatus('disconnected')
    setIsVoiceActive(false)
    setVoiceState('idle')
    reconnectAttemptsRef.current = 0
  }, [stopListening])

  // Reset reconnection flag when connecting
  const connectWithReconnect = useCallback(async () => {
    shouldReconnectRef.current = true
    reconnectAttemptsRef.current = 0
    await connect()
  }, [connect])

  // Ping to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    return () => clearInterval(pingInterval)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      disconnect()
    }
  }, [disconnect])

  return {
    voiceConnectionStatus,
    voiceState,
    isVoiceActive,
    sessionId,
    transcript,
    connect: connectWithReconnect,
    disconnect,
    startListening,
    stopListening,
    sendTextInVoiceMode,
    syncHistoryFromText,
    clearHistory,
  }
}
