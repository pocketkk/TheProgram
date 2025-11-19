/**
 * Hook for managing chart AI interpretations
 */

import { useState, useEffect } from 'react'
import { getChartInterpretations, generateChartInterpretations } from '@/lib/api/interpretations'
import type { ChartInterpretation, ElementType } from '@/types/interpretation'

interface UseChartInterpretationsOptions {
  chartId: string | null
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
  autoFetch = true,
}: UseChartInterpretationsOptions): UseChartInterpretationsReturn {
  const [interpretations, setInterpretations] = useState<Map<string, ChartInterpretation>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchInterpretations = async () => {
    console.log('[useChartInterpretations] fetchInterpretations called with chartId:', chartId)
    if (!chartId) {
      console.log('[useChartInterpretations] No chartId, skipping fetch')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useChartInterpretations] Fetching interpretations for chartId:', chartId)
      const data = await getChartInterpretations(chartId)
      console.log('[useChartInterpretations] Received data:', data.length, 'interpretations')
      const interpretationMap = new Map<string, ChartInterpretation>()

      data.forEach(interp => {
        const key = `${interp.element_type}:${interp.element_key}`
        interpretationMap.set(key, interp)
      })

      setInterpretations(interpretationMap)
      console.log('[useChartInterpretations] Set interpretations map, size:', interpretationMap.size)
    } catch (err) {
      setError(err as Error)
      console.error('[useChartInterpretations] Error fetching interpretations:', err)
    } finally {
      setIsLoading(false)
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
    const key = `${elementType}:${elementKey.toLowerCase()}`
    return interpretations.get(key)
  }

  useEffect(() => {
    console.log('[useChartInterpretations] useEffect triggered. chartId:', chartId, 'autoFetch:', autoFetch)
    if (autoFetch && chartId) {
      console.log('[useChartInterpretations] Calling fetchInterpretations')
      fetchInterpretations()
    } else {
      console.log('[useChartInterpretations] NOT fetching. autoFetch:', autoFetch, 'chartId:', chartId)
    }
  }, [chartId, autoFetch])

  return {
    interpretations,
    isLoading,
    error,
    fetchInterpretations,
    generateInterpretations,
    getInterpretationFor,
  }
}
