/**
 * Dasha API Client
 *
 * API functions for calculating and retrieving Vimsottari Dasha periods.
 */
import { apiClient, getErrorMessage } from './client'

export interface DashaPeriod {
  planet: string
  planet_name: string
  symbol: string
  color: string
  start_date: string
  end_date: string
  duration_years: number
  level: 'mahadasha' | 'antardasha' | 'pratyantardasha'
  parent_planet?: string
}

export interface Mahadasha extends DashaPeriod {
  period_number: number
  antardashas?: DashaPeriod[]
}

export interface NakshatraInfo {
  number: number
  name: string
  lord: string
  pada: number
  degrees_in_nakshatra: number
}

export interface DashaCalculationInfo {
  moon_longitude: number
  nakshatra: NakshatraInfo
  starting_planet: string
  elapsed_first_dasha_years: number
  remaining_first_dasha_years: number
  birth_datetime: string
}

export interface DashaSummary {
  current_period_string: string
  current_mahadasha?: string
  current_antardasha?: string
  time_remaining_in_mahadasha?: {
    years: number
    days: number
  }
}

export interface DashaResponse {
  mahadashas: Mahadasha[]
  current_mahadasha?: DashaPeriod
  current_antardasha?: DashaPeriod
  current_pratyantardasha?: DashaPeriod
  calculation_info: DashaCalculationInfo
  summary?: DashaSummary
}

export interface DashaRequest {
  birth_data_id: string
  include_antardashas?: boolean
  include_pratyantardashas?: boolean
  calculate_years?: number
  ayanamsa?: string
}

export interface DashaFromChartRequest {
  chart_id: string
  include_antardashas?: boolean
  include_pratyantardashas?: boolean
}

export interface DashaDirectRequest {
  moon_longitude: number
  birth_datetime: string
  include_antardashas?: boolean
  include_pratyantardashas?: boolean
  calculate_years?: number
}

export interface CurrentDashaResponse {
  current_period: string
  mahadasha?: {
    planet: string
    planet_name: string
    start_date: string
    end_date: string
    remaining_years?: number
  }
  antardasha?: {
    planet: string
    planet_name: string
    start_date: string
    end_date: string
  }
  pratyantardasha?: {
    planet: string
    planet_name: string
    start_date: string
    end_date: string
  }
}

/**
 * Calculate Dasha from birth data record
 */
export async function calculateDasha(request: DashaRequest): Promise<DashaResponse> {
  try {
    const response = await apiClient.post<DashaResponse>('/dasha/calculate', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Calculate Dasha from an existing chart
 */
export async function calculateDashaFromChart(request: DashaFromChartRequest): Promise<DashaResponse> {
  try {
    const response = await apiClient.post<DashaResponse>('/dasha/calculate-from-chart', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Calculate Dasha directly from Moon position
 */
export async function calculateDashaDirect(request: DashaDirectRequest): Promise<DashaResponse> {
  try {
    const response = await apiClient.post<DashaResponse>('/dasha/calculate-direct', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get current Dasha periods for a birth data record
 */
export async function getCurrentDasha(
  birthDataId: string,
  ayanamsa: string = 'lahiri'
): Promise<CurrentDashaResponse> {
  try {
    const response = await apiClient.get<CurrentDashaResponse>(
      `/dasha/current/${birthDataId}`,
      { params: { ayanamsa } }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get nakshatra info for a longitude
 */
export async function getNakshatraInfo(longitude: number): Promise<{
  longitude: number
  nakshatra: NakshatraInfo
  dasha_lord: string
  planet_info: {
    name: string
    symbol: string
    color: string
  }
}> {
  try {
    const response = await apiClient.get(`/dasha/nakshatra-info/${longitude}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
