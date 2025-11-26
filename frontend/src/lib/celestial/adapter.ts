/**
 * Adapter layer for backward compatibility with legacy code
 * Converts new registry format to old formats used elsewhere in the codebase
 */

import { CELESTIAL_BODIES, type CelestialBodyDef } from './registry'

/**
 * Legacy PLANETS format used in @/lib/astrology/types.ts
 * { name: 'Sun', symbol: '☉', color: '#FDB813' }
 */
export interface LegacyPlanetDef {
  name: string
  symbol: string
  color: string
}

/**
 * Get planets in legacy format for backward compatibility with types.ts
 * Includes: luminaries, planets, chiron, lilith (matching original PLANETS array)
 */
export function getLegacyPlanets(): readonly LegacyPlanetDef[] {
  const legacyOrder = [
    'sun', 'earth', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
    'chiron', 'lilith'
  ]

  return legacyOrder
    .map(id => CELESTIAL_BODIES[id])
    .filter((b): b is CelestialBodyDef => b !== undefined)
    .map(b => ({
      name: b.name,
      symbol: b.symbol,
      color: b.color,
    }))
}

/**
 * Export constant for direct replacement of PLANETS in types.ts
 */
export const PLANETS_COMPAT = getLegacyPlanets()

/**
 * Get body by name (case-insensitive) for legacy code that uses names
 */
export function getBodyByName(name: string): CelestialBodyDef | undefined {
  const normalized = name.toLowerCase()
  return Object.values(CELESTIAL_BODIES).find(
    b => b.name.toLowerCase() === normalized || b.id === normalized
  )
}

/**
 * Get color for a planet by name or id
 */
export function getPlanetColor(nameOrId: string): string {
  const body = getBodyByName(nameOrId)
  return body?.color ?? '#FFFFFF'
}

/**
 * Get symbol for a planet by name or id
 */
export function getPlanetSymbol(nameOrId: string): string {
  const body = getBodyByName(nameOrId)
  return body?.symbol ?? '?'
}

/**
 * Check if a body supports retrograde motion
 */
export function canBeRetrograde(nameOrId: string): boolean {
  const body = getBodyByName(nameOrId)
  return body?.supportsRetrograde ?? false
}
