/**
 * Palm Reading Hooks
 *
 * TanStack Query hooks for palm reading API operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  analyzePalm,
  getQuickInsight,
  listPalmReadings,
  getPalmReading,
  updatePalmReading,
  deletePalmReading,
} from '@/lib/api/palmReading'
import type {
  PalmReadingAnalyzeParams,
  PalmReadingUpdateParams,
} from '../types'

// Query Keys
export const palmReadingKeys = {
  all: ['palm-readings'] as const,
  lists: () => [...palmReadingKeys.all, 'list'] as const,
  list: (params?: { limit?: number; offset?: number; favoritesOnly?: boolean }) =>
    [...palmReadingKeys.lists(), params] as const,
  details: () => [...palmReadingKeys.all, 'detail'] as const,
  detail: (id: string) => [...palmReadingKeys.details(), id] as const,
}

/**
 * Hook for analyzing a palm image
 */
export function useAnalyzePalm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: PalmReadingAnalyzeParams) => analyzePalm(params),
    onSuccess: () => {
      // Invalidate the list to show new reading
      queryClient.invalidateQueries({ queryKey: palmReadingKeys.lists() })
    },
  })
}

/**
 * Hook for getting a quick palm insight
 */
export function useQuickInsight() {
  return useMutation({
    mutationFn: (image: File) => getQuickInsight(image),
  })
}

/**
 * Hook for listing palm reading history
 */
export function usePalmReadingHistory(params?: {
  limit?: number
  offset?: number
  favoritesOnly?: boolean
}) {
  return useQuery({
    queryKey: palmReadingKeys.list(params),
    queryFn: () => listPalmReadings(params),
  })
}

/**
 * Hook for getting a specific palm reading
 */
export function usePalmReading(readingId: string | null) {
  return useQuery({
    queryKey: palmReadingKeys.detail(readingId ?? ''),
    queryFn: () => getPalmReading(readingId!),
    enabled: !!readingId,
  })
}

/**
 * Hook for updating a palm reading
 */
export function useUpdatePalmReading() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ readingId, data }: { readingId: string; data: PalmReadingUpdateParams }) =>
      updatePalmReading(readingId, data),
    onSuccess: (data, variables) => {
      // Update the cache
      queryClient.setQueryData(palmReadingKeys.detail(variables.readingId), data)
      // Invalidate list to reflect changes
      queryClient.invalidateQueries({ queryKey: palmReadingKeys.lists() })
    },
  })
}

/**
 * Hook for deleting a palm reading
 */
export function useDeletePalmReading() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (readingId: string) => deletePalmReading(readingId),
    onSuccess: (_, readingId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: palmReadingKeys.detail(readingId) })
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: palmReadingKeys.lists() })
    },
  })
}
