/**
 * Authentication API client for single-user application
 *
 * Provides functions to interact with the simple password-based
 * authentication backend endpoints.
 */
import { apiClient } from './client'
import type {
  PasswordSetupRequest,
  LoginRequest,
  LoginResponse,
  TokenVerifyRequest,
  TokenVerifyResponse,
  ChangePasswordRequest,
  DisablePasswordRequest,
  AuthStatus,
  MessageResponse,
} from '@/types/auth'

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Get current authentication status
   *
   * Checks if password is set and if it's required.
   * Use this on app startup to determine if user needs to set up password.
   *
   * @returns AuthStatus with password_set and require_password flags
   */
  getStatus: async (): Promise<AuthStatus> => {
    const response = await apiClient.get<AuthStatus>('/auth/status')
    return response.data
  },

  /**
   * Set up password for the first time
   *
   * This should only be called when no password is set.
   * The backend will reject if password is already configured.
   *
   * @param password - The password to set up
   * @returns Success message
   * @throws Error if password is already set or operation fails
   */
  setupPassword: async (password: string): Promise<MessageResponse> => {
    const request: PasswordSetupRequest = { password }
    const response = await apiClient.post<MessageResponse>('/auth/setup', request)
    return response.data
  },

  /**
   * Login with password
   *
   * Verifies the password and returns a session token if successful.
   *
   * @param password - The password to authenticate with
   * @returns LoginResponse with access token and expiry info
   * @throws Error if password is incorrect or not set
   */
  login: async (password: string): Promise<LoginResponse> => {
    const request: LoginRequest = { password }
    const response = await apiClient.post<LoginResponse>('/auth/login', request)
    return response.data
  },

  /**
   * Verify if a session token is valid
   *
   * Checks token signature, expiry, and type.
   * Use this to verify if user is still authenticated.
   *
   * @param token - The session token to verify
   * @returns TokenVerifyResponse with valid flag and optional message
   */
  verifyToken: async (token: string): Promise<TokenVerifyResponse> => {
    const request: TokenVerifyRequest = { token }
    const response = await apiClient.post<TokenVerifyResponse>('/auth/verify', request)
    return response.data
  },

  /**
   * Change password
   *
   * Verifies old password, then updates to new password.
   * User must be authenticated to call this endpoint.
   *
   * @param oldPassword - Current password for verification
   * @param newPassword - New password to set
   * @returns Success message
   * @throws Error if old password is incorrect
   */
  changePassword: async (
    oldPassword: string,
    newPassword: string
  ): Promise<MessageResponse> => {
    const request: ChangePasswordRequest = {
      old_password: oldPassword,
      new_password: newPassword,
    }
    const response = await apiClient.post<MessageResponse>('/auth/change-password', request)
    return response.data
  },

  /**
   * Disable password requirement
   *
   * Removes password requirement for trusted devices.
   * Verifies current password before disabling.
   *
   * @param currentPassword - Current password for verification
   * @param confirm - Confirmation flag (must be true)
   * @returns Success message
   * @throws Error if current password is incorrect or confirmation is false
   */
  disablePassword: async (
    currentPassword: string,
    confirm: boolean
  ): Promise<MessageResponse> => {
    const request: DisablePasswordRequest = {
      current_password: currentPassword,
      confirm,
    }
    const response = await apiClient.post<MessageResponse>('/auth/disable-password', request)
    return response.data
  },

  /**
   * Logout (client-side only)
   *
   * Since we use stateless JWT tokens, logout is handled client-side
   * by removing the token from storage. This endpoint exists for
   * consistency and future stateful session management if needed.
   *
   * @returns Success message
   */
  logout: async (): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/auth/logout')
    return response.data
  },
}
