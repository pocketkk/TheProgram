/**
 * Timeline Historical API client
 *
 * Fetches Wikipedia "On This Day" events and AI-generated newspapers
 */
import { apiClient, getErrorMessage } from './client'

// Types
export interface WikipediaEvent {
  year: number
  text: string
  page_titles?: string[]
  page_url?: string
}

export interface HistoricalEventsResponse {
  month: number
  day: number
  events: WikipediaEvent[]
  births: WikipediaEvent[]
  deaths: WikipediaEvent[]
  holidays: Array<Record<string, unknown>>
  selected?: WikipediaEvent[]
  cached: boolean
  cached_at?: string
}

export interface NewspaperArticle {
  headline: string
  content: string
  year: number
  significance?: string
  source?: 'guardian' | 'nyt' | 'wikipedia' | 'system'
}

export interface NewspaperSection {
  name: string
  articles: NewspaperArticle[]
}

export interface NewspaperResponse {
  date_display: string
  headline: string
  sections: NewspaperSection[]
  style: string
  generated_at: string
  cached: boolean
  // Multi-source metadata (for year-specific newspapers)
  year?: number
  is_year_specific?: boolean
  sources_used?: string[]
  sources_failed?: Record<string, string>
}

export interface TimelineDateResponse {
  date: string
  historical_events?: HistoricalEventsResponse
  newspaper?: NewspaperResponse
  transits?: Record<string, unknown>
  journal_entries: Array<Record<string, unknown>>
  user_events: Array<Record<string, unknown>>
}

/**
 * Get historical events for a specific month/day
 */
export async function getHistoricalEvents(
  month: number,
  day: number,
  forceRefresh = false
): Promise<HistoricalEventsResponse> {
  try {
    const params = new URLSearchParams()
    if (forceRefresh) params.append('force_refresh', 'true')

    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<HistoricalEventsResponse>(
      `/timeline-historical/historical/${month}/${day}${query}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get AI-generated newspaper for a specific date
 */
export async function getNewspaper(
  month: number,
  day: number,
  style: 'victorian' | 'modern' = 'victorian',
  regenerate = false
): Promise<NewspaperResponse> {
  try {
    const params = new URLSearchParams()
    params.append('style', style)
    if (regenerate) params.append('regenerate', 'true')

    // Longer timeout for newspaper generation (AI synthesis can take time)
    const response = await apiClient.get<NewspaperResponse>(
      `/timeline-historical/historical/${month}/${day}/newspaper?${params.toString()}`,
      { timeout: 60000 } // 1 minute timeout for "On This Day" + AI generation
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get complete timeline data for a specific date
 */
export async function getTimelineDate(
  date: string,
  options: {
    birthDataId?: string
    includeHistorical?: boolean
    includeNewspaper?: boolean
    newspaperStyle?: 'victorian' | 'modern'
    includeTransits?: boolean
  } = {}
): Promise<TimelineDateResponse> {
  try {
    const params = new URLSearchParams()
    if (options.birthDataId) params.append('birth_data_id', options.birthDataId)
    if (options.includeHistorical !== undefined) params.append('include_historical', String(options.includeHistorical))
    if (options.includeNewspaper !== undefined) params.append('include_newspaper', String(options.includeNewspaper))
    if (options.newspaperStyle) params.append('newspaper_style', options.newspaperStyle)
    if (options.includeTransits !== undefined) params.append('include_transits', String(options.includeTransits))

    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<TimelineDateResponse>(
      `/timeline-historical/date/${date}${query}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get year-specific AI-generated newspaper for a specific date
 *
 * Unlike getNewspaper which shows "On This Day" events from different years,
 * this fetches news from the ACTUAL date specified (e.g., news from Nov 30, 1985).
 *
 * Sources:
 * - The Guardian (1999-present) - requires API key
 * - New York Times (1851-present) - requires API key
 * - Wikipedia (all dates) - always available as fallback
 */
export async function getYearSpecificNewspaper(
  year: number,
  month: number,
  day: number,
  style: 'victorian' | 'modern' = 'modern',
  regenerate = false
): Promise<NewspaperResponse> {
  try {
    const params = new URLSearchParams()
    params.append('style', style)
    if (regenerate) params.append('regenerate', 'true')

    // Longer timeout for newspaper generation (fetches from multiple APIs + AI synthesis)
    const response = await apiClient.get<NewspaperResponse>(
      `/timeline-historical/historical/${year}/${month}/${day}/newspaper?${params.toString()}`,
      { timeout: 120000 } // 2 minute timeout for multi-source + AI generation
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// News source types for settings
export interface NewsSourcesStatus {
  guardian_configured: boolean
  nyt_configured: boolean
  newsapi_configured: boolean
  sources_priority: string
  message?: string
}

/**
 * Get news sources configuration status
 */
export async function getNewsSourcesStatus(): Promise<NewsSourcesStatus> {
  try {
    const response = await apiClient.get<NewsSourcesStatus>(
      '/auth/api-key/news/status'
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Set Guardian API key
 */
export async function setGuardianApiKey(apiKey: string): Promise<{ message: string }> {
  try {
    const response = await apiClient.post<{ message: string }>(
      '/auth/api-key/guardian',
      { api_key: apiKey }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Set NYT API key
 */
export async function setNytApiKey(apiKey: string): Promise<{ message: string }> {
  try {
    const response = await apiClient.post<{ message: string }>(
      '/auth/api-key/nyt',
      { api_key: apiKey }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Set news sources priority order
 */
export async function setNewsSourcesPriority(
  priority: string
): Promise<{ message: string }> {
  try {
    const response = await apiClient.post<{ message: string }>(
      '/auth/preferences/news-sources-priority',
      { sources_priority: priority }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Streaming Newspaper Generation
// =============================================================================

/**
 * SSE event types for streaming newspaper generation
 */
export interface NewspaperProgressEvent {
  step: string
  message: string
  percent: number
}

export interface NewspaperSourceCompleteEvent {
  source: 'guardian' | 'nyt' | 'wikipedia'
  article_count: number
  success: boolean
}

export interface NewspaperCompleteEvent {
  newspaper: NewspaperResponse
}

export interface NewspaperErrorEvent {
  message: string
}

export type NewspaperStreamEvent =
  | { type: 'progress'; data: NewspaperProgressEvent }
  | { type: 'source_complete'; data: NewspaperSourceCompleteEvent }
  | { type: 'complete'; data: NewspaperCompleteEvent }
  | { type: 'error'; data: NewspaperErrorEvent }

/**
 * Callbacks for streaming newspaper generation
 */
export interface NewspaperStreamCallbacks {
  onProgress?: (event: NewspaperProgressEvent) => void
  onSourceComplete?: (event: NewspaperSourceCompleteEvent) => void
  onComplete: (newspaper: NewspaperResponse) => void
  onError: (error: string) => void
}

/**
 * Get year-specific newspaper with streaming progress updates
 *
 * Uses Server-Sent Events (SSE) to provide real-time progress updates
 * during the multi-step newspaper generation process.
 */
export function streamYearSpecificNewspaper(
  year: number,
  month: number,
  day: number,
  style: 'victorian' | 'modern' = 'modern',
  callbacks: NewspaperStreamCallbacks
): () => void {
  // Determine base URL from environment
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const url = `${baseUrl}/timeline-historical/historical/${year}/${month}/${day}/newspaper/stream?style=${style}`

  const eventSource = new EventSource(url)

  eventSource.addEventListener('progress', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as NewspaperProgressEvent
      callbacks.onProgress?.(data)
    } catch (e) {
      console.error('Failed to parse progress event:', e)
    }
  })

  eventSource.addEventListener('source_complete', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as NewspaperSourceCompleteEvent
      callbacks.onSourceComplete?.(data)
    } catch (e) {
      console.error('Failed to parse source_complete event:', e)
    }
  })

  eventSource.addEventListener('complete', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as NewspaperCompleteEvent
      callbacks.onComplete(data.newspaper)
      eventSource.close()
    } catch (e) {
      console.error('Failed to parse complete event:', e)
      callbacks.onError('Failed to parse newspaper data')
      eventSource.close()
    }
  })

  eventSource.addEventListener('error', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as NewspaperErrorEvent
      callbacks.onError(data.message)
    } catch {
      // Connection error, not a parsed error event
      if (eventSource.readyState === EventSource.CLOSED) {
        callbacks.onError('Connection closed unexpectedly')
      }
    }
    eventSource.close()
  })

  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CLOSED) {
      // Only report error if we haven't completed
      // (EventSource closes on completion too)
    }
  }

  // Return cleanup function
  return () => {
    eventSource.close()
  }
}
