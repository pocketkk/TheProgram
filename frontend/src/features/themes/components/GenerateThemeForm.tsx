/**
 * GenerateThemeForm - Form to generate new background themes
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { useGenerateBackground } from '../hooks/useThemes'

const ELEMENTS = [
  { value: 'fire', label: 'Fire', emoji: '🔥' },
  { value: 'earth', label: 'Earth', emoji: '🌍' },
  { value: 'air', label: 'Air', emoji: '💨' },
  { value: 'water', label: 'Water', emoji: '💧' },
]

export function GenerateThemeForm() {
  const [prompt, setPrompt] = useState('')
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [style, setStyle] = useState('')
  const generateBackground = useGenerateBackground()

  const handleElementToggle = (element: string) => {
    setSelectedElements((prev) =>
      prev.includes(element)
        ? prev.filter((e) => e !== element)
        : [...prev, element]
    )
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    const astroContext =
      selectedElements.length > 0
        ? { elements: selectedElements }
        : undefined

    await generateBackground.mutateAsync({
      prompt: prompt.trim(),
      style: style.trim() || undefined,
      astro_context: astroContext,
    })

    // Clear form on success
    if (!generateBackground.isError) {
      setPrompt('')
      setStyle('')
      setSelectedElements([])
    }
  }

  const isLoading = generateBackground.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          Generate New Theme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt Input */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Theme Description
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your ideal workspace background... (e.g., 'Cosmic nebula with stars and planets')"
            className="w-full p-3 bg-cosmic-900/50 border border-cosmic-400/20 rounded-lg
                     text-white placeholder-gray-500 resize-none
                     focus:outline-none focus:border-purple-500/50"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Style Input (optional) */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Style (optional)
          </label>
          <input
            type="text"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="e.g., 'minimalist', 'watercolor', 'cinematic'"
            className="w-full p-3 bg-cosmic-900/50 border border-cosmic-400/20 rounded-lg
                     text-white placeholder-gray-500
                     focus:outline-none focus:border-purple-500/50"
            disabled={isLoading}
          />
        </div>

        {/* Element Checkboxes */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Astrological Elements (optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ELEMENTS.map((element) => (
              <button
                key={element.value}
                onClick={() => handleElementToggle(element.value)}
                disabled={isLoading}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedElements.includes(element.value)
                    ? 'bg-purple-600/30 border border-purple-500/50'
                    : 'bg-cosmic-dark/30 border border-cosmic-light/10 hover:border-purple-500/30'
                }`}
              >
                <span className="text-xl mr-2">{element.emoji}</span>
                <span className="text-white font-medium">{element.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {generateBackground.isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
          >
            <p className="text-red-400 text-sm">
              {generateBackground.error instanceof Error
                ? generateBackground.error.message
                : 'Failed to generate background'}
            </p>
          </motion.div>
        )}

        {/* Success Message */}
        {generateBackground.isSuccess && !generateBackground.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg"
          >
            <p className="text-green-400 text-sm">
              Background generated successfully!
            </p>
          </motion.div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Background
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Tip: Be specific about colors, mood, and composition for best results
        </p>
      </CardContent>
    </Card>
  )
}
