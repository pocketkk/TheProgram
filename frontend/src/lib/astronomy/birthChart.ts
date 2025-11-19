/**
 * Birth Chart (Natal Chart) Types and Utilities
 * Handles natal chart data structure, calculation, and storage
 */

import { calculatePlanetPosition, PLANETS, SATELLITES, PlanetData, getZodiacSign, isRetrograde, ASPECTS, calculateAspect, dateToJulianDay } from './planetaryData'

/**
 * Location data for birth chart
 */
export interface BirthLocation {
  name: string          // City, Country
  latitude: number      // -90 to 90
  longitude: number     // -180 to 180
  timezone: string      // IANA timezone (e.g., "America/New_York")
}

/**
 * Planetary position in natal chart
 */
export interface NatalPlanetPosition {
  name: string
  symbol: string
  longitude: number      // Ecliptic longitude (0-360°)
  latitude: number       // Ecliptic latitude
  sign: string          // Zodiac sign name
  signSymbol: string    // Zodiac symbol
  degree: number        // Degree within sign (0-30)
  minute: number        // Minute within degree (0-60)
  house: number         // House number (1-12)
  retrograde: boolean
  x: number             // 3D position
  y: number
  z: number
}

/**
 * House system data
 */
export interface HouseSystem {
  cusps: number[]       // 12 house cusp longitudes (degrees)
  system: 'equal' | 'placidus' | 'whole-sign'
  ascendant: number     // Rising sign longitude
  midheaven: number     // MC longitude
}

/**
 * Aspect between planets
 */
export interface NatalAspect {
  planet1: string
  planet2: string
  aspectName: string
  angle: number
  orb: number
  exactness: number    // How close to exact (0-1, 1 = exact)
  color: string
}

/**
 * Complete birth chart data
 */
export interface BirthChart {
  id: string
  name: string          // Chart name (e.g., "John Doe")
  birthDate: string     // ISO date string
  birthTime: string     // "HH:MM:SS" (24-hour format with seconds)
  location: BirthLocation
  julianDay: number     // Precise Julian Day with fractional seconds
  planets: Record<string, NatalPlanetPosition>
  houses: HouseSystem
  aspects: NatalAspect[]
  createdAt: string     // ISO timestamp
  notes?: string
}

/**
 * Calculate natal planet positions for a given birth data
 */
export function calculateNatalPositions(
  birthDate: Date,
  location: BirthLocation
): Record<string, NatalPlanetPosition> {
  const julianDay = dateToJulianDay(birthDate)
  const positions: Record<string, NatalPlanetPosition> = {}

  const planetNames = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

  for (const planetName of planetNames) {
    // Get planet data - Moon needs special handling
    let planetData: PlanetData

    if (planetName === 'moon') {
      // For natal charts, use simplified Moon data as if it were a planet
      // The Moon's position in the zodiac is what matters for astrology
      const moonSatellite = SATELLITES.moon
      planetData = {
        name: moonSatellite.name,
        symbol: moonSatellite.symbol,
        color: moonSatellite.color,
        radius: moonSatellite.radius,
        orbitRadius: 1.0, // Moon orbits Earth at ~1 AU from Sun (Earth's orbit)
        orbitPeriod: 27.3, // Moon's sidereal period
        rotationPeriod: moonSatellite.rotationPeriod,
        inclination: 5.14, // Moon's orbital inclination to ecliptic
        hasRings: false,
        glowColor: moonSatellite.glowColor,
      }
    } else {
      planetData = PLANETS[planetName]
    }

    if (!planetData) continue

    const position = calculatePlanetPosition(planetData, julianDay)
    const longitude = ((position.angle % 360) + 360) % 360
    const sign = getZodiacSign(longitude)

    // Safety check - if sign is undefined, skip this planet
    if (!sign) {
      console.error(`Failed to get zodiac sign for ${planetName}, longitude: ${longitude}`)
      continue
    }

    // Calculate degree and minute within sign
    const degreeInSign = longitude % 30
    const degree = Math.floor(degreeInSign)
    const minute = Math.floor((degreeInSign - degree) * 60)

    // Calculate house (simplified - using equal house system from Ascendant)
    // For now, use a simplified house calculation
    const ascendant = 0 // Will be calculated based on location and time
    const houseNumber = Math.floor(((longitude - ascendant + 360) % 360) / 30) + 1

    positions[planetName] = {
      name: planetData.name,
      symbol: planetData.symbol,
      longitude,
      latitude: 0, // Simplified - planets stay on ecliptic for now
      sign: sign.name,
      signSymbol: sign.symbol,
      degree,
      minute,
      house: houseNumber,
      retrograde: isRetrograde(planetData, julianDay),
      x: position.x,
      y: position.y,
      z: position.z,
    }
  }

  return positions
}

/**
 * Calculate house cusps using equal house system
 * (Simplified version - will integrate with backend for advanced house systems)
 */
export function calculateHouseCusps(
  birthDate: Date,
  location: BirthLocation
): HouseSystem {
  // Simplified calculation - in production, this would use proper house calculation
  // For now, we'll use equal houses starting from a calculated ascendant

  // Calculate local sidereal time and ascendant (simplified)
  const julianDay = dateToJulianDay(birthDate)
  const hours = birthDate.getHours() + birthDate.getMinutes() / 60

  // Simplified ascendant calculation (NOT astronomically accurate - placeholder)
  const ascendant = (hours * 15 + location.longitude) % 360
  const midheaven = (ascendant + 90) % 360

  // Equal house cusps - each house is exactly 30°
  const cusps: number[] = []
  for (let i = 0; i < 12; i++) {
    cusps.push((ascendant + i * 30) % 360)
  }

  return {
    cusps,
    system: 'equal',
    ascendant,
    midheaven,
  }
}

/**
 * Calculate aspects within natal chart
 */
export function calculateNatalAspects(
  planets: Record<string, NatalPlanetPosition>
): NatalAspect[] {
  const aspects: NatalAspect[] = []
  const planetNames = Object.keys(planets)

  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      const planet1 = planets[planetNames[i]]
      const planet2 = planets[planetNames[j]]

      const aspect = calculateAspect(planet1.longitude, planet2.longitude)
      if (aspect) {
        const angleDiff = Math.abs(((planet1.longitude - planet2.longitude + 180) % 360) - 180)
        const orb = Math.abs(angleDiff - aspect.angle)
        const exactness = 1 - (orb / aspect.orb)

        aspects.push({
          planet1: planetNames[i],
          planet2: planetNames[j],
          aspectName: aspect.name,
          angle: aspect.angle,
          orb,
          exactness,
          color: aspect.color,
        })
      }
    }
  }

  return aspects
}

/**
 * Calculate aspects between transiting planets and natal planets
 */
export function calculateTransitAspects(
  transitPlanets: Record<string, { angle: number }>,
  natalPlanets: Record<string, NatalPlanetPosition>
): Array<{
  transitPlanet: string
  natalPlanet: string
  aspect: string
  orb: number
  exactness: number
  color: string
}> {
  const aspects: Array<{
    transitPlanet: string
    natalPlanet: string
    aspect: string
    orb: number
    exactness: number
    color: string
  }> = []

  const transitNames = Object.keys(transitPlanets)
  const natalNames = Object.keys(natalPlanets)

  for (const transitName of transitNames) {
    for (const natalName of natalNames) {
      const transitAngle = transitPlanets[transitName].angle
      const natalAngle = natalPlanets[natalName].longitude

      const aspect = calculateAspect(transitAngle, natalAngle)
      if (aspect) {
        const angleDiff = Math.abs(((transitAngle - natalAngle + 180) % 360) - 180)
        const orb = Math.abs(angleDiff - aspect.angle)
        const exactness = 1 - (orb / aspect.orb)

        aspects.push({
          transitPlanet: transitName,
          natalPlanet: natalName,
          aspect: aspect.name,
          orb,
          exactness,
          color: aspect.color,
        })
      }
    }
  }

  return aspects
}

/**
 * Convert local time in a specific timezone to UTC Date
 *
 * Takes year, month, day, hours, minutes, seconds that represent a time
 * in the specified timezone, and returns a Date object representing that
 * moment in UTC.
 *
 * Algorithm:
 * 1. Create a UTC date with the input time (as if it were UTC)
 * 2. Check what that UTC time looks like when formatted in the target timezone
 * 3. Calculate the offset between what we want and what we got
 * 4. Apply the offset to get the correct UTC time
 *
 * Example: 1974-09-16 07:14:00 in America/Los_Angeles (PDT = UTC-7)
 *          should become 1974-09-16 14:14:00 UTC
 */
function convertLocalTimeToUTC(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  timezone: string
): Date {
  console.log(`[convertLocalTimeToUTC] WANT: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} in ${timezone}`)

  // Step 1: Create a UTC date with our input values (pretending they're UTC)
  const testUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
  console.log(`[convertLocalTimeToUTC] Step 1 - Test UTC date: ${testUTC.toISOString()}`)

  // Step 2: See what this UTC time looks like in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  })

  const formatted = formatter.format(testUTC)
  console.log(`[convertLocalTimeToUTC] Step 2 - Test UTC formatted in ${timezone}: ${formatted}`)

  const parts = formatter.formatToParts(testUTC)
  const tzTime = {
    year: parseInt(parts.find(p => p.type === 'year')!.value),
    month: parseInt(parts.find(p => p.type === 'month')!.value),
    day: parseInt(parts.find(p => p.type === 'day')!.value),
    hour: parseInt(parts.find(p => p.type === 'hour')!.value),
    minute: parseInt(parts.find(p => p.type === 'minute')!.value),
    second: parseInt(parts.find(p => p.type === 'second')!.value),
  }

  console.log(`[convertLocalTimeToUTC] Step 2 - Parsed: ${tzTime.year}-${String(tzTime.month).padStart(2, '0')}-${String(tzTime.day).padStart(2, '0')} ${String(tzTime.hour).padStart(2, '0')}:${String(tzTime.minute).padStart(2, '0')}:${String(tzTime.second).padStart(2, '0')}`)

  // Step 3: Calculate the offset
  // We WANT: year/month/day/hours/minutes/seconds in the target timezone
  // We GOT:  tzTime when testUTC is formatted in the target timezone
  // Offset = (what we got) - (what we want)
  const wantedTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
  const gotTime = new Date(Date.UTC(tzTime.year, tzTime.month - 1, tzTime.day, tzTime.hour, tzTime.minute, tzTime.second))
  const offset = gotTime.getTime() - wantedTime.getTime()

  console.log(`[convertLocalTimeToUTC] Step 3 - Offset: ${offset}ms (${offset/3600000} hours)`)

  // Step 4: Apply the offset to the test UTC time to get the real UTC time
  // If we wanted 07:14 in LA and test UTC 07:14 showed as 00:14 in LA:
  // offset = 00:14 - 07:14 = -7 hours
  // real UTC = test UTC - offset = 07:14 - (-7) = 07:14 + 7 = 14:14 ✓
  const realUTC = new Date(testUTC.getTime() - offset)

  console.log(`[convertLocalTimeToUTC] Step 4 - RESULT UTC: ${realUTC.toISOString()} (${realUTC.toUTCString()})`)

  // Verify: format the result in the target timezone to confirm it matches our input
  const verify = formatter.format(realUTC)
  console.log(`[convertLocalTimeToUTC] VERIFY - Result formatted in ${timezone}: ${verify}`)

  return realUTC
}

/**
 * Create a new birth chart
 */
export function createBirthChart(
  name: string,
  birthDate: Date,
  birthTime: string,
  location: BirthLocation,
  notes?: string
): BirthChart {
  // Parse time with full precision (HH:MM:SS or HH:MM)
  const timeParts = birthTime.split(':').map(Number)
  const hours = timeParts[0] || 0
  const minutes = timeParts[1] || 0
  const seconds = timeParts[2] || 0

  // Extract year, month, day from birthDate
  // Use UTC methods to avoid timezone issues with the date-only input
  const year = birthDate.getUTCFullYear()
  const month = birthDate.getUTCMonth() + 1 // JavaScript months are 0-indexed
  const day = birthDate.getUTCDate()

  console.log(`[createBirthChart] Inputs:`, {
    name,
    birthDateInput: birthDate.toString(),
    extracted: { year, month, day },
    birthTime,
    timezone: location.timezone,
    parsedTime: { hours, minutes, seconds }
  })

  // Convert the local birth time in the birth location's timezone to UTC
  const fullBirthDate = convertLocalTimeToUTC(year, month, day, hours, minutes, seconds, location.timezone)

  console.log(`[createBirthChart] Final UTC birthdate:`, {
    iso: fullBirthDate.toISOString(),
    utc: fullBirthDate.toUTCString(),
    local: fullBirthDate.toString()
  })

  // Calculate precise Julian Day with second-level accuracy
  // This provides sub-minute precision for planetary positions
  const julianDay = dateToJulianDay(fullBirthDate)
  const planets = calculateNatalPositions(fullBirthDate, location)
  const houses = calculateHouseCusps(fullBirthDate, location)
  const aspects = calculateNatalAspects(planets)

  return {
    id: crypto.randomUUID(),
    name,
    birthDate: birthDate.toISOString().split('T')[0],
    birthTime,
    location,
    julianDay,
    planets,
    houses,
    aspects,
    createdAt: new Date().toISOString(),
    notes,
  }
}

/**
 * LocalStorage keys
 */
const STORAGE_KEY = 'theprogram_birth_charts'
const ACTIVE_CHART_KEY = 'theprogram_active_chart'

/**
 * Save birth chart to localStorage
 */
export function saveBirthChart(chart: BirthChart): void {
  const charts = getAllBirthCharts()
  const existingIndex = charts.findIndex(c => c.id === chart.id)

  if (existingIndex >= 0) {
    charts[existingIndex] = chart
  } else {
    charts.push(chart)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts))
}

/**
 * Get all saved birth charts
 */
export function getAllBirthCharts(): BirthChart[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to parse birth charts:', error)
    return []
  }
}

/**
 * Get a specific birth chart by ID
 */
export function getBirthChart(id: string): BirthChart | null {
  const charts = getAllBirthCharts()
  return charts.find(c => c.id === id) || null
}

/**
 * Delete a birth chart
 */
export function deleteBirthChart(id: string): void {
  const charts = getAllBirthCharts()
  const filtered = charts.filter(c => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))

  // If this was the active chart, clear it
  if (getActiveChartId() === id) {
    setActiveChartId(null)
  }
}

/**
 * Get active chart ID
 */
export function getActiveChartId(): string | null {
  return localStorage.getItem(ACTIVE_CHART_KEY)
}

/**
 * Set active chart ID
 */
export function setActiveChartId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_CHART_KEY, id)
  } else {
    localStorage.removeItem(ACTIVE_CHART_KEY)
  }
}

/**
 * Get active chart
 */
export function getActiveChart(): BirthChart | null {
  const id = getActiveChartId()
  return id ? getBirthChart(id) : null
}
