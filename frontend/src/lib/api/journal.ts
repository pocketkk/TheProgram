/**
 * Journal API client
 *
 * Part of Phase 2: Journal System
 */
import { apiClient, getErrorMessage } from './client'

// Types
export interface JournalEntry {
  id: string
  birth_data_id: string | null
  chart_id: string | null
  entry_date: string
  title: string | null
  content: string
  tags: string[]
  mood: string | null
  mood_score: number | null
  transit_context: Record<string, unknown> | null
  ai_summary: string | null
  preview: string
  created_at: string
  updated_at: string
}

export interface JournalEntryWithContext extends JournalEntry {
  chart_name?: string
  birth_data_label?: string
}

export interface JournalEntryCreate {
  entry_date: string
  title?: string
  content: string
  tags?: string[]
  mood?: string
  mood_score?: number
  birth_data_id?: string
  chart_id?: string
  transit_context?: Record<string, unknown>
}

export interface JournalEntryUpdate {
  entry_date?: string
  title?: string
  content?: string
  tags?: string[]
  mood?: string
  mood_score?: number
  birth_data_id?: string
  chart_id?: string
}

export interface JournalSearchParams {
  query?: string
  tags?: string[]
  mood?: string
  mood_score_min?: number
  mood_score_max?: number
  date_from?: string
  date_to?: string
  birth_data_id?: string
  chart_id?: string
  limit?: number
  offset?: number
}

export interface JournalSearchResponse {
  entries: JournalEntry[]
  total: number
  limit: number
  offset: number
}

export interface JournalListParams {
  birth_data_id?: string
  chart_id?: string
  tag?: string
  mood?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

// API Functions

/**
 * Create a new journal entry
 */
export async function createJournalEntry(data: JournalEntryCreate): Promise<JournalEntry> {
  try {
    const response = await apiClient.post<JournalEntry>('/journal', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List journal entries with optional filters
 */
export async function listJournalEntries(params?: JournalListParams): Promise<JournalEntry[]> {
  try {
    const response = await apiClient.get<JournalEntry[]>('/journal', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific journal entry by ID
 */
export async function getJournalEntry(entryId: string): Promise<JournalEntryWithContext> {
  try {
    const response = await apiClient.get<JournalEntryWithContext>(`/journal/${entryId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a journal entry
 */
export async function updateJournalEntry(entryId: string, data: JournalEntryUpdate): Promise<JournalEntry> {
  try {
    const response = await apiClient.put<JournalEntry>(`/journal/${entryId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(entryId: string): Promise<void> {
  try {
    await apiClient.delete(`/journal/${entryId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Search journal entries
 */
export async function searchJournalEntries(params: JournalSearchParams): Promise<JournalSearchResponse> {
  try {
    const response = await apiClient.post<JournalSearchResponse>('/journal/search', params)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get all unique tags
 */
export async function getAllTags(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/journal/tags/all')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get all unique moods
 */
export async function getAllMoods(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/journal/moods/all')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
