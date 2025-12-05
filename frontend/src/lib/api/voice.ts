/**
 * Voice Chat API Client
 * Handles voice settings and status
 */
import { apiClient } from './client'

export interface VoiceInfo {
  name: string
  description: string
}

export interface VoiceSettings {
  voice_name: string
  personality: string
  speaking_style: string
  response_length: 'brief' | 'medium' | 'detailed'
  custom_personality: string | null
}

export interface VoiceOptions {
  voices: VoiceInfo[]
  default_settings: VoiceSettings
  response_lengths: string[]
}

export interface VoiceStatus {
  available: boolean
  message: string
}

/**
 * Get available voice options
 */
export async function getVoiceOptions(): Promise<VoiceOptions> {
  const response = await apiClient.get<VoiceOptions>('/voice/options')
  return response.data
}

/**
 * Get current voice settings
 */
export async function getVoiceSettings(): Promise<VoiceSettings> {
  const response = await apiClient.get<VoiceSettings>('/voice/settings')
  return response.data
}

/**
 * Update voice settings
 */
export async function updateVoiceSettings(settings: Partial<VoiceSettings>): Promise<VoiceSettings> {
  const response = await apiClient.put<VoiceSettings>('/voice/settings', settings)
  return response.data
}

/**
 * Check if voice chat is available
 */
export async function getVoiceStatus(): Promise<VoiceStatus> {
  const response = await apiClient.get<VoiceStatus>('/voice/status')
  return response.data
}

export default {
  getVoiceOptions,
  getVoiceSettings,
  updateVoiceSettings,
  getVoiceStatus,
}
