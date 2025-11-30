/**
 * TanStack Query hooks for tarot deck management
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
  decks: ['tarot-decks'] as const,
  deck: (id: string) => ['tarot-deck', id] as const,
}

/**
 * Hook to list all tarot decks
 */
export function useTarotDecks(params?: ListCollectionsParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.decks, params],
    queryFn: () => listCollections({
      collection_type: 'tarot_deck',
      ...params,
    }),
  })
}

/**
 * Hook to get a specific deck with its images
 */
export function useTarotDeck(deckId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.deck(deckId || ''),
    queryFn: () => {
      if (!deckId) throw new Error('Deck ID is required')
      return getCollection(deckId)
    },
    enabled: !!deckId,
  })
}

/**
 * Hook to create a new tarot deck
 */
export function useCreateTarotDeck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CollectionCreate) => createCollection(data),
    onSuccess: (newDeck) => {
      // Invalidate the decks list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks })
      // Set the new deck in the cache
      queryClient.setQueryData<CollectionWithImages>(
        QUERY_KEYS.deck(newDeck.id),
        { ...newDeck, images: [] }
      )
    },
  })
}

/**
 * Hook to delete a tarot deck
 */
export function useDeleteTarotDeck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (deckId: string) => deleteCollection(deckId),
    onSuccess: (_, deckId) => {
      // Invalidate the decks list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks })
      // Remove the specific deck from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.deck(deckId) })
    },
  })
}

/**
 * Hook to manually refetch a deck (useful after batch generation completes)
 */
export function useRefreshDeck() {
  const queryClient = useQueryClient()

  return {
    refreshDeck: (deckId: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deck(deckId) })
    },
    refreshDecks: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.decks })
    },
  }
}
