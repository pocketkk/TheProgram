/**
 * Unified Celestial Bodies Data
 *
 * This module provides the single source of truth for all celestial bodies in the
 * solar system visualization. It consolidates planetary data, satellites, and the Sun
 * into a unified array using the CelestialBodyData interface.
 *
 * ## Architecture
 *
 * The data is constructed using factory functions that convert legacy planetary data
 * into the new unified format:
 * - `createSunBodyData()` - Creates the Sun with emissive properties
 * - `createPlanetBodyData()` - Creates planets from legacy PLANETS data
 * - `createSatelliteBodyData()` - Creates satellites (Moon, etc.)
 * - `withRings()` - Adds ring systems to gas giants
 *
 * ## Data Sources
 *
 * Orbital elements and physical properties are sourced from:
 * - **NASA JPL Solar System Dynamics** - Planetary orbital elements
 * - **NASA Planetary Fact Sheets** - Physical properties (radius, mass, etc.)
 * - **IAU Standards** - Astrological symbols and conventions
 *
 * Reference epoch: J2000.0 (January 1, 2000, 12:00 TT)
 *
 * ## Adding a New Body
 *
 * To add a new celestial body to the visualization:
 *
 * ```typescript
 * // 1. Add to legacy PLANETS object (if planet) or SATELLITES object
 * // 2. Create body using factory function
 * const newPlanet: CelestialBodyData = {
 *   ...createPlanetBodyData('id', 'Name', PLANETS.newPlanet),
 *   symbol: PLANETS.newPlanet.symbol,
 *   ...getPlanetMaterialProperties('id'),
 *   // Add any additional properties
 * }
 *
 * // 3. Add to celestialBodies array in orbital order
 * export const celestialBodies: CelestialBodyData[] = [
 *   sun,
 *   mercury,
 *   // ... existing bodies
 *   newPlanet,  // Insert in correct orbital order
 * ]
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { celestialBodies, getCelestialBody, getPlanets } from './data/celestialBodies'
 *
 * // Get all bodies
 * celestialBodies.forEach(body => console.log(body.name))
 *
 * // Get specific body
 * const earth = getCelestialBody('earth')
 *
 * // Get only planets (excluding Sun and satellites)
 * const planets = getPlanets()
 * ```
 *
 * @module celestialBodies
 */

import type { CelestialBodyData } from '../types'
import {
  SATURN_RINGS,
  JUPITER_RINGS,
  URANUS_RINGS,
  createPlanetBodyData,
  createSunBodyData,
  createSatelliteBodyData,
  withRings,
  getPlanetMaterialProperties,
} from '../utils'
import { PLANETS, SATELLITES } from '@/lib/astronomy/planetaryData'
import {
  MERCURY_ELEMENTS,
  VENUS_ELEMENTS,
  EARTH_ELEMENTS,
  MARS_ELEMENTS,
  JUPITER_ELEMENTS,
  SATURN_ELEMENTS,
  URANUS_ELEMENTS,
  NEPTUNE_ELEMENTS,
  PLUTO_ELEMENTS,
  MOON_ELEMENTS,
} from './orbitalElements'

/**
 * The Sun - our star at the center of the solar system
 */
const sun: CelestialBodyData = createSunBodyData()

/**
 * Mercury - smallest planet, closest to the Sun
 * Orbital elements from NASA JPL (J2000.0 epoch)
 * @see https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const mercury: CelestialBodyData = {
  ...createPlanetBodyData('mercury', 'Mercury', PLANETS.mercury),
  symbol: PLANETS.mercury.symbol,
  ...getPlanetMaterialProperties('mercury'),
  meanLongitudeJ2000: PLANETS.mercury.meanLongitudeJ2000,
  longitudeOfPerihelion: PLANETS.mercury.longitudeOfPerihelion,
  // Keplerian orbital elements (J2000.0 epoch)
  semiMajorAxis: MERCURY_ELEMENTS.semiMajorAxis,
  eccentricity: MERCURY_ELEMENTS.eccentricity,
  inclination: MERCURY_ELEMENTS.inclination,
  longitudeOfAscendingNode: MERCURY_ELEMENTS.longitudeOfAscendingNode,
  argumentOfPeriapsis: MERCURY_ELEMENTS.argumentOfPeriapsis,
  meanLongitudeAtEpoch: MERCURY_ELEMENTS.meanLongitudeAtEpoch,
}

/**
 * Venus - hottest planet with thick atmosphere
 * Orbital elements from NASA JPL (J2000.0 epoch)
 * @see https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const venus: CelestialBodyData = {
  ...createPlanetBodyData('venus', 'Venus', PLANETS.venus),
  symbol: PLANETS.venus.symbol,
  ...getPlanetMaterialProperties('venus'),
  meanLongitudeJ2000: PLANETS.venus.meanLongitudeJ2000,
  longitudeOfPerihelion: PLANETS.venus.longitudeOfPerihelion,
  // Keplerian orbital elements (J2000.0 epoch)
  semiMajorAxis: VENUS_ELEMENTS.semiMajorAxis,
  eccentricity: VENUS_ELEMENTS.eccentricity,
  inclination: VENUS_ELEMENTS.inclination,
  longitudeOfAscendingNode: VENUS_ELEMENTS.longitudeOfAscendingNode,
  argumentOfPeriapsis: VENUS_ELEMENTS.argumentOfPeriapsis,
  meanLongitudeAtEpoch: VENUS_ELEMENTS.meanLongitudeAtEpoch,
}

/**
 * Earth - our home planet
 * Orbital elements from NASA JPL (J2000.0 epoch)
 * Note: Represents Earth-Moon barycenter
 * @see https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const earth: CelestialBodyData = {
  ...createPlanetBodyData('earth', 'Earth', PLANETS.earth),
  symbol: PLANETS.earth.symbol,
  ...getPlanetMaterialProperties('earth'),
  meanLongitudeJ2000: PLANETS.earth.meanLongitudeJ2000,
  longitudeOfPerihelion: PLANETS.earth.longitudeOfPerihelion,
  // Keplerian orbital elements (J2000.0 epoch)
  semiMajorAxis: EARTH_ELEMENTS.semiMajorAxis,
  eccentricity: EARTH_ELEMENTS.eccentricity,
  inclination: EARTH_ELEMENTS.inclination,
  longitudeOfAscendingNode: EARTH_ELEMENTS.longitudeOfAscendingNode,
  argumentOfPeriapsis: EARTH_ELEMENTS.argumentOfPeriapsis,
  meanLongitudeAtEpoch: EARTH_ELEMENTS.meanLongitudeAtEpoch,
}

/**
 * Mars - the red planet
 * Orbital elements from NASA JPL (J2000.0 epoch)
 * @see https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const mars: CelestialBodyData = {
  ...createPlanetBodyData('mars', 'Mars', PLANETS.mars),
  symbol: PLANETS.mars.symbol,
  ...getPlanetMaterialProperties('mars'),
  meanLongitudeJ2000: PLANETS.mars.meanLongitudeJ2000,
  longitudeOfPerihelion: PLANETS.mars.longitudeOfPerihelion,
  // Keplerian orbital elements (J2000.0 epoch)
  semiMajorAxis: MARS_ELEMENTS.semiMajorAxis,
  eccentricity: MARS_ELEMENTS.eccentricity,
  inclination: MARS_ELEMENTS.inclination,
  longitudeOfAscendingNode: MARS_ELEMENTS.longitudeOfAscendingNode,
  argumentOfPeriapsis: MARS_ELEMENTS.argumentOfPeriapsis,
  meanLongitudeAtEpoch: MARS_ELEMENTS.meanLongitudeAtEpoch,
}

/**
 * Jupiter - largest planet with faint rings
 * Orbital elements from NASA JPL (J2000.0 epoch)
 * @see https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const jupiter: CelestialBodyData = withRings(
  {
    ...createPlanetBodyData('jupiter', 'Jupiter', PLANETS.jupiter),
    symbol: PLANETS.jupiter.symbol,
    ...getPlanetMaterialProperties('jupiter'),
    meanLongitudeJ2000: PLANETS.jupiter.meanLongitudeJ2000,
    longitudeOfPerihelion: PLANETS.jupiter.longitudeOfPerihelion,
    // Keplerian orbital elements (J2000.0 epoch)
    semiMajorAxis: JUPITER_ELEMENTS.semiMajorAxis,
    eccentricity: JUPITER_ELEMENTS.eccentricity,
    inclination: JUPITER_ELEMENTS.inclination,
    longitudeOfAscendingNode: JUPITER_ELEMENTS.longitudeOfAscendingNode,
    argumentOfPeriapsis: JUPITER_ELEMENTS.argumentOfPeriapsis,
    meanLongitudeAtEpoch: JUPITER_ELEMENTS.meanLongitudeAtEpoch,
  },
  JUPITER_RINGS
)

/**
 * Saturn - famous for its spectacular ring system
 * Orbital elements from NASA JPL (J2000.0 epoch)
 * Note: Lower accuracy due to long orbital period
 * @see https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const saturn: CelestialBodyData = withRings(
  {
    ...createPlanetBodyData('saturn', 'Saturn', PLANETS.saturn),
    symbol: PLANETS.saturn.symbol,
    ...getPlanetMaterialProperties('saturn'),
    meanLongitudeJ2000: PLANETS.saturn.meanLongitudeJ2000,
    longitudeOfPerihelion: PLANETS.saturn.longitudeOfPerihelion,
    // Keplerian orbital elements (J2000.0 epoch)
    semiMajorAxis: SATURN_ELEMENTS.semiMajorAxis,
    eccentricity: SATURN_ELEMENTS.eccentricity,
    inclination: SATURN_ELEMENTS.inclination,
    longitudeOfAscendingNode: SATURN_ELEMENTS.longitudeOfAscendingNode,
    argumentOfPeriapsis: SATURN_ELEMENTS.argumentOfPeriapsis,
    meanLongitudeAtEpoch: SATURN_ELEMENTS.meanLongitudeAtEpoch,
  },
  SATURN_RINGS
)

/**
 * Uranus - ice giant with dark rings
 * Orbital elements from NASA Uranus Fact Sheet (J2000.0 epoch)
 * Note: Includes long-period perturbations with Neptune
 * @see https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html
 */
const uranus: CelestialBodyData = withRings(
  {
    ...createPlanetBodyData('uranus', 'Uranus', PLANETS.uranus),
    symbol: PLANETS.uranus.symbol,
    ...getPlanetMaterialProperties('uranus'),
    meanLongitudeJ2000: PLANETS.uranus.meanLongitudeJ2000,
    longitudeOfPerihelion: PLANETS.uranus.longitudeOfPerihelion,
    // Keplerian orbital elements (J2000.0 epoch)
    semiMajorAxis: URANUS_ELEMENTS.semiMajorAxis,
    eccentricity: URANUS_ELEMENTS.eccentricity,
    inclination: URANUS_ELEMENTS.inclination,
    longitudeOfAscendingNode: URANUS_ELEMENTS.longitudeOfAscendingNode,
    argumentOfPeriapsis: URANUS_ELEMENTS.argumentOfPeriapsis,
    meanLongitudeAtEpoch: URANUS_ELEMENTS.meanLongitudeAtEpoch,
  },
  URANUS_RINGS
)

/**
 * Neptune - outermost ice giant
 * Orbital elements from NASA Neptune Fact Sheet (J2000.0 epoch)
 * Note: Includes long-period perturbations with Uranus
 * @see https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html
 */
const neptune: CelestialBodyData = {
  ...createPlanetBodyData('neptune', 'Neptune', PLANETS.neptune),
  symbol: PLANETS.neptune.symbol,
  ...getPlanetMaterialProperties('neptune'),
  meanLongitudeJ2000: PLANETS.neptune.meanLongitudeJ2000,
  longitudeOfPerihelion: PLANETS.neptune.longitudeOfPerihelion,
  // Keplerian orbital elements (J2000.0 epoch)
  semiMajorAxis: NEPTUNE_ELEMENTS.semiMajorAxis,
  eccentricity: NEPTUNE_ELEMENTS.eccentricity,
  inclination: NEPTUNE_ELEMENTS.inclination,
  longitudeOfAscendingNode: NEPTUNE_ELEMENTS.longitudeOfAscendingNode,
  argumentOfPeriapsis: NEPTUNE_ELEMENTS.argumentOfPeriapsis,
  meanLongitudeAtEpoch: NEPTUNE_ELEMENTS.meanLongitudeAtEpoch,
}

/**
 * Pluto - dwarf planet with eccentric orbit
 * Orbital elements from NASA Pluto Fact Sheet (J2000.0 epoch)
 * Note: High eccentricity (0.249) causes orbit to cross Neptune's
 * @see https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html
 */
const pluto: CelestialBodyData = {
  id: 'pluto',
  name: 'Pluto',
  type: 'planet', // Keeping as 'planet' for rendering purposes
  symbol: PLANETS.pluto.symbol,
  color: PLANETS.pluto.color,
  radius: PLANETS.pluto.radius,
  orbitRadius: PLANETS.pluto.orbitRadius,
  orbitPeriod: PLANETS.pluto.orbitPeriod,
  rotationPeriod: PLANETS.pluto.rotationPeriod,
  materialType: 'standard',
  roughness: 0.9,
  metalness: 0.1,
  emissiveIntensity: 0.05,
  zodiacEnabled: true,
  retrogradeEnabled: true,
  meanLongitudeJ2000: PLANETS.pluto.meanLongitudeJ2000,
  longitudeOfPerihelion: PLANETS.pluto.longitudeOfPerihelion,
  // Keplerian orbital elements (J2000.0 epoch)
  semiMajorAxis: PLUTO_ELEMENTS.semiMajorAxis,
  eccentricity: PLUTO_ELEMENTS.eccentricity,
  inclination: PLUTO_ELEMENTS.inclination,
  longitudeOfAscendingNode: PLUTO_ELEMENTS.longitudeOfAscendingNode,
  argumentOfPeriapsis: PLUTO_ELEMENTS.argumentOfPeriapsis,
  meanLongitudeAtEpoch: PLUTO_ELEMENTS.meanLongitudeAtEpoch,
}

/**
 * Moon - Earth's natural satellite
 * Orbital elements relative to Earth (J2000.0 epoch)
 * Note: Lunar orbit varies due to solar perturbations
 * @see NASA eclipse documentation and lunar theory
 */
const moon: CelestialBodyData = {
  ...createSatelliteBodyData('moon', 'Moon', 'earth', SATELLITES.moon),
  symbol: SATELLITES.moon.symbol,
  roughness: 0.95,
  metalness: 0.05,
  emissiveIntensity: 0.03,
  // Keplerian orbital elements (relative to Earth, J2000.0 epoch)
  semiMajorAxis: MOON_ELEMENTS.semiMajorAxis,
  eccentricity: MOON_ELEMENTS.eccentricity,
  inclination: MOON_ELEMENTS.inclination,
  longitudeOfAscendingNode: MOON_ELEMENTS.longitudeOfAscendingNode,
  argumentOfPeriapsis: MOON_ELEMENTS.argumentOfPeriapsis,
  meanLongitudeAtEpoch: MOON_ELEMENTS.meanLongitudeAtEpoch,
}

/**
 * Unified array of all celestial bodies in the solar system
 * Ordered from closest to farthest from the Sun
 */
export const celestialBodies: CelestialBodyData[] = [
  sun,
  mercury,
  venus,
  earth,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune,
  pluto,
  moon,
]

/**
 * Lookup map for quick O(1) access by ID
 *
 * Pre-computed dictionary mapping body IDs to their data objects.
 * Use this for performance-critical lookups instead of searching the array.
 *
 * @example
 * ```typescript
 * const mars = celestialBodiesById['mars']
 * ```
 */
export const celestialBodiesById: Record<string, CelestialBodyData> =
  celestialBodies.reduce((acc, body) => {
    acc[body.id] = body
    return acc
  }, {} as Record<string, CelestialBodyData>)

/**
 * Get celestial body by ID
 *
 * Retrieves a body's data from the lookup map. Preferred method for
 * accessing individual bodies by ID.
 *
 * @param id - Body identifier (e.g., 'earth', 'mars', 'moon')
 * @returns Body data if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const jupiter = getCelestialBody('jupiter')
 * if (jupiter) {
 *   console.log(`${jupiter.name} is at ${jupiter.orbitRadius} AU`)
 * }
 * ```
 */
export function getCelestialBody(id: string): CelestialBodyData | undefined {
  return celestialBodiesById[id]
}

/**
 * Get all planets (excluding the Sun and satellites)
 *
 * Returns only bodies classified as 'planet' type, which includes
 * Mercury through Neptune, plus Pluto (kept as planet for rendering).
 *
 * @returns Array of planet bodies in orbital order
 *
 * @example
 * ```typescript
 * const planets = getPlanets()
 * planets.forEach(planet => {
 *   console.log(`${planet.name}: ${planet.orbitPeriod} days`)
 * })
 * ```
 */
export function getPlanets(): CelestialBodyData[] {
  return celestialBodies.filter(body => body.type === 'planet')
}

/**
 * Get all satellites
 *
 * Returns all bodies classified as 'satellite' type (currently just the Moon,
 * but designed to support additional moons in the future).
 *
 * @returns Array of satellite bodies
 */
export function getSatellites(): CelestialBodyData[] {
  return celestialBodies.filter(body => body.type === 'satellite')
}

/**
 * Get satellites for a specific parent body
 *
 * Returns satellites that orbit a given parent body. Useful for displaying
 * a planet's moon system.
 *
 * @param parentId - Parent body ID (e.g., 'earth', 'mars')
 * @returns Array of satellites orbiting the parent
 *
 * @example
 * ```typescript
 * const earthMoons = getSatellitesForBody('earth')  // Returns [moon]
 * const marsMoons = getSatellitesForBody('mars')    // Returns [] (not implemented yet)
 * ```
 */
export function getSatellitesForBody(parentId: string): CelestialBodyData[] {
  return celestialBodies.filter(
    body => body.type === 'satellite' && body.parentId === parentId
  )
}

/**
 * Check if a body has rings
 *
 * Convenience function to check if a body has a ring system.
 *
 * @param id - Body identifier
 * @returns True if body has rings, false otherwise
 *
 * @example
 * ```typescript
 * hasRings('saturn')  // true
 * hasRings('earth')   // false
 * ```
 */
export function hasRings(id: string): boolean {
  const body = getCelestialBody(id)
  return body?.hasRings === true
}

/**
 * Check if a body has zodiac features enabled
 *
 * Determines if a body should display zodiac-related features like
 * ecliptic longitude, zodiac sign determination, and zodiac coloring.
 *
 * @param id - Body identifier
 * @returns True if zodiac features are enabled, false otherwise
 *
 * @example
 * ```typescript
 * hasZodiacEnabled('venus')  // true (planets have zodiac)
 * hasZodiacEnabled('moon')   // false (satellites don't have zodiac)
 * ```
 */
export function hasZodiacEnabled(id: string): boolean {
  const body = getCelestialBody(id)
  return body?.zodiacEnabled === true
}
