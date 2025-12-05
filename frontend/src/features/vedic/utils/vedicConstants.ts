/**
 * Vedic Astrology Constants
 */

// Zodiac signs with Sanskrit names
export const VEDIC_SIGNS = [
  { index: 0, name: 'Aries', sanskrit: 'Mesha', symbol: 'Ar', ruler: 'Mars', element: 'fire' },
  { index: 1, name: 'Taurus', sanskrit: 'Vrishabha', symbol: 'Ta', ruler: 'Venus', element: 'earth' },
  { index: 2, name: 'Gemini', sanskrit: 'Mithuna', symbol: 'Ge', ruler: 'Mercury', element: 'air' },
  { index: 3, name: 'Cancer', sanskrit: 'Karka', symbol: 'Ca', ruler: 'Moon', element: 'water' },
  { index: 4, name: 'Leo', sanskrit: 'Simha', symbol: 'Le', ruler: 'Sun', element: 'fire' },
  { index: 5, name: 'Virgo', sanskrit: 'Kanya', symbol: 'Vi', ruler: 'Mercury', element: 'earth' },
  { index: 6, name: 'Libra', sanskrit: 'Tula', symbol: 'Li', ruler: 'Venus', element: 'air' },
  { index: 7, name: 'Scorpio', sanskrit: 'Vrishchika', symbol: 'Sc', ruler: 'Mars', element: 'water' },
  { index: 8, name: 'Sagittarius', sanskrit: 'Dhanu', symbol: 'Sg', ruler: 'Jupiter', element: 'fire' },
  { index: 9, name: 'Capricorn', sanskrit: 'Makara', symbol: 'Cp', ruler: 'Saturn', element: 'earth' },
  { index: 10, name: 'Aquarius', sanskrit: 'Kumbha', symbol: 'Aq', ruler: 'Saturn', element: 'air' },
  { index: 11, name: 'Pisces', sanskrit: 'Meena', symbol: 'Pi', ruler: 'Jupiter', element: 'water' },
] as const

// Planet abbreviations for compact display
export const PLANET_ABBREVIATIONS: Record<string, string> = {
  sun: 'Su',
  moon: 'Mo',
  mars: 'Ma',
  mercury: 'Me',
  jupiter: 'Ju',
  venus: 'Ve',
  saturn: 'Sa',
  rahu: 'Ra',
  ketu: 'Ke',
  uranus: 'Ur',
  neptune: 'Ne',
  pluto: 'Pl',
  ascendant: 'As',
  midheaven: 'MC',
  // Aliases for backend naming
  north_node: 'Ra',
  south_node: 'Ke',
}

// Full planet names
export const PLANET_NAMES: Record<string, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mars: 'Mars',
  mercury: 'Mercury',
  jupiter: 'Jupiter',
  venus: 'Venus',
  saturn: 'Saturn',
  rahu: 'Rahu',
  ketu: 'Ketu',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
}

// Dignity colors for visual indication
export const DIGNITY_COLORS: Record<string, string> = {
  exalted: '#FFD700',      // Gold
  debilitated: '#DC2626',  // Red
  own_sign: '#22C55E',     // Green
  moolatrikona: '#3B82F6', // Blue
  neutral: '#9CA3AF',      // Gray
}

// Dignity labels
export const DIGNITY_LABELS: Record<string, string> = {
  exalted: 'Exalted',
  debilitated: 'Debilitated',
  own_sign: 'Own Sign',
  moolatrikona: 'Moolatrikona',
  neutral: 'Neutral',
}

// Planet colors for chart display - cosmic theme optimized
export const PLANET_COLORS: Record<string, string> = {
  sun: '#F7B32B',      // Celestial gold
  moon: '#C4B5FD',     // Soft lavender (visible on dark bg)
  mars: '#EF4444',     // Red
  mercury: '#34D399',  // Emerald green
  jupiter: '#FBBF24',  // Golden yellow
  venus: '#F472B6',    // Pink
  saturn: '#818CF8',   // Indigo/violet (brighter)
  rahu: '#94A3B8',     // Slate (brighter gray)
  ketu: '#A8A29E',     // Warm stone (brighter)
  uranus: '#22D3EE',   // Cyan
  neptune: '#A78BFA',  // Purple
  pluto: '#9CA3AF',    // Gray (visible, not black)
  // Aliases for backend naming
  north_node: '#94A3B8', // Same as rahu
  south_node: '#A8A29E', // Same as ketu
}

// Ayanamsa options for dropdown
export const AYANAMSA_OPTIONS = [
  { value: 'lahiri', label: 'Lahiri (Chitrapaksha)' },
  { value: 'raman', label: 'Raman' },
  { value: 'krishnamurti', label: 'Krishnamurti (KP)' },
  { value: 'yukteshwar', label: 'Yukteshwar' },
  { value: 'fagan_bradley', label: 'Fagan-Bradley' },
  { value: 'true_chitrapaksha', label: 'True Chitrapaksha' },
  { value: 'true_revati', label: 'True Revati' },
  { value: 'true_pushya', label: 'True Pushya' },
] as const

// House system options
export const HOUSE_SYSTEM_OPTIONS = [
  { value: 'whole_sign', label: 'Whole Sign' },
  { value: 'placidus', label: 'Placidus' },
  { value: 'koch', label: 'Koch' },
  { value: 'equal', label: 'Equal' },
  { value: 'campanus', label: 'Campanus' },
  { value: 'regiomontanus', label: 'Regiomontanus' },
] as const

// Classical Vedic planets (7 + nodes)
export const CLASSICAL_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']

// Get sign by index (0-11)
export function getSignByIndex(index: number) {
  return VEDIC_SIGNS[index % 12]
}

// Get sign index from longitude
export function getSignFromLongitude(longitude: number): number {
  return Math.floor(longitude / 30) % 12
}

// Get degree within sign
export function getDegreeInSign(longitude: number): number {
  return longitude % 30
}

// Format degree display (e.g., "15°23'")
export function formatDegree(degree: number): string {
  const wholeDegree = Math.floor(degree)
  const minutes = Math.floor((degree - wholeDegree) * 60)
  return `${wholeDegree}°${minutes.toString().padStart(2, '0')}'`
}

// Get house number for a sign given the ascendant sign
export function getHouseForSign(signIndex: number, ascendantSignIndex: number): number {
  return ((signIndex - ascendantSignIndex + 12) % 12) + 1
}
