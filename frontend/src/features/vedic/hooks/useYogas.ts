/**
 * useYogas Hook
 *
 * React hook for fetching and managing Yogas data.
 */

import { useState, useCallback } from 'react'
import {
  getYogasForBirthData,
  calculateYogas,
  type YogasResponse,
  type YogasRequest,
} from '@/lib/api/yogas'

interface UseYogasOptions {
  ayanamsa?: string
  includeWeak?: boolean
}

interface UseYogasResult {
  yogasData: YogasResponse | null
  isLoading: boolean
  error: string | null
  fetchYogasForBirthData: (birthDataId: string, options?: UseYogasOptions) => Promise<void>
  clearYogas: () => void
}

export function useYogas(): UseYogasResult {
  const [yogasData, setYogasData] = useState<YogasResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchYogasForBirthData = useCallback(async (
    birthDataId: string,
    options: UseYogasOptions = {}
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const { ayanamsa = 'lahiri', includeWeak = false } = options
      const data = await getYogasForBirthData(birthDataId, ayanamsa, includeWeak)
      setYogasData(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch yogas'
      setError(message)
      console.error('Error fetching yogas:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearYogas = useCallback(() => {
    setYogasData(null)
    setError(null)
  }, [])

  return {
    yogasData,
    isLoading,
    error,
    fetchYogasForBirthData,
    clearYogas,
  }
}
