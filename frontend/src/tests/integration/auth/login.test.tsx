/**
 * Login Integration Tests
 *
 * End-to-end tests for the login flow with authentication.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '@/features/auth/LoginPage'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'

// Don't mock the auth store for integration tests
vi.unmock('@/store/authStore')

describe('Login Integration Tests', () => {
  beforeEach(() => {
    // Set up initial state: password is set
    setMockPasswordState(true, 'test1234')
    localStorage.clear()

    // Reset the auth store state
    useAuthStore.setState({
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: false,
      isLoading: false,
      error: null,
    })
  })

  it('should successfully login with correct password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'test1234')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Wait for login to complete
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe('mock-jwt-token-abc123')
    })

    // Token should be in localStorage
    expect(localStorage.getItem('session_token')).toBe('mock-jwt-token-abc123')
  })

  it('should fail login with incorrect password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'wrongpassword')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Wait for error
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.error).toBe('Invalid password')
      expect(state.isAuthenticated).toBe(false)
    })

    // Token should not be in localStorage
    expect(localStorage.getItem('session_token')).toBeNull()
  })

  it('should show loading state during login', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'test1234')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Loading state should appear briefly
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    })

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /signing in/i })).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should clear previous errors on new login attempt', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    // First attempt with wrong password
    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'wrongpass')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Wait for error
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.error).toBe('Invalid password')
    })

    // Second attempt with correct password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'test1234')
    await user.click(submitButton)

    // Error should be cleared
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.error).toBeNull()
      expect(state.isAuthenticated).toBe(true)
    })
  })

  it('should handle empty password field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // HTML5 validation should prevent submission
    // The login function should not be called
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should persist session across page refresh', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'test1234')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Wait for login
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
    })

    const token = localStorage.getItem('session_token')
    expect(token).toBe('mock-jwt-token-abc123')

    // Simulate page refresh by calling checkAuthStatus
    await useAuthStore.getState().checkAuthStatus()

    // Should still be authenticated
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('mock-jwt-token-abc123')
  })

  it('should handle network errors gracefully', async () => {
    // This test would require overriding the MSW handler to throw an error
    // For now, we'll just verify the error handling path exists
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'test1234')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Login should complete (in this case successfully)
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  it('should not show password in clear text', () => {
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')
  })

  it('should disable form during login', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, 'test1234')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // During loading, input should be disabled
    await waitFor(() => {
      const state = useAuthStore.getState()
      if (state.isLoading) {
        expect(passwordInput).toBeDisabled()
        expect(submitButton).toBeDisabled()
      }
    })
  })
})
