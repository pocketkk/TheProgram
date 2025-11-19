// Utility functions and presets for celestial bodies
export {
  SATURN_RINGS,
  JUPITER_RINGS,
  URANUS_RINGS,
  createPlanetBodyData,
  createSunBodyData,
  createSatelliteBodyData,
  withRings,
  getPlanetMaterialProperties,
} from './bodyPresets'

// Mathematical calculation utilities
export {
  degreesToRadians,
  radiansToDegrees,
  normalizeAngle,
  calculateMeanAnomaly,
  daysSinceJ2000,
  lerp,
  clamp,
  calculateAngleFromCoordinates,
} from './calculations'
