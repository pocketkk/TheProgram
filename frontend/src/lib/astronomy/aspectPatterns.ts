/**
 * Aspect Pattern Detection for Astrological Chart Analysis
 * Detects special geometric patterns formed by planetary aspects
 */

export interface PlanetPosition {
  name: string
  angle: number
  x: number
  y: number
  z: number
}

export type PatternType = 'grand-trine' | 't-square' | 'grand-cross' | 'yod' | 'kite' | 'stellium'

export interface AspectPattern {
  type: PatternType
  planets: string[]
  description: string
  color: string
  strength: number // 0-1 based on orb tightness
}

/**
 * Check if an angle is within orb of a target aspect angle
 */
function isAspect(angle1: number, angle2: number, targetAngle: number, orb: number): boolean {
  const diff = Math.abs(((angle1 - angle2 + 180) % 360) - 180)
  return Math.abs(diff - targetAngle) <= orb
}

/**
 * Calculate orb deviation for an aspect
 */
function getOrbDeviation(angle1: number, angle2: number, targetAngle: number): number {
  const diff = Math.abs(((angle1 - angle2 + 180) % 360) - 180)
  return Math.abs(diff - targetAngle)
}

/**
 * Detect Grand Trine: 3 planets each 120° apart forming an equilateral triangle
 */
export function detectGrandTrines(planets: PlanetPosition[]): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const orb = 8 // degrees

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        const p1 = planets[i]
        const p2 = planets[j]
        const p3 = planets[k]

        // Check if all three form trines (120°)
        if (
          isAspect(p1.angle, p2.angle, 120, orb) &&
          isAspect(p2.angle, p3.angle, 120, orb) &&
          isAspect(p3.angle, p1.angle, 120, orb)
        ) {
          // Calculate average orb deviation for strength
          const dev1 = getOrbDeviation(p1.angle, p2.angle, 120)
          const dev2 = getOrbDeviation(p2.angle, p3.angle, 120)
          const dev3 = getOrbDeviation(p3.angle, p1.angle, 120)
          const avgDeviation = (dev1 + dev2 + dev3) / 3
          const strength = 1 - (avgDeviation / orb)

          patterns.push({
            type: 'grand-trine',
            planets: [p1.name, p2.name, p3.name],
            description: `Grand Trine: ${p1.name}, ${p2.name}, ${p3.name}`,
            color: '#98FB98', // Light green for harmonious trine energy
            strength: Math.max(0, Math.min(1, strength))
          })
        }
      }
    }
  }

  return patterns
}

/**
 * Detect T-Square: 2 planets in opposition (180°) both square (90°) a third planet
 */
export function detectTSquares(planets: PlanetPosition[]): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const orb = 8

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = 0; k < planets.length; k++) {
        if (k === i || k === j) continue

        const p1 = planets[i]
        const p2 = planets[j]
        const apex = planets[k]

        // Check if p1 and p2 are in opposition and both square the apex
        if (
          isAspect(p1.angle, p2.angle, 180, orb) &&
          isAspect(p1.angle, apex.angle, 90, orb) &&
          isAspect(p2.angle, apex.angle, 90, orb)
        ) {
          const dev1 = getOrbDeviation(p1.angle, p2.angle, 180)
          const dev2 = getOrbDeviation(p1.angle, apex.angle, 90)
          const dev3 = getOrbDeviation(p2.angle, apex.angle, 90)
          const avgDeviation = (dev1 + dev2 + dev3) / 3
          const strength = 1 - (avgDeviation / orb)

          patterns.push({
            type: 't-square',
            planets: [p1.name, p2.name, apex.name],
            description: `T-Square: ${apex.name} apex to ${p1.name}-${p2.name}`,
            color: '#FF6347', // Tomato red for challenging square energy
            strength: Math.max(0, Math.min(1, strength))
          })
        }
      }
    }
  }

  return patterns
}

/**
 * Detect Grand Cross: 4 planets forming 2 oppositions and 4 squares
 */
export function detectGrandCrosses(planets: PlanetPosition[]): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const orb = 8

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        for (let l = k + 1; l < planets.length; l++) {
          const p1 = planets[i]
          const p2 = planets[j]
          const p3 = planets[k]
          const p4 = planets[l]

          // Check for two oppositions and all squares
          // Pattern: p1-p3 opposition, p2-p4 opposition, and all adjacent squares
          if (
            isAspect(p1.angle, p3.angle, 180, orb) &&
            isAspect(p2.angle, p4.angle, 180, orb) &&
            isAspect(p1.angle, p2.angle, 90, orb) &&
            isAspect(p2.angle, p3.angle, 90, orb) &&
            isAspect(p3.angle, p4.angle, 90, orb) &&
            isAspect(p4.angle, p1.angle, 90, orb)
          ) {
            const deviations = [
              getOrbDeviation(p1.angle, p3.angle, 180),
              getOrbDeviation(p2.angle, p4.angle, 180),
              getOrbDeviation(p1.angle, p2.angle, 90),
              getOrbDeviation(p2.angle, p3.angle, 90),
              getOrbDeviation(p3.angle, p4.angle, 90),
              getOrbDeviation(p4.angle, p1.angle, 90)
            ]
            const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length
            const strength = 1 - (avgDeviation / orb)

            patterns.push({
              type: 'grand-cross',
              planets: [p1.name, p2.name, p3.name, p4.name],
              description: `Grand Cross: ${p1.name}, ${p2.name}, ${p3.name}, ${p4.name}`,
              color: '#DC143C', // Crimson for intense cross energy
              strength: Math.max(0, Math.min(1, strength))
            })
          }
        }
      }
    }
  }

  return patterns
}

/**
 * Detect Yod (Finger of God): 2 planets in sextile (60°) both quincunx (150°) a third
 */
export function detectYods(planets: PlanetPosition[]): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const orb = 6 // Tighter orb for quincunx

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = 0; k < planets.length; k++) {
        if (k === i || k === j) continue

        const p1 = planets[i]
        const p2 = planets[j]
        const apex = planets[k]

        // Check if p1 and p2 are in sextile and both quincunx the apex
        if (
          isAspect(p1.angle, p2.angle, 60, orb) &&
          isAspect(p1.angle, apex.angle, 150, orb) &&
          isAspect(p2.angle, apex.angle, 150, orb)
        ) {
          const dev1 = getOrbDeviation(p1.angle, p2.angle, 60)
          const dev2 = getOrbDeviation(p1.angle, apex.angle, 150)
          const dev3 = getOrbDeviation(p2.angle, apex.angle, 150)
          const avgDeviation = (dev1 + dev2 + dev3) / 3
          const strength = 1 - (avgDeviation / orb)

          patterns.push({
            type: 'yod',
            planets: [p1.name, p2.name, apex.name],
            description: `Yod: ${apex.name} apex to ${p1.name}-${p2.name}`,
            color: '#9370DB', // Medium purple for karmic/fated energy
            strength: Math.max(0, Math.min(1, strength))
          })
        }
      }
    }
  }

  return patterns
}

/**
 * Detect Kite: Grand Trine with a 4th planet in opposition to one vertex
 */
export function detectKites(planets: PlanetPosition[]): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const orb = 8

  // First find all grand trines
  const grandTrines = detectGrandTrines(planets)

  // For each grand trine, check if there's a 4th planet in opposition to one of the vertices
  for (const trine of grandTrines) {
    const trinePlanets = planets.filter(p => trine.planets.includes(p.name))

    for (const planet of planets) {
      if (trine.planets.includes(planet.name)) continue

      // Check if this planet is in opposition to any vertex and sextile to the other two
      for (const vertex of trinePlanets) {
        const otherTwo = trinePlanets.filter(p => p.name !== vertex.name)

        if (
          isAspect(planet.angle, vertex.angle, 180, orb) &&
          isAspect(planet.angle, otherTwo[0].angle, 60, orb) &&
          isAspect(planet.angle, otherTwo[1].angle, 60, orb)
        ) {
          const deviations = [
            getOrbDeviation(planet.angle, vertex.angle, 180),
            getOrbDeviation(planet.angle, otherTwo[0].angle, 60),
            getOrbDeviation(planet.angle, otherTwo[1].angle, 60)
          ]
          const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length
          const strength = 1 - (avgDeviation / orb)

          patterns.push({
            type: 'kite',
            planets: [...trine.planets, planet.name],
            description: `Kite: ${trine.planets.join(', ')} with ${planet.name}`,
            color: '#87CEEB', // Sky blue for elevated trine energy
            strength: Math.max(0, Math.min(1, strength))
          })
        }
      }
    }
  }

  return patterns
}

/**
 * Detect Stellium: 3+ planets within 10° of each other
 */
export function detectStelliums(planets: PlanetPosition[]): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const orb = 10

  // Group planets that are close together
  const groups: PlanetPosition[][] = []

  for (const planet of planets) {
    let addedToGroup = false

    for (const group of groups) {
      // Check if planet is within orb of all planets in the group
      const withinOrb = group.every(p => {
        const diff = Math.abs(((planet.angle - p.angle + 180) % 360) - 180)
        return diff <= orb
      })

      if (withinOrb) {
        group.push(planet)
        addedToGroup = true
        break
      }
    }

    if (!addedToGroup) {
      groups.push([planet])
    }
  }

  // Find groups with 3+ planets
  for (const group of groups) {
    if (group.length >= 3) {
      // Calculate spread (max angular distance within group)
      let maxSpread = 0
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const diff = Math.abs(((group[i].angle - group[j].angle + 180) % 360) - 180)
          maxSpread = Math.max(maxSpread, diff)
        }
      }

      const strength = 1 - (maxSpread / orb)

      patterns.push({
        type: 'stellium',
        planets: group.map(p => p.name),
        description: `Stellium: ${group.map(p => p.name).join(', ')}`,
        color: '#FFD700', // Gold for concentrated energy
        strength: Math.max(0, Math.min(1, strength))
      })
    }
  }

  return patterns
}

/**
 * Detect all aspect patterns in a chart
 */
export function detectAllPatterns(planets: PlanetPosition[]): AspectPattern[] {
  return [
    ...detectGrandTrines(planets),
    ...detectTSquares(planets),
    ...detectGrandCrosses(planets),
    ...detectYods(planets),
    ...detectKites(planets),
    ...detectStelliums(planets)
  ]
}
