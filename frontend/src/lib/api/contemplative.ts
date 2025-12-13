/**
 * Contemplative Cosmic Paper API Client
 *
 * Handles API calls for the contemplative newspaper features including
 * lineage tracking, dream journal, synchronicity, witness log,
 * chart weather, and the unified contemplative newspaper.
 */
import api from './client'

// =============================================================================
// Types
// =============================================================================

export interface LineageMember {
  id: string
  name: string
  relationship: string
  birth_date: string | null
  birth_year: number | null
  death_date: string | null
  death_year: number | null
  birth_location: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  notes: string | null
  life_events: LifeEvent[]
  generation: number
  is_ancestor: boolean
  is_living: boolean
  birth_data_id: string | null
  has_location: boolean
  created_at: string
  updated_at: string
}

export interface LifeEvent {
  date: string
  event: string
  age?: number
}

export interface LineageSnapshot {
  date: string
  year: number
  month: number
  day: number
  living_members: LineageMemberAtDate[]
  deceased_members: LineageMemberAtDate[]
  not_yet_born: LineageMemberAtDate[]
  nearby_events: NearbyEvent[]
  generation_summary: Record<string, number>
  total_living: number
  total_tracked: number
}

export interface LineageMemberAtDate {
  id: string
  name: string
  relationship: string
  age: number | null
  generation: number
  generation_label: string
  birth_year: number | null
  death_year: number | null
  notes: string | null
  nearby_events?: LifeEvent[]
}

export interface NearbyEvent extends LifeEvent {
  member: string
  relationship: string
}

export interface DreamEntry {
  id: string
  dream_date: string
  title: string | null
  narrative: string
  symbols: string[]
  themes: string[]
  emotions: string[]
  characters: string[]
  locations: string[]
  colors: string[]
  lucidity_level: number | null
  vividness: number | null
  emotional_intensity: number | null
  recurring: boolean
  recurring_pattern: string | null
  interpretation: string | null
  ai_interpretation: string | null
  moon_phase: string | null
  correlations: DreamCorrelation[]
  mood_before_sleep: string | null
  mood_upon_waking: string | null
  sleep_quality: number | null
  all_keywords: string[]
  has_interpretation: boolean
  has_correlations: boolean
  created_at: string
  updated_at: string
}

export interface DreamCorrelation {
  date: string
  event: string
  symbol: string
  added_at?: string
}

export interface Synchronicity {
  id: string
  theme: string
  description: string | null
  pattern_type: string
  first_noticed: string | null
  occurrences: SyncOccurrence[]
  dream_ids: string[]
  witness_ids: string[]
  article_references: ArticleReference[]
  personal_events: LifeEvent[]
  transit_correlations: TransitCorrelation[]
  planets_involved: string[]
  user_interpretation: string | null
  ai_interpretation: string | null
  questions_raised: string[]
  significance: number
  active: boolean
  resolved: boolean
  resolution_note: string | null
  occurrence_count: number
  last_occurrence: string | null
  avg_frequency_days: number | null
  keywords: string[]
  days_since_last: number | null
  is_dormant: boolean
  created_at: string
  updated_at: string
}

export interface SyncOccurrence {
  date: string
  type: 'dream' | 'event' | 'news'
  note: string
}

export interface ArticleReference {
  date: string
  headline: string
  source: string
  keywords?: string[]
}

export interface TransitCorrelation {
  transit: string
  dates: string[]
  note: string
}

export interface ChartWeather {
  date: string
  year: number
  month: number
  day: number
  major_transits: Transit[]
  significant_transits: Transit[]
  moderate_transits: Transit[]
  current_positions: Record<string, PlanetPosition>
  overall_energy: string
  themes: string[]
  advice: string
  moon_phase: string
  moon_sign: string
  transit_count: number
}

export interface Transit {
  transit_planet: string
  natal_planet: string
  aspect: string
  orb: number
  applying: boolean
  interpretation: string
}

export interface PlanetPosition {
  sign: string
  degree: number
  retrograde: boolean
}

export interface UnreadArchiveItem {
  id: string
  article_id: string | null
  source: string | null
  source_date: string | null
  headline: string
  content: string | null
  url: string | null
  section: string | null
  tags: string[]
  saved_date: string
  reason: string | null
  feelings: string | null
  not_ready_note: string | null
  revisit_after: string | null
  revisit_count: number
  last_revisited: string | null
  ready_now: boolean
  engaged_date: string | null
  initial_reaction: string | null
  later_reaction: string | null
  insights: string | null
  is_archived: boolean
  waiting_days: number | null
  is_due_for_revisit: boolean
  created_at: string
  updated_at: string
}

export interface WitnessEntry {
  id: string
  witness_date: string
  article_date: string | null
  article_headline: string | null
  article_source: string | null
  article_url: string | null
  article_section: string | null
  initial_reaction: string | null
  body_sensations: string[]
  emotions: string[]
  thoughts: string[]
  judgments: string[]
  personal_connection: string | null
  memories_triggered: string | null
  beliefs_questioned: string | null
  growth_edge: string | null
  breath_count: number | null
  pause_taken: boolean
  action_impulse: string | null
  chosen_response: string | null
  gratitude_found: string | null
  lesson: string | null
  blessing: string | null
  similar_entries: string[]
  recurring_theme: string | null
  intensity: number | null
  category: string | null
  emotion_summary: string
  has_reflection: boolean
  has_integration: boolean
  mindfulness_score: number
  created_at: string
  updated_at: string
}

export interface ContemplativeNewspaper {
  date: string
  year: number
  month: number
  day: number
  base_newspaper: any | null
  contemplative_sections: {
    chart_weather?: any
    lineage?: any
    dreams?: any
    synchronicity?: any
    questions?: any
    silence?: any
    empty_page?: any
    collective_weather?: any
    seasonal?: any
  }
  contemplative_depth: 'light' | 'balanced' | 'deep'
  metadata: {
    depth: string
    sections_generated: string[]
    article_count_analyzed: number
    timestamp: string
  }
}

// =============================================================================
// Lineage API
// =============================================================================

export async function getLineageMembers(): Promise<{ members: LineageMember[]; total: number }> {
  const response = await api.get('/contemplative/lineage')
  return response.data
}

export async function getLineageMember(memberId: string): Promise<LineageMember> {
  const response = await api.get(`/contemplative/lineage/${memberId}`)
  return response.data
}

export async function createLineageMember(member: Partial<LineageMember>): Promise<LineageMember> {
  const response = await api.post('/contemplative/lineage', member)
  return response.data
}

export async function updateLineageMember(memberId: string, updates: Partial<LineageMember>): Promise<LineageMember> {
  const response = await api.patch(`/contemplative/lineage/${memberId}`, updates)
  return response.data
}

export async function deleteLineageMember(memberId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete(`/contemplative/lineage/${memberId}`)
  return response.data
}

export async function addLifeEvent(memberId: string, event: LifeEvent): Promise<LineageMember> {
  const response = await api.post(`/contemplative/lineage/${memberId}/events`, event)
  return response.data
}

export async function getLineageSnapshot(year: number, month: number, day: number): Promise<LineageSnapshot> {
  const response = await api.get(`/contemplative/lineage/snapshot/${year}/${month}/${day}`)
  return response.data
}

// =============================================================================
// Dream Journal API
// =============================================================================

export async function getDreams(params?: {
  limit?: number
  offset?: number
  recurring_only?: boolean
}): Promise<{ dreams: DreamEntry[]; count: number }> {
  const response = await api.get('/contemplative/dreams', { params })
  return response.data
}

export async function getDream(dreamId: string): Promise<DreamEntry> {
  const response = await api.get(`/contemplative/dreams/${dreamId}`)
  return response.data
}

export async function createDream(dream: Partial<DreamEntry>): Promise<DreamEntry> {
  const response = await api.post('/contemplative/dreams', dream)
  return response.data
}

export async function updateDream(dreamId: string, updates: Partial<DreamEntry>): Promise<DreamEntry> {
  const response = await api.patch(`/contemplative/dreams/${dreamId}`, updates)
  return response.data
}

export async function deleteDream(dreamId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete(`/contemplative/dreams/${dreamId}`)
  return response.data
}

export async function getRecurringThemes(): Promise<{ themes: Record<string, number> }> {
  const response = await api.get('/contemplative/dreams/themes/recurring')
  return response.data
}

export async function searchDreamsByTheme(theme: string): Promise<{ dreams: DreamEntry[]; count: number }> {
  const response = await api.get(`/contemplative/dreams/search/${encodeURIComponent(theme)}`)
  return response.data
}

// =============================================================================
// Synchronicity API
// =============================================================================

export async function getSynchronicities(params?: {
  active_only?: boolean
  limit?: number
}): Promise<{ synchronicities: Synchronicity[]; count: number }> {
  const response = await api.get('/contemplative/synchronicities', { params })
  return response.data
}

export async function getSynchronicityStats(): Promise<{
  total_patterns: number
  active_patterns: number
  resolved_patterns: number
  total_occurrences: number
  patterns_by_type: Record<string, number>
  most_significant: Synchronicity[]
  most_frequent: Synchronicity[]
  dormant_patterns: Synchronicity[]
}> {
  const response = await api.get('/contemplative/synchronicities/stats')
  return response.data
}

export async function getSynchronicity(syncId: string): Promise<Synchronicity> {
  const response = await api.get(`/contemplative/synchronicities/${syncId}`)
  return response.data
}

export async function createSynchronicity(sync: Partial<Synchronicity>): Promise<Synchronicity> {
  const response = await api.post('/contemplative/synchronicities', sync)
  return response.data
}

export async function updateSynchronicity(syncId: string, updates: Partial<Synchronicity>): Promise<Synchronicity> {
  const response = await api.patch(`/contemplative/synchronicities/${syncId}`, updates)
  return response.data
}

export async function deleteSynchronicity(syncId: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete(`/contemplative/synchronicities/${syncId}`)
  return response.data
}

export async function addOccurrence(syncId: string, occurrence: SyncOccurrence): Promise<Synchronicity> {
  const response = await api.post(`/contemplative/synchronicities/${syncId}/occurrences`, {
    occurrence_type: occurrence.type,
    note: occurrence.note,
    date: occurrence.date
  })
  return response.data
}

export async function resolveSynchronicity(syncId: string, resolutionNote: string): Promise<Synchronicity> {
  const response = await api.post(`/contemplative/synchronicities/${syncId}/resolve`, null, {
    params: { resolution_note: resolutionNote }
  })
  return response.data
}

// =============================================================================
// Chart Weather API
// =============================================================================

export async function getChartWeather(
  year: number,
  month: number,
  day: number,
  birthDataId?: string
): Promise<ChartWeather | { message: string; has_data: false }> {
  const response = await api.get(`/contemplative/chart-weather/${year}/${month}/${day}`, {
    params: { birth_data_id: birthDataId }
  })
  return response.data
}

// =============================================================================
// Unread Archive API
// =============================================================================

export async function getUnreadArchive(params?: {
  due_only?: boolean
  limit?: number
}): Promise<{ items: UnreadArchiveItem[]; count: number }> {
  const response = await api.get('/contemplative/unread-archive', { params })
  return response.data
}

export async function addToUnreadArchive(item: Partial<UnreadArchiveItem>): Promise<UnreadArchiveItem> {
  const response = await api.post('/contemplative/unread-archive', item)
  return response.data
}

export async function markRevisited(itemId: string): Promise<UnreadArchiveItem> {
  const response = await api.post(`/contemplative/unread-archive/${itemId}/revisit`)
  return response.data
}

export async function markReady(itemId: string): Promise<UnreadArchiveItem> {
  const response = await api.post(`/contemplative/unread-archive/${itemId}/ready`)
  return response.data
}

export async function deleteUnreadItem(itemId: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/contemplative/unread-archive/${itemId}`)
  return response.data
}

// =============================================================================
// Witness Log API
// =============================================================================

export async function getWitnessEntries(limit?: number): Promise<{ entries: WitnessEntry[]; count: number }> {
  const response = await api.get('/contemplative/witness-log', { params: { limit } })
  return response.data
}

export async function getWitnessEntry(entryId: string): Promise<WitnessEntry> {
  const response = await api.get(`/contemplative/witness-log/${entryId}`)
  return response.data
}

export async function createWitnessEntry(entry: Partial<WitnessEntry>): Promise<WitnessEntry> {
  const response = await api.post('/contemplative/witness-log', entry)
  return response.data
}

export async function deleteWitnessEntry(entryId: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/contemplative/witness-log/${entryId}`)
  return response.data
}

// =============================================================================
// Contemplative Newspaper API
// =============================================================================

export async function getContemplativeNewspaper(
  year: number,
  month: number,
  day: number,
  options?: {
    depth?: 'light' | 'balanced' | 'deep'
    include_sections?: string[]
  }
): Promise<ContemplativeNewspaper> {
  const params: Record<string, string> = {}
  if (options?.depth) {
    params.depth = options.depth
  }
  if (options?.include_sections?.length) {
    params.include_sections = options.include_sections.join(',')
  }

  const response = await api.get(`/contemplative/newspaper/${year}/${month}/${day}`, { params })
  return response.data
}

// =============================================================================
// Export all functions as a namespace
// =============================================================================

export const contemplativeApi = {
  // Lineage
  getLineageMembers,
  getLineageMember,
  createLineageMember,
  updateLineageMember,
  deleteLineageMember,
  addLifeEvent,
  getLineageSnapshot,

  // Dreams
  getDreams,
  getDream,
  createDream,
  updateDream,
  deleteDream,
  getRecurringThemes,
  searchDreamsByTheme,

  // Synchronicity
  getSynchronicities,
  getSynchronicityStats,
  getSynchronicity,
  createSynchronicity,
  updateSynchronicity,
  deleteSynchronicity,
  addOccurrence,
  resolveSynchronicity,

  // Chart Weather
  getChartWeather,

  // Unread Archive
  getUnreadArchive,
  addToUnreadArchive,
  markRevisited,
  markReady,
  deleteUnreadItem,

  // Witness Log
  getWitnessEntries,
  getWitnessEntry,
  createWitnessEntry,
  deleteWitnessEntry,

  // Newspaper
  getContemplativeNewspaper,
}

export default contemplativeApi
