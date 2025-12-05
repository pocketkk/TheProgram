/**
 * Images API client
 */
import { apiClient, getErrorMessage } from './client'
import type {
  ImageGenerateRequest,
  ImageGenerateResponse,
  ImageInfo,
  CollectionInfo,
  CollectionCreate,
  BatchGenerateItem,
} from '../../types/image'

export interface ListImagesParams {
  skip?: number
  limit?: number
  image_type?: string
  collection_id?: string
}

export interface ListCollectionsParams {
  collection_type?: string
  is_active?: boolean
}

export interface CollectionWithImages extends CollectionInfo {
  images: ImageInfo[]
}

/**
 * Generate a single image using Gemini API
 */
export async function generateImage(
  request: ImageGenerateRequest
): Promise<ImageGenerateResponse> {
  try {
    const response = await apiClient.post<ImageGenerateResponse>(
      '/images/generate',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Refine an existing image with a refinement prompt
 */
export async function refineImage(
  imageId: string,
  refinement: string
): Promise<ImageGenerateResponse> {
  try {
    const response = await apiClient.post<ImageGenerateResponse>(
      '/images/refine',
      { image_id: imageId, refinement }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List all generated images
 */
export async function listImages(
  params?: ListImagesParams
): Promise<ImageInfo[]> {
  try {
    const response = await apiClient.get<{ images: ImageInfo[]; total: number }>(
      '/images',
      { params }
    )
    return response.data.images
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific image by ID
 */
export async function getImage(imageId: string): Promise<ImageInfo> {
  try {
    const response = await apiClient.get<ImageInfo>(`/images/${imageId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete an image
 */
export async function deleteImage(imageId: string): Promise<void> {
  try {
    await apiClient.delete(`/images/${imageId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List all collections
 */
export async function listCollections(
  params?: ListCollectionsParams
): Promise<CollectionInfo[]> {
  try {
    const response = await apiClient.get<{ collections: CollectionInfo[]; total: number }>(
      '/images/collections',
      { params }
    )
    return response.data.collections
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Create a new collection
 */
export async function createCollection(
  data: CollectionCreate
): Promise<CollectionInfo> {
  try {
    const response = await apiClient.post<CollectionInfo>(
      '/images/collections/',
      data
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a collection with its images
 */
export async function getCollection(
  collectionId: string
): Promise<CollectionWithImages> {
  try {
    const response = await apiClient.get<CollectionWithImages>(
      `/images/collections/${collectionId}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a collection and all its images
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  try {
    await apiClient.delete(`/images/collections/${collectionId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a collection (e.g., set reference image)
 */
export interface CollectionUpdate {
  name?: string
  style_prompt?: string
  border_style?: string
  is_active?: boolean
  include_card_labels?: boolean
  reference_image_id?: string
  card_back_image_id?: string
}

export async function updateCollection(
  collectionId: string,
  data: CollectionUpdate
): Promise<CollectionInfo> {
  try {
    const response = await apiClient.patch<CollectionInfo>(
      `/images/collections/${collectionId}`,
      data
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Generate a card back image for a tarot deck collection
 */
export async function generateCardBack(
  collectionId: string,
  prompt?: string
): Promise<ImageGenerateResponse> {
  try {
    const response = await apiClient.post<ImageGenerateResponse>(
      '/images/generate-card-back',
      {
        collection_id: collectionId,
        prompt: prompt || 'Ornate mystical card back design with symmetrical geometric patterns, sacred geometry, celestial motifs',
      }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Generate multiple images in a batch for a collection
 * This is a synchronous endpoint that returns when all images are complete
 */
export async function batchGenerate(
  collectionId: string,
  items: BatchGenerateItem[]
): Promise<CollectionWithImages> {
  try {
    const response = await apiClient.post<CollectionWithImages>(
      `/images/collections/${collectionId}/batch-generate`,
      { items }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Start batch generation as a background task
 * Returns immediately with task info
 */
export async function startBatchGeneration(
  collectionId: string,
  items: BatchGenerateItem[]
): Promise<{ task_id: string; collection_id: string }> {
  try {
    const response = await apiClient.post<{
      task_id: string
      collection_id: string
    }>(`/images/collections/${collectionId}/batch-generate-async`, { items })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get the status of a batch generation task
 */
export async function getBatchStatus(taskId: string): Promise<{
  status: 'pending' | 'running' | 'complete' | 'failed'
  progress?: {
    current: number
    total: number
    percentage: number
  }
  result?: CollectionWithImages
  error?: string
}> {
  try {
    const response = await apiClient.get(`/images/tasks/${taskId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
