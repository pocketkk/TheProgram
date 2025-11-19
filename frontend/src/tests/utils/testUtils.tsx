/**
 * Test Utilities
 *
 * Custom render functions and helpers for testing React components.
 */
import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * Mock zustand stores for testing
 */
export const mockUseAuthStore = vi.fn()

/**
 * Wrapper component for tests that need providers
 */
interface AllTheProvidersProps {
  children: ReactNode
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  // Add any global providers here (React Query, Router, etc.)
  return <>{children}</>
}

/**
 * Custom render function that includes providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

/**
 * Mock localStorage
 */
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

/**
 * Setup localStorage mock
 */
export const setupLocalStorageMock = () => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
}

/**
 * Clear localStorage mock
 */
export const clearLocalStorageMock = () => {
  mockLocalStorage.clear()
}

/**
 * Create a mock client for testing
 */
export const createMockClient = (overrides = {}) => ({
  id: 'client-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  notes: 'Test notes',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

/**
 * Create a mock chart for testing
 */
export const createMockChart = (overrides = {}) => ({
  id: 'chart-123',
  client_id: 'client-123',
  birth_data_id: 'birth-data-123',
  chart_type: 'natal',
  calculation_status: 'completed',
  planets: {
    sun: { longitude: 120.5, latitude: 0, speed: 1.0 },
    moon: { longitude: 45.2, latitude: 0, speed: 13.2 },
  },
  houses: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
  ascendant: { longitude: 0, sign: 'Aries' },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

// Re-export everything from @testing-library/react
export * from '@testing-library/react'
export { renderWithProviders as render }
