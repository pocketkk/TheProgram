import type { CelestialBodyData, RingData } from '../types'

/**
 * Ring configurations for ringed planets
 */
export const SATURN_RINGS: RingData[] = [
  // Inner C Ring
  {
    innerRadius: 1.3,
    outerRadius: 1.7,
    color: '#B8A072',
    opacity: 0.3,
  },
  // Bright B Ring
  {
    innerRadius: 1.75,
    outerRadius: 2.3,
    color: '#D4B896',
    opacity: 0.7,
  },
  // A Ring (after Cassini Division)
  {
    innerRadius: 2.35,
    outerRadius: 2.8,
    color: '#C8A882',
    opacity: 0.6,
  },
  // Faint outer rings
  {
    innerRadius: 2.85,
    outerRadius: 3.2,
    color: '#A89070',
    opacity: 0.2,
  },
]

export const JUPITER_RINGS: RingData[] = [
  {
    innerRadius: 1.8,
    outerRadius: 2.5,
    color: '#D4A574',
    opacity: 0.15,
  },
]

export const URANUS_RINGS: RingData[] = [
  {
    innerRadius: 1.6,
    outerRadius: 1.65,
    color: '#2F4F6F',
    opacity: 0.4,
  },
  {
    innerRadius: 1.8,
    outerRadius: 1.85,
    color: '#2F4F6F',
    opacity: 0.35,
  },
]

/**
 * Helper to create a complete planet data object from existing PlanetData
 */
export function createPlanetBodyData(
  id: string,
  name: string,
  planetData: {
    color: string
    radius: number
    orbitRadius: number
    orbitPeriod: number
    inclination: number
    rotationPeriod: number
  },
  overrides?: Partial<CelestialBodyData>
): CelestialBodyData {
  return {
    id,
    name,
    type: 'planet',
    color: planetData.color,
    radius: planetData.radius,
    orbitRadius: planetData.orbitRadius,
    orbitPeriod: planetData.orbitPeriod,
    inclination: planetData.inclination,
    rotationPeriod: planetData.rotationPeriod,
    materialType: 'standard',
    zodiacEnabled: true,
    retrogradeEnabled: true,
    ...overrides,
  }
}

/**
 * Helper to create Sun data
 */
export function createSunBodyData(): CelestialBodyData {
  return {
    id: 'sun',
    name: 'Sun',
    type: 'star',
    symbol: '☉',
    color: '#FFFF00',
    radius: 696000, // km
    orbitRadius: 0, // Stationary in heliocentric
    orbitPeriod: 0,
    inclination: 0,
    rotationPeriod: 25.4, // Days at equator
    materialType: 'basic',
    hasCorona: true,
    coronaLayers: 3,
    zodiacEnabled: false,
  }
}

/**
 * Helper to create satellite data
 */
export function createSatelliteBodyData(
  id: string,
  name: string,
  parentId: string,
  satelliteData: {
    color: string
    radius: number
    orbitRadius: number
    orbitPeriod: number
    inclination: number
    rotationPeriod: number
  },
  overrides?: Partial<CelestialBodyData>
): CelestialBodyData {
  return {
    id,
    name,
    type: 'satellite',
    parentId,
    color: satelliteData.color,
    radius: satelliteData.radius,
    orbitRadius: satelliteData.orbitRadius,
    orbitPeriod: satelliteData.orbitPeriod,
    inclination: satelliteData.inclination,
    rotationPeriod: satelliteData.rotationPeriod,
    materialType: 'standard',
    zodiacEnabled: false,
    ...overrides,
  }
}

/**
 * Add rings to a planet body data
 */
export function withRings(
  bodyData: CelestialBodyData,
  rings: RingData[]
): CelestialBodyData {
  return {
    ...bodyData,
    hasRings: true,
    ringData: rings,
  }
}

/**
 * Get material properties for a specific planet
 */
export function getPlanetMaterialProperties(planetId: string): {
  roughness: number
  metalness: number
  emissiveIntensity: number
} {
  const properties: Record<string, { roughness: number; metalness: number; emissiveIntensity: number }> = {
    mercury: { roughness: 0.9, metalness: 0.4, emissiveIntensity: 0.1 },
    venus: { roughness: 0.3, metalness: 0.1, emissiveIntensity: 0.15 },
    earth: { roughness: 0.6, metalness: 0.2, emissiveIntensity: 0.12 },
    mars: { roughness: 0.8, metalness: 0.15, emissiveIntensity: 0.08 },
    jupiter: { roughness: 0.4, metalness: 0.1, emissiveIntensity: 0.2 },
    saturn: { roughness: 0.5, metalness: 0.1, emissiveIntensity: 0.15 },
    uranus: { roughness: 0.3, metalness: 0.2, emissiveIntensity: 0.1 },
    neptune: { roughness: 0.3, metalness: 0.2, emissiveIntensity: 0.12 },
  }

  return properties[planetId.toLowerCase()] || {
    roughness: 0.7,
    metalness: 0.2,
    emissiveIntensity: 0.1,
  }
}
