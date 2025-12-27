/**
 * NewspaperStyleSettings Component
 *
 * Manages newspaper style preference for Timeline feature.
 * Allows users to choose between Victorian and Modern journalism styles.
 */
import { useState, useEffect } from 'react'
import { Newspaper, Check, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { useTimelineViewStore } from '@/features/chronicle/stores/timelineViewStore'

export function NewspaperStyleSettings() {
  const [currentStyle, setCurrentStyle] = useState<'victorian' | 'modern'>('modern')
  const [selectedStyle, setSelectedStyle] = useState<'victorian' | 'modern'>('modern')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { setNewspaperStyle } = useTimelineViewStore()

  // Load current setting on mount
  useEffect(() => {
    loadNewspaperStyle()
  }, [])

  const loadNewspaperStyle = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.getNewspaperStyle()
      const style = response.style as 'victorian' | 'modern'
      setCurrentStyle(style)
      setSelectedStyle(style)
    } catch (err) {
      setError('Failed to load newspaper style preference')
      console.error('Failed to load newspaper style:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccessMessage(null)
    setIsSaving(true)

    try {
      const response = await authApi.setNewspaperStyle(selectedStyle)
      setSuccessMessage(response.message)
      setCurrentStyle(selectedStyle)

      // Update timeline view store
      setNewspaperStyle(selectedStyle)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save newspaper style preference')
      console.error('Failed to save newspaper style:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-cosmic-400" />
      </div>
    )
  }

  const hasChanges = selectedStyle !== currentStyle

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-700/30">
          <div className="flex items-center gap-3">
            <Newspaper className="h-5 w-5 text-red-400" />
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

      {/* Style Selection */}
      <div className="space-y-4">
        <Label>Newspaper Style</Label>
        <p className="text-xs text-gray-400 mb-4">
          Choose how Timeline AI newspapers are generated. This affects the tone, language, and structure of articles.
        </p>

        <div className="grid gap-4">
          {/* Victorian Style */}
          <button
            type="button"
            onClick={() => setSelectedStyle('victorian')}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${selectedStyle === 'victorian'
                ? 'border-cosmic-400 bg-cosmic-950/40'
                : 'border-cosmic-700/30 bg-cosmic-900/20 hover:border-cosmic-600'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`
                flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5
                ${selectedStyle === 'victorian'
                  ? 'border-cosmic-400 bg-cosmic-400'
                  : 'border-gray-500'
                }
              `}>
                {selectedStyle === 'victorian' && (
                  <Check className="h-4 w-4 text-cosmic-950" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Victorian (Classic)</h4>
                <p className="text-sm text-gray-400">
                  Formal, ornate language with dramatic headlines. Long flowing sentences,
                  rich descriptions, and moral overtones reminiscent of 19th century journalism.
                </p>
                <p className="text-xs text-cosmic-400 mt-2 italic">
                  Example: "MANKIND TRIUMPHANT! Man Sets Foot Upon the Moon!"
                </p>
              </div>
            </div>
          </button>

          {/* Modern Style */}
          <button
            type="button"
            onClick={() => setSelectedStyle('modern')}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${selectedStyle === 'modern'
                ? 'border-cosmic-400 bg-cosmic-950/40'
                : 'border-cosmic-700/30 bg-cosmic-900/20 hover:border-cosmic-600'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`
                flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5
                ${selectedStyle === 'modern'
                  ? 'border-cosmic-400 bg-cosmic-400'
                  : 'border-gray-500'
                }
              `}>
                {selectedStyle === 'modern' && (
                  <Check className="h-4 w-4 text-cosmic-950" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Modern</h4>
                <p className="text-sm text-gray-400">
                  Clear, engaging contemporary journalism with AP style. Active voice,
                  strong verbs, inverted pyramid structure, and concise paragraphs.
                </p>
                <p className="text-xs text-cosmic-400 mt-2 italic">
                  Example: "Armstrong Takes First Steps on Moon"
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save Preference</>
            )}
          </Button>

          {hasChanges && (
            <Button
              onClick={() => setSelectedStyle(currentStyle)}
              variant="secondary"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
