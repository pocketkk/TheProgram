/**
 * Insights API Client
 *
 * Part of Phase 3: AI Proactive Intelligence
 */
import { apiClient } from './client'

// ============================================================================
// Types
// ============================================================================

export interface DayEnergy {
  level: string
  score: number
  description: string
  positive_score?: number
  challenging_score?: number
}

export interface MoonPhase {
  phase: string
  description: string
  day_of_cycle: number
}

export interface TransitInfo {
  transiting_planet: string
  aspect_name: string
  natal_planet: string
  orb: number
  significance_score: number
}

export interface Recommendations {
  do: string[]
  avoid: string[]
  focus_on: string[]
}

export interface DailyInsights {
  date: string
  name: string
  day_energy: DayEnergy
  moon_phase: MoonPhase
  key_transits: TransitInfo[]
  all_transits_count: number
  ai_insight: string | null
  recommendations: Recommendations
  focus_areas: string[]
  challenges: string[]
  opportunities: string[]
}

export interface WeekPreviewDay {
  date: string
  day_name: string
  energy_level: string
  energy_score: number
  key_transit_count: number
  moon_phase: string
}

export interface WeekPreview {
  name: string
  week_preview: WeekPreviewDay[]
}

export interface JournalConsistency {
  score: number
  streak: number
  level: string
  total_days_covered?: number
  days_with_entries?: number
}

export interface MoodAnalysis {
  average_score: number
  total_recorded: number
  distribution: Record<string, number>
  top_moods: Array<{ mood: string; count: number }>
  trend: string
}

export interface ContentSentiment {
  ratio: number
  positive_words: number
  negative_words: number
  overall: string
}

export interface JournalPatterns {
  status?: string
  message?: string
  summary?: {
    total_entries: number
    date_range: { start: string; end: string; days: number }
    average_mood: number
  }
  mood_analysis?: MoodAnalysis
  content_analysis?: {
    total_words: number
    average_words_per_entry: number
    sentiment: ContentSentiment
    life_areas: Record<string, number>
    top_words: Array<{ word: string; count: number }>
  }
  temporal_patterns?: {
    by_day_of_week: Record<string, number>
    by_time_of_day: Record<string, number>
    by_month: Record<string, number>
    most_active_day: string
    journaling_consistency: JournalConsistency
  }
  themes?: Array<{ theme: string; mentions: number; type: string }>
  ai_insights?: string | null
  recommendations?: string[]
}

export interface InsightsDashboard {
  name: string
  date: string
  daily_insights: {
    day_energy: DayEnergy
    moon_phase: MoonPhase
    key_transits_count: number
    ai_insight: string | null
    recommendations: Recommendations
  } | null
  journal_summary: {
    total_entries: number
    mood_trend: string
    sentiment: string
    consistency: JournalConsistency
    top_themes: string[]
  } | null
}

export interface TodaySummary {
  date: string
  day_name: string
  moon_phase: MoonPhase
  current_positions: Record<string, unknown>
  universal_guidance: string
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get personalized daily insights
 */
export const getDailyInsights = async (
  birthDataId: string,
  targetDate?: string
): Promise<DailyInsights> => {
  const response = await apiClient.get(`/insights/daily/${birthDataId}`, {
    params: targetDate ? { target_date: targetDate } : undefined,
  })
  return response.data
}

/**
 * Get week preview
 */
export const getWeekPreview = async (birthDataId: string): Promise<WeekPreview> => {
  const response = await apiClient.get(`/insights/week-preview/${birthDataId}`)
  return response.data
}

/**
 * Get current moon phase
 */
export const getMoonPhase = async (): Promise<MoonPhase & { date: string }> => {
  const response = await apiClient.get('/insights/moon-phase')
  return response.data
}

/**
 * Get today's universal summary
 */
export const getTodaySummary = async (): Promise<TodaySummary> => {
  const response = await apiClient.get('/insights/today-summary')
  return response.data
}

/**
 * Analyze journal patterns
 */
export const getJournalPatterns = async (birthDataId?: string): Promise<JournalPatterns> => {
  const response = await apiClient.get('/insights/journal-patterns', {
    params: birthDataId ? { birth_data_id: birthDataId } : undefined,
  })
  return response.data
}

/**
 * Get comprehensive insights dashboard
 */
export const getInsightsDashboard = async (birthDataId: string): Promise<InsightsDashboard> => {
  const response = await apiClient.get(`/insights/dashboard/${birthDataId}`)
  return response.data
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color class for energy level
 */
export const getEnergyColorClass = (level: string): string => {
  const colors: Record<string, string> = {
    highly_positive: 'text-green-400',
    positive: 'text-teal-400',
    mixed: 'text-yellow-400',
    challenging: 'text-orange-400',
    intense: 'text-red-400',
    neutral: 'text-gray-400',
  }
  return colors[level] || 'text-gray-400'
}

/**
 * Get emoji for moon phase
 */
export const getMoonPhaseEmoji = (phase: string): string => {
  const emojis: Record<string, string> = {
    'New Moon': '🌑',
    'Waxing Crescent': '🌒',
    'First Quarter': '🌓',
    'Waxing Gibbous': '🌔',
    'Full Moon': '🌕',
    'Waning Gibbous': '🌖',
    'Last Quarter': '🌗',
    'Waning Crescent': '🌘',
  }
  return emojis[phase] || '🌙'
}

/**
 * Format energy score as percentage bar
 */
export const formatEnergyScore = (score: number): { positive: number; negative: number } => {
  return {
    positive: score,
    negative: 100 - score,
  }
}

export default {
  getDailyInsights,
  getWeekPreview,
  getMoonPhase,
  getTodaySummary,
  getJournalPatterns,
  getInsightsDashboard,
}
