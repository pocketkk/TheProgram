# JSDoc Documentation Reference Guide

This guide provides quick reference for the JSDoc documentation standards used in the cosmic visualizer codebase.

## Quick Navigation

- [Module Documentation](#module-documentation)
- [Function Documentation](#function-documentation)
- [Interface Documentation](#interface-documentation)
- [Type Documentation](#type-documentation)
- [Examples Reference](#examples-reference)
- [Best Practices](#best-practices)

---

## Module Documentation

**Location:** Top of file, before imports

```typescript
/**
 * Module Title - Brief Description
 *
 * Detailed description of the module's purpose, architecture, and responsibilities.
 * Use markdown formatting for lists and emphasis.
 *
 * Key Features:
 * - Feature 1 explanation
 * - Feature 2 explanation
 *
 * @module moduleName
 */
```

**Example:**
```typescript
/**
 * Position Calculation Hook for Celestial Bodies
 *
 * This module provides the core position calculation logic for the cosmic visualizer.
 * It handles different body types (stars, planets, satellites) and reference frames
 * (heliocentric, geocentric) using simplified orbital mechanics.
 *
 * @module useBodyPosition
 */
```

---

## Function Documentation

### Standard Function Template

```typescript
/**
 * Brief one-line description of what the function does
 *
 * Detailed description explaining:
 * - What the function does
 * - When to use it
 * - Any important behavior or side effects
 *
 * **Special Behavior:**
 * Document any edge cases or special handling
 *
 * @param paramName - Description of parameter
 * @param optionalParam - Description (optional)
 * @returns Description of return value
 *
 * @throws Error description if function can throw
 *
 * @example
 * ```typescript
 * const result = myFunction(arg1, arg2)
 * ```
 *
 * @see RelatedFunction - for related functionality
 */
export function myFunction(paramName: string, optionalParam?: number): ReturnType {
  // Implementation
}
```

### Complex Algorithm Documentation

For mathematical or complex functions, include formulas and step-by-step explanations:

```typescript
/**
 * Calculate heliocentric position (orbit around Sun)
 *
 * Uses simplified orbital mechanics with circular orbits and basic inclination.
 * The calculation assumes:
 * - Circular orbit (ignoring eccentricity for visualization simplicity)
 * - Mean anomaly as proxy for true anomaly
 * - Ecliptic plane as reference with inclination tilt
 *
 * **Mathematical Model:**
 * 1. Calculate mean anomaly M from orbital period and time elapsed
 * 2. Convert M to radians for trigonometric functions
 * 3. Apply 3D rotation for orbital inclination:
 *    - x = r * cos(M)
 *    - y = r * sin(i) * sin(M)  [inclination component]
 *    - z = r * cos(i) * sin(M)  [ecliptic component]
 *
 * @param data - Celestial body data with orbital parameters
 * @param context - Scene context with time and scale
 * @returns Calculated position with zodiac sign
 *
 * @see calculateMeanAnomaly - For mean anomaly calculation
 * @see getZodiacSign - For zodiac sign determination
 */
```

---

## Interface Documentation

### Standard Interface Template

```typescript
/**
 * Brief description of the interface
 *
 * Detailed description explaining purpose and usage context.
 * Include information about:
 * - When to use this interface
 * - How it fits into the system
 * - Any important relationships
 *
 * @example
 * ```typescript
 * const myObj: MyInterface = {
 *   prop1: 'value',
 *   prop2: 42
 * }
 * ```
 */
export interface MyInterface {
  /** Short description of prop1 */
  prop1: string

  /**
   * Longer description of prop2
   * Can span multiple lines for complex properties
   *
   * @example 42
   */
  prop2: number

  /** Optional property description (optional) */
  optionalProp?: boolean
}
```

### Complex Interface with Grouped Properties

```typescript
/**
 * Unified data structure for all celestial bodies
 *
 * This interface consolidates all properties needed for rendering and simulating
 * celestial bodies (stars, planets, satellites).
 *
 * Organized into logical groups:
 * - Identity: Basic identification (id, name, type, symbol)
 * - Visual Properties: Rendering characteristics (color, radius, material)
 * - Orbital Mechanics: Position calculations (orbit radius, period, inclination)
 *
 * @example
 * ```typescript
 * const earth: CelestialBodyData = {
 *   id: 'earth',
 *   name: 'Earth',
 *   type: 'planet',
 *   color: '#4169E1',
 *   radius: 6371,
 *   orbitRadius: 1.0,
 *   orbitPeriod: 365.25
 * }
 * ```
 */
export interface CelestialBodyData {
  // ===== Identity =====
  /** Unique identifier (e.g., 'mercury', 'sun', 'moon') */
  id: string
  /** Display name (e.g., 'Mercury', 'Sun', 'Moon') */
  name: string

  // ===== Visual Properties =====
  /** Base color (hex format) */
  color: string
  /** Physical radius in km */
  radius: number
}
```

---

## Type Documentation

### Type Alias Documentation

```typescript
/**
 * Type of celestial body
 *
 * Determines rendering behavior and physical properties:
 * - star: Self-luminous bodies (Sun) - emissive material, corona effects
 * - planet: Primary bodies orbiting stars - orbital calculations, zodiac tracking
 * - satellite: Natural satellites orbiting planets - parent-relative positioning
 */
export type CelestialBodyType = 'star' | 'planet' | 'satellite'
```

---

## Examples Reference

### Simple Function Example

```typescript
@example
```typescript
const result = normalizeAngle(370)  // returns 10
```

### Multi-line Example with Context

```typescript
@example
```typescript
// Calculate Earth's position in heliocentric mode
const earthPosition = useBodyPosition(
  earthData,
  {
    julianDay: 2451545.0,  // J2000 epoch
    speed: 1.0,
    referenceFrame: 'heliocentric',
    scale: 2.0,
    showFootprints: true
  },
  null
)
// Result: { position: Vector3, eclipticLongitude: 100.46, zodiacSign: {...} }
```

### Interface Usage Example

```typescript
@example
```typescript
const minimalView: BodyVisibility = {
  body: true,
  orbit: false,
  label: true,
  trail: false,
  footprint: false,
  projectionLine: false,
  glow: false,
  rings: false
}
```

---

## Best Practices

### 1. Be Concise but Complete

**Good:**
```typescript
/** Calculate mean anomaly from orbital period and time elapsed since epoch */
```

**Bad:**
```typescript
/** Calculates the mean anomaly which is a measure of the angular distance of a body along its orbit from its periapsis */
```

### 2. Use Active Voice

**Good:**
```typescript
/** Converts degrees to radians */
```

**Bad:**
```typescript
/** Degree to radian conversion is performed */
```

### 3. Document Edge Cases

```typescript
/**
 * Calculate mean anomaly (M) from orbital period and time
 *
 * @param orbitPeriod Orbital period in Earth days
 * @param daysSinceEpoch Days elapsed since reference epoch
 * @returns Mean anomaly in degrees [0, 360)
 *
 * @example
 * calculateMeanAnomaly(365.25, 365.25) // returns ~360 (one full orbit)
 * calculateMeanAnomaly(0, 100) // returns 0 (stationary body like Sun)
 */
export function calculateMeanAnomaly(orbitPeriod: number, daysSinceEpoch: number): number {
  if (orbitPeriod === 0) {
    return 0 // Stationary body (e.g., Sun)
  }
  // ... implementation
}
```

### 4. Link Related Functions

```typescript
/**
 * Calculate heliocentric position
 *
 * @see calculateMeanAnomaly - For mean anomaly calculation
 * @see getZodiacSign - For zodiac sign determination
 * @see CalculatedPosition - Return type interface
 */
```

### 5. Use Markdown Formatting

```typescript
/**
 * Scene context shared by all celestial bodies
 *
 * The context acts as a single source of truth for:
 * - Time (Julian day for position calculations)
 * - Animation speed (for trail length adjustment)
 * - Reference frame (heliocentric vs geocentric)
 * - Visual scaling (AU to scene units)
 *
 * **Performance Note:** Use the cached bodyPositions map for
 * cross-body calculations to avoid redundant position calculations.
 */
```

### 6. Document Units and Ranges

```typescript
/**
 * Orbital inclination in degrees
 * @unit degrees
 * @range 0-180
 * @example 23.5 (Earth's axial tilt)
 */
inclination: number
```

### 7. Provide Context for Parameters

**Good:**
```typescript
/**
 * @param data - Celestial body data with orbital parameters
 * @param context - Scene context with Julian day and reference frame
 * @param override - Optional position override for geocentric mode (null for heliocentric)
 */
```

**Bad:**
```typescript
/**
 * @param data - The data
 * @param context - The context
 * @param override - An override
 */
```

---

## Documentation Checklist

Before considering documentation complete, verify:

- [ ] Module has top-level JSDoc comment
- [ ] All exported functions have JSDoc
- [ ] All interfaces have JSDoc
- [ ] Complex parameters are explained
- [ ] Return values are documented
- [ ] At least one example is provided for public API
- [ ] Edge cases are documented
- [ ] Related functions are cross-referenced with @see
- [ ] Units and ranges are specified where applicable
- [ ] TypeScript compilation succeeds with no JSDoc errors

---

## Tools and IDE Support

### VSCode
- Hover over any function/interface to see JSDoc
- Ctrl+Space (autocomplete) shows parameter information
- Use "Go to Definition" to see full documentation

### TypeScript Compiler
- Run `npm run type-check` to verify JSDoc syntax
- JSDoc doesn't affect runtime, only development experience

### Documentation Generation
- Future: Can use TypeDoc to generate HTML documentation from JSDoc

---

## References

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [JSDoc Official Documentation](https://jsdoc.app/)
- Project-specific examples: See documented files in `/frontend/src/features/cosmos/`
