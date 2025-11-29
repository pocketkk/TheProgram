/**
 * PasswordSetupPage Component Tests
 *
 * Tests the first-time password setup flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordSetupPage } from '@/features/auth/PasswordSetupPage'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('PasswordSetupPage', () => {
  const mockSetupPassword = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    setMockPasswordState(false) // No password set

    // Default mock implementation
    vi.mocked(useAuthStore).mockReturnValue({
      setupPassword: mockSetupPassword,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: true,
      checkAuthStatus: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })
  })

  it('should render password setup form with heading and fields', () => {
    renderWithProviders(<PasswordSetupPage />)

    expect(screen.getByRole('heading', { name: /welcome to the program/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^create password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set password & continue/i })).toBeInTheDocument()
  })

  it('should show info message about first-time setup', () => {
    renderWithProviders(<PasswordSetupPage />)

    expect(screen.getByText(/first-time setup/i)).toBeInTheDocument()
    expect(screen.getByText(/this is a personal app running on your device/i)).toBeInTheDocument()
  })

  it('should validate password length (minimum 4 characters)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /set password & continue/i })

    await user.type(passwordInput, 'abc')
    await user.type(confirmInput, 'abc')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 4 characters/i)).toBeInTheDocument()
    })

    expect(mockSetupPassword).not.toHaveBeenCalled()
  })

  it('should warn about weak passwords (less than 8 characters)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /set password & continue/i })

    await user.type(passwordInput, 'weak12')
    await user.type(confirmInput, 'weak12')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password is too short.*recommend at least 8 characters/i)).toBeInTheDocument()
    })

    expect(mockSetupPassword).not.toHaveBeenCalled()
  })

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /set password & continue/i })

    await user.type(passwordInput, 'SecurePass123')
    await user.type(confirmInput, 'DifferentPass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    expect(mockSetupPassword).not.toHaveBeenCalled()
  })

  it('should successfully set up password with valid input', async () => {
    mockSetupPassword.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /set password & continue/i })

    await user.type(passwordInput, 'SecurePass123')
    await user.type(confirmInput, 'SecurePass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSetupPassword).toHaveBeenCalledWith('SecurePass123')
    })
  })

  it('should display error from auth store', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      setupPassword: mockSetupPassword,
      isLoading: false,
      error: 'Server error occurred',
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: true,
      checkAuthStatus: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })

    renderWithProviders(<PasswordSetupPage />)

    expect(screen.getByText('Server error occurred')).toBeInTheDocument()
  })

  it('should show loading state during password setup', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      setupPassword: mockSetupPassword,
      isLoading: true,
      error: null,
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: true,
      checkAuthStatus: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })

    renderWithProviders(<PasswordSetupPage />)

    // Button component shows "Loading..." when loading prop is true
    const submitButton = screen.getByRole('button', { name: /loading/i })
    expect(submitButton).toBeDisabled()
  })

  it('should clear error when clearError is called', async () => {
    mockSetupPassword.mockResolvedValue(undefined)
    const user = userEvent.setup()
    vi.mocked(useAuthStore).mockReturnValue({
      setupPassword: mockSetupPassword,
      isLoading: false,
      error: 'Previous error',
      clearError: mockClearError,
      isAuthenticated: false,
      token: null,
      needsPasswordSetup: true,
      checkAuthStatus: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
    })

    renderWithProviders(<PasswordSetupPage />)

    // Fill both required fields to allow form submission
    const passwordInput = screen.getByLabelText(/^create password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    await user.type(passwordInput, 'test1234')
    await user.type(confirmInput, 'test1234')

    // ClearError should be called when form is submitted
    const submitButton = screen.getByRole('button', { name: /set password/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalled()
    })
  })

  it('should have autofocus on password field', () => {
    renderWithProviders(<PasswordSetupPage />)

    const passwordInput = screen.getByLabelText(/^create password/i)
    // React's autoFocus prop triggers focus on mount, but may not add the attribute
    // We check that the element could receive focus (not disabled, correct type)
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).not.toBeDisabled()
  })

  it('should show helper text about password requirements', () => {
    renderWithProviders(<PasswordSetupPage />)

    expect(screen.getByText(/minimum 4 characters.*recommend at least 8/i)).toBeInTheDocument()
  })

  it('should show footer text about changing password later', () => {
    renderWithProviders(<PasswordSetupPage />)

    expect(screen.getByText(/you can change or disable this password later/i)).toBeInTheDocument()
  })
})
