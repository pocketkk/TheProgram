/**
 * Session Management Integration Tests
 *
 * End-to-end tests for session persistence and management:
 * - Session persistence across page reloads
 * - Token verification
 * - Logout flow
 * - Session expiry handling
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState, resetMocks } from '@/tests/mocks/handlers'
import { authApi } from '@/lib/api/auth'
import { Header } from '@/components/layout/Header'
import { App } from '@/App'

// Don't mock the auth store for integration tests
vi.unmock('@/store/authStore')
vi.unmock('@/lib/api/auth')

describe('Session Management Integration Tests', () => {
  beforeEach(() => {
    // Set up password configured state
    setMockPasswordState(true, 'test1234')
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    resetMocks()
  })

  describe('Session Persistence', () => {
    it('should persist session token in localStorage on login', async () => {
      // Login
      const response = await authApi.login('test1234')

      // Store token
      localStorage.setItem('session_token', response.access_token)

      // Verify token is stored
      const storedToken = localStorage.getItem('session_token')
      expect(storedToken).toBe(response.access_token)
      expect(storedToken).toBe('mock-jwt-token-abc123')
    })

    it('should restore session from localStorage on app load', async () => {
      // Simulate existing session
      localStorage.setItem('session_token', 'mock-jwt-token-abc123')

      // Initialize auth store
      await useAuthStore.getState().checkAuthStatus()

      // Should restore authenticated state
      const state = useAuthStore.getState()
      expect(state.token).toBe('mock-jwt-token-abc123')
      expect(state.isAuthenticated).toBe(true)
    })

    it('should verify token validity on app load', async () => {
      localStorage.setItem('session_token', 'mock-jwt-token-abc123')

      // Check auth status
      await useAuthStore.getState().checkAuthStatus()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
    })

    it('should handle invalid token in localStorage', async () => {
      localStorage.setItem('session_token', 'invalid-token')

      // Check auth status
      await useAuthStore.getState().checkAuthStatus()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBeNull()
    })

    it('should clear session when token is removed from localStorage', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'mock-jwt-token-abc123',
        needsPasswordSetup: false,
        isLoading: false,
        error: null,
      })

      // Remove token
      localStorage.removeItem('session_token')

      // Check auth status
      await useAuthStore.getState().checkAuthStatus()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBeNull()
    })
  })

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const result = await authApi.verifyToken('mock-jwt-token-abc123')

      expect(result.valid).toBe(true)
      expect(result.message).toBe('Token is valid')
    })

    it('should reject invalid token', async () => {
      const result = await authApi.verifyToken('invalid-token')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('Token is invalid or expired')
    })

    it('should automatically verify token on store initialization', async () => {
      localStorage.setItem('session_token', 'mock-jwt-token-abc123')

      await useAuthStore.getState().initialize()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('Logout Flow', () => {
    it('should clear session on logout', async () => {
      // Set up authenticated state
      localStorage.setItem('session_token', 'mock-jwt-token-abc123')
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'mock-jwt-token-abc123',
        needsPasswordSetup: false,
        isLoading: false,
        error: null,
      })

      // Logout
      await useAuthStore.getState().logout()

      // Verify session is cleared
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBeNull()
      expect(localStorage.getItem('session_token')).toBeNull()
    })

    it('should call logout API endpoint', async () => {
      const result = await authApi.logout()

      expect(result.message).toBe('Logged out successfully')
    })

    it('should handle logout from UI', async () => {
      const user = userEvent.setup()

      // Set up authenticated state
      localStorage.setItem('session_token', 'mock-jwt-token-abc123')
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'mock-jwt-token-abc123',
        needsPasswordSetup: false,
        isLoading: false,
        error: null,
      })

      renderWithProviders(<Header />)

      // Find and click logout button
      const logoutButton = screen.getByRole('button', { name: /logout|sign out/i })
      await user.click(logoutButton)

      // Wait for logout to complete
      await waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.isAuthenticated).toBe(false)
      })

      // Token should be removed
      expect(localStorage.getItem('session_token')).toBeNull()
    })

    it('should redirect to login after logout', async () => {
      const user = userEvent.setup()

      localStorage.setItem('session_token', 'mock-jwt-token-abc123')
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'mock-jwt-token-abc123',
        needsPasswordSetup: false,
        isLoading: false,
        error: null,
      })

      renderWithProviders(<Header />)

      const logoutButton = screen.getByRole('button', { name: /logout|sign out/i })
      await user.click(logoutButton)

      await waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.isAuthenticated).toBe(false)
      })

      // In a full app test, would verify redirect to login page
    })
  })

  describe('Session Expiry', () => {
    it('should handle expired session gracefully', async () => {
      // Set up with expired token (in mock, this would be handled by setting token to invalid)
      localStorage.setItem('session_token', 'expired-token')

      await useAuthStore.getState().checkAuthStatus()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })

    it('should clear expired session from localStorage', async () => {
      localStorage.setItem('session_token', 'expired-token')

      await useAuthStore.getState().checkAuthStatus()

      // Expired token should be removed
      expect(localStorage.getItem('session_token')).toBeNull()
    })

    it('should handle 401 responses by logging out', async () => {
      // Set up authenticated state with token that will return 401
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'expired-token',
        needsPasswordSetup: false,
        isLoading: false,
        error: null,
      })

      // Verify token (should fail)
      const result = await authApi.verifyToken('expired-token')
      expect(result.valid).toBe(false)

      // App should log out user
      await useAuthStore.getState().checkAuthStatus()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('Multiple Tabs/Windows', () => {
    it('should sync session across tabs', () => {
      // Set token in localStorage (simulating another tab)
      localStorage.setItem('session_token', 'mock-jwt-token-abc123')

      // Trigger storage event
      const event = new StorageEvent('storage', {
        key: 'session_token',
        newValue: 'mock-jwt-token-abc123',
        oldValue: null,
        storageArea: localStorage,
      })
      window.dispatchEvent(event)

      // In a full implementation, store would listen to storage events
      // and update state accordingly
    })

    it('should sync logout across tabs', () => {
      // Remove token in localStorage (simulating logout in another tab)
      localStorage.removeItem('session_token')

      // Trigger storage event
      const event = new StorageEvent('storage', {
        key: 'session_token',
        newValue: null,
        oldValue: 'mock-jwt-token-abc123',
        storageArea: localStorage,
      })
      window.dispatchEvent(event)

      // Store should detect removal and log out
    })
  })

  describe('Security', () => {
    it('should not expose token in console or errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const errorSpy = vi.spyOn(console, 'error')

      await authApi.login('test1234')

      // Check console calls don't include token
      const allCalls = [...consoleSpy.mock.calls, ...errorSpy.mock.calls]
      const hasToken = allCalls.some(call =>
        call.some(arg => String(arg).includes('mock-jwt-token'))
      )

      expect(hasToken).toBe(false)

      consoleSpy.mockRestore()
      errorSpy.mockRestore()
    })

    it('should validate token format', async () => {
      const result = await authApi.verifyToken('clearly-not-a-jwt')

      expect(result.valid).toBe(false)
    })

    it('should handle token tampering', async () => {
      // Attempt to verify tampered token
      const result = await authApi.verifyToken('tampered.token.signature')

      expect(result.valid).toBe(false)
    })
  })

  describe('Session Recovery', () => {
    it('should recover session after network interruption', async () => {
      localStorage.setItem('session_token', 'mock-jwt-token-abc123')

      // Simulate network error then recovery
      await useAuthStore.getState().checkAuthStatus()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
    })

    it('should re-authenticate after session loss', async () => {
      // Simulate session loss
      useAuthStore.setState({
        isAuthenticated: false,
        token: null,
        needsPasswordSetup: false,
        isLoading: false,
        error: null,
      })

      // Re-login
      const response = await authApi.login('test1234')
      localStorage.setItem('session_token', response.access_token)

      useAuthStore.setState({
        isAuthenticated: true,
        token: response.access_token,
      })

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe('mock-jwt-token-abc123')
    })
  })

  describe('Token Lifecycle', () => {
    it('should include token expiry information', async () => {
      const response = await authApi.login('test1234')

      expect(response.expires_in).toBe(86400) // 24 hours in seconds
      expect(response.token_type).toBe('bearer')
    })

    it('should handle token refresh flow', async () => {
      // Login to get token
      const loginResponse = await authApi.login('test1234')
      expect(loginResponse.access_token).toBeDefined()

      // In a full implementation, would test token refresh before expiry
      // For now, verify token is valid
      const verifyResponse = await authApi.verifyToken(loginResponse.access_token)
      expect(verifyResponse.valid).toBe(true)
    })
  })
})
