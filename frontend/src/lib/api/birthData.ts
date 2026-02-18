/**
 * Birth Data API client
 *
 * Supports multiple people (friends, family, POIs) with notes.
 */
import { apiClient, getErrorMessage } from './client'

// Relationship types
export type RelationshipType =
  | 'family'
  | 'friend'
  | 'partner'
  | 'client'
  | 'celebrity'
  | 'historical'
  | 'other'

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'family',
  'friend',
  'partner',
  'client',
  'celebrity',
  'historical',
  'other',
]

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  family: 'Family',
  friend: 'Friend',
  partner: 'Partner',
  client: 'Client',
  celebrity: 'Celebrity',
  historical: 'Historical',
  other: 'Other',
}

export interface BirthDataResponse {
  id: string
  // Person identification
  name: string | null
  relationship_type: RelationshipType | null
  notes: string | null
  is_primary: boolean
  color: string | null
  // Birth info
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
  // Additional computed fields (from BirthDataWithLocation)
  location_string?: string
  has_time?: boolean
  data_quality?: string
}

export interface BirthDataCreate {
  // Person identification
  name?: string | null
  relationship_type?: RelationshipType | null
  notes?: string | null
  is_primary?: boolean
  color?: string | null
  // Birth info
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

export interface BirthDataUpdate {
  // Person identification
  name?: string | null
  relationship_type?: RelationshipType | null
  notes?: string | null
  is_primary?: boolean
  color?: string | null
  // Birth info
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
 * Create new birth data
 */
export async function createBirthData(data: BirthDataCreate): Promise<BirthDataResponse> {
  try {
    const response = await apiClient.post<BirthDataResponse>('/birth-data/', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List all birth data (single-user mode)
 * @param relationshipType - Optional filter by relationship type
 */
export async function listBirthData(relationshipType?: RelationshipType): Promise<BirthDataResponse[]> {
  try {
    const params = relationshipType ? { relationship_type: relationshipType } : {}
    const response = await apiClient.get<BirthDataResponse[]>('/birth-data/', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get the user's primary (own) birth data
 */
export async function getPrimaryBirthData(): Promise<BirthDataResponse> {
  try {
    const response = await apiClient.get<BirthDataResponse>('/birth-data/primary')
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
    const response = await apiClient.get<BirthDataResponse>(`/birth-data/${birthDataId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update birth data
 */
export async function updateBirthData(birthDataId: string, data: BirthDataUpdate): Promise<BirthDataResponse> {
  try {
    const response = await apiClient.put<BirthDataResponse>(`/birth-data/${birthDataId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update notes for a birth data record
 * Convenience function for updating just the notes field
 */
export async function updateBirthDataNotes(birthDataId: string, notes: string): Promise<BirthDataResponse> {
  return updateBirthData(birthDataId, { notes })
}

/**
 * Delete birth data
 */
export async function deleteBirthData(birthDataId: string): Promise<void> {
  try {
    await apiClient.delete(`/birth-data/${birthDataId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
