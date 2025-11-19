/**
 * Birth Data API client
 */
import { apiClient, getErrorMessage } from './client'

export interface BirthDataResponse {
  id: string
  client_id: string
  birth_date: string
  birth_time: string | null
  time_unknown: boolean
  latitude: number
  longitude: number
  timezone: string | null
  utc_offset: number | null
  city: string | null
  state_province: string | null
  country: string | null
  rodden_rating: string | null
  gender: string | null
  created_at: string
  updated_at: string
}

export interface BirthDataCreate {
  client_id: string
  birth_date: string
  birth_time?: string | null
  time_unknown?: boolean
  latitude: number
  longitude: number
  timezone?: string | null
  utc_offset?: number | null
  city?: string | null
  state_province?: string | null
  country?: string | null
  rodden_rating?: string | null
  gender?: string | null
}

/**
 * Create new birth data
 */
export async function createBirthData(data: BirthDataCreate): Promise<BirthDataResponse> {
  try {
    const response = await apiClient.post<BirthDataResponse>('/birth-data', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get birth data by ID
 */
export async function getBirthData(birthDataId: string): Promise<BirthDataResponse> {
  try {
    const response = await apiClient.get<BirthDataResponse>(`/api/birth-data/${birthDataId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List birth data for a client
 */
export async function listBirthDataForClient(clientId: string): Promise<BirthDataResponse[]> {
  try {
    const response = await apiClient.get<BirthDataResponse[]>(`/api/birth-data/client/${clientId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export interface BirthDataUpdate {
  birth_date?: string
  birth_time?: string | null
  time_unknown?: boolean
  latitude?: number
  longitude?: number
  timezone?: string | null
  utc_offset?: number | null
  city?: string | null
  state_province?: string | null
  country?: string | null
  rodden_rating?: string | null
  gender?: string | null
}

/**
 * Update birth data
 */
export async function updateBirthData(birthDataId: string, data: BirthDataUpdate): Promise<BirthDataResponse> {
  try {
    const response = await apiClient.put<BirthDataResponse>(`/api/birth-data/${birthDataId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete birth data
 */
export async function deleteBirthData(birthDataId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/birth-data/${birthDataId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
