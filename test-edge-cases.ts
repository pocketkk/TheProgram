/**
 * Manual Edge Case Testing Script
 *
 * Run with: npx tsx test-edge-cases.ts
 */

import {
  solveKeplersEquation,
  calculateOrbitalPosition,
  sanitizeNumber,
  validateKeplerianElements,
} from './frontend/src/features/cosmos/utils/orbitalMechanics'
import { calculateMeanAnomaly } from './frontend/src/features/cosmos/utils/calculations'
import type { KeplerianElements } from './frontend/src/features/cosmos/types/celestialBody'

const EARTH_ELEMENTS: KeplerianElements = {
  semiMajorAxis: 1.00000011,
  eccentricity: 0.01671022,
  inclination: 0.00005,
  longitudeOfAscendingNode: 348.73936,
  argumentOfPeriapsis: 102.94719,
  meanLongitudeAtEpoch: 100.46435,
  period: 365.25,
}

console.log('='.repeat(70))
console.log('EDGE CASE TESTING - Orbital Mechanics')
console.log('='.repeat(70))

// Test 1: Hyperbolic orbit
console.log('\n1. Hyperbolic Orbit (e = 1.5):')
try {
  const hyperElements = { ...EARTH_ELEMENTS, eccentricity: 1.5 }
  const pos = calculateOrbitalPosition(hyperElements, 2451545.0)
  console.log(`   ✓ Handled gracefully: x=${pos.x.toFixed(3)}, y=${pos.y.toFixed(3)}, z=${pos.z.toFixed(3)}`)
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

// Test 2: Zero orbit period
console.log('\n2. Zero Orbit Period:')
try {
  const meanAnomaly = calculateMeanAnomaly(0, 100)
  console.log(`   ✓ Handled gracefully: M = ${meanAnomaly}°`)
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

// Test 3: NaN inputs
console.log('\n3. NaN Inputs:')
try {
  const sanitized = sanitizeNumber(NaN, 1.0, 'test value')
  console.log(`   ✓ Sanitized NaN to ${sanitized}`)

  const E = solveKeplersEquation(45, NaN)
  console.log(`   ✓ Handled NaN eccentricity: E = ${E.toFixed(2)}°`)
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

// Test 4: Extreme Julian dates
console.log('\n4. Extreme Julian Dates:')
try {
  const farFuture = calculateOrbitalPosition(EARTH_ELEMENTS, 3000000)
  console.log(`   ✓ Year 3501: x=${farFuture.x.toFixed(3)}, y=${farFuture.y.toFixed(3)}`)

  const distantPast = calculateOrbitalPosition(EARTH_ELEMENTS, 2000000)
  console.log(`   ✓ Year 499: x=${distantPast.x.toFixed(3)}, y=${distantPast.y.toFixed(3)}`)
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

// Test 5: Invalid elements validation
console.log('\n5. Invalid Elements Validation:')
try {
  const invalidElements = {
    ...EARTH_ELEMENTS,
    eccentricity: -0.5,
    semiMajorAxis: -1.0,
    period: 0,
  }

  const validation = validateKeplerianElements(invalidElements)
  console.log(`   Valid: ${validation.valid}`)
  console.log(`   Errors: ${validation.errors.length}`)
  validation.errors.forEach(err => console.log(`     - ${err}`))
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

// Test 6: High eccentricity (near-parabolic)
console.log('\n6. Near-Parabolic Orbit (e = 0.99):')
try {
  const E = solveKeplersEquation(45, 0.99)
  console.log(`   ✓ Converged: E = ${E.toFixed(2)}°`)
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

// Test 7: Full orbital cycle
console.log('\n7. Full Orbital Cycle (36 positions):')
try {
  let allValid = true
  for (let i = 0; i < 36; i++) {
    const jd = 2451545.0 + (i / 36) * 365.25
    const pos = calculateOrbitalPosition(EARTH_ELEMENTS, jd)

    if (!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z)) {
      allValid = false
      break
    }
  }

  if (allValid) {
    console.log(`   ✓ All 36 positions valid`)
  } else {
    console.log(`   ✗ Some positions invalid`)
  }
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

// Test 8: Infinity handling
console.log('\n8. Infinity Inputs:')
try {
  const sanitized1 = sanitizeNumber(Infinity, 0.5, 'infinity test')
  const sanitized2 = sanitizeNumber(-Infinity, 0.0, '-infinity test')
  console.log(`   ✓ Infinity → ${sanitized1}`)
  console.log(`   ✓ -Infinity → ${sanitized2}`)
} catch (e) {
  console.log(`   ✗ FAILED: ${e}`)
}

console.log('\n' + '='.repeat(70))
console.log('All edge case tests completed!')
console.log('='.repeat(70))
