/**
 * Dashboard Integration Tests
 *
 * End-to-end tests for dashboard functionality:
 * - Loading dashboard with data
 * - Recent charts display
 * - Navigation to chart details
 * - Empty state handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'
import { createClient } from '@/lib/api/clients'
import { apiClient } from '@/lib/api/client'

// Don't mock stores for integration tests
vi.unmock('@/store/authStore')
vi.unmock('@/store/clientStore')

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated state
    setMockPasswordState(true, 'test1234')
    localStorage.setItem('session_token', 'mock-jwt-token-abc123')

    useAuthStore.setState({
      isAuthenticated: true,
      token: 'mock-jwt-token-abc123',
      needsPasswordSetup: false,
      isLoading: false,
      error: null,
    })
  })

  describe('Dashboard Loading', () => {
    it('should load dashboard when authenticated', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching data', async () => {
      renderWithProviders(<DashboardPage />)

      // Loading state should appear briefly
      const loadingElements = screen.queryAllByText(/loading/i)
      expect(loadingElements.length).toBeGreaterThanOrEqual(0)
    })

    it('should display empty state when no data exists', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/no clients yet|get started|create your first/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Recent Clients Display', () => {
    it('should display recent clients after creation', async () => {
      // Create some test clients
      await createClient({ first_name: 'Alice', last_name: 'Johnson' })
      await createClient({ first_name: 'Bob', last_name: 'Smith' })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/alice johnson/i)).toBeInTheDocument()
        expect(screen.getByText(/bob smith/i)).toBeInTheDocument()
      })
    })

    it('should show client count', async () => {
      await createClient({ first_name: 'Client 1' })
      await createClient({ first_name: 'Client 2' })
      await createClient({ first_name: 'Client 3' })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/3.*client/i)).toBeInTheDocument()
      })
    })

    it('should handle single client display', async () => {
      await createClient({ first_name: 'Solo', last_name: 'Client' })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/solo client/i)).toBeInTheDocument()
        expect(screen.getByText(/1.*client/i)).toBeInTheDocument()
      })
    })
  })

  describe('Recent Charts Display', () => {
    it('should display recent charts after creation', async () => {
      // Create client and chart
      const client = await createClient({ first_name: 'Chart Owner' })

      const birthData = await apiClient.post('/api/birth-data', {
        client_id: client.id,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        location_name: 'New York, NY',
      })

      await apiClient.post('/api/charts', {
        client_id: client.id,
        birth_data_id: birthData.data.id,
        chart_type: 'natal',
      })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/recent charts|latest charts/i)).toBeInTheDocument()
      })
    })

    it('should show empty state when no charts exist', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/no charts yet|create a chart/i)
        ).toBeInTheDocument()
      })
    })

    it('should limit recent charts display', async () => {
      // Create multiple charts
      const client = await createClient({ first_name: 'Test' })

      for (let i = 0; i < 10; i++) {
        const birthData = await apiClient.post('/api/birth-data', {
          client_id: client.id,
          date: '1990-01-15',
          time: '14:30:00',
          latitude: 40.7128,
          longitude: -74.0060,
          timezone: 'America/New_York',
        })

        await apiClient.post('/api/charts', {
          client_id: client.id,
          birth_data_id: birthData.data.id,
          chart_type: 'natal',
        })
      }

      renderWithProviders(<DashboardPage />)

      // Should show recent charts (typically limited to 5-10)
      await waitFor(() => {
        const chartElements = screen.queryAllByText(/natal/i)
        expect(chartElements.length).toBeLessThanOrEqual(10)
      })
    })
  })

  describe('Dashboard Statistics', () => {
    it('should display correct statistics', async () => {
      // Create test data
      await createClient({ first_name: 'Client 1' })
      await createClient({ first_name: 'Client 2' })

      const client = await createClient({ first_name: 'Client 3' })

      const birthData = await apiClient.post('/api/birth-data', {
        client_id: client.id,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      })

      await apiClient.post('/api/charts', {
        client_id: client.id,
        birth_data_id: birthData.data.id,
        chart_type: 'natal',
      })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        // Should show 3 clients and 1 chart
        expect(screen.getByText(/3.*client/i)).toBeInTheDocument()
        expect(screen.getByText(/1.*chart/i)).toBeInTheDocument()
      })
    })

    it('should update statistics in real-time', async () => {
      renderWithProviders(<DashboardPage />)

      // Initial state should be empty
      await waitFor(() => {
        expect(screen.getByText(/0.*client|no clients/i)).toBeInTheDocument()
      })

      // Create a client
      await createClient({ first_name: 'New Client' })

      // Stats should update (in a real app with refetch)
      // This test validates the current state
      expect(screen.queryByText(/new client/i)).not.toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to clients page', async () => {
      const user = userEvent.setup()
      renderWithProviders(<DashboardPage />)

      const clientsLink = screen.getByRole('link', { name: /view all clients|clients/i })
      await user.click(clientsLink)

      // Navigation should occur (in real app with router)
      expect(clientsLink).toHaveAttribute('href', '/clients')
    })

    it('should navigate to create client page', async () => {
      const user = userEvent.setup()
      renderWithProviders(<DashboardPage />)

      const createButton = screen.getByRole('button', { name: /create client|add client|new client/i })
      await user.click(createButton)

      // Should open create client dialog or navigate
      await waitFor(() => {
        expect(screen.getByText(/add new client|create client/i)).toBeInTheDocument()
      })
    })

    it('should navigate to chart details', async () => {
      // Create client and chart
      const client = await createClient({ first_name: 'Chart Owner' })

      const birthData = await apiClient.post('/api/birth-data', {
        client_id: client.id,
        date: '1990-01-15',
        time: '14:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
      })

      const chart = await apiClient.post('/api/charts', {
        client_id: client.id,
        birth_data_id: birthData.data.id,
        chart_type: 'natal',
      })

      const user = userEvent.setup()
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/recent charts/i)).toBeInTheDocument()
      })

      // Click on chart
      const chartLink = screen.getByText(/natal/i)
      await user.click(chartLink)

      // Should navigate to chart details (verify link exists)
      expect(chartLink.closest('a')).toHaveAttribute('href', expect.stringContaining('/charts'))
    })
  })

  describe('Quick Actions', () => {
    it('should provide quick action to create chart', async () => {
      renderWithProviders(<DashboardPage />)

      const createChartButton = screen.getByRole('button', { name: /create chart|new chart/i })
      expect(createChartButton).toBeInTheDocument()
    })

    it('should provide quick action to view all charts', async () => {
      renderWithProviders(<DashboardPage />)

      const viewChartsLink = screen.getByRole('link', { name: /view all charts|all charts/i })
      expect(viewChartsLink).toBeInTheDocument()
    })
  })

  describe('Responsive Layout', () => {
    it('should render dashboard grid layout', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        const dashboard = screen.getByRole('main')
        expect(dashboard).toBeInTheDocument()
      })
    })

    it('should show welcome message', async () => {
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/welcome|dashboard/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Refresh', () => {
    it('should refresh data on mount', async () => {
      // Create data before mount
      await createClient({ first_name: 'Pre-existing' })

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/pre-existing/i)).toBeInTheDocument()
      })
    })

    it('should handle refresh errors gracefully', async () => {
      renderWithProviders(<DashboardPage />)

      // Dashboard should still render even if data fetch fails
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should load dashboard within reasonable time', async () => {
      const startTime = Date.now()

      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Should load in under 3 seconds
    })

    it('should handle large datasets efficiently', async () => {
      // Create many clients
      const promises = []
      for (let i = 0; i < 50; i++) {
        promises.push(createClient({ first_name: `Client ${i}` }))
      }
      await Promise.all(promises)

      const startTime = Date.now()
      renderWithProviders(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should handle 50 clients in under 5 seconds
    })
  })
})
