/**
 * useDasha Hook
 *
 * Hook for fetching and managing Vimsottari Dasha data.
 */
import { useState, useCallback } from 'react'
import {
  calculateDasha,
  calculateDashaFromChart,
  type DashaResponse,
  type DashaRequest,
  type DashaFromChartRequest,
} from '@/lib/api/dasha'

interface UseDashaResult {
  dashaData: DashaResponse | null
  isLoading: boolean
  error: string | null
  fetchDashaForBirthData: (birthDataId: string, options?: Partial<DashaRequest>) => Promise<void>
  fetchDashaForChart: (chartId: string, options?: Partial<DashaFromChartRequest>) => Promise<void>
  clearDasha: () => void
}

export function useDasha(): UseDashaResult {
  const [dashaData, setDashaData] = useState<DashaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashaForBirthData = useCallback(async (
    birthDataId: string,
    options: Partial<DashaRequest> = {}
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await calculateDasha({
        birth_data_id: birthDataId,
        include_antardashas: options.include_antardashas ?? true,
        include_pratyantardashas: options.include_pratyantardashas ?? false,
        calculate_years: options.calculate_years ?? 120,
        ayanamsa: options.ayanamsa ?? 'lahiri',
      })
      setDashaData(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate Dasha'
      setError(message)
      console.error('Error fetching Dasha:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDashaForChart = useCallback(async (
    chartId: string,
    options: Partial<DashaFromChartRequest> = {}
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await calculateDashaFromChart({
        chart_id: chartId,
        include_antardashas: options.include_antardashas ?? true,
        include_pratyantardashas: options.include_pratyantardashas ?? false,
      })
      setDashaData(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate Dasha'
      setError(message)
      console.error('Error fetching Dasha:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearDasha = useCallback(() => {
    setDashaData(null)
    setError(null)
  }, [])

  return {
    dashaData,
    isLoading,
    error,
    fetchDashaForBirthData,
    fetchDashaForChart,
    clearDasha,
  }
}

export default useDasha
