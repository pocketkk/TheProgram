/**
 * Numerology API Client
 *
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { apiClient } from './client'

// ============================================================================
// Types
// ============================================================================

export interface NumberMeaning {
  name: string
  keywords: string[]
  meaning: string
  positive: string[]
  challenges: string[]
}

export interface CalculationResult {
  number: number
  calculation?: Record<string, unknown>
  name?: string
  keywords?: string[]
  meaning?: string
  positive?: string[]
  challenges?: string[]
}

export interface LifePathResult extends CalculationResult {
  calculation: {
    day: number
    day_reduced: number
    month: number
    month_reduced: number
    year: number
    year_reduced: number
    total: number
  }
}

export interface NameAnalysis extends CalculationResult {
  total: number
  breakdown: Array<{
    letter: string
    value: number
  }>
}

export interface NumerologyProfile {
  name: string
  birth_date: string
  core_numbers: {
    life_path: LifePathResult
    expression: CalculationResult
    soul_urge: CalculationResult
    personality: CalculationResult
    birthday: CalculationResult
  }
  current_cycles: {
    personal_year: CalculationResult
    personal_month: CalculationResult
    personal_day: CalculationResult
  }
}

export interface CompatibilityResult {
  number1: number
  number2: number
  score: number
  level: string
  description: string
}

export interface DailyNumber {
  date: string
  universal_day: number
  guidance: string
  name: string
  keywords: string[]
  meaning: string
}

export interface ProfileRequest {
  full_name: string
  birth_date: string
}

export interface PersonalCycleRequest {
  birth_date: string
  target_date?: string
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get meanings for all numerology numbers
 */
export const getAllMeanings = async (): Promise<{ count: number; meanings: Record<number, NumberMeaning> }> => {
  const response = await apiClient.get('/numerology/meanings')
  return response.data
}

/**
 * Get meaning for a specific number
 */
export const getNumberMeaning = async (number: number): Promise<NumberMeaning & { number: number }> => {
  const response = await apiClient.get(`/numerology/meanings/${number}`)
  return response.data
}

/**
 * Calculate full numerology profile
 */
export const calculateProfile = async (request: ProfileRequest): Promise<NumerologyProfile> => {
  const response = await apiClient.post('/numerology/profile', request)
  return response.data
}

/**
 * Calculate Life Path Number
 */
export const calculateLifePath = async (request: ProfileRequest): Promise<LifePathResult> => {
  const response = await apiClient.post('/numerology/life-path', request)
  return response.data
}

/**
 * Calculate Expression Number
 */
export const calculateExpression = async (request: ProfileRequest): Promise<CalculationResult> => {
  const response = await apiClient.post('/numerology/expression', request)
  return response.data
}

/**
 * Calculate Soul Urge Number
 */
export const calculateSoulUrge = async (request: ProfileRequest): Promise<CalculationResult> => {
  const response = await apiClient.post('/numerology/soul-urge', request)
  return response.data
}

/**
 * Calculate Personality Number
 */
export const calculatePersonality = async (request: ProfileRequest): Promise<CalculationResult> => {
  const response = await apiClient.post('/numerology/personality', request)
  return response.data
}

/**
 * Calculate Birthday Number
 */
export const calculateBirthday = async (request: ProfileRequest): Promise<CalculationResult> => {
  const response = await apiClient.post('/numerology/birthday', request)
  return response.data
}

/**
 * Analyze any name numerologically
 */
export const analyzeName = async (name: string): Promise<NameAnalysis> => {
  const response = await apiClient.post('/numerology/name', { name })
  return response.data
}

/**
 * Calculate Personal Year Number
 */
export const calculatePersonalYear = async (request: PersonalCycleRequest): Promise<CalculationResult> => {
  const response = await apiClient.post('/numerology/personal-year', request)
  return response.data
}

/**
 * Calculate Personal Month Number
 */
export const calculatePersonalMonth = async (request: PersonalCycleRequest): Promise<CalculationResult> => {
  const response = await apiClient.post('/numerology/personal-month', request)
  return response.data
}

/**
 * Calculate Personal Day Number
 */
export const calculatePersonalDay = async (request: PersonalCycleRequest): Promise<CalculationResult> => {
  const response = await apiClient.post('/numerology/personal-day', request)
  return response.data
}

/**
 * Calculate compatibility between two numbers
 */
export const calculateCompatibility = async (
  number1: number,
  number2: number
): Promise<CompatibilityResult> => {
  const response = await apiClient.post('/numerology/compatibility', { number1, number2 })
  return response.data
}

/**
 * Get today's Universal Day Number
 */
export const getDailyNumber = async (): Promise<DailyNumber> => {
  const response = await apiClient.get('/numerology/daily')
  return response.data
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color class for a number
 */
export const getNumberColorClass = (number: number): string => {
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
    11: 'text-amber-300',
    22: 'text-amber-400',
    33: 'text-amber-500',
  }
  return colors[number] || 'text-gray-400'
}

/**
 * Check if a number is a master number
 */
export const isMasterNumber = (number: number): boolean => {
  return [11, 22, 33].includes(number)
}

/**
 * Format date for API
 */
export const formatDateForApi = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export default {
  getAllMeanings,
  getNumberMeaning,
  calculateProfile,
  calculateLifePath,
  calculateExpression,
  calculateSoulUrge,
  calculatePersonality,
  calculateBirthday,
  analyzeName,
  calculatePersonalYear,
  calculatePersonalMonth,
  calculatePersonalDay,
  calculateCompatibility,
  getDailyNumber,
}
