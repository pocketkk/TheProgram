/**
 * Astronomical and mathematical constants for the cosmic visualizer
 */

// Julian Date Constants
export const JULIAN_CONSTANTS = {
  /** J2000.0 epoch: January 1, 2000, 12:00 TT (Julian Date 2451545.0) */
  J2000_EPOCH: 2451545.0,
  /** Days in a Julian year */
  DAYS_PER_JULIAN_YEAR: 365.25,
  /** Days in a Julian century */
  DAYS_PER_JULIAN_CENTURY: 36525,
} as const

// Mathematical Constants
export const MATH_CONSTANTS = {
  /** Degrees in a full circle */
  DEGREES_PER_CIRCLE: 360,
  /** Radians per degree (π/180) */
  RADIANS_PER_DEGREE: Math.PI / 180,
  /** Degrees per radian (180/π) */
  DEGREES_PER_RADIAN: 180 / Math.PI,
} as const

// Astronomical Unit Conversions
export const UNIT_CONVERSIONS = {
  /** Astronomical Unit to kilometers */
  AU_TO_KM: 149597870.7,
  /** Kilometers to Astronomical Units */
  KM_TO_AU: 1 / 149597870.7,
} as const

// Animation and Performance
export const ANIMATION_CONSTANTS = {
  /** Default animation interval in milliseconds */
  DEFAULT_ANIMATION_INTERVAL: 50,
  /** Default retrograde check interval (frames) */
  RETROGRADE_CHECK_INTERVAL: 10,
  /** Default trail length (number of points) */
  DEFAULT_TRAIL_LENGTH: 100,
} as const

// Time Speed Presets (days per frame)
export const SPEED_PRESETS = [
  { value: 1, label: '1 Day' },
  { value: 7, label: '1 Week' },
  { value: 30, label: '1 Month' },
  { value: 365, label: '1 Year' },
] as const

// Scale Multipliers for Celestial Bodies
export const BODY_SCALE_MULTIPLIERS: Record<string, number> = {
  sun: 1.0,
  mercury: 1.0,
  venus: 1.0,
  earth: 1.0,
  mars: 1.0,
  jupiter: 0.6,
  saturn: 0.4,
  uranus: 0.25,
  neptune: 0.2,
  pluto: 0.12,
  moon: 1.0,
}

// Default Visibility Settings
export const DEFAULT_VISIBILITY = {
  body: true,
  orbit: true,
  label: true,
  trail: false,
  footprint: true,
  projectionLine: true,
  glow: true,
  rings: true,
} as const

// Zodiac Constants
export const ZODIAC_CONSTANTS = {
  /** Degrees per zodiac sign (360 / 12) */
  DEGREES_PER_SIGN: 30,
  /** Number of zodiac signs */
  NUMBER_OF_SIGNS: 12,
} as const
