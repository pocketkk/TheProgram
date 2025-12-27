/**
 * Hook for managing chart AI interpretations
 */

import { useState, useEffect } from 'react'
import { getChartInterpretations, generateChartInterpretations } from '@/lib/api/interpretations'
import type { ChartInterpretation, ElementType } from '@/types/interpretation'

interface UseChartInterpretationsOptions {
  chartId: string | null
  zodiacSystem?: string  // Triggers refetch when zodiac system changes
  autoFetch?: boolean
}

interface UseChartInterpretationsReturn {
  interpretations: Map<string, ChartInterpretation>
  isLoading: boolean
  error: Error | null
  fetchInterpretations: () => Promise<void>
  generateInterpretations: (elementTypes?: ElementType[]) => Promise<void>
  getInterpretationFor: (elementType: ElementType, elementKey: string) => ChartInterpretation | undefined
}

export function useChartInterpretations({
  chartId,
  zodiacSystem,
  autoFetch = true,
}: UseChartInterpretationsOptions): UseChartInterpretationsReturn {
  const [interpretations, setInterpretations] = useState<Map<string, ChartInterpretation>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchInterpretations = async (signal?: AbortSignal) => {
    console.log('[useChartInterpretations] fetchInterpretations called with chartId:', chartId, 'zodiacSystem:', zodiacSystem)
    if (!chartId) {
      console.log('[useChartInterpretations] No chartId, skipping fetch')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useChartInterpretations] Fetching interpretations for chartId:', chartId)
      const data = await getChartInterpretations(chartId, undefined, signal)

      // Check if request was aborted before updating state
      if (signal?.aborted) {
        console.log('[useChartInterpretations] Request aborted, not updating state')
        return
      }

      console.log('[useChartInterpretations] Received data:', data.length, 'interpretations')
      const interpretationMap = new Map<string, ChartInterpretation>()

      data.forEach(interp => {
        const key = `${interp.element_type}:${interp.element_key}`
        interpretationMap.set(key, interp)
      })

      setInterpretations(interpretationMap)
      console.log('[useChartInterpretations] Set interpretations map, size:', interpretationMap.size)
    } catch (err) {
      // Ignore abort errors - they're expected when switching zodiac systems
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useChartInterpretations] Fetch aborted (expected during zodiac system switch)')
        return
      }
      if (signal?.aborted) {
        console.log('[useChartInterpretations] Request was aborted, ignoring error')
        return
      }
      setError(err as Error)
      console.error('[useChartInterpretations] Error fetching interpretations:', err)
    } finally {
      // Only update loading state if not aborted
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }

  const generateInterpretations = async (elementTypes?: ElementType[]) => {
    if (!chartId) return

    setIsLoading(true)
    setError(null)

    try {
      await generateChartInterpretations(chartId, {
        element_types: elementTypes,
        regenerate_existing: false,
      })

      // Refetch after generation
      await fetchInterpretations()
    } catch (err) {
      setError(err as Error)
      console.error('Error generating interpretations:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getInterpretationFor = (elementType: ElementType, elementKey: string): ChartInterpretation | undefined => {
    // Map frontend planet names to database keys
    let dbKey = elementKey.toLowerCase()

    // Handle special planet name mappings
    if (elementType === 'planet') {
      const planetNameMap: Record<string, string> = {
        'lilith': 'lilith_mean',
        'north node': 'true_node',
        'south node': 'south_node',
      }
      dbKey = planetNameMap[dbKey] || dbKey
    }

    const key = `${elementType}:${dbKey}`
    return interpretations.get(key)
  }

  useEffect(() => {
    console.log('[useChartInterpretations] useEffect triggered. chartId:', chartId, 'zodiacSystem:', zodiacSystem, 'autoFetch:', autoFetch)

    // Create AbortController for this effect
    const controller = new AbortController()

    // IMPORTANT: Clear interpretations immediately when chartId OR zodiacSystem changes
    // This prevents stale interpretations from showing when switching chart types or zodiac systems
    setInterpretations(new Map())

    if (autoFetch && chartId) {
      console.log('[useChartInterpretations] Calling fetchInterpretations')
      fetchInterpretations(controller.signal)
    } else {
      console.log('[useChartInterpretations] NOT fetching. autoFetch:', autoFetch, 'chartId:', chartId)
    }

    // Cleanup: abort any pending requests when dependencies change or component unmounts
    return () => {
      console.log('[useChartInterpretations] Cleanup: aborting pending request')
      controller.abort()
    }
  }, [chartId, zodiacSystem, autoFetch])

  return {
    interpretations,
    isLoading,
    error,
    fetchInterpretations,
    generateInterpretations,
    getInterpretationFor,
  }
}
