/**
 * Astrological Types and Interfaces
 */

import { PLANETS_COMPAT } from '@/lib/celestial'

export interface BirthData {
  date: Date
  latitude: number
  longitude: number
  timezone?: string
}

export interface PlanetPosition {
  name: string
  symbol: string
  longitude: number // 0-360 degrees
  latitude: number
  distance: number
  speed: number
  isRetrograde: boolean
  sign: string
  degree: number // 0-30 within sign
  minute: number
  house: number
  element: 'Fire' | 'Earth' | 'Air' | 'Water'
  modality: 'Cardinal' | 'Fixed' | 'Mutable'
}

export interface House {
  number: number
  cusp: number // degree 0-360
  sign: string
  degree: number
  minute: number
}

export interface Aspect {
  planet1: string
  planet2: string
  angle: number
  orb: number
  type: AspectType
  isApplying: boolean
}

export type AspectType =
  | 'Conjunction'
  | 'Sextile'
  | 'Square'
  | 'Trine'
  | 'Opposition'
  | 'Quincunx'
  | 'Semisextile'
  | 'Semisquare'
  | 'Sesquiquadrate'

export interface BirthChart {
  birthData: BirthData
  planets: PlanetPosition[]
  houses: House[]
  aspects: Aspect[]
  ascendant: number
  midheaven: number
  descendant: number
  ic: number
}

export const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', element: 'Fire', modality: 'Cardinal', ruler: 'Mars' },
  { name: 'Taurus', symbol: '♉', element: 'Earth', modality: 'Fixed', ruler: 'Venus' },
  { name: 'Gemini', symbol: '♊', element: 'Air', modality: 'Mutable', ruler: 'Mercury' },
  { name: 'Cancer', symbol: '♋', element: 'Water', modality: 'Cardinal', ruler: 'Moon' },
  { name: 'Leo', symbol: '♌', element: 'Fire', modality: 'Fixed', ruler: 'Sun' },
  { name: 'Virgo', symbol: '♍', element: 'Earth', modality: 'Mutable', ruler: 'Mercury' },
  { name: 'Libra', symbol: '♎', element: 'Air', modality: 'Cardinal', ruler: 'Venus' },
  { name: 'Scorpio', symbol: '♏', element: 'Water', modality: 'Fixed', ruler: 'Mars' },
  { name: 'Sagittarius', symbol: '♐', element: 'Fire', modality: 'Mutable', ruler: 'Jupiter' },
  { name: 'Capricorn', symbol: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn' },
  { name: 'Aquarius', symbol: '♒', element: 'Air', modality: 'Fixed', ruler: 'Saturn' },
  { name: 'Pisces', symbol: '♓', element: 'Water', modality: 'Mutable', ruler: 'Jupiter' },
] as const

// PLANETS derived from celestial registry for single source of truth
export const PLANETS = PLANETS_COMPAT

export const ASPECT_CONFIG = {
  Conjunction: { angle: 0, orb: 8, color: '#FFFF00', symbol: '☌' },
  Sextile: { angle: 60, orb: 6, color: '#00FF00', symbol: '⚹' },
  Square: { angle: 90, orb: 8, color: '#FF0000', symbol: '□' },
  Trine: { angle: 120, orb: 8, color: '#00FFFF', symbol: '△' },
  Opposition: { angle: 180, orb: 8, color: '#FF00FF', symbol: '☍' },
  Quincunx: { angle: 150, orb: 3, color: '#90EE90', symbol: '⚻' },
  Semisextile: { angle: 30, orb: 2, color: '#DDA0DD', symbol: '⚺' },
  Semisquare: { angle: 45, orb: 2, color: '#FFA07A', symbol: '∠' },
  Sesquiquadrate: { angle: 135, orb: 2, color: '#FFB6C1', symbol: '⚼' },
} as const
