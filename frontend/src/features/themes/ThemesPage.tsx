/**
 * ThemesPage - Workspace themes and background generation
 *
 * Allows users to generate and manage custom workspace backgrounds
 * using AI image generation with astrological theming options.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Palette, Sparkles } from 'lucide-react'
import { useBackgrounds } from './hooks/useThemes'
import { GenerateThemeForm } from './components/GenerateThemeForm'
import { ThemeGallery } from './components/ThemeGallery'
import { ThemePreview } from './components/ThemePreview'
import type { ImageInfo } from '@/types/image'

export function ThemesPage() {
  const { data: backgrounds = [], isLoading } = useBackgrounds()
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null)

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-heading font-bold text-gradient-celestial flex items-center gap-3">
          <Palette className="h-8 w-8 text-purple-400" />
          Workspace Themes
        </h1>
        <p className="text-gray-400 mt-2">
          Generate custom backgrounds for your cosmic workspace
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Generate Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <GenerateThemeForm />

          {/* Tips Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-4 bg-cosmic-dark/30 border border-cosmic-light/20 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-medium mb-2">Generation Tips</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Be specific about colors and mood</li>
                  <li>• Mention composition (centered, spiral, etc.)</li>
                  <li>• Add astrological elements for cosmic themes</li>
                  <li>• Try styles like "watercolor" or "cinematic"</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column - Gallery */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="mb-4">
            <h2 className="text-xl font-heading font-semibold text-white">
              Your Backgrounds
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {backgrounds.length} {backgrounds.length === 1 ? 'background' : 'backgrounds'} generated
            </p>
          </div>

          <ThemeGallery
            images={backgrounds}
            isLoading={isLoading}
            onSelectImage={setSelectedImage}
          />
        </motion.div>
      </div>

      {/* Preview Modal */}
      {selectedImage && (
        <ThemePreview image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  )
}

export default ThemesPage
