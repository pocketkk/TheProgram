/**
 * LoginPage Component Tests
 *
 * Tests the login flow and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '@/features/auth/LoginPage'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('LoginPage', () => {
  const mockLogin = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    setMockPasswordState(true, 'test1234') // Password is set

    // Default mock implementation
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: false,
      checkAuthStatus: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })
  })

  it('should render login form with heading and password field', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should have autofocus on password field', () => {
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('autofocus')
  })

  it('should call login with entered password on submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(passwordInput, 'test1234')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test1234')
    })
  })

  it('should display error message when login fails', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Invalid password',
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: false,
      checkAuthStatus: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })

    renderWithProviders(<LoginPage />)

    expect(screen.getByText('Invalid password')).toBeInTheDocument()
  })

  it('should show loading state during login', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: false,
      checkAuthStatus: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })

    renderWithProviders(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
  })

  it('should clear error when form is submitted', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(passwordInput, 'test1234')
    await user.click(submitButton)

    expect(mockClearError).toHaveBeenCalled()
  })

  it('should disable password input during loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: false,
      checkAuthStatus: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })

    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toBeDisabled()
  })

  it('should show help text about password reset', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByText(/forgot your password.*reset it from the backend database/i)).toBeInTheDocument()
  })

  it('should show footer text about professional astrology', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByText(/professional astrological chart calculation/i)).toBeInTheDocument()
  })

  it('should require password field', () => {
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toBeRequired()
  })

  it('should handle login error gracefully', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
    })

    // The error should be logged to console
    // In real usage, the error would be set in the store
  })

  it('should not submit form with empty password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // HTML5 validation should prevent submission
    expect(mockLogin).not.toHaveBeenCalled()
  })
})
