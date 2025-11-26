/**
 * I-Ching API Client
 *
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { apiClient } from './client'

// ============================================================================
// Types
// ============================================================================

export interface LineInfo {
  position: number
  value: number
  type: string
  changing: boolean
}

export interface Hexagram {
  number: number
  name: string
  english: string
  keywords: string[]
  meaning: string
  upper_trigram?: string
  lower_trigram?: string
}

export interface Trigram {
  name: string
  chinese: string
  attribute: string
  image: string
  family: string
  direction: string
  season: string
  binary: string
}

export interface Reading {
  timestamp: string
  question: string | null
  method: 'coins' | 'yarrow'
  lines: LineInfo[]
  primary_hexagram: Hexagram
  changing_lines: number[]
  relating_hexagram: Hexagram | null
  interpretation: string
}

export interface DailyHexagram {
  date: string
  hexagram_number: number
  hexagram: Hexagram
  daily_guidance: string
}

export interface SearchResult {
  keyword: string
  count: number
  matches: Hexagram[]
}

export interface ReadingRequest {
  question?: string
  method?: 'coins' | 'yarrow'
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all 64 hexagrams
 */
export const getAllHexagrams = async (): Promise<{ count: number; hexagrams: Record<number, Hexagram> }> => {
  const response = await apiClient.get('/iching/hexagrams')
  return response.data
}

/**
 * Get a specific hexagram by number (1-64)
 */
export const getHexagram = async (number: number): Promise<Hexagram> => {
  const response = await apiClient.get(`/iching/hexagrams/${number}`)
  return response.data
}

/**
 * Get all 8 trigrams
 */
export const getTrigrams = async (): Promise<{ count: number; trigrams: Record<string, Trigram> }> => {
  const response = await apiClient.get('/iching/trigrams')
  return response.data
}

/**
 * Perform an I-Ching reading with a question
 */
export const performReading = async (request: ReadingRequest): Promise<Reading> => {
  const response = await apiClient.post('/iching/reading', request)
  return response.data
}

/**
 * Quick cast without a question
 */
export const quickCast = async (method: 'coins' | 'yarrow' = 'coins'): Promise<Reading> => {
  const response = await apiClient.get('/iching/cast', { params: { method } })
  return response.data
}

/**
 * Get the hexagram of the day
 */
export const getDailyHexagram = async (): Promise<DailyHexagram> => {
  const response = await apiClient.get('/iching/daily')
  return response.data
}

/**
 * Search hexagrams by keyword
 */
export const searchHexagrams = async (keyword: string): Promise<SearchResult> => {
  const response = await apiClient.get('/iching/search', { params: { keyword } })
  return response.data
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the line symbol (yin or yang, changing or stable)
 */
export const getLineSymbol = (value: number): string => {
  switch (value) {
    case 6: return '⚋' // Old Yin (changing)
    case 7: return '⚊' // Young Yang (stable)
    case 8: return '⚋' // Young Yin (stable)
    case 9: return '⚊' // Old Yang (changing)
    default: return '─'
  }
}

/**
 * Get visual representation of a line
 */
export const getLineVisual = (value: number): string => {
  const isYang = value === 7 || value === 9
  const isChanging = value === 6 || value === 9

  if (isYang) {
    return isChanging ? '━━━━○━━━━' : '━━━━━━━━━'
  } else {
    return isChanging ? '━━━  ●  ━━━' : '━━━     ━━━'
  }
}

/**
 * Get the line type description
 */
export const getLineTypeDescription = (value: number): string => {
  switch (value) {
    case 6: return 'Old Yin (changing to Yang)'
    case 7: return 'Young Yang (stable)'
    case 8: return 'Young Yin (stable)'
    case 9: return 'Old Yang (changing to Yin)'
    default: return 'Unknown'
  }
}

/**
 * Get trigram symbol
 */
export const getTrigramSymbol = (name: string): string => {
  const symbols: Record<string, string> = {
    'qian': '☰', // Heaven
    'kun': '☷',  // Earth
    'zhen': '☳', // Thunder
    'xun': '☴',  // Wind
    'kan': '☵',  // Water
    'li': '☲',   // Fire
    'gen': '☶',  // Mountain
    'dui': '☱', // Lake
  }
  return symbols[name.toLowerCase()] || '?'
}

/**
 * Format hexagram display name
 */
export const formatHexagramName = (hexagram: Hexagram): string => {
  return `${hexagram.number}. ${hexagram.name} (${hexagram.english})`
}

export default {
  getAllHexagrams,
  getHexagram,
  getTrigrams,
  performReading,
  quickCast,
  getDailyHexagram,
  searchHexagrams,
}
