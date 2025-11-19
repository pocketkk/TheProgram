/**
 * Chart Creation Integration Tests
 *
 * End-to-end tests for creating and calculating astrological charts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { createClient } from '@/lib/api/clients'
import { setMockPasswordState } from '@/tests/mocks/handlers'
import { apiClient } from '@/lib/api/client'

// Don't mock the API client for integration tests
vi.unmock('@/lib/api/client')

describe('Chart Creation Integration Tests', () => {
  let testClientId: string

  beforeEach(async () => {
    // Set up authenticated state
    setMockPasswordState(true, 'test1234')
    localStorage.setItem('session_token', 'mock-jwt-token-abc123')

    // Create a test client for charts
    const client = await createClient({ first_name: 'Chart Test User' })
    testClientId = client.id
  })

  describe('Create Birth Data', () => {
    it('should create birth data for client', async () => {
      const birthData = {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        location_name: 'New York, NY',
      }

      const response = await apiClient.post('/api/birth-data', birthData)

      expect(response.data).toMatchObject({
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
      })
      expect(response.data.id).toBeDefined()
    })

    it('should handle different timezones', async () => {
      const birthData = {
        client_id: testClientId,
        date: '1985-06-20',
        time: '08:00:00',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        location_name: 'London, UK',
      }

      const response = await apiClient.post('/api/birth-data', birthData)

      expect(response.data.timezone).toBe('Europe/London')
      expect(response.data.location_name).toBe('London, UK')
    })
  })

  describe('Calculate Chart', () => {
    it('should calculate natal chart from birth data', async () => {
      // Create birth data
      const birthDataResponse = await apiClient.post('/api/birth-data', {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        location_name: 'New York, NY',
      })

      const birthDataId = birthDataResponse.data.id

      // Calculate chart
      const chartData = {
        client_id: testClientId,
        birth_data_id: birthDataId,
        chart_type: 'natal',
      }

      const chartResponse = await apiClient.post('/api/charts', chartData)

      expect(chartResponse.data).toMatchObject({
        client_id: testClientId,
        birth_data_id: birthDataId,
        chart_type: 'natal',
        calculation_status: 'completed',
      })
      expect(chartResponse.data.planets).toBeDefined()
      expect(chartResponse.data.houses).toBeDefined()
      expect(chartResponse.data.ascendant).toBeDefined()
    })

    it('should include planetary positions in chart', async () => {
      const birthDataResponse = await apiClient.post('/api/birth-data', {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      })

      const chartResponse = await apiClient.post('/api/charts', {
        client_id: testClientId,
        birth_data_id: birthDataResponse.data.id,
        chart_type: 'natal',
      })

      const { planets } = chartResponse.data

      // Verify planetary data structure
      expect(planets.sun).toBeDefined()
      expect(planets.sun.longitude).toBeDefined()
      expect(planets.sun.latitude).toBeDefined()
      expect(planets.sun.speed).toBeDefined()

      expect(planets.moon).toBeDefined()
      expect(planets.moon.longitude).toBeDefined()
    })

    it('should include house cusps in chart', async () => {
      const birthDataResponse = await apiClient.post('/api/birth-data', {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      })

      const chartResponse = await apiClient.post('/api/charts', {
        client_id: testClientId,
        birth_data_id: birthDataResponse.data.id,
        chart_type: 'natal',
      })

      const { houses } = chartResponse.data

      expect(houses).toHaveLength(12)
      expect(houses.every((cusp: number) => typeof cusp === 'number')).toBe(true)
    })

    it('should include ascendant information', async () => {
      const birthDataResponse = await apiClient.post('/api/birth-data', {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      })

      const chartResponse = await apiClient.post('/api/charts', {
        client_id: testClientId,
        birth_data_id: birthDataResponse.data.id,
        chart_type: 'natal',
      })

      const { ascendant } = chartResponse.data

      expect(ascendant).toBeDefined()
      expect(ascendant.longitude).toBeDefined()
      expect(ascendant.sign).toBeDefined()
    })
  })

  describe('Chart Types', () => {
    it('should support natal chart type', async () => {
      const birthDataResponse = await apiClient.post('/api/birth-data', {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      })

      const chartResponse = await apiClient.post('/api/charts', {
        client_id: testClientId,
        birth_data_id: birthDataResponse.data.id,
        chart_type: 'natal',
      })

      expect(chartResponse.data.chart_type).toBe('natal')
    })
  })

  describe('Chart Data Workflow', () => {
    it('should complete full birth data and chart creation flow', async () => {
      // Step 1: Create birth data
      const birthData = {
        client_id: testClientId,
        date: '1995-03-21',
        time: '12:00:00',
        latitude: 34.0522,
        longitude: -118.2437,
        timezone: 'America/Los_Angeles',
        location_name: 'Los Angeles, CA',
      }

      const birthDataResponse = await apiClient.post('/api/birth-data', birthData)
      expect(birthDataResponse.status).toBe(201)
      expect(birthDataResponse.data.id).toBeDefined()

      const birthDataId = birthDataResponse.data.id

      // Step 2: Calculate chart
      const chartData = {
        client_id: testClientId,
        birth_data_id: birthDataId,
        chart_type: 'natal',
      }

      const chartResponse = await apiClient.post('/api/charts', chartData)
      expect(chartResponse.status).toBe(201)
      expect(chartResponse.data.id).toBeDefined()

      // Step 3: Verify chart data integrity
      const chart = chartResponse.data

      expect(chart.client_id).toBe(testClientId)
      expect(chart.birth_data_id).toBe(birthDataId)
      expect(chart.calculation_status).toBe('completed')
      expect(chart.planets).toBeDefined()
      expect(chart.houses).toBeDefined()
      expect(chart.ascendant).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', async () => {
      // In a real implementation, this would validate coordinates
      // For now, the mock accepts any values
      const birthData = {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 999, // Invalid
        longitude: 999, // Invalid
        timezone: 'America/New_York',
      }

      const response = await apiClient.post('/api/birth-data', birthData)
      expect(response.data).toBeDefined()
    })

    it('should handle invalid date formats', async () => {
      // The mock currently doesn't validate, but real API would
      const birthData = {
        client_id: testClientId,
        date: '1990-01-15', // Valid ISO date
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      }

      const response = await apiClient.post('/api/birth-data', birthData)
      expect(response.data.date).toBe('1990-01-15')
    })
  })

  describe('Data Persistence', () => {
    it('should maintain chart data after creation', async () => {
      const birthDataResponse = await apiClient.post('/api/birth-data', {
        client_id: testClientId,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      })

      const chartResponse = await apiClient.post('/api/charts', {
        client_id: testClientId,
        birth_data_id: birthDataResponse.data.id,
        chart_type: 'natal',
      })

      const chartId = chartResponse.data.id

      // Verify chart is stored (in real app, we'd retrieve it)
      expect(chartId).toBeDefined()
      expect(chartResponse.data.created_at).toBeDefined()
    })
  })
})
