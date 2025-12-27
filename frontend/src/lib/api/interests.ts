/**
 * Interests API client
 *
 * Reading history, interest profiles, and relevance scoring.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export interface ReadingEventCreate {
  article_id: string
  source_type: string
  title: string
  url?: string
  source_id?: string
  content?: string
  time_spent_seconds?: number
  scroll_depth_pct?: number
  clicked_links?: boolean
  starred?: boolean
  feedback?: 'more' | 'less'
}

export interface ReadingHistory {
  id: string
  article_id: string
  source_type: string
  source_id: string | null
  title: string
  url: string | null
  topics: string[]
  time_spent_seconds: number
  scroll_depth_pct: number
  clicked_links: boolean
  starred: boolean
  feedback: 'more' | 'less' | null
  engagement_score: number
  created_at: string
}

export interface ReadingHistoryListResponse {
  readings: ReadingHistory[]
  total: number
}

export interface InterestProfile {
  id: string
  topic: string
  category: string | null
  score: number
  decayed_score: number
  article_count: number
  total_time_seconds: number
  positive_feedback: number
  negative_feedback: number
  last_seen: string | null
  created_at: string
}

export interface InterestProfileListResponse {
  interests: InterestProfile[]
  total: number
}

export interface ReadingStats {
  total_readings: number
  total_time_seconds: number
  total_time_hours: number
  sources: Record<string, number>
  starred_count: number
  positive_feedback: number
  negative_feedback: number
  topics_tracked: number
}

export interface ArticleForScoring {
  id: string
  title: string
  content?: string
  source?: string
}

export interface ScoredArticle {
  id: string
  title: string
  relevance_score: number
  matched_topics: string[]
}

export interface ForYouResponse {
  articles: ScoredArticle[]
  total_scored: number
}

export interface ScoreExplanation {
  relevance_score: number
  matched_topics: string[]
  topic_details: Array<{
    topic: string
    interest_score: number
    article_count: number
    feedback_balance: number
  }>
  category_match: boolean
  recommendation: string
}

// AI Insights Types
export interface InterestAnalysis {
  status: string
  message?: string
  insights: string[]
  trends: string[]
  suggestions: string[]
  reading_style?: string
  focus_areas: string[]
  analyzed_at?: string
}

export interface RecommendedFeed {
  name: string
  url: string
  reason: string
  topics: string[]
}

export interface ExploreTopic {
  topic: string
  reason: string
  search_terms: string[]
}

export interface FeedRecommendations {
  status: string
  message?: string
  recommended_feeds: RecommendedFeed[]
  explore_topics: ExploreTopic[]
  diversify_suggestions: string[]
  based_on_topics: string[]
}

export interface DiscoverySuggestions {
  status: string
  message?: string
  related_searches: string[]
  deeper_dive: string[]
  connections: string[]
  question_to_explore?: string
}

export interface PrivacyInfo {
  data_sent: string[]
  data_not_sent: string[]
  explanation: string
}

// =============================================================================
// Reading History
// =============================================================================

/**
 * Record a reading event
 */
export async function recordReading(data: ReadingEventCreate): Promise<ReadingHistory> {
  const response = await apiClient.post('/chronicle/reading', data)
  return response.data
}

/**
 * List reading history
 */
export async function listReadings(
  sourceType?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ReadingHistoryListResponse> {
  const response = await apiClient.get('/chronicle/reading', {
    params: {
      source_type: sourceType,
      limit,
      offset
    }
  })
  return response.data
}

/**
 * Get reading by ID
 */
export async function getReading(id: string): Promise<ReadingHistory> {
  const response = await apiClient.get(`/chronicle/reading/${id}`)
  return response.data
}

/**
 * Update feedback on a reading
 */
export async function updateReadingFeedback(
  id: string,
  feedback: 'more' | 'less'
): Promise<ReadingHistory> {
  const response = await apiClient.put(`/chronicle/reading/${id}/feedback`, { feedback })
  return response.data
}

/**
 * Delete reading record
 */
export async function deleteReading(id: string): Promise<void> {
  await apiClient.delete(`/chronicle/reading/${id}`)
}

// =============================================================================
// Interest Profiles
// =============================================================================

/**
 * List interest profiles
 */
export async function listInterests(
  category?: string,
  minArticles: number = 1,
  limit: number = 50
): Promise<InterestProfileListResponse> {
  const response = await apiClient.get('/chronicle/interests', {
    params: {
      category,
      min_articles: minArticles,
      limit
    }
  })
  return response.data
}

/**
 * Get interest by ID
 */
export async function getInterest(id: string): Promise<InterestProfile> {
  const response = await apiClient.get(`/chronicle/interests/${id}`)
  return response.data
}

/**
 * Delete interest profile
 */
export async function deleteInterest(id: string): Promise<void> {
  await apiClient.delete(`/chronicle/interests/${id}`)
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get reading statistics
 */
export async function getReadingStats(): Promise<ReadingStats> {
  const response = await apiClient.get('/chronicle/stats')
  return response.data
}

// =============================================================================
// For You / Relevance Scoring
// =============================================================================

/**
 * Get personalized "For You" articles
 */
export async function getForYouArticles(
  articles: ArticleForScoring[],
  limit: number = 10,
  minScore: number = 0.4
): Promise<ForYouResponse> {
  const response = await apiClient.post('/chronicle/for-you', {
    articles,
    limit,
    min_score: minScore
  })
  return response.data
}

/**
 * Explain relevance score for an article
 */
export async function explainScore(article: ArticleForScoring): Promise<ScoreExplanation> {
  const response = await apiClient.post('/chronicle/explain-score', article)
  return response.data
}

// =============================================================================
// Data Management
// =============================================================================

/**
 * Clear reading history
 */
export async function clearHistory(keepInterests: boolean = false): Promise<void> {
  await apiClient.delete('/chronicle/clear-history', {
    params: { keep_interests: keepInterests }
  })
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Track article reading with automatic behavior detection
 */
export class ReadingTracker {
  private startTime: number = 0
  private maxScrollDepth: number = 0
  private clickedLinks: boolean = false

  start() {
    this.startTime = Date.now()
    this.maxScrollDepth = 0
    this.clickedLinks = false
  }

  recordScroll(scrollPct: number) {
    this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPct)
  }

  recordLinkClick() {
    this.clickedLinks = true
  }

  getData(): Partial<ReadingEventCreate> {
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000)
    return {
      time_spent_seconds: timeSpent,
      scroll_depth_pct: this.maxScrollDepth,
      clicked_links: this.clickedLinks
    }
  }
}

/**
 * Format engagement score as percentage
 */
export function formatEngagementScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

/**
 * Get interest level description
 */
export function getInterestLevel(score: number): string {
  if (score >= 0.8) return 'Very High'
  if (score >= 0.6) return 'High'
  if (score >= 0.4) return 'Moderate'
  if (score >= 0.2) return 'Low'
  return 'Very Low'
}

// =============================================================================
// AI Insights
// =============================================================================

/**
 * Analyze reading patterns using AI
 */
export async function analyzeInterests(): Promise<InterestAnalysis> {
  const response = await apiClient.get('/chronicle/ai/analyze')
  return response.data
}

/**
 * Get AI-powered feed recommendations
 */
export async function getFeedRecommendations(): Promise<FeedRecommendations> {
  const response = await apiClient.get('/chronicle/ai/feed-recommendations')
  return response.data
}

/**
 * Get content discovery suggestions
 */
export async function getDiscoverySuggestions(topics: string[]): Promise<DiscoverySuggestions> {
  const response = await apiClient.post('/chronicle/ai/discover', { topics })
  return response.data
}

/**
 * Get privacy information about AI analysis
 */
export async function getAIPrivacyInfo(): Promise<PrivacyInfo> {
  const response = await apiClient.get('/chronicle/ai/privacy-info')
  return response.data
}
