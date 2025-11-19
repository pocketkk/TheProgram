/**
 * Celestial Body Type Definitions and Interfaces
 *
 * This module provides comprehensive type definitions for the cosmic visualizer,
 * including celestial body data structures, orbital mechanics, visibility controls,
 * and scene context.
 *
 * @module celestialBody
 */

import * as THREE from 'three'

/**
 * Type of celestial body
 *
 * Determines rendering behavior and physical properties:
 * - star: Self-luminous bodies (Sun) - emissive material, corona effects
 * - planet: Primary bodies orbiting stars - orbital calculations, zodiac tracking
 * - satellite: Natural satellites orbiting planets - parent-relative positioning
 * - asteroid: Small rocky bodies (future)
 * - comet: Icy bodies with tails (future)
 */
export type CelestialBodyType = 'star' | 'planet' | 'satellite' | 'asteroid' | 'comet'

/**
 * Position calculation mode / reference frame
 *
 * Defines the coordinate system origin:
 * - heliocentric: Sun at origin (solar system view)
 * - geocentric: Earth at origin (observer perspective)
 * - parentocentric: Parent body at origin (satellite view)
 */
export type PositionMode = 'heliocentric' | 'geocentric' | 'parentocentric'

/**
 * Material type for Three.js rendering
 *
 * - basic: Unaffected by lighting (MeshBasicMaterial) - used for stars
 * - standard: Physically-based rendering (MeshStandardMaterial) - used for planets
 * - emissive: Self-illuminating surfaces (future use)
 */
export type MaterialType = 'basic' | 'standard' | 'emissive'

/**
 * Ring system data for planets like Saturn
 *
 * Defines concentric ring structures around a body
 *
 * @example
 * ```typescript
 * const saturnRings: RingData[] = [
 *   { innerRadius: 1.5, outerRadius: 2.3, color: '#C5B358', opacity: 0.8 },
 *   { innerRadius: 2.4, outerRadius: 3.0, color: '#8B7355', opacity: 0.5 }
 * ]
 * ```
 */
export interface RingData {
  /** Inner radius as multiple of body radius (e.g., 1.5 = 1.5x body radius) */
  innerRadius: number
  /** Outer radius as multiple of body radius */
  outerRadius: number
  /** Ring color (hex format) */
  color: string
  /** Ring opacity (0-1) */
  opacity: number
  /** Render quality - number of segments (default: 32) */
  segments?: number
}

/**
 * Unified data structure for all celestial bodies
 *
 * This interface consolidates all properties needed for rendering and simulating
 * celestial bodies (stars, planets, satellites). It replaces the legacy separate
 * interfaces (PlanetData, SatelliteData, etc.) with a single unified structure.
 *
 * Organized into logical groups:
 * - Identity: Basic identification (id, name, type, symbol)
 * - Visual Properties: Rendering characteristics (color, radius, material)
 * - Orbital Mechanics: Position calculations (orbit radius, period, inclination)
 * - Keplerian Elements: Precise orbital parameters for accuracy
 * - Rotation: Spin characteristics (period, axial tilt)
 * - Relationships: Parent-child hierarchy for satellites
 * - Special Features: Rings, corona, astrological properties
 *
 * @example
 * ```typescript
 * const earth: CelestialBodyData = {
 *   id: 'earth',
 *   name: 'Earth',
 *   type: 'planet',
 *   symbol: '🜨',
 *   color: '#4169E1',
 *   radius: 6371,
 *   orbitRadius: 1.0,
 *   orbitPeriod: 365.25,
 *   inclination: 0.0,
 *   rotationPeriod: 1.0,
 *   zodiacEnabled: true
 * }
 * ```
 */
export interface CelestialBodyData {
  // ===== Identity =====
  id: string // Unique identifier (e.g., 'mercury', 'sun', 'moon')
  name: string // Display name (e.g., 'Mercury', 'Sun', 'Moon')
  type: CelestialBodyType // Body classification
  symbol?: string // Astrological/astronomical symbol (e.g., '☿', '☉')

  // ===== Visual Properties =====
  color: string // Base color (hex)
  radius: number // Physical radius in km (or relative units)
  displayScale?: number // Visual scaling factor (default: 1.0)
  materialType?: MaterialType // Rendering material (default: 'standard')
  roughness?: number // For standard materials (0-1, default: 0.7)
  metalness?: number // For standard materials (0-1, default: 0.2)
  emissiveIntensity?: number // For emissive glow (default: 0.1)

  // ===== Orbital Mechanics =====
  orbitRadius: number // Semi-major axis in AU (or km for satellites)
  orbitPeriod: number // Orbital period in Earth days
  inclination: number // Orbital inclination in degrees
  eccentricity?: number // Orbital eccentricity (0 = circle, default: 0)
  longitudeOfPerihelion?: number // For elliptical orbits (degrees)
  meanLongitudeJ2000?: number // Mean longitude at J2000 epoch (degrees)

  // === Keplerian Orbital Elements ===

  /**
   * Argument of periapsis (ω) - angle from ascending node to periapsis
   * Defines the orientation of the ellipse in the orbital plane
   * @unit degrees
   * @range 0-360
   * @example 102.94 (Earth's argument of periapsis at J2000)
   */
  argumentOfPeriapsis?: number

  /**
   * Longitude of ascending node (Ω) - angle from reference direction to ascending node
   * Defines where the orbit crosses the reference plane
   * @unit degrees
   * @range 0-360
   * @example 348.74 (Earth's longitude of ascending node at J2000)
   */
  longitudeOfAscendingNode?: number

  /**
   * Mean longitude at epoch (L₀) - mean position at J2000 epoch
   * Alternative to mean anomaly, includes longitude of periapsis
   * @unit degrees
   * @range 0-360
   * @example 100.46 (Earth's mean longitude at J2000)
   */
  meanLongitudeAtEpoch?: number

  /**
   * Semi-major axis (a) - half the longest diameter of the ellipse
   * For circular orbits, this equals orbitRadius
   * @unit AU (astronomical units)
   * @example 1.00000011 (Earth's semi-major axis)
   */
  semiMajorAxis?: number

  // ===== Rotation =====
  rotationPeriod: number // Rotation period in Earth days
  axialTilt?: number // Axial tilt in degrees (default: 0)

  // ===== Relationships =====
  parentId?: string // Parent body ID for satellites (e.g., 'earth' for Moon)

  // ===== Special Features =====
  hasRings?: boolean // Whether body has rings (default: false)
  ringData?: RingData[] // Ring system configuration
  hasCorona?: boolean // For stars (default: false)
  coronaLayers?: number // Number of corona layers (default: 3)

  // ===== Astrological Properties =====
  zodiacEnabled?: boolean // Whether to show zodiac info (default: false)
  retrogradeEnabled?: boolean // Whether retrograde applies (default: false)
}

/**
 * Visibility configuration for a single celestial body
 *
 * Controls which visual features are rendered for each body. This granular
 * control allows users to customize the scene appearance and reduce visual
 * clutter when needed.
 *
 * @example
 * ```typescript
 * // Show only the body and its label, hide everything else
 * const minimalView: BodyVisibility = {
 *   body: true,
 *   orbit: false,
 *   label: true,
 *   trail: false,
 *   footprint: false,
 *   projectionLine: false,
 *   glow: false,
 *   rings: false
 * }
 * ```
 */
export interface BodyVisibility {
  /** Show/hide the sphere mesh itself */
  body: boolean
  /** Show/hide the orbital path (ellipse/circle) */
  orbit: boolean
  /** Show/hide the text label above the body */
  label: boolean
  /** Show/hide the motion trail tracking body's path over time */
  trail: boolean
  /** Show/hide the zodiac footprint on the base plane */
  footprint: boolean
  /** Show/hide the projection line connecting body to its footprint */
  projectionLine: boolean
  /** Show/hide the glow layers around the body */
  glow: boolean
  /** Show/hide ring systems (Saturn, Jupiter, Uranus) */
  rings: boolean
}

/**
 * Default visibility settings
 */
export const DEFAULT_VISIBILITY: BodyVisibility = {
  body: true,
  orbit: true,
  label: true,
  trail: false,
  footprint: true,
  projectionLine: true,
  glow: true,
  rings: true,
}

/**
 * Position override for geocentric/custom reference frames
 *
 * When switching to geocentric mode or custom viewpoints, this override
 * replaces the normal orbital calculations with pre-computed positions.
 *
 * @example
 * ```typescript
 * // Place Earth at origin in geocentric mode
 * const earthOverride: PositionOverride = {
 *   x: 0, y: 0, z: 0,
 *   mode: 'geocentric'
 * }
 * ```
 */
export interface PositionOverride {
  /** X coordinate in scene units */
  x: number
  /** Y coordinate in scene units */
  y: number
  /** Z coordinate in scene units */
  z: number
  /** Reference frame this position is calculated in */
  mode: PositionMode
}

/**
 * Scene context shared by all celestial bodies
 *
 * This interface provides global state that affects all bodies in the scene.
 * It's passed to position calculation hooks and rendering components to ensure
 * consistent calculations across the visualization.
 *
 * The context acts as a single source of truth for:
 * - Time (Julian day for position calculations)
 * - Animation speed (for trail length adjustment)
 * - Reference frame (heliocentric vs geocentric)
 * - Visual scaling (AU to scene units)
 * - Global visibility flags
 * - Cached position data for performance
 *
 * @example
 * ```typescript
 * const context: SceneContext = {
 *   julianDay: 2451545.0,  // J2000 epoch
 *   speed: 1.0,             // Real-time
 *   referenceFrame: 'heliocentric',
 *   scale: 2.0,             // 2 scene units per AU
 *   showFootprints: true
 * }
 * ```
 */
export interface SceneContext {
  /** Current Julian day for astronomical calculations */
  julianDay: number
  /** Animation speed in days per frame (affects trail length) */
  speed: number
  /** Current reference frame for position calculations */
  referenceFrame: PositionMode
  /** Scene scaling factor (AU to scene units) */
  scale: number
  /** Global footprint visibility toggle */
  showFootprints: boolean
  /** All bodies in the scene (optional, for cross-body calculations) */
  allBodies?: CelestialBodyData[]
  /** Cached 3D positions for performance (optional) */
  bodyPositions?: Map<string, THREE.Vector3>
}

/**
 * Calculated position data for a body
 *
 * Result of position calculation combining 3D coordinates with
 * astrological information (zodiac sign based on ecliptic longitude).
 *
 * @see useBodyPosition - Hook that produces this data
 */
export interface CalculatedPosition {
  /** 3D position in scene space (Three.js Vector3) */
  position: THREE.Vector3
  /** Ecliptic longitude in degrees (0-360), measured from Aries */
  eclipticLongitude: number
  /** Zodiac sign information (if zodiacEnabled) */
  zodiacSign?: {
    /** Sign name (e.g., 'Aries', 'Taurus') */
    name: string
    /** Unicode symbol (e.g., '♈', '♉') */
    symbol: string
    /** Sign color (hex) */
    color: string
    /** Element classification */
    element: string
  }
}

/**
 * Trail system configuration
 *
 * Controls the motion trail that tracks a body's path over time.
 * Trail length adapts to animation speed to maintain visual consistency.
 *
 * @see useTrailSystem - Hook that uses this configuration
 */
export interface TrailConfig {
  /** Maximum number of trail points to store */
  maxLength: number
  /** Whether trail rendering is active */
  enabled: boolean
  /** Trail color (hex format) */
  color: string
  /** Base opacity (0-1, fades toward tail) */
  opacity: number
}

/**
 * Zodiac sign information
 *
 * Represents one of the twelve zodiac signs with its properties and boundaries.
 * Each sign covers 30 degrees of the ecliptic (360° / 12 = 30° per sign).
 *
 * @example
 * ```typescript
 * const aries: ZodiacSign = {
 *   name: 'Aries',
 *   symbol: '♈',
 *   color: '#FF6B6B',
 *   element: 'fire',
 *   startDegree: 0,
 *   endDegree: 30
 * }
 * ```
 */
export interface ZodiacSign {
  /** Sign name (e.g., 'Aries', 'Taurus') */
  name: string
  /** Unicode symbol (e.g., '♈', '♉') */
  symbol: string
  /** Sign color (hex format) */
  color: string
  /** Elemental classification */
  element: 'fire' | 'earth' | 'air' | 'water' | 'unknown'
  /** Start degree in ecliptic (0-360) */
  startDegree: number
  /** End degree in ecliptic (0-360) */
  endDegree: number
}

/**
 * Retrograde status information
 *
 * Indicates whether a planet is in apparent retrograde motion
 * (moving backward through the zodiac from Earth's perspective).
 *
 * @see getRetrogradeStatus - Function that calculates this
 */
export interface RetrogradeStatus {
  /** True if planet is currently in retrograde motion */
  isRetrograde: boolean
  /** Angular velocity in degrees per day (negative if retrograde) */
  speed?: number
}

/**
 * Complete Keplerian orbital elements for precise astronomical calculations
 *
 * The six classical orbital elements that uniquely define an orbit in the
 * two-body problem. These are used for high-precision position calculations
 * based on established astronomical standards (JPL Solar System Dynamics).
 *
 * Reference frame: Ecliptic plane (Earth's orbital plane) with vernal equinox
 * as the reference direction (0° longitude).
 *
 * @see https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * @example
 * ```typescript
 * // Earth's orbital elements at J2000 epoch
 * const earthElements: KeplerianElements = {
 *   semiMajorAxis: 1.00000011,
 *   eccentricity: 0.01671022,
 *   inclination: 0.00005,
 *   longitudeOfAscendingNode: -11.26064,
 *   argumentOfPeriapsis: 102.94719,
 *   meanLongitudeAtEpoch: 100.46435,
 *   period: 365.25636
 * }
 * ```
 */
export interface KeplerianElements {
  /** Semi-major axis (a) - half the longest diameter of the orbital ellipse (AU) */
  semiMajorAxis: number
  /** Eccentricity (e) - shape of orbit: 0=circle, <1=ellipse (dimensionless) */
  eccentricity: number
  /** Inclination (i) - tilt of orbital plane relative to ecliptic (degrees) */
  inclination: number
  /** Longitude of ascending node (Ω) - where orbit crosses ecliptic ascending (degrees) */
  longitudeOfAscendingNode: number
  /** Argument of periapsis (ω) - orientation of ellipse in orbital plane (degrees) */
  argumentOfPeriapsis: number
  /** Mean longitude at epoch (L₀) - mean position at J2000 reference time (degrees) */
  meanLongitudeAtEpoch: number
  /** Orbital period - time for one complete orbit (Earth days) */
  period: number
}
