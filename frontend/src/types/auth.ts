/**
 * Authentication types for single-user application
 *
 * This system uses simple password-based authentication with no user accounts.
 * A single password is stored in the backend's app_config table.
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request to set up password for first time use
 */
export interface PasswordSetupRequest {
  password: string
}

/**
 * Request to login with password
 */
export interface LoginRequest {
  password: string
}

/**
 * Request to verify a session token
 */
export interface TokenVerifyRequest {
  token: string
}

/**
 * Request to change the password
 */
export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

/**
 * Request to disable password requirement
 */
export interface DisablePasswordRequest {
  current_password: string
  confirm: boolean
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response after successful login
 */
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Response for token verification
 */
export interface TokenVerifyResponse {
  valid: boolean
  message?: string
}

/**
 * Current authentication status
 */
export interface AuthStatus {
  password_set: boolean
  require_password: boolean
  message?: string
}

/**
 * Generic message response
 */
export interface MessageResponse {
  message: string
  success: boolean
}

// ============================================================================
// Store State Types
// ============================================================================

/**
 * Authentication state for the application
 *
 * Since this is a single-user app, we don't track user info,
 * just whether the user is authenticated via session token.
 */
export interface AuthState {
  // Authentication status
  isAuthenticated: boolean
  token: string | null

  // Loading and error states
  isLoading: boolean
  error: string | null

  // Password setup status (used to show setup screen on first launch)
  needsPasswordSetup: boolean

  // Actions
  checkAuthStatus: () => Promise<void>
  setupPassword: (password: string) => Promise<void>
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  verifyToken: () => Promise<boolean>
  clearError: () => void
}

/**
 * Password management state (for settings page)
 */
export interface PasswordSettingsState {
  isLoading: boolean
  error: string | null
  successMessage: string | null

  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  disablePassword: (currentPassword: string) => Promise<void>
  clearMessages: () => void
}
