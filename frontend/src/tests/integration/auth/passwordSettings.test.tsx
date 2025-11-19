/**
 * Password Settings Integration Tests
 *
 * End-to-end tests for password management features:
 * - Change password
 * - Disable password
 * - Session invalidation on password changes
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordSettingsPage } from '@/features/auth/PasswordSettingsPage'
import { renderWithProviders } from '@/tests/utils/testUtils'
import { useAuthStore } from '@/store/authStore'
import { setMockPasswordState } from '@/tests/mocks/handlers'
import { authApi } from '@/lib/api/auth'

// Don't mock the auth store for integration tests
vi.unmock('@/store/authStore')
vi.unmock('@/lib/api/auth')

describe('Password Settings Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated state with password
    setMockPasswordState(true, 'current-password')
    localStorage.setItem('session_token', 'mock-jwt-token-abc123')

    // Set authenticated state
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'mock-jwt-token-abc123',
      needsPasswordSetup: false,
      isLoading: false,
      error: null,
    })
  })

  describe('Change Password Flow', () => {
    it('should successfully change password with correct old password', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      // Fill in change password form
      const oldPasswordInput = screen.getByLabelText(/current password/i)
      const newPasswordInput = screen.getByLabelText(/^new password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      await user.type(oldPasswordInput, 'current-password')
      await user.type(newPasswordInput, 'new-secure-password')
      await user.type(confirmPasswordInput, 'new-secure-password')

      const changeButton = screen.getByRole('button', { name: /change password/i })
      await user.click(changeButton)

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument()
      })
    })

    it('should fail to change password with incorrect old password', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const oldPasswordInput = screen.getByLabelText(/current password/i)
      const newPasswordInput = screen.getByLabelText(/^new password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      await user.type(oldPasswordInput, 'wrong-password')
      await user.type(newPasswordInput, 'new-password')
      await user.type(confirmPasswordInput, 'new-password')

      const changeButton = screen.getByRole('button', { name: /change password/i })
      await user.click(changeButton)

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument()
      })
    })

    it('should validate new password length', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const oldPasswordInput = screen.getByLabelText(/current password/i)
      const newPasswordInput = screen.getByLabelText(/^new password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      await user.type(oldPasswordInput, 'current-password')
      await user.type(newPasswordInput, 'abc') // Too short
      await user.type(confirmPasswordInput, 'abc')

      const changeButton = screen.getByRole('button', { name: /change password/i })
      await user.click(changeButton)

      // Client-side validation should catch this
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 4 characters/i)).toBeInTheDocument()
      })
    })

    it('should validate new passwords match', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const oldPasswordInput = screen.getByLabelText(/current password/i)
      const newPasswordInput = screen.getByLabelText(/^new password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      await user.type(oldPasswordInput, 'current-password')
      await user.type(newPasswordInput, 'new-password-123')
      await user.type(confirmPasswordInput, 'different-password')

      const changeButton = screen.getByRole('button', { name: /change password/i })
      await user.click(changeButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during password change', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const oldPasswordInput = screen.getByLabelText(/current password/i)
      const newPasswordInput = screen.getByLabelText(/^new password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      await user.type(oldPasswordInput, 'current-password')
      await user.type(newPasswordInput, 'new-password')
      await user.type(confirmPasswordInput, 'new-password')

      const changeButton = screen.getByRole('button', { name: /change password/i })
      await user.click(changeButton)

      // Loading state should appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /changing/i })).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should clear form after successful password change', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const oldPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement
      const newPasswordInput = screen.getByLabelText(/^new password/i) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i) as HTMLInputElement

      await user.type(oldPasswordInput, 'current-password')
      await user.type(newPasswordInput, 'new-password')
      await user.type(confirmPasswordInput, 'new-password')

      const changeButton = screen.getByRole('button', { name: /change password/i })
      await user.click(changeButton)

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument()
      })

      // Form fields should be cleared
      await waitFor(() => {
        expect(oldPasswordInput.value).toBe('')
        expect(newPasswordInput.value).toBe('')
        expect(confirmPasswordInput.value).toBe('')
      })
    })
  })

  describe('Disable Password Flow', () => {
    it('should successfully disable password with confirmation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      // Find and click disable password button
      const disableButton = screen.getByRole('button', { name: /disable password protection/i })
      await user.click(disableButton)

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })

      // Enter password in confirmation dialog
      const passwordInput = screen.getByLabelText(/enter your password to confirm/i)
      await user.type(passwordInput, 'current-password')

      // Check confirmation checkbox
      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i })
      await user.click(confirmCheckbox)

      // Confirm disable
      const confirmButton = screen.getByRole('button', { name: /^disable/i })
      await user.click(confirmButton)

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/password requirement disabled/i)).toBeInTheDocument()
      })

      // Auth state should be updated
      const state = useAuthStore.getState()
      expect(state.needsPasswordSetup).toBe(false)
    })

    it('should fail to disable password with incorrect password', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const disableButton = screen.getByRole('button', { name: /disable password protection/i })
      await user.click(disableButton)

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })

      const passwordInput = screen.getByLabelText(/enter your password to confirm/i)
      await user.type(passwordInput, 'wrong-password')

      const confirmCheckbox = screen.getByRole('checkbox', { name: /i understand/i })
      await user.click(confirmCheckbox)

      const confirmButton = screen.getByRole('button', { name: /^disable/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument()
      })
    })

    it('should require confirmation checkbox to be checked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const disableButton = screen.getByRole('button', { name: /disable password protection/i })
      await user.click(disableButton)

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })

      const passwordInput = screen.getByLabelText(/enter your password to confirm/i)
      await user.type(passwordInput, 'current-password')

      // Don't check the confirmation checkbox
      const confirmButton = screen.getByRole('button', { name: /^disable/i })

      // Button should be disabled or validation should fail
      expect(confirmButton).toBeDisabled()
    })

    it('should allow canceling disable password dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PasswordSettingsPage />)

      const disableButton = screen.getByRole('button', { name: /disable password protection/i })
      await user.click(disableButton)

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
      })

      // Password should still be enabled
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('API Integration', () => {
    it('should call change password API with correct data', async () => {
      const result = await authApi.changePassword('current-password', 'new-password')

      expect(result.message).toBe('Password changed successfully')
    })

    it('should call disable password API with correct data', async () => {
      const result = await authApi.disablePassword('current-password', true)

      expect(result.message).toBe('Password requirement disabled')
    })

    it('should handle API errors gracefully', async () => {
      await expect(
        authApi.changePassword('wrong-password', 'new-password')
      ).rejects.toThrow('Current password is incorrect')
    })
  })

  describe('Security', () => {
    it('should not show passwords in clear text', () => {
      renderWithProviders(<PasswordSettingsPage />)

      const oldPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement
      const newPasswordInput = screen.getByLabelText(/^new password/i) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i) as HTMLInputElement

      expect(oldPasswordInput.type).toBe('password')
      expect(newPasswordInput.type).toBe('password')
      expect(confirmPasswordInput.type).toBe('password')
    })

    it('should require re-authentication for password changes', async () => {
      // Verify that old password is always required
      renderWithProviders(<PasswordSettingsPage />)

      const oldPasswordInput = screen.getByLabelText(/current password/i)
      expect(oldPasswordInput).toBeRequired()
    })
  })
})
