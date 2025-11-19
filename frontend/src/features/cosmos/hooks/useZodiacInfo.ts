import { useMemo } from 'react'
import type { ZodiacSign } from '../types'
import { getZodiacSign as getSign } from '@/lib/astronomy/planetaryData'
import { calculateAngleFromCoordinates } from '../utils/calculations'

export interface ZodiacInfoResult {
  zodiacSign: ZodiacSign | null
  zodiacColor: string
  eclipticLongitude: number
}

/**
 * Calculate zodiac sign information from ecliptic longitude
 *
 * @param eclipticLongitude - Longitude in degrees (0-360)
 * @param enabled - Whether zodiac calculation is enabled
 * @param fallbackColor - Color to use if zodiac is disabled
 * @returns Zodiac sign information and color
 */
export function useZodiacInfo(
  eclipticLongitude: number,
  enabled: boolean = true,
  fallbackColor: string = '#FFFFFF'
): ZodiacInfoResult {
  return useMemo(() => {
    if (!enabled) {
      return {
        zodiacSign: null,
        zodiacColor: fallbackColor,
        eclipticLongitude,
      }
    }

    const sign = getSign(eclipticLongitude)

    if (!sign) {
      console.warn('Unable to determine zodiac sign for longitude:', eclipticLongitude)
      return {
        zodiacSign: null,
        zodiacColor: fallbackColor,
        eclipticLongitude,
      }
    }

    // Convert planetaryData ZodiacSign to cosmos ZodiacSign format
    // Add endDegree which is startDegree + 30
    const cosmosSign: ZodiacSign = {
      name: sign.name,
      symbol: sign.symbol,
      color: sign.color,
      element: sign.element,
      startDegree: sign.startDegree,
      endDegree: (sign.startDegree + 30) % 360,
    }

    return {
      zodiacSign: cosmosSign,
      zodiacColor: sign.color,
      eclipticLongitude,
    }
  }, [eclipticLongitude, enabled, fallbackColor])
}

/**
 * Calculate ecliptic longitude from position vector
 *
 * @param x - X coordinate
 * @param z - Z coordinate
 * @returns Ecliptic longitude in degrees (0-360)
 */
export function calculateEclipticLongitudeFromPosition(x: number, z: number): number {
  return calculateAngleFromCoordinates(x, z)
}
