/**
 * Hybrid Voice Chat Hook
 *
 * Combines:
 * - Whisper STT for speech-to-text (local, offline)
 * - Claude Agent for AI processing (with all tools)
 * - Gemini TTS for text-to-speech (via speak_text tool)
 *
 * Protocol:
 * Client -> Server:
 * - start_session, audio_chunk, end_speech, text_message, stop_session, ping
 *
 * Server -> Client:
 * - connected, session_started, transcription, thinking, text_delta,
 *   audio_chunk, speech_start, speech_complete, tool_call, complete, error, pong
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCompanionStore } from '../stores/companionStore'
import { useChartStore } from '@/features/astrology/stores/chartStore'
import { captureScreenshot, captureChartWheel, captureCurrentView } from '@/lib/utils/screenshot'

// Audio configuration
const INPUT_SAMPLE_RATE = 16000 // 16kHz for Whisper input
const OUTPUT_SAMPLE_RATE = 24000 // 24kHz for Gemini TTS output

export type HybridVoiceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'no_api_key'

export type HybridVoiceState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'

interface UseHybridVoiceChatReturn {
  // State
  connectionStatus: HybridVoiceConnectionStatus
  voiceState: HybridVoiceState
  sessionId: string | null
  lastTranscription: string
  sttReady: boolean
  ttsReady: boolean

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  startListening: () => Promise<void>
  stopListening: () => void
  sendTextMessage: (text: string) => void
}

export function useHybridVoiceChat(): UseHybridVoiceChatReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingRef = useRef(false)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const voiceStateRef = useRef<HybridVoiceState>('idle')

  const [connectionStatus, setConnectionStatus] = useState<HybridVoiceConnectionStatus>('disconnected')
  const [voiceState, setVoiceStateInternal] = useState<HybridVoiceState>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [lastTranscription, setLastTranscription] = useState('')
  const [sttReady, setSttReady] = useState(false)
  const [ttsReady, setTtsReady] = useState(false)

  // Keep ref in sync with state
  const setVoiceState = useCallback((state: HybridVoiceState) => {
    voiceStateRef.current = state
    setVoiceStateInternal(state)
  }, [])

  const { addMessage, appendToLastMessage } = useCompanionStore()
  const chartStore = useChartStore()
  const streamingRef = useRef(false) // Track if we're currently streaming a response

  // Get astrological context for voice session
  const getAstrologicalContext = useCallback(() => {
    const chart = chartStore.getActiveChart()

    // Get current page from App.tsx's broadcast (window.__currentPage)
    const currentPage = (window as { __currentPage?: string }).__currentPage || 'dashboard'

    // Build base context even without a chart
    const baseContext = {
      current_page: currentPage,
      zodiac_system: chartStore.zodiacSystem,
      house_system: chartStore.houseSystem,
    }

    if (!chart) return baseContext

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
      ...baseContext,
      chart_id: activeChartId,
      chart_type: chartType || 'natal',
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

  // Handle tool commands from Claude
  const handleToolCommand = useCallback((toolName: string, toolArgs: Record<string, unknown>, toolId?: string) => {
    // speak_text is handled internally (audio comes via audio_chunk)
    if (toolName === 'speak_text') return

    try {
      switch (toolName) {
        case 'navigate_to_page': {
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
          type HouseSystem = 'placidus' | 'koch' | 'whole_sign' | 'equal' | 'campanus' | 'regiomontanus' | 'porphyry' | 'morinus'
          chartStore.setHouseSystem(toolArgs.system as HouseSystem)
          break
        }

        case 'select_planet': {
          window.dispatchEvent(
            new CustomEvent('select-planet', {
              detail: { planet: toolArgs.planet },
            })
          )
          break
        }

        case 'select_house': {
          window.dispatchEvent(
            new CustomEvent('select-house', {
              detail: { house: toolArgs.house_number },
            })
          )
          break
        }

        case 'clear_selection': {
          window.dispatchEvent(new CustomEvent('clear-chart-selection'))
          break
        }

        case 'toggle_layer': {
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
            window.dispatchEvent(
              new CustomEvent('set-transit-date', {
                detail: { date },
              })
            )
          }
          break
        }

        case 'recalculate_chart': {
          window.dispatchEvent(new CustomEvent('recalculate-chart'))
          break
        }

        case 'capture_screenshot': {
          // Capture screenshot and send result back to agent
          const target = toolArgs.target as string | undefined

          ;(async () => {
            console.log('[HYBRID] Capturing screenshot, target:', target)
            let result
            try {
              if (target === 'chart' || target === 'chart_wheel') {
                result = await captureChartWheel()
              } else if (target === 'page' || target === 'current') {
                result = await captureCurrentView()
              } else if (target) {
                // Custom selector
                result = await captureScreenshot({ selector: target })
              } else {
                // Default to current view
                result = await captureCurrentView()
              }

              // Send the screenshot back to the WebSocket
              if (wsRef.current?.readyState === WebSocket.OPEN && toolId) {
                console.log('[HYBRID] Sending screenshot result back, success:', result.success)
                wsRef.current.send(
                  JSON.stringify({
                    type: 'tool_result',
                    tool_call_id: toolId,
                    tool_name: toolName,
                    result: result.success
                      ? {
                          success: true,
                          image: result.image,
                          mime_type: result.mimeType,
                          width: result.width,
                          height: result.height,
                        }
                      : {
                          success: false,
                          error: result.error,
                        },
                  })
                )
              }
            } catch (error) {
              console.error('[HYBRID] Screenshot capture error:', error)
              if (wsRef.current?.readyState === WebSocket.OPEN && toolId) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'tool_result',
                    tool_call_id: toolId,
                    tool_name: toolName,
                    result: {
                      success: false,
                      error: error instanceof Error ? error.message : 'Screenshot capture failed',
                    },
                  })
                )
              }
            }
          })()
          break
        }

        default:
          console.log('[HYBRID] Unknown tool command:', toolName)
      }
    } catch (error) {
      console.error('[HYBRID] Error executing tool command:', toolName, error)
    }
  }, [chartStore])

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

  // Play queued audio
  const playAudioQueue = async () => {
    // Play chunks as they arrive for low latency streaming
    // Combine a few small chunks to reduce scheduling overhead
    const MAX_CHUNKS_PER_PLAY = 2

    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      currentSourceRef.current = null
      // After audio done, go back to idle
      if (voiceStateRef.current === 'speaking') {
        setVoiceState('idle')
      }
      return
    }

    isPlayingRef.current = true

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    const ctx = audioContextRef.current

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

    const gainNode = ctx.createGain()
    gainNode.gain.value = 0.7
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

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
  }

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'connected':
          setSessionId(data.session_id)
          setSttReady(data.stt_ready)
          setTtsReady(data.tts_ready)
          setConnectionStatus('connected')
          console.log('[HYBRID] Connected:', data)
          break

        case 'session_started':
          console.log('[HYBRID] Session started')
          setVoiceState('idle')
          break

        case 'transcription':
          setLastTranscription(data.text || '')
          if (data.text) {
            addMessage({ role: 'user', content: data.text })
          }
          // If transcription received, Claude is about to think
          if (data.is_final) {
            setVoiceState('thinking')
          }
          break

        case 'thinking':
          setVoiceState('thinking')
          // Start a new streaming message
          if (!streamingRef.current) {
            streamingRef.current = true
            addMessage({ role: 'assistant', content: '' })
          }
          break

        case 'text_delta':
          // Stream text to UI in real-time
          if (data.content) {
            appendToLastMessage(data.content)
          }
          break

        case 'audio_chunk':
          // TTS audio from Gemini
          if (data.data) {
            console.log(`[HYBRID] Received audio chunk: ${data.data.length} chars`)
            const audioData = base64ToFloat32(data.data)
            console.log(`[HYBRID] Decoded audio: ${audioData.length} samples`)
            audioQueueRef.current.push(audioData)
            if (!isPlayingRef.current) {
              playAudioQueue()
            }
            setVoiceState('speaking')
          }
          break

        case 'speech_start':
          console.log('[HYBRID] TTS speech starting')
          setVoiceState('speaking')
          break

        case 'speech_complete':
          console.log('[HYBRID] TTS speech complete')
          // Audio queue will handle transition to idle
          break

        case 'tool_call':
          // Frontend tool from Claude - pass tool ID for async tools like capture_screenshot
          handleToolCommand(data.name, data.input || {}, data.id)
          break

        case 'tool_result':
          // Tool result from backend - ignore (handled server-side)
          break

        case 'complete':
          // Full response complete - message was already streamed via text_delta
          // Reset streaming state
          streamingRef.current = false
          // If not speaking, go to idle
          if (voiceStateRef.current !== 'speaking') {
            setVoiceState('idle')
          }
          break

        case 'session_stopped':
          setVoiceState('idle')
          break

        case 'error':
          console.error('[HYBRID] Error:', data.error)
          if (data.code === 'api_key_missing') {
            setConnectionStatus('no_api_key')
          }
          break

        case 'pong':
          break

        default:
          console.log('[HYBRID] Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('[HYBRID] Error parsing message:', error)
    }
  }, [addMessage, handleToolCommand, setVoiceState])

  // Connect to hybrid voice WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss:' : 'ws:'
    const apiHost = apiBaseUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '')
    const wsUrl = `${wsProtocol}//${apiHost}/api/ws/hybrid-voice`

    console.log('[HYBRID] Connecting to:', wsUrl)

    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('[HYBRID] WebSocket connected')
          wsRef.current = ws
          resolve()
        }

        ws.onmessage = (event) => {
          handleMessage(event)
        }

        ws.onclose = (event) => {
          console.log('[HYBRID] WebSocket closed:', event.code, event.reason)
          setConnectionStatus('disconnected')
          wsRef.current = null
        }

        ws.onerror = (error) => {
          console.error('[HYBRID] WebSocket error:', error)
          setConnectionStatus('error')
          reject(error)
        }
      } catch (error) {
        console.error('[HYBRID] Failed to create WebSocket:', error)
        setConnectionStatus('error')
        reject(error)
      }
    })
  }, [handleMessage])

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

  // Start listening
  const startListening = useCallback(async () => {
    stopAudioPlayback()

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect()
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[HYBRID] WebSocket not ready')
      return
    }

    // Start session
    wsRef.current.send(JSON.stringify({
      type: 'start_session',
      voice_settings: {
        voice_name: 'Kore',
        style: 'warm',
      },
      astrological_context: getAstrologicalContext(),
    }))

    // Request microphone
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

      const ctx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE })
      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      let chunkCount = 0
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && voiceStateRef.current === 'listening') {
          const inputData = e.inputBuffer.getChannelData(0)
          const pcmData = float32ToInt16(inputData)
          const base64 = arrayBufferToBase64(pcmData.buffer)

          wsRef.current.send(JSON.stringify({
            type: 'audio_chunk',
            data: base64,
          }))

          chunkCount++
          if (chunkCount % 50 === 0) {
            console.log(`[HYBRID] Sent ${chunkCount} audio chunks`)
          }
        }
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      setVoiceState('listening')
      console.log('[HYBRID] Listening started')

    } catch (error) {
      console.error('[HYBRID] Failed to access microphone:', error)
      throw error
    }
  }, [connect, getAstrologicalContext, setVoiceState])

  // Stop listening
  const stopListening = useCallback(async () => {
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

    setVoiceState('transcribing')

    // Capture screenshot BEFORE sending end_speech so Claude sees what user sees
    let screenshotData: { image?: string; mimeType?: string } = {}
    try {
      console.log('[HYBRID] Capturing screenshot before sending to Claude...')
      const result = await captureCurrentView()
      if (result.success && result.image) {
        screenshotData = {
          image: result.image,
          mimeType: result.mimeType,
        }
        console.log(`[HYBRID] Screenshot captured: ${result.width}x${result.height}`)
      }
    } catch (error) {
      console.warn('[HYBRID] Screenshot capture failed:', error)
    }

    // Signal end of speech WITH screenshot
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end_speech',
        screenshot: screenshotData.image ? screenshotData : undefined,
      }))
    }
  }, [setVoiceState])

  // Send text message (fallback)
  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text.trim()) {
      addMessage({ role: 'user', content: text })
      wsRef.current.send(JSON.stringify({
        type: 'text_message',
        content: text,
      }))
      setVoiceState('thinking')
    }
  }, [addMessage, setVoiceState])

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_session' }))
    }

    stopListening()
    stopAudioPlayback()

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setConnectionStatus('disconnected')
    setVoiceState('idle')
  }, [stopListening, setVoiceState])

  // Ping to keep alive
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
      disconnect()
    }
  }, [disconnect])

  return {
    connectionStatus,
    voiceState,
    sessionId,
    lastTranscription,
    sttReady,
    ttsReady,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendTextMessage,
  }
}
