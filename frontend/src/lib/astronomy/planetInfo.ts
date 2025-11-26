/**
 * Planet Information Helper
 * Gathers comprehensive data about a planet's current state
 */

import {
  PLANETS,
  SATELLITES,
  calculatePlanetPosition,
  getZodiacSign,
  calculateAspect,
  isRetrograde,
  type Aspect
} from './planetaryData'
import { calculateDignity, type Dignity } from './planetaryDignities'

export interface PlanetInfo {
  name: string
  symbol: string
  color: string

  // Position data
  zodiacSign: {
    name: string
    symbol: string
    element: 'fire' | 'earth' | 'air' | 'water'
    color: string
  }
  eclipticLongitude: number // degrees (0-360)
  degreeInSign: number // degrees within sign (0-30)
  minuteInSign: number // minutes within sign (0-60)

  // Status
  isRetrograde: boolean
  dignity: Dignity // Essential dignity in current sign

  // Orbital data
  distanceFromSun: number // AU
  orbitalPeriod: number // Earth days
  rotationPeriod: number // Earth days

  // Aspects to other planets
  aspects: Array<{
    planetName: string
    planetSymbol: string
    aspect: Aspect
    strength: number // 0-1, how exact the aspect is
    orb: number // deviation from exact aspect in degrees
  }>
}

/**
 * Get comprehensive information about a planet at a specific time
 */
export function getPlanetInfo(
  planetName: string,
  julianDay: number
): PlanetInfo | null {
  // Check if it's a planet or satellite
  const planetData = PLANETS[planetName]
  const satelliteData = SATELLITES[planetName]

  if (!planetData && !satelliteData) {
    return null
  }

  const data = planetData || satelliteData

  // Calculate current position
  const position = calculatePlanetPosition(planetData || PLANETS.earth, julianDay)
  const eclipticLongitude = ((position.angle % 360) + 360) % 360

  // Get zodiac sign info
  const zodiacSign = getZodiacSign(eclipticLongitude)

  // Calculate degree and minute within sign
  const degreeInSign = Math.floor(eclipticLongitude % 30)
  const minuteInSign = Math.floor((eclipticLongitude % 1) * 60)

  // Check retrograde status
  const retrograde = planetData ? isRetrograde(planetData, julianDay) : false

  // Calculate dignity
  const dignity = calculateDignity(data.name, zodiacSign.name)

  // Calculate aspects to other planets
  const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
  const aspects: PlanetInfo['aspects'] = []

  if (planetData) {
    for (const otherName of planetNames) {
      if (otherName === planetName) continue

      const otherPlanet = PLANETS[otherName]
      const otherPosition = calculatePlanetPosition(otherPlanet, julianDay)
      const otherAngle = ((otherPosition.angle % 360) + 360) % 360

      const aspect = calculateAspect(eclipticLongitude, otherAngle)

      if (aspect) {
        // Calculate actual angular difference
        const angleDiff = Math.abs(((eclipticLongitude - otherAngle + 180) % 360) - 180)
        const orb = Math.abs(angleDiff - aspect.angle)

        // Calculate strength (1 = exact aspect, 0 = at orb limit)
        const strength = 1 - (orb / aspect.orb)

        aspects.push({
          planetName: otherPlanet.name,
          planetSymbol: otherPlanet.symbol,
          aspect,
          strength: Math.max(0, Math.min(1, strength)),
          orb
        })
      }
    }

    // Sort aspects by strength (strongest first)
    aspects.sort((a, b) => b.strength - a.strength)
  }

  return {
    name: data.name,
    symbol: data.symbol,
    color: data.color,
    zodiacSign,
    eclipticLongitude,
    degreeInSign,
    minuteInSign,
    isRetrograde: retrograde,
    dignity,
    distanceFromSun: planetData?.orbitRadius || 0,
    orbitalPeriod: data.orbitPeriod,
    rotationPeriod: data.rotationPeriod,
    aspects
  }
}

/**
 * Format zodiac position as string
 */
export function formatZodiacPosition(info: PlanetInfo): string {
  return `${info.zodiacSign.symbol} ${info.degreeInSign}°${String(info.minuteInSign).padStart(2, '0')}'`
}

/**
 * Get element description
 */
export function getElementDescription(element: 'fire' | 'earth' | 'air' | 'water'): string {
  const descriptions = {
    fire: 'Energy, passion, inspiration',
    earth: 'Practicality, stability, material',
    air: 'Intellect, communication, social',
    water: 'Emotion, intuition, depth'
  }
  return descriptions[element]
}
