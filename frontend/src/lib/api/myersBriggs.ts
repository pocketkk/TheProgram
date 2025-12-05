/**
 * Myers-Briggs API client
 *
 * Part of Phase 6: Myers-Briggs personality type integration
 */
import { apiClient, getErrorMessage } from './client'

// ==================== Type Definitions ====================

export interface DichotomyScore {
  dichotomy: string
  preference: string
  strength: number
  first_option: string
  second_option: string
  first_score: number
  second_score: number
  contributing_factors: string[]
}

export interface CognitiveFunction {
  function: string
  name: string
  position: string
  description: string
}

export interface AstrologicalCorrelation {
  element: string
  influences: Record<string, number>
  explanation: string
}

export interface MBTypeResponse {
  id: string | null
  birth_data_id: string
  type_code: string
  type_name: string
  temperament: string
  dichotomies: DichotomyScore[]
  preference_strengths: Record<string, number>
  description: string
  strengths: string[]
  challenges: string[]
  cognitive_stack: CognitiveFunction[] | null
  correlations: AstrologicalCorrelation[] | null
  calculation_info: Record<string, any>
  created_at: string
}

export interface MBTypeInfo {
  type_code: string
  name: string
  temperament: string
  description: string
  cognitive_functions: string[]
  famous_examples: string[]
  percentage: string
}

export interface MBTypesListResponse {
  types: MBTypeInfo[]
  count: number
}

export interface MBDichotomyInfo {
  code: string
  name: string
  first_pole: string
  second_pole: string
  first_description: string
  second_description: string
}

export interface MBDichotomiesListResponse {
  dichotomies: MBDichotomyInfo[]
  count: number
}

export interface MBTypeInterpretationResponse {
  type_code: string
  interpretation: string
}

export interface MBFullReadingResponse {
  birth_data_id: string
  type_code: string
  reading: string
  sections: Record<string, string>
  generated_at: string
}

// ==================== API Functions ====================

/**
 * Calculate Myers-Briggs type for birth data
 */
export async function calculateMBType(
  birthDataId: string,
  options: {
    include_cognitive_stack?: boolean
    include_correlations?: boolean
  } = {}
): Promise<MBTypeResponse> {
  try {
    const params = new URLSearchParams()
    if (options.include_cognitive_stack !== undefined) {
      params.append('include_cognitive_stack', String(options.include_cognitive_stack))
    }
    if (options.include_correlations !== undefined) {
      params.append('include_correlations', String(options.include_correlations))
    }

    const url = `/myers-briggs/calculate/${birthDataId}${params.toString() ? '?' + params.toString() : ''}`
    const response = await apiClient.get(url, { timeout: 30000 })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Calculate MB type via POST with full options
 */
export async function calculateMBTypePost(
  birthDataId: string,
  options: {
    include_cognitive_stack?: boolean
    include_correlations?: boolean
  } = {}
): Promise<MBTypeResponse> {
  try {
    const response = await apiClient.post('/myers-briggs/calculate', {
      birth_data_id: birthDataId,
      ...options
    }, { timeout: 30000 })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// ==================== Reference Data ====================

/**
 * Get list of all 16 MB types
 */
export async function getTypesList(): Promise<MBTypesListResponse> {
  try {
    const response = await apiClient.get('/myers-briggs/types')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get info for a specific MB type
 */
export async function getTypeInfo(typeCode: string): Promise<MBTypeInfo> {
  try {
    const response = await apiClient.get(`/myers-briggs/types/${typeCode}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get list of all 4 dichotomies
 */
export async function getDichotomiesList(): Promise<MBDichotomiesListResponse> {
  try {
    const response = await apiClient.get('/myers-briggs/dichotomies')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// ==================== AI Interpretations ====================

/**
 * Get AI interpretation for MB type
 */
export async function getTypeInterpretation(
  typeCode: string,
  temperament: string,
  strengths?: string[],
  challenges?: string[]
): Promise<MBTypeInterpretationResponse> {
  try {
    const response = await apiClient.post('/myers-briggs/ai/interpret-type', {
      type_code: typeCode,
      temperament,
      strengths: strengths || [],
      challenges: challenges || []
    }, { timeout: 60000 })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get full AI reading for MB type
 */
export async function getFullMBReading(
  birthDataId: string,
  includeCorrelations: boolean = false
): Promise<MBFullReadingResponse> {
  try {
    const response = await apiClient.post('/myers-briggs/ai/full-reading', {
      birth_data_id: birthDataId,
      include_correlations: includeCorrelations
    }, { timeout: 60000 })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// ==================== Helper Functions ====================

/**
 * Get display name for MB type
 */
export function getTypeDisplayName(typeCode: string): string {
  const names: Record<string, string> = {
    'ISTJ': 'The Inspector',
    'ISFJ': 'The Protector',
    'INFJ': 'The Advocate',
    'INTJ': 'The Architect',
    'ISTP': 'The Virtuoso',
    'ISFP': 'The Adventurer',
    'INFP': 'The Mediator',
    'INTP': 'The Logician',
    'ESTP': 'The Entrepreneur',
    'ESFP': 'The Entertainer',
    'ENFP': 'The Campaigner',
    'ENTP': 'The Debater',
    'ESTJ': 'The Executive',
    'ESFJ': 'The Consul',
    'ENFJ': 'The Protagonist',
    'ENTJ': 'The Commander',
  }
  return names[typeCode.toUpperCase()] || typeCode
}

/**
 * Get color for MB type (by temperament)
 */
export function getTypeColor(typeCode: string): string {
  const code = typeCode.toUpperCase()

  // Colors by temperament
  if (code.includes('SJ')) {  // Guardian
    return '#3B82F6' // Blue
  } else if (code.includes('SP')) {  // Artisan
    return '#F59E0B' // Amber
  } else if (code.includes('NF')) {  // Idealist
    return '#10B981' // Emerald
  } else if (code.includes('NT')) {  // Rational
    return '#8B5CF6' // Purple
  }

  return '#6B7280' // Gray fallback
}

/**
 * Get temperament name from type code
 */
export function getTemperamentName(typeCode: string): string {
  const code = typeCode.toUpperCase()

  if (code[1] === 'S' && code[3] === 'J') return 'Guardian'
  if (code[1] === 'S' && code[3] === 'P') return 'Artisan'
  if (code[1] === 'N' && code[2] === 'F') return 'Idealist'
  if (code[1] === 'N' && code[2] === 'T') return 'Rational'

  return 'Unknown'
}

/**
 * Get temperament color
 */
export function getTemperamentColor(temperament: string): string {
  const colors: Record<string, string> = {
    'Guardian': '#3B82F6',
    'Artisan': '#F59E0B',
    'Idealist': '#10B981',
    'Rational': '#8B5CF6',
  }
  return colors[temperament] || '#6B7280'
}

/**
 * Get dichotomy display name
 */
export function getDichotomyDisplayName(code: string): string {
  const names: Record<string, string> = {
    'E/I': 'Extraversion / Introversion',
    'S/N': 'Sensing / Intuition',
    'T/F': 'Thinking / Feeling',
    'J/P': 'Judging / Perceiving',
  }
  return names[code] || code
}

/**
 * Get preference description
 */
export function getPreferenceDescription(letter: string): string {
  const descriptions: Record<string, string> = {
    'E': 'Extraversion - Energized by interaction',
    'I': 'Introversion - Energized by reflection',
    'S': 'Sensing - Focus on concrete facts',
    'N': 'Intuition - Focus on patterns and possibilities',
    'T': 'Thinking - Decisions based on logic',
    'F': 'Feeling - Decisions based on values',
    'J': 'Judging - Prefer structure and closure',
    'P': 'Perceiving - Prefer flexibility and options',
  }
  return descriptions[letter.toUpperCase()] || letter
}

/**
 * Get cognitive function display name
 */
export function getCognitiveFunctionDisplayName(code: string): string {
  const names: Record<string, string> = {
    'Se': 'Extraverted Sensing',
    'Si': 'Introverted Sensing',
    'Ne': 'Extraverted Intuition',
    'Ni': 'Introverted Intuition',
    'Te': 'Extraverted Thinking',
    'Ti': 'Introverted Thinking',
    'Fe': 'Extraverted Feeling',
    'Fi': 'Introverted Feeling',
  }
  return names[code] || code
}

/**
 * Get function position color
 */
export function getFunctionPositionColor(position: string): string {
  const colors: Record<string, string> = {
    'Dominant': '#10B981',   // Green
    'Auxiliary': '#3B82F6',  // Blue
    'Tertiary': '#F59E0B',   // Amber
    'Inferior': '#EF4444',   // Red
  }
  return colors[position] || '#6B7280'
}

/**
 * Format preference strength as percentage
 */
export function formatPreferenceStrength(score: number): string {
  return `${Math.round(score)}%`
}

/**
 * Get letter pair from dichotomy code
 */
export function getDichotomyLetters(dichotomy: string): [string, string] {
  const pairs: Record<string, [string, string]> = {
    'E/I': ['E', 'I'],
    'S/N': ['S', 'N'],
    'T/F': ['T', 'F'],
    'J/P': ['J', 'P'],
  }
  return pairs[dichotomy] || ['?', '?']
}

/**
 * Check if type is introverted
 */
export function isIntroverted(typeCode: string): boolean {
  return typeCode.toUpperCase().startsWith('I')
}

/**
 * Check if type is intuitive
 */
export function isIntuitive(typeCode: string): boolean {
  return typeCode.toUpperCase()[1] === 'N'
}

/**
 * Check if type is thinking
 */
export function isThinking(typeCode: string): boolean {
  return typeCode.toUpperCase()[2] === 'T'
}

/**
 * Check if type is judging
 */
export function isJudging(typeCode: string): boolean {
  return typeCode.toUpperCase().endsWith('J')
}
