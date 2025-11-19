/**
 * Keplerian Orbital Elements for Solar System Bodies
 *
 * This file contains accurate orbital elements for planets and select moons
 * referenced to the J2000.0 epoch (January 1, 2000, 12:00 TT / JD 2451545.0)
 *
 * Data Sources:
 * - NASA JPL Solar System Dynamics: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * - NASA Planetary Fact Sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 * - University of Reading Planetary Orbital Elements: https://www.met.rdg.ac.uk/~ross/Astronomy/Planets.html
 *
 * Notes:
 * - Elements derived from 250-year least squares fit of DE 200 planetary ephemeris
 * - Referenced to mean ecliptic and equinox of J2000 at epoch 2451545.0 JD
 * - Terrestrial planet orbits accurate to ~25 arcseconds or better
 * - Outer planet orbits (especially Saturn) have lower accuracy (~600 arcseconds for Saturn)
 * - Argument of periapsis (ω) calculated from: ω = ϖ - Ω
 *   where ϖ is longitude of perihelion and Ω is longitude of ascending node
 *
 * @lastUpdated 2025-11-01
 */

export interface KeplerianElements {
  /** Semi-major axis in Astronomical Units (AU) */
  semiMajorAxis: number
  /** Orbital eccentricity (0 = circular, <1 = elliptical) */
  eccentricity: number
  /** Inclination to ecliptic plane in degrees */
  inclination: number
  /** Longitude of ascending node (Ω) in degrees */
  longitudeOfAscendingNode: number
  /** Argument of periapsis (ω) in degrees */
  argumentOfPeriapsis: number
  /** Mean longitude at epoch (L₀) in degrees */
  meanLongitudeAtEpoch: number
  /** Orbital period in Earth days */
  period: number
}

/**
 * Mercury orbital elements at J2000.0
 * Source: NASA JPL approx_pos.html (1800 AD - 2050 AD validity)
 */
export const MERCURY_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 0.38709927,        // AU
  eccentricity: 0.20563593,
  inclination: 7.00497902,          // degrees
  longitudeOfAscendingNode: 48.331, // degrees (Ω)
  argumentOfPeriapsis: 29.125,      // degrees (ω = ϖ - Ω = 77.456 - 48.331)
  meanLongitudeAtEpoch: 252.251,    // degrees (L)
  period: 87.969,                   // Earth days
}

/**
 * Venus orbital elements at J2000.0
 * Source: NASA JPL approx_pos.html (1800 AD - 2050 AD validity)
 */
export const VENUS_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 0.72333566,        // AU
  eccentricity: 0.00677672,
  inclination: 3.39467605,          // degrees
  longitudeOfAscendingNode: 76.681, // degrees (Ω)
  argumentOfPeriapsis: 54.852,      // degrees (ω = ϖ - Ω = 131.533 - 76.681)
  meanLongitudeAtEpoch: 181.980,    // degrees (L)
  period: 224.701,                  // Earth days
}

/**
 * Earth orbital elements at J2000.0
 * Note: This represents the Earth-Moon barycenter orbit
 * Source: NASA JPL approx_pos.html (1800 AD - 2050 AD validity)
 */
export const EARTH_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 1.00000261,         // AU
  eccentricity: 0.01671123,
  inclination: -0.00001531,          // degrees (nearly zero, as Earth defines the ecliptic)
  longitudeOfAscendingNode: 348.739, // degrees (Ω) - normalized from -11.261
  argumentOfPeriapsis: 114.208,      // degrees (ω = ϖ - Ω = 102.947 - (-11.261))
  meanLongitudeAtEpoch: 100.464,     // degrees (L)
  period: 365.256,                   // Earth days
}

/**
 * Mars orbital elements at J2000.0
 * Source: NASA JPL approx_pos.html (1800 AD - 2050 AD validity)
 */
export const MARS_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 1.52371034,        // AU
  eccentricity: 0.09339410,
  inclination: 1.84969142,          // degrees
  longitudeOfAscendingNode: 49.579, // degrees (Ω)
  argumentOfPeriapsis: 286.462,     // degrees (ω = ϖ - Ω = 336.041 - 49.579)
  meanLongitudeAtEpoch: 355.453,    // degrees (L)
  period: 686.980,                  // Earth days
}

/**
 * Jupiter orbital elements at J2000.0
 * Source: NASA JPL approx_pos.html (1800 AD - 2050 AD validity)
 */
export const JUPITER_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 5.20288700,         // AU
  eccentricity: 0.04838624,
  inclination: 1.30439695,           // degrees
  longitudeOfAscendingNode: 100.556, // degrees (Ω)
  argumentOfPeriapsis: 274.198,      // degrees (ω) - normalized from -85.802
  meanLongitudeAtEpoch: 34.404,      // degrees (L)
  period: 4332.589,                  // Earth days (~11.86 years)
}

/**
 * Saturn orbital elements at J2000.0
 * Source: NASA JPL approx_pos.html (1800 AD - 2050 AD validity)
 * Note: Lower accuracy (~600 arcseconds) due to long orbital period
 */
export const SATURN_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 9.53667594,         // AU
  eccentricity: 0.05386179,
  inclination: 2.48599187,           // degrees
  longitudeOfAscendingNode: 113.715, // degrees (Ω)
  argumentOfPeriapsis: 338.717,      // degrees (ω) - normalized from -21.283
  meanLongitudeAtEpoch: 49.944,      // degrees (L)
  period: 10759.22,                  // Earth days (~29.46 years)
}

/**
 * Uranus orbital elements at J2000.0
 * Source: NASA Uranus Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html)
 * Note: Includes long-period perturbations with Neptune
 */
export const URANUS_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 19.19126393,        // AU
  eccentricity: 0.04716771,
  inclination: 0.76986,              // degrees
  longitudeOfAscendingNode: 74.22988, // degrees (Ω)
  argumentOfPeriapsis: 96.73436,     // degrees (ω = ϖ - Ω = 170.96424 - 74.22988)
  meanLongitudeAtEpoch: 313.23218,   // degrees (L)
  period: 30685.4,                   // Earth days (~84 years)
}

/**
 * Neptune orbital elements at J2000.0
 * Source: NASA Neptune Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html)
 * Note: Includes long-period perturbations with Uranus
 */
export const NEPTUNE_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 30.06896348,         // AU
  eccentricity: 0.00858587,
  inclination: 1.76917,               // degrees
  longitudeOfAscendingNode: 131.72169, // degrees (Ω)
  argumentOfPeriapsis: 273.24966,     // degrees (ω) - normalized from -86.75034
  meanLongitudeAtEpoch: 304.88003,    // degrees (L)
  period: 60189.0,                    // Earth days (~164.8 years)
}

/**
 * Pluto orbital elements at J2000.0
 * Source: NASA Pluto Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html)
 * Note: Pluto has unusually high eccentricity and inclination
 */
export const PLUTO_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 39.48168677,         // AU
  eccentricity: 0.24880766,           // High eccentricity - orbit crosses Neptune's
  inclination: 17.14175,              // degrees - highly inclined to ecliptic
  longitudeOfAscendingNode: 110.30347, // degrees (Ω)
  argumentOfPeriapsis: 113.76329,     // degrees (ω = ϖ - Ω = 224.06676 - 110.30347)
  meanLongitudeAtEpoch: 238.92881,    // degrees (L)
  period: 90560.0,                    // Earth days (~248 years)
}

/**
 * Moon orbital elements relative to Earth
 * Source: Multiple sources including NASA eclipse documentation
 * Note: Moon's orbit is quite variable due to solar perturbations
 * These are mean values - actual eccentricity varies 0.045-0.065
 */
export const MOON_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 0.002569,          // AU (384,400 km converted to AU)
  eccentricity: 0.0549,             // Mean value (varies 0.045-0.065)
  inclination: 5.145,               // degrees relative to ecliptic
  longitudeOfAscendingNode: 0.0,    // Precesses with ~18.6 year period
  argumentOfPeriapsis: 0.0,         // Precesses with ~8.85 year period
  meanLongitudeAtEpoch: 0.0,        // Placeholder - complex lunar theory needed
  period: 27.32166,                 // Earth days (sidereal month)
}

/**
 * Sun position in heliocentric reference frame
 * The Sun is at the origin of the heliocentric coordinate system
 */
export const SUN_POSITION = {
  x: 0,
  y: 0,
  z: 0,
  note: 'Sun is at the origin in heliocentric reference frame',
} as const

/**
 * Lookup table for all planetary orbital elements
 * Useful for programmatic access by celestial body name
 */
export const ORBITAL_ELEMENTS_MAP: Record<string, KeplerianElements> = {
  mercury: MERCURY_ELEMENTS,
  venus: VENUS_ELEMENTS,
  earth: EARTH_ELEMENTS,
  mars: MARS_ELEMENTS,
  jupiter: JUPITER_ELEMENTS,
  saturn: SATURN_ELEMENTS,
  uranus: URANUS_ELEMENTS,
  neptune: NEPTUNE_ELEMENTS,
  pluto: PLUTO_ELEMENTS,
  moon: MOON_ELEMENTS,
}

/**
 * Calculate position from orbital elements using Keplerian orbital mechanics
 *
 * @param elements - Keplerian orbital elements
 * @param julianDate - Julian date for position calculation
 * @returns {x, y, z} position in AU in heliocentric ecliptic coordinates
 *
 * Note: This is a simplified calculation. For high precision, use JPL HORIZONS
 * or implement full perturbation theory.
 */
export function calculatePosition(
  elements: KeplerianElements,
  julianDate: number
): { x: number; y: number; z: number } {
  // J2000 epoch
  const J2000 = 2451545.0

  // Days since J2000
  const d = julianDate - J2000

  // Mean motion (degrees per day)
  const n = 360.0 / elements.period

  // Mean anomaly at date
  const M = (elements.meanLongitudeAtEpoch + n * d) % 360
  const M_rad = (M * Math.PI) / 180

  // Solve Kepler's equation for eccentric anomaly (simplified iterative solution)
  let E = M_rad
  for (let i = 0; i < 10; i++) {
    E = M_rad + elements.eccentricity * Math.sin(E)
  }

  // True anomaly
  const v = 2 * Math.atan2(
    Math.sqrt(1 + elements.eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - elements.eccentricity) * Math.cos(E / 2)
  )

  // Distance from Sun
  const r = (elements.semiMajorAxis * (1 - elements.eccentricity ** 2)) /
            (1 + elements.eccentricity * Math.cos(v))

  // Convert angles to radians
  const i_rad = (elements.inclination * Math.PI) / 180
  const omega_rad = (elements.argumentOfPeriapsis * Math.PI) / 180
  const Omega_rad = (elements.longitudeOfAscendingNode * Math.PI) / 180

  // Position in orbital plane
  const x_orb = r * Math.cos(v + omega_rad)
  const y_orb = r * Math.sin(v + omega_rad)

  // Rotate to ecliptic coordinates
  const x = (Math.cos(Omega_rad) * Math.cos(i_rad) * x_orb -
             Math.sin(Omega_rad) * y_orb)
  const y = (Math.sin(Omega_rad) * Math.cos(i_rad) * x_orb +
             Math.cos(Omega_rad) * y_orb)
  const z = Math.sin(i_rad) * x_orb

  return { x, y, z }
}

/**
 * Convert Julian Date to calendar date
 * @param jd - Julian Date
 * @returns Date object
 */
export function julianToDate(jd: number): Date {
  const J2000 = 2451545.0
  const msPerDay = 86400000
  const j2000Date = new Date('2000-01-01T12:00:00Z')

  const daysSinceJ2000 = jd - J2000
  const milliseconds = daysSinceJ2000 * msPerDay

  return new Date(j2000Date.getTime() + milliseconds)
}

/**
 * Convert calendar date to Julian Date
 * @param date - JavaScript Date object
 * @returns Julian Date
 */
export function dateToJulian(date: Date): number {
  const J2000 = 2451545.0
  const msPerDay = 86400000
  const j2000Date = new Date('2000-01-01T12:00:00Z')

  const milliseconds = date.getTime() - j2000Date.getTime()
  const daysSinceJ2000 = milliseconds / msPerDay

  return J2000 + daysSinceJ2000
}
