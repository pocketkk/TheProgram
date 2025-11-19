/**
 * Password Setup Integration Tests
 *
 * End-to-end tests for the first-time password setup flow.
 * These tests use real auth store and mock API calls.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordSetupPage } from '@/features/auth/PasswordSetupPage'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'

// Don't mock the auth store for integration tests
vi.unmock('@/store/authStore')

describe('Password Setup Integration Tests', () => {
  beforeEach(() => {
    // Reset to initial state: no password set
    setMockPasswordState(false)
    localStorage.clear()

    // Reset the auth store state
    useAuthStore.setState({
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: true,
      isLoading: false,
      error: null,
    })
  })

  it('should complete full password setup flow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    // Fill in password fields
    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.type(passwordInput, 'MySecurePass123')
    await user.type(confirmInput, 'MySecurePass123')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    // Wait for API call to complete
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.needsPasswordSetup).toBe(false)
      expect(state.isLoading).toBe(false)
    })

    // Verify no error
    const state = useAuthStore.getState()
    expect(state.error).toBeNull()
  })

  it('should show error when password is too short', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.type(passwordInput, 'abc')
    await user.type(confirmInput, 'abc')

    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    // Should show client-side validation error
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 4 characters/i)).toBeInTheDocument()
    })
  })

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.type(passwordInput, 'Password123')
    await user.type(confirmInput, 'Different123')

    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('should handle API error when password already set', async () => {
    // Set password in mock backend
    setMockPasswordState(true, 'existing-password')

    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.type(passwordInput, 'NewPassword123')
    await user.type(confirmInput, 'NewPassword123')

    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    // Wait for API error
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.error).toBe('Password is already set up')
    })
  })

  it('should show loading state during API call', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.type(passwordInput, 'SecurePass123')
    await user.type(confirmInput, 'SecurePass123')

    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    // Check loading state appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /setting up/i })).toBeInTheDocument()
    })

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /setting up/i })).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should clear errors when starting new submission', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    // First submission with error
    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.type(passwordInput, 'Pass1')
    await user.type(confirmInput, 'Pass2')

    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    // Error should appear
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    // Clear and retry with correct input
    await user.clear(passwordInput)
    await user.clear(confirmInput)
    await user.type(passwordInput, 'CorrectPass123')
    await user.type(confirmInput, 'CorrectPass123')
    await user.click(submitButton)

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument()
    })
  })

  it('should accept minimum valid password (4 characters)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    // This should trigger the "too short" warning
    await user.type(passwordInput, 'pass')
    await user.type(confirmInput, 'pass')

    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    // Should show warning about weak password
    await waitFor(() => {
      expect(screen.getByText(/password is too short.*recommend at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('should accept strong password (8+ characters)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    await user.type(passwordInput, 'StrongPass123')
    await user.type(confirmInput, 'StrongPass123')

    const submitButton = screen.getByRole('button', { name: /set password & continue/i })
    await user.click(submitButton)

    // Should succeed without warnings
    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.needsPasswordSetup).toBe(false)
      expect(state.error).toBeNull()
    })
  })
})
