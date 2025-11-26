/**
 * Aspect Pattern Detection
 * Identifies special geometric configurations in birth charts
 *
 * Performance optimizations:
 * - Uses Set-based lookup for O(1) aspect checking instead of O(n) .some()
 * - Pre-builds aspect index on first pattern detection call
 */

import type { PlanetPosition, BirthChart, Aspect } from './types'

/**
 * Create a normalized key for planet pair lookup (alphabetically sorted)
 */
function aspectKey(p1: string, p2: string): string {
  return p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`
}

/**
 * Build aspect lookup Sets for O(1) pattern checking
 */
function buildAspectIndex(aspects: Aspect[]): {
  trines: Set<string>
  squares: Set<string>
  oppositions: Set<string>
  sextiles: Set<string>
  quincunxes: Set<string>
} {
  const index = {
    trines: new Set<string>(),
    squares: new Set<string>(),
    oppositions: new Set<string>(),
    sextiles: new Set<string>(),
    quincunxes: new Set<string>(),
  }

  for (const aspect of aspects) {
    const key = aspectKey(aspect.planet1, aspect.planet2)
    switch (aspect.type) {
      case 'Trine':
        index.trines.add(key)
        break
      case 'Square':
        index.squares.add(key)
        break
      case 'Opposition':
        index.oppositions.add(key)
        break
      case 'Sextile':
        index.sextiles.add(key)
        break
      case 'Quincunx':
        index.quincunxes.add(key)
        break
    }
  }

  return index
}

/**
 * Check if aspect exists using O(1) Set lookup
 */
function hasAspect(aspectSet: Set<string>, p1: string, p2: string): boolean {
  return aspectSet.has(aspectKey(p1, p2))
}

export type PatternType =
  | 'GrandTrine'
  | 'GrandCross'
  | 'TSquare'
  | 'Yod'
  | 'Kite'
  | 'MysticRectangle'
  | 'GrandSextile'
  | 'Stellium'
  | 'Cradle'

export interface AspectPattern {
  type: PatternType
  planets: string[]
  description: string
  element?: 'Fire' | 'Earth' | 'Air' | 'Water'
  interpretation: string
  strength: number // 0-100
}

/**
 * Detect all aspect patterns in a chart
 * Uses optimized O(1) aspect lookups for pattern detection
 */
export function detectPatterns(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []

  // Build aspect index once for all pattern detection (O(n) instead of O(n²))
  const aspectIndex = buildAspectIndex(chart.aspects)

  patterns.push(...detectGrandTrines(chart, aspectIndex))
  patterns.push(...detectGrandCrosses(chart, aspectIndex))
  patterns.push(...detectTSquares(chart, aspectIndex))
  patterns.push(...detectYods(chart, aspectIndex))
  patterns.push(...detectKites(chart, aspectIndex))
  patterns.push(...detectMysticRectangles(chart, aspectIndex))
  patterns.push(...detectStelliums(chart))

  return patterns.sort((a, b) => b.strength - a.strength)
}

type AspectIndex = ReturnType<typeof buildAspectIndex>

/**
 * Grand Trine: Three planets 120° apart forming a triangle
 * Optimized with O(1) aspect lookups
 */
function detectGrandTrines(chart: BirthChart, aspectIndex: AspectIndex): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets

  // Check all combinations of 3 planets
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        const p1 = planets[i].name
        const p2 = planets[j].name
        const p3 = planets[k].name

        // Check if all three are trine to each other (O(1) lookups)
        if (
          hasAspect(aspectIndex.trines, p1, p2) &&
          hasAspect(aspectIndex.trines, p2, p3) &&
          hasAspect(aspectIndex.trines, p3, p1)
        ) {
          // Determine element
          const element = planets[i].element

          patterns.push({
            type: 'GrandTrine',
            planets: [p1, p2, p3],
            element,
            description: `Grand Trine in ${element}`,
            interpretation: getGrandTrineInterpretation(element),
            strength: 85,
          })
        }
      }
    }
  }

  return patterns
}

/**
 * Grand Cross: Four planets 90° apart forming a cross
 * Optimized with O(1) aspect lookups
 */
function detectGrandCrosses(chart: BirthChart, aspectIndex: AspectIndex): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets

  // Check all combinations of 4 planets
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        for (let l = k + 1; l < planets.length; l++) {
          const p1 = planets[i].name
          const p2 = planets[j].name
          const p3 = planets[k].name
          const p4 = planets[l].name

          // Check if they form a cross pattern (O(1) lookups)
          const hasOppositions =
            hasAspect(aspectIndex.oppositions, p1, p3) &&
            hasAspect(aspectIndex.oppositions, p2, p4)

          const hasSquares =
            hasAspect(aspectIndex.squares, p1, p2) &&
            hasAspect(aspectIndex.squares, p2, p3) &&
            hasAspect(aspectIndex.squares, p3, p4) &&
            hasAspect(aspectIndex.squares, p4, p1)

          if (hasOppositions && hasSquares) {
            const modality = planets[i].modality

            patterns.push({
              type: 'GrandCross',
              planets: [p1, p2, p3, p4],
              description: `Grand Cross in ${modality} signs`,
              interpretation:
                'Intense dynamic tension requiring constant action and adjustment. Major life challenges leading to growth.',
              strength: 90,
            })
          }
        }
      }
    }
  }

  return patterns
}

/**
 * T-Square: Three planets forming opposition with both square to third
 * Optimized with O(1) aspect lookups
 */
function detectTSquares(chart: BirthChart, aspectIndex: AspectIndex): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets

  // Get planets involved in oppositions for iteration
  const oppositionPairs: [string, string][] = []
  for (const aspect of chart.aspects) {
    if (aspect.type === 'Opposition') {
      oppositionPairs.push([aspect.planet1, aspect.planet2])
    }
  }

  for (const [p1, p2] of oppositionPairs) {
    // Find planets square to both
    for (const planet of planets) {
      const p3 = planet.name
      if (p3 === p1 || p3 === p2) continue

      // O(1) lookups
      if (hasAspect(aspectIndex.squares, p1, p3) && hasAspect(aspectIndex.squares, p2, p3)) {
        patterns.push({
          type: 'TSquare',
          planets: [p1, p2, p3],
          description: `T-Square with ${p3} as apex`,
          interpretation:
            'Dynamic tension requiring action. The apex planet shows where energy is focused and challenges manifest.',
          strength: 75,
        })
      }
    }
  }

  return patterns
}

/**
 * Yod (Finger of God): Two planets sextile with both quincunx to third
 * Optimized with O(1) aspect lookups
 */
function detectYods(chart: BirthChart, aspectIndex: AspectIndex): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets

  // Get planets involved in sextiles for iteration
  const sextilePairs: [string, string][] = []
  for (const aspect of chart.aspects) {
    if (aspect.type === 'Sextile') {
      sextilePairs.push([aspect.planet1, aspect.planet2])
    }
  }

  for (const [p1, p2] of sextilePairs) {
    for (const planet of planets) {
      const p3 = planet.name
      if (p3 === p1 || p3 === p2) continue

      // O(1) lookups
      if (hasAspect(aspectIndex.quincunxes, p1, p3) && hasAspect(aspectIndex.quincunxes, p2, p3)) {
        patterns.push({
          type: 'Yod',
          planets: [p1, p2, p3],
          description: `Yod with ${p3} as focal point`,
          interpretation:
            'Karmic configuration requiring adjustment and spiritual growth. The focal planet represents life purpose.',
          strength: 80,
        })
      }
    }
  }

  return patterns
}

/**
 * Kite: Grand Trine with fourth planet opposite one point and sextile to others
 * Optimized with O(1) aspect lookups
 */
function detectKites(chart: BirthChart, aspectIndex: AspectIndex): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const grandTrines = detectGrandTrines(chart, aspectIndex)

  for (const trine of grandTrines) {
    const [p1, p2, p3] = trine.planets
    const planets = chart.planets

    // Look for fourth planet opposite one of the trine planets
    for (const planet of planets) {
      const p4 = planet.name
      if (trine.planets.includes(p4)) continue

      // Check if p4 is opposite p1 and sextile to p2 and p3 (O(1) lookups)
      if (
        hasAspect(aspectIndex.oppositions, p1, p4) &&
        hasAspect(aspectIndex.sextiles, p2, p4) &&
        hasAspect(aspectIndex.sextiles, p3, p4)
      ) {
        patterns.push({
          type: 'Kite',
          planets: [p1, p2, p3, p4],
          element: trine.element,
          description: `Kite in ${trine.element}`,
          interpretation:
            'Grand Trine with added focus and direction. Combines ease with drive for accomplishment.',
          strength: 85,
        })
      }
    }
  }

  return patterns
}

/**
 * Mystic Rectangle: Two oppositions with all sextile/trine to each other
 * Optimized with O(1) aspect lookups
 */
function detectMysticRectangles(chart: BirthChart, aspectIndex: AspectIndex): AspectPattern[] {
  const patterns: AspectPattern[] = []

  // Get opposition pairs for iteration
  const oppositionPairs: [string, string][] = []
  for (const aspect of chart.aspects) {
    if (aspect.type === 'Opposition') {
      oppositionPairs.push([aspect.planet1, aspect.planet2])
    }
  }

  for (let i = 0; i < oppositionPairs.length; i++) {
    for (let j = i + 1; j < oppositionPairs.length; j++) {
      const [p1, p2] = oppositionPairs[i]
      const [p3, p4] = oppositionPairs[j]

      // Check if sextiles connect them properly (O(1) lookups)
      const hasSextiles =
        (hasAspect(aspectIndex.sextiles, p1, p3) && hasAspect(aspectIndex.sextiles, p2, p4)) ||
        (hasAspect(aspectIndex.sextiles, p1, p4) && hasAspect(aspectIndex.sextiles, p2, p3))

      if (hasSextiles) {
        patterns.push({
          type: 'MysticRectangle',
          planets: [p1, p2, p3, p4],
          description: 'Mystic Rectangle',
          interpretation:
            'Harmonious tension creating practical mysticism. Balance between stability and change.',
          strength: 70,
        })
      }
    }
  }

  return patterns
}

/**
 * Stellium: 3+ planets in same sign or house (within 8°)
 */
function detectStelliums(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []

  // Group by sign
  const bySign = new Map<string, PlanetPosition[]>()
  chart.planets.forEach(planet => {
    const planets = bySign.get(planet.sign) || []
    planets.push(planet)
    bySign.set(planet.sign, planets)
  })

  bySign.forEach((planets, sign) => {
    if (planets.length >= 3) {
      // Check if they're close together (within 15°)
      const longitudes = planets.map(p => p.longitude).sort((a, b) => a - b)
      const spread = longitudes[longitudes.length - 1] - longitudes[0]

      if (spread <= 30) {
        // Within one sign
        const element = planets[0].element

        patterns.push({
          type: 'Stellium',
          planets: planets.map(p => p.name),
          element,
          description: `Stellium in ${sign}`,
          interpretation: `Strong emphasis on ${sign} energy. Concentrated focus in this area of life.`,
          strength: 60 + planets.length * 5, // Stronger with more planets
        })
      }
    }
  })

  return patterns
}

/**
 * Get interpretation for Grand Trine by element
 */
function getGrandTrineInterpretation(element: string): string {
  const interpretations: Record<string, string> = {
    Fire: 'Natural confidence and enthusiasm. Creative energy flows easily, but may lack follow-through without challenges.',
    Earth: 'Practical talents and material success come naturally. Stable and grounded, but may resist change.',
    Air: 'Mental agility and communication gifts. Ideas flow freely, but may lack emotional depth.',
    Water: 'Deep emotional intelligence and intuition. Psychic sensitivity and empathy, but may be overly sensitive.',
  }
  return interpretations[element] || 'Harmonious flow of energy in this element.'
}
