/**
 * GoogleApiKeySettings Component
 *
 * Manages Google API key for AI interpretation features.
 * Allows users to set, update, validate, and clear their API key.
 */
import { useState, useEffect } from 'react'
import { Sparkles, Check, X, Loader2, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { ApiKeyStatusResponse, ApiKeyValidateResponse } from '@/types/auth'

export function GoogleApiKeySettings() {
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<ApiKeyStatusResponse | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ApiKeyValidateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load API key status on mount
  useEffect(() => {
    loadApiKeyStatus()
  }, [])

  const loadApiKeyStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const statusData = await authApi.getGoogleApiKeyStatus()
      setStatus(statusData)
    } catch (err) {
      setError('Failed to load Google API key status')
      console.error('Failed to load Google API key status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Clear all feedback messages
  const clearFeedback = () => {
    setError(null)
    setSuccessMessage(null)
    setValidationResult(null)
  }

  const handleSaveApiKey = async () => {
    clearFeedback()

    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }

    // Basic validation for Google API key format (39 characters, alphanumeric with hyphens/underscores)
    if (apiKey.length < 30) {
      setError('Invalid API key format. Google API keys are typically 39 characters long.')
      return
    }

    setIsSaving(true)

    try {
      const response = await authApi.setGoogleApiKey(apiKey)
      setSuccessMessage(response.message)
      setApiKey('') // Clear input after successful save
      await loadApiKeyStatus() // Refresh status
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save Google API key')
      console.error('Failed to save Google API key:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleValidateApiKey = async () => {
    clearFeedback()
    setIsValidating(true)

    try {
      const result = await authApi.validateGoogleApiKey()
      setValidationResult(result)
      // Don't set error separately - validationResult handles the message
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to validate Google API key')
      console.error('Failed to validate Google API key:', err)
    } finally {
      setIsValidating(false)
    }
  }

  const handleClearApiKey = async () => {
    if (!confirm('Are you sure you want to remove your Google API key? Google-based AI features will be disabled.')) {
      return
    }

    clearFeedback()
    setIsLoading(true)

    try {
      const response = await authApi.clearGoogleApiKey()
      setSuccessMessage(response.message)
      await loadApiKeyStatus() // Refresh status
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to clear Google API key')
      console.error('Failed to clear Google API key:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-cosmic-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      {status && (
        <div className={`p-4 rounded-lg border ${
          status.has_api_key
            ? 'bg-green-950/20 border-green-700/30'
            : 'bg-amber-950/20 border-amber-700/30'
        }`}>
          <div className="flex items-center gap-3">
            {status.has_api_key ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <Sparkles className="h-5 w-5 text-amber-400" />
            )}
            <p className="text-sm font-medium">
              {status.message}
            </p>
          </div>
        </div>
      )}

      {/* Validation Result */}
      {validationResult && (
        <div className={`p-4 rounded-lg border ${
          validationResult.valid
            ? 'bg-green-950/20 border-green-700/30'
            : 'bg-red-950/20 border-red-700/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {validationResult.valid ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <X className="h-5 w-5 text-red-400" />
            )}
            <p className="text-sm font-medium">{validationResult.message}</p>
          </div>
          {validationResult.valid && validationResult.model_access && (
            <div className="ml-8">
              <p className="text-xs text-gray-400 mb-1">Accessible models:</p>
              <ul className="text-xs text-gray-300 space-y-0.5">
                {validationResult.model_access.map((model) => (
                  <li key={model}>• {model}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-700/30">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-950/20 border border-green-700/30">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* API Key Input Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="googleApiKey">Google API Key</Label>
          <div className="relative">
            <Input
              id="googleApiKey"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="pr-10"
              disabled={isSaving}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Get your API key from{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cosmic-400 hover:text-cosmic-300 underline"
            >
              Google Cloud Console
            </a>
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSaveApiKey}
            disabled={isSaving || !apiKey.trim()}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save API Key</>
            )}
          </Button>

          {status?.has_api_key && (
            <>
              <Button
                onClick={handleValidateApiKey}
                disabled={isValidating}
                variant="secondary"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>Validate Key</>
                )}
              </Button>

              <Button
                onClick={handleClearApiKey}
                disabled={isLoading}
                variant="danger"
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* BYOT Benefits Section */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-950/30 to-cosmic-900/30 border border-blue-700/20">
        <h4 className="text-sm font-medium mb-3 text-blue-300">
          Google Gemini Integration
        </h4>
        <p className="text-xs text-gray-300 mb-3">
          The Program can use Google's Gemini AI models with your own API key. This integration provides:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">Free Tier Available</h5>
            <p className="text-xs text-gray-400">Google offers generous free tier for Gemini API access.</p>
          </div>
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">Multiple Models</h5>
            <p className="text-xs text-gray-400">Access to various Gemini models including Gemini Pro and Flash.</p>
          </div>
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">Direct Connection</h5>
            <p className="text-xs text-gray-400">Your key connects directly to Google - no intermediary.</p>
          </div>
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">Privacy Control</h5>
            <p className="text-xs text-gray-400">You control your data and API usage directly with Google.</p>
          </div>
        </div>
        <div className="text-xs text-gray-400 border-t border-cosmic-700/30 pt-3">
          <p className="mb-1"><strong className="text-gray-300">Getting Started:</strong></p>
          <ul className="space-y-0.5 ml-2">
            <li>• Create a project in Google Cloud Console</li>
            <li>• Enable the Gemini API</li>
            <li>• Create an API key in Credentials section</li>
            <li>• Paste the key here to start using Gemini features</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
