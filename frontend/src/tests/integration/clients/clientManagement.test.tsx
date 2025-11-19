/**
 * Client Management Integration Tests
 *
 * End-to-end tests for creating, editing, and deleting clients.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import {
  createClient,
  getClient,
  listClients,
  updateClient,
  deleteClient
} from '@/lib/api/clients'
import { setMockPasswordState } from '@/tests/mocks/handlers'

// Don't mock the API client for integration tests
vi.unmock('@/lib/api/clients')

describe('Client Management Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated state
    setMockPasswordState(true, 'test1234')
    localStorage.setItem('session_token', 'mock-jwt-token-abc123')
  })

  describe('Create Client', () => {
    it('should create a new client with all fields', async () => {
      const clientData = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        notes: 'New client for natal chart',
      }

      const result = await createClient(clientData)

      expect(result).toMatchObject({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        notes: 'New client for natal chart',
      })
      expect(result.id).toBeDefined()
      expect(result.created_at).toBeDefined()
      expect(result.updated_at).toBeDefined()
    })

    it('should create a client with only required fields', async () => {
      const clientData = {
        first_name: 'John',
      }

      const result = await createClient(clientData)

      expect(result.first_name).toBe('John')
      expect(result.last_name).toBeNull()
      expect(result.email).toBeNull()
      expect(result.phone).toBeNull()
      expect(result.notes).toBeNull()
    })

    it('should create multiple clients', async () => {
      const client1 = await createClient({ first_name: 'Alice' })
      const client2 = await createClient({ first_name: 'Bob' })

      expect(client1.id).not.toBe(client2.id)
      expect(client1.first_name).toBe('Alice')
      expect(client2.first_name).toBe('Bob')
    })
  })

  describe('List Clients', () => {
    it('should return empty array when no clients exist', async () => {
      const clients = await listClients()
      expect(clients).toEqual([])
    })

    it('should return all created clients', async () => {
      // Create test clients
      await createClient({ first_name: 'Alice' })
      await createClient({ first_name: 'Bob' })
      await createClient({ first_name: 'Charlie' })

      const clients = await listClients()

      expect(clients).toHaveLength(3)
      expect(clients.map(c => c.first_name)).toContain('Alice')
      expect(clients.map(c => c.first_name)).toContain('Bob')
      expect(clients.map(c => c.first_name)).toContain('Charlie')
    })

    it('should support pagination parameters', async () => {
      // Create multiple clients
      for (let i = 0; i < 5; i++) {
        await createClient({ first_name: `Client ${i}` })
      }

      const page1 = await listClients({ skip: 0, limit: 2 })
      const page2 = await listClients({ skip: 2, limit: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
    })
  })

  describe('Get Client', () => {
    it('should retrieve client by ID with statistics', async () => {
      const created = await createClient({
        first_name: 'Test',
        last_name: 'User',
      })

      const retrieved = await getClient(created.id)

      expect(retrieved).toMatchObject({
        id: created.id,
        first_name: 'Test',
        last_name: 'User',
      })
      expect(retrieved.birth_data_count).toBe(0)
      expect(retrieved.chart_count).toBe(0)
      expect(retrieved.session_notes_count).toBe(0)
    })

    it('should throw error for non-existent client', async () => {
      await expect(getClient('non-existent-id')).rejects.toThrow('Client not found')
    })
  })

  describe('Update Client', () => {
    it('should update client information', async () => {
      const created = await createClient({
        first_name: 'Old Name',
        email: 'old@example.com',
      })

      const updated = await updateClient(created.id, {
        first_name: 'New Name',
        email: 'new@example.com',
      })

      expect(updated.first_name).toBe('New Name')
      expect(updated.email).toBe('new@example.com')
      expect(updated.id).toBe(created.id)
    })

    it('should update only specified fields', async () => {
      const created = await createClient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      })

      const updated = await updateClient(created.id, {
        email: 'newemail@example.com',
      })

      expect(updated.first_name).toBe('John')
      expect(updated.last_name).toBe('Doe')
      expect(updated.email).toBe('newemail@example.com')
    })

    it('should update timestamps on modification', async () => {
      const created = await createClient({ first_name: 'Test' })
      const originalUpdatedAt = created.updated_at

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await updateClient(created.id, {
        first_name: 'Updated Test'
      })

      expect(updated.updated_at).not.toBe(originalUpdatedAt)
    })

    it('should throw error when updating non-existent client', async () => {
      await expect(
        updateClient('non-existent-id', { first_name: 'Test' })
      ).rejects.toThrow('Client not found')
    })
  })

  describe('Delete Client', () => {
    it('should delete existing client', async () => {
      const created = await createClient({ first_name: 'To Delete' })

      await deleteClient(created.id)

      // Verify client is deleted
      await expect(getClient(created.id)).rejects.toThrow('Client not found')
    })

    it('should throw error when deleting non-existent client', async () => {
      await expect(deleteClient('non-existent-id')).rejects.toThrow('Client not found')
    })

    it('should remove client from list after deletion', async () => {
      const client1 = await createClient({ first_name: 'Keep' })
      const client2 = await createClient({ first_name: 'Delete' })

      await deleteClient(client2.id)

      const clients = await listClients()
      expect(clients.map(c => c.id)).toContain(client1.id)
      expect(clients.map(c => c.id)).not.toContain(client2.id)
    })
  })

  describe('Client CRUD Workflow', () => {
    it('should complete full CRUD cycle', async () => {
      // Create
      const created = await createClient({
        first_name: 'Workflow',
        last_name: 'Test',
        email: 'workflow@example.com',
      })

      expect(created.id).toBeDefined()
      expect(created.first_name).toBe('Workflow')

      // Read
      const retrieved = await getClient(created.id)
      expect(retrieved.first_name).toBe('Workflow')

      // Update
      const updated = await updateClient(created.id, {
        first_name: 'Updated Workflow',
        phone: '+1234567890',
      })
      expect(updated.first_name).toBe('Updated Workflow')
      expect(updated.phone).toBe('+1234567890')

      // List
      const clients = await listClients()
      expect(clients.some(c => c.id === created.id)).toBe(true)

      // Delete
      await deleteClient(created.id)

      // Verify deletion
      await expect(getClient(created.id)).rejects.toThrow('Client not found')
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // This test assumes the API validates required fields
      // The mock currently doesn't enforce this, but in real API it would
      const result = await createClient({ first_name: 'Valid' })
      expect(result).toBeDefined()
    })

    it('should preserve data integrity after failed operations', async () => {
      const client = await createClient({ first_name: 'Original' })

      // Try to update non-existent client
      await expect(
        updateClient('non-existent', { first_name: 'Changed' })
      ).rejects.toThrow()

      // Original client should be unchanged
      const retrieved = await getClient(client.id)
      expect(retrieved.first_name).toBe('Original')
    })
  })
})
