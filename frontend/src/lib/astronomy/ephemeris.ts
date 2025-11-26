/**
 * Ephemeris calculations using astronomy-engine
 * Provides high-precision planetary positions accurate to ±1 arcminute
 * Based on VSOP87 and NOVAS C 3.1, tested against JPL Horizons
 */

import * as Astronomy from 'astronomy-engine'

/**
 * Planet position in 3D space with ecliptic longitude
 */
export interface PlanetPosition {
  x: number // AU
  y: number // AU
  z: number // AU
  angle: number // Ecliptic longitude in degrees (0-360)
}

/**
 * Map our planet names to astronomy-engine body names
 */
const BODY_MAP: Record<string, Astronomy.Body> = {
  sun: 'Sun' as Astronomy.Body,
  mercury: 'Mercury' as Astronomy.Body,
  venus: 'Venus' as Astronomy.Body,
  earth: 'Earth' as Astronomy.Body,
  mars: 'Mars' as Astronomy.Body,
  jupiter: 'Jupiter' as Astronomy.Body,
  saturn: 'Saturn' as Astronomy.Body,
  uranus: 'Uranus' as Astronomy.Body,
  neptune: 'Neptune' as Astronomy.Body,
  pluto: 'Pluto' as Astronomy.Body,
  moon: 'Moon' as Astronomy.Body,
}

/**
 * Calculate accurate planet position at a given Julian Day
 * Returns heliocentric position (Sun at origin)
 */
export function calculateHeliocentricPosition(
  planetName: string,
  julianDay: number
): PlanetPosition {
  const body = BODY_MAP[planetName]
  if (!body) {
    throw new Error(`Unknown planet: ${planetName}`)
  }

  // Convert Julian Day to astronomy-engine Date
  // astronomy-engine uses UT1 time, Julian Day is similar enough for our purposes
  const date = jdToDate(julianDay)

  // Get heliocentric position
  const helioVector = Astronomy.HelioVector(body, date)

  // Convert to ecliptic coordinates
  const ecliptic = Astronomy.Ecliptic(helioVector)

  // Calculate ecliptic longitude (0-360 degrees)
  let longitude = ecliptic.elon
  if (longitude < 0) longitude += 360
  if (longitude >= 360) longitude -= 360

  // Debug logging for position verification
  if (planetName === 'pluto' || planetName === 'mercury') {
    console.log(`[Ephemeris] ${planetName} @ JD ${julianDay.toFixed(2)}: longitude = ${longitude.toFixed(2)}°, ` +
                `zodiac = ${getZodiacSignName(longitude)}`)
  }

  // Convert from astronomy-engine coordinates (X-Y ecliptic, Z north)
  // to Three.js coordinates (X-Z ecliptic, Y up)
  return {
    x: helioVector.x,
    y: helioVector.z,  // Z becomes Y (up)
    z: helioVector.y,  // Y becomes Z (horizontal)
    angle: longitude,
  }
}

function getZodiacSignName(longitude: number): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  const index = Math.floor(longitude / 30)
  const degree = longitude % 30
  return `${signs[index]} ${degree.toFixed(1)}°`
}

/**
 * Calculate accurate planet position from Earth's perspective (geocentric)
 * Returns geocentric position (Earth at origin)
 */
export function calculateGeocentricPosition(
  planetName: string,
  julianDay: number
): PlanetPosition {
  const body = BODY_MAP[planetName]
  if (!body) {
    throw new Error(`Unknown planet: ${planetName}`)
  }

  const date = jdToDate(julianDay)

  // Special case: Earth is at origin in geocentric frame
  if (planetName === 'earth') {
    return { x: 0, y: 0, z: 0, angle: 0 }
  }

  // Special case: Sun position is negative of Earth's heliocentric position
  if (planetName === 'sun') {
    const earthHelio = Astronomy.HelioVector('Earth' as Astronomy.Body, date)
    const sunVector = new Astronomy.Vector(-earthHelio.x, -earthHelio.y, -earthHelio.z, earthHelio.t)
    const ecliptic = Astronomy.Ecliptic(sunVector)

    let longitude = ecliptic.elon
    if (longitude < 0) longitude += 360
    if (longitude >= 360) longitude -= 360

    // Convert from astronomy-engine coordinates to Three.js coordinates
    return {
      x: -earthHelio.x,
      y: -earthHelio.z,  // Z becomes Y (up)
      z: -earthHelio.y,  // Y becomes Z (horizontal)
      angle: longitude,
    }
  }

  // Get geocentric position for other planets
  const geoVector = Astronomy.GeoVector(body, date, true) // true = aberration corrected

  // Convert to ecliptic coordinates
  const ecliptic = Astronomy.Ecliptic(geoVector)

  // Calculate ecliptic longitude (0-360 degrees)
  let longitude = ecliptic.elon
  if (longitude < 0) longitude += 360
  if (longitude >= 360) longitude -= 360

  // Debug logging for geocentric position verification
  console.log(`[Geocentric] ${planetName} @ JD ${julianDay.toFixed(2)}: longitude = ${longitude.toFixed(2)}°, ` +
              `zodiac = ${getZodiacSignName(longitude)}`)

  // Convert from astronomy-engine coordinates (X-Y ecliptic, Z north)
  // to Three.js coordinates (X-Z ecliptic, Y up)
  // Project onto ecliptic plane (y=0 in Three.js coords) for visualization
  return {
    x: geoVector.x,
    y: 0,  // Project onto ecliptic plane (no elevation)
    z: geoVector.y,  // astronomy-engine's Y becomes Three.js Z
    angle: longitude,
  }
}

/**
 * Check if a planet is in retrograde motion
 * Uses velocity-based detection for accuracy
 */
export function isPlanetRetrograde(planetName: string, julianDay: number): boolean {
  const body = BODY_MAP[planetName]
  if (!body) {
    throw new Error(`Unknown planet: ${planetName}`)
  }

  // Earth doesn't appear retrograde from Earth's perspective
  if (planetName === 'earth') {
    return false
  }

  const _date = jdToDate(julianDay)

  // Get current and future geocentric positions to calculate velocity
  const currentPos = calculateGeocentricPosition(planetName, julianDay)
  const futurePos = calculateGeocentricPosition(planetName, julianDay + 1)

  // Calculate angular velocity (change in ecliptic longitude per day)
  let angleDiff = futurePos.angle - currentPos.angle

  // Handle 360° wrap-around
  if (angleDiff > 180) angleDiff -= 360
  if (angleDiff < -180) angleDiff += 360

  // Negative angular velocity means retrograde motion
  return angleDiff < 0
}

/**
 * Convert Julian Day to JavaScript Date
 * astronomy-engine expects standard JS Date objects
 */
function jdToDate(julianDay: number): Date {
  // Julian Day 0 is noon on January 1, 4713 BC (proleptic Julian calendar)
  // Unix epoch (Jan 1, 1970 00:00 UTC) is JD 2440587.5
  const unixEpochJD = 2440587.5
  const millisPerDay = 86400000

  const unixTimestamp = (julianDay - unixEpochJD) * millisPerDay
  const date = new Date(unixTimestamp)

  // Debug logging
  console.log(`[jdToDate] JD ${julianDay.toFixed(2)} → ${date.toISOString()} (${date.toUTCString()})`)

  return date
}

/**
 * Calculate all geocentric planet positions at once
 * Optimized for rendering all planets in a scene
 */
export function calculateAllGeocentricPositions(
  julianDay: number
): Record<string, PlanetPosition> {
  const positions: Record<string, PlanetPosition> = {}
  const planetNames = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

  for (const name of planetNames) {
    positions[name] = calculateGeocentricPosition(name, julianDay)
  }

  return positions
}

/**
 * Get retrograde status for all planets
 */
export function getAllRetrogradeStatus(julianDay: number): Record<string, boolean> {
  const status: Record<string, boolean> = {}
  const planetNames = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

  for (const name of planetNames) {
    status[name] = isPlanetRetrograde(name, julianDay)
  }

  // Earth doesn't retrograde
  status.earth = false

  return status
}
