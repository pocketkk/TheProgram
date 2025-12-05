/**
 * Yogas API Client
 *
 * API functions for detecting Vedic astrological yogas.
 */

import { apiClient } from './client'

export type YogaCategory = 'raja' | 'dhana' | 'pancha_mahapurusha' | 'chandra' | 'surya' | 'other' | 'negative'
export type YogaStrength = 'strong' | 'moderate' | 'weak'

export interface YogaInfo {
  name: string
  sanskrit_name: string
  category: YogaCategory
  planets_involved: string[]
  houses_involved: number[]
  strength: YogaStrength
  description: string
  effects: string
}

export interface YogasSummary {
  raja_yoga_count: number
  dhana_yoga_count: number
  pancha_mahapurusha_count: number
  negative_yoga_count: number
  strongest_yogas: string[]
  overall_assessment: string
}

export interface YogasCalculationInfo {
  ascendant_sign: string
  house_lords: Record<number, string>
}

export interface YogasResponse {
  yogas: Record<string, YogaInfo[]>
  total_count: number
  summary: YogasSummary
  calculation_info: YogasCalculationInfo
}

export interface YogasRequest {
  birth_data_id: string
  ayanamsa?: string
  include_weak?: boolean
}

export interface YogasFromChartRequest {
  chart_id: string
  include_weak?: boolean
}

/**
 * Calculate yogas from birth data
 */
export async function calculateYogas(request: YogasRequest): Promise<YogasResponse> {
  const response = await apiClient.post<YogasResponse>('/yogas/calculate', request)
  return response.data
}

/**
 * Calculate yogas from existing chart
 */
export async function calculateYogasFromChart(request: YogasFromChartRequest): Promise<YogasResponse> {
  const response = await apiClient.post<YogasResponse>('/yogas/calculate-from-chart', request)
  return response.data
}

/**
 * Get yogas for birth data (GET convenience endpoint)
 */
export async function getYogasForBirthData(
  birthDataId: string,
  ayanamsa: string = 'lahiri',
  includeWeak: boolean = false
): Promise<YogasResponse> {
  const response = await apiClient.get<YogasResponse>(
    `/yogas/birth-data/${birthDataId}`,
    { params: { ayanamsa, include_weak: includeWeak } }
  )
  return response.data
}
