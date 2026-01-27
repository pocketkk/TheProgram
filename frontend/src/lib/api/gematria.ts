/**
 * Gematria API Client
 *
 * API client for gematria calculations and analysis.
 */
import { apiClient } from './client'

// ============================================================================
// Types
// ============================================================================

export type GematriaSystem =
  | 'hebrew'
  | 'english_ordinal'
  | 'english_reduction'
  | 'transliteration'
  | 'all'

export interface LetterBreakdown {
  letter: string
  value: number
  ordinal_value?: number
  reduced_value?: number
}

export interface GematriaResult {
  value: number
  breakdown: LetterBreakdown[]
  letter_count: number
  original_text: string
  system: string
  final_reduction?: number
  hebrew_text?: string
  meaning?: NumberMeaning | null
  equivalences?: EquivalentWord[]
}

export interface AllSystemsResult {
  original_text: string
  systems: {
    hebrew?: GematriaResult
    english_ordinal?: GematriaResult
    english_reduction?: GematriaResult
    transliteration?: GematriaResult
  }
}

export interface EquivalentWord {
  word: string
  transliteration?: string
  meaning: string
}

export interface EquivalencesResponse {
  value: number
  system: string
  count: number
  words: EquivalentWord[]
}

export interface NumberMeaning {
  name: string
  meaning: string
  keywords: string[]
  hebrew_connection?: string
}

export interface NumberMeaningResponse {
  value: number
  has_known_meaning: boolean
  message?: string
  name?: string
  meaning?: string
  keywords?: string[]
  hebrew_connection?: string
}

export interface AllMeaningsResponse {
  count: number
  meanings: Record<number, NumberMeaning>
}

export interface ProfileGematriaResponse {
  profile_id: string
  profile_name: string
  analysis: AllSystemsResult
}

export interface SystemInfo {
  id: string
  name: string
  description: string
  example: string
}

export interface SystemsResponse {
  systems: SystemInfo[]
}

export interface CalculateRequest {
  text: string
  system?: GematriaSystem
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Calculate gematria for text
 */
export const calculateGematria = async (
  text: string,
  system: GematriaSystem = 'all'
): Promise<AllSystemsResult | GematriaResult> => {
  const response = await apiClient.post('/gematria/calculate', { text, system })
  return response.data
}

/**
 * Analyze a name comprehensively
 */
export const analyzeName = async (name: string): Promise<AllSystemsResult> => {
  const response = await apiClient.post('/gematria/analyze', { name })
  return response.data
}

/**
 * Find words with the same gematria value
 */
export const getEquivalences = async (
  value: number,
  system: 'hebrew' | 'english' = 'hebrew',
  limit: number = 20
): Promise<EquivalencesResponse> => {
  const response = await apiClient.get(
    `/gematria/equivalences/${value}?system=${system}&limit=${limit}`
  )
  return response.data
}

/**
 * Get the meaning for a specific number
 */
export const getNumberMeaning = async (
  value: number
): Promise<NumberMeaningResponse> => {
  const response = await apiClient.get(`/gematria/meanings/${value}`)
  return response.data
}

/**
 * Get all number meanings
 */
export const getAllMeanings = async (): Promise<AllMeaningsResponse> => {
  const response = await apiClient.get('/gematria/meanings')
  return response.data
}

/**
 * Get gematria analysis for a saved profile
 */
export const getProfileGematria = async (
  profileId: string
): Promise<ProfileGematriaResponse> => {
  const response = await apiClient.get(`/gematria/profile/${profileId}/gematria`)
  return response.data
}

/**
 * Transliterate English text to Hebrew and calculate gematria
 */
export const transliterate = async (text: string): Promise<GematriaResult> => {
  const response = await apiClient.get(
    `/gematria/transliterate?text=${encodeURIComponent(text)}`
  )
  return response.data
}

/**
 * Get information about available gematria systems
 */
export const getSystems = async (): Promise<SystemsResponse> => {
  const response = await apiClient.get('/gematria/systems')
  return response.data
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a color class based on the gematria value
 * Uses golden/mystical tones for significant numbers
 */
export const getValueColorClass = (value: number): string => {
  // Special significant numbers get gold/amber tones
  const significantNumbers = [13, 18, 26, 36, 72, 86, 137, 248, 358, 541, 613]
  if (significantNumbers.includes(value)) {
    return 'text-amber-400'
  }

  // Color by digit sum for others
  const digitSum = value.toString().split('').reduce((a, b) => a + parseInt(b), 0) % 9 || 9
  const colors: Record<number, string> = {
    1: 'text-red-400',
    2: 'text-orange-400',
    3: 'text-yellow-400',
    4: 'text-green-400',
    5: 'text-teal-400',
    6: 'text-blue-400',
    7: 'text-indigo-400',
    8: 'text-purple-400',
    9: 'text-pink-400',
  }
  return colors[digitSum] || 'text-gray-400'
}

/**
 * Check if a number has known spiritual significance
 */
export const isSignificantNumber = (value: number): boolean => {
  const significantNumbers = [
    1, 7, 10, 12, 13, 18, 22, 26, 32, 36, 40, 50, 65, 70, 72, 86, 91,
    137, 216, 248, 358, 541, 613
  ]
  return significantNumbers.includes(value)
}

/**
 * Format a Hebrew text for display (RTL)
 */
export const formatHebrewText = (text: string): string => {
  // Just return the text; CSS will handle RTL
  return text
}

/**
 * Get the system display name
 */
export const getSystemDisplayName = (system: string): string => {
  const names: Record<string, string> = {
    hebrew: 'Hebrew',
    english_ordinal: 'English Ordinal',
    english_reduction: 'English Reduction',
    transliteration: 'Transliteration'
  }
  return names[system] || system
}

export default {
  calculateGematria,
  analyzeName,
  getEquivalences,
  getNumberMeaning,
  getAllMeanings,
  getProfileGematria,
  transliterate,
  getSystems,
}
