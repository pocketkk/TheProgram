/**
 * Human Design API client
 *
 * Part of Phase 4: Human Design System Integration
 */
import { apiClient, getErrorMessage } from './client'

// ==================== Type Definitions ====================

export interface GateActivation {
  gate: number
  line: number
  color: number
  tone: number
  base: number
  planet: string
  longitude: number
  sign: string
  degree_in_sign: number
  degree?: number  // Alias for degree_in_sign
  gate_name: string
  gate_keyword: string
  is_design?: boolean
}

export interface ChannelDefinition {
  channel_id?: string
  name: string
  gate1: number
  gate2: number
  gates?: [number, number]  // Computed from gate1, gate2
  center1: string
  center2: string
  center_from?: string  // Alias for center1
  center_to?: string    // Alias for center2
  circuit: string
  type?: string
  description: string
  keynote?: string
  gate1_activations: string[]
  gate2_activations: string[]
  activation_type: string
}

export interface CenterDefinition {
  center?: string  // Added by transform from dict key
  name: string
  defined: boolean
  activated_gates: number[]
  gates?: number[]  // Alias for activated_gates
  active_gates?: number[]  // Alias for activated_gates
  defining_channels: string[]
  biological_correlation: string
  theme: string
  not_self_theme: string
}

export interface ProfileInfo {
  profile: string
  name: string
  personality_line: number
  design_line: number
  angle: string
  description: string
}

export interface IncarnationCross {
  name: string
  type: string
  gates: {
    personality_sun: number
    personality_earth: number
    design_sun: number
    design_earth: number
  }
  description: string
}

export interface Variables {
  determination: {
    color: number
    tone: number
    base: number
    arrow: string
    description: string
  }
  environment: {
    color: number
    tone: number
    base: number
    arrow: string
    description: string
  }
  perspective: {
    color: number
    tone: number
    base: number
    arrow: string
    description: string
  }
  awareness: {
    color: number
    tone: number
    base: number
    arrow: string
    description: string
  }
}

export interface HDChartResponse {
  id: string | null
  birth_data_id: string

  // Core HD attributes - backend uses hd_type
  hd_type: string
  type?: string  // Alias for hd_type, populated by transform
  strategy: string
  authority: string
  authority_description: string
  signature: string
  not_self: string
  definition: string
  definition_description: string
  profile: ProfileInfo
  incarnation_cross: IncarnationCross

  // Activations - backend returns as dict keyed by planet
  personality_activations: Record<string, GateActivation> | GateActivation[]
  design_activations: Record<string, GateActivation> | GateActivation[]
  all_activated_gates: number[]
  personality_gates: number[]
  design_gates: number[]

  // Structure - backend returns centers as dict, channels as array
  channels: ChannelDefinition[]
  centers: Record<string, CenterDefinition> | CenterDefinition[]
  defined_centers: string[]
  undefined_centers: string[]

  // Advanced
  variables?: Variables

  // Timestamps
  personality_datetime: string
  design_datetime: string
  design_days_before: number

  // Calculation info
  calculation_info: {
    zodiac_type: string
    sidereal_method?: string
    ayanamsa?: string
    ayanamsa_value?: number
  }
  created_at: string
}

// Reference data types
export interface HDGateInfo {
  gate: number
  name: string
  center: string
  keynote: string
  description: string
  theme: string
  channel_partners: number[]
  hexagram_name: string
  shadow: string
  gift: string
  siddhi: string
  // Additional fields from backend
  channel_name?: string
  line_descriptions?: Record<string, string>
}

// Raw response from backend uses gate1/gate2, center1/center2
interface HDChannelInfoRaw {
  gate1: number
  gate2: number
  name: string
  center1: string
  center2: string
  circuit: string
  description: string
}

// Transformed for frontend use
export interface HDChannelInfo {
  channel_id: string
  name: string
  gates: [number, number]
  center_from: string
  center_to: string
  type: string
  keynote: string
  description: string
}

export interface HDCenterInfo {
  center: string
  biological_correlation: string
  theme: string
  gates: number[]
  defined_meaning: string
  undefined_meaning: string
  not_self_question: string
}

export interface HDTypeInfo {
  type: string
  strategy: string
  signature: string
  not_self_theme: string
  aura: string
  percentage: string
  description: string
}

// API Response types
export interface HDGatesListResponse {
  gates: HDGateInfo[]
  count: number
}

export interface HDChannelsListResponse {
  channels: HDChannelInfo[]
  count: number
}

export interface HDCentersListResponse {
  centers: HDCenterInfo[]
  count: number
}

export interface HDTypesListResponse {
  types: HDTypeInfo[]
  count: number
}

// Interpretation response types
export interface HDTypeInterpretationResponse {
  type: string
  interpretation: string
}

export interface HDProfileInterpretationResponse {
  profile: string
  interpretation: string
}

export interface HDChannelInterpretationResponse {
  channel_id: string
  interpretation: string
}

export interface HDGateInterpretationResponse {
  gate: number
  interpretation: string
}

export interface HDFullReadingResponse {
  birth_data_id: string
  reading: string
  sections: {
    type_strategy: string
    authority: string
    profile: string
    definition: string
    channels: string
    incarnation_cross: string
    centers: string
    variables?: string
  }
}

// ==================== API Functions ====================

/**
 * Transform backend response to normalized frontend format
 */
function transformChartResponse(data: HDChartResponse): HDChartResponse {
  // Add type alias for hd_type
  const transformed: HDChartResponse = {
    ...data,
    type: data.hd_type,
  }

  // Convert personality_activations dict to array if needed
  if (data.personality_activations && !Array.isArray(data.personality_activations)) {
    transformed.personality_activations = Object.values(data.personality_activations).map(act => ({
      ...act,
      degree: act.degree_in_sign,
    }))
  }

  // Convert design_activations dict to array if needed
  if (data.design_activations && !Array.isArray(data.design_activations)) {
    transformed.design_activations = Object.values(data.design_activations).map(act => ({
      ...act,
      degree: act.degree_in_sign,
    }))
  }

  // Convert centers dict to array if needed with aliases
  if (data.centers && !Array.isArray(data.centers)) {
    transformed.centers = Object.entries(data.centers).map(([key, value]) => ({
      ...value,
      center: key,
      gates: value.activated_gates,
      active_gates: value.activated_gates,
    }))
  }

  // Add gates tuple to channels
  if (Array.isArray(data.channels)) {
    transformed.channels = data.channels.map(ch => ({
      ...ch,
      gates: [ch.gate1, ch.gate2] as [number, number],
      channel_id: `${ch.gate1}-${ch.gate2}`,
      center_from: ch.center1,
      center_to: ch.center2,
    }))
  }

  return transformed
}

/**
 * Calculate Human Design chart for birth data
 */
export async function calculateHDChart(
  birthDataId: string,
  options: {
    zodiac?: 'tropical' | 'sidereal'
    sidereal_method?: 'shift_positions' | 'shift_wheel'
    ayanamsa?: string
    include_variables?: boolean
  } = {}
): Promise<HDChartResponse> {
  try {
    const params = new URLSearchParams()
    if (options.zodiac) params.append('zodiac', options.zodiac)
    if (options.sidereal_method) params.append('sidereal_method', options.sidereal_method)
    if (options.ayanamsa) params.append('ayanamsa', options.ayanamsa)
    if (options.include_variables !== undefined) {
      params.append('include_variables', String(options.include_variables))
    }

    const url = `/human-design/calculate/${birthDataId}${params.toString() ? '?' + params.toString() : ''}`
    // Use longer timeout for HD calculations (30 seconds)
    const response = await apiClient.get(url, { timeout: 30000 })
    return transformChartResponse(response.data)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Calculate HD chart via POST with full options
 */
export async function calculateHDChartPost(
  birthDataId: string,
  options: {
    zodiac?: 'tropical' | 'sidereal'
    sidereal_method?: 'shift_positions' | 'shift_wheel'
    ayanamsa?: string
    include_variables?: boolean
    custom_design_datetime?: string
  } = {}
): Promise<HDChartResponse> {
  try {
    // Use longer timeout for HD calculations (30 seconds)
    const response = await apiClient.post('/human-design/calculate', {
      birth_data_id: birthDataId,
      ...options
    }, { timeout: 30000 })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// ==================== Reference Data ====================

/**
 * Get list of all 64 gates
 */
export async function getGatesList(): Promise<HDGatesListResponse> {
  try {
    const response = await apiClient.get('/human-design/gates')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// Raw response from backend for gates
interface HDGateInfoRaw {
  number: number
  name: string
  keyword: string
  description: string
  i_ching_name: string
  center: string
  circuit: string | null
  channel_partner: number
  channel_name: string
  line_descriptions: Record<string, string>
}

/**
 * Get info for a specific gate
 * Transforms backend response to frontend format
 */
export async function getGateInfo(gateNumber: number): Promise<HDGateInfo> {
  try {
    const response = await apiClient.get<HDGateInfoRaw>(`/human-design/gates/${gateNumber}`)
    const raw = response.data
    // Transform backend response to frontend format
    return {
      gate: raw.number,
      name: raw.name,
      center: raw.center,
      keynote: raw.keyword,
      description: raw.description || '',
      theme: raw.circuit || '',
      channel_partners: raw.channel_partner ? [raw.channel_partner] : [],
      hexagram_name: raw.i_ching_name,
      // Gene Keys not available from backend yet
      shadow: '',
      gift: '',
      siddhi: '',
      // Additional fields for display
      channel_name: raw.channel_name,
      line_descriptions: raw.line_descriptions,
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get list of all 36 channels
 */
export async function getChannelsList(): Promise<HDChannelsListResponse> {
  try {
    const response = await apiClient.get('/human-design/channels')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get info for a specific channel
 * Transforms backend response (gate1/gate2, center1/center2) to frontend format
 */
export async function getChannelInfo(channelId: string): Promise<HDChannelInfo> {
  try {
    const response = await apiClient.get<HDChannelInfoRaw>(`/human-design/channels/${channelId}`)
    const raw = response.data
    // Transform backend response to frontend format
    return {
      channel_id: `${raw.gate1}-${raw.gate2}`,
      name: raw.name,
      gates: [raw.gate1, raw.gate2],
      center_from: raw.center1,
      center_to: raw.center2,
      type: raw.circuit,
      keynote: raw.description,
      description: raw.description,
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get list of all 9 centers
 */
export async function getCentersList(): Promise<HDCentersListResponse> {
  try {
    const response = await apiClient.get('/human-design/centers')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get info for a specific center
 */
export async function getCenterInfo(centerName: string): Promise<HDCenterInfo> {
  try {
    const response = await apiClient.get(`/human-design/centers/${centerName}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get list of all HD types
 */
export async function getTypesList(): Promise<HDTypesListResponse> {
  try {
    const response = await apiClient.get('/human-design/types')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get info for a specific type
 */
export async function getTypeInfo(typeName: string): Promise<HDTypeInfo> {
  try {
    const response = await apiClient.get(`/human-design/types/${typeName}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// ==================== AI Interpretations ====================

/**
 * Get AI interpretation for HD type
 */
export async function getTypeInterpretation(
  typeName: string,
  strategy: string,
  signature: string
): Promise<HDTypeInterpretationResponse> {
  try {
    const response = await apiClient.post('/human-design/ai/interpret-type', {
      type: typeName,
      strategy,
      signature
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get AI interpretation for HD profile
 */
export async function getProfileInterpretation(
  profile: string,
  angle: string
): Promise<HDProfileInterpretationResponse> {
  try {
    const response = await apiClient.post('/human-design/ai/interpret-profile', {
      profile,
      angle
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get AI interpretation for HD channel
 */
export async function getChannelInterpretation(
  channelId: string,
  channelName: string,
  keynote: string
): Promise<HDChannelInterpretationResponse> {
  try {
    const response = await apiClient.post('/human-design/ai/interpret-channel', {
      channel_id: channelId,
      name: channelName,
      keynote
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get AI interpretation for HD gate
 */
export async function getGateInterpretation(
  gate: number,
  line: number,
  planet: string,
  isDesign: boolean
): Promise<HDGateInterpretationResponse> {
  try {
    const response = await apiClient.post('/human-design/ai/interpret-gate', {
      gate,
      line,
      planet,
      is_design: isDesign
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get full AI reading for HD chart
 */
export async function getFullHDReading(
  birthDataId: string,
  options: {
    zodiac?: 'tropical' | 'sidereal'
    sidereal_method?: 'shift_positions' | 'shift_wheel'
    ayanamsa?: string
    include_variables?: boolean
  } = {}
): Promise<HDFullReadingResponse> {
  try {
    // Use longer timeout for AI reading generation (60 seconds)
    const response = await apiClient.post('/human-design/ai/full-reading', {
      birth_data_id: birthDataId,
      ...options
    }, { timeout: 60000 })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// ==================== Helper Functions ====================

/**
 * Get display name for HD type
 */
export function getTypeDisplayName(type: string): string {
  const names: Record<string, string> = {
    'generator': 'Generator',
    'manifesting_generator': 'Manifesting Generator',
    'projector': 'Projector',
    'manifestor': 'Manifestor',
    'reflector': 'Reflector'
  }
  return names[type.toLowerCase()] || type
}

/**
 * Get color for HD type
 */
export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'generator': '#E6B800',        // Gold/Yellow
    'manifesting_generator': '#FF6B35', // Orange
    'projector': '#3B82F6',        // Blue
    'manifestor': '#EF4444',       // Red
    'reflector': '#A855F7'         // Purple
  }
  return colors[type.toLowerCase()] || '#6B7280'
}

/**
 * Get center color based on defined state
 */
export function getCenterColor(defined: boolean): string {
  return defined ? '#E6B800' : '#FFFFFF' // Gold if defined, white if undefined
}

/**
 * Get center display name
 */
export function getCenterDisplayName(center: string): string {
  const names: Record<string, string> = {
    'head': 'Head',
    'ajna': 'Ajna',
    'throat': 'Throat',
    'g_center': 'G Center',
    'heart': 'Heart/Ego',
    'sacral': 'Sacral',
    'solar_plexus': 'Solar Plexus',
    'spleen': 'Spleen',
    'root': 'Root'
  }
  return names[center.toLowerCase()] || center
}

/**
 * Get authority display name
 */
export function getAuthorityDisplayName(authority: string): string {
  const names: Record<string, string> = {
    'emotional': 'Emotional/Solar Plexus',
    'sacral': 'Sacral',
    'splenic': 'Splenic',
    'ego_projected': 'Ego Projected',
    'ego_manifested': 'Ego Manifested',
    'self_projected': 'Self-Projected',
    'mental': 'Mental/Environmental',
    'lunar': 'Lunar',
    'none': 'No Authority'
  }
  return names[authority.toLowerCase()] || authority
}

/**
 * Get definition type display name
 */
export function getDefinitionDisplayName(definition: string): string {
  const names: Record<string, string> = {
    'single': 'Single Definition',
    'split': 'Split Definition',
    'triple_split': 'Triple Split Definition',
    'quadruple_split': 'Quadruple Split Definition',
    'no_definition': 'No Definition'
  }
  return names[definition.toLowerCase()] || definition
}

/**
 * Format gate with line (e.g., "Gate 1.3")
 */
export function formatGateLine(gate: number, line: number): string {
  return `Gate ${gate}.${line}`
}

/**
 * Get planet symbol for HD activations
 */
export function getPlanetSymbol(planet: string): string {
  const symbols: Record<string, string> = {
    'Sun': '☉',
    'Earth': '⊕',
    'Moon': '☽',
    'North Node': '☊',
    'South Node': '☋',
    'Mercury': '☿',
    'Venus': '♀',
    'Mars': '♂',
    'Jupiter': '♃',
    'Saturn': '♄',
    'Uranus': '♅',
    'Neptune': '♆',
    'Pluto': '♇'
  }
  return symbols[planet] || planet
}

/**
 * Get variable arrow meaning
 */
export function getVariableArrowMeaning(position: string, arrow: string): string {
  const meanings: Record<string, Record<string, string>> = {
    'determination': {
      'left': 'Active/Strategic eating',
      'right': 'Passive/Receptive eating'
    },
    'environment': {
      'left': 'Active environment selection',
      'right': 'Passive environment recognition'
    },
    'perspective': {
      'left': 'Focused/Active perception',
      'right': 'Peripheral/Passive perception'
    },
    'awareness': {
      'left': 'Strategic awareness',
      'right': 'Receptive awareness'
    }
  }
  return meanings[position]?.[arrow] || `${arrow} arrow`
}

/**
 * Check if gate pair forms a channel
 */
export function formsChannel(gate1: number, gate2: number, channels: ChannelDefinition[]): boolean {
  return channels.some(ch => {
    const gates = ch.gates || (ch.gate1 !== undefined && ch.gate2 !== undefined ? [ch.gate1, ch.gate2] : null)
    if (!gates) return false
    return (gates[0] === gate1 && gates[1] === gate2) ||
           (gates[0] === gate2 && gates[1] === gate1)
  })
}

/**
 * Get all gates for a center
 */
export function getGatesForCenter(centerName: string, centers: CenterDefinition[]): number[] {
  const center = centers.find(c => {
    const name = c.center || c.name || ''
    return name.toLowerCase() === centerName.toLowerCase()
  })
  return center?.gates || center?.active_gates || center?.activated_gates || []
}

/**
 * Calculate percentage of centers defined
 */
export function getDefinitionPercentage(centers: CenterDefinition[]): number {
  const defined = centers.filter(c => c.defined).length
  return Math.round((defined / centers.length) * 100)
}
