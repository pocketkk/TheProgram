/**
 * CreatePlanetSetModal Component - Modal for creating a new planet set
 */
import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import type { CollectionCreate } from '@/types/image'
import { TOTAL_PLANETS } from '../constants/planets'

interface CreatePlanetSetModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CollectionCreate) => void
  isCreating?: boolean
}

// Preset art styles for planet imagery
const ART_STYLES = [
  { name: 'Classical Astronomy', prompt: 'classical astronomical illustration, detailed scientific art, vintage celestial charts, hand-drawn planetary details' },
  { name: 'Modern Digital', prompt: 'modern digital art, high detail 3D render style, photorealistic textures, cinematic lighting' },
  { name: 'Cosmic Nebula', prompt: 'cosmic nebula background, ethereal space atmosphere, glowing energy, mystical celestial imagery' },
  { name: 'Mythological', prompt: 'mythological deity representation, ancient Roman/Greek god imagery, symbolic attributes, classical art style' },
  { name: 'Minimalist Glyphs', prompt: 'minimalist design, clean geometric shapes, astrological glyphs, modern symbolic art' },
  { name: 'Art Nouveau', prompt: 'art nouveau style, flowing organic lines, decorative borders, elegant celestial motifs' },
  { name: 'Watercolor Galaxy', prompt: 'watercolor painting style, soft flowing colors, galaxy backgrounds, dreamy space atmosphere' },
  { name: 'Neon Synthwave', prompt: 'synthwave neon aesthetic, retrowave colors, glowing outlines, 80s sci-fi inspired' },
]

// Preset border styles
const BORDER_STYLES = [
  { name: 'No Border', prompt: 'no border or frame, edge-to-edge illustration' },
  { name: 'Simple Circle', prompt: 'simple circular border, clean celestial frame' },
  { name: 'Zodiac Ring', prompt: 'zodiac symbols ring border, astrological wheel frame' },
  { name: 'Cosmic Glow', prompt: 'glowing cosmic energy border, ethereal light frame' },
  { name: 'Classic Gold', prompt: 'ornate golden frame with celestial decorations' },
  { name: 'Starfield Edge', prompt: 'border of stars and cosmic dust' },
]

export function CreatePlanetSetModal({
  isOpen,
  onClose,
  onSubmit,
  isCreating,
}: CreatePlanetSetModalProps) {
  const [setName, setSetName] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [customStyle, setCustomStyle] = useState('')
  const [selectedBorderStyle, setSelectedBorderStyle] = useState<string>('No Border')
  const [customBorderStyle, setCustomBorderStyle] = useState('')
  const [includeLabels, setIncludeLabels] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!setName.trim()) {
      alert('Please enter a set name')
      return
    }

    const stylePrompt = selectedStyle
      ? ART_STYLES.find(s => s.name === selectedStyle)?.prompt
      : customStyle.trim()

    const borderPrompt = customBorderStyle.trim()
      ? customBorderStyle.trim()
      : BORDER_STYLES.find(s => s.name === selectedBorderStyle)?.prompt || ''

    onSubmit({
      name: setName.trim(),
      collection_type: 'planet_set',
      style_prompt: stylePrompt || undefined,
      border_style: borderPrompt || undefined,
      total_expected: TOTAL_PLANETS,
      include_card_labels: includeLabels,
    })

    // Reset form
    setSetName('')
    setSelectedStyle(null)
    setCustomStyle('')
    setSelectedBorderStyle('No Border')
    setCustomBorderStyle('')
    setIncludeLabels(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-heading font-bold text-gradient-celestial">
            Create New Planet Set
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
          {/* Set Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Set Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="My Celestial Planets"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none"
              disabled={isCreating}
              required
            />
          </div>

          {/* Info about set size */}
          <div className="p-3 bg-celestial-purple/10 border border-celestial-purple/30 rounded-lg">
            <p className="text-sm text-celestial-purple">
              This set will generate {TOTAL_PLANETS} celestial bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, North Node, South Node, Black Moon Lilith, and Part of Fortune.
            </p>
          </div>

          {/* Labels Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Labels</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIncludeLabels(false)}
                className={`flex-1 p-3 rounded-lg border-2 transition ${
                  !includeLabels
                    ? 'border-celestial-purple bg-celestial-purple/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                disabled={isCreating}
              >
                <div className="font-semibold">No Labels</div>
                <div className="text-sm text-gray-400">Clean imagery only</div>
              </button>
              <button
                type="button"
                onClick={() => setIncludeLabels(true)}
                className={`flex-1 p-3 rounded-lg border-2 transition ${
                  includeLabels
                    ? 'border-celestial-purple bg-celestial-purple/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                disabled={isCreating}
              >
                <div className="font-semibold">Include Labels</div>
                <div className="text-sm text-gray-400">Planet name overlay</div>
              </button>
            </div>
          </div>

          {/* Border Style */}
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
                placeholder="e.g., celestial compass rose border, constellation map frame..."
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
              disabled={isCreating || !setName.trim()}
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
                  Create Set
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
