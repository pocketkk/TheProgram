/**
 * Aspect Pattern Detection
 * Identifies special geometric configurations in birth charts
 */

import type { Aspect, PlanetPosition, BirthChart } from './types'

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
 */
export function detectPatterns(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []

  patterns.push(...detectGrandTrines(chart))
  patterns.push(...detectGrandCrosses(chart))
  patterns.push(...detectTSquares(chart))
  patterns.push(...detectYods(chart))
  patterns.push(...detectKites(chart))
  patterns.push(...detectMysticRectangles(chart))
  patterns.push(...detectStelliums(chart))

  return patterns.sort((a, b) => b.strength - a.strength)
}

/**
 * Grand Trine: Three planets 120° apart forming a triangle
 */
function detectGrandTrines(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets
  const trines = chart.aspects.filter(a => a.type === 'Trine')

  // Check all combinations of 3 planets
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        const p1 = planets[i].name
        const p2 = planets[j].name
        const p3 = planets[k].name

        // Check if all three are trine to each other
        const has12 = trines.some(
          t => (t.planet1 === p1 && t.planet2 === p2) || (t.planet1 === p2 && t.planet2 === p1)
        )
        const has23 = trines.some(
          t => (t.planet1 === p2 && t.planet2 === p3) || (t.planet1 === p3 && t.planet2 === p2)
        )
        const has31 = trines.some(
          t => (t.planet1 === p3 && t.planet2 === p1) || (t.planet1 === p1 && t.planet2 === p3)
        )

        if (has12 && has23 && has31) {
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
 */
function detectGrandCrosses(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets
  const squares = chart.aspects.filter(a => a.type === 'Square')
  const oppositions = chart.aspects.filter(a => a.type === 'Opposition')

  // Check all combinations of 4 planets
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      for (let k = j + 1; k < planets.length; k++) {
        for (let l = k + 1; l < planets.length; l++) {
          const p1 = planets[i].name
          const p2 = planets[j].name
          const p3 = planets[k].name
          const p4 = planets[l].name

          // Check if they form a cross pattern
          const hasOpposition12_34 =
            oppositions.some(
              o => (o.planet1 === p1 && o.planet2 === p3) || (o.planet1 === p3 && o.planet2 === p1)
            ) &&
            oppositions.some(
              o => (o.planet1 === p2 && o.planet2 === p4) || (o.planet1 === p4 && o.planet2 === p2)
            )

          const hasSquares =
            squares.some(
              s => (s.planet1 === p1 && s.planet2 === p2) || (s.planet1 === p2 && s.planet2 === p1)
            ) &&
            squares.some(
              s => (s.planet1 === p2 && s.planet2 === p3) || (s.planet1 === p3 && s.planet2 === p2)
            ) &&
            squares.some(
              s => (s.planet1 === p3 && s.planet2 === p4) || (s.planet1 === p4 && s.planet2 === p3)
            ) &&
            squares.some(
              s => (s.planet1 === p4 && s.planet2 === p1) || (s.planet1 === p1 && s.planet2 === p4)
            )

          if (hasOpposition12_34 && hasSquares) {
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
 */
function detectTSquares(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets
  const squares = chart.aspects.filter(a => a.type === 'Square')
  const oppositions = chart.aspects.filter(a => a.type === 'Opposition')

  for (const opp of oppositions) {
    const p1 = opp.planet1
    const p2 = opp.planet2

    // Find planets square to both
    for (const planet of planets) {
      const p3 = planet.name
      if (p3 === p1 || p3 === p2) continue

      const squareToP1 = squares.some(
        s => (s.planet1 === p1 && s.planet2 === p3) || (s.planet1 === p3 && s.planet2 === p1)
      )
      const squareToP2 = squares.some(
        s => (s.planet1 === p2 && s.planet2 === p3) || (s.planet1 === p3 && s.planet2 === p2)
      )

      if (squareToP1 && squareToP2) {
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
 */
function detectYods(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets
  const sextiles = chart.aspects.filter(a => a.type === 'Sextile')
  const quincunxes = chart.aspects.filter(a => a.type === 'Quincunx')

  for (const sext of sextiles) {
    const p1 = sext.planet1
    const p2 = sext.planet2

    for (const planet of planets) {
      const p3 = planet.name
      if (p3 === p1 || p3 === p2) continue

      const quincunxToP1 = quincunxes.some(
        q => (q.planet1 === p1 && q.planet2 === p3) || (q.planet1 === p3 && q.planet2 === p1)
      )
      const quincunxToP2 = quincunxes.some(
        q => (q.planet1 === p2 && q.planet2 === p3) || (q.planet1 === p3 && q.planet2 === p2)
      )

      if (quincunxToP1 && quincunxToP2) {
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
 */
function detectKites(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const grandTrines = detectGrandTrines(chart)

  for (const trine of grandTrines) {
    const [p1, p2, p3] = trine.planets
    const planets = chart.planets

    // Look for fourth planet opposite one of the trine planets
    for (const planet of planets) {
      const p4 = planet.name
      if (trine.planets.includes(p4)) continue

      const oppositions = chart.aspects.filter(a => a.type === 'Opposition')
      const sextiles = chart.aspects.filter(a => a.type === 'Sextile')

      // Check if p4 is opposite p1 and sextile to p2 and p3
      const oppToP1 = oppositions.some(
        o => (o.planet1 === p1 && o.planet2 === p4) || (o.planet1 === p4 && o.planet2 === p1)
      )
      const sextToP2 = sextiles.some(
        s => (s.planet1 === p2 && s.planet2 === p4) || (s.planet1 === p4 && s.planet2 === p2)
      )
      const sextToP3 = sextiles.some(
        s => (s.planet1 === p3 && s.planet2 === p4) || (s.planet1 === p4 && s.planet2 === p3)
      )

      if (oppToP1 && sextToP2 && sextToP3) {
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
 */
function detectMysticRectangles(chart: BirthChart): AspectPattern[] {
  const patterns: AspectPattern[] = []
  const planets = chart.planets
  const oppositions = chart.aspects.filter(a => a.type === 'Opposition')
  const sextiles = chart.aspects.filter(a => a.type === 'Sextile')
  const trines = chart.aspects.filter(a => a.type === 'Trine')

  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const opp1 = oppositions[i]
      const opp2 = oppositions[j]

      const p1 = opp1.planet1
      const p2 = opp1.planet2
      const p3 = opp2.planet1
      const p4 = opp2.planet2

      // Check if sextiles and trines connect them properly
      const hasSextiles =
        (sextiles.some(
          s => (s.planet1 === p1 && s.planet2 === p3) || (s.planet1 === p3 && s.planet2 === p1)
        ) &&
          sextiles.some(
            s => (s.planet1 === p2 && s.planet2 === p4) || (s.planet1 === p4 && s.planet2 === p2)
          )) ||
        (sextiles.some(
          s => (s.planet1 === p1 && s.planet2 === p4) || (s.planet1 === p4 && s.planet2 === p1)
        ) &&
          sextiles.some(
            s => (s.planet1 === p2 && s.planet2 === p3) || (s.planet1 === p3 && s.planet2 === p2)
          ))

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
