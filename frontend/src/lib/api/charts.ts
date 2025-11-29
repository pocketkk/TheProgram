/**
 * Charts API client
 */
import { apiClient, getErrorMessage } from './client'

export interface ChartResponse {
  id: string
  client_id: string | null
  birth_data_id: string
  chart_name: string | null
  chart_type: string
  astro_system: string
  house_system: string | null
  ayanamsa: string | null
  zodiac_type: string
  calculation_params: Record<string, any> | null
  chart_data: Record<string, any>
  last_viewed: string | null
  created_at: string
  updated_at: string
}

export interface ListChartsParams {
  skip?: number
  limit?: number
  chart_type?: string
  astro_system?: string
  client_id?: string
}

/**
 * List all charts for the current user
 */
export async function listCharts(params?: ListChartsParams): Promise<ChartResponse[]> {
  try {
    const response = await apiClient.get<ChartResponse[]>('/charts/', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific chart by ID
 */
export async function getChart(chartId: string, signal?: AbortSignal): Promise<ChartResponse> {
  try {
    const response = await apiClient.get<ChartResponse>(`/charts/${chartId}`, { signal })
    return response.data
  } catch (error) {
    // Re-throw abort errors without wrapping
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Create a new chart
 */
export async function createChart(data: {
  birth_data_id: string
  client_id?: string
  chart_name?: string | null
  chart_type: string
  astro_system: string
  house_system: string
  ayanamsa?: string | null
  zodiac_type: string
  calculation_params?: Record<string, any> | null
  chart_data: Record<string, any>
}): Promise<ChartResponse> {
  try {
    const response = await apiClient.post<ChartResponse>('/charts/', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a chart
 */
export async function deleteChart(chartId: string): Promise<void> {
  try {
    await apiClient.delete(`/charts/${chartId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export interface ChartUpdate {
  chart_name?: string | null
  chart_type?: string
  astro_system?: string
  house_system?: string | null
  ayanamsa?: string | null
  zodiac_type?: string
  calculation_params?: Record<string, any> | null
}

/**
 * Update chart metadata
 */
export async function updateChart(chartId: string, data: ChartUpdate): Promise<ChartResponse> {
  try {
    const response = await apiClient.put<ChartResponse>(`/charts/${chartId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export interface ChartCalculationRequest {
  birth_data_id: string
  chart_type?: string
  astro_system?: string
  house_system?: string
  ayanamsa?: string
  zodiac_type?: string
  chart_name?: string | null
  transit_date?: string | null
  progressed_date?: string | null
  secondary_birth_data_id?: string | null
  include_asteroids?: boolean
  include_fixed_stars?: boolean
  include_arabic_parts?: boolean
  custom_orbs?: Record<string, number> | null
  // Hybrid chart options
  include_nakshatras?: boolean  // Include Vedic nakshatras in Western charts
  include_western_aspects?: boolean  // Include Western-style aspects in Vedic charts
  include_minor_aspects?: boolean  // Include minor aspects in calculations
}

export interface ChartCalculationResponse extends ChartResponse {
  calculation_time_ms: number
}

/**
 * Calculate a new chart from birth data
 */
export async function calculateChart(data: ChartCalculationRequest, signal?: AbortSignal): Promise<ChartCalculationResponse> {
  try {
    const response = await apiClient.post<ChartCalculationResponse>('/charts/calculate', data, { signal })
    return response.data
  } catch (error) {
    // Re-throw abort errors without wrapping
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get an existing chart or create a new one if not found.
 * For transit charts: defaults to current UTC time, looks for existing chart on same day (caching)
 * For natal charts: finds any existing natal chart with matching parameters
 *
 * This is useful for chart type switching - it ensures each chart type has its own
 * chart_id that can be associated with interpretations.
 */
export async function getOrCreateChart(data: ChartCalculationRequest, signal?: AbortSignal): Promise<ChartCalculationResponse> {
  try {
    const response = await apiClient.post<ChartCalculationResponse>('/charts/get-or-create', data, { signal })
    return response.data
  } catch (error) {
    // Re-throw abort errors without wrapping
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error(getErrorMessage(error))
  }
}
