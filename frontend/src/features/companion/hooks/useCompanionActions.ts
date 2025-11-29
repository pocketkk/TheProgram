/**
 * Companion Actions Hook
 * Manages WebSocket connection and dispatches AI tool calls to chartStore
 */

import { useCallback, useEffect, useRef } from 'react'
import { useCompanionStore } from '../stores/companionStore'
import { useChartStore } from '@/features/birthchart/stores/chartStore'
import { useTransitStore } from '@/store/transitStore'
import type { AspectPattern } from '@/lib/astrology/patterns'

// Custom events for the app to listen to
// These dispatch state changes that specific pages handle
declare global {
  interface WindowEventMap {
    'companion-navigate': CustomEvent<{ page: string }>
    'companion-recalculate-chart': CustomEvent<void>
    'companion-set-transit-date': CustomEvent<{ date: string | null }>
  }
}

// WebSocket message types
interface WSMessage {
  type: string
  [key: string]: unknown
}

interface TextDeltaMessage extends WSMessage {
  type: 'text_delta'
  content: string
}

interface ToolCallMessage extends WSMessage {
  type: 'tool_call'
  id: string
  name: string
  input: Record<string, unknown>
  execute_on: 'frontend' | 'backend'
}

interface ErrorMessage extends WSMessage {
  type: 'error'
  error: string
}

interface ConnectedMessage extends WSMessage {
  type: 'connected'
  session_id: string
}

interface ThinkingMessage extends WSMessage {
  type: 'thinking'
  message: string
}

interface InsightMessage extends WSMessage {
  type: 'insight'
  message: string
  trigger: string
}

// Chart context for AI
interface ChartContext {
  planets: Record<string, unknown>
  houses: Record<string, unknown>
  aspects: unknown[]
  patterns: AspectPattern[]
}

// App context for AI - includes page and state info
interface AppContext {
  current_page: string
  active_chart_id: string | null
  chart_data: ChartContext | null
  zodiac_system: string
  house_system: string
}

export function useCompanionActions() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Companion store
  const {
    sessionId,
    connectionStatus,
    preferences,
    setConnectionStatus,
    setSessionId,
    addMessage,
    appendToLastMessage,
    setIsGenerating,
    setCurrentAction,
    setAvatarState,
    addToolCall,
    updateToolCallStatus,
    addInsight,
  } = useCompanionStore()

  // Chart store for tool execution
  const chartStore = useChartStore()

  // Transit store for transit date control
  const transitStore = useTransitStore()

  // Get current chart context for AI
  const getChartContext = useCallback((): ChartContext | null => {
    const chart = chartStore.getActiveChart()
    if (!chart) return null

    return {
      planets: chart.planets.reduce(
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
      ),
      houses: {
        cusps: chart.houses?.map(h => h.degree) || [],
        ascendant: chart.houses?.[0]?.degree,
      },
      aspects: chart.aspects.map(a => ({
        planet1: a.planet1,
        planet2: a.planet2,
        type: a.type,
        orb: a.orb,
      })),
      patterns: [], // Would come from pattern detection
    }
  }, [chartStore])

  // Get full app context for AI - includes page, chart state, etc.
  const getAppContext = useCallback((): AppContext => {
    // Get current page from App.tsx's broadcast (window.__currentPage)
    // This is set by App.tsx useEffect whenever currentPage changes
    const currentPage = (window as any).__currentPage || 'dashboard'

    return {
      current_page: currentPage,
      active_chart_id: chartStore.activeChartId,
      chart_data: getChartContext(),
      zodiac_system: chartStore.zodiacSystem,
      house_system: chartStore.houseSystem,
    }
  }, [chartStore, getChartContext])

  // Execute frontend tool call
  const executeToolCall = useCallback(
    (toolCall: ToolCallMessage) => {
      const { name, input, id } = toolCall

      setCurrentAction({
        type: name,
        target: JSON.stringify(input),
        startTime: new Date(),
      })

      try {
        switch (name) {
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
            const page = input.page as string
            const appPage = pageMap[page] || page
            // Dispatch navigation event for App.tsx to handle
            window.dispatchEvent(
              new CustomEvent('companion-navigate', { detail: { page: appPage } })
            )
            break
          }

          case 'load_chart': {
            const chartId = input.chart_id as string
            chartStore.setActiveChart(chartId)
            break
          }

          case 'set_zodiac_system': {
            const system = input.system as 'western' | 'vedic' | 'human-design'
            chartStore.setZodiacSystem(system)
            break
          }

          case 'set_house_system': {
            const houseSystem = input.system as Parameters<
              typeof chartStore.setHouseSystem
            >[0]
            chartStore.setHouseSystem(houseSystem)
            break
          }

          case 'set_ayanamsa': {
            const ayanamsa = input.ayanamsa as Parameters<
              typeof chartStore.setAyanamsa
            >[0]
            chartStore.setAyanamsa(ayanamsa)
            break
          }

          case 'select_planet': {
            const planetName = input.planet as string
            const chart = chartStore.getActiveChart()
            const planet = chart?.planets.find(
              p => p.name.toLowerCase() === planetName.toLowerCase()
            )
            if (planet) {
              chartStore.setSelectedElement({
                type: 'planet',
                id: planet.name,
                data: planet,
              })
            }
            break
          }

          case 'select_house': {
            const houseNumber = input.house_number as number
            chartStore.setActiveHouse(houseNumber)
            break
          }

          case 'select_aspect': {
            const planet1 = input.planet1 as string
            const planet2 = input.planet2 as string
            const chart = chartStore.getActiveChart()
            const aspect = chart?.aspects.find(
              a =>
                (a.planet1.toLowerCase() === planet1.toLowerCase() &&
                  a.planet2.toLowerCase() === planet2.toLowerCase()) ||
                (a.planet1.toLowerCase() === planet2.toLowerCase() &&
                  a.planet2.toLowerCase() === planet1.toLowerCase())
            )
            if (aspect) {
              chartStore.setSelectedElement({
                type: 'aspect',
                id: `${aspect.planet1}-${aspect.planet2}`,
                data: aspect,
              })
            }
            break
          }

          case 'highlight_pattern': {
            // Pattern highlighting would need pattern detection results
            // For now, we'll just log it
            console.log('Highlight pattern:', input)
            break
          }

          case 'clear_selection': {
            chartStore.clearInteractions()
            break
          }

          case 'toggle_layer': {
            const layer = input.layer as
              | 'zodiac'
              | 'houses'
              | 'planets'
              | 'aspects'
            const visible = input.visible as boolean
            // toggleLayer only toggles, so we need to check current state
            const currentVisibility =
              chartStore.visibility[
                layer as keyof typeof chartStore.visibility
              ]
            if (currentVisibility !== visible) {
              chartStore.toggleLayer(layer)
            }
            break
          }

          case 'set_aspect_filter': {
            const showMajor = input.show_major as boolean | undefined
            const showMinor = input.show_minor as boolean | undefined
            const maxOrb = input.max_orb as number | undefined

            if (showMajor !== undefined) {
              chartStore.setAspectVisibility('major', showMajor)
            }
            if (showMinor !== undefined) {
              chartStore.setAspectVisibility('minor', showMinor)
            }
            if (maxOrb !== undefined) {
              chartStore.setMaxOrb(maxOrb)
            }
            break
          }

          case 'set_chart_orientation': {
            const orientation = input.orientation as 'natal' | 'natural'
            // This would need a new method in chartStore
            // For now, store it but don't act
            console.log('Set orientation:', orientation)
            break
          }

          case 'recalculate_chart': {
            // Dispatch event to BirthChartPage to recalculate with current settings
            // This applies any pending zodiac system, house system, or ayanamsa changes
            window.dispatchEvent(new CustomEvent('companion-recalculate-chart'))
            break
          }

          case 'set_transit_date': {
            // Set the transit date to show transits for a specific date
            // Use null or empty string to reset to current date
            console.log('[useCompanionActions] set_transit_date tool called with input:', JSON.stringify(input))
            const date = input.date as string | null
            console.log('[useCompanionActions] Extracted date value:', date, 'type:', typeof date)
            const transitDate = date && date.trim() ? date : null
            console.log('[useCompanionActions] Final transitDate:', transitDate)
            transitStore.setTransitDate(transitDate)
            // Dispatch event so chart pages can switch to transit view with the specified date
            // The BirthChartPage listens for this and switches to transit chart type
            window.dispatchEvent(
              new CustomEvent('companion-set-transit-date', { detail: { date: transitDate } })
            )
            // NOTE: We don't auto-navigate anymore because:
            // 1. window.location.pathname doesn't reflect SPA page state
            // 2. BirthChartPage already listens for the event and switches to transit view
            // 3. Auto-navigation can cause the page to unmount and lose state
            // If navigation is needed, the Guide can use navigate_to_page tool separately
            break
          }

          // Phase 2: Canvas tools that execute on frontend
          case 'arrange_canvas': {
            // Dispatch event to canvas store to arrange items
            // The CanvasPage listens for this via the canvasStore
            const canvasId = input.canvas_id as string
            const arrangement = input.arrangement as string
            console.log(`Arrange canvas ${canvasId} in ${arrangement} layout`)
            // This would be handled by the canvas store via the API
            // For now, we just acknowledge it
            break
          }

          default:
            console.warn(`Unknown tool: ${name}`)
        }

        updateToolCallStatus(id, 'completed')
      } catch (error) {
        console.error(`Tool execution error for ${name}:`, error)
        updateToolCallStatus(id, 'failed')
      }

      // Clear action after a short delay
      setTimeout(() => {
        setCurrentAction(null)
      }, 500)
    },
    [chartStore, transitStore, setCurrentAction, updateToolCallStatus]
  )

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WSMessage

        switch (data.type) {
          case 'connected': {
            const connected = data as ConnectedMessage
            setSessionId(connected.session_id)
            setConnectionStatus('connected')
            reconnectAttemptsRef.current = 0
            break
          }

          case 'thinking': {
            const thinking = data as ThinkingMessage
            setAvatarState('thinking')
            // Could display thinking message in UI
            console.log('AI thinking:', thinking.message)
            break
          }

          case 'text_delta': {
            const delta = data as TextDeltaMessage
            setAvatarState('speaking')
            appendToLastMessage(delta.content)
            break
          }

          case 'tool_call': {
            const toolCall = data as ToolCallMessage
            addToolCall({
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.input,
              executeOn: toolCall.execute_on,
            })

            if (toolCall.execute_on === 'frontend') {
              executeToolCall(toolCall)
            }
            break
          }

          case 'tool_result': {
            // Backend tool results - update the tool call status
            const result = data as {
              type: string
              id: string
              name: string
              result: unknown
            }
            updateToolCallStatus(result.id, 'completed', result.result)
            break
          }

          case 'complete': {
            // CompleteMessage contains full_response and tool_calls for reference
            // const { full_response, tool_calls } = data as CompleteMessage
            setIsGenerating(false)
            setAvatarState('idle')
            break
          }

          case 'error': {
            const error = data as ErrorMessage
            setIsGenerating(false)
            setAvatarState('idle')
            console.error('AI error:', error.error)
            addMessage({
              role: 'assistant',
              content: `I encountered an error: ${error.error}`,
            })
            break
          }

          case 'insight': {
            const insight = data as InsightMessage
            addInsight({
              message: insight.message,
              trigger: insight.trigger,
            })
            setAvatarState('curious')
            setTimeout(() => setAvatarState('idle'), 3000)
            break
          }

          case 'pong':
            // Heartbeat response
            break

          default:
            console.log('Unknown message type:', data.type)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    },
    [
      setSessionId,
      setConnectionStatus,
      setAvatarState,
      appendToLastMessage,
      addToolCall,
      executeToolCall,
      updateToolCallStatus,
      setIsGenerating,
      addMessage,
      addInsight,
    ]
  )

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')

    // Get API base URL - use env var or default to localhost for Electron
    // VITE_API_URL should include /api prefix (e.g., http://localhost:8000/api)
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

    // First check if API key is configured
    try {
      const response = await fetch(`${apiBaseUrl}/auth/api-key/status`)
      if (response.ok) {
        const status = await response.json()
        if (!status.has_api_key) {
          console.log('No API key configured')
          setConnectionStatus('no_api_key')
          return
        }
      }
    } catch (error) {
      console.warn('Could not check API key status:', error)
      // Continue anyway - the WebSocket will fail if no key
    }

    // Build WebSocket URL from API base URL
    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss:' : 'ws:'
    const apiHost = apiBaseUrl.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProtocol}//${apiHost}/ws/agent`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        wsRef.current = ws
      }

      ws.onmessage = handleMessage

      ws.onclose = () => {
        console.log('WebSocket closed')
        setConnectionStatus('disconnected')
        wsRef.current = null

        // Attempt reconnect with exponential backoff (but not if no API key)
        const currentStatus = useCompanionStore.getState().connectionStatus
        if (reconnectAttemptsRef.current < 5 && currentStatus !== 'no_api_key') {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          )
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
      }

      ws.onerror = error => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setConnectionStatus('error')
    }
  }, [handleMessage, setConnectionStatus])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionStatus('disconnected')
  }, [setConnectionStatus])

  // Send a message
  const sendMessage = useCallback(
    (content: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected')
        return
      }

      // Add user message to store
      addMessage({ role: 'user', content })

      // Create empty assistant message for streaming
      addMessage({ role: 'assistant', content: '' })

      setIsGenerating(true)
      setAvatarState('listening')

      const appContext = getAppContext()

      wsRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          content,
          session_id: sessionId,
          app_context: appContext,
          chart_context: appContext.chart_data,
          user_preferences: {
            enabled_paradigms: preferences.enabledParadigms,
            synthesis_depth: preferences.synthesisDepth,
          },
        })
      )
    },
    [
      sessionId,
      preferences,
      addMessage,
      setIsGenerating,
      setAvatarState,
      getAppContext,
    ]
  )

  // Clear conversation history
  const clearHistory = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'clear_history',
          session_id: sessionId,
        })
      )
    }
    useCompanionStore.getState().clearMessages()
  }, [sessionId])

  // Send ping to keep connection alive
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
    connect,
    disconnect,
    sendMessage,
    clearHistory,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
  }
}
