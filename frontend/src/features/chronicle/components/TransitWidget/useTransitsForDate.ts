/**
 * Hook for fetching transit data for a specific date
 * Includes natal house overlay for proper transit chart display
 */
import { useQuery } from '@tanstack/react-query'
import { getCurrentTransits } from '@/lib/api/transits'
import { getOrCreateChart } from '@/lib/api/charts'
import type { CurrentTransitsResponse } from '@/lib/api/transits'
import type { BirthChart, House, Aspect } from '@/lib/astrology/types'

interface UseTransitsForDateParams {
  date: string
  birthDataId?: string
  enabled?: boolean
}

interface TransitChartData extends BirthChart {
  transitDate: string
}

// Sign properties lookup
const signProperties: Record<string, { element: 'Fire' | 'Earth' | 'Air' | 'Water'; modality: 'Cardinal' | 'Fixed' | 'Mutable' }> = {
  Aries: { element: 'Fire', modality: 'Cardinal' },
  Taurus: { element: 'Earth', modality: 'Fixed' },
  Gemini: { element: 'Air', modality: 'Mutable' },
  Cancer: { element: 'Water', modality: 'Cardinal' },
  Leo: { element: 'Fire', modality: 'Fixed' },
  Virgo: { element: 'Earth', modality: 'Mutable' },
  Libra: { element: 'Air', modality: 'Cardinal' },
  Scorpio: { element: 'Water', modality: 'Fixed' },
  Sagittarius: { element: 'Fire', modality: 'Mutable' },
  Capricorn: { element: 'Earth', modality: 'Cardinal' },
  Aquarius: { element: 'Air', modality: 'Fixed' },
  Pisces: { element: 'Water', modality: 'Mutable' },
}

// Planet symbols and colors
const planetConfig: Record<string, { symbol: string; color: string }> = {
  sun: { symbol: '☉', color: '#FDB813' },
  moon: { symbol: '☽', color: '#C0C0C0' },
  mercury: { symbol: '☿', color: '#8B7355' },
  venus: { symbol: '♀', color: '#FFC0CB' },
  mars: { symbol: '♂', color: '#DC143C' },
  jupiter: { symbol: '♃', color: '#DAA520' },
  saturn: { symbol: '♄', color: '#B8860B' },
  uranus: { symbol: '♅', color: '#4FD0E0' },
  neptune: { symbol: '♆', color: '#4169E1' },
  pluto: { symbol: '♇', color: '#8B4513' },
  chiron: { symbol: '⚷', color: '#9370DB' },
  lilith: { symbol: '⚸', color: '#8B008B' },
  lilith_mean: { symbol: '⚸', color: '#8B008B' },
  north_node: { symbol: '☊', color: '#00CED1' },
  true_node: { symbol: '☊', color: '#00CED1' },
  nn_node: { symbol: '☊', color: '#00CED1' },
}

/**
 * Convert database house format to frontend House[] format
 * Handles multiple formats:
 * - { cusps: [12 longitudes], ascendant, mc } - most common from API
 * - Array of house objects with cusp/longitude
 * - Object with house_1, house_2, etc keys
 */
function convertHouses(dbHouses: Record<string, any> | any[] | undefined): House[] {
  if (!dbHouses) return []

  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ]

  // Format: { cusps: [...], ascendant, mc }
  // API may return 11 cusps (houses 2-12, with ascendant as house 1) or 12 cusps (all houses)
  if (!Array.isArray(dbHouses) && 'cusps' in dbHouses && Array.isArray(dbHouses.cusps)) {
    let allCusps: number[]

    if (dbHouses.cusps.length === 12) {
      // API returned all 12 cusps directly
      allCusps = dbHouses.cusps
    } else if (dbHouses.cusps.length === 11 && dbHouses.ascendant !== undefined) {
      // API returned 11 cusps (houses 2-12), prepend ascendant as house 1
      allCusps = [dbHouses.ascendant, ...dbHouses.cusps]
    } else {
      // Fallback: use whatever we have
      allCusps = dbHouses.cusps
    }

    return allCusps.slice(0, 12).map((cusp: number, index: number) => {
      const signIndex = Math.floor(cusp / 30) % 12
      const degreeInSign = cusp % 30
      return {
        number: index + 1,
        cusp,
        sign: signs[signIndex],
        degree: Math.floor(degreeInSign),
        minute: Math.floor((degreeInSign - Math.floor(degreeInSign)) * 60)
      }
    })
  }

  // If already an array of house objects
  if (Array.isArray(dbHouses)) {
    return dbHouses.map((house, index) => {
      const cusp = house.cusp ?? house.longitude ?? 0
      const signIndex = Math.floor(cusp / 30) % 12
      const degreeInSign = cusp % 30
      return {
        number: index + 1,
        cusp,
        sign: house.sign ?? signs[signIndex],
        degree: house.degree ?? Math.floor(degreeInSign),
        minute: house.minute ?? Math.floor((degreeInSign - Math.floor(degreeInSign)) * 60)
      }
    })
  }

  // Convert object format { house_1: {...}, house_2: {...} }
  const houses: House[] = []
  for (let i = 1; i <= 12; i++) {
    const key = `house_${i}`
    const houseData = dbHouses[key]
    if (houseData) {
      const cusp = houseData.cusp ?? houseData.longitude ?? 0
      const signIndex = Math.floor(cusp / 30) % 12
      const degreeInSign = cusp % 30
      houses.push({
        number: i,
        cusp,
        sign: houseData.sign ?? signs[signIndex],
        degree: houseData.degree ?? Math.floor(degreeInSign),
        minute: houseData.minute ?? Math.floor((degreeInSign - Math.floor(degreeInSign)) * 60)
      })
    }
  }
  return houses
}

/**
 * Calculate which house a planet is in based on house cusps
 */
function calculatePlanetHouse(longitude: number, houses: House[]): number {
  if (houses.length === 0) return 0

  for (let i = 0; i < 12; i++) {
    const currentCusp = houses[i].cusp
    const nextCusp = houses[(i + 1) % 12].cusp

    // Handle wrap-around at 360°
    if (nextCusp < currentCusp) {
      // House spans 0°
      if (longitude >= currentCusp || longitude < nextCusp) {
        return houses[i].number
      }
    } else {
      if (longitude >= currentCusp && longitude < nextCusp) {
        return houses[i].number
      }
    }
  }
  return 1 // Default to first house
}

/**
 * Transform transit response + natal houses into BirthChart format for BirthChartWheel
 */
function transformTransitsToChart(
  transits: CurrentTransitsResponse,
  natalChart: Record<string, any> | null,
  date: string
): TransitChartData {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ]

  // Convert natal houses
  const houses = convertHouses(natalChart?.houses)

  // Get ascendant and midheaven from natal chart
  // They can be at chart level, in angles, or inside houses object
  const ascendant = natalChart?.ascendant
    ?? natalChart?.angles?.asc
    ?? natalChart?.houses?.ascendant
    ?? houses[0]?.cusp
    ?? 0
  const midheaven = natalChart?.midheaven
    ?? natalChart?.angles?.mc
    ?? natalChart?.houses?.mc
    ?? houses[9]?.cusp
    ?? 0

  // Convert current transit positions to planet positions
  const planets = Object.entries(transits.current_positions || {})
    .filter(([, position]) => position && typeof position.longitude === 'number')
    .map(([name, position]) => {
      const longitude = position.longitude ?? 0
      const signIndex = Math.floor(longitude / 30) % 12
      const degreeInSign = longitude % 30
      const degree = Math.floor(degreeInSign)
      const minute = Math.floor((degreeInSign - degree) * 60)

      const sign = signs[signIndex]
      const props = signProperties[sign] || { element: 'Earth' as const, modality: 'Cardinal' as const }
      const config = planetConfig[name.toLowerCase()] || { symbol: name.charAt(0).toUpperCase(), color: '#888888' }

      // Calculate which natal house this transit planet is in
      const house = calculatePlanetHouse(longitude, houses)

      return {
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        symbol: config.symbol,
        longitude,
        latitude: position.latitude ?? 0,
        distance: position.distance ?? 1,
        speed: position.speed_longitude ?? 0,
        isRetrograde: position.is_retrograde ?? false,
        sign,
        degree,
        minute,
        house,
        element: props.element,
        modality: props.modality
      }
    })

  // Create empty aspects array (transit-to-natal aspects shown separately)
  const aspects: Aspect[] = []

  return {
    birthData: {
      date: new Date(date),
      latitude: 0,
      longitude: 0
    },
    planets,
    houses,
    aspects,
    ascendant,
    midheaven,
    descendant: (ascendant + 180) % 360,
    ic: (midheaven + 180) % 360,
    transitDate: date
  }
}

export function useTransitsForDate({ date, birthDataId, enabled = true }: UseTransitsForDateParams) {
  return useQuery({
    queryKey: ['transits-for-date', date, birthDataId],
    queryFn: async () => {
      if (!birthDataId) {
        throw new Error('Birth data ID is required')
      }

      // Fetch both transits and natal chart in parallel
      const [transitResponse, natalChartResponse] = await Promise.all([
        getCurrentTransits({
          birth_data_id: birthDataId,
          transit_date: date,
          zodiac: 'tropical'
        }),
        // Get natal chart for house overlay
        getOrCreateChart({
          birth_data_id: birthDataId,
          chart_type: 'natal',
          astro_system: 'western',
          zodiac_type: 'tropical',
          house_system: 'placidus'
        }).catch(() => null) // Don't fail if natal chart fetch fails
      ])

      return {
        raw: transitResponse,
        chart: transformTransitsToChart(
          transitResponse,
          natalChartResponse?.chart_data ?? null,
          date
        )
      }
    },
    enabled: enabled && !!birthDataId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes (formerly cacheTime)
  })
}
