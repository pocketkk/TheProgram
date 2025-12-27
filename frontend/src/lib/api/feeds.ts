/**
 * RSS Feed API client
 *
 * Part of Cosmic Chronicle - privacy-first personal news hub
 */
import { apiClient, getErrorMessage } from './client'

// =============================================================================
// Types
// =============================================================================

export interface RssFeed {
  id: string
  url: string
  title: string
  description: string | null
  site_url: string | null
  icon_url: string | null
  category: string | null
  is_active: boolean
  fetch_interval_minutes: number
  last_fetched_at: string | null
  last_error: string | null
  error_count: number
  article_count: number
  is_healthy: boolean
  needs_refresh: boolean
  created_at: string
  updated_at: string
}

export interface RssFeedCreate {
  url: string
  title: string
  description?: string
  site_url?: string
  icon_url?: string
  category?: string
  fetch_interval_minutes?: number
}

export interface RssFeedUpdate {
  title?: string
  description?: string
  icon_url?: string
  category?: string
  is_active?: boolean
  fetch_interval_minutes?: number
}

export interface RssFeedListResponse {
  feeds: RssFeed[]
  total: number
}

export interface FeedDiscovery {
  url: string
  title: string
  description: string | null
  site_url: string | null
  icon_url: string | null
}

export interface RssArticle {
  id: string
  feed_id: string
  guid: string
  url: string
  title: string
  author: string | null
  summary: string | null
  content: string | null
  image_url: string | null
  published_at: string | null
  categories: string[]
  is_read: boolean
  is_starred: boolean
  relevance_score: number | null
  preview: string
  created_at: string
  updated_at: string
}

export interface RssArticleWithFeed extends RssArticle {
  feed_title: string
  feed_icon_url: string | null
  feed_category: string | null
}

export interface RssArticleListResponse {
  articles: RssArticleWithFeed[]
  total: number
  unread_count: number
}

export interface ArticleListParams {
  feed_id?: string
  category?: string
  is_read?: boolean
  is_starred?: boolean
  limit?: number
  offset?: number
}

export interface FeedRefreshResult {
  feed_id: string
  success: boolean
  new_articles: number
  error: string | null
}

export interface FeedRefreshResponse {
  results: FeedRefreshResult[]
  total_new_articles: number
}

export interface OpmlImportResponse {
  imported: number
  skipped: number
  errors: string[]
  feeds: RssFeed[]
}

export interface OpmlExportResponse {
  opml_content: string
  feed_count: number
}

// =============================================================================
// Feed Management
// =============================================================================

/**
 * Subscribe to a new RSS feed
 */
export async function createFeed(data: RssFeedCreate): Promise<RssFeed> {
  try {
    const response = await apiClient.post<RssFeed>('/chronicle/feeds', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List all feed subscriptions
 */
export async function listFeeds(params?: {
  category?: string
  is_active?: boolean
}): Promise<RssFeedListResponse> {
  try {
    const response = await apiClient.get<RssFeedListResponse>('/chronicle/feeds', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific feed by ID
 */
export async function getFeed(feedId: string): Promise<RssFeed> {
  try {
    const response = await apiClient.get<RssFeed>(`/chronicle/feeds/${feedId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update feed settings
 */
export async function updateFeed(feedId: string, data: RssFeedUpdate): Promise<RssFeed> {
  try {
    const response = await apiClient.put<RssFeed>(`/chronicle/feeds/${feedId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Unsubscribe from a feed
 */
export async function deleteFeed(feedId: string): Promise<void> {
  try {
    await apiClient.delete(`/chronicle/feeds/${feedId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Discover and validate a feed URL
 */
export async function discoverFeed(url: string): Promise<FeedDiscovery> {
  try {
    const response = await apiClient.post<FeedDiscovery>('/chronicle/feeds/discover', { url })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Refresh a single feed
 */
export async function refreshFeed(feedId: string): Promise<FeedRefreshResult> {
  try {
    const response = await apiClient.post<FeedRefreshResult>(`/chronicle/feeds/${feedId}/refresh`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Refresh all feeds (or specific ones)
 */
export async function refreshAllFeeds(feedIds?: string[]): Promise<FeedRefreshResponse> {
  try {
    const response = await apiClient.post<FeedRefreshResponse>('/chronicle/feeds/refresh-all', {
      feed_ids: feedIds
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get all unique feed categories
 */
export async function getFeedCategories(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/chronicle/feeds/categories/all')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Articles
// =============================================================================

/**
 * List articles with optional filters
 */
export async function listArticles(params?: ArticleListParams): Promise<RssArticleListResponse> {
  try {
    const response = await apiClient.get<RssArticleListResponse>('/chronicle/articles', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific article by ID
 */
export async function getArticle(articleId: string): Promise<RssArticleWithFeed> {
  try {
    const response = await apiClient.get<RssArticleWithFeed>(`/chronicle/articles/${articleId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Mark an article as read
 */
export async function markArticleRead(articleId: string): Promise<RssArticle> {
  try {
    const response = await apiClient.post<RssArticle>(`/chronicle/articles/${articleId}/read`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Mark multiple articles as read
 */
export async function markArticlesRead(articleIds: string[]): Promise<void> {
  try {
    await apiClient.post('/chronicle/articles/mark-read', { article_ids: articleIds })
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Toggle article starred status
 */
export async function toggleArticleStar(articleId: string): Promise<RssArticle> {
  try {
    const response = await apiClient.post<RssArticle>(`/chronicle/articles/${articleId}/star`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Record reading behavior for the personal algorithm
 */
export async function recordArticleReading(
  articleId: string,
  data: { time_spent_seconds: number; scroll_depth_pct: number }
): Promise<RssArticle> {
  try {
    const response = await apiClient.post<RssArticle>(`/chronicle/articles/${articleId}/reading`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// OPML Import/Export
// =============================================================================

/**
 * Import feeds from OPML content
 */
export async function importOpml(opmlContent: string): Promise<OpmlImportResponse> {
  try {
    const response = await apiClient.post<OpmlImportResponse>('/chronicle/feeds/import-opml', {
      opml_content: opmlContent
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Export all feeds as OPML
 */
export async function exportOpml(): Promise<OpmlExportResponse> {
  try {
    const response = await apiClient.get<OpmlExportResponse>('/chronicle/feeds/export-opml')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
