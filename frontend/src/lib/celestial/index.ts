/**
 * Celestial Body Module - Single source of truth for celestial body definitions
 */

// Core registry
export {
  CELESTIAL_BODIES,
  getBody,
  getAllBodies,
  getAllBodyIds,
  getDefaultBodies,
  getDefaultBodyIds,
  getBodiesByCategory,
  getFixedStars,
  getAsteroids,
  getMainPlanets,
  type BodyCategory,
  type CelestialBodyDef,
} from './registry'

// Backward compatibility adapters
export {
  PLANETS_COMPAT,
  getLegacyPlanets,
  getBodyByName,
  getPlanetColor,
  getPlanetSymbol,
  canBeRetrograde,
  type LegacyPlanetDef,
} from './adapter'
