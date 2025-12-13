/**
 * Content Preferences API Client
 *
 * Handles API calls for personalized Cosmic Paper settings including
 * interests, location, sports, RSS feeds, and the truth algorithm.
 */
import api from './client'

// =============================================================================
// Types
// =============================================================================

export interface LocationConfig {
  name: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  configured: boolean
}

export interface InterestItem {
  topic: string
  weight: number
}

export interface TeamItem {
  name: string
  league: string
  sport: string
  city?: string
  aliases?: string[]
}

export interface SportsConfig {
  teams: TeamItem[]
  leagues: string[]
  show_sports: boolean
}

export interface FilteringConfig {
  blocked_sources: string[]
  blocked_keywords: string[]
  prioritized_topics: string[]
}

export interface TruthAlgorithmConfig {
  enabled: boolean
  focus_topics: string[]
  source_trust_levels: Record<string, number>
}

export interface DisplayConfig {
  show_weather: boolean
  show_sports: boolean
  show_horoscope_context: boolean
  show_rss_content: boolean
}

export interface CustomSection {
  name: string
  topics: string[]
}

export interface RssFeed {
  id: string
  url: string
  name: string
  category: string
  description: string | null
  is_active: boolean
  topics: string[]
  trust_level: number
  supports_historical: boolean
  historical_url_template: string | null
  last_fetched_at: string | null
  last_error: string | null
  entry_count: number
  created_at: string
  updated_at: string
}

export interface ContentPreferences {
  location: LocationConfig
  interests: InterestItem[]
  sports: SportsConfig
  rss: {
    categories: string[]
    show_content: boolean
  }
  filtering: FilteringConfig
  truth_algorithm: TruthAlgorithmConfig
  display: DisplayConfig
  custom_sections: CustomSection[]
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all content preferences
 */
export async function getContentPreferences(): Promise<ContentPreferences> {
  const response = await api.get('/content-preferences')
  return response.data
}

/**
 * Update multiple preference sections at once
 */
export async function updateContentPreferences(
  updates: Partial<{
    location: { name?: string; latitude: number; longitude: number; timezone?: string }
    interests: InterestItem[]
    sports: { teams: TeamItem[]; leagues: string[] }
    filtering: FilteringConfig
    truth_algorithm: TruthAlgorithmConfig
    display: Partial<DisplayConfig>
    custom_sections: CustomSection[]
    rss_categories: string[]
  }>
): Promise<ContentPreferences> {
  const response = await api.patch('/content-preferences', updates)
  return response.data
}

// =============================================================================
// Location
// =============================================================================

export async function getLocation(): Promise<LocationConfig> {
  const response = await api.get('/content-preferences/location')
  return response.data
}

export async function updateLocation(location: {
  name?: string
  latitude: number
  longitude: number
  timezone?: string
}): Promise<LocationConfig> {
  const response = await api.put('/content-preferences/location', location)
  return response.data
}

export async function clearLocation(): Promise<{ message: string; success: boolean }> {
  const response = await api.delete('/content-preferences/location')
  return response.data
}

// =============================================================================
// Interests
// =============================================================================

export async function getInterests(): Promise<{ interests: InterestItem[] }> {
  const response = await api.get('/content-preferences/interests')
  return response.data
}

export async function updateInterests(interests: InterestItem[]): Promise<{ interests: InterestItem[] }> {
  const response = await api.put('/content-preferences/interests', { interests })
  return response.data
}

export async function addInterest(topic: string, weight: number = 1.0): Promise<{ interests: InterestItem[] }> {
  const response = await api.post('/content-preferences/interests/add', null, {
    params: { topic, weight }
  })
  return response.data
}

export async function removeInterest(topic: string): Promise<{ interests: InterestItem[]; message: string }> {
  const response = await api.delete(`/content-preferences/interests/${encodeURIComponent(topic)}`)
  return response.data
}

// =============================================================================
// Sports
// =============================================================================

export async function getSports(): Promise<SportsConfig> {
  const response = await api.get('/content-preferences/sports')
  return response.data
}

export async function updateSports(teams: TeamItem[], leagues: string[]): Promise<SportsConfig> {
  const response = await api.put('/content-preferences/sports', { teams, leagues })
  return response.data
}

export async function addTeam(
  name: string,
  league: string,
  sport: string,
  city?: string
): Promise<{ teams: TeamItem[] }> {
  const response = await api.post('/content-preferences/sports/team', null, {
    params: { name, league, sport, city }
  })
  return response.data
}

export async function removeTeam(teamName: string): Promise<{ teams: TeamItem[] }> {
  const response = await api.delete(`/content-preferences/sports/team/${encodeURIComponent(teamName)}`)
  return response.data
}

export async function addLeague(leagueName: string): Promise<{ leagues: string[] }> {
  const response = await api.post(`/content-preferences/sports/league/${encodeURIComponent(leagueName)}`)
  return response.data
}

export async function removeLeague(leagueName: string): Promise<{ leagues: string[] }> {
  const response = await api.delete(`/content-preferences/sports/league/${encodeURIComponent(leagueName)}`)
  return response.data
}

// =============================================================================
// Filtering
// =============================================================================

export async function getFiltering(): Promise<FilteringConfig> {
  const response = await api.get('/content-preferences/filtering')
  return response.data
}

export async function updateFiltering(filtering: FilteringConfig): Promise<FilteringConfig> {
  const response = await api.put('/content-preferences/filtering', filtering)
  return response.data
}

// =============================================================================
// Truth Algorithm
// =============================================================================

export async function getTruthAlgorithm(): Promise<TruthAlgorithmConfig> {
  const response = await api.get('/content-preferences/truth-algorithm')
  return response.data
}

export async function updateTruthAlgorithm(config: TruthAlgorithmConfig): Promise<TruthAlgorithmConfig> {
  const response = await api.put('/content-preferences/truth-algorithm', config)
  return response.data
}

// =============================================================================
// Custom Sections
// =============================================================================

export async function getCustomSections(): Promise<{ sections: CustomSection[] }> {
  const response = await api.get('/content-preferences/custom-sections')
  return response.data
}

export async function updateCustomSections(sections: CustomSection[]): Promise<{ sections: CustomSection[] }> {
  const response = await api.put('/content-preferences/custom-sections', { sections })
  return response.data
}

// =============================================================================
// Display Preferences
// =============================================================================

export async function getDisplayPreferences(): Promise<DisplayConfig> {
  const response = await api.get('/content-preferences/display')
  return response.data
}

export async function updateDisplayPreferences(prefs: Partial<DisplayConfig>): Promise<DisplayConfig> {
  const response = await api.patch('/content-preferences/display', prefs)
  return response.data
}

// =============================================================================
// RSS Feeds
// =============================================================================

export async function listRssFeeds(
  category?: string,
  activeOnly: boolean = true
): Promise<{ feeds: RssFeed[]; total: number }> {
  const response = await api.get('/content-preferences/rss-feeds', {
    params: { category, active_only: activeOnly }
  })
  return response.data
}

export async function createRssFeed(feed: {
  url: string
  name: string
  category?: string
  description?: string
  topics?: string[]
  trust_level?: number
  supports_historical?: boolean
  historical_url_template?: string
}): Promise<RssFeed> {
  const response = await api.post('/content-preferences/rss-feeds', feed)
  return response.data
}

export async function getRssFeed(feedId: string): Promise<RssFeed> {
  const response = await api.get(`/content-preferences/rss-feeds/${feedId}`)
  return response.data
}

export async function updateRssFeed(
  feedId: string,
  updates: Partial<{
    name: string
    category: string
    description: string
    is_active: boolean
    topics: string[]
    trust_level: number
    supports_historical: boolean
    historical_url_template: string
  }>
): Promise<RssFeed> {
  const response = await api.patch(`/content-preferences/rss-feeds/${feedId}`, updates)
  return response.data
}

export async function deleteRssFeed(feedId: string): Promise<{ message: string; success: boolean }> {
  const response = await api.delete(`/content-preferences/rss-feeds/${feedId}`)
  return response.data
}

export async function testRssFeed(url: string): Promise<{
  success: boolean
  feed_name: string | null
  entry_count: number
  error: string | null
  sample_entries: Array<{
    title: string
    link: string
    published_date: string | null
    summary: string | null
  }>
}> {
  const response = await api.post('/content-preferences/rss-feeds/test', null, {
    params: { url }
  })
  return response.data
}

export async function refreshRssFeed(feedId: string): Promise<{
  success: boolean
  entry_count: number
  error: string | null
}> {
  const response = await api.post(`/content-preferences/rss-feeds/${feedId}/refresh`)
  return response.data
}

// =============================================================================
// RSS Categories
// =============================================================================

export async function getRssCategories(): Promise<{ categories: string[] }> {
  const response = await api.get('/content-preferences/rss-categories')
  return response.data
}

export async function updateRssCategories(categories: string[]): Promise<{ categories: string[] }> {
  const response = await api.put('/content-preferences/rss-categories', { categories })
  return response.data
}

// =============================================================================
// Export all functions as a namespace
// =============================================================================

export const contentPreferencesApi = {
  // Full preferences
  getContentPreferences,
  updateContentPreferences,

  // Location
  getLocation,
  updateLocation,
  clearLocation,

  // Interests
  getInterests,
  updateInterests,
  addInterest,
  removeInterest,

  // Sports
  getSports,
  updateSports,
  addTeam,
  removeTeam,
  addLeague,
  removeLeague,

  // Filtering
  getFiltering,
  updateFiltering,

  // Truth Algorithm
  getTruthAlgorithm,
  updateTruthAlgorithm,

  // Custom Sections
  getCustomSections,
  updateCustomSections,

  // Display
  getDisplayPreferences,
  updateDisplayPreferences,

  // RSS Feeds
  listRssFeeds,
  createRssFeed,
  getRssFeed,
  updateRssFeed,
  deleteRssFeed,
  testRssFeed,
  refreshRssFeed,

  // RSS Categories
  getRssCategories,
  updateRssCategories,
}

export default contentPreferencesApi
