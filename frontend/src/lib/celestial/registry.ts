/**
 * Celestial Body Registry - Single source of truth for all celestial bodies
 * Supports planets, asteroids, fixed stars, and calculated points
 */

export type BodyCategory =
  | 'luminary'        // Sun, Moon
  | 'planet'          // Mercury through Pluto
  | 'asteroid'        // Ceres, Pallas, Juno, Vesta
  | 'centaur'         // Chiron
  | 'node'            // Lunar nodes
  | 'calculated'      // Lilith, Part of Fortune, etc.
  | 'fixed_star'      // Regulus, Spica, etc.
  | 'hypothetical'    // Transpluto, Vulcan, etc.

/**
 * Definition of a celestial body for astrological calculations and display
 */
export interface CelestialBodyDef {
  /** Unique identifier (e.g., 'sun', 'ceres', 'regulus') */
  id: string
  /** Display name (e.g., 'Sun', 'Ceres', 'Regulus') */
  name: string
  /** Unicode symbol (e.g., '☉', '⚳', '★') */
  symbol: string
  /** Body category for grouping and filtering */
  category: BodyCategory
  /** Default display color (hex) */
  color: string
  /** Include in charts by default */
  defaultEnabled: boolean
  /** Can this body appear retrograde */
  supportsRetrograde: boolean
  /** For fixed stars: ecliptic longitude (degrees, J2000) */
  fixedLongitude?: number
  /** Annual precession in arc-seconds (50.3" typical) */
  precessionRate?: number
}

// =============================================================================
// CELESTIAL BODIES REGISTRY
// =============================================================================
// To add a new body, simply add an entry here. No other files need modification.

export const CELESTIAL_BODIES: Record<string, CelestialBodyDef> = {
  // =========================================================================
  // LUMINARIES
  // =========================================================================
  sun: {
    id: 'sun', name: 'Sun', symbol: '☉',
    category: 'luminary', color: '#FDB813',
    defaultEnabled: true, supportsRetrograde: false,
  },
  moon: {
    id: 'moon', name: 'Moon', symbol: '☽',
    category: 'luminary', color: '#C0C0C0',
    defaultEnabled: true, supportsRetrograde: false,
  },

  // =========================================================================
  // PLANETS
  // =========================================================================
  mercury: {
    id: 'mercury', name: 'Mercury', symbol: '☿',
    category: 'planet', color: '#8B7355',
    defaultEnabled: true, supportsRetrograde: true,
  },
  venus: {
    id: 'venus', name: 'Venus', symbol: '♀',
    category: 'planet', color: '#FFC0CB',
    defaultEnabled: true, supportsRetrograde: true,
  },
  earth: {
    id: 'earth', name: 'Earth', symbol: '♁',
    category: 'planet', color: '#4A90E2',
    defaultEnabled: true, supportsRetrograde: false,
  },
  mars: {
    id: 'mars', name: 'Mars', symbol: '♂',
    category: 'planet', color: '#DC143C',
    defaultEnabled: true, supportsRetrograde: true,
  },
  jupiter: {
    id: 'jupiter', name: 'Jupiter', symbol: '♃',
    category: 'planet', color: '#DAA520',
    defaultEnabled: true, supportsRetrograde: true,
  },
  saturn: {
    id: 'saturn', name: 'Saturn', symbol: '♄',
    category: 'planet', color: '#B8860B',
    defaultEnabled: true, supportsRetrograde: true,
  },
  uranus: {
    id: 'uranus', name: 'Uranus', symbol: '♅',
    category: 'planet', color: '#4FD0E0',
    defaultEnabled: true, supportsRetrograde: true,
  },
  neptune: {
    id: 'neptune', name: 'Neptune', symbol: '♆',
    category: 'planet', color: '#4169E1',
    defaultEnabled: true, supportsRetrograde: true,
  },
  pluto: {
    id: 'pluto', name: 'Pluto', symbol: '♇',
    category: 'planet', color: '#8B4513',
    defaultEnabled: true, supportsRetrograde: true,
  },

  // =========================================================================
  // LUNAR NODES
  // =========================================================================
  north_node: {
    id: 'north_node', name: 'North Node', symbol: '☊',
    category: 'node', color: '#9932CC',
    defaultEnabled: true, supportsRetrograde: true,
  },
  south_node: {
    id: 'south_node', name: 'South Node', symbol: '☋',
    category: 'node', color: '#9932CC',
    defaultEnabled: true, supportsRetrograde: true,
  },

  // =========================================================================
  // CENTAURS
  // =========================================================================
  chiron: {
    id: 'chiron', name: 'Chiron', symbol: '⚷',
    category: 'centaur', color: '#9370DB',
    defaultEnabled: true, supportsRetrograde: true,
  },

  // =========================================================================
  // ASTEROIDS (Big 4)
  // =========================================================================
  ceres: {
    id: 'ceres', name: 'Ceres', symbol: '⚳',
    category: 'asteroid', color: '#8B4513',
    defaultEnabled: false, supportsRetrograde: true,
  },
  pallas: {
    id: 'pallas', name: 'Pallas', symbol: '⚴',
    category: 'asteroid', color: '#4682B4',
    defaultEnabled: false, supportsRetrograde: true,
  },
  juno: {
    id: 'juno', name: 'Juno', symbol: '⚵',
    category: 'asteroid', color: '#DA70D6',
    defaultEnabled: false, supportsRetrograde: true,
  },
  vesta: {
    id: 'vesta', name: 'Vesta', symbol: '⚶',
    category: 'asteroid', color: '#FF6347',
    defaultEnabled: false, supportsRetrograde: true,
  },

  // =========================================================================
  // CALCULATED POINTS
  // =========================================================================
  lilith: {
    id: 'lilith', name: 'Lilith', symbol: '⚸',
    category: 'calculated', color: '#8B008B',
    defaultEnabled: true, supportsRetrograde: true,
  },
  lilith_true: {
    id: 'lilith_true', name: 'True Lilith', symbol: '⚸',
    category: 'calculated', color: '#8B008B',
    defaultEnabled: false, supportsRetrograde: true,
  },

  // =========================================================================
  // FIXED STARS (Initial Set)
  // Longitudes are for J2000 epoch, precession rate ~50.3"/year
  // =========================================================================
  regulus: {
    id: 'regulus', name: 'Regulus', symbol: '★',
    category: 'fixed_star', color: '#87CEEB',
    defaultEnabled: false, supportsRetrograde: false,
    fixedLongitude: 149.83, precessionRate: 50.3,
  },
  spica: {
    id: 'spica', name: 'Spica', symbol: '★',
    category: 'fixed_star', color: '#E6E6FA',
    defaultEnabled: false, supportsRetrograde: false,
    fixedLongitude: 203.83, precessionRate: 50.3,
  },
  algol: {
    id: 'algol', name: 'Algol', symbol: '★',
    category: 'fixed_star', color: '#FF0000',
    defaultEnabled: false, supportsRetrograde: false,
    fixedLongitude: 56.17, precessionRate: 50.3,
  },
}

// =============================================================================
// REGISTRY FUNCTIONS
// =============================================================================

/**
 * Get a body by its ID
 */
export function getBody(id: string): CelestialBodyDef | undefined {
  return CELESTIAL_BODIES[id]
}

/**
 * Get all registered bodies
 */
export function getAllBodies(): CelestialBodyDef[] {
  return Object.values(CELESTIAL_BODIES)
}

/**
 * Get all body IDs
 */
export function getAllBodyIds(): string[] {
  return Object.keys(CELESTIAL_BODIES)
}

/**
 * Get bodies enabled by default
 */
export function getDefaultBodies(): CelestialBodyDef[] {
  return Object.values(CELESTIAL_BODIES).filter(b => b.defaultEnabled)
}

/**
 * Get IDs of bodies enabled by default
 */
export function getDefaultBodyIds(): string[] {
  return Object.values(CELESTIAL_BODIES)
    .filter(b => b.defaultEnabled)
    .map(b => b.id)
}

/**
 * Get all bodies in a category
 */
export function getBodiesByCategory(category: BodyCategory): CelestialBodyDef[] {
  return Object.values(CELESTIAL_BODIES).filter(b => b.category === category)
}

/**
 * Get all fixed stars
 */
export function getFixedStars(): CelestialBodyDef[] {
  return getBodiesByCategory('fixed_star')
}

/**
 * Get all asteroids (including centaurs)
 */
export function getAsteroids(): CelestialBodyDef[] {
  const asteroids = getBodiesByCategory('asteroid')
  const centaurs = getBodiesByCategory('centaur')
  return [...asteroids, ...centaurs]
}

/**
 * Get main planets (for traditional chart display)
 * Excludes Earth (geocentric view), includes luminaries
 */
export function getMainPlanets(): CelestialBodyDef[] {
  return Object.values(CELESTIAL_BODIES).filter(b =>
    (b.category === 'luminary' || b.category === 'planet') &&
    b.id !== 'earth' &&
    b.defaultEnabled
  )
}
