/**
 * Mathematical utility functions for astronomical calculations
 * Provides consistent implementations across the codebase
 */

import { MATH_CONSTANTS, JULIAN_CONSTANTS } from '../constants'

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * MATH_CONSTANTS.RADIANS_PER_DEGREE
}

/**
 * Convert radians to degrees
 * @param radians Angle in radians
 * @returns Angle in degrees
 */
export function radiansToDegrees(radians: number): number {
  return radians * MATH_CONSTANTS.DEGREES_PER_RADIAN
}

/**
 * Normalize an angle to the range [0, 360) degrees
 * Handles negative angles and angles > 360
 *
 * @param angle Angle in degrees
 * @returns Normalized angle in range [0, 360)
 *
 * @example
 * normalizeAngle(370) // returns 10
 * normalizeAngle(-45) // returns 315
 * normalizeAngle(0) // returns 0
 * normalizeAngle(360) // returns 0
 */
export function normalizeAngle(angle: number): number {
  const normalized = angle % MATH_CONSTANTS.DEGREES_PER_CIRCLE
  return normalized < 0
    ? normalized + MATH_CONSTANTS.DEGREES_PER_CIRCLE
    : normalized
}

/**
 * Calculate mean anomaly (M) from orbital period and time
 * Mean anomaly is the fraction of an orbital period that has elapsed since periapsis
 *
 * @param orbitPeriod Orbital period in Earth days
 * @param daysSinceEpoch Days elapsed since reference epoch (J2000)
 * @returns Mean anomaly in degrees [0, 360)
 *
 * @example
 * // Earth after one year
 * calculateMeanAnomaly(365.25, 365.25) // returns ~360 (one full orbit)
 */
export function calculateMeanAnomaly(
  orbitPeriod: number,
  daysSinceEpoch: number
): number {
  // Handle zero or negative orbit period
  if (orbitPeriod <= 0) {
    // This is expected for stationary bodies like the Sun or Earth in geocentric mode
    return 0
  }

  // Handle invalid days
  if (!isFinite(daysSinceEpoch) || isNaN(daysSinceEpoch)) {
    console.warn(`[Calculations] Invalid daysSinceEpoch: ${daysSinceEpoch}. Using 0.`)
    daysSinceEpoch = 0
  }

  const meanAnomaly = (MATH_CONSTANTS.DEGREES_PER_CIRCLE / orbitPeriod) * daysSinceEpoch
  return normalizeAngle(meanAnomaly)
}

/**
 * Calculate days elapsed since J2000.0 epoch
 *
 * @param julianDay Current Julian Day
 * @returns Days since J2000.0 epoch
 */
export function daysSinceJ2000(julianDay: number): number {
  return julianDay - JULIAN_CONSTANTS.J2000_EPOCH
}

/**
 * Linear interpolation between two values
 *
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor [0, 1]
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Clamp a value between min and max
 *
 * @param value Value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculate angle in degrees from Cartesian coordinates
 * Returns angle in range [0, 360)
 *
 * @param x X coordinate
 * @param z Z coordinate
 * @returns Angle in degrees
 */
export function calculateAngleFromCoordinates(x: number, z: number): number {
  const angleRadians = Math.atan2(z, x)
  const angleDegrees = radiansToDegrees(angleRadians)
  return normalizeAngle(angleDegrees)
}
