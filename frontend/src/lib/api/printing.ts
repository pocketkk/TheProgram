/**
 * Printing API client
 *
 * Handles integration with The Game Crafter for printing tarot decks.
 */
import { apiClient, getErrorMessage } from './client'

// =============================================================================
// Types
// =============================================================================

export interface TGCCredentialsStatus {
  configured: boolean
  username?: string
}

export interface TGCCredentialsUpdate {
  api_key_id: string
  username: string
  password: string
}

export interface TGCPrintRequest {
  collection_id: string
  deck_name: string
  description?: string
  card_back_image_id?: string
}

export interface TGCPrintResponse {
  success: boolean
  game_id?: string
  deck_id?: string
  game_url?: string
  checkout_url?: string
  cards_uploaded: number
  error?: string
  details?: Record<string, unknown>
}

export interface TGCConnectionTestResult {
  success: boolean
  message: string
  user_id?: string
}

// =============================================================================
// Credentials Management
// =============================================================================

/**
 * Check if TGC credentials are configured
 */
export async function getTGCStatus(): Promise<TGCCredentialsStatus> {
  try {
    const response = await apiClient.get<TGCCredentialsStatus>('/printing/tgc/status')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Set or update TGC credentials
 */
export async function setTGCCredentials(
  credentials: TGCCredentialsUpdate
): Promise<TGCCredentialsStatus> {
  try {
    const response = await apiClient.post<TGCCredentialsStatus>(
      '/printing/tgc/credentials',
      credentials
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Remove TGC credentials
 */
export async function removeTGCCredentials(): Promise<void> {
  try {
    await apiClient.delete('/printing/tgc/credentials')
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Test connection to The Game Crafter
 */
export async function testTGCConnection(): Promise<TGCConnectionTestResult> {
  try {
    const response = await apiClient.post<TGCConnectionTestResult>(
      '/printing/tgc/test-connection'
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// =============================================================================
// Print Submission
// =============================================================================

/**
 * Submit a tarot deck for printing at The Game Crafter
 *
 * This is a long-running operation that:
 * 1. Uploads all card images to TGC
 * 2. Creates a game product
 * 3. Returns a checkout URL
 */
export async function submitDeckForPrinting(
  request: TGCPrintRequest
): Promise<TGCPrintResponse> {
  try {
    // Use a longer timeout for this endpoint since it uploads many images
    const response = await apiClient.post<TGCPrintResponse>(
      '/printing/tgc/submit',
      request,
      { timeout: 300000 } // 5 minutes
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
