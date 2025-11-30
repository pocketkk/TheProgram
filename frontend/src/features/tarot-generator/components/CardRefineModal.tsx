/**
 * CardRefineModal Component - Modal for refining individual tarot cards
 *
 * Features:
 * - View and edit the generation prompt
 * - View image metadata (dimensions, created date)
 * - Refine with modifications or completely new prompt
 */
import { useState, useEffect } from 'react'
import { X, RefreshCw, Loader2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { refineImage } from '@/lib/api/images'
import type { ImageInfo } from '@/types/image'
import type { TarotCard } from '../constants/tarotCards'

interface CardRefineModalProps {
  isOpen: boolean
  onClose: () => void
  card: TarotCard
  image: ImageInfo
  onRefineComplete: (newImage: ImageInfo) => void
}

export function CardRefineModal({
  isOpen,
  onClose,
  card,
  image,
  onRefineComplete,
}: CardRefineModalProps) {
  const [refinement, setRefinement] = useState('')
  const [editedPrompt, setEditedPrompt] = useState(image.prompt || '')
  const [useEditedPrompt, setUseEditedPrompt] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showMetadata, setShowMetadata] = useState(true)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  // Reset edited prompt when image changes
  useEffect(() => {
    setEditedPrompt(image.prompt || '')
    setUseEditedPrompt(false)
  }, [image.prompt])

  if (!isOpen) return null

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(editedPrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleRefine = async () => {
    // If using edited prompt, refinement instructions combine with the new prompt
    const effectiveRefinement = useEditedPrompt
      ? `Generate with this exact prompt: ${editedPrompt}${refinement.trim() ? `. Additional changes: ${refinement}` : ''}`
      : refinement.trim()

    if (!effectiveRefinement) {
      setError('Please describe what you want to change or edit the prompt')
      return
    }

    setIsRefining(true)
    setError(null)

    try {
      const response = await refineImage(image.id, effectiveRefinement)

      if (response.success && response.image_url) {
        setPreviewImage(response.image_url)
        // Don't call onRefineComplete immediately - let user see the preview first
        // The deck will refresh when modal closes via handleClose
      } else {
        setError(response.error || 'Failed to refine image')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine image')
    } finally {
      setIsRefining(false)
    }
  }

  const handleClose = () => {
    // If we have a preview, a refinement was successful - trigger refresh
    if (previewImage) {
      onRefineComplete({} as ImageInfo) // Trigger parent refresh
    }
    setRefinement('')
    setError(null)
    setPreviewImage(null)
    setUseEditedPrompt(false)
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isPromptModified = editedPrompt !== image.prompt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-heading font-bold text-gradient-celestial">
            Refine: {card.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
            disabled={isRefining}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Current Image */}
            <div className="flex-shrink-0">
              <div className="text-sm text-gray-400 mb-2">Current Image</div>
              <div className="w-48 h-72 rounded-lg overflow-hidden border border-gray-700">
                <img
                  src={image.url}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right side - Metadata & Refinement */}
            <div className="flex-1 space-y-4">
              {/* Metadata Section */}
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="w-full px-4 py-3 bg-gray-800/50 flex items-center justify-between hover:bg-gray-800 transition"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    {showMetadata ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    Image Metadata
                  </span>
                  {isPromptModified && (
                    <span className="text-xs text-celestial-purple">Prompt modified</span>
                  )}
                </button>

                {showMetadata && (
                  <div className="p-4 space-y-4 bg-gray-900/50">
                    {/* Editable Prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                          Generation Prompt
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyPrompt}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                            title="Copy prompt"
                          >
                            {copiedPrompt ? (
                              <><Check className="w-3 h-3" /> Copied</>
                            ) : (
                              <><Copy className="w-3 h-3" /> Copy</>
                            )}
                          </button>
                          {isPromptModified && (
                            <button
                              onClick={() => setEditedPrompt(image.prompt || '')}
                              className="text-xs text-gray-400 hover:text-white"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => {
                          setEditedPrompt(e.target.value)
                          setUseEditedPrompt(true)
                        }}
                        rows={4}
                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none resize-none font-mono"
                        disabled={isRefining}
                      />
                      {isPromptModified && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="useEditedPromptCard"
                            checked={useEditedPrompt}
                            onChange={(e) => setUseEditedPrompt(e.target.checked)}
                            className="rounded bg-gray-800 border-gray-700"
                          />
                          <label htmlFor="useEditedPromptCard" className="text-xs text-gray-400">
                            Use edited prompt for regeneration
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Other Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Dimensions:</span>
                        <span className="ml-2 text-gray-300">{image.width} × {image.height}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">File Size:</span>
                        <span className="ml-2 text-gray-300">{formatFileSize(image.file_size)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2 text-gray-300">{formatDate(image.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Item Key:</span>
                        <span className="ml-2 text-gray-300 font-mono">{image.item_key}</span>
                      </div>
                    </div>

                    {/* Additional metadata if present */}
                    {image.metadata && Object.keys(image.metadata).length > 0 && (
                      <div className="pt-3 border-t border-gray-700">
                        <div className="text-sm text-gray-500 mb-2">Additional Metadata:</div>
                        <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(image.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Refinement Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {useEditedPrompt ? 'Additional Changes (optional)' : 'What would you like to change?'}
                </label>
                <textarea
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  placeholder={useEditedPrompt
                    ? "Optional: Add any additional modifications..."
                    : "e.g., Make the border more ornate, change the background to deep purple, add more stars, make the figure more mystical..."
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none resize-none"
                  disabled={isRefining}
                />
              </div>

              <div className="text-sm text-gray-400">
                <p className="mb-2">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'More ornate border',
                    'Deeper colors',
                    'More mystical atmosphere',
                    'Cleaner lines',
                    'More detail in background',
                    'Stronger contrast',
                    'Add stars',
                    'Richer textures',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setRefinement((prev) =>
                        prev ? `${prev}, ${suggestion.toLowerCase()}` : suggestion
                      )}
                      className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded hover:border-celestial-purple transition"
                      disabled={isRefining}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Preview of refined image */}
              {previewImage && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Refined Image</div>
                  <div className="w-48 h-72 rounded-lg overflow-hidden border border-celestial-purple">
                    <img
                      src={previewImage}
                      alt={`Refined ${card.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isRefining}
              className="flex-1"
            >
              {previewImage ? 'Done' : 'Cancel'}
            </Button>
            <Button
              onClick={handleRefine}
              disabled={isRefining || (!refinement.trim() && !useEditedPrompt)}
              className="flex-1"
            >
              {isRefining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {previewImage ? 'Refine Again' : useEditedPrompt ? 'Regenerate' : 'Refine Card'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
