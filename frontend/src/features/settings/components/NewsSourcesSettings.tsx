/**
 * NewsSourcesSettings Component
 *
 * Manages news source API keys for the Timeline newspaper feature.
 * Supports Guardian (1999+), NYT (1851+), with Wikipedia as fallback.
 */
import { useState, useEffect } from 'react'
import { Newspaper, Check, X, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  getNewsSourcesStatus,
  setGuardianApiKey,
  setNytApiKey,
  setNewsSourcesPriority,
  type NewsSourcesStatus
} from '@/lib/api/timelineHistorical'

interface SourceConfig {
  name: string
  description: string
  coverage: string
  signupUrl: string
  placeholder: string
  setApiKey: (key: string) => Promise<{ message: string }>
  configuredKey: keyof NewsSourcesStatus
}

const NEWS_SOURCES: Record<string, SourceConfig> = {
  guardian: {
    name: 'The Guardian',
    description: 'Access to The Guardian\'s news archives',
    coverage: '1999 - present',
    signupUrl: 'https://open-platform.theguardian.com/access/',
    placeholder: 'Your Guardian API key...',
    setApiKey: setGuardianApiKey,
    configuredKey: 'guardian_configured'
  },
  nyt: {
    name: 'New York Times',
    description: 'Access to NYT Archive API',
    coverage: '1851 - present',
    signupUrl: 'https://developer.nytimes.com/get-started',
    placeholder: 'Your NYT API key...',
    setApiKey: setNytApiKey,
    configuredKey: 'nyt_configured'
  }
}

export function NewsSourcesSettings() {
  const [status, setStatus] = useState<NewsSourcesStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Individual source states
  const [guardianKey, setGuardianKey] = useState('')
  const [nytKey, setNytKey] = useState('')
  const [showGuardianKey, setShowGuardianKey] = useState(false)
  const [showNytKey, setShowNytKey] = useState(false)
  const [savingSource, setSavingSource] = useState<string | null>(null)

  // Load status on mount
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getNewsSourcesStatus()
      setStatus(data)
    } catch (err) {
      setError('Failed to load news sources status')
      console.error('Failed to load news sources status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearFeedback = () => {
    setError(null)
    setSuccessMessage(null)
  }

  const handleSaveGuardianKey = async () => {
    clearFeedback()
    if (!guardianKey.trim()) {
      setError('Please enter a Guardian API key')
      return
    }

    setSavingSource('guardian')
    try {
      const response = await setGuardianApiKey(guardianKey)
      setSuccessMessage(response.message)
      setGuardianKey('')
      await loadStatus()
    } catch (err: any) {
      setError(err?.message || 'Failed to save Guardian API key')
    } finally {
      setSavingSource(null)
    }
  }

  const handleSaveNytKey = async () => {
    clearFeedback()
    if (!nytKey.trim()) {
      setError('Please enter a NYT API key')
      return
    }

    setSavingSource('nyt')
    try {
      const response = await setNytApiKey(nytKey)
      setSuccessMessage(response.message)
      setNytKey('')
      await loadStatus()
    } catch (err: any) {
      setError(err?.message || 'Failed to save NYT API key')
    } finally {
      setSavingSource(null)
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
      {/* Current Status Overview */}
      {status && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-lg border ${
            status.guardian_configured
              ? 'bg-green-950/20 border-green-700/30'
              : 'bg-gray-900/30 border-gray-700/30'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {status.guardian_configured ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <X className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium">Guardian</span>
            </div>
            <p className="text-xs text-gray-400">1999+</p>
          </div>
          <div className={`p-3 rounded-lg border ${
            status.nyt_configured
              ? 'bg-green-950/20 border-green-700/30'
              : 'bg-gray-900/30 border-gray-700/30'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {status.nyt_configured ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <X className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium">NYT</span>
            </div>
            <p className="text-xs text-gray-400">1851+</p>
          </div>
          <div className="p-3 rounded-lg border bg-green-950/20 border-green-700/30">
            <div className="flex items-center gap-2 mb-1">
              <Check className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">Wikipedia</span>
            </div>
            <p className="text-xs text-gray-400">Always on</p>
          </div>
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

      {/* Guardian API Key */}
      <div className="p-4 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-cosmic-400" />
            <h4 className="text-sm font-medium">The Guardian</h4>
          </div>
          <a
            href="https://open-platform.theguardian.com/access/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cosmic-400 hover:text-cosmic-300 flex items-center gap-1"
          >
            Get API Key <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Free tier available. Covers news from 1999 to present.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showGuardianKey ? 'text' : 'password'}
              value={guardianKey}
              onChange={(e) => setGuardianKey(e.target.value)}
              placeholder="Your Guardian API key..."
              className="pr-10"
              disabled={savingSource === 'guardian'}
            />
            <button
              type="button"
              onClick={() => setShowGuardianKey(!showGuardianKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showGuardianKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={handleSaveGuardianKey}
            disabled={savingSource === 'guardian' || !guardianKey.trim()}
            size="sm"
          >
            {savingSource === 'guardian' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      {/* NYT API Key */}
      <div className="p-4 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-cosmic-400" />
            <h4 className="text-sm font-medium">New York Times</h4>
          </div>
          <a
            href="https://developer.nytimes.com/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cosmic-400 hover:text-cosmic-300 flex items-center gap-1"
          >
            Get API Key <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Free tier available. Archive API covers news from 1851 to present.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showNytKey ? 'text' : 'password'}
              value={nytKey}
              onChange={(e) => setNytKey(e.target.value)}
              placeholder="Your NYT API key..."
              className="pr-10"
              disabled={savingSource === 'nyt'}
            />
            <button
              type="button"
              onClick={() => setShowNytKey(!showNytKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showNytKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={handleSaveNytKey}
            disabled={savingSource === 'nyt' || !nytKey.trim()}
            size="sm"
          >
            {savingSource === 'nyt' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-950/30 to-cosmic-900/30 border border-blue-700/20">
        <h4 className="text-sm font-medium mb-3 text-blue-300">
          Year-Specific News
        </h4>
        <p className="text-xs text-gray-300 mb-3">
          With news API keys configured, the Timeline newspaper feature can show actual
          news from the specific date you're viewing, not just "On This Day" highlights.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">Guardian + NYT</h5>
            <p className="text-xs text-gray-400">Best coverage for 1999+ dates with both sources.</p>
          </div>
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">NYT Only</h5>
            <p className="text-xs text-gray-400">Access 170+ years of history back to 1851.</p>
          </div>
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">Wikipedia Fallback</h5>
            <p className="text-xs text-gray-400">Always available for historical context on any date.</p>
          </div>
          <div className="bg-cosmic-900/40 p-3 rounded-lg">
            <h5 className="text-xs font-medium text-white mb-1">AI Synthesis</h5>
            <p className="text-xs text-gray-400">Gemini combines sources into a cohesive newspaper.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
