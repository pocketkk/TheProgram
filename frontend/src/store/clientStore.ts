import { create } from 'zustand'
import * as clientsApi from '@/lib/api/clients'

export interface Client {
  id: string
  first_name: string
  last_name: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
  birth_data_count?: number
  chart_count?: number
  session_notes_count?: number
  created_at: string
  updated_at: string
}

interface ClientStore {
  clients: Client[]
  isLoading: boolean
  error: string | null

  fetchClients: () => Promise<void>
  addClient: (data: Partial<Client>) => Promise<void>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  isLoading: false,
  error: null,

  fetchClients: async () => {
    set({ isLoading: true, error: null })
    try {
      const clients = await clientsApi.listClients()
      set({ clients, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch clients',
        isLoading: false
      })
    }
  },

  addClient: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const newClient = await clientsApi.createClient({
        first_name: data.first_name || '',
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        notes: data.notes
      })
      set({
        clients: [...get().clients, newClient],
        isLoading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to add client',
        isLoading: false
      })
      throw error
    }
  },

  updateClient: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const updatedClient = await clientsApi.updateClient(id, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        notes: data.notes
      })
      set({
        clients: get().clients.map(c => c.id === id ? updatedClient : c),
        isLoading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update client',
        isLoading: false
      })
      throw error
    }
  },

  deleteClient: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await clientsApi.deleteClient(id)
      set({
        clients: get().clients.filter(c => c.id !== id),
        isLoading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete client',
        isLoading: false
      })
      throw error
    }
  },
}))
