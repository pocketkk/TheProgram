/**
 * Tarot API client
 *
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { apiClient, getErrorMessage } from './client'

// Types
export interface TarotCard {
  id: string
  name: string
  number: number
  suit: 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'
  keywords: string[]
  upright_meaning: string
  reversed_meaning: string
  reversed?: boolean
}

export interface SpreadPosition {
  position: number
  name: string
  meaning: string
}

export interface TarotSpread {
  name: string
  description: string
  positions: SpreadPosition[]
}

export interface CardPosition {
  position: number
  position_name: string
  position_meaning: string
  card: TarotCard
  interpretation: string
}

export interface TarotReading {
  spread_type: string
  spread_name: string
  question: string | null
  timestamp: string
  positions: CardPosition[]
  summary: string
}

export interface DailyCardResponse {
  date: string
  card: TarotCard
  interpretation: string
  daily_guidance: string
}

export interface ReadingRequest {
  spread_type: string
  question?: string
  allow_reversed?: boolean
}

// API Functions

/**
 * Get the complete Tarot deck
 */
export async function getDeck(): Promise<{ total_cards: number; deck: TarotCard[] }> {
  try {
    const response = await apiClient.get('/tarot/deck')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get Major Arcana cards only
 */
export async function getMajorArcana(): Promise<{ count: number; cards: TarotCard[] }> {
  try {
    const response = await apiClient.get('/tarot/deck/major')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get Minor Arcana cards for a specific suit
 */
export async function getMinorArcanaSuit(
  suit: 'wands' | 'cups' | 'swords' | 'pentacles'
): Promise<{ suit: string; count: number; cards: TarotCard[] }> {
  try {
    const response = await apiClient.get(`/tarot/deck/minor/${suit}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific card by ID
 */
export async function getCard(cardId: string): Promise<TarotCard> {
  try {
    const response = await apiClient.get(`/tarot/card/${cardId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get all available spreads
 */
export async function getSpreads(): Promise<{
  count: number
  spreads: Record<string, TarotSpread>
}> {
  try {
    const response = await apiClient.get('/tarot/spreads')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific spread configuration
 */
export async function getSpread(spreadType: string): Promise<TarotSpread> {
  try {
    const response = await apiClient.get(`/tarot/spreads/${spreadType}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Draw random cards
 */
export async function drawCards(
  count: number = 1,
  allowReversed: boolean = true
): Promise<{ count: number; cards: TarotCard[] }> {
  try {
    const response = await apiClient.get('/tarot/draw', {
      params: { count, allow_reversed: allowReversed }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Perform a complete Tarot reading
 */
export async function performReading(request: ReadingRequest): Promise<TarotReading> {
  try {
    const response = await apiClient.post('/tarot/reading', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a daily guidance card
 */
export async function getDailyCard(allowReversed: boolean = true): Promise<DailyCardResponse> {
  try {
    const response = await apiClient.get('/tarot/daily', {
      params: { allow_reversed: allowReversed }
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get the card of the day (same for everyone on a given day)
 */
export async function getCardOfTheDay(): Promise<DailyCardResponse> {
  try {
    const response = await apiClient.get('/tarot/card-of-the-day')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// Helper functions

/**
 * Get the suit symbol
 */
export function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    major: '⭐',
    wands: '🔥',
    cups: '💧',
    swords: '⚔️',
    pentacles: '🪙'
  }
  return symbols[suit] || ''
}

/**
 * Get suit element
 */
export function getSuitElement(suit: string): string {
  const elements: Record<string, string> = {
    wands: 'Fire',
    cups: 'Water',
    swords: 'Air',
    pentacles: 'Earth',
    major: 'Spirit'
  }
  return elements[suit] || ''
}

/**
 * Get suit color class
 */
export function getSuitColorClass(suit: string): string {
  const colors: Record<string, string> = {
    major: 'text-purple-400',
    wands: 'text-orange-400',
    cups: 'text-blue-400',
    swords: 'text-gray-300',
    pentacles: 'text-green-400'
  }
  return colors[suit] || 'text-gray-400'
}

/**
 * Format card name with reversed indicator
 */
export function formatCardName(card: TarotCard): string {
  return card.reversed ? `${card.name} (Reversed)` : card.name
}

// Available spread types
export const SPREAD_TYPES = {
  single: 'Single Card',
  three_card: 'Three Card Spread',
  celtic_cross: 'Celtic Cross',
  relationship: 'Relationship Spread',
  decision: 'Decision Spread'
} as const

export type SpreadType = keyof typeof SPREAD_TYPES
