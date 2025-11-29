/**
 * Human Design feature types
 */

// Re-export API types
export type {
  GateActivation,
  ChannelDefinition,
  CenterDefinition,
  ProfileInfo,
  IncarnationCross,
  Variables,
  HDChartResponse,
  HDGateInfo,
  HDChannelInfo,
  HDCenterInfo,
  HDTypeInfo,
  HDFullReadingResponse,
} from '@/lib/api/humanDesign'

// UI-specific types

export type HDViewMode = 'bodygraph' | 'activations' | 'channels' | 'reading'

export type SelectionType = 'none' | 'center' | 'gate' | 'channel'

export interface Selection {
  type: SelectionType
  id: string | number | null
  data?: unknown
}

export interface BodyGraphLayout {
  // Center positions (percentage based for responsive)
  centers: {
    [key: string]: { x: number; y: number }
  }
  // SVG viewBox dimensions
  width: number
  height: number
}

// Body graph center positions (anatomically accurate layout)
export const BODYGRAPH_LAYOUT: BodyGraphLayout = {
  width: 340,
  height: 500,
  centers: {
    head: { x: 170, y: 45 },
    ajna: { x: 170, y: 95 },
    throat: { x: 170, y: 155 },
    g_center: { x: 170, y: 225 },
    heart: { x: 115, y: 210 },
    sacral: { x: 170, y: 330 },
    solar_plexus: { x: 230, y: 285 },
    spleen: { x: 110, y: 285 },
    root: { x: 170, y: 420 },
  },
}

// Center shapes for the body graph
export const CENTER_SHAPES: Record<string, 'triangle' | 'square' | 'diamond'> = {
  head: 'triangle',
  ajna: 'triangle',
  throat: 'square',
  g_center: 'diamond',
  heart: 'triangle',
  sacral: 'square',
  solar_plexus: 'triangle',
  spleen: 'triangle',
  root: 'square',
}

// Gate positions around each center (for visualization)
export const GATE_POSITIONS: Record<string, number[]> = {
  head: [64, 61, 63],
  ajna: [47, 24, 4, 17, 43, 11],
  throat: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  g_center: [7, 1, 13, 25, 46, 2, 15, 10],
  heart: [21, 40, 26, 51],
  sacral: [5, 14, 29, 59, 9, 3, 42, 27, 34],
  solar_plexus: [6, 37, 22, 36, 30, 55, 49],
  spleen: [48, 57, 44, 50, 32, 28, 18],
  root: [58, 38, 54, 53, 60, 52, 19, 39, 41],
}

// Channel connections (gate pairs)
export const CHANNEL_CONNECTIONS: Array<{
  id: string
  gates: [number, number]
  centers: [string, string]
}> = [
  // Head to Ajna
  { id: '64-47', gates: [64, 47], centers: ['head', 'ajna'] },
  { id: '61-24', gates: [61, 24], centers: ['head', 'ajna'] },
  { id: '63-4', gates: [63, 4], centers: ['head', 'ajna'] },
  // Ajna to Throat
  { id: '17-62', gates: [17, 62], centers: ['ajna', 'throat'] },
  { id: '43-23', gates: [43, 23], centers: ['ajna', 'throat'] },
  { id: '11-56', gates: [11, 56], centers: ['ajna', 'throat'] },
  // Throat to G Center
  { id: '8-1', gates: [8, 1], centers: ['throat', 'g_center'] },
  { id: '31-7', gates: [31, 7], centers: ['throat', 'g_center'] },
  { id: '33-13', gates: [33, 13], centers: ['throat', 'g_center'] },
  { id: '20-10', gates: [20, 10], centers: ['throat', 'g_center'] },
  // Throat to Heart
  { id: '45-21', gates: [45, 21], centers: ['throat', 'heart'] },
  // Throat to Solar Plexus
  { id: '35-36', gates: [35, 36], centers: ['throat', 'solar_plexus'] },
  { id: '12-22', gates: [12, 22], centers: ['throat', 'solar_plexus'] },
  // Throat to Spleen
  { id: '16-48', gates: [16, 48], centers: ['throat', 'spleen'] },
  { id: '20-57', gates: [20, 57], centers: ['throat', 'spleen'] },
  // Throat to Sacral
  { id: '20-34', gates: [20, 34], centers: ['throat', 'sacral'] },
  // G Center to Heart
  { id: '25-51', gates: [25, 51], centers: ['g_center', 'heart'] },
  // G Center to Sacral
  { id: '15-5', gates: [15, 5], centers: ['g_center', 'sacral'] },
  { id: '2-14', gates: [2, 14], centers: ['g_center', 'sacral'] },
  { id: '46-29', gates: [46, 29], centers: ['g_center', 'sacral'] },
  // G Center to Spleen
  { id: '10-57', gates: [10, 57], centers: ['g_center', 'spleen'] },
  // Heart to Root
  { id: '26-44', gates: [26, 44], centers: ['heart', 'spleen'] },
  { id: '40-37', gates: [40, 37], centers: ['heart', 'solar_plexus'] },
  // Heart to Sacral
  { id: '21-45', gates: [21, 45], centers: ['heart', 'throat'] },
  // Sacral to Solar Plexus
  { id: '59-6', gates: [59, 6], centers: ['sacral', 'solar_plexus'] },
  // Sacral to Spleen
  { id: '27-50', gates: [27, 50], centers: ['sacral', 'spleen'] },
  { id: '34-57', gates: [34, 57], centers: ['sacral', 'spleen'] },
  // Sacral to Root
  { id: '3-60', gates: [3, 60], centers: ['sacral', 'root'] },
  { id: '9-52', gates: [9, 52], centers: ['sacral', 'root'] },
  { id: '42-53', gates: [42, 53], centers: ['sacral', 'root'] },
  { id: '5-15', gates: [5, 15], centers: ['sacral', 'g_center'] },
  // Solar Plexus to Root
  { id: '49-19', gates: [49, 19], centers: ['solar_plexus', 'root'] },
  { id: '55-39', gates: [55, 39], centers: ['solar_plexus', 'root'] },
  { id: '30-41', gates: [30, 41], centers: ['solar_plexus', 'root'] },
  // Spleen to Root
  { id: '54-32', gates: [54, 32], centers: ['spleen', 'root'] },
  { id: '28-38', gates: [28, 38], centers: ['spleen', 'root'] },
  { id: '18-58', gates: [18, 58], centers: ['spleen', 'root'] },
  // Additional channels
  { id: '44-26', gates: [44, 26], centers: ['spleen', 'heart'] },
  { id: '37-40', gates: [37, 40], centers: ['solar_plexus', 'heart'] },
]

// Theme colors
export const HD_COLORS = {
  defined: '#D4AF37',      // Gold for defined centers
  undefined: '#1F2937',    // Dark gray for undefined (with border)
  personality: '#EF4444',  // Red for conscious/personality
  design: '#000000',       // Black for unconscious/design
  both: '#8B5CF6',         // Purple for both activated
  channel: '#D4AF37',      // Gold for channels
  channelInactive: '#374151', // Dark for inactive channels
  background: '#0F172A',   // Deep navy background
  text: '#F8FAFC',         // Light text
  accent: '#3B82F6',       // Blue accent
}
