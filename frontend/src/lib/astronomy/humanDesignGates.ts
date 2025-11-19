/**
 * Human Design Gates
 * 64 gates corresponding to the I Ching hexagrams
 * Positioned around the 360-degree mandala wheel
 */

export interface HumanDesignGate {
  number: number
  name: string
  startDegree: number
  endDegree: number
  zodiacSign: string
}

/**
 * The 64 Human Design Gates with their precise zodiac positions
 * Each gate occupies exactly 5.625 degrees (360° / 64 gates)
 * Gates are numbered 1-64 and positioned according to the Human Design system
 * Gates are NOT split at zodiac boundaries - they occupy continuous 5.625° segments
 */

// Helper function to get zodiac sign for a degree
function getZodiacSign(degree: number): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  return signs[Math.floor(degree / 30)]
}

// Traditional Human Design gate order starting from 0° Aries
const gateOrder = [
  25, 51, 3, 27, 24, 2,      // Aries region (approx)
  23, 8, 20, 16, 35, 45,     // Taurus-Gemini region
  12, 15, 52, 39, 53, 62,    // Gemini-Cancer region
  56, 31, 33, 7, 4, 29,      // Cancer-Leo region
  59, 40, 64, 47, 6, 46,     // Leo-Virgo region
  18, 48, 57, 32, 50, 28,    // Virgo-Libra region
  44, 1, 43, 14, 34, 9,      // Libra-Scorpio region
  5, 26, 11, 10, 58, 38,     // Scorpio-Sagittarius region
  54, 61, 60, 41, 19, 13,    // Sagittarius-Capricorn region
  49, 30, 55, 37, 63, 22,    // Capricorn-Aquarius region
  36, 25, 17, 21              // Aquarius-Pisces region
]

export const HUMAN_DESIGN_GATES: HumanDesignGate[] = gateOrder.map((gateNumber, index) => {
  const startDegree = index * 5.625
  const endDegree = (index + 1) * 5.625
  const centerDegree = (startDegree + endDegree) / 2

  return {
    number: gateNumber,
    name: getGateName(gateNumber),
    startDegree,
    endDegree,
    zodiacSign: getZodiacSign(centerDegree)
  }
})

function getGateName(gateNumber: number): string {
  const names: Record<number, string> = {
    1: 'Expression', 2: 'Receptivity', 3: 'Ordering', 4: 'Answers', 5: 'Patience',
    6: 'Conflict', 7: 'Role', 8: 'Contribution', 9: 'Focus', 10: 'Self Love',
    11: 'Ideas', 12: 'Caution', 13: 'Fellowship', 14: 'Power', 15: 'Extremes',
    16: 'Skills', 17: 'Opinions', 18: 'Correction', 19: 'Wanting', 20: 'Now',
    21: 'Control', 22: 'Grace', 23: 'Assimilation', 24: 'Return', 25: 'Innocence',
    26: 'Taming Power', 27: 'Nourishment', 28: 'Risk', 29: 'Commitment', 30: 'Feeling',
    31: 'Influence', 32: 'Continuity', 33: 'Privacy', 34: 'Power', 35: 'Progress',
    36: 'Crisis', 37: 'Friendship', 38: 'Opposition', 39: 'Provocation', 40: 'Aloneness',
    41: 'Contraction', 42: 'Growth', 43: 'Breakthrough', 44: 'Alertness', 45: 'Gathering',
    46: 'Serendipity', 47: 'Realization', 48: 'Depth', 49: 'Revolution', 50: 'Values',
    51: 'Shock', 52: 'Stillness', 53: 'Beginnings', 54: 'Ambition', 55: 'Spirit',
    56: 'Stimulation', 57: 'Intuition', 58: 'Vitality', 59: 'Intimacy', 60: 'Limitation',
    61: 'Mystery', 62: 'Details', 63: 'Doubt', 64: 'Confusion'
  }
  return names[gateNumber] || 'Unknown'
}

/**
 * Get the gate at a specific degree
 */
export function getGateAtDegree(degree: number): HumanDesignGate | undefined {
  const normalizedDegree = ((degree % 360) + 360) % 360
  return HUMAN_DESIGN_GATES.find(
    (gate) => normalizedDegree >= gate.startDegree && normalizedDegree < gate.endDegree
  )
}

/**
 * Get all gates for a specific zodiac sign
 */
export function getGatesForSign(signName: string): HumanDesignGate[] {
  return HUMAN_DESIGN_GATES.filter((gate) => gate.zodiacSign === signName)
}

/**
 * Human Design Channels - Maps gate numbers to their channel information
 */
export const HUMAN_DESIGN_CHANNELS: Record<number, { partner: number; name: string }> = {
  1: { partner: 8, name: 'Inspiration' },
  2: { partner: 14, name: 'The Beat' },
  3: { partner: 60, name: 'Mutation' },
  4: { partner: 63, name: 'Logic' },
  5: { partner: 15, name: 'Rhythm' },
  6: { partner: 59, name: 'Mating' },
  7: { partner: 31, name: 'The Alpha' },
  8: { partner: 1, name: 'Inspiration' },
  9: { partner: 52, name: 'Concentration' },
  10: { partner: 57, name: 'Perfected Form' },
  11: { partner: 56, name: 'Curiosity' },
  12: { partner: 22, name: 'Openness' },
  13: { partner: 33, name: 'The Prodigal' },
  14: { partner: 2, name: 'The Beat' },
  15: { partner: 5, name: 'Rhythm' },
  16: { partner: 48, name: 'Wavelength' },
  17: { partner: 62, name: 'Acceptance' },
  18: { partner: 58, name: 'Judgment' },
  19: { partner: 49, name: 'Synthesis' },
  20: { partner: 57, name: 'The Brain Wave' },
  21: { partner: 45, name: 'Money' },
  22: { partner: 12, name: 'Openness' },
  23: { partner: 43, name: 'Structuring' },
  24: { partner: 61, name: 'Awareness' },
  25: { partner: 51, name: 'Initiation' },
  26: { partner: 44, name: 'Surrender' },
  27: { partner: 50, name: 'Preservation' },
  28: { partner: 38, name: 'Struggle' },
  29: { partner: 46, name: 'Discovery' },
  30: { partner: 41, name: 'Recognition' },
  31: { partner: 7, name: 'The Alpha' },
  32: { partner: 54, name: 'Transformation' },
  33: { partner: 13, name: 'The Prodigal' },
  34: { partner: 57, name: 'Power' },
  35: { partner: 36, name: 'Transitoriness' },
  36: { partner: 35, name: 'Transitoriness' },
  37: { partner: 40, name: 'Community' },
  38: { partner: 28, name: 'Struggle' },
  39: { partner: 55, name: 'Emoting' },
  40: { partner: 37, name: 'Community' },
  41: { partner: 30, name: 'Recognition' },
  42: { partner: 53, name: 'Maturation' },
  43: { partner: 23, name: 'Structuring' },
  44: { partner: 26, name: 'Surrender' },
  45: { partner: 21, name: 'Money' },
  46: { partner: 29, name: 'Discovery' },
  47: { partner: 64, name: 'Abstraction' },
  48: { partner: 16, name: 'Wavelength' },
  49: { partner: 19, name: 'Synthesis' },
  50: { partner: 27, name: 'Preservation' },
  51: { partner: 25, name: 'Initiation' },
  52: { partner: 9, name: 'Concentration' },
  53: { partner: 42, name: 'Maturation' },
  54: { partner: 32, name: 'Transformation' },
  55: { partner: 39, name: 'Emoting' },
  56: { partner: 11, name: 'Curiosity' },
  57: { partner: 10, name: 'Perfected Form' }, // Note: Gate 57 is in multiple channels
  58: { partner: 18, name: 'Judgment' },
  59: { partner: 6, name: 'Mating' },
  60: { partner: 3, name: 'Mutation' },
  61: { partner: 24, name: 'Awareness' },
  62: { partner: 17, name: 'Acceptance' },
  63: { partner: 4, name: 'Logic' },
  64: { partner: 47, name: 'Abstraction' },
}

/**
 * Get channel information for a gate
 */
export function getChannelForGate(gateNumber: number): { partner: number; name: string } | null {
  return HUMAN_DESIGN_CHANNELS[gateNumber] || null
}
