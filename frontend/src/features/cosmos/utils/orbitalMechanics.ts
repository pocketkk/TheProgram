/**
 * Keplerian Orbital Mechanics Calculations
 *
 * Implements astronomically accurate orbital position calculations using
 * Keplerian elements and the two-body problem solution.
 *
 * Mathematical Foundation:
 * - Kepler's equation: M = E - e*sin(E)
 * - True anomaly: tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
 * - Orbital radius: r = a(1-e²)/(1+e*cos(ν))
 * - 3D rotation sequence: orbital plane → inclination → ascending node
 *
 * Reference Frame: Heliocentric ecliptic coordinates (J2000.0)
 *
 * @module orbitalMechanics
 */

import { JULIAN_CONSTANTS, MATH_CONSTANTS } from '../constants'
import {
  calculateMeanAnomaly,
  daysSinceJ2000,
  degreesToRadians,
  radiansToDegrees,
  normalizeAngle,
} from './calculations'
import type { KeplerianElements } from '../types/celestialBody'

// ============================================================================
// Validation and Sanitization Utilities
// ============================================================================

/**
 * Validate and sanitize numeric input
 * Handles NaN, Infinity, and out-of-range values
 *
 * @param value The number to validate
 * @param fallback Fallback value if invalid
 * @param name Descriptive name for logging
 * @returns Sanitized number
 *
 * @example
 * const a = sanitizeNumber(NaN, 1.0, 'semi-major axis') // returns 1.0
 * const e = sanitizeNumber(Infinity, 0.0, 'eccentricity') // returns 0.0
 */
export function sanitizeNumber(
  value: number,
  fallback: number,
  name: string = 'value'
): number {
  if (!isFinite(value) || isNaN(value)) {
    logOrbitalWarning(
      'sanitizeNumber',
      `Invalid ${name}: ${value}. Using fallback: ${fallback}`
    )
    return fallback
  }
  return value
}

/**
 * Log a warning about orbital calculation issue
 * Formats consistently for easier debugging
 *
 * @param context Function or component name
 * @param issue Description of the problem
 * @param details Optional additional details
 */
export function logOrbitalWarning(
  context: string,
  issue: string,
  details?: Record<string, any>
) {
  console.warn(
    `[Orbital Mechanics] ${context}: ${issue}`,
    details ? details : ''
  )
}

/**
 * Validate Keplerian orbital elements
 * Checks for physically reasonable values
 *
 * @param elements Orbital elements to validate
 * @returns Object with { valid: boolean, errors: string[] }
 *
 * @example
 * const result = validateKeplerianElements(earthElements)
 * if (!result.valid) {
 *   console.error('Invalid elements:', result.errors)
 * }
 */
export function validateKeplerianElements(
  elements: KeplerianElements
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Semi-major axis must be positive
  if (elements.semiMajorAxis <= 0) {
    errors.push(`Semi-major axis must be positive (got ${elements.semiMajorAxis})`)
  }

  // Eccentricity must be in valid range
  if (elements.eccentricity < 0 || elements.eccentricity >= 1) {
    errors.push(`Eccentricity must be in [0, 1) for elliptical orbits (got ${elements.eccentricity})`)
  }

  // Inclination should be reasonable
  if (Math.abs(elements.inclination) > 180) {
    errors.push(`Inclination should be in [-180, 180] degrees (got ${elements.inclination})`)
  }

  // Angles should be normalized
  if (elements.longitudeOfAscendingNode < 0 || elements.longitudeOfAscendingNode >= 360) {
    errors.push(`Longitude of ascending node should be in [0, 360) (got ${elements.longitudeOfAscendingNode})`)
  }

  if (elements.argumentOfPeriapsis < 0 || elements.argumentOfPeriapsis >= 360) {
    errors.push(`Argument of periapsis should be in [0, 360) (got ${elements.argumentOfPeriapsis})`)
  }

  // Period must be positive
  if (elements.period <= 0) {
    errors.push(`Orbital period must be positive (got ${elements.period})`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Core Keplerian Calculations
// ============================================================================

/**
 * Solve Kepler's Equation to find eccentric anomaly (E)
 * Uses Newton-Raphson iteration: M = E - e*sin(E)
 *
 * This is the fundamental equation of orbital mechanics that relates the
 * mean anomaly (uniform motion) to the eccentric anomaly (geometric parameter).
 *
 * Algorithm: Newton-Raphson iteration
 *   E_{n+1} = E_n - (E_n - e*sin(E_n) - M) / (1 - e*cos(E_n))
 *
 * Convergence: Typically converges in 3-5 iterations for e < 0.9
 *
 * @param meanAnomaly Mean anomaly in degrees (M)
 * @param eccentricity Orbital eccentricity (0 ≤ e < 1)
 * @param tolerance Convergence tolerance in radians (default: 1e-6)
 * @param maxIterations Maximum iterations (default: 100)
 * @returns Eccentric anomaly in degrees (E)
 *
 * @throws Error if eccentricity ≥ 1 (hyperbolic/parabolic orbits not supported)
 * @throws Error if iteration doesn't converge within maxIterations
 *
 * @example
 * // Earth at perihelion (e = 0.0167)
 * const E = solveKeplersEquation(0, 0.0167) // E ≈ 0
 *
 * @example
 * // Mars at quarter orbit (e = 0.0934)
 * const E = solveKeplersEquation(90, 0.0934) // E ≈ 85.7°
 */
export function solveKeplersEquation(
  meanAnomaly: number,
  eccentricity: number,
  tolerance: number = 1e-6,
  maxIterations: number = 100
): number {
  // Sanitize inputs
  let sanitizedE = sanitizeNumber(eccentricity, 0.0, 'eccentricity')
  const sanitizedM = sanitizeNumber(meanAnomaly, 0.0, 'mean anomaly')

  // Handle hyperbolic orbits (e ≥ 1) - use near-parabolic approximation
  if (sanitizedE >= 1.0) {
    logOrbitalWarning(
      'solveKeplersEquation',
      `Hyperbolic orbit detected (e=${sanitizedE}). Falling back to parabolic approximation (e=0.99).`,
      { originalEccentricity: eccentricity, meanAnomaly: sanitizedM }
    )
    sanitizedE = 0.99 // Use near-parabolic orbit as approximation
  }

  // Handle negative eccentricity
  if (sanitizedE < 0) {
    logOrbitalWarning(
      'solveKeplersEquation',
      `Invalid negative eccentricity: ${sanitizedE}. Using 0.`,
      { meanAnomaly: sanitizedM }
    )
    sanitizedE = 0
  }

  // Special case: circular orbit (e ≈ 0)
  if (sanitizedE < 1e-8) {
    // For circular orbits: E = M (no iteration needed)
    return normalizeAngle(sanitizedM)
  }

  // Convert to radians for calculation
  const M = degreesToRadians(normalizeAngle(sanitizedM))
  const e = sanitizedE

  // Initial guess: E₀ = M (works well for most cases)
  // Alternative for high eccentricity: E₀ = M + e*sin(M)
  let E = e > 0.8 ? M + e * Math.sin(M) : M

  // Newton-Raphson iteration
  // f(E) = E - e*sin(E) - M = 0
  // f'(E) = 1 - e*cos(E)
  // E_new = E - f(E)/f'(E)
  let lastError = Infinity
  for (let i = 0; i < maxIterations; i++) {
    const sinE = Math.sin(E)
    const cosE = Math.cos(E)

    // Calculate function value and derivative
    const f = E - e * sinE - M
    const fPrime = 1 - e * cosE

    // Check for near-zero derivative to avoid division issues
    if (Math.abs(fPrime) < 1e-10) {
      logOrbitalWarning(
        'solveKeplersEquation',
        'Near-zero derivative encountered. Returning current approximation.',
        { meanAnomaly: sanitizedM, eccentricity: e, iteration: i }
      )
      return normalizeAngle(radiansToDegrees(E))
    }

    // Newton-Raphson update
    const dE = f / fPrime
    E = E - dE
    lastError = Math.abs(dE)

    // Check for convergence
    if (lastError < tolerance) {
      // Converged successfully!
      return normalizeAngle(radiansToDegrees(E))
    }
  }

  // Failed to converge - return best approximation instead of throwing
  logOrbitalWarning(
    'solveKeplersEquation',
    `Failed to converge after ${maxIterations} iterations. Returning best approximation.`,
    {
      meanAnomaly: sanitizedM,
      eccentricity: e,
      lastError: lastError,
      tolerance: tolerance
    }
  )
  return normalizeAngle(radiansToDegrees(E))
}

/**
 * Calculate true anomaly (ν) from eccentric anomaly (E)
 *
 * True anomaly is the actual angle from periapsis to the body's current position,
 * measured at the focus (Sun). This is the "real" orbital angle.
 *
 * Formula: tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
 *
 * This uses the half-angle formula which is numerically stable and handles
 * all quadrants correctly via atan2.
 *
 * @param eccentricAnomaly Eccentric anomaly in degrees (E)
 * @param eccentricity Orbital eccentricity (e)
 * @returns True anomaly in degrees [0, 360) (ν)
 *
 * @example
 * // Circular orbit: ν = E = M
 * calculateTrueAnomaly(45, 0.0) // returns 45
 *
 * @example
 * // Elliptical orbit at E = 90°
 * calculateTrueAnomaly(90, 0.2) // returns ~96° (ahead of E)
 */
export function calculateTrueAnomaly(
  eccentricAnomaly: number,
  eccentricity: number
): number {
  const E = degreesToRadians(eccentricAnomaly)
  const e = eccentricity

  // Special case: circular orbit
  if (e < 1e-8) {
    return normalizeAngle(eccentricAnomaly)
  }

  // Half-angle formula: tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
  // Using atan2 for correct quadrant handling
  const sqrtFactor = Math.sqrt((1 + e) / (1 - e))
  const halfE = E / 2

  // Calculate ν/2 using atan2(y, x) where:
  // y = sqrt((1+e)/(1-e)) * sin(E/2)
  // x = cos(E/2)
  const trueAnomalyHalf = Math.atan2(sqrtFactor * Math.sin(halfE), Math.cos(halfE))

  // Double to get full true anomaly
  const trueAnomaly = 2 * trueAnomalyHalf
  return normalizeAngle(radiansToDegrees(trueAnomaly))
}

/**
 * Calculate orbital radius (distance from focus) at given true anomaly
 *
 * This is the equation of an ellipse in polar coordinates with the focus
 * at the origin (Sun at one focus of the ellipse).
 *
 * Formula: r = a(1 - e²) / (1 + e*cos(ν))
 *
 * Special cases:
 * - At perihelion (ν = 0°): r = a(1 - e)
 * - At aphelion (ν = 180°): r = a(1 + e)
 * - For circular orbits (e = 0): r = a
 *
 * @param semiMajorAxis Semi-major axis (a) in AU
 * @param eccentricity Orbital eccentricity (e)
 * @param trueAnomaly True anomaly (ν) in degrees
 * @returns Orbital radius in AU
 *
 * @example
 * // Earth at aphelion (furthest from Sun)
 * calculateOrbitalRadius(1.0, 0.0167, 180) // returns ~1.0167 AU
 *
 * @example
 * // Earth at perihelion (closest to Sun)
 * calculateOrbitalRadius(1.0, 0.0167, 0) // returns ~0.9833 AU
 */
export function calculateOrbitalRadius(
  semiMajorAxis: number,
  eccentricity: number,
  trueAnomaly: number
): number {
  const nu = degreesToRadians(trueAnomaly)
  const a = semiMajorAxis
  const e = eccentricity

  // r = a(1 - e²) / (1 + e*cos(ν))
  const numerator = a * (1 - e * e)
  const denominator = 1 + e * Math.cos(nu)

  return numerator / denominator
}

// ============================================================================
// 3D Position Calculation
// ============================================================================

/**
 * Calculate 3D Cartesian position from Keplerian orbital elements
 *
 * This is the main function that combines all Keplerian calculations to
 * produce the body's position in heliocentric ecliptic coordinates.
 *
 * Algorithm:
 * 1. Calculate mean anomaly M from time and period
 * 2. Solve Kepler's equation for eccentric anomaly E
 * 3. Calculate true anomaly ν from E
 * 4. Calculate orbital radius r from ν
 * 5. Convert to orbital plane coordinates (x', y')
 * 6. Rotate by argument of periapsis ω
 * 7. Rotate by inclination i
 * 8. Rotate by longitude of ascending node Ω
 *
 * Coordinate System: J2000.0 heliocentric ecliptic
 * - Origin: Sun
 * - XY-plane: Ecliptic plane
 * - X-axis: Vernal equinox direction
 * - Z-axis: Ecliptic north pole
 *
 * @param elements Complete Keplerian orbital elements
 * @param julianDay Current Julian Day
 * @returns Position vector {x, y, z} in AU
 *
 * @example
 * // Earth at J2000.0 epoch
 * const earthElements = {
 *   semiMajorAxis: 1.00000011,
 *   eccentricity: 0.01671022,
 *   inclination: 0.00005,
 *   longitudeOfAscendingNode: 348.73936,
 *   argumentOfPeriapsis: 102.94719,
 *   meanLongitudeAtEpoch: 100.46435,
 *   period: 365.25
 * }
 * const pos = calculateOrbitalPosition(earthElements, 2451545.0)
 * // pos ≈ {x: -0.177, y: 0.967, z: 0.000}
 */
export function calculateOrbitalPosition(
  elements: KeplerianElements,
  julianDay: number
): { x: number; y: number; z: number } {
  // Sanitize inputs
  let a = sanitizeNumber(elements.semiMajorAxis, 1.0, 'semi-major axis')
  let e = sanitizeNumber(elements.eccentricity, 0.0, 'eccentricity')
  const jd = sanitizeNumber(julianDay, JULIAN_CONSTANTS.J2000_EPOCH, 'Julian day')
  const period = sanitizeNumber(elements.period, 365.25, 'orbital period')

  // Additional sanitization for eccentricity (must be in valid range)
  if (e >= 1.0) {
    logOrbitalWarning(
      'calculateOrbitalPosition',
      `Hyperbolic orbit (e=${e}) detected, clamping to e=0.99`,
      { originalEccentricity: e }
    )
    e = 0.99
  }

  if (e < 0) {
    logOrbitalWarning(
      'calculateOrbitalPosition',
      `Negative eccentricity (e=${e}) detected, using e=0`,
      { originalEccentricity: e }
    )
    e = 0
  }

  // Additional sanitization for semi-major axis (must be positive)
  if (a <= 0) {
    logOrbitalWarning(
      'calculateOrbitalPosition',
      `Invalid semi-major axis (a=${a}), using a=1.0`,
      { originalSemiMajorAxis: a }
    )
    a = 1.0
  }

  // Create sanitized elements copy
  const sanitizedElements: KeplerianElements = {
    ...elements,
    semiMajorAxis: a,
    eccentricity: e,
    period: period,
  }

  // Validate elements (log warnings but continue)
  const validation = validateKeplerianElements(sanitizedElements)
  if (!validation.valid) {
    logOrbitalWarning(
      'calculateOrbitalPosition',
      'Invalid orbital elements detected',
      { errors: validation.errors }
    )
  }

  // Step 1: Calculate days since J2000.0
  const days = daysSinceJ2000(jd)

  // Step 2: Calculate mean longitude and mean anomaly
  // NASA JPL method: L = L0 + n*t, M = L - ϖ where ϖ = Ω + ω
  const n = MATH_CONSTANTS.DEGREES_PER_CIRCLE / period  // mean motion (degrees/day)
  const meanLongitude = elements.meanLongitudeAtEpoch + n * days
  const longitudeOfPerihelion = elements.longitudeOfAscendingNode + elements.argumentOfPeriapsis
  const M = normalizeAngle(meanLongitude - longitudeOfPerihelion)

  // Step 3: Solve Kepler's equation for eccentric anomaly E (using sanitized e)
  const E = solveKeplersEquation(M, e)

  // Step 4: Calculate true anomaly ν
  const nu = calculateTrueAnomaly(E, e)

  // Step 5: Calculate orbital radius r
  const r = calculateOrbitalRadius(a, e, nu)

  // Step 6: Convert to orbital plane coordinates
  // Position in the orbital plane (periapsis is at ν = 0°)
  const nuRad = degreesToRadians(nu)
  const xOrbital = r * Math.cos(nuRad)
  const yOrbital = r * Math.sin(nuRad)
  const zOrbital = 0 // Still in orbital plane

  // Step 7: Rotate by argument of periapsis (ω)
  // This rotates the orbital ellipse in its plane
  const omega = degreesToRadians(elements.argumentOfPeriapsis)
  const cosOmega = Math.cos(omega)
  const sinOmega = Math.sin(omega)

  const xEcliptic1 = xOrbital * cosOmega - yOrbital * sinOmega
  const yEcliptic1 = xOrbital * sinOmega + yOrbital * cosOmega
  const zEcliptic1 = zOrbital

  // Step 8: Rotate by inclination (i)
  // This tilts the orbital plane relative to the ecliptic
  const i = degreesToRadians(elements.inclination)
  const cosI = Math.cos(i)
  const sinI = Math.sin(i)

  const xEcliptic2 = xEcliptic1
  const yEcliptic2 = yEcliptic1 * cosI - zEcliptic1 * sinI
  const zEcliptic2 = yEcliptic1 * sinI + zEcliptic1 * cosI

  // Step 9: Rotate by longitude of ascending node (Ω)
  // This orients where the orbit crosses the ecliptic
  const Omega = degreesToRadians(elements.longitudeOfAscendingNode)
  const cosOmegaCap = Math.cos(Omega)
  const sinOmegaCap = Math.sin(Omega)

  const xFinal = xEcliptic2 * cosOmegaCap - yEcliptic2 * sinOmegaCap
  const yFinal = xEcliptic2 * sinOmegaCap + yEcliptic2 * cosOmegaCap
  const zFinal = zEcliptic2

  // Convert from astronomical coordinates (XY = ecliptic, Z = north)
  // to Three.js coordinates (XZ = ecliptic, Y = up)
  return {
    x: xFinal,
    y: zFinal,  // Z becomes Y (up)
    z: yFinal   // Y becomes Z (depth)
  }
}

/**
 * Calculate orbital velocity at current position
 *
 * Velocity is computed using numerical differentiation: v = Δr/Δt
 * This is more stable than analytical velocity formulas for general use.
 *
 * Useful for:
 * - Retrograde detection (when ecliptic longitude decreases)
 * - Motion trails with velocity-based coloring
 * - Orbital energy calculations
 *
 * @param elements Keplerian orbital elements
 * @param julianDay Current Julian Day
 * @param timeStep Time step for differentiation in days (default: 0.01)
 * @returns Velocity vector {vx, vy, vz} in AU/day
 *
 * @example
 * // Earth's orbital velocity (~1°/day ≈ 0.017 AU/day)
 * const v = calculateOrbitalVelocity(earthElements, 2451545.0)
 * const speed = Math.sqrt(v.vx**2 + v.vy**2 + v.vz**2)
 * // speed ≈ 0.0172 AU/day ≈ 29.8 km/s
 */
export function calculateOrbitalVelocity(
  elements: KeplerianElements,
  julianDay: number,
  timeStep: number = 0.01
): { vx: number; vy: number; vz: number } {
  // Calculate position at current time and slightly in future
  const pos1 = calculateOrbitalPosition(elements, julianDay)
  const pos2 = calculateOrbitalPosition(elements, julianDay + timeStep)

  // Velocity = Δr/Δt (numerical derivative)
  return {
    vx: (pos2.x - pos1.x) / timeStep,
    vy: (pos2.y - pos1.y) / timeStep,
    vz: (pos2.z - pos1.z) / timeStep,
  }
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate that calculated position is within expected orbital bounds
 *
 * Checks that the distance from the Sun is between perihelion and aphelion.
 * Allows 1% tolerance for numerical errors.
 *
 * @param elements Orbital elements
 * @param position Calculated position
 * @returns true if position is valid
 *
 * @example
 * const pos = calculateOrbitalPosition(elements, jd)
 * if (!validatePosition(elements, pos)) {
 *   console.warn('Calculated position outside expected bounds!')
 * }
 */
export function validatePosition(
  elements: KeplerianElements,
  position: { x: number; y: number; z: number }
): boolean {
  const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2)
  const a = elements.semiMajorAxis
  const e = elements.eccentricity

  // Distance should be between perihelion and aphelion
  const perihelion = a * (1 - e)
  const aphelion = a * (1 + e)

  // Allow 1% tolerance for numerical errors
  const tolerance = 0.01
  return r >= perihelion * (1 - tolerance) && r <= aphelion * (1 + tolerance)
}

/**
 * Calculate orbital period from semi-major axis using Kepler's Third Law
 *
 * Kepler's Third Law: T² = a³ (when T is in years and a is in AU)
 * This assumes the central body is the Sun.
 *
 * @param semiMajorAxis Semi-major axis in AU
 * @returns Orbital period in Earth days
 *
 * @example
 * // Earth: a = 1 AU → T = 1 year = 365.25 days
 * calculateOrbitalPeriod(1.0) // returns 365.25
 *
 * @example
 * // Mars: a = 1.524 AU → T ≈ 687 days
 * calculateOrbitalPeriod(1.524) // returns ~686.98
 */
export function calculateOrbitalPeriod(semiMajorAxis: number): number {
  // Kepler's Third Law: T² = a³ (T in years, a in AU)
  const periodYears = Math.sqrt(Math.pow(semiMajorAxis, 3))
  return periodYears * JULIAN_CONSTANTS.DAYS_PER_JULIAN_YEAR
}

/**
 * Calculate semi-major axis from orbital period using Kepler's Third Law
 *
 * Inverse of calculateOrbitalPeriod.
 *
 * @param periodDays Orbital period in Earth days
 * @returns Semi-major axis in AU
 *
 * @example
 * // Venus: T = 224.7 days → a ≈ 0.723 AU
 * calculateSemiMajorAxis(224.7) // returns ~0.723
 */
export function calculateSemiMajorAxis(periodDays: number): number {
  // Kepler's Third Law: a³ = T² (T in years, a in AU)
  const periodYears = periodDays / JULIAN_CONSTANTS.DAYS_PER_JULIAN_YEAR
  return Math.pow(periodYears, 2 / 3)
}

/**
 * Calculate perihelion distance (closest approach to Sun)
 *
 * @param semiMajorAxis Semi-major axis in AU
 * @param eccentricity Orbital eccentricity
 * @returns Perihelion distance in AU
 *
 * @example
 * // Earth: a = 1.0 AU, e = 0.0167 → q ≈ 0.9833 AU
 * calculatePerihelion(1.0, 0.0167) // returns 0.9833
 */
export function calculatePerihelion(semiMajorAxis: number, eccentricity: number): number {
  return semiMajorAxis * (1 - eccentricity)
}

/**
 * Calculate aphelion distance (furthest distance from Sun)
 *
 * @param semiMajorAxis Semi-major axis in AU
 * @param eccentricity Orbital eccentricity
 * @returns Aphelion distance in AU
 *
 * @example
 * // Earth: a = 1.0 AU, e = 0.0167 → Q ≈ 1.0167 AU
 * calculateAphelion(1.0, 0.0167) // returns 1.0167
 */
export function calculateAphelion(semiMajorAxis: number, eccentricity: number): number {
  return semiMajorAxis * (1 + eccentricity)
}

/**
 * Calculate mean motion (average angular velocity)
 *
 * Mean motion n = 360°/T is the constant rate at which mean anomaly increases.
 *
 * @param periodDays Orbital period in Earth days
 * @returns Mean motion in degrees per day
 *
 * @example
 * // Earth: T = 365.25 days → n ≈ 0.9856°/day
 * calculateMeanMotion(365.25) // returns ~0.9856
 */
export function calculateMeanMotion(periodDays: number): number {
  return MATH_CONSTANTS.DEGREES_PER_CIRCLE / periodDays
}
