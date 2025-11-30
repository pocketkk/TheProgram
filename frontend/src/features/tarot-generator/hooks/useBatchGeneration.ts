/**
 * WebSocket hook for batch image generation with real-time progress
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { BatchGenerateItem, BatchProgressUpdate } from '@/types/image'

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export interface UseBatchGenerationOptions {
  collectionId: string
  items: BatchGenerateItem[]
  onProgress?: (progress: BatchProgressUpdate) => void
  onComplete?: () => void
  onError?: (error: string) => void
}

export interface BatchGenerationState {
  isConnected: boolean
  isGenerating: boolean
  isPaused: boolean
  currentProgress: BatchProgressUpdate | null
  generatedImages: Array<{ key: string; url: string; id?: string }>
  error: string | null
}

/**
 * Hook to manage WebSocket connection for batch image generation
 */
export function useBatchGeneration({
  collectionId,
  items,
  onProgress,
  onComplete,
  onError,
}: UseBatchGenerationOptions) {
  const [state, setState] = useState<BatchGenerationState>({
    isConnected: false,
    isGenerating: false,
    isPaused: false,
    currentProgress: null,
    generatedImages: [],
    error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const shouldReconnect = useRef(true)

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    try {
      const ws = new WebSocket(
        `${WS_BASE_URL}/api/ws/images/batch?collection_id=${collectionId}`
      )

      ws.onopen = () => {
        console.log('WebSocket connected')
        setState(prev => ({ ...prev, isConnected: true, error: null }))
      }

      ws.onmessage = (event) => {
        try {
          const update: BatchProgressUpdate = JSON.parse(event.data)

          setState(prev => {
            const newState = {
              ...prev,
              currentProgress: update,
            }

            // Add completed image to list
            if (update.status === 'complete' && update.image_url) {
              newState.generatedImages = [
                ...prev.generatedImages,
                { key: update.item_name, url: update.image_url, id: update.image_id },
              ]
            }

            return newState
          })

          // Call progress callback
          onProgress?.(update)

          // Check if generation is complete
          if (update.status === 'complete' && update.current === update.total) {
            setState(prev => ({ ...prev, isGenerating: false }))
            onComplete?.()
            ws.close()
          }

          // Handle individual item failure
          if (update.status === 'failed') {
            console.error(`Failed to generate ${update.item_name}:`, update.error)
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnected: false,
        }))
        onError?.('WebSocket connection error')
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setState(prev => ({
          ...prev,
          isConnected: false,
          isGenerating: false,
        }))

        // Auto-reconnect if not intentional close
        if (shouldReconnect.current && event.code !== 1000) {
          console.log('Attempting to reconnect...')
          setTimeout(connect, 2000)
        }
      }

      wsRef.current = ws
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect'
      setState(prev => ({ ...prev, error: errorMsg }))
      onError?.(errorMsg)
    }
  }, [collectionId, onProgress, onComplete, onError])

  // Start generation - accepts items array or uses the one from props
  // Optional refinement parameters for image-to-image refinement
  const startGeneration = useCallback((
    itemsToGenerate?: BatchGenerateItem[],
    options?: {
      refinementFeedback?: string
      referenceImageId?: string
    }
  ) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'WebSocket not connected' }))
      return
    }

    const generateItems = itemsToGenerate || items
    if (generateItems.length === 0) {
      setState(prev => ({ ...prev, error: 'No items to generate' }))
      return
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      isPaused: false,
      currentProgress: null,
      generatedImages: [],
      error: null,
    }))

    // Send generation request with optional refinement params
    wsRef.current.send(
      JSON.stringify({
        action: 'start',
        collection_id: collectionId,  // Backend expects this in the message
        items: generateItems,
        refinement_feedback: options?.refinementFeedback,
        reference_image_id: options?.referenceImageId,
      })
    )
  }, [collectionId, items])

  // Pause generation
  const pauseGeneration = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    setState(prev => ({ ...prev, isPaused: true }))
    wsRef.current.send(
      JSON.stringify({
        action: 'pause',
      })
    )
  }, [])

  // Resume generation
  const resumeGeneration = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    setState(prev => ({ ...prev, isPaused: false }))
    wsRef.current.send(
      JSON.stringify({
        action: 'resume',
      })
    )
  }, [])

  // Cancel generation
  const cancelGeneration = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    wsRef.current.send(
      JSON.stringify({
        action: 'cancel',
      })
    )

    setState(prev => ({
      ...prev,
      isGenerating: false,
      isPaused: false,
    }))
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    setState({
      isConnected: false,
      isGenerating: false,
      isPaused: false,
      currentProgress: null,
      generatedImages: [],
      error: null,
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnect.current = false
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration,
  }
}
