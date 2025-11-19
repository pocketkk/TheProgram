/**
 * MSW Server Setup
 *
 * Creates a mock server for testing that intercepts HTTP requests.
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * Setup mock server with default handlers
 */
export const server = setupServer(...handlers)
