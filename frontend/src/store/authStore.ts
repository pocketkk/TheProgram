/**
 * Authentication store for single-user application
 *
 * Manages authentication state using Zustand.
 * This simplified version removes user accounts and uses simple password auth.
 */
import { create } from 'zustand'
import { authApi } from '@/lib/api/auth'
import { getErrorMessage } from '@/lib/api/client'
import type { AuthState } from '@/types/auth'

/**
 * Local storage keys
 */
const STORAGE_KEY_TOKEN = 'session_token'

/**
 * Authentication store
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // State
  isAuthenticated: false,
  token: null,
  isLoading: false,
  error: null,
  needsPasswordSetup: false,

  /**
   * Check authentication status
   *
   * Called on app startup to determine if:
   * - Password needs to be set up (first time use)
   * - User needs to login
   * - User has valid session token
   */
  checkAuthStatus: async () => {
    set({ isLoading: true, error: null })

    try {
      // First, check if password is set up on backend
      const status = await authApi.getStatus()

      if (!status.password_set) {
        // No password set - user needs to set up password
        set({
          needsPasswordSetup: true,
          isAuthenticated: false,
          token: null,
          isLoading: false,
        })
        return
      }

      // Password is set, check if we have a valid token in localStorage
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN)

      if (storedToken) {
        // Verify the token is still valid
        const verifyResult = await authApi.verifyToken(storedToken)

        if (verifyResult.valid) {
          // Token is valid, user is authenticated
          set({
            isAuthenticated: true,
            token: storedToken,
            needsPasswordSetup: false,
            isLoading: false,
          })
          return
        } else {
          // Token is invalid, clear it
          localStorage.removeItem(STORAGE_KEY_TOKEN)
        }
      }

      // No valid token, user needs to login
      set({
        isAuthenticated: false,
        token: null,
        needsPasswordSetup: false,
        isLoading: false,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      set({
        error: message,
        isLoading: false,
        isAuthenticated: false,
        token: null,
      })
    }
  },

  /**
   * Set up password for first time use
   *
   * @param password - The password to set up
   * @throws Error if setup fails
   */
  setupPassword: async (password: string) => {
    set({ isLoading: true, error: null })

    try {
      await authApi.setupPassword(password)

      // Password is set, but user still needs to login
      // (We could auto-login here, but explicit login is clearer)
      set({
        needsPasswordSetup: false,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      set({
        error: message,
        isLoading: false,
      })
      throw error
    }
  },

  /**
   * Login with password
   *
   * @param password - The password to authenticate with
   * @throws Error if login fails
   */
  login: async (password: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await authApi.login(password)

      // Save token to localStorage
      localStorage.setItem(STORAGE_KEY_TOKEN, response.access_token)

      set({
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        needsPasswordSetup: false,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      set({
        error: message,
        isLoading: false,
        isAuthenticated: false,
        token: null,
      })
      throw error
    }
  },

  /**
   * Logout
   *
   * Clears session token and calls logout endpoint.
   */
  logout: async () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY_TOKEN)

    // Clear state
    set({
      token: null,
      isAuthenticated: false,
      error: null,
    })

    // Optionally call logout API (for future stateful session management)
    authApi.logout().catch(() => {
      // Ignore errors on logout
    })
  },

  /**
   * Verify current token is still valid
   *
   * @returns True if token is valid, false otherwise
   */
  verifyToken: async (): Promise<boolean> => {
    const { token } = get()

    if (!token) {
      return false
    }

    try {
      const result = await authApi.verifyToken(token)
      return result.valid
    } catch (error) {
      return false
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null })
  },
}))

/**
 * Initialize auth state from localStorage
 *
 * This runs on module load to restore session if token exists.
 * The actual validation happens in checkAuthStatus() which should
 * be called on app mount.
 */
const initializeAuth = () => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN)

  if (token) {
    // Set token in state, but don't mark as authenticated yet
    // The app will call checkAuthStatus() on mount to verify the token
    useAuthStore.setState({
      token,
      isAuthenticated: false, // Will be set to true after verification
    })
  }
}

// Initialize on load
initializeAuth()
