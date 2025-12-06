/**
 * Palm Reading API Client
 *
 * Handles all palm reading related API calls.
 */
import { apiClient } from './client'
import type {
  PalmReadingResponse,
  QuickInsightResponse,
  PalmReadingRecord,
  PalmReadingListResponse,
  PalmReadingAnalyzeParams,
  PalmReadingUpdateParams,
} from '@/features/palm-reading/types'

/**
 * Analyze a palm image and get a comprehensive reading
 */
export async function analyzePalm(params: PalmReadingAnalyzeParams): Promise<PalmReadingResponse> {
  const formData = new FormData()
  formData.append('image', params.image)
  formData.append('hand_type', params.handType)

  if (params.additionalContext) {
    formData.append('additional_context', params.additionalContext)
  }

  formData.append('save_reading', String(params.saveReading ?? true))

  const response = await apiClient.post('/palm-reading/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000, // 2 minute timeout for AI analysis
  })

  return response.data
}

/**
 * Get a quick palm insight (preview)
 */
export async function getQuickInsight(image: File): Promise<QuickInsightResponse> {
  const formData = new FormData()
  formData.append('image', image)

  const response = await apiClient.post('/palm-reading/quick-insight', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 1 minute timeout
  })

  return response.data
}

/**
 * List palm reading history
 */
export async function listPalmReadings(params?: {
  limit?: number
  offset?: number
  favoritesOnly?: boolean
}): Promise<PalmReadingListResponse> {
  const response = await apiClient.get('/palm-reading/history', {
    params: {
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
      favorites_only: params?.favoritesOnly ?? false,
    },
  })

  return response.data
}

/**
 * Get a specific palm reading by ID
 */
export async function getPalmReading(readingId: string): Promise<PalmReadingRecord> {
  const response = await apiClient.get(`/palm-reading/${readingId}`)
  return response.data
}

/**
 * Update a palm reading (notes, favorite status)
 */
export async function updatePalmReading(
  readingId: string,
  data: PalmReadingUpdateParams
): Promise<PalmReadingRecord> {
  const response = await apiClient.patch(`/palm-reading/${readingId}`, data)
  return response.data
}

/**
 * Delete a palm reading
 */
export async function deletePalmReading(readingId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete(`/palm-reading/${readingId}`)
  return response.data
}
