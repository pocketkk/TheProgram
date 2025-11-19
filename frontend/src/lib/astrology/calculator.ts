/**
 * Birth Chart Calculator using Astronomy Engine
 */

import * as Astronomy from 'astronomy-engine'
import type { BirthData, PlanetPosition, House, Aspect, BirthChart, AspectType } from './types'
import { ZODIAC_SIGNS, PLANETS, ASPECT_CONFIG } from './types'

export type ZodiacSystem = 'western' | 'vedic' | 'human-design'

/**
 * Calculate Lahiri Ayanamsa (precession offset) for a given date
 * Used to convert Western (Tropical) to Vedic (Sidereal) positions
 */
function calculateAyanamsa(date: Date): number {
  // Lahiri ayanamsa formula (widely used in Vedic astrology)
  // Reference epoch: January 1, 2000 12:00 TT
  const epoch = new Date('2000-01-01T12:00:00Z')
  const epochAyanamsa = 23.85 // Ayanamsa at epoch (degrees)

  // Calculate years since epoch
  const millisPerYear = 365.25 * 24 * 60 * 60 * 1000
  const yearsSinceEpoch = (date.getTime() - epoch.getTime()) / millisPerYear

  // Precession rate: approximately 50.29 arc seconds per year = 0.01397 degrees per year
  const precessionRate = 0.01397

  // Calculate current ayanamsa
  const ayanamsa = epochAyanamsa + (yearsSinceEpoch * precessionRate)

  return ayanamsa
}

/**
 * Apply zodiac system offset to longitude
 */
function applyZodiacSystemOffset(longitude: number, zodiacSystem: ZodiacSystem, date: Date): number {
  if (zodiacSystem === 'western') {
    return longitude // No offset for Western/Tropical
  }

  // Both Vedic and Human Design use sidereal calculations
  const ayanamsa = calculateAyanamsa(date)
  let adjustedLongitude = longitude - ayanamsa

  // Normalize to 0-360 range
  while (adjustedLongitude < 0) adjustedLongitude += 360
  while (adjustedLongitude >= 360) adjustedLongitude -= 360

  return adjustedLongitude
}

/**
 * Convert ecliptic longitude to zodiac sign and degree
 */
export function longitudeToZodiac(longitude: number) {
  const normalizedLongitude = ((longitude % 360) + 360) % 360
  const signIndex = Math.floor(normalizedLongitude / 30)
  const degree = normalizedLongitude % 30
  const minute = Math.floor((degree % 1) * 60)

  const sign = ZODIAC_SIGNS[signIndex]

  return {
    sign: sign.name,
    symbol: sign.symbol,
    degree: Math.floor(degree),
    minute,
    element: sign.element as 'Fire' | 'Earth' | 'Air' | 'Water',
    modality: sign.modality as 'Cardinal' | 'Fixed' | 'Mutable',
  }
}

/**
 * Calculate Chiron's ecliptic longitude using orbital approximation
 * Chiron has a ~50.7 year orbital period with perihelion in May 1945
 */
function calculateChironLongitude(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  // Julian date calculation
  const jd =
    367 * year -
    Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4) +
    Math.floor((275 * month) / 9) +
    day +
    1721013.5 +
    hour / 24 +
    minute / 1440

  // Chiron orbital elements (J2000)
  const epoch = 2451545.0 // J2000 epoch
  const T = (jd - epoch) / 36525 // Julian centuries from J2000

  // Mean longitude calculation
  const L0 = 205.04 // Mean longitude at epoch (degrees)
  const n = 0.01945 // Mean motion (degrees per day)
  const days = jd - epoch

  const meanLongitude = (L0 + n * days) % 360

  // Simple perturbation
  const perturbation =
    2.0 * Math.sin(((meanLongitude - 180) * Math.PI) / 180) +
    0.5 * Math.sin(((2 * meanLongitude - 90) * Math.PI) / 180)

  const longitude = (meanLongitude + perturbation + 360) % 360

  return longitude
}

/**
 * Calculate Black Moon Lilith (mean lunar apogee) ecliptic longitude
 * Lilith completes one cycle through the zodiac approximately every 8.85 years
 */
function calculateLilithLongitude(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  // Julian date calculation
  const jd =
    367 * year -
    Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4) +
    Math.floor((275 * month) / 9) +
    day +
    1721013.5 +
    hour / 24 +
    minute / 1440

  // Black Moon Lilith mean apogee calculation
  const epoch = 2451545.0 // J2000 epoch
  const days = jd - epoch

  // Mean longitude of lunar apogee at J2000
  const L0 = 218.31665 // degrees

  // Mean motion (degrees per day)
  const n = 0.11140353 // approximately 360° / 3232.6 days

  const meanLongitude = (L0 + n * days) % 360

  return (meanLongitude + 360) % 360
}

/**
 * Map astronomy-engine Body to our planet names
 */
const BODY_MAP: Record<string, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
}

/**
 * Calculate planet positions using Astronomy Engine
 */
export function calculatePlanetPositions(
  date: Date,
  latitude: number = 0,
  longitude: number = 0,
  zodiacSystem: ZodiacSystem = 'western'
): PlanetPosition[] {
  const planets: PlanetPosition[] = []
  const time = new Astronomy.AstroTime(date)

  // Calculate the 10 major celestial bodies using astronomy-engine
  for (const [planetName, body] of Object.entries(BODY_MAP)) {
    const planetConfig = PLANETS.find(p => p.name === planetName)
    if (!planetConfig) continue

    try {
      // Get geocentric position vector
      const geoVector = Astronomy.GeoVector(body, time, false)

      // Convert to ecliptic coordinates
      const ecliptic = Astronomy.Ecliptic(geoVector)

      // Calculate geocentric distance from Earth
      const distance = Math.sqrt(
        geoVector.x * geoVector.x +
        geoVector.y * geoVector.y +
        geoVector.z * geoVector.z
      )

      // Calculate daily motion by comparing positions 1 day apart
      const nextTime = new Astronomy.AstroTime(new Date(date.getTime() + 86400000))
      const nextGeoVector = Astronomy.GeoVector(body, nextTime, false)
      const nextEcliptic = Astronomy.Ecliptic(nextGeoVector)

      let speed = nextEcliptic.elon - ecliptic.elon
      // Handle wrapping around 0/360 degrees
      if (speed > 180) speed -= 360
      if (speed < -180) speed += 360

      // Apply zodiac system offset (Western/Vedic/Human Design)
      const adjustedLongitude = applyZodiacSystemOffset(ecliptic.elon, zodiacSystem, date)
      const zodiac = longitudeToZodiac(adjustedLongitude)

      planets.push({
        name: planetConfig.name,
        symbol: planetConfig.symbol,
        longitude: adjustedLongitude,
        latitude: ecliptic.elat,
        distance,
        speed,
        isRetrograde: speed < 0,
        sign: zodiac.sign,
        degree: zodiac.degree,
        minute: zodiac.minute,
        house: 0, // Will be assigned later
        element: zodiac.element,
        modality: zodiac.modality,
      })
    } catch (error) {
      console.error(`Error calculating ${planetName}:`, error)
    }
  }

  // Calculate Earth (always opposite the Sun, used in Human Design)
  try {
    const sunIndex = planets.findIndex(p => p.name === 'Sun')
    const sun = planets[sunIndex]
    if (sun) {
      const earthLongitude = (sun.longitude + 180) % 360
      const zodiac = longitudeToZodiac(earthLongitude)
      const planetConfig = PLANETS.find(p => p.name === 'Earth')

      if (planetConfig) {
        // Insert Earth right after the Sun
        planets.splice(sunIndex + 1, 0, {
          name: planetConfig.name,
          symbol: planetConfig.symbol,
          longitude: earthLongitude,
          latitude: 0, // Earth is on the ecliptic plane
          distance: 0, // We're on Earth
          speed: -sun.speed, // Opposite motion to Sun
          isRetrograde: false, // Earth doesn't go retrograde
          sign: zodiac.sign,
          degree: zodiac.degree,
          minute: zodiac.minute,
          house: 0,
          element: zodiac.element,
          modality: zodiac.modality,
        })
      }
    }
  } catch (error) {
    console.error('Error calculating Earth:', error)
  }

  // Calculate Chiron
  try {
    const chironLongitude = calculateChironLongitude(date)
    const adjustedChironLongitude = applyZodiacSystemOffset(chironLongitude, zodiacSystem, date)
    const zodiac = longitudeToZodiac(adjustedChironLongitude)
    const planetConfig = PLANETS.find(p => p.name === 'Chiron')

    if (planetConfig) {
      planets.push({
        name: planetConfig.name,
        symbol: planetConfig.symbol,
        longitude: adjustedChironLongitude,
        latitude: 0,
        distance: 13.7, // Approximate semi-major axis in AU
        speed: 0.01945, // Approximate mean motion
        isRetrograde: false,
        sign: zodiac.sign,
        degree: zodiac.degree,
        minute: zodiac.minute,
        house: 0,
        element: zodiac.element,
        modality: zodiac.modality,
      })
    }
  } catch (error) {
    console.error('Error calculating Chiron:', error)
  }

  // Calculate Lilith (Black Moon Lilith)
  try {
    const lilithLongitude = calculateLilithLongitude(date)
    const adjustedLilithLongitude = applyZodiacSystemOffset(lilithLongitude, zodiacSystem, date)
    const zodiac = longitudeToZodiac(adjustedLilithLongitude)
    const planetConfig = PLANETS.find(p => p.name === 'Lilith')

    if (planetConfig) {
      planets.push({
        name: planetConfig.name,
        symbol: planetConfig.symbol,
        longitude: adjustedLilithLongitude,
        latitude: 0,
        distance: 0, // Lilith is a calculated point, not a physical body
        speed: 0.11140353,
        isRetrograde: false,
        sign: zodiac.sign,
        degree: zodiac.degree,
        minute: zodiac.minute,
        house: 0,
        element: zodiac.element,
        modality: zodiac.modality,
      })
    }
  } catch (error) {
    console.error('Error calculating Lilith:', error)
  }

  return planets
}

/**
 * Calculate house cusps using equal house system
 * Equal houses divide the ecliptic into 12 equal 30-degree segments starting from the Ascendant
 */
export function calculateHouses(date: Date, latitude: number, longitude: number): House[] {
  const houses: House[] = []
  const time = new Astronomy.AstroTime(date)

  try {
    // Calculate Local Sidereal Time (in hours)
    const siderealTime = Astronomy.SiderealTime(time) // Greenwich Sidereal Time in hours
    const localSiderealTimeHours = siderealTime + longitude / 15 // Add longitude offset
    const localSiderealTimeDegrees = (localSiderealTimeHours * 15) % 360 // Convert to degrees

    // Calculate Ascendant using proper formula accounting for latitude
    // Convert to radians
    const lstRad = (localSiderealTimeDegrees * Math.PI) / 180
    const latRad = (latitude * Math.PI) / 180
    const obliquity = 23.4397 // Obliquity of the ecliptic in degrees (approximately constant)
    const oblRad = (obliquity * Math.PI) / 180

    // Ascendant formula using atan2 for proper quadrant handling
    // Formula from astronomy.stackexchange.com:
    // λ_Asc = atan2(cos(LST), -(sin(LST) * cos(ε) + tan(φ) * sin(ε)))
    const y = Math.cos(lstRad)
    const x = -(Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad))

    let ascendantRad = Math.atan2(y, x)

    // atan2 returns values in range [-π, π], convert to [0, 2π]
    if (ascendantRad < 0) {
      ascendantRad += 2 * Math.PI
    }

    // Convert back to degrees
    let ascendant = (ascendantRad * 180 / Math.PI) % 360

    // Normalize to 0-360 range
    if (ascendant < 0) ascendant += 360

    // Use equal house system: each house is exactly 30 degrees from the previous
    for (let i = 1; i <= 12; i++) {
      const cuspLongitude = (ascendant + (i - 1) * 30) % 360
      const zodiac = longitudeToZodiac(cuspLongitude)

      houses.push({
        number: i,
        cusp: cuspLongitude,
        sign: zodiac.sign,
        degree: zodiac.degree,
        minute: zodiac.minute,
      })
    }
  } catch (error) {
    console.error('Error calculating houses:', error)

    // Fallback: create 12 houses starting from 0 degrees Aries if all else fails
    for (let i = 1; i <= 12; i++) {
      const cuspLongitude = (i - 1) * 30
      const zodiac = longitudeToZodiac(cuspLongitude)

      houses.push({
        number: i,
        cusp: cuspLongitude,
        sign: zodiac.sign,
        degree: zodiac.degree,
        minute: zodiac.minute,
      })
    }
  }

  return houses
}

/**
 * Assign houses to planets based on their longitude and house cusps
 */
export function assignHousesToPlanets(planets: PlanetPosition[], houses: House[]): PlanetPosition[] {
  // Safety check: ensure we have 12 houses
  if (!houses || houses.length !== 12) {
    console.error('Invalid houses array, returning planets without house assignments')
    return planets.map(planet => ({ ...planet, house: 1 }))
  }

  return planets.map(planet => {
    let houseNumber = 1

    for (let i = 0; i < 12; i++) {
      const currentCusp = houses[i].cusp
      const nextCusp = houses[(i + 1) % 12].cusp

      // Handle wrapping around 360 degrees
      if (nextCusp > currentCusp) {
        if (planet.longitude >= currentCusp && planet.longitude < nextCusp) {
          houseNumber = i + 1
          break
        }
      } else {
        // House wraps around 0 degrees
        if (planet.longitude >= currentCusp || planet.longitude < nextCusp) {
          houseNumber = i + 1
          break
        }
      }
    }

    return {
      ...planet,
      house: houseNumber,
    }
  })
}

/**
 * Calculate aspects between planets
 */
export function calculateAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i]
      const planet2 = planets[j]

      // Calculate angular distance
      let angle = Math.abs(planet1.longitude - planet2.longitude)
      if (angle > 180) angle = 360 - angle

      // Check each aspect type
      for (const [aspectName, config] of Object.entries(ASPECT_CONFIG)) {
        const orb = Math.abs(angle - config.angle)

        if (orb <= config.orb) {
          // Determine if aspect is applying or separating
          const isApplying =
            (planet1.speed > planet2.speed && planet1.longitude < planet2.longitude) ||
            (planet1.speed < planet2.speed && planet1.longitude > planet2.longitude)

          aspects.push({
            planet1: planet1.name,
            planet2: planet2.name,
            angle: config.angle,
            orb,
            type: aspectName as AspectType,
            isApplying,
          })
          break // Only count the first matching aspect
        }
      }
    }
  }

  return aspects
}

/**
 * Calculate complete birth chart
 */
export function calculateBirthChart(birthData: BirthData, zodiacSystem: ZodiacSystem = 'western'): BirthChart {
  // Calculate planet positions
  const planetsWithoutHouses = calculatePlanetPositions(birthData.date, birthData.latitude, birthData.longitude, zodiacSystem)

  // Calculate houses
  const houses = calculateHouses(birthData.date, birthData.latitude, birthData.longitude)

  // Assign houses to planets
  const planets = assignHousesToPlanets(planetsWithoutHouses, houses)

  // Calculate aspects
  const aspects = calculateAspects(planets)

  // Extract key points
  const ascendant = houses[0]?.cusp || 0
  const midheaven = houses[9]?.cusp || 0
  const descendant = (ascendant + 180) % 360
  const ic = (midheaven + 180) % 360

  return {
    birthData,
    planets,
    houses,
    aspects,
    ascendant,
    midheaven,
    descendant,
    ic,
  }
}

/**
 * Get interpretations for planet in sign
 */
export function getPlanetInSignInterpretation(planet: string, sign: string): string {
  const interpretations: Record<string, Record<string, string>> = {
    Sun: {
      Aries: 'Dynamic self-expression, pioneering spirit, natural leadership',
      Taurus: 'Steady determination, appreciation for beauty and comfort, reliable',
      Gemini: 'Curious mind, versatile communication, intellectual exploration',
      Cancer: 'Nurturing nature, emotional depth, strong family connections',
      Leo: 'Creative self-expression, natural magnetism, generous spirit',
      Virgo: 'Analytical mind, service-oriented, attention to detail',
      Libra: 'Diplomatic nature, aesthetic appreciation, relationship-focused',
      Scorpio: 'Intense passion, transformative power, emotional depth',
      Sagittarius: 'Philosophical outlook, adventurous spirit, truth-seeking',
      Capricorn: 'Ambitious drive, disciplined approach, long-term vision',
      Aquarius: 'Innovative thinking, humanitarian ideals, independent spirit',
      Pisces: 'Compassionate nature, intuitive understanding, creative imagination',
    },
    Moon: {
      Aries: 'Quick emotional responses, need for independence, spontaneous feelings',
      Taurus: 'Emotional stability, comfort-seeking, sensual nature',
      Gemini: 'Mental stimulation needed, versatile emotions, communicative feelings',
      Cancer: 'Deep emotional sensitivity, nurturing instincts, strong intuition',
      Leo: 'Warm-hearted emotions, need for recognition, generous feelings',
      Virgo: 'Practical emotions, analytical feelings, service-oriented care',
      Libra: 'Harmonious emotions, partnership needs, diplomatic feelings',
      Scorpio: 'Intense emotions, deep feelings, transformative inner life',
      Sagittarius: 'Optimistic emotions, adventurous feelings, philosophical heart',
      Capricorn: 'Reserved emotions, ambitious feelings, disciplined heart',
      Aquarius: 'Detached emotions, humanitarian feelings, unconventional needs',
      Pisces: 'Empathic emotions, intuitive feelings, compassionate heart',
    },
    Chiron: {
      Aries: 'Healing through self-assertion, overcoming identity wounds',
      Taurus: 'Healing material insecurity, finding self-worth',
      Gemini: 'Healing communication wounds, embracing curiosity',
      Cancer: 'Healing family wounds, nurturing the inner child',
      Leo: 'Healing creative blocks, reclaiming authentic expression',
      Virgo: 'Healing perfectionism, accepting imperfection',
      Libra: 'Healing relationship wounds, finding balance',
      Scorpio: 'Healing deep trauma, transforming pain into power',
      Sagittarius: 'Healing belief wounds, finding personal truth',
      Capricorn: 'Healing authority wounds, redefining success',
      Aquarius: 'Healing alienation, embracing uniqueness',
      Pisces: 'Healing spiritual wounds, transcending suffering',
    },
    Lilith: {
      Aries: 'Raw independence, primal self-assertion, fierce autonomy',
      Taurus: 'Untamed sensuality, material rebellion, wild nature',
      Gemini: 'Forbidden knowledge, taboo communication, mental freedom',
      Cancer: 'Primal nurturing, emotional rebellion, fierce protection',
      Leo: 'Unrestrained creativity, ego rebellion, authentic power',
      Virgo: 'Liberation from service, body autonomy, wild healing',
      Libra: 'Relationship rebellion, wild harmony, fierce equality',
      Scorpio: 'Intense sexuality, power reclamation, deep transformation',
      Sagittarius: 'Wild freedom, philosophical rebellion, untamed truth',
      Capricorn: 'Authority rebellion, wild ambition, fierce independence',
      Aquarius: 'Revolutionary spirit, radical individuality, collective rebellion',
      Pisces: 'Mystical wildness, spiritual rebellion, boundless compassion',
    },
  }

  return interpretations[planet]?.[sign] || 'Unique placement requiring individual interpretation'
}

/**
 * Get house interpretation
 */
export function getHouseInterpretation(house: number): string {
  const interpretations = [
    'Self, identity, physical appearance, first impressions, new beginnings',
    'Values, possessions, self-worth, material security, personal resources',
    'Communication, siblings, short trips, early education, immediate environment',
    'Home, family, roots, private life, emotional foundation, ancestry',
    'Creativity, romance, children, self-expression, pleasure, speculation',
    'Health, work, daily routines, service, pets, practical skills',
    'Partnerships, marriage, contracts, open enemies, one-on-one relationships',
    'Transformation, shared resources, intimacy, death, rebirth, occult',
    'Higher education, philosophy, long journeys, beliefs, expansion',
    'Career, public image, reputation, authority, life direction, achievement',
    'Friendships, groups, hopes, wishes, humanitarian ideals, social networks',
    'Subconscious, hidden matters, solitude, karma, spiritual transcendence',
  ]

  return interpretations[house - 1] || 'Unknown house'
}
