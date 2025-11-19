/**
 * Clients API client
 */
import { apiClient, getErrorMessage } from './client'

export interface ClientResponse {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientWithStats extends ClientResponse {
  birth_data_count: number
  chart_count: number
  session_notes_count: number
}

export interface ClientCreate {
  first_name: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
}

/**
 * Create a new client
 */
export async function createClient(data: ClientCreate): Promise<ClientResponse> {
  try {
    const response = await apiClient.post<ClientResponse>('/clients', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get client by ID (returns with statistics)
 */
export async function getClient(clientId: string): Promise<ClientWithStats> {
  try {
    const response = await apiClient.get<ClientWithStats>(`/clients/${clientId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List all clients
 */
export async function listClients(params?: { skip?: number; limit?: number }): Promise<ClientResponse[]> {
  try {
    const response = await apiClient.get<ClientResponse[]>('/clients', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export interface ClientUpdate {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
}

/**
 * Update client information
 */
export async function updateClient(clientId: string, data: ClientUpdate): Promise<ClientResponse> {
  try {
    const response = await apiClient.put<ClientResponse>(`/clients/${clientId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete client
 */
export async function deleteClient(clientId: string): Promise<void> {
  try {
    await apiClient.delete(`/clients/${clientId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
