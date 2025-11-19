/**
 * Batched Position Calculation Hook
 *
 * Calculates positions for all celestial bodies in a single pass, rather than
 * having each body independently compute its position. This provides:
 *
 * - **Performance**: Calculate all positions once per frame instead of N times
 * - **Consistency**: All bodies use the same Julian day snapshot
 * - **Optimization**: Enables future Web Worker implementation
 * - **Debugging**: Single point to monitor all position calculations
 *
 * Algorithm: Two-pass approach
 * 1. First pass: Calculate all non-satellite bodies (stars, planets)
 * 2. Second pass: Calculate satellites using parent positions from pass 1
 *
 * @module useAllBodyPositions
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import type { CelestialBodyData, SceneContext, CalculatedPosition } from '../types'
import { calculateOrbitalPosition } from '../utils/orbitalMechanics'
import type { KeplerianElements } from '../types/celestialBody'
import {
  daysSinceJ2000,
  calculateMeanAnomaly,
  degreesToRadians,
  normalizeAngle,
  radiansToDegrees,
} from '../utils/calculations'
import { getZodiacSign } from '@/lib/astronomy/planetaryData'

/**
 * Calculate positions for all celestial bodies in a single pass
 *
 * This hook is more efficient than calculating each body independently because:
 * - Positions are computed once per Julian day update (memoized)
 * - All calculations happen in one render cycle (consistent state)
 * - Parent positions are cached for satellite calculations
 * - Enables future optimizations like Web Workers or LOD systems
 *
 * Performance characteristics:
 * - Time complexity: O(n) where n = number of bodies
 * - Space complexity: O(n) for position map storage
 * - Memoization prevents recalculation when inputs unchanged
 *
 * @param bodies - Array of all celestial bodies to calculate
 * @param context - Scene context with Julian day and scale
 * @returns Map of body ID to calculated position data (O(1) lookup)
 *
 * @example
 * ```typescript
 * // In parent component
 * const positions = useAllBodyPositions(celestialBodies, sceneContext)
 *
 * // In child components
 * const earthPos = positions.get('earth')
 * if (earthPos) {
 *   sphere.position.copy(earthPos.position)
 * }
 * ```
 *
 * @see CelestialBody component - Will consume these positions in future
 * @see useBodyPosition - Current per-body implementation (to be replaced)
 */
export function useAllBodyPositions(
  bodies: CelestialBodyData[],
  context: SceneContext
): Map<string, CalculatedPosition> {
  return useMemo(() => {
    const positions = new Map<string, CalculatedPosition>()

    // ===== First Pass: Non-Satellite Bodies =====
    // Calculate stars and planets first since satellites depend on them
    for (const body of bodies) {
      if (body.parentId) {
        // Skip satellites - will be calculated in second pass
        continue
      }

      const position = calculateBodyPosition(body, context)
      positions.set(body.id, position)
    }

    // ===== Second Pass: Satellite Bodies =====
    // Now that parent positions are available, calculate satellites
    for (const body of bodies) {
      if (!body.parentId) {
        // Already calculated in first pass
        continue
      }

      const parentPosition = positions.get(body.parentId)
      if (parentPosition) {
        const position = calculateSatellitePosition(
          body,
          context,
          parentPosition.position
        )
        positions.set(body.id, position)
      } else {
        console.warn(
          `[useAllBodyPositions] Parent "${body.parentId}" not found for satellite "${body.id}"`
        )
      }
    }

    return positions
  }, [bodies, context.julianDay, context.scale, context.referenceFrame])
}

/**
 * Calculate position for a single non-satellite body
 *
 * Handles two calculation methods:
 * 1. **Keplerian mechanics**: High-precision orbital elements (preferred)
 * 2. **Simplified circular**: Fallback for bodies without full Keplerian data
 *
 * @param data - Body data with orbital parameters
 * @param context - Scene context with time and scale
 * @returns Calculated position with 3D coordinates and zodiac info
 */
function calculateBodyPosition(
  data: CelestialBodyData,
  context: SceneContext
): CalculatedPosition {
  // ===== Special Case: Stars at Origin =====
  if (data.type === 'star' && data.orbitRadius === 0) {
    return {
      position: new THREE.Vector3(0, 0, 0),
      eclipticLongitude: 0,
      zodiacSign: undefined,
    }
  }

  // ===== Check for Complete Keplerian Elements =====
  const hasKeplerianElements =
    data.semiMajorAxis !== undefined &&
    data.eccentricity !== undefined &&
    data.longitudeOfAscendingNode !== undefined &&
    data.argumentOfPeriapsis !== undefined &&
    data.meanLongitudeAtEpoch !== undefined

  if (hasKeplerianElements) {
    // ----- Method 1: Keplerian Mechanics -----
    const elements: KeplerianElements = {
      semiMajorAxis: data.semiMajorAxis!,
      eccentricity: data.eccentricity!,
      inclination: data.inclination,
      longitudeOfAscendingNode: data.longitudeOfAscendingNode!,
      argumentOfPeriapsis: data.argumentOfPeriapsis!,
      meanLongitudeAtEpoch: data.meanLongitudeAtEpoch!,
      period: data.orbitPeriod,
    }

    // Calculate precise orbital position using Kepler's equations
    const orbitalPos = calculateOrbitalPosition(elements, context.julianDay)

    // Scale from AU to scene units
    const position = new THREE.Vector3(
      orbitalPos.x * context.scale,
      orbitalPos.y * context.scale,
      orbitalPos.z * context.scale
    )

    // Calculate ecliptic longitude for zodiac sign
    const eclipticLongitude = normalizeAngle(
      radiansToDegrees(Math.atan2(orbitalPos.y, orbitalPos.x))
    )

    // Get zodiac sign if enabled
    const zodiacSign = data.zodiacEnabled
      ? getZodiacSign(eclipticLongitude)
      : undefined

    return { position, eclipticLongitude, zodiacSign }
  } else {
    // ----- Method 2: Simplified Circular Orbit -----
    // Fallback for bodies without complete Keplerian elements
    const days = daysSinceJ2000(context.julianDay)
    const meanAnomaly = calculateMeanAnomaly(data.orbitPeriod, days)
    const angle = degreesToRadians(meanAnomaly)
    const inclinationRad = degreesToRadians(data.inclination)

    // Calculate position on circular orbit with inclination
    const x = data.orbitRadius * Math.cos(angle) * context.scale
    const y =
      data.orbitRadius *
      Math.sin(inclinationRad) *
      Math.sin(angle) *
      context.scale
    const z =
      data.orbitRadius *
      Math.sin(angle) *
      Math.cos(inclinationRad) *
      context.scale

    const position = new THREE.Vector3(x, y, z)
    const eclipticLongitude = normalizeAngle(meanAnomaly)

    const zodiacSign = data.zodiacEnabled
      ? getZodiacSign(eclipticLongitude)
      : undefined

    return { position, eclipticLongitude, zodiacSign }
  }
}

/**
 * Calculate satellite position relative to parent body
 *
 * Satellites orbit their parent bodies (e.g., Moon orbits Earth).
 * This function calculates the satellite's position in the parent's
 * reference frame, then transforms to the global reference frame.
 *
 * @param data - Satellite body data
 * @param context - Scene context
 * @param parentPosition - Parent body's 3D position (from first pass)
 * @returns Calculated position in global reference frame
 */
function calculateSatellitePosition(
  data: CelestialBodyData,
  context: SceneContext,
  parentPosition: THREE.Vector3
): CalculatedPosition {
  // ===== Check for Keplerian Elements =====
  const hasKeplerianElements =
    data.semiMajorAxis !== undefined && data.eccentricity !== undefined

  if (hasKeplerianElements) {
    // ----- Method 1: Keplerian Mechanics -----
    const elements: KeplerianElements = {
      semiMajorAxis: data.semiMajorAxis!,
      eccentricity: data.eccentricity ?? 0,
      inclination: data.inclination,
      longitudeOfAscendingNode: data.longitudeOfAscendingNode ?? 0,
      argumentOfPeriapsis: data.argumentOfPeriapsis ?? 0,
      meanLongitudeAtEpoch: data.meanLongitudeAtEpoch ?? 0,
      period: data.orbitPeriod,
    }

    // Calculate position in parent-relative frame
    const orbitalPos = calculateOrbitalPosition(elements, context.julianDay)

    // Transform to global frame: parent + satellite_offset
    const position = new THREE.Vector3(
      (parentPosition.x / context.scale + orbitalPos.x) * context.scale,
      (parentPosition.y / context.scale + orbitalPos.y) * context.scale,
      (parentPosition.z / context.scale + orbitalPos.z) * context.scale
    )

    const eclipticLongitude = normalizeAngle(
      radiansToDegrees(Math.atan2(orbitalPos.y, orbitalPos.x))
    )

    // Satellites don't use zodiac signs
    return { position, eclipticLongitude, zodiacSign: undefined }
  } else {
    // ----- Method 2: Simplified Circular Orbit -----
    const days = daysSinceJ2000(context.julianDay)
    const meanAnomaly = calculateMeanAnomaly(data.orbitPeriod, days)
    const angle = degreesToRadians(meanAnomaly)
    const inclinationRad = degreesToRadians(data.inclination)

    // Calculate offset in parent's reference frame
    const relativeX = data.orbitRadius * Math.cos(angle) * context.scale
    const relativeY =
      data.orbitRadius *
      Math.sin(inclinationRad) *
      Math.sin(angle) *
      context.scale
    const relativeZ =
      data.orbitRadius *
      Math.sin(angle) *
      Math.cos(inclinationRad) *
      context.scale

    // Add parent position to get global position
    const position = new THREE.Vector3(
      parentPosition.x + relativeX,
      parentPosition.y + relativeY,
      parentPosition.z + relativeZ
    )

    const eclipticLongitude = normalizeAngle(meanAnomaly)

    return { position, eclipticLongitude, zodiacSign: undefined }
  }
}
