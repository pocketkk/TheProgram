/**
 * Meditation API client
 *
 * Part of the Meditation feature
 */
import { apiClient, getErrorMessage } from './client'
import type {
  MeditationPreset,
  MeditationPresetCreate,
  MeditationPresetUpdate,
  MeditationSession,
  MeditationSessionCreate,
  MeditationStats,
  AudioGenerateRequest,
  AudioGenerateResponse,
  AudioInfo,
  PresetTemplate,
} from '@/features/meditation/types'

// =============================================================================
// Preset API
// =============================================================================

/**
 * List all meditation presets
 */
export async function listPresets(favoritesOnly = false): Promise<MeditationPreset[]> {
  try {
    const response = await apiClient.get<MeditationPreset[]>('/meditation/presets', {
      params: { favorites_only: favoritesOnly },
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific preset
 */
export async function getPreset(presetId: string): Promise<MeditationPreset> {
  try {
    const response = await apiClient.get<MeditationPreset>(`/meditation/presets/${presetId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Create a new preset
 */
export async function createPreset(data: MeditationPresetCreate): Promise<MeditationPreset> {
  try {
    const response = await apiClient.post<MeditationPreset>('/meditation/presets', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a preset
 */
export async function updatePreset(
  presetId: string,
  data: MeditationPresetUpdate
): Promise<MeditationPreset> {
  try {
    const response = await apiClient.put<MeditationPreset>(
      `/meditation/presets/${presetId}`,
      data
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a preset
 */
export async function deletePreset(presetId: string): Promise<void> {
  try {
    await apiClient.delete(`/meditation/presets/${presetId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Mark preset as used
 */
export async function markPresetUsed(presetId: string): Promise<{ times_used: number }> {
  try {
    const response = await apiClient.post<{ success: boolean; times_used: number }>(
      `/meditation/presets/${presetId}/use`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get preset templates
 */
export async function getPresetTemplates(): Promise<Record<string, PresetTemplate>> {
  try {
    const response = await apiClient.get<Record<string, PresetTemplate>>(
      '/meditation/presets/templates'
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Session API
// =============================================================================

interface SessionListResponse {
  sessions: MeditationSession[]
  total: number
  limit: number
  offset: number
}

interface SessionListParams {
  limit?: number
  offset?: number
  date_from?: string
  date_to?: string
}

/**
 * List meditation sessions
 */
export async function listSessions(params?: SessionListParams): Promise<SessionListResponse> {
  try {
    const response = await apiClient.get<SessionListResponse>('/meditation/sessions', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific session
 */
export async function getSession(sessionId: string): Promise<MeditationSession> {
  try {
    const response = await apiClient.get<MeditationSession>(`/meditation/sessions/${sessionId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Create a new session record
 */
export async function createSession(data: MeditationSessionCreate): Promise<MeditationSession> {
  try {
    const response = await apiClient.post<MeditationSession>('/meditation/sessions', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await apiClient.delete(`/meditation/sessions/${sessionId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get meditation statistics
 */
export async function getStats(): Promise<MeditationStats> {
  try {
    const response = await apiClient.get<MeditationStats>('/meditation/stats')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Audio API
// =============================================================================

/**
 * Generate meditation audio
 */
export async function generateAudio(request: AudioGenerateRequest): Promise<AudioGenerateResponse> {
  try {
    const response = await apiClient.post<AudioGenerateResponse>(
      '/meditation/audio/generate',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List generated audio files
 */
export async function listAudio(params?: {
  style?: string
  mood?: string
  limit?: number
}): Promise<AudioInfo[]> {
  try {
    const response = await apiClient.get<AudioInfo[]>('/meditation/audio', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get audio URL
 */
export function getAudioUrl(audioId: string): string {
  return `${apiClient.defaults.baseURL}/meditation/audio/${audioId}`
}

/**
 * Delete generated audio
 */
export async function deleteAudio(audioId: string): Promise<void> {
  try {
    await apiClient.delete(`/meditation/audio/${audioId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
