import '@testing-library/jest-dom'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Note: MSW server setup disabled due to MSW 2.x + Vitest compatibility issue.
// API mocking tests are skipped for now. See: https://github.com/mswjs/msw/issues/1877

// Ensure localStorage and sessionStorage are available for Zustand persist
beforeEach(() => {
  // jsdom should provide these, but ensure they're functional
  if (!window.localStorage || typeof window.localStorage.setItem !== 'function') {
    const createStorage = (): Storage => {
      const store: Record<string, string> = {}
      return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = String(value) },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { Object.keys(store).forEach(k => delete store[k]) },
        key: (index: number) => Object.keys(store)[index] ?? null,
        get length() { return Object.keys(store).length },
      }
    }
    Object.defineProperty(window, 'localStorage', { value: createStorage(), writable: true })
    Object.defineProperty(window, 'sessionStorage', { value: createStorage(), writable: true })
  }
})

// Reset and cleanup after each test
afterEach(() => {
  cleanup()
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    // Ignore if not available
  }
})
