/**
 * ThemeGallery - Grid display of generated background images
 */
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui'
import { useActiveBackground } from '../hooks/useThemes'
import type { ImageInfo } from '@/types/image'

interface ThemeGalleryProps {
  images: ImageInfo[]
  isLoading?: boolean
  onSelectImage: (image: ImageInfo) => void
}

export function ThemeGallery({ images, isLoading, onSelectImage }: ThemeGalleryProps) {
  const { activeBackgroundId } = useActiveBackground()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-2" />
          <p className="text-gray-400">Loading backgrounds...</p>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-400">
          <p className="text-lg mb-2">No backgrounds yet</p>
          <p className="text-sm">Generate your first workspace background to get started</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((image, index) => {
        const isActive = activeBackgroundId === image.id

        return (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`group relative overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                isActive
                  ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-cosmic-dark'
                  : ''
              }`}
              onClick={() => onSelectImage(image)}
            >
              {/* Image */}
              <div className="aspect-video bg-cosmic-900/50 overflow-hidden">
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 bg-purple-600 text-white p-2 rounded-full shadow-lg"
                >
                  <Check className="h-4 w-4" />
                </motion.div>
              )}

              {/* Overlay with prompt on hover */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity
                          flex items-end p-4"
              >
                <p className="text-white text-sm line-clamp-2">{image.prompt}</p>
              </div>

              {/* Footer */}
              <div className="p-3 bg-cosmic-dark/80">
                <p className="text-xs text-gray-500 truncate">
                  {new Date(image.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
