/**
 * Constants for the Human Design Body Graph
 */

// Color palette - cosmic purple theme
export const COLORS = {
  // Center colors
  definedFill: '#F59E0B',        // Amber/gold
  definedStroke: '#FCD34D',      // Light gold
  undefinedFill: 'transparent',
  undefinedStroke: '#6366F1',    // Indigo

  // Gate colors
  personalityGate: '#EF4444',    // Red
  designGate: '#6366F1',         // Indigo/blue
  bothGate: '#F59E0B',           // Gold
  inactiveGateFill: '#1F2937',   // Dark gray
  inactiveGateStroke: '#4B5563', // Medium gray
  gateText: '#FFFFFF',
  gateTextInactive: '#9CA3AF',

  // Channel colors
  personalityChannel: '#EF4444',
  designChannel: '#6366F1',
  bothChannel: '#F59E0B',
  inactiveChannel: '#374151',

  // Background
  silhouette: '#4338CA',
}

// Default sizes
export const SIZES = {
  gateCircle: 10,        // Increased from 7 for better readability
  gateCircleSmall: 8,    // Increased from 6
  gateFont: 8,           // Increased from 6 for legibility
  gateFontSmall: 7,      // Increased from 5
  centerStroke: 2,
  channelStroke: 3,
  channelStrokeInactive: 1.5,
}

// Center positions in the main body graph (360x600 viewbox)
// Traditional Human Design layout matching reference image
export const CENTER_POSITIONS = {
  head: { x: 180, y: 50 },
  ajna: { x: 180, y: 115 },
  throat: { x: 180, y: 200 },
  g_center: { x: 180, y: 310 },
  heart: { x: 260, y: 280 },     // Right side, between Throat and G Center
  spleen: { x: 70, y: 410 },     // Left side pill shape
  sacral: { x: 180, y: 430 },
  solar_plexus: { x: 290, y: 410 },  // Right side pill shape, mirrors Spleen
  root: { x: 180, y: 540 },
}

// All 36 channel definitions
export const CHANNELS: Array<{
  id: string
  gates: [number, number]
  centers: [string, string]
}> = [
  // Head to Ajna (3 channels)
  { id: '64-47', gates: [64, 47], centers: ['head', 'ajna'] },
  { id: '61-24', gates: [61, 24], centers: ['head', 'ajna'] },
  { id: '63-4', gates: [63, 4], centers: ['head', 'ajna'] },

  // Ajna to Throat (3 channels)
  { id: '17-62', gates: [17, 62], centers: ['ajna', 'throat'] },
  { id: '43-23', gates: [43, 23], centers: ['ajna', 'throat'] },
  { id: '11-56', gates: [11, 56], centers: ['ajna', 'throat'] },

  // Throat to G Center (4 channels)
  { id: '31-7', gates: [31, 7], centers: ['throat', 'g_center'] },
  { id: '8-1', gates: [8, 1], centers: ['throat', 'g_center'] },
  { id: '33-13', gates: [33, 13], centers: ['throat', 'g_center'] },
  { id: '20-10', gates: [20, 10], centers: ['throat', 'g_center'] },

  // Throat to Heart (1 channel)
  { id: '45-21', gates: [45, 21], centers: ['throat', 'heart'] },

  // Throat to Solar Plexus (2 channels)
  { id: '35-36', gates: [35, 36], centers: ['throat', 'solar_plexus'] },
  { id: '12-22', gates: [12, 22], centers: ['throat', 'solar_plexus'] },

  // Throat to Spleen (2 channels)
  { id: '16-48', gates: [16, 48], centers: ['throat', 'spleen'] },
  { id: '20-57', gates: [20, 57], centers: ['throat', 'spleen'] },

  // Throat to Sacral (1 channel)
  { id: '20-34', gates: [20, 34], centers: ['throat', 'sacral'] },

  // G Center to Heart (1 channel)
  { id: '25-51', gates: [25, 51], centers: ['g_center', 'heart'] },

  // G Center to Spleen (1 channel)
  { id: '10-57', gates: [10, 57], centers: ['g_center', 'spleen'] },

  // G Center to Sacral (3 channels)
  { id: '15-5', gates: [15, 5], centers: ['g_center', 'sacral'] },
  { id: '2-14', gates: [2, 14], centers: ['g_center', 'sacral'] },
  { id: '46-29', gates: [46, 29], centers: ['g_center', 'sacral'] },

  // Heart to Spleen (1 channel)
  { id: '26-44', gates: [26, 44], centers: ['heart', 'spleen'] },

  // Heart to Solar Plexus (1 channel)
  { id: '40-37', gates: [40, 37], centers: ['heart', 'solar_plexus'] },

  // Sacral to Spleen (2 channels)
  { id: '27-50', gates: [27, 50], centers: ['sacral', 'spleen'] },
  { id: '34-57', gates: [34, 57], centers: ['sacral', 'spleen'] },

  // Sacral to Solar Plexus (1 channel)
  { id: '59-6', gates: [59, 6], centers: ['sacral', 'solar_plexus'] },

  // Sacral to Root (3 channels)
  { id: '42-53', gates: [42, 53], centers: ['sacral', 'root'] },
  { id: '3-60', gates: [3, 60], centers: ['sacral', 'root'] },
  { id: '9-52', gates: [9, 52], centers: ['sacral', 'root'] },

  // Spleen to Root (3 channels)
  { id: '28-38', gates: [28, 38], centers: ['spleen', 'root'] },
  { id: '18-58', gates: [18, 58], centers: ['spleen', 'root'] },
  { id: '32-54', gates: [32, 54], centers: ['spleen', 'root'] },

  // Solar Plexus to Root (3 channels)
  { id: '41-30', gates: [41, 30], centers: ['solar_plexus', 'root'] },
  { id: '39-55', gates: [39, 55], centers: ['solar_plexus', 'root'] },
  { id: '19-49', gates: [19, 49], centers: ['solar_plexus', 'root'] },
]

// ViewBox dimensions
export const VIEWBOX = {
  width: 360,
  height: 620,
}
