/**
 * ApiKeySettings Component
 *
 * Manages Anthropic API key for AI interpretation features.
 * Allows users to set, update, validate, and clear their API key.
 */
import { useState, useEffect } from 'react'
import { Sparkles, Check, X, Loader2, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { ApiKeyStatusResponse, ApiKeyValidateResponse } from '@/types/auth'

export function ApiKeySettings() {
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
      const statusData = await authApi.getApiKeyStatus()
      setStatus(statusData)
    } catch (err) {
      setError('Failed to load API key status')
      console.error('Failed to load API key status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key')
      return
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Must start with "sk-ant-"')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)
    setValidationResult(null)

    try {
      const response = await authApi.setApiKey(apiKey)
      setSuccessMessage(response.message)
      setApiKey('') // Clear input after successful save
      await loadApiKeyStatus() // Refresh status
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save API key')
      console.error('Failed to save API key:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleValidateApiKey = async () => {
    setIsValidating(true)
    setError(null)
    setValidationResult(null)

    try {
      const result = await authApi.validateApiKey()
      setValidationResult(result)
      if (!result.valid) {
        setError(result.message)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to validate API key')
      console.error('Failed to validate API key:', err)
    } finally {
      setIsValidating(false)
    }
  }

  const handleClearApiKey = async () => {
    if (!confirm('Are you sure you want to remove your API key? AI interpretations will be disabled.')) {
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    setValidationResult(null)

    try {
      const response = await authApi.clearApiKey()
      setSuccessMessage(response.message)
      await loadApiKeyStatus() // Refresh status
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to clear API key')
      console.error('Failed to clear API key:', err)
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
          <Label htmlFor="apiKey">Anthropic API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
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
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cosmic-400 hover:text-cosmic-300 underline"
            >
              console.anthropic.com
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

      {/* Info Section */}
      <div className="p-4 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30">
        <h4 className="text-sm font-medium mb-2">About AI Interpretations</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• AI interpretations use Claude Haiku 4.5 for fast, cost-effective results</li>
          <li>• Estimated cost: $0.10-0.12 per full chart interpretation</li>
          <li>• Your API key is stored securely and never shared</li>
          <li>• Free tier includes $5 credit (40-50 full charts)</li>
        </ul>
      </div>
    </div>
  )
}
