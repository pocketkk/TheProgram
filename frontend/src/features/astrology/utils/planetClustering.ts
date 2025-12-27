/**
 * Planet Clustering Algorithm
 *
 * When planets are close together (within threshold), fan them out
 * to prevent visual overlap while maintaining connection to actual position
 */

import type { PlanetPosition } from '@/lib/astrology/types'

export interface ClusteredPlanet extends PlanetPosition {
  displayAngle: number // Where to draw the planet symbol
  actualAngle: number // Actual astronomical position
  isClustered: boolean
  clusterIndex?: number
  clusterSize?: number
}

export interface ClusterInfo {
  planets: ClusteredPlanet[]
  centerAngle: number
  spreadArc: number
}

const CLUSTER_THRESHOLD = 15 // Planets within 15° are considered clustered
const MAX_SPREAD_ARC = 30 // Maximum arc to spread planets (in degrees)
const MIN_PLANET_SPACING = 8 // Minimum spacing between planets in display

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

/**
 * Calculate angular distance between two angles
 * Accounts for wrap-around at 0°/360°
 */
function angularDistance(angle1: number, angle2: number): number {
  const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2))
  return Math.min(diff, 360 - diff)
}

/**
 * Check if two planets are close enough to cluster
 */
function shouldCluster(planet1: PlanetPosition, planet2: PlanetPosition): boolean {
  return angularDistance(planet1.longitude, planet2.longitude) < CLUSTER_THRESHOLD
}

/**
 * Group planets into clusters based on proximity
 */
function groupPlanets(planets: PlanetPosition[]): PlanetPosition[][] {
  if (planets.length === 0) return []

  // Sort planets by longitude
  const sorted = [...planets].sort((a, b) => {
    const normA = normalizeAngle(a.longitude)
    const normB = normalizeAngle(b.longitude)
    return normA - normB
  })

  const clusters: PlanetPosition[][] = []
  let currentCluster: PlanetPosition[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const shouldGroup = shouldCluster(sorted[i - 1], sorted[i])

    if (shouldGroup) {
      currentCluster.push(sorted[i])
    } else {
      clusters.push(currentCluster)
      currentCluster = [sorted[i]]
    }
  }
  clusters.push(currentCluster)

  // Handle wrap-around: check if first and last clusters should merge
  if (clusters.length > 1) {
    const firstCluster = clusters[0]
    const lastCluster = clusters[clusters.length - 1]
    const firstPlanet = firstCluster[0]
    const lastPlanet = lastCluster[lastCluster.length - 1]

    // Check if they span across 0° and should be merged
    const crossesZero = shouldCluster(lastPlanet, firstPlanet)
    if (crossesZero) {
      // Merge last cluster into first
      clusters[0] = [...lastCluster, ...firstCluster]
      clusters.pop()
    }
  }

  return clusters
}

/**
 * Calculate the center angle of a cluster
 * Handles wrap-around at 0°/360°
 */
function calculateClusterCenter(planets: PlanetPosition[]): number {
  if (planets.length === 0) return 0
  if (planets.length === 1) return planets[0].longitude

  // Simple average of longitudes
  const longitudes = planets.map(p => normalizeAngle(p.longitude))
  const sum = longitudes.reduce((acc, lon) => acc + lon, 0)
  return normalizeAngle(sum / longitudes.length)
}

/**
 * Fan out planets in a cluster around the center angle
 */
function fanOutCluster(
  cluster: PlanetPosition[],
  clusterIndex: number
): ClusteredPlanet[] {
  if (cluster.length === 1) {
    // Single planet - no clustering needed
    return [
      {
        ...cluster[0],
        displayAngle: cluster[0].longitude,
        actualAngle: cluster[0].longitude,
        isClustered: false,
      },
    ]
  }

  // Multiple planets - fan them out
  const centerAngle = calculateClusterCenter(cluster)

  // Calculate spread arc based on number of planets
  // More planets = wider spread (up to MAX_SPREAD_ARC)
  const idealSpacing = MIN_PLANET_SPACING * cluster.length
  const spreadArc = Math.min(idealSpacing, MAX_SPREAD_ARC)

  // Sort cluster planets by their actual longitude for consistent ordering
  const sortedCluster = [...cluster].sort((a, b) => {
    // Use center angle to determine sorting direction
    const distA = angularDistance(a.longitude, centerAngle)
    const distB = angularDistance(b.longitude, centerAngle)

    // If roughly equal distance, use actual longitude
    if (Math.abs(distA - distB) < 1) {
      return normalizeAngle(a.longitude) - normalizeAngle(b.longitude)
    }

    return distA - distB
  })

  // Calculate display angles
  const step = cluster.length > 1 ? spreadArc / (cluster.length - 1) : 0
  const startAngle = centerAngle - spreadArc / 2

  return sortedCluster.map((planet, i) => ({
    ...planet,
    displayAngle: normalizeAngle(startAngle + i * step),
    actualAngle: planet.longitude,
    isClustered: true,
    clusterIndex,
    clusterSize: cluster.length,
  }))
}

/**
 * Main function: Cluster planets that are close together
 *
 * @param planets - Array of planet positions
 * @returns Array of clustered planets with display angles
 */
export function clusterPlanets(planets: PlanetPosition[]): ClusteredPlanet[] {
  // Group planets into clusters
  const clusters = groupPlanets(planets)

  // Fan out each cluster
  const clusteredPlanets = clusters.flatMap((cluster, index) =>
    fanOutCluster(cluster, index)
  )

  return clusteredPlanets
}

/**
 * Get cluster information for rendering connection lines
 *
 * @param clusteredPlanets - Array of clustered planets
 * @returns Array of cluster info objects
 */
export function getClusterInfo(clusteredPlanets: ClusteredPlanet[]): ClusterInfo[] {
  const clusters = new Map<number, ClusteredPlanet[]>()

  // Group by cluster index
  clusteredPlanets
    .filter(p => p.isClustered && p.clusterIndex !== undefined)
    .forEach(planet => {
      const clusterIdx = planet.clusterIndex!
      if (!clusters.has(clusterIdx)) {
        clusters.set(clusterIdx, [])
      }
      clusters.get(clusterIdx)!.push(planet)
    })

  // Calculate cluster info
  return Array.from(clusters.entries()).map(([, planets]) => {
    const centerAngle = calculateClusterCenter(planets)
    const displayAngles = planets.map(p => p.displayAngle)
    const spreadArc = Math.max(...displayAngles) - Math.min(...displayAngles)

    return {
      planets,
      centerAngle,
      spreadArc,
    }
  })
}

/**
 * Check if clustering would improve readability
 * (Useful for debugging or conditional clustering)
 */
export function shouldApplyClustering(planets: PlanetPosition[]): boolean {
  const clusters = groupPlanets(planets)
  return clusters.some(cluster => cluster.length > 1)
}
