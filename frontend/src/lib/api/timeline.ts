/**
 * Timeline API client
 *
 * Part of Phase 2: Transit Timeline
 */
import { apiClient, getErrorMessage } from './client'

// Types
export interface UserEvent {
  id: string
  birth_data_id: string
  event_date: string
  event_time: string | null
  title: string
  description: string | null
  category: string | null
  importance: 'minor' | 'moderate' | 'major' | 'transformative'
  tags: string[]
  is_recurring: boolean
  recurrence_pattern: string | null
  transit_analysis: string | null
  datetime_string: string
  created_at: string
  updated_at: string
}

export interface TransitContext {
  id: string
  birth_data_id: string
  user_event_id: string | null
  context_date: string
  transit_data: Record<string, unknown> | null
  significant_transits: Array<Record<string, unknown>> | null
  historical_context: string | null
  personal_context: string | null
  themes: string[] | null
  has_significant_transits: boolean
  created_at: string
  updated_at: string
}

export interface UserEventWithTransits extends UserEvent {
  transit_context?: TransitContext
}

export interface UserEventCreate {
  birth_data_id: string
  event_date: string
  event_time?: string
  title: string
  description?: string
  category?: string
  importance?: 'minor' | 'moderate' | 'major' | 'transformative'
  tags?: string[]
  is_recurring?: boolean
  recurrence_pattern?: string
}

export interface UserEventUpdate {
  event_date?: string
  event_time?: string
  title?: string
  description?: string
  category?: string
  importance?: 'minor' | 'moderate' | 'major' | 'transformative'
  tags?: string[]
  is_recurring?: boolean
  recurrence_pattern?: string
}

export interface TransitContextCreate {
  birth_data_id: string
  context_date: string
  user_event_id?: string
  transit_data?: Record<string, unknown>
  significant_transits?: Array<Record<string, unknown>>
}

export interface TimelineDataPoint {
  date: string
  events: UserEvent[]
  transit_context: TransitContext | null
  significant_transits: Array<Record<string, unknown>>
  lunar_phase: string | null
}

export interface TimelineRangeResponse {
  birth_data_id: string
  start_date: string
  end_date: string
  data_points: TimelineDataPoint[]
  upcoming_significant_transits: Array<Record<string, unknown>>
  active_long_term_transits: Array<Record<string, unknown>>
}

export interface TimelineRangeRequest {
  birth_data_id: string
  start_date: string
  end_date: string
  include_events?: boolean
  include_transits?: boolean
  transit_types?: string[]
  event_categories?: string[]
}

export interface UserEventListParams {
  birth_data_id?: string
  category?: string
  importance?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

// API Functions - User Events

/**
 * Create a new user event
 */
export async function createUserEvent(data: UserEventCreate): Promise<UserEvent> {
  try {
    const response = await apiClient.post<UserEvent>('/timeline/events', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List user events with optional filters
 */
export async function listUserEvents(params?: UserEventListParams): Promise<UserEvent[]> {
  try {
    const response = await apiClient.get<UserEvent[]>('/timeline/events', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific user event by ID
 */
export async function getUserEvent(eventId: string): Promise<UserEventWithTransits> {
  try {
    const response = await apiClient.get<UserEventWithTransits>(`/timeline/events/${eventId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a user event
 */
export async function updateUserEvent(eventId: string, data: UserEventUpdate): Promise<UserEvent> {
  try {
    const response = await apiClient.put<UserEvent>(`/timeline/events/${eventId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a user event
 */
export async function deleteUserEvent(eventId: string): Promise<void> {
  try {
    await apiClient.delete(`/timeline/events/${eventId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// API Functions - Transit Context

/**
 * Create transit context
 */
export async function createTransitContext(data: TransitContextCreate): Promise<TransitContext> {
  try {
    const response = await apiClient.post<TransitContext>('/timeline/transit-context', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get transit context by ID
 */
export async function getTransitContext(contextId: string): Promise<TransitContext> {
  try {
    const response = await apiClient.get<TransitContext>(`/timeline/transit-context/${contextId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get or create transit context for a date
 */
export async function getTransitContextByDate(birthDataId: string, date: string): Promise<TransitContext> {
  try {
    const response = await apiClient.get<TransitContext>(`/timeline/transit-context/date/${birthDataId}/${date}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// API Functions - Timeline View

/**
 * Get timeline data for a date range
 */
export async function getTimelineRange(request: TimelineRangeRequest): Promise<TimelineRangeResponse> {
  try {
    const response = await apiClient.post<TimelineRangeResponse>('/timeline/range', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get all event categories
 */
export async function getEventCategories(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/timeline/categories')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get valid importance levels
 */
export async function getImportanceLevels(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/timeline/importance-levels')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
