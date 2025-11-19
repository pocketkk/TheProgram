/**
 * Planetary Dignities in Traditional Astrology
 * Essential dignities describe how well a planet functions in a particular zodiac sign
 */

export type DignityType = 'rulership' | 'exaltation' | 'detriment' | 'fall' | 'peregrine'

export interface Dignity {
  type: DignityType
  strength: number // -2 to +2 (fall = -2, detriment = -1, peregrine = 0, exaltation = +1, rulership = +2)
  description: string
  color: string
}

/**
 * Traditional rulerships for each planet
 * Maps planet name to the zodiac sign(s) it rules
 */
const RULERSHIPS: Record<string, string[]> = {
  sun: ['Leo'],
  moon: ['Cancer'],
  mercury: ['Gemini', 'Virgo'],
  venus: ['Taurus', 'Libra'],
  mars: ['Aries', 'Scorpio'],
  jupiter: ['Sagittarius', 'Pisces'],
  saturn: ['Capricorn', 'Aquarius'],
  uranus: ['Aquarius'], // Modern ruler
  neptune: ['Pisces'], // Modern ruler
  pluto: ['Scorpio'], // Modern ruler
}

/**
 * Exaltations - signs where planets function particularly well
 */
const EXALTATIONS: Record<string, string> = {
  sun: 'Aries',
  moon: 'Taurus',
  mercury: 'Virgo',
  venus: 'Pisces',
  mars: 'Capricorn',
  jupiter: 'Cancer',
  saturn: 'Libra',
  // Outer planets don't have traditional exaltations
}

/**
 * Get the opposite sign (180° across the zodiac)
 */
const OPPOSITE_SIGNS: Record<string, string> = {
  'Aries': 'Libra',
  'Taurus': 'Scorpio',
  'Gemini': 'Sagittarius',
  'Cancer': 'Capricorn',
  'Leo': 'Aquarius',
  'Virgo': 'Pisces',
  'Libra': 'Aries',
  'Scorpio': 'Taurus',
  'Sagittarius': 'Gemini',
  'Capricorn': 'Cancer',
  'Aquarius': 'Leo',
  'Pisces': 'Virgo',
}

/**
 * Calculate the dignity of a planet in a given zodiac sign
 */
export function calculateDignity(planetName: string, zodiacSignName: string): Dignity {
  const planet = planetName.toLowerCase()

  // Check for rulership (domicile)
  if (RULERSHIPS[planet]?.includes(zodiacSignName)) {
    return {
      type: 'rulership',
      strength: 2,
      description: `${planetName} is in its home sign, operating at full strength`,
      color: '#10b981' // emerald-500
    }
  }

  // Check for exaltation
  if (EXALTATIONS[planet] === zodiacSignName) {
    return {
      type: 'exaltation',
      strength: 1,
      description: `${planetName} is exalted here, functioning with enhanced dignity`,
      color: '#3b82f6' // blue-500
    }
  }

  // Check for detriment (opposite of rulership)
  const rulershipSigns = RULERSHIPS[planet] || []
  const detrimenSigns = rulershipSigns.map(sign => OPPOSITE_SIGNS[sign])
  if (detrimenSigns.includes(zodiacSignName)) {
    return {
      type: 'detriment',
      strength: -1,
      description: `${planetName} is in detriment, operating with reduced effectiveness`,
      color: '#f59e0b' // amber-500
    }
  }

  // Check for fall (opposite of exaltation)
  const exaltationSign = EXALTATIONS[planet]
  if (exaltationSign && OPPOSITE_SIGNS[exaltationSign] === zodiacSignName) {
    return {
      type: 'fall',
      strength: -2,
      description: `${planetName} is in fall, struggling to express its energy`,
      color: '#ef4444' // red-500
    }
  }

  // Peregrine - no essential dignity
  return {
    type: 'peregrine',
    strength: 0,
    description: `${planetName} has no essential dignity in this sign`,
    color: '#6b7280' // gray-500
  }
}

/**
 * Get dignity icon/emoji
 */
export function getDignityIcon(dignityType: DignityType): string {
  const icons = {
    rulership: '👑', // Crown for rulership
    exaltation: '⬆️', // Up arrow for exaltation
    detriment: '⚠️', // Warning for detriment
    fall: '⬇️', // Down arrow for fall
    peregrine: '○', // Circle for neutral
  }
  return icons[dignityType]
}

/**
 * Get dignity label
 */
export function getDignityLabel(dignityType: DignityType): string {
  const labels = {
    rulership: 'Rulership',
    exaltation: 'Exaltation',
    detriment: 'Detriment',
    fall: 'Fall',
    peregrine: 'Peregrine',
  }
  return labels[dignityType]
}

/**
 * Get all planets in dignity at a given time
 * Returns array of {planet, sign, dignity} for planets with notable dignities
 */
export function getNotableDignities(
  planetPositions: Array<{ name: string; signName: string }>
): Array<{ planetName: string; signName: string; dignity: Dignity }> {
  const notable: Array<{ planetName: string; signName: string; dignity: Dignity }> = []

  for (const pos of planetPositions) {
    const dignity = calculateDignity(pos.name, pos.signName)

    // Only include if it has a notable dignity (not peregrine)
    if (dignity.type !== 'peregrine') {
      notable.push({
        planetName: pos.name,
        signName: pos.signName,
        dignity
      })
    }
  }

  // Sort by strength (strongest first)
  notable.sort((a, b) => b.dignity.strength - a.dignity.strength)

  return notable
}
