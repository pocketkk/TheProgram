/**
 * Edge Case Testing for Orbital Mechanics
 *
 * Tests the robustness of orbital calculations against invalid inputs,
 * extreme values, and edge cases.
 *
 * @module edgeCases.test
 */

import {
  solveKeplersEquation,
  calculateOrbitalPosition,
  sanitizeNumber,
  validateKeplerianElements,
  calculateTrueAnomaly,
  calculateOrbitalRadius,
} from '../orbitalMechanics'
import { calculateMeanAnomaly } from '../calculations'
import type { KeplerianElements } from '../../types/celestialBody'

describe('Edge Case Handling - Orbital Mechanics', () => {
  // Reference elements for Earth (valid baseline)
  const EARTH_ELEMENTS: KeplerianElements = {
    semiMajorAxis: 1.00000011,
    eccentricity: 0.01671022,
    inclination: 0.00005,
    longitudeOfAscendingNode: 348.73936,
    argumentOfPeriapsis: 102.94719,
    meanLongitudeAtEpoch: 100.46435,
    period: 365.25,
  }

  describe('sanitizeNumber', () => {
    it('should handle NaN inputs', () => {
      const result = sanitizeNumber(NaN, 1.0, 'test')
      expect(result).toBe(1.0)
    })

    it('should handle Infinity inputs', () => {
      const result = sanitizeNumber(Infinity, 0.5, 'test')
      expect(result).toBe(0.5)
    })

    it('should handle -Infinity inputs', () => {
      const result = sanitizeNumber(-Infinity, 0.0, 'test')
      expect(result).toBe(0.0)
    })

    it('should pass through valid numbers', () => {
      const result = sanitizeNumber(42.5, 0.0, 'test')
      expect(result).toBe(42.5)
    })

    it('should handle zero correctly', () => {
      const result = sanitizeNumber(0, 1.0, 'test')
      expect(result).toBe(0)
    })
  })

  describe('validateKeplerianElements', () => {
    it('should validate correct elements', () => {
      const result = validateKeplerianElements(EARTH_ELEMENTS)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative semi-major axis', () => {
      const elements = { ...EARTH_ELEMENTS, semiMajorAxis: -1.0 }
      const result = validateKeplerianElements(elements)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('semi-major axis'))
    })

    it('should reject eccentricity >= 1 (hyperbolic)', () => {
      const elements = { ...EARTH_ELEMENTS, eccentricity: 1.5 }
      const result = validateKeplerianElements(elements)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('eccentricity'))
    })

    it('should reject negative eccentricity', () => {
      const elements = { ...EARTH_ELEMENTS, eccentricity: -0.2 }
      const result = validateKeplerianElements(elements)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('eccentricity'))
    })

    it('should reject extreme inclination', () => {
      const elements = { ...EARTH_ELEMENTS, inclination: 270 }
      const result = validateKeplerianElements(elements)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('inclination'))
    })

    it('should reject negative period', () => {
      const elements = { ...EARTH_ELEMENTS, period: -365 }
      const result = validateKeplerianElements(elements)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(expect.stringContaining('period'))
    })
  })

  describe('solveKeplersEquation - Edge Cases', () => {
    it('should handle hyperbolic orbit (e >= 1) gracefully', () => {
      // Should not throw, should use fallback e=0.99
      const result = solveKeplersEquation(45, 1.5)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should handle negative eccentricity', () => {
      // Should not throw, should use e=0
      const result = solveKeplersEquation(90, -0.5)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should handle NaN eccentricity', () => {
      const result = solveKeplersEquation(45, NaN)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should handle NaN mean anomaly', () => {
      const result = solveKeplersEquation(NaN, 0.2)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should handle circular orbit (e=0)', () => {
      const result = solveKeplersEquation(45, 0.0)
      expect(result).toBeCloseTo(45, 1)
    })

    it('should handle near-circular orbit (e < 1e-8)', () => {
      const result = solveKeplersEquation(90, 1e-10)
      expect(result).toBeCloseTo(90, 1)
    })

    it('should handle high eccentricity (e=0.99)', () => {
      const result = solveKeplersEquation(45, 0.99)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should handle extreme mean anomalies', () => {
      const result1 = solveKeplersEquation(720, 0.2) // 2 full orbits
      const result2 = solveKeplersEquation(-90, 0.2) // Negative
      expect(result1).toBeGreaterThanOrEqual(0)
      expect(result1).toBeLessThan(360)
      expect(result2).toBeGreaterThanOrEqual(0)
      expect(result2).toBeLessThan(360)
    })
  })

  describe('calculateMeanAnomaly - Edge Cases', () => {
    it('should handle zero orbit period', () => {
      const result = calculateMeanAnomaly(0, 100)
      expect(result).toBe(0)
    })

    it('should handle negative orbit period', () => {
      const result = calculateMeanAnomaly(-365, 100)
      expect(result).toBe(0)
    })

    it('should handle NaN days', () => {
      const result = calculateMeanAnomaly(365.25, NaN)
      expect(result).toBe(0)
    })

    it('should handle Infinity days', () => {
      const result = calculateMeanAnomaly(365.25, Infinity)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should handle extremely large days (far future)', () => {
      const result = calculateMeanAnomaly(365.25, 1000000) // ~2737 AD
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should handle negative days (past)', () => {
      const result = calculateMeanAnomaly(365.25, -365.25) // One year before epoch
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })
  })

  describe('calculateOrbitalPosition - Edge Cases', () => {
    it('should handle hyperbolic orbit elements', () => {
      const hyperElements = { ...EARTH_ELEMENTS, eccentricity: 1.5 }
      // Should not throw
      const pos = calculateOrbitalPosition(hyperElements, 2451545.0)
      expect(pos.x).toBeDefined()
      expect(pos.y).toBeDefined()
      expect(pos.z).toBeDefined()
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })

    it('should handle zero semi-major axis', () => {
      const zeroElements = { ...EARTH_ELEMENTS, semiMajorAxis: 0 }
      const pos = calculateOrbitalPosition(zeroElements, 2451545.0)
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })

    it('should handle negative semi-major axis', () => {
      const negElements = { ...EARTH_ELEMENTS, semiMajorAxis: -1.0 }
      const pos = calculateOrbitalPosition(negElements, 2451545.0)
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })

    it('should handle NaN elements', () => {
      const nanElements = { ...EARTH_ELEMENTS, semiMajorAxis: NaN }
      const pos = calculateOrbitalPosition(nanElements, 2451545.0)
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })

    it('should handle extreme Julian dates (far future)', () => {
      const pos = calculateOrbitalPosition(EARTH_ELEMENTS, 3000000) // Year ~3501
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })

    it('should handle extreme Julian dates (distant past)', () => {
      const pos = calculateOrbitalPosition(EARTH_ELEMENTS, 2000000) // Year ~499
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })

    it('should handle NaN Julian date', () => {
      const pos = calculateOrbitalPosition(EARTH_ELEMENTS, NaN)
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })

    it('should produce positions within orbital bounds for valid elements', () => {
      const pos = calculateOrbitalPosition(EARTH_ELEMENTS, 2451545.0)
      const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2)

      const a = EARTH_ELEMENTS.semiMajorAxis
      const e = EARTH_ELEMENTS.eccentricity
      const perihelion = a * (1 - e)
      const aphelion = a * (1 + e)

      // Distance should be within orbital bounds (with tolerance)
      expect(distance).toBeGreaterThanOrEqual(perihelion * 0.99)
      expect(distance).toBeLessThanOrEqual(aphelion * 1.01)
    })
  })

  describe('calculateTrueAnomaly - Edge Cases', () => {
    it('should handle circular orbit', () => {
      const result = calculateTrueAnomaly(45, 0.0)
      expect(result).toBeCloseTo(45, 1)
    })

    it('should handle high eccentricity', () => {
      const result = calculateTrueAnomaly(90, 0.95)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(360)
    })

    it('should produce valid output for all quadrants', () => {
      const e = 0.2
      const angles = [0, 90, 180, 270]

      angles.forEach((E) => {
        const nu = calculateTrueAnomaly(E, e)
        expect(nu).toBeGreaterThanOrEqual(0)
        expect(nu).toBeLessThan(360)
      })
    })
  })

  describe('calculateOrbitalRadius - Edge Cases', () => {
    it('should handle perihelion (nu = 0)', () => {
      const r = calculateOrbitalRadius(1.0, 0.2, 0)
      expect(r).toBeCloseTo(1.0 * (1 - 0.2), 5) // r = a(1-e)
    })

    it('should handle aphelion (nu = 180)', () => {
      const r = calculateOrbitalRadius(1.0, 0.2, 180)
      expect(r).toBeCloseTo(1.0 * (1 + 0.2), 5) // r = a(1+e)
    })

    it('should handle circular orbit', () => {
      const r = calculateOrbitalRadius(1.0, 0.0, 90)
      expect(r).toBeCloseTo(1.0, 5)
    })

    it('should handle high eccentricity', () => {
      const r = calculateOrbitalRadius(1.0, 0.99, 90)
      expect(r).toBeGreaterThan(0)
      expect(isFinite(r)).toBe(true)
    })
  })

  describe('Integration Tests - Full Orbital Cycle', () => {
    it('should calculate positions for full orbital cycle without errors', () => {
      const steps = 36 // 10-degree intervals
      const period = EARTH_ELEMENTS.period

      for (let i = 0; i < steps; i++) {
        const jd = 2451545.0 + (i / steps) * period
        const pos = calculateOrbitalPosition(EARTH_ELEMENTS, jd)

        expect(isFinite(pos.x)).toBe(true)
        expect(isFinite(pos.y)).toBe(true)
        expect(isFinite(pos.z)).toBe(true)
      }
    })

    it('should handle multiple orbits over long time periods', () => {
      const years = 100
      const jd = 2451545.0 + years * 365.25

      const pos = calculateOrbitalPosition(EARTH_ELEMENTS, jd)
      expect(isFinite(pos.x)).toBe(true)
      expect(isFinite(pos.y)).toBe(true)
      expect(isFinite(pos.z)).toBe(true)
    })
  })
})
