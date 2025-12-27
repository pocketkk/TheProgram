/**
 * Sports API client
 *
 * Provides access to sports scores, headlines, and favorites.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export interface SportScore {
  game_id: string
  sport: string
  league: string
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled'
  home_team: string
  home_team_abbr: string
  home_score: number | null
  home_logo: string | null
  away_team: string
  away_team_abbr: string
  away_score: number | null
  away_logo: string | null
  start_time: string
  venue: string | null
  broadcast: string | null
  period: string | null
  time_remaining: string | null
}

export interface SportsHeadline {
  id: string
  title: string
  description: string
  url: string
  image_url: string | null
  published_at: string
  sport: string
  league: string | null
  source: string
}

export interface SportsDataResponse {
  scores: SportScore[]
  headlines: SportsHeadline[]
  fetched_at: string
}

export interface SportsFavorite {
  id: string
  entity_type: 'team' | 'league' | 'sport'
  entity_id: string
  name: string
  sport: string
  league: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface SportsFavoriteCreate {
  entity_type: 'team' | 'league' | 'sport'
  entity_id: string
  name: string
  sport: string
  league?: string
  logo_url?: string
}

export interface SportsFavoriteListResponse {
  favorites: SportsFavorite[]
  total: number
}

export interface SupportedLeague {
  key: string
  sport: string
  league_id: string
  display_name: string
}

export interface SupportedLeaguesResponse {
  leagues: SupportedLeague[]
}

// =============================================================================
// Leagues
// =============================================================================

/**
 * Get list of supported leagues
 */
export async function getSupportedLeagues(): Promise<SupportedLeaguesResponse> {
  const response = await apiClient.get('/chronicle/sports/leagues')
  return response.data
}

// =============================================================================
// Scores and Headlines
// =============================================================================

/**
 * Get scores for specified leagues
 */
export async function getScores(leagues: string[] = ['nfl', 'nba']): Promise<SportScore[]> {
  const response = await apiClient.get('/chronicle/sports/scores', {
    params: { leagues: leagues.join(',') }
  })
  return response.data
}

/**
 * Get headlines for specified leagues
 */
export async function getHeadlines(
  leagues: string[] = ['nfl', 'nba'],
  limit: number = 10
): Promise<SportsHeadline[]> {
  const response = await apiClient.get('/chronicle/sports/headlines', {
    params: { leagues: leagues.join(','), limit }
  })
  return response.data
}

/**
 * Get combined scores and headlines
 */
export async function getSportsData(leagues: string[] = ['nfl', 'nba']): Promise<SportsDataResponse> {
  const response = await apiClient.get('/chronicle/sports/data', {
    params: { leagues: leagues.join(',') }
  })
  return response.data
}

// =============================================================================
// Favorites
// =============================================================================

/**
 * Create a sports favorite
 */
export async function createFavorite(data: SportsFavoriteCreate): Promise<SportsFavorite> {
  const response = await apiClient.post('/chronicle/sports/favorites', data)
  return response.data
}

/**
 * List all favorites
 */
export async function listFavorites(sport?: string): Promise<SportsFavoriteListResponse> {
  const response = await apiClient.get('/chronicle/sports/favorites', {
    params: sport ? { sport } : undefined
  })
  return response.data
}

/**
 * Delete a favorite
 */
export async function deleteFavorite(id: string): Promise<void> {
  await apiClient.delete(`/chronicle/sports/favorites/${id}`)
}

/**
 * Get scores for favorite teams/leagues
 */
export async function getFavoriteScores(): Promise<SportScore[]> {
  const response = await apiClient.get('/chronicle/sports/favorites/scores')
  return response.data
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Format game status for display
 */
export function formatGameStatus(score: SportScore): string {
  switch (score.status) {
    case 'scheduled':
      return new Date(score.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
    case 'in_progress':
      if (score.time_remaining && score.period) {
        return `${score.period} - ${score.time_remaining}`
      }
      return 'Live'
    case 'final':
      return 'Final'
    case 'postponed':
      return 'Postponed'
    case 'canceled':
      return 'Canceled'
    default:
      return score.status
  }
}

/**
 * Get sport icon name
 */
export function getSportIcon(sport: string): string {
  const icons: Record<string, string> = {
    football: 'Football',
    basketball: 'Basketball',
    baseball: 'Baseball',
    hockey: 'Hockey',
    soccer: 'Football', // Use football icon for soccer
  }
  return icons[sport] || 'Trophy'
}

/**
 * Check if game is live
 */
export function isGameLive(score: SportScore): boolean {
  return score.status === 'in_progress'
}
