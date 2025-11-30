/**
 * CreateDeckModal Component - Modal for creating a new tarot deck
 */
import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'
import type { CollectionCreate } from '@/types/image'

interface CreateDeckModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CollectionCreate) => void
  isCreating?: boolean
}

// Preset art styles for tarot decks (card imagery only, not borders)
const ART_STYLES = [
  { name: 'Classic Rider-Waite', prompt: 'traditional tarot art style, symbolic imagery, vintage color palette, detailed linework' },
  { name: 'Modern Minimalist', prompt: 'modern minimalist tarot art, clean lines, geometric shapes, limited color palette, contemporary design' },
  { name: 'Ethereal Watercolor', prompt: 'ethereal watercolor painting style, soft flowing colors, dreamy atmosphere, translucent layers' },
  { name: 'Dark Gothic', prompt: 'dark gothic art style, dramatic shadows, mysterious atmosphere, ornate details, deep colors' },
  { name: 'Cosmic Space', prompt: 'cosmic space theme, stars and galaxies, nebula colors, celestial imagery, mystical energy' },
  { name: 'Art Nouveau', prompt: 'art nouveau style, flowing organic lines, elegant curves, nature motifs' },
  { name: 'Digital Neon', prompt: 'cyberpunk neon style, glowing colors, futuristic elements, digital aesthetic, vibrant contrasts' },
  { name: 'Botanical Nature', prompt: 'botanical illustration style, detailed plants and flowers, natural colors, organic patterns' },
]

// Preset border/frame styles for tarot cards
const BORDER_STYLES = [
  { name: 'No Border', prompt: 'no border or frame, edge-to-edge illustration' },
  { name: 'Simple Black', prompt: 'plain solid black border, no ornamentation, clean edges' },
  { name: 'Simple White', prompt: 'plain solid white border, no ornamentation, clean edges' },
  { name: 'Thin Line', prompt: 'thin single-line border only, minimal, no decorative elements' },
  { name: 'Classic Gold', prompt: 'ornate golden frame with decorative filigree' },
  { name: 'Elegant Silver', prompt: 'silver metallic frame with scrollwork' },
  { name: 'Dark Wood', prompt: 'carved dark wood frame' },
  { name: 'Art Nouveau', prompt: 'art nouveau flowing organic border' },
  { name: 'Celtic Knots', prompt: 'Celtic knotwork border' },
  { name: 'Cosmic Stars', prompt: 'border of stars and cosmic dust' },
]

export function CreateDeckModal({
  isOpen,
  onClose,
  onSubmit,
  isCreating,
}: CreateDeckModalProps) {
  const [deckName, setDeckName] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [customStyle, setCustomStyle] = useState('')
  const [selectedBorderStyle, setSelectedBorderStyle] = useState<string>('No Border')
  const [customBorderStyle, setCustomBorderStyle] = useState('')
  const [useFullDeck, setUseFullDeck] = useState(true)
  const [includeCardLabels, setIncludeCardLabels] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!deckName.trim()) {
      alert('Please enter a deck name')
      return
    }

    const stylePrompt = selectedStyle
      ? ART_STYLES.find(s => s.name === selectedStyle)?.prompt
      : customStyle.trim()

    // Get border style - use custom if provided, else use preset
    const borderPrompt = customBorderStyle.trim()
      ? customBorderStyle.trim()
      : BORDER_STYLES.find(s => s.name === selectedBorderStyle)?.prompt || ''

    onSubmit({
      name: deckName.trim(),
      collection_type: 'tarot_deck',
      style_prompt: stylePrompt || undefined,
      border_style: borderPrompt || undefined,
      total_expected: useFullDeck ? 78 : 22, // Full deck or Major Arcana only
      include_card_labels: includeCardLabels,
    })

    // Reset form
    setDeckName('')
    setSelectedStyle(null)
    setCustomStyle('')
    setSelectedBorderStyle('No Border')
    setCustomBorderStyle('')
    setUseFullDeck(true)
    setIncludeCardLabels(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-heading font-bold text-gradient-celestial">
            Create New Tarot Deck
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            disabled={isCreating}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Deck Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Deck Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="My Mystical Tarot Deck"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none"
              disabled={isCreating}
              required
            />
          </div>

          {/* Deck Size */}
          <div>
            <label className="block text-sm font-medium mb-2">Deck Size</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUseFullDeck(true)}
                className={`flex-1 p-3 rounded-lg border-2 transition ${
                  useFullDeck
                    ? 'border-celestial-purple bg-celestial-purple/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                disabled={isCreating}
              >
                <div className="font-semibold">Full Deck</div>
                <div className="text-sm text-gray-400">78 cards (Major + Minor Arcana)</div>
              </button>
              <button
                type="button"
                onClick={() => setUseFullDeck(false)}
                className={`flex-1 p-3 rounded-lg border-2 transition ${
                  !useFullDeck
                    ? 'border-celestial-purple bg-celestial-purple/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                disabled={isCreating}
              >
                <div className="font-semibold">Major Arcana Only</div>
                <div className="text-sm text-gray-400">22 cards</div>
              </button>
            </div>
          </div>

          {/* Card Labels Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Card Labels</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIncludeCardLabels(false)}
                className={`flex-1 p-3 rounded-lg border-2 transition ${
                  !includeCardLabels
                    ? 'border-celestial-purple bg-celestial-purple/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                disabled={isCreating}
              >
                <div className="font-semibold">No Labels</div>
                <div className="text-sm text-gray-400">Clean card art only</div>
              </button>
              <button
                type="button"
                onClick={() => setIncludeCardLabels(true)}
                className={`flex-1 p-3 rounded-lg border-2 transition ${
                  includeCardLabels
                    ? 'border-celestial-purple bg-celestial-purple/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                disabled={isCreating}
              >
                <div className="font-semibold">Include Labels</div>
                <div className="text-sm text-gray-400">Card name & number</div>
              </button>
            </div>
          </div>

          {/* Border/Frame Style */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Border/Frame Style
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {BORDER_STYLES.map((style) => (
                <button
                  key={style.name}
                  type="button"
                  onClick={() => {
                    setSelectedBorderStyle(style.name)
                    setCustomBorderStyle('')
                  }}
                  className={`p-2 text-left rounded-lg border transition ${
                    selectedBorderStyle === style.name && !customBorderStyle.trim()
                      ? 'border-celestial-purple bg-celestial-purple/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  disabled={isCreating}
                >
                  <div className="font-medium text-sm">{style.name}</div>
                </button>
              ))}
            </div>

            {/* Custom Border Style */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Or describe custom border/frame:
              </label>
              <textarea
                value={customBorderStyle}
                onChange={(e) => setCustomBorderStyle(e.target.value)}
                placeholder="e.g., minimalist black border with white text, ornate silver filigree frame..."
                rows={2}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none text-sm"
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Art Style Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Art Style (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {ART_STYLES.map((style) => (
                <button
                  key={style.name}
                  type="button"
                  onClick={() => {
                    setSelectedStyle(style.name)
                    setCustomStyle('')
                  }}
                  className={`p-3 text-left rounded-lg border transition ${
                    selectedStyle === style.name
                      ? 'border-celestial-purple bg-celestial-purple/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  disabled={isCreating}
                >
                  <div className="font-medium text-sm">{style.name}</div>
                </button>
              ))}
            </div>

            {/* Custom Style */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Or enter custom style description:
              </label>
              <textarea
                value={customStyle}
                onChange={(e) => {
                  setCustomStyle(e.target.value)
                  if (e.target.value.trim()) {
                    setSelectedStyle(null)
                  }
                }}
                placeholder="Describe your desired art style..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none text-sm"
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Style Preview */}
          {(selectedStyle || customStyle.trim() || selectedBorderStyle || customBorderStyle.trim()) && (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
              {(selectedBorderStyle || customBorderStyle.trim()) && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Border style:</div>
                  <div className="text-sm text-celestial-pink">
                    {customBorderStyle.trim()
                      ? customBorderStyle
                      : BORDER_STYLES.find(s => s.name === selectedBorderStyle)?.prompt || 'No border'}
                  </div>
                </div>
              )}
              {(selectedStyle || customStyle.trim()) && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Art style:</div>
                  <div className="text-sm text-celestial-purple">
                    {selectedStyle
                      ? ART_STYLES.find(s => s.name === selectedStyle)?.prompt
                      : customStyle}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !deckName.trim()}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Deck
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
