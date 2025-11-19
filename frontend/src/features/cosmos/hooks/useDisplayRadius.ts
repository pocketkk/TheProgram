import { useMemo } from 'react'
import type { CelestialBodyData, CelestialBodyType } from '../types'

export interface DisplayRadiusConfig {
  minSize?: number // Minimum display size
  maxSize?: number // Maximum display size
  scalingPower?: number // Power for scaling curve (default: 0.4)
}

/**
 * Calculate normalized display radius for visual consistency
 * Makes all bodies clearly visible while maintaining relative size differences
 *
 * @param data - Body data with physical radius
 * @param config - Display configuration
 * @returns Normalized display radius
 */
export function useDisplayRadius(
  data: CelestialBodyData,
  config: DisplayRadiusConfig = {}
): number {
  const {
    minSize = getDefaultMinSize(data.type),
    maxSize = getDefaultMaxSize(data.type),
    scalingPower = 0.4,
  } = config

  return useMemo(() => {
    // Apply display scale override if provided
    const baseRadius = data.radius * (data.displayScale || 1.0)

    // Special case for Sun - use larger radius
    if (data.type === 'star') {
      return 0.25 // Fixed Sun radius
    }

    // Normalize using power function for better visual balance
    // This makes small planets much more visible while keeping relative differences
    const referenceRadius = 70000 // Jupiter's radius (km)
    const normalized = Math.pow(baseRadius / referenceRadius, scalingPower)

    // Scale to min-max range
    const displayRadius = minSize + normalized * (maxSize - minSize)

    return displayRadius
  }, [data.radius, data.displayScale, data.type, minSize, maxSize, scalingPower])
}

/**
 * Get default minimum size based on body type
 */
function getDefaultMinSize(type: CelestialBodyType): number {
  switch (type) {
    case 'star':
      return 0.2
    case 'planet':
      return 0.08
    case 'satellite':
      return 0.03
    case 'asteroid':
      return 0.02
    case 'comet':
      return 0.02
    default:
      return 0.05
  }
}

/**
 * Get default maximum size based on body type
 */
function getDefaultMaxSize(type: CelestialBodyType): number {
  switch (type) {
    case 'star':
      return 0.3
    case 'planet':
      return 0.45
    case 'satellite':
      return 0.1
    case 'asteroid':
      return 0.08
    case 'comet':
      return 0.08
    default:
      return 0.3
  }
}

/**
 * Calculate atmosphere size multiplier based on body type
 * Some bodies (like gas giants) should have larger atmospheric halos
 */
export function getAtmosphereMultiplier(data: CelestialBodyData): number {
  // Gas giants get larger atmospheres
  const gasGiants = ['jupiter', 'saturn', 'uranus', 'neptune']
  if (gasGiants.includes(data.id.toLowerCase())) {
    return 1.2
  }

  // Venus has thick atmosphere
  if (data.id.toLowerCase() === 'venus') {
    return 1.15
  }

  // Earth has visible atmosphere
  if (data.id.toLowerCase() === 'earth') {
    return 1.1
  }

  // Default multiplier
  return 1.05
}
