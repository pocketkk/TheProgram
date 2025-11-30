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
  ApiKeySetRequest,
  ApiKeyStatusResponse,
  ApiKeyValidateResponse,
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

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  /**
   * Get API key configuration status
   *
   * Returns whether an Anthropic API key is configured.
   * Used to show/hide AI features in the UI.
   *
   * @returns ApiKeyStatusResponse with has_api_key flag and message
   */
  getApiKeyStatus: async (): Promise<ApiKeyStatusResponse> => {
    const response = await apiClient.get<ApiKeyStatusResponse>('/auth/api-key/status')
    return response.data
  },

  /**
   * Set or update Anthropic API key
   *
   * Stores the API key for AI interpretation features.
   * The key is validated for format but not tested against Anthropic API.
   * Use validateApiKey() to test the key.
   *
   * @param apiKey - The Anthropic API key (must start with 'sk-ant-')
   * @returns Success message
   * @throws Error if API key format is invalid or operation fails
   */
  setApiKey: async (apiKey: string): Promise<MessageResponse> => {
    const request: ApiKeySetRequest = { api_key: apiKey }
    const response = await apiClient.post<MessageResponse>('/auth/api-key', request)
    return response.data
  },

  /**
   * Clear Anthropic API key
   *
   * Removes the stored API key from the database.
   * AI interpretation features will be disabled after clearing.
   *
   * @returns Success message
   * @throws Error if no API key is set or operation fails
   */
  clearApiKey: async (): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>('/auth/api-key')
    return response.data
  },

  /**
   * Validate Anthropic API key
   *
   * Tests the stored API key by making a minimal request to Anthropic API.
   * Returns validation status and accessible models if valid.
   *
   * @returns ApiKeyValidateResponse with validation status and model list
   * @throws Error if no API key is configured
   */
  validateApiKey: async (): Promise<ApiKeyValidateResponse> => {
    const response = await apiClient.post<ApiKeyValidateResponse>('/auth/api-key/validate')
    return response.data
  },

  // ==========================================================================
  // Google API Key Management
  // ==========================================================================

  /**
   * Get Google API key configuration status
   *
   * Returns whether a Google API key is configured.
   * Used to show/hide Google-based features in the UI.
   *
   * @returns ApiKeyStatusResponse with has_api_key flag and message
   */
  getGoogleApiKeyStatus: async (): Promise<ApiKeyStatusResponse> => {
    const response = await apiClient.get<ApiKeyStatusResponse>('/auth/api-key/google/status')
    return response.data
  },

  /**
   * Set or update Google API key
   *
   * Stores the API key for Google-based features (Gemini, etc).
   * The key is validated for format but not tested against Google API.
   * Use validateGoogleApiKey() to test the key.
   *
   * @param apiKey - The Google API key
   * @returns Success message
   * @throws Error if API key format is invalid or operation fails
   */
  setGoogleApiKey: async (apiKey: string): Promise<MessageResponse> => {
    const request: ApiKeySetRequest = { api_key: apiKey }
    const response = await apiClient.post<MessageResponse>('/auth/api-key/google', request)
    return response.data
  },

  /**
   * Clear Google API key
   *
   * Removes the stored API key from the database.
   * Google-based features will be disabled after clearing.
   *
   * @returns Success message
   * @throws Error if no API key is set or operation fails
   */
  clearGoogleApiKey: async (): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>('/auth/api-key/google')
    return response.data
  },

  /**
   * Validate Google API key
   *
   * Tests the stored API key by making a minimal request to Google API.
   * Returns validation status and accessible models if valid.
   *
   * @returns ApiKeyValidateResponse with validation status and model list
   * @throws Error if no API key is configured
   */
  validateGoogleApiKey: async (): Promise<ApiKeyValidateResponse> => {
    const response = await apiClient.post<ApiKeyValidateResponse>('/auth/api-key/google/validate')
    return response.data
  },
}
