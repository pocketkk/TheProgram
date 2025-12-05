/**
 * Coloring Book API client
 */
import { apiClient, getErrorMessage } from './client'
import type {
  ColoringBookTemplate,
  ColoringBookImage,
  Artwork,
  GenerateRequest,
  GenerateResponse,
  ArtworkSaveRequest,
} from '../../features/coloring-book/types'

/**
 * Generate a coloring book image
 */
export async function generateColoringBookImage(
  request: GenerateRequest
): Promise<GenerateResponse> {
  try {
    const response = await apiClient.post<GenerateResponse>(
      '/coloring-book/generate',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Generate from a predefined template
 */
export async function generateFromTemplate(
  templateId: string,
  complexity: 'simple' | 'medium' | 'detailed' | 'intricate' = 'medium'
): Promise<GenerateResponse> {
  try {
    const response = await apiClient.post<GenerateResponse>(
      `/coloring-book/generate-from-template/${templateId}`,
      null,
      { params: { complexity } }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List available templates
 */
export async function listTemplates(
  theme?: string
): Promise<ColoringBookTemplate[]> {
  try {
    const response = await apiClient.get<{ templates: ColoringBookTemplate[] }>(
      '/coloring-book/templates',
      { params: theme ? { theme } : undefined }
    )
    return response.data.templates
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List generated coloring book images
 */
export async function listColoringBookImages(params?: {
  limit?: number
  offset?: number
}): Promise<ColoringBookImage[]> {
  try {
    const response = await apiClient.get<ColoringBookImage[]>(
      '/coloring-book/images',
      { params }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Save artwork
 */
export async function saveArtwork(
  request: ArtworkSaveRequest
): Promise<Artwork> {
  try {
    const response = await apiClient.post<Artwork>(
      '/coloring-book/artwork',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List saved artwork
 */
export async function listArtwork(params?: {
  limit?: number
  offset?: number
  tag?: string
}): Promise<{ artworks: Artwork[]; total: number }> {
  try {
    const response = await apiClient.get<{ artworks: Artwork[]; total: number }>(
      '/coloring-book/artwork',
      { params }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get single artwork with canvas state
 */
export async function getArtwork(artworkId: string): Promise<Artwork> {
  try {
    const response = await apiClient.get<Artwork>(
      `/coloring-book/artwork/${artworkId}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update artwork
 */
export async function updateArtwork(
  artworkId: string,
  data: Partial<ArtworkSaveRequest>
): Promise<Artwork> {
  try {
    const response = await apiClient.patch<Artwork>(
      `/coloring-book/artwork/${artworkId}`,
      data
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete artwork
 */
export async function deleteArtwork(artworkId: string): Promise<void> {
  try {
    await apiClient.delete(`/coloring-book/artwork/${artworkId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
