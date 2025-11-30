/**
 * Themes hooks for managing background images
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { generateImage, listImages, deleteImage } from '@/lib/api/images'
import type { ImageGenerateRequest, ImageInfo } from '@/types/image'

const THEMES_QUERY_KEY = ['themes', 'backgrounds']

/**
 * Hook to fetch all background images
 */
export function useBackgrounds() {
  return useQuery({
    queryKey: THEMES_QUERY_KEY,
    queryFn: () => listImages({ image_type: 'background' }),
  })
}

/**
 * Hook to generate a new background image
 */
export function useGenerateBackground() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: Omit<ImageGenerateRequest, 'purpose' | 'aspect_ratio'>) => {
      return generateImage({
        ...request,
        purpose: 'background',
        aspect_ratio: '16:9',
      })
    },
    onSuccess: () => {
      // Invalidate and refetch backgrounds
      queryClient.invalidateQueries({ queryKey: THEMES_QUERY_KEY })
    },
  })
}

/**
 * Hook to delete a background image
 */
export function useDeleteBackground() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THEMES_QUERY_KEY })
    },
  })
}

/**
 * Hook to get/set the active background from localStorage
 */
export function useActiveBackground() {
  const getActiveBackground = (): string | null => {
    return localStorage.getItem('active_background')
  }

  const setActiveBackground = (imageId: string) => {
    localStorage.setItem('active_background', imageId)
    // Dispatch custom event so other components can listen
    window.dispatchEvent(new CustomEvent('background-changed', { detail: { imageId } }))
  }

  const clearActiveBackground = () => {
    localStorage.removeItem('active_background')
    window.dispatchEvent(new CustomEvent('background-changed', { detail: { imageId: null } }))
  }

  return {
    activeBackgroundId: getActiveBackground(),
    setActiveBackground,
    clearActiveBackground,
  }
}
