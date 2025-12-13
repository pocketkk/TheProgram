/**
 * Location History API Client
 *
 * API functions for importing and querying location history data.
 * Part of the Personal History Investigation feature.
 */
import { apiClient, getErrorMessage } from './client'

// =============================================================================
// Types
// =============================================================================

export interface LocationImport {
  id: string
  source: string
  source_file_name: string | null
  import_status: string
  total_records: number | null
  imported_records: number | null
  skipped_records: number | null
  error_message: string | null
  date_range_start: string | null
  date_range_end: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface LocationRecord {
  id: string
  import_id: string
  timestamp: string
  latitude: number
  longitude: number
  accuracy_meters: number | null
  altitude_meters: number | null
  place_name: string | null
  place_type: string | null
  duration_minutes: number | null
  source_id: string | null
  metadata: Record<string, unknown> | null
  date_only: string
  created_at: string
  updated_at: string
}

export interface SignificantLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  state_province: string | null
  country: string | null
  location_type: string
  first_visit: string | null
  last_visit: string | null
  total_visits: number | null
  total_duration_hours: number | null
  is_residence: boolean
  residence_start: string | null
  residence_end: string | null
  is_current_residence: boolean
  location_string: string
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ImportResult {
  import_id: string
  success: boolean
  total_records: number
  imported_records: number
  skipped_records: number
  date_range_start: string | null
  date_range_end: string | null
  errors: string[]
  warnings: string[]
}

export interface ImportStats {
  total_imports: number
  total_records: number
  date_range_start: string | null
  date_range_end: string | null
  sources: Record<string, number>
}

export interface TimelineEntry {
  date: string
  locations: LocationRecord[]
  unique_places: string[]
  total_duration_minutes: number
  location_count: number
}

export interface ResidenceHistory {
  residences: SignificantLocation[]
  current_residence: SignificantLocation | null
  total_moves: number
}

export interface LocationRecordListParams {
  import_id?: string
  date_from?: string
  date_to?: string
  place_type?: string
  place_name?: string
  limit?: number
  offset?: number
}

export interface SignificantLocationCreate {
  name: string
  latitude: number
  longitude: number
  address?: string | null
  city?: string | null
  state_province?: string | null
  country?: string | null
  location_type?: string
  first_visit?: string | null
  last_visit?: string | null
  is_residence?: boolean
  residence_start?: string | null
  residence_end?: string | null
  notes?: string | null
}

export interface SignificantLocationUpdate {
  name?: string
  address?: string | null
  city?: string | null
  state_province?: string | null
  country?: string | null
  location_type?: string
  notes?: string | null
  is_residence?: boolean
  residence_start?: string | null
  residence_end?: string | null
}

// =============================================================================
// Import API
// =============================================================================

/**
 * Import location history from a file
 */
export async function importLocationHistory(
  file: File,
  source: 'google_takeout' | 'apple' | 'gpx',
  options?: {
    dateFrom?: string
    dateTo?: string
  }
): Promise<ImportResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source', source)
    if (options?.dateFrom) {
      formData.append('date_from', options.dateFrom)
    }
    if (options?.dateTo) {
      formData.append('date_to', options.dateTo)
    }

    const response = await apiClient.post<ImportResult>(
      '/location-history/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minute timeout for large files
      }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List all imports
 */
export async function listImports(params?: {
  source?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<LocationImport[]> {
  try {
    const response = await apiClient.get<LocationImport[]>(
      '/location-history/imports',
      { params }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get import statistics
 */
export async function getImportStats(): Promise<ImportStats> {
  try {
    const response = await apiClient.get<ImportStats>(
      '/location-history/imports/stats'
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific import by ID
 */
export async function getImport(importId: string): Promise<LocationImport> {
  try {
    const response = await apiClient.get<LocationImport>(
      `/location-history/imports/${importId}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete an import and all its records
 */
export async function deleteImport(importId: string): Promise<void> {
  try {
    await apiClient.delete(`/location-history/imports/${importId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Location Records API
// =============================================================================

/**
 * List location records with filters
 */
export async function listLocationRecords(
  params?: LocationRecordListParams
): Promise<LocationRecord[]> {
  try {
    const response = await apiClient.get<LocationRecord[]>(
      '/location-history/records',
      { params }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific location record
 */
export async function getLocationRecord(
  recordId: string
): Promise<LocationRecord> {
  try {
    const response = await apiClient.get<LocationRecord>(
      `/location-history/records/${recordId}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a location record
 */
export async function updateLocationRecord(
  recordId: string,
  data: { place_name?: string; place_type?: string; duration_minutes?: number }
): Promise<LocationRecord> {
  try {
    const response = await apiClient.put<LocationRecord>(
      `/location-history/records/${recordId}`,
      data
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a location record
 */
export async function deleteLocationRecord(recordId: string): Promise<void> {
  try {
    await apiClient.delete(`/location-history/records/${recordId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Significant Locations API
// =============================================================================

/**
 * List significant locations
 */
export async function listSignificantLocations(params?: {
  location_type?: string
  is_residence?: boolean
  city?: string
  country?: string
  limit?: number
  offset?: number
}): Promise<SignificantLocation[]> {
  try {
    const response = await apiClient.get<SignificantLocation[]>(
      '/location-history/significant',
      { params }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Create a significant location
 */
export async function createSignificantLocation(
  data: SignificantLocationCreate
): Promise<SignificantLocation> {
  try {
    const response = await apiClient.post<SignificantLocation>(
      '/location-history/significant',
      data
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a significant location
 */
export async function getSignificantLocation(
  locationId: string
): Promise<SignificantLocation> {
  try {
    const response = await apiClient.get<SignificantLocation>(
      `/location-history/significant/${locationId}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a significant location
 */
export async function updateSignificantLocation(
  locationId: string,
  data: SignificantLocationUpdate
): Promise<SignificantLocation> {
  try {
    const response = await apiClient.put<SignificantLocation>(
      `/location-history/significant/${locationId}`,
      data
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a significant location
 */
export async function deleteSignificantLocation(
  locationId: string
): Promise<void> {
  try {
    await apiClient.delete(`/location-history/significant/${locationId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Timeline & Query API
// =============================================================================

/**
 * Get location timeline for date range
 */
export async function getLocationTimeline(
  dateFrom: string,
  dateTo: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<TimelineEntry[]> {
  try {
    const response = await apiClient.get<TimelineEntry[]>(
      '/location-history/timeline',
      {
        params: {
          date_from: dateFrom,
          date_to: dateTo,
          group_by: groupBy,
        },
      }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get residence history
 */
export async function getResidenceHistory(): Promise<ResidenceHistory> {
  try {
    const response = await apiClient.get<ResidenceHistory>(
      '/location-history/residences'
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get locations for a specific date
 */
export async function getLocationsForDate(date: string): Promise<{
  date: string
  locations: LocationRecord[]
  location_count: number
  unique_places: string[]
}> {
  try {
    const response = await apiClient.get(`/location-history/date/${date}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
