/**
 * Chart Interpretations Integration Tests
 *
 * End-to-end tests for generating AI interpretations of charts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@/lib/api/clients'
import { setMockPasswordState } from '@/tests/mocks/handlers'
import { apiClient } from '@/lib/api/client'

// Don't mock the API client for integration tests
vi.unmock('@/lib/api/client')

describe('Chart Interpretations Integration Tests', () => {
  let testClientId: string
  let testChartId: string

  beforeEach(async () => {
    // Set up authenticated state
    setMockPasswordState(true, 'test1234')
    localStorage.setItem('session_token', 'mock-jwt-token-abc123')

    // Create test client
    const client = await createClient({ first_name: 'Interpretation Test' })
    testClientId = client.id

    // Create birth data and chart
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

    testChartId = chartResponse.data.id
  })

  describe('Generate Interpretations', () => {
    it('should generate interpretation for natal chart', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(response.data).toMatchObject({
        chart_id: testChartId,
        interpretation_type: 'natal',
      })
      expect(response.data.id).toBeDefined()
      expect(response.data.content).toBeDefined()
    })

    it('should include interpretation content', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      const { content } = response.data

      expect(content).toBeDefined()
      expect(content.overview).toBeDefined()
      expect(typeof content.overview).toBe('string')
    })

    it('should generate interpretation with timestamp', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(response.data.created_at).toBeDefined()
      const timestamp = new Date(response.data.created_at)
      expect(timestamp instanceof Date).toBe(true)
      expect(isNaN(timestamp.getTime())).toBe(false)
    })

    it('should support multiple interpretations for same chart', async () => {
      const interpretation1 = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      const interpretation2 = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(interpretation1.data.id).not.toBe(interpretation2.data.id)
      expect(interpretation1.data.chart_id).toBe(testChartId)
      expect(interpretation2.data.chart_id).toBe(testChartId)
    })
  })

  describe('Interpretation Content Structure', () => {
    it('should have overview section', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(response.data.content.overview).toBeDefined()
      expect(typeof response.data.content.overview).toBe('string')
      expect(response.data.content.overview.length).toBeGreaterThan(0)
    })

    it('should have planets section', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(response.data.content.planets).toBeDefined()
      expect(typeof response.data.content.planets).toBe('object')
    })

    it('should have aspects section', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(response.data.content.aspects).toBeDefined()
      expect(typeof response.data.content.aspects).toBe('object')
    })
  })

  describe('Interpretation Workflow', () => {
    it('should complete full chart interpretation flow', async () => {
      // Generate interpretation
      const interpretationResponse = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(interpretationResponse.status).toBe(200)

      const interpretation = interpretationResponse.data

      // Verify all required fields
      expect(interpretation.id).toBeDefined()
      expect(interpretation.chart_id).toBe(testChartId)
      expect(interpretation.interpretation_type).toBe('natal')
      expect(interpretation.content).toBeDefined()
      expect(interpretation.content.overview).toBeDefined()
      expect(interpretation.created_at).toBeDefined()
    })

    it('should handle interpretation generation for newly created chart', async () => {
      // Create new chart
      const newBirthData = await apiClient.post('/api/birth-data', {
        client_id: testClientId,
        date: '1985-06-20',
        time: '08:00:00',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
      })

      const newChart = await apiClient.post('/api/charts', {
        client_id: testClientId,
        birth_data_id: newBirthData.data.id,
        chart_type: 'natal',
      })

      // Generate interpretation immediately
      const interpretation = await apiClient.post('/api/interpretations/generate', {
        chart_id: newChart.data.id,
      })

      expect(interpretation.data.chart_id).toBe(newChart.data.id)
      expect(interpretation.data.content).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle interpretation generation for valid chart', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(response.status).toBe(200)
      expect(response.data.id).toBeDefined()
    })

    it('should handle concurrent interpretation requests', async () => {
      // Generate multiple interpretations concurrently
      const promises = [
        apiClient.post('/api/interpretations/generate', { chart_id: testChartId }),
        apiClient.post('/api/interpretations/generate', { chart_id: testChartId }),
        apiClient.post('/api/interpretations/generate', { chart_id: testChartId }),
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.status).toBe(200)
        expect(result.data.chart_id).toBe(testChartId)
      })
    })
  })

  describe('Interpretation Data Integrity', () => {
    it('should maintain interpretation content structure', async () => {
      const response = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      const { content } = response.data

      // Verify content is not empty
      expect(content.overview).toBeTruthy()
      expect(content.overview).not.toBe('')

      // Verify content structure is consistent
      expect(typeof content.overview).toBe('string')
      expect(typeof content.planets).toBe('object')
      expect(typeof content.aspects).toBe('object')
    })

    it('should generate unique interpretation IDs', async () => {
      const interpretation1 = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      const interpretation2 = await apiClient.post('/api/interpretations/generate', {
        chart_id: testChartId,
      })

      expect(interpretation1.data.id).not.toBe(interpretation2.data.id)
    })
  })
})
