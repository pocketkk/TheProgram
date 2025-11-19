/**
 * Planetary Data for Solar System Visualization
 * Based on astronomical data and orbital mechanics
 */

import {
  calculateHeliocentricPosition,
  calculateGeocentricPosition as getGeocentricPos,
  isPlanetRetrograde,
  getAllRetrogradeStatus as getRetrogradeStatuses,
  calculateAllGeocentricPositions as calcAllGeocentricPos,
} from './ephemeris'

export interface PlanetData {
  name: string
  symbol: string
  color: string
  radius: number // relative to Earth (Earth = 1)
  orbitRadius: number // AU (Astronomical Units)
  orbitPeriod: number // Earth days
  rotationPeriod: number // Earth days
  inclination: number // degrees relative to ecliptic
  texture?: string
  glowColor?: string
  hasRings?: boolean
  // J2000 orbital elements for position calculations
  meanLongitudeJ2000?: number // Mean longitude at J2000 epoch (degrees)
  longitudeOfPerihelion?: number // Longitude of perihelion (degrees)
}

// Planetary data with scientifically accurate orbital parameters
export const PLANETS: Record<string, PlanetData> = {
  sun: {
    name: 'Sun',
    symbol: '☉',
    color: '#FDB813',
    radius: 109, // Sun is 109x Earth's radius
    orbitRadius: 0,
    orbitPeriod: 0,
    rotationPeriod: 25.4,
    inclination: 0,
    glowColor: '#FFA500',
  },
  mercury: {
    name: 'Mercury',
    symbol: '☿',
    color: '#8C7853',
    radius: 0.38,
    orbitRadius: 0.39,
    orbitPeriod: 88,
    rotationPeriod: 58.6,
    inclination: 7.0,
    meanLongitudeJ2000: 252.25, // degrees at J2000 epoch
    longitudeOfPerihelion: 77.46, // degrees
  },
  venus: {
    name: 'Venus',
    symbol: '♀',
    color: '#FFC649',
    radius: 0.95,
    orbitRadius: 0.72,
    orbitPeriod: 225,
    rotationPeriod: 243,
    inclination: 3.4,
    meanLongitudeJ2000: 181.98, // degrees at J2000 epoch
    longitudeOfPerihelion: 131.76, // degrees
  },
  earth: {
    name: 'Earth',
    symbol: '♁',
    color: '#4A90E2',
    radius: 1.0,
    orbitRadius: 1.0,
    orbitPeriod: 365.25,
    rotationPeriod: 1,
    inclination: 0,
    meanLongitudeJ2000: 100.47, // degrees at J2000 epoch
    longitudeOfPerihelion: 102.94, // degrees
  },
  mars: {
    name: 'Mars',
    symbol: '♂',
    color: '#E27B58',
    radius: 0.53,
    orbitRadius: 1.52,
    orbitPeriod: 687,
    rotationPeriod: 1.03,
    inclination: 1.85,
    meanLongitudeJ2000: 355.43, // degrees at J2000 epoch
    longitudeOfPerihelion: 336.04, // degrees
  },
  jupiter: {
    name: 'Jupiter',
    symbol: '♃',
    color: '#C88B3A',
    radius: 11.2,
    orbitRadius: 5.2,
    orbitPeriod: 4333,
    rotationPeriod: 0.41,
    inclination: 1.3,
    hasRings: true,
    meanLongitudeJ2000: 34.33, // degrees at J2000 epoch
    longitudeOfPerihelion: 14.27, // degrees
  },
  saturn: {
    name: 'Saturn',
    symbol: '♄',
    color: '#FAD5A5',
    radius: 9.45,
    orbitRadius: 9.54,
    orbitPeriod: 10759,
    rotationPeriod: 0.45,
    inclination: 2.49,
    hasRings: true,
    meanLongitudeJ2000: 50.08, // degrees at J2000 epoch
    longitudeOfPerihelion: 92.86, // degrees
  },
  uranus: {
    name: 'Uranus',
    symbol: '♅',
    color: '#4FD0E7',
    radius: 4.0,
    orbitRadius: 19.19,
    orbitPeriod: 30687,
    rotationPeriod: 0.72,
    inclination: 0.77,
    hasRings: true,
    meanLongitudeJ2000: 314.20, // degrees at J2000 epoch
    longitudeOfPerihelion: 172.43, // degrees
  },
  neptune: {
    name: 'Neptune',
    symbol: '♆',
    color: '#4B70DD',
    radius: 3.88,
    orbitRadius: 30.07,
    orbitPeriod: 60190,
    rotationPeriod: 0.67,
    inclination: 1.77,
    meanLongitudeJ2000: 304.22, // degrees at J2000 epoch
    longitudeOfPerihelion: 46.68, // degrees
  },
  pluto: {
    name: 'Pluto',
    symbol: '♇',
    color: '#A0826D',
    radius: 0.18,
    orbitRadius: 39.5,
    orbitPeriod: 90560, // 248 years
    rotationPeriod: 6.39,
    inclination: 17.16, // Highly inclined orbit
    glowColor: '#C4A57B',
    meanLongitudeJ2000: 238.96, // degrees at J2000 epoch
    longitudeOfPerihelion: 224.17, // degrees
  },
}

// Satellite data (moons and other bodies that orbit planets)
export interface SatelliteData {
  name: string
  symbol: string
  color: string
  radius: number // relative to parent planet
  orbitRadius: number // in parent planet radii (scaled for visibility)
  orbitPeriod: number // Earth days
  rotationPeriod: number // Earth days
  inclination: number // degrees
  glowColor?: string
  parent: string // Which planet this orbits
}

export const SATELLITES: Record<string, SatelliteData> = {
  moon: {
    name: 'Moon',
    symbol: '☽',
    color: '#C0C0C0',
    radius: 0.27, // Moon is 0.27x Earth's radius
    orbitRadius: 2.5, // Very close to Earth - need to zoom in to see clearly
    orbitPeriod: 27.3, // Actual orbital period around Earth
    rotationPeriod: 27.3, // Tidally locked
    inclination: 5.14,
    glowColor: '#E8E8E8',
    parent: 'earth',
  },
}

// Zodiac constellation data
export interface ZodiacSign {
  name: string
  symbol: string
  startDegree: number
  element: 'fire' | 'earth' | 'air' | 'water'
  color: string
  keywords: string[]
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { name: 'Aries', symbol: '♈', startDegree: 0, element: 'fire', color: '#FF6B6B', keywords: ['Pioneer', 'Courage', 'Initiative', 'Leadership'] },
  { name: 'Taurus', symbol: '♉', startDegree: 30, element: 'earth', color: '#8BC34A', keywords: ['Stability', 'Patience', 'Sensuality', 'Security'] },
  { name: 'Gemini', symbol: '♊', startDegree: 60, element: 'air', color: '#FFD93D', keywords: ['Communication', 'Curiosity', 'Adaptability', 'Wit'] },
  { name: 'Cancer', symbol: '♋', startDegree: 90, element: 'water', color: '#C9ADA7', keywords: ['Nurturing', 'Intuition', 'Protection', 'Emotion'] },
  { name: 'Leo', symbol: '♌', startDegree: 120, element: 'fire', color: '#FFA500', keywords: ['Creativity', 'Confidence', 'Generosity', 'Drama'] },
  { name: 'Virgo', symbol: '♍', startDegree: 150, element: 'earth', color: '#98D8C8', keywords: ['Analysis', 'Service', 'Precision', 'Health'] },
  { name: 'Libra', symbol: '♎', startDegree: 180, element: 'air', color: '#FFB6D9', keywords: ['Balance', 'Harmony', 'Justice', 'Partnership'] },
  { name: 'Scorpio', symbol: '♏', startDegree: 210, element: 'water', color: '#8B0000', keywords: ['Transformation', 'Intensity', 'Mystery', 'Power'] },
  { name: 'Sagittarius', symbol: '♐', startDegree: 240, element: 'fire', color: '#9370DB', keywords: ['Adventure', 'Philosophy', 'Optimism', 'Freedom'] },
  { name: 'Capricorn', symbol: '♑', startDegree: 270, element: 'earth', color: '#5F9EA0', keywords: ['Ambition', 'Discipline', 'Structure', 'Achievement'] },
  { name: 'Aquarius', symbol: '♒', startDegree: 300, element: 'air', color: '#00CED1', keywords: ['Innovation', 'Humanitarian', 'Independence', 'Vision'] },
  { name: 'Pisces', symbol: '♓', startDegree: 330, element: 'water', color: '#DDA0DD', keywords: ['Compassion', 'Imagination', 'Spirituality', 'Empathy'] },
]

/**
 * Calculate planet position at a given time using high-precision ephemeris
 * Now powered by astronomy-engine (VSOP87 + NOVAS), accurate to ±1 arcminute
 * Replaces simplified Keplerian calculations with validated astronomical data
 */
export function calculatePlanetPosition(
  planet: PlanetData,
  julianDay: number
): { x: number; y: number; z: number; angle: number } {
  // Get the planet's lowercase name for lookup
  const planetName = planet.name.toLowerCase()

  try {
    // Use heliocentric positions (Sun at origin)
    // This provides the standard orbital view of the solar system
    return calculateHeliocentricPosition(planetName, julianDay)
  } catch (error) {
    console.error(`Error calculating position for ${planet.name}:`, error)
    // Fallback to approximate position using orbit radius
    // This should never happen in production
    return {
      x: planet.orbitRadius,
      y: 0,
      z: 0,
      angle: 0,
    }
  }
}

/**
 * Convert date to Julian Day
 * Supports full precision: hours, minutes, and seconds
 *
 * Julian Day is the continuous count of days since the beginning of
 * the Julian Period (January 1, 4713 BC, noon UTC). The fractional
 * part represents the time of day.
 *
 * @param date - JavaScript Date object (uses local timezone)
 * @returns Julian Day Number with fractional seconds precision
 */
export function dateToJulianDay(date: Date): number {
  // DEBUG: Log what Date we're receiving
  console.log(`[dateToJulianDay] INPUT Date object:`, {
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    utcHours: date.getUTCHours(),
    utcMinutes: date.getUTCMinutes(),
    localHours: date.getHours(),
    localMinutes: date.getMinutes()
  })

  // IMPORTANT: Use UTC methods to avoid timezone conversion issues
  const a = Math.floor((14 - (date.getUTCMonth() + 1)) / 12)
  const y = date.getUTCFullYear() + 4800 - a
  const m = (date.getUTCMonth() + 1) + 12 * a - 3

  // Calculate Julian Day Number (integer part)
  let jdn = date.getUTCDate() + Math.floor((153 * m + 2) / 5) + 365 * y
  jdn += Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045

  // Calculate fractional day from time (with second precision)
  // Julian Day starts at noon (12:00 UTC), so we subtract 12 hours
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  const milliseconds = date.getUTCMilliseconds()

  // Convert time to fractional day:
  // - Hours: (hours - 12) / 24 (offset by 12 for noon start)
  // - Minutes: minutes / 1440 (1440 minutes per day)
  // - Seconds: seconds / 86400 (86400 seconds per day)
  // - Milliseconds: milliseconds / 86400000 (for sub-second precision)
  const dayFraction = (hours - 12) / 24 + minutes / 1440 + seconds / 86400 + milliseconds / 86400000

  const jd = jdn + dayFraction
  console.log(`[dateToJulianDay] OUTPUT JD: ${jd.toFixed(4)}`)

  return jd
}

/**
 * Convert zodiac degree to constellation info
 */
export function getZodiacSign(degree: number): ZodiacSign {
  const normalizedDegree = ((degree % 360) + 360) % 360
  const signIndex = Math.floor(normalizedDegree / 30)
  return ZODIAC_SIGNS[signIndex]
}

/**
 * Detect if a planet is in retrograde motion
 * Now uses velocity-based detection from astronomy-engine for accuracy
 * A planet is retrograde when its geocentric ecliptic longitude is decreasing
 */
export function isRetrograde(planet: PlanetData, julianDay: number): boolean {
  const planetName = planet.name.toLowerCase()

  try {
    return isPlanetRetrograde(planetName, julianDay)
  } catch (error) {
    console.error(`Error calculating retrograde for ${planet.name}:`, error)
    return false
  }
}

/**
 * Calculate retrograde status for all planets
 * Now uses astronomy-engine for accurate retrograde detection
 */
export function getRetrogradeStatus(julianDay: number): Record<string, boolean> {
  try {
    return getRetrogradeStatuses(julianDay)
  } catch (error) {
    console.error('Error calculating retrograde statuses:', error)
    // Fallback to per-planet calculation
    const status: Record<string, boolean> = {}
    const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

    for (const name of planetNames) {
      status[name] = isRetrograde(PLANETS[name], julianDay)
    }

    return status
  }
}

/**
 * Convert heliocentric position to geocentric (Earth-centered)
 * Subtracts Earth's position from a given position
 */
export function convertToGeocentricPosition(
  position: { x: number; y: number; z: number },
  earthPosition: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  return {
    x: position.x - earthPosition.x,
    y: position.y - earthPosition.y,
    z: position.z - earthPosition.z,
  }
}

/**
 * Calculate all planet positions in geocentric reference frame
 * Returns positions with Earth at the origin (0, 0, 0)
 * Now uses astronomy-engine for accurate geocentric positions
 */
export function calculateAllGeocentricPositions(
  julianDay: number
): Record<string, { x: number; y: number; z: number; angle: number }> {
  try {
    return calcAllGeocentricPos(julianDay)
  } catch (error) {
    console.error('Error calculating geocentric positions:', error)
    // Fallback to simplified calculation
    const positions: Record<string, { x: number; y: number; z: number; angle: number }> = {}

    // First, get Earth's heliocentric position
    const earthPosition = calculatePlanetPosition(PLANETS.earth, julianDay)

    // Calculate all planet positions relative to Earth
    const planetNames = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

    for (const name of planetNames) {
      if (name === 'earth') {
        // Earth is at the origin in geocentric frame
        positions[name] = { x: 0, y: 0, z: 0, angle: earthPosition.angle }
      } else if (name === 'sun') {
        // Sun is at the negative of Earth's position (Earth at origin, Sun opposite)
        positions[name] = {
          x: -earthPosition.x,
          y: -earthPosition.y,
          z: -earthPosition.z,
          angle: 0 // Sun doesn't have meaningful angle in geocentric
        }
      } else {
        // Other planets: convert to geocentric by subtracting Earth's position
        const heliocentricPos = calculatePlanetPosition(PLANETS[name], julianDay)
        const geocentricPos = convertToGeocentricPosition(heliocentricPos, earthPosition)
        positions[name] = { ...geocentricPos, angle: heliocentricPos.angle }
      }
    }

    return positions
  }
}

/**
 * Calculate aspect between two planets
 */
export interface Aspect {
  name: string
  angle: number
  orb: number
  color: string
  type: 'major' | 'minor'
}

export const ASPECTS: Aspect[] = [
  { name: 'Conjunction', angle: 0, orb: 8, color: '#FFD700', type: 'major' },
  { name: 'Sextile', angle: 60, orb: 6, color: '#87CEEB', type: 'major' },
  { name: 'Square', angle: 90, orb: 8, color: '#FF6347', type: 'major' },
  { name: 'Trine', angle: 120, orb: 8, color: '#98FB98', type: 'major' },
  { name: 'Opposition', angle: 180, orb: 8, color: '#FF69B4', type: 'major' },
]

export function calculateAspect(angle1: number, angle2: number): Aspect | null {
  const diff = Math.abs(((angle1 - angle2 + 180) % 360) - 180)

  for (const aspect of ASPECTS) {
    if (Math.abs(diff - aspect.angle) <= aspect.orb) {
      return aspect
    }
  }

  return null
}
