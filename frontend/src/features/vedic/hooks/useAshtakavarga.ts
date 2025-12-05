/**
 * useAshtakavarga Hook
 *
 * React hook for fetching and managing Ashtakavarga data.
 */

import { useState, useCallback } from 'react'
import {
  getAshtakavargaForBirthData,
  type AshtakavargaResponse,
} from '@/lib/api/ashtakavarga'

interface UseAshtakavargaOptions {
  ayanamsa?: string
}

interface UseAshtakavargaResult {
  ashtakavargaData: AshtakavargaResponse | null
  isLoading: boolean
  error: string | null
  fetchAshtakavargaForBirthData: (birthDataId: string, options?: UseAshtakavargaOptions) => Promise<void>
  clearAshtakavarga: () => void
}

export function useAshtakavarga(): UseAshtakavargaResult {
  const [ashtakavargaData, setAshtakavargaData] = useState<AshtakavargaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAshtakavargaForBirthData = useCallback(async (
    birthDataId: string,
    options: UseAshtakavargaOptions = {}
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const { ayanamsa = 'lahiri' } = options
      const data = await getAshtakavargaForBirthData(birthDataId, ayanamsa)
      setAshtakavargaData(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Ashtakavarga'
      setError(message)
      console.error('Error fetching Ashtakavarga:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearAshtakavarga = useCallback(() => {
    setAshtakavargaData(null)
    setError(null)
  }, [])

  return {
    ashtakavargaData,
    isLoading,
    error,
    fetchAshtakavargaForBirthData,
    clearAshtakavarga,
  }
}
