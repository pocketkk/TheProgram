/**
 * Template Gallery Component
 *
 * Browse and select coloring book templates or generate custom images
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Sparkles,
  Leaf,
  Target,
  Star,
  PawPrint,
  Castle,
  Flower2,
  Hexagon,
  Shapes,
  Wand2,
  Loader2,
  ImagePlus,
  RefreshCw,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import {
  listTemplates,
  generateFromTemplate,
  generateColoringBookImage,
  listColoringBookImages,
} from '@/lib/api/coloringBook'
import type { ColoringBookTemplate, ColoringBookImage } from '../types'
import { COLORING_THEMES } from '../types'

interface TemplateGalleryProps {
  onSelectImage: (imageUrl: string, imageId?: string) => void
  className?: string
}

const themeIcons: Record<string, React.ReactNode> = {
  mystical: <Sparkles className="h-4 w-4" />,
  nature: <Leaf className="h-4 w-4" />,
  mandala: <Target className="h-4 w-4" />,
  cosmic: <Star className="h-4 w-4" />,
  animals: <PawPrint className="h-4 w-4" />,
  fantasy: <Castle className="h-4 w-4" />,
  floral: <Flower2 className="h-4 w-4" />,
  geometric: <Hexagon className="h-4 w-4" />,
  abstract: <Shapes className="h-4 w-4" />,
}

export const TemplateGallery = ({ onSelectImage, className }: TemplateGalleryProps) => {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'detailed' | 'intricate'>('medium')

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['coloring-templates', selectedTheme],
    queryFn: () => listTemplates(selectedTheme || undefined),
  })

  // Fetch previously generated images
  const { data: generatedImages = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['coloring-images'],
    queryFn: () => listColoringBookImages({ limit: 20 }),
  })

  // Generate from template mutation
  const generateFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) => generateFromTemplate(templateId, complexity),
    onSuccess: (data) => {
      if (data.success && data.image_url) {
        onSelectImage(data.image_url, data.image_id)
        refetchImages()
      }
    },
  })

  // Generate custom image mutation
  const generateCustomMutation = useMutation({
    mutationFn: () =>
      generateColoringBookImage({
        prompt: customPrompt,
        theme: selectedTheme || 'mystical',
        complexity,
      }),
    onSuccess: (data) => {
      if (data.success && data.image_url) {
        onSelectImage(data.image_url, data.image_id)
        refetchImages()
        setShowCustomPrompt(false)
        setCustomPrompt('')
      }
    },
  })

  const isGenerating = generateFromTemplateMutation.isPending || generateCustomMutation.isPending

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Theme Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTheme(null)}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${!selectedTheme
              ? 'bg-cosmic-600 text-white'
              : 'bg-cosmic-800/50 text-gray-400 hover:text-white'
            }
          `}
        >
          All
        </button>
        {COLORING_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setSelectedTheme(theme.id === selectedTheme ? null : theme.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${selectedTheme === theme.id
                ? 'bg-cosmic-600 text-white'
                : 'bg-cosmic-800/50 text-gray-400 hover:text-white'
              }
            `}
          >
            {themeIcons[theme.id]}
            {theme.name}
          </button>
        ))}
      </div>

      {/* Complexity Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Detail Level:</span>
        {(['simple', 'medium', 'detailed', 'intricate'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setComplexity(level)}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-all capitalize
              ${complexity === level
                ? 'bg-cosmic-600 text-white'
                : 'bg-cosmic-800/50 text-gray-400 hover:text-white'
              }
            `}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Custom Prompt Section */}
      <AnimatePresence>
        {showCustomPrompt ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-lg p-4 space-y-3"
          >
            <h3 className="text-sm font-medium text-white">Create Custom Image</h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe the coloring book image you want (e.g., 'A majestic unicorn in a magical forest with mushrooms and fairies')"
              className="w-full h-24 bg-cosmic-800/50 rounded-lg p-3 text-sm text-white placeholder-gray-500 border border-cosmic-600 focus:border-cosmic-400 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => generateCustomMutation.mutate()}
                disabled={!customPrompt.trim() || isGenerating}
                className="flex-1"
              >
                {generateCustomMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCustomPrompt(false)}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowCustomPrompt(true)}
            className="w-full"
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Create Custom Image
          </Button>
        )}
      </AnimatePresence>

      {/* Templates Grid */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Templates</h3>
        {templatesLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map((template) => (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => generateFromTemplateMutation.mutate(template.id)}
                disabled={isGenerating}
                className="relative group bg-cosmic-800/30 rounded-lg overflow-hidden border border-cosmic-700 hover:border-cosmic-500 transition-all"
              >
                <div className="aspect-square bg-gradient-to-br from-cosmic-700/50 to-cosmic-800/50 flex items-center justify-center">
                  <div className="text-4xl opacity-30">
                    {themeIcons[template.theme]}
                  </div>
                </div>
                <div className="p-2">
                  <h4 className="text-xs font-medium text-white truncate">{template.name}</h4>
                  <p className="text-xs text-gray-500 truncate">{template.description}</p>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-cosmic-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center">
                    <Wand2 className="h-6 w-6 text-cosmic-400 mx-auto mb-2" />
                    <span className="text-xs text-white">Generate</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Previously Generated Images */}
      {generatedImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Your Generated Images</h3>
            <button
              onClick={() => refetchImages()}
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
          {imagesLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {generatedImages.map((image) => (
                <motion.button
                  key={image.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectImage(image.url, image.id)}
                  className="aspect-square rounded-lg overflow-hidden border border-cosmic-700 hover:border-cosmic-500 transition-all"
                >
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Blank Canvas Option */}
      <div className="pt-4 border-t border-cosmic-700">
        <Button
          variant="ghost"
          onClick={() => onSelectImage('')}
          className="w-full"
        >
          Start with Blank Canvas
        </Button>
      </div>

      {/* Generation Status */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 glass-strong rounded-xl p-4 flex items-center gap-3 shadow-2xl"
          >
            <Loader2 className="h-5 w-5 text-cosmic-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">Generating Image...</p>
              <p className="text-xs text-gray-400">This may take a moment</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      {(generateFromTemplateMutation.isError || generateCustomMutation.isError) && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-sm text-red-400">
            {generateFromTemplateMutation.error?.message ||
              generateCustomMutation.error?.message ||
              'Failed to generate image'}
          </p>
        </div>
      )}
    </div>
  )
}
