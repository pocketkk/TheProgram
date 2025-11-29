/**
 * Transit API client
 *
 * Part of Phase 3: Advanced Transit Analysis
 */
import { apiClient, getErrorMessage } from './client'

// Types
export interface TransitAspect {
  transit_planet: string
  natal_planet: string
  aspect: string
  orb: number
  is_applying: boolean
  significance: 'major' | 'significant' | 'moderate' | 'minor'
  estimated_duration: string
  transit_sign: string
  transit_degree: number
  natal_sign: string
  natal_degree: number
  transit_retrograde: boolean
}

export interface TransitSummary {
  total_transits: number
  major_count: number
  significant_count: number
  aspect_counts: Record<string, number>
  themes: string[]
  most_significant: TransitAspect | null
}

export interface PlanetPosition {
  longitude: number
  latitude: number
  distance: number
  speed_longitude: number
  is_retrograde: boolean
  sign_name: string
  degree_in_sign: number
}

export interface CurrentTransitsResponse {
  transit_datetime: string
  current_positions: Record<string, PlanetPosition>
  transits: TransitAspect[]
  summary: TransitSummary
}

export interface TransitTimelineEntry {
  date: string
  transits: TransitAspect[]
}

export interface TransitTimelineResponse {
  start_date: string
  end_date: string
  timeline: TransitTimelineEntry[]
  total_days: number
}

export interface UpcomingTransit extends TransitAspect {
  first_date: string
}

export interface UpcomingTransitsResponse {
  days_ahead: number
  upcoming_transits: UpcomingTransit[]
  count: number
}

export interface ExactTransitDate {
  date: string
  transit_planet: string
  natal_planet: string
  aspect: string
  retrograde: boolean
}

export interface ExactTransitDatesResponse {
  transit_planet: string
  natal_planet: string
  aspect: string
  exact_dates: ExactTransitDate[]
  count: number
}

export interface TransitInterpretation {
  theme: string
  description: string
  duration: string
  advice: string
}

export interface TransitReportResponse {
  transit_datetime: string
  report: string
  summary: TransitSummary
}

export interface DailySnapshotResponse {
  date: string
  moon_phase: string
  moon_sign: string
  sun_sign: string
  active_transits: TransitAspect[]
  themes: string[]
  major_transit: TransitAspect | null
}

// Request types
export interface TransitRequest {
  birth_data_id: string
  transit_date?: string
  zodiac?: 'tropical' | 'sidereal'
  orb_multiplier?: number
}

export interface TransitTimelineRequest {
  birth_data_id: string
  start_date: string
  end_date: string
  zodiac?: 'tropical' | 'sidereal'
  interval_days?: number
}

export interface ExactTransitRequest {
  birth_data_id: string
  transit_planet: string
  natal_planet: string
  aspect: string
  start_date: string
  end_date: string
  zodiac?: 'tropical' | 'sidereal'
}

// API Functions

/**
 * Get current transits for a birth chart
 */
export async function getCurrentTransits(
  request: TransitRequest
): Promise<CurrentTransitsResponse> {
  try {
    const response = await apiClient.post('/transits/current', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Simple GET for current transits
 */
export async function getCurrentTransitsSimple(
  birthDataId: string,
  zodiac: 'tropical' | 'sidereal' = 'tropical'
): Promise<CurrentTransitsResponse> {
  try {
    const response = await apiClient.get(`/transits/current/${birthDataId}`, {
      params: { zodiac }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get transit timeline over a date range
 */
export async function getTransitTimeline(
  request: TransitTimelineRequest
): Promise<TransitTimelineResponse> {
  try {
    const response = await apiClient.post('/transits/timeline', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get upcoming significant transits
 */
export async function getUpcomingTransits(
  birthDataId: string,
  days: number = 30,
  zodiac: 'tropical' | 'sidereal' = 'tropical'
): Promise<UpcomingTransitsResponse> {
  try {
    const response = await apiClient.get(`/transits/upcoming/${birthDataId}`, {
      params: { days, zodiac }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Find exact dates for a specific transit
 */
export async function findExactTransitDates(
  request: ExactTransitRequest
): Promise<ExactTransitDatesResponse> {
  try {
    const response = await apiClient.post('/transits/exact-dates', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get interpretation for a transit aspect
 */
export async function getTransitInterpretation(
  transitPlanet: string,
  natalPlanet: string,
  aspect: string
): Promise<TransitInterpretation> {
  try {
    const response = await apiClient.get(
      `/transits/interpret/${transitPlanet}/${natalPlanet}/${aspect}`
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get text report of current transits
 */
export async function getTransitReport(
  birthDataId: string,
  zodiac: 'tropical' | 'sidereal' = 'tropical'
): Promise<TransitReportResponse> {
  try {
    const response = await apiClient.get(`/transits/report/${birthDataId}`, {
      params: { zodiac }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get daily transit snapshot
 */
export async function getDailySnapshot(
  birthDataId: string,
  date?: string,
  zodiac: 'tropical' | 'sidereal' = 'tropical'
): Promise<DailySnapshotResponse> {
  try {
    const response = await apiClient.get(`/transits/daily-snapshot/${birthDataId}`, {
      params: { date, zodiac }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// Helper functions

/**
 * Get color for transit significance
 */
export function getSignificanceColor(significance: string): string {
  const colors: Record<string, string> = {
    major: 'text-celestial-pink',
    significant: 'text-celestial-gold',
    moderate: 'text-blue-400',
    minor: 'text-gray-400'
  }
  return colors[significance] || 'text-gray-400'
}

/**
 * Get symbol for aspect
 */
export function getAspectSymbol(aspect: string): string {
  const symbols: Record<string, string> = {
    conjunction: '☌',
    opposition: '☍',
    trine: '△',
    square: '□',
    sextile: '⚹',
    quincunx: '⚻'
  }
  return symbols[aspect] || aspect
}

/**
 * Get astrological glyph for planet
 */
export function getPlanetSymbol(planet: string): string {
  // Normalize planet name (lowercase, handle variations)
  const normalized = planet.toLowerCase().replace(/_/g, ' ').trim()

  const symbols: Record<string, string> = {
    'sun': '☉',
    'moon': '☽',
    'mercury': '☿',
    'venus': '♀',
    'mars': '♂',
    'jupiter': '♃',
    'saturn': '♄',
    'uranus': '♅',
    'neptune': '♆',
    'pluto': '♇',
    'chiron': '⚷',
    'north node': '☊',
    'south node': '☋',
    'ascendant': 'Asc',
    'midheaven': 'MC',
    'lilith': '⚸',
  }

  return symbols[normalized] || planet
}

/**
 * Get planet display name (capitalized)
 */
export function getPlanetDisplayName(planet: string): string {
  // Handle snake_case like "north_node"
  return planet
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Format transit for display (with symbols)
 */
export function formatTransit(transit: TransitAspect): string {
  const transitSymbol = getPlanetSymbol(transit.transit_planet)
  const aspectSymbol = getAspectSymbol(transit.aspect)
  const natalSymbol = getPlanetSymbol(transit.natal_planet)
  const status = transit.is_applying ? '→' : '←'
  const retro = transit.transit_retrograde ? '℞' : ''
  return `${transitSymbol}${retro} ${aspectSymbol} ${natalSymbol} (${transit.orb.toFixed(1)}° ${status})`
}

/**
 * Format transit with full planet names (for accessibility/tooltips)
 */
export function formatTransitFull(transit: TransitAspect): string {
  const status = transit.is_applying ? 'applying' : 'separating'
  const retro = transit.transit_retrograde ? ' (retrograde)' : ''
  return `${getPlanetDisplayName(transit.transit_planet)}${retro} ${transit.aspect} ${getPlanetDisplayName(transit.natal_planet)} - ${transit.orb.toFixed(1)}° ${status}`
}

/**
 * Get theme description
 */
export function getThemeDescription(theme: string): string {
  const descriptions: Record<string, string> = {
    transformation: 'Deep changes and rebirth',
    expansion: 'Growth and opportunities',
    awakening: 'Spiritual insights and breakthroughs',
    challenge: 'Tests and obstacles to overcome',
    opportunity: 'Favorable conditions for action'
  }
  return descriptions[theme] || theme
}

// ==================== AI Transit Functions ====================

export interface AITransitInterpretationResponse {
  transit: string
  interpretation: string
}

export interface AIDailyForecastResponse {
  date: string
  moon_phase: string
  moon_sign: string
  sun_sign: string
  themes: string[]
  major_transit: TransitAspect | null
  forecast: string
  active_transit_count: number
}

export interface AITransitReportResponse {
  transit_datetime: string
  report_type: 'comprehensive' | 'highlights' | 'brief'
  summary: TransitSummary
  report: string
}

/**
 * Get AI interpretation for a specific transit
 */
export async function getAITransitInterpretation(
  transitData: TransitAspect
): Promise<AITransitInterpretationResponse> {
  try {
    const response = await apiClient.post('/transits/ai/interpret-transit', transitData)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get AI-generated daily transit forecast
 */
export async function getAIDailyForecast(
  birthDataId: string,
  date?: string,
  zodiac: 'tropical' | 'sidereal' = 'tropical'
): Promise<AIDailyForecastResponse> {
  try {
    const response = await apiClient.get(`/transits/ai/daily-forecast/${birthDataId}`, {
      params: { date, zodiac }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get AI-generated comprehensive transit report
 */
export async function getAITransitReport(
  birthDataId: string,
  reportType: 'comprehensive' | 'highlights' | 'brief' = 'comprehensive',
  zodiac: 'tropical' | 'sidereal' = 'tropical'
): Promise<AITransitReportResponse> {
  try {
    const response = await apiClient.get(`/transits/ai/transit-report/${birthDataId}`, {
      params: { report_type: reportType, zodiac }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
