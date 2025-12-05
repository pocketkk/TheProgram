/**
 * Cards API client
 *
 * Part of Phase 6: Cards Module
 */
import { apiClient, getErrorMessage } from './client'

// ============= Types =============

export interface PlayingCard {
  id: string
  tarot_name: string
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: string
  rank_value: number
  value: number
  color: 'red' | 'black'
  face_up: boolean
  image_url: string | null
}

export interface SolitaireState {
  tableau: PlayingCard[][]
  foundations: PlayingCard[][]
  stock: PlayingCard[]
  waste: PlayingCard[]
  draw_count: number
}

export interface CribbageState {
  player_hand: PlayingCard[]
  opponent_hand: PlayingCard[]
  crib: PlayingCard[]
  cut_card: PlayingCard | null
  pegging_pile: PlayingCard[]
  pegging_count: number
  dealer: 'player' | 'opponent'
  phase: 'discard' | 'cut' | 'pegging' | 'counting' | 'done'
  is_go: boolean
  current_turn: 'player' | 'opponent'
  player_pegging_played: PlayingCard[]
  opponent_pegging_played: PlayingCard[]
}

export type GameType = 'solitaire' | 'cribbage'
export type GameStatus = 'in_progress' | 'won' | 'lost' | 'draw'
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'guide'

export interface CardGame {
  id: string
  game_type: GameType
  player_count: number
  status: GameStatus
  player_score: number
  opponent_score: number
  current_turn: 'player' | 'opponent'
  game_state: SolitaireState | CribbageState
  move_count: number
  is_finished: boolean
  collection_id: string | null
  ai_personality: AIDifficulty | null
  created_at: string
  updated_at: string
}

export interface SolitaireMove {
  move_type: 'draw' | 'reset_stock' | 'waste_to_tableau' | 'waste_to_foundation' | 'tableau_move' | 'tableau_to_foundation'
  from_pile?: string
  to_pile?: string
  card_count?: number
  card_id?: string
}

export interface CribbageMove {
  move_type: 'discard' | 'peg' | 'say_go'
  cards?: string[]
  card_id?: string
}

export interface ValidMove {
  move_type: string
  description: string
  from_pile?: string
  to_pile?: string
  card_id?: string
  card_count?: number
}

export interface GameHint {
  hint_type: string
  message: string
  suggested_move: ValidMove | null
}

export interface MakeMoveResponse {
  success: boolean
  message: string
  game: CardGame
  points_earned: number
  opponent_move: Record<string, unknown> | null
  opponent_points: number
}

export interface GameStats {
  game_type: string
  games_played: number
  games_won: number
  games_lost: number
  win_rate: number
  best_score: number
  average_score: number
  total_moves: number
}

export interface DeckMapping {
  id: string
  tarot_name: string
  suit: string
  rank: string
  rank_value: number
  value: number
  color: string
}

export interface CreateGameRequest {
  game_type: GameType
  collection_id?: string
  ai_difficulty?: AIDifficulty
  draw_count?: number
}

// ============= API Functions =============

/**
 * Get deck mapping (tarot to playing cards)
 */
export async function getDeckMapping(): Promise<{ mappings: DeckMapping[], description: string }> {
  try {
    const response = await apiClient.get('/cards/deck-mapping')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List all card games
 */
export async function listGames(params?: {
  game_type?: GameType
  status?: GameStatus
  limit?: number
  offset?: number
}): Promise<{ games: CardGame[], total: number }> {
  try {
    const response = await apiClient.get('/cards/games', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Create a new game
 */
export async function createGame(request: CreateGameRequest): Promise<CardGame> {
  try {
    const response = await apiClient.post('/cards/games', request)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific game
 */
export async function getGame(gameId: string): Promise<CardGame> {
  try {
    const response = await apiClient.get(`/cards/games/${gameId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a game
 */
export async function deleteGame(gameId: string): Promise<void> {
  try {
    await apiClient.delete(`/cards/games/${gameId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get valid moves for current game state
 */
export async function getValidMoves(gameId: string): Promise<{ moves: ValidMove[] }> {
  try {
    const response = await apiClient.get(`/cards/games/${gameId}/valid-moves`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Make a move
 */
export async function makeMove(
  gameId: string,
  move: SolitaireMove | CribbageMove
): Promise<MakeMoveResponse> {
  try {
    const response = await apiClient.post(`/cards/games/${gameId}/move`, { move })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a hint
 */
export async function getHint(gameId: string): Promise<GameHint> {
  try {
    const response = await apiClient.get(`/cards/games/${gameId}/hint`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get game statistics
 */
export async function getGameStats(gameType: GameType): Promise<GameStats> {
  try {
    const response = await apiClient.get(`/cards/stats/${gameType}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// ============= Helper Functions =============

/**
 * Get suit symbol for display
 */
export function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660'
  }
  return symbols[suit] || ''
}

/**
 * Get suit color class
 */
export function getSuitColorClass(suit: string): string {
  if (suit === 'hearts' || suit === 'diamonds') {
    return 'text-red-500'
  }
  return 'text-gray-900 dark:text-white'
}

/**
 * Format card for display
 */
export function formatCard(card: PlayingCard): string {
  return `${card.rank}${getSuitSymbol(card.suit)}`
}

/**
 * Check if game is solitaire
 */
export function isSolitaireGame(game: CardGame): game is CardGame & { game_state: SolitaireState } {
  return game.game_type === 'solitaire'
}

/**
 * Check if game is cribbage
 */
export function isCribbageGame(game: CardGame): game is CardGame & { game_state: CribbageState } {
  return game.game_type === 'cribbage'
}
