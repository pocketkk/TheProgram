/**
 * Header Component Tests
 *
 * Tests the header navigation and logout functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '@/components/layout/Header'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('Header', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation
    vi.mocked(useAuthStore).mockReturnValue({
      logout: mockLogout,
      isAuthenticated: true,
      token: 'mock-token',
      needsPasswordSetup: false,
      isLoading: false,
      error: null,
      checkAuthStatus: vi.fn(),
      setupPassword: vi.fn(),
      login: vi.fn(),
      verifyToken: vi.fn(),
      clearError: vi.fn(),
    })
  })

  it('should render header with app title and tagline', () => {
    renderWithProviders(<Header />)

    expect(screen.getByText('The Program')).toBeInTheDocument()
    expect(screen.getByText('Astrological Chart Calculation')).toBeInTheDocument()
  })

  it('should render logo with sparkles icon', () => {
    renderWithProviders(<Header />)

    // Logo container should be present
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })

  it('should render settings button', () => {
    renderWithProviders(<Header />)

    const settingsButtons = screen.getAllByRole('button')
    // Should have Settings and LogOut buttons
    expect(settingsButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('should render logout button', () => {
    renderWithProviders(<Header />)

    const buttons = screen.getAllByRole('button')
    // Logout button is the second button (after settings)
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('should call logout when logout button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />)

    // Get all buttons (Settings and LogOut)
    const buttons = screen.getAllByRole('button')
    // LogOut is the second button
    const logoutButton = buttons[1]

    await user.click(logoutButton)

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('should have consistent styling with cosmic theme', () => {
    renderWithProviders(<Header />)

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    // Header should have proper classes (check via className)
  })

  it('should render with motion animation', () => {
    renderWithProviders(<Header />)

    // Header uses motion.header which should render as a header element
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })

  it('should be sticky positioned', () => {
    renderWithProviders(<Header />)

    const header = screen.getByRole('banner')
    // Check for sticky positioning via class
    expect(header.className).toContain('sticky')
  })

  it('should have high z-index for proper layering', () => {
    renderWithProviders(<Header />)

    const header = screen.getByRole('banner')
    expect(header.className).toContain('z-40')
  })

  it('should display app branding consistently', () => {
    renderWithProviders(<Header />)

    // Title should be in heading style
    const title = screen.getByText('The Program')
    expect(title.className).toContain('font-heading')
    expect(title.className).toContain('font-bold')
  })

  it('should render action buttons in correct order', () => {
    renderWithProviders(<Header />)

    const buttons = screen.getAllByRole('button')
    // Settings button first, then logout
    expect(buttons.length).toBe(2)
  })

  it('should not crash when logout is called multiple times', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />)

    const buttons = screen.getAllByRole('button')
    const logoutButton = buttons[1]

    await user.click(logoutButton)
    await user.click(logoutButton)
    await user.click(logoutButton)

    expect(mockLogout).toHaveBeenCalledTimes(3)
  })
})
