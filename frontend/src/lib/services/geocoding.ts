/**
 * Geocoding Service
 * Uses OpenStreetMap Nominatim API for location search and coordinate retrieval
 * Free, no API key required
 */

export interface GeocodingResult {
  displayName: string
  latitude: number
  longitude: number
  city?: string
  state?: string
  country?: string
  countryCode?: string
  timezone?: string
}

interface NominatimResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  display_name: string
  address: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
    country_code?: string
  }
  boundingbox: string[]
}

/**
 * Search for locations by name (city, state, country)
 * Returns array of matching locations
 */
export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return []
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim())
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=5`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TheProgram-Astrology-App/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data: NominatimResult[] = await response.json()

    return data.map((result) => ({
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: result.address.city || result.address.town || result.address.village,
      state: result.address.state,
      country: result.address.country,
      countryCode: result.address.country_code?.toUpperCase(),
      // Note: Nominatim doesn't provide timezone, we'd need another API for that
    }))
  } catch (error) {
    console.error('Geocoding search error:', error)
    return []
  }
}

/**
 * Get timezone for coordinates
 * Uses timeapi.io (free, no API key)
 */
export async function getTimezone(latitude: number, longitude: number): Promise<string> {
  try {
    const url = `https://timeapi.io/api/TimeZone/coordinate?latitude=${latitude}&longitude=${longitude}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Timezone API error: ${response.status}`)
    }

    const data = await response.json()
    return data.timeZone || 'UTC'
  } catch (error) {
    console.error('Timezone lookup error:', error)
    // Fallback to basic timezone guess based on longitude
    return guessTimezoneFromLongitude(longitude)
  }
}

/**
 * Fallback: Guess timezone based on longitude
 * Very approximate, but better than nothing
 */
function guessTimezoneFromLongitude(longitude: number): string {
  const offset = Math.round(longitude / 15)

  const timezoneMap: Record<number, string> = {
    '-12': 'Pacific/Auckland', // -12
    '-11': 'Pacific/Midway',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Halifax',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'Europe/London',
    '1': 'Europe/Paris',
    '2': 'Europe/Athens',
    '3': 'Asia/Baghdad',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Norfolk',
    '12': 'Pacific/Auckland',
  }

  const offsetKey = offset.toString()
  return (timezoneMap as Record<string, string>)[offsetKey] || 'UTC'
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Validate coordinates
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'

  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`
}
