/**
 * Ashtakavarga API Client
 *
 * API functions for calculating Ashtakavarga (8-fold strength).
 */

import { apiClient } from './client'

export interface BhinnaAshtakavarga {
  planet: string
  planet_name: string
  bindus_by_sign: number[]  // 12 values, 0-8 each
  total_bindus: number
  strongest_signs: string[]
  weakest_signs: string[]
}

export interface SarvaAshtakavarga {
  bindus_by_sign: number[]  // 12 values, 0-48 each
  total_bindus: number
  average_bindus: number
  strongest_signs: string[]
  weakest_signs: string[]
}

export interface HouseStrength {
  sign: string
  bindus: number
  strength: 'excellent' | 'good' | 'average' | 'challenging'
}

export interface AshtakavargaSummary {
  strongest_planet: string
  strongest_planet_bindus: number
  weakest_planet: string
  weakest_planet_bindus: number
  strongest_sign: string
  strongest_sign_bindus: number
  weakest_sign: string
  weakest_sign_bindus: number
  transit_favorable_signs: string[]
  house_strength: Record<number, HouseStrength>
}

export interface AshtakavargaCalculationInfo {
  ascendant_sign: string
  planet_positions: Record<string, string>
}

export interface AshtakavargaResponse {
  bhinnashtakavarga: Record<string, BhinnaAshtakavarga>
  sarvashtakavarga: SarvaAshtakavarga
  calculation_info: AshtakavargaCalculationInfo
  summary: AshtakavargaSummary
}

export interface AshtakavargaRequest {
  birth_data_id: string
  ayanamsa?: string
}

export interface TransitScoreResponse {
  sign: string
  bindus: number
  quality: string
  description: string
}

/**
 * Calculate Ashtakavarga from birth data
 */
export async function calculateAshtakavarga(request: AshtakavargaRequest): Promise<AshtakavargaResponse> {
  const response = await apiClient.post<AshtakavargaResponse>('/ashtakavarga/calculate', request)
  return response.data
}

/**
 * Get Ashtakavarga for birth data (GET convenience endpoint)
 */
export async function getAshtakavargaForBirthData(
  birthDataId: string,
  ayanamsa: string = 'lahiri'
): Promise<AshtakavargaResponse> {
  const response = await apiClient.get<AshtakavargaResponse>(
    `/ashtakavarga/birth-data/${birthDataId}`,
    { params: { ayanamsa } }
  )
  return response.data
}

/**
 * Get transit score for a specific sign
 */
export async function getTransitScore(
  birthDataId: string,
  transitSign: number,
  ayanamsa: string = 'lahiri'
): Promise<TransitScoreResponse> {
  const response = await apiClient.post<TransitScoreResponse>('/ashtakavarga/transit-score', {
    birth_data_id: birthDataId,
    transit_sign: transitSign,
    ayanamsa,
  })
  return response.data
}
