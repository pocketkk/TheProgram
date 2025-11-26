import '@testing-library/jest-dom'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '../tests/mocks/server'
import { resetMocks } from '../tests/mocks/handlers'

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

// Reset mocks and cleanup after each test
afterEach(() => {
  cleanup()
  resetMocks()
  server.resetHandlers()
  localStorage.clear()
})

// Clean up after all tests are done
afterAll(() => {
  server.close()
})
