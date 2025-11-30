/**
 * TanStack Query hooks for planet set management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listCollections,
  getCollection,
  createCollection,
  deleteCollection,
  type CollectionWithImages,
  type ListCollectionsParams,
} from '@/lib/api/images'
import type { CollectionInfo, CollectionCreate } from '@/types/image'

// Query keys
const QUERY_KEYS = {
  sets: ['planet-sets'] as const,
  set: (id: string) => ['planet-set', id] as const,
}

/**
 * Hook to list all planet sets
 */
export function usePlanetSets(params?: ListCollectionsParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.sets, params],
    queryFn: () => listCollections({
      collection_type: 'planet_set',
      ...params,
    }),
  })
}

/**
 * Hook to get a specific planet set with its images
 */
export function usePlanetSet(setId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.set(setId || ''),
    queryFn: () => {
      if (!setId) throw new Error('Set ID is required')
      return getCollection(setId)
    },
    enabled: !!setId,
  })
}

/**
 * Hook to create a new planet set
 */
export function useCreatePlanetSet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CollectionCreate) => createCollection(data),
    onSuccess: (newSet) => {
      // Invalidate the sets list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sets })
      // Set the new set in the cache
      queryClient.setQueryData<CollectionWithImages>(
        QUERY_KEYS.set(newSet.id),
        { ...newSet, images: [] }
      )
    },
  })
}

/**
 * Hook to delete a planet set
 */
export function useDeletePlanetSet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (setId: string) => deleteCollection(setId),
    onSuccess: (_, setId) => {
      // Invalidate the sets list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sets })
      // Remove the specific set from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.set(setId) })
    },
  })
}

/**
 * Hook to manually refetch a set (useful after batch generation completes)
 */
export function useRefreshPlanetSet() {
  const queryClient = useQueryClient()

  return {
    refreshSet: (setId: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.set(setId) })
    },
    refreshSets: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sets })
    },
  }
}
