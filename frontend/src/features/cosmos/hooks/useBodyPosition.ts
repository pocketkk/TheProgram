/**
 * Position Calculation Hook for Celestial Bodies
 *
 * This module provides the core position calculation logic for the cosmic visualizer.
 * It handles different body types (stars, planets, satellites) and reference frames
 * (heliocentric, geocentric) using simplified orbital mechanics.
 *
 * @module useBodyPosition
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import type { CelestialBodyData, SceneContext, PositionOverride, CalculatedPosition } from '../types'
import type { KeplerianElements } from '../types/celestialBody'
import { getZodiacSign, calculatePlanetPosition } from '@/lib/astronomy/planetaryData'
import {
  calculateMeanAnomaly,
  degreesToRadians,
  radiansToDegrees,
  normalizeAngle,
  daysSinceJ2000,
} from '../utils/calculations'
import { calculateOrbitalPosition } from '../utils/orbitalMechanics'

/**
 * Calculate the 3D position of a celestial body based on orbital mechanics
 *
 * This hook computes positions using different methods depending on the body type
 * and reference frame:
 *
 * **Body Type Handling:**
 * - Stars (Sun): Stationary at origin in heliocentric mode
 * - Planets: Heliocentric orbital calculation using simplified circular orbits
 * - Satellites: Orbital calculation relative to parent body position
 *
 * **Reference Frame Support:**
 * - Heliocentric: Sun at origin, planets orbit in 3D space
 * - Geocentric: Earth at origin via position override, recalculates all positions
 *
 * **Position Override:**
 * When provided, skips orbital calculations and uses the override position directly.
 * This is used for geocentric mode where positions are pre-computed relative to Earth.
 *
 * The hook uses React's useMemo to cache calculations and only recompute when
 * dependencies change (time, reference frame, scale).
 *
 * @param data - Celestial body data with orbital parameters
 * @param context - Scene context with Julian day and reference frame
 * @param override - Optional position override for geocentric mode
 * @returns Calculated position with zodiac information
 *
 * @example
 * ```typescript
 * // Calculate Earth's position in heliocentric mode
 * const earthPosition = useBodyPosition(
 *   earthData,
 *   {
 *     julianDay: 2451545.0,  // J2000 epoch
 *     speed: 1.0,
 *     referenceFrame: 'heliocentric',
 *     scale: 2.0,
 *     showFootprints: true
 *   },
 *   null
 * )
 * // Result: { position: Vector3, eclipticLongitude: 100.46, zodiacSign: {...} }
 * ```
 *
 * @example
 * ```typescript
 * // Calculate Sun's position in geocentric mode (using override)
 * const sunPosition = useBodyPosition(
 *   sunData,
 *   geocentricContext,
 *   { x: 1.5, y: 0, z: 0.5, mode: 'geocentric' }
 * )
 * // Result uses override position, Sun appears to move relative to Earth
 * ```
 */
export function useBodyPosition(
  data: CelestialBodyData,
  context: SceneContext,
  override?: PositionOverride | null
): CalculatedPosition {
  return useMemo(() => {
    // Validate inputs
    if (!data) {
      console.error('[useBodyPosition] data is null or undefined')
      return {
        position: new THREE.Vector3(0, 0, 0),
        eclipticLongitude: 0,
        zodiacSign: undefined,
      }
    }

    if (!context || !isFinite(context.julianDay)) {
      console.error('[useBodyPosition] invalid context', context)
      return {
        position: new THREE.Vector3(0, 0, 0),
        eclipticLongitude: 0,
        zodiacSign: undefined,
      }
    }

    // Validate and sanitize scale
    const scale = isFinite(context.scale) && context.scale > 0 ? context.scale : 1.0
    if (context.scale !== scale) {
      console.warn(`[useBodyPosition] Invalid scale ${context.scale}, using ${scale}`)
    }

    // Create sanitized context
    const sanitizedContext = { ...context, scale }

    // If position override is provided (e.g., geocentric mode), use it
    if (override) {
      // Validate override values
      const x = isFinite(override.x) ? override.x : 0
      const y = isFinite(override.y) ? override.y : 0
      const z = isFinite(override.z) ? override.z : 0

      const position = new THREE.Vector3(
        x * sanitizedContext.scale,
        y * sanitizedContext.scale,
        z * sanitizedContext.scale
      )

      // Still calculate ecliptic longitude for zodiac sign
      const eclipticLongitude = calculateEclipticLongitude(data, sanitizedContext.julianDay)
      const zodiacSign = data.zodiacEnabled ? getZodiacSign(eclipticLongitude) : undefined

      return {
        position,
        eclipticLongitude,
        zodiacSign,
      }
    }

    // Handle stars (Sun) - stationary at origin in heliocentric mode
    if (data.type === 'star' && data.orbitRadius === 0) {
      return {
        position: new THREE.Vector3(0, 0, 0),
        eclipticLongitude: 0,
        zodiacSign: undefined,
      }
    }

    // Handle satellite positions (orbit around parent)
    if (data.parentId && sanitizedContext.bodyPositions) {
      const parentPosition = sanitizedContext.bodyPositions.get(data.parentId)
      if (parentPosition) {
        return calculateSatellitePosition(data, sanitizedContext, parentPosition)
      }
    }

    // Normal heliocentric calculation
    return calculateHeliocentricPosition(data, sanitizedContext)
  }, [data, context.julianDay, context.scale, context.referenceFrame, override])
}

/**
 * Calculate heliocentric position (orbit around Sun)
 *
 * Uses Keplerian orbital mechanics when complete orbital elements are available,
 * otherwise falls back to simplified circular orbit calculations for compatibility.
 *
 * **Keplerian Mode (when all elements present):**
 * - Solves Kepler's equation for eccentric anomaly
 * - Calculates true anomaly and orbital radius
 * - Applies 3D rotations: periapsis → inclination → ascending node
 * - Produces astronomically accurate elliptical orbits
 *
 * **Fallback Mode (simplified):**
 * - Circular orbit (ignoring eccentricity)
 * - Mean anomaly as proxy for true anomaly
 * - Basic inclination tilt
 *
 * @param data - Celestial body data with orbital parameters
 * @param context - Scene context with time and scale
 * @returns Calculated position with zodiac sign
 *
 * @see calculateOrbitalPosition - For Keplerian mechanics
 * @see getZodiacSign - For zodiac sign determination
 */
function calculateHeliocentricPosition(
  data: CelestialBodyData,
  context: SceneContext
): CalculatedPosition {
  // For known planets, use the professional astronomy-engine library
  // This ensures accuracy matches professional astronomical software
  const knownPlanets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
  if (knownPlanets.includes(data.id)) {
    try {
      const planetData = {
        name: data.name,
        color: data.color,
        radius: data.radius,
        orbitRadius: data.orbitRadius,
        orbitPeriod: data.orbitPeriod,
        inclination: data.inclination,
        rotationPeriod: data.rotationPeriod,
        symbol: data.symbol || '',
      }

      const pos = calculatePlanetPosition(planetData, context.julianDay)

      const position = new THREE.Vector3(
        pos.x * context.scale,
        pos.y * context.scale,
        pos.z * context.scale
      )

      const eclipticLongitude = normalizeAngle(pos.angle)
      const zodiacSign = data.zodiacEnabled ? getZodiacSign(eclipticLongitude) : undefined

      return {
        position,
        eclipticLongitude,
        zodiacSign,
      }
    } catch (error) {
      console.warn(`[useBodyPosition] astronomy-engine failed for ${data.id}, falling back to Keplerian`, error)
      // Fall through to Keplerian calculations
    }
  }

  // Check if body has complete Keplerian elements for accurate calculation
  const hasKeplerianElements =
    data.semiMajorAxis !== undefined &&
    data.eccentricity !== undefined &&
    data.longitudeOfAscendingNode !== undefined &&
    data.argumentOfPeriapsis !== undefined &&
    data.meanLongitudeAtEpoch !== undefined

  if (hasKeplerianElements) {
    // Use accurate Keplerian orbital mechanics
    const elements: KeplerianElements = {
      semiMajorAxis: data.semiMajorAxis!,
      eccentricity: data.eccentricity!,
      inclination: data.inclination,
      longitudeOfAscendingNode: data.longitudeOfAscendingNode!,
      argumentOfPeriapsis: data.argumentOfPeriapsis!,
      meanLongitudeAtEpoch: data.meanLongitudeAtEpoch!,
      period: data.orbitPeriod,
    }

    const orbitalPos = calculateOrbitalPosition(elements, context.julianDay)

    // Apply scale and convert to THREE.Vector3
    const position = new THREE.Vector3(
      orbitalPos.x * context.scale,
      orbitalPos.y * context.scale,
      orbitalPos.z * context.scale
    )

    // Calculate ecliptic longitude from position
    // In Three.js coords (XZ = ecliptic, Y = up), longitude is atan2(z, x)
    // orbitalPos already has the coordinate swap applied in calculateOrbitalPosition
    const eclipticLongitude = normalizeAngle(
      radiansToDegrees(Math.atan2(orbitalPos.z, orbitalPos.x))
    )

    const zodiacSign = data.zodiacEnabled ? getZodiacSign(eclipticLongitude) : undefined

    return {
      position,
      eclipticLongitude,
      zodiacSign,
    }
  } else {
    // FALLBACK: Use simplified circular orbit for bodies without Keplerian elements
    // This maintains backward compatibility with custom/fictional bodies
    const days = daysSinceJ2000(context.julianDay)
    const meanAnomaly = calculateMeanAnomaly(data.orbitPeriod, days)
    const angle = degreesToRadians(meanAnomaly)

    const inclinationRad = degreesToRadians(data.inclination)

    const x = data.orbitRadius * Math.cos(angle) * context.scale
    const y = data.orbitRadius * Math.sin(inclinationRad) * Math.sin(angle) * context.scale
    const z = data.orbitRadius * Math.sin(angle) * Math.cos(inclinationRad) * context.scale

    const position = new THREE.Vector3(x, y, z)
    const eclipticLongitude = normalizeAngle(meanAnomaly)
    const zodiacSign = data.zodiacEnabled ? getZodiacSign(eclipticLongitude) : undefined

    return {
      position,
      eclipticLongitude,
      zodiacSign,
    }
  }
}

/**
 * Calculate satellite position (orbit around parent body)
 *
 * Computes satellite position relative to its parent body (e.g., Moon around Earth).
 * Uses Keplerian mechanics when available, otherwise falls back to simplified calculations.
 *
 * **Keplerian Mode:**
 * - Accurate elliptical orbit calculation
 * - Position computed relative to parent body center
 * - Supports eccentric orbits with proper anomaly calculations
 *
 * **Fallback Mode:**
 * - Simplified circular orbit
 * - Basic inclination handling
 *
 * **Process:**
 * 1. Calculate satellite's position relative to parent (using orbital parameters)
 * 2. Add parent's world-space position to get final position
 * 3. Return position with relative ecliptic longitude (no zodiac for satellites)
 *
 * **Note:** Satellites don't have zodiac signs as they don't directly track
 * ecliptic longitude in the traditional sense.
 *
 * @param data - Satellite body data with orbital parameters
 * @param context - Scene context with time and scale
 * @param parentPosition - Parent body's 3D position in world space
 * @returns Calculated satellite position (no zodiac sign)
 *
 * @example
 * ```typescript
 * // Calculate Moon's position relative to Earth
 * const moonPos = calculateSatellitePosition(
 *   moonData,
 *   context,
 *   earthPosition  // Earth's world-space position
 * )
 * ```
 */
function calculateSatellitePosition(
  data: CelestialBodyData,
  context: SceneContext,
  parentPosition: THREE.Vector3
): CalculatedPosition {
  // Check for Keplerian elements
  const hasKeplerianElements =
    data.semiMajorAxis !== undefined &&
    data.eccentricity !== undefined &&
    data.longitudeOfAscendingNode !== undefined &&
    data.argumentOfPeriapsis !== undefined &&
    data.meanLongitudeAtEpoch !== undefined

  if (hasKeplerianElements) {
    // Use Keplerian mechanics for satellite
    const elements: KeplerianElements = {
      semiMajorAxis: data.semiMajorAxis!,
      eccentricity: data.eccentricity!,
      inclination: data.inclination,
      longitudeOfAscendingNode: data.longitudeOfAscendingNode!,
      argumentOfPeriapsis: data.argumentOfPeriapsis!,
      meanLongitudeAtEpoch: data.meanLongitudeAtEpoch!,
      period: data.orbitPeriod,
    }

    const orbitalPos = calculateOrbitalPosition(elements, context.julianDay)

    // Add parent position (satellite orbits parent, not Sun)
    const position = new THREE.Vector3(
      (parentPosition.x / context.scale + orbitalPos.x) * context.scale,
      (parentPosition.y / context.scale + orbitalPos.y) * context.scale,
      (parentPosition.z / context.scale + orbitalPos.z) * context.scale
    )

    // In Three.js coords (XZ = ecliptic, Y = up), longitude is atan2(z, x)
    const eclipticLongitude = normalizeAngle(
      radiansToDegrees(Math.atan2(orbitalPos.z, orbitalPos.x))
    )

    return {
      position,
      eclipticLongitude,
      zodiacSign: undefined, // Satellites don't have zodiac signs
    }
  } else {
    // FALLBACK: Original simplified calculation
    const days = daysSinceJ2000(context.julianDay)
    const meanAnomaly = calculateMeanAnomaly(data.orbitPeriod, days)
    const angle = degreesToRadians(meanAnomaly)

    const inclinationRad = degreesToRadians(data.inclination)

    const relativeX = data.orbitRadius * Math.cos(angle) * context.scale
    const relativeY = data.orbitRadius * Math.sin(inclinationRad) * Math.sin(angle) * context.scale
    const relativeZ = data.orbitRadius * Math.sin(angle) * Math.cos(inclinationRad) * context.scale

    const position = new THREE.Vector3(
      parentPosition.x + relativeX,
      parentPosition.y + relativeY,
      parentPosition.z + relativeZ
    )

    const eclipticLongitude = normalizeAngle(meanAnomaly)

    return {
      position,
      eclipticLongitude,
      zodiacSign: undefined,
    }
  }
}

/**
 * Calculate ecliptic longitude from orbital parameters
 *
 * Determines the body's position along the ecliptic (0-360 degrees),
 * measured from the vernal equinox (Aries 0°). This is used for
 * zodiac sign determination and astrological calculations.
 *
 * **Keplerian Mode:** Calculates accurate longitude using orbital position
 * **Fallback Mode:** Uses mean anomaly as approximation (circular orbit)
 *
 * @param data - Celestial body data with orbital parameters
 * @param julianDay - Current Julian day for time calculation
 * @returns Ecliptic longitude in degrees (0-360)
 *
 * @see normalizeAngle - For ensuring result is in [0, 360) range
 */
function calculateEclipticLongitude(data: CelestialBodyData, julianDay: number): number {
  const hasKeplerianElements =
    data.semiMajorAxis !== undefined &&
    data.eccentricity !== undefined &&
    data.longitudeOfAscendingNode !== undefined &&
    data.argumentOfPeriapsis !== undefined &&
    data.meanLongitudeAtEpoch !== undefined

  if (hasKeplerianElements) {
    // Use Keplerian calculation for accurate longitude
    const elements: KeplerianElements = {
      semiMajorAxis: data.semiMajorAxis!,
      eccentricity: data.eccentricity!,
      inclination: data.inclination,
      longitudeOfAscendingNode: data.longitudeOfAscendingNode!,
      argumentOfPeriapsis: data.argumentOfPeriapsis!,
      meanLongitudeAtEpoch: data.meanLongitudeAtEpoch!,
      period: data.orbitPeriod,
    }

    const orbitalPos = calculateOrbitalPosition(elements, julianDay)
    // In Three.js coords (XZ = ecliptic, Y = up), longitude is atan2(z, x)
    return normalizeAngle(radiansToDegrees(Math.atan2(orbitalPos.z, orbitalPos.x)))
  } else {
    // FALLBACK: Simplified calculation
    const days = daysSinceJ2000(julianDay)
    const meanAnomaly = calculateMeanAnomaly(data.orbitPeriod, days)
    return normalizeAngle(meanAnomaly)
  }
}
