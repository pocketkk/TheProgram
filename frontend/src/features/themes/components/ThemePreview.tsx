/**
 * ThemePreview - Full-size preview modal for background images
 */
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useActiveBackground, useDeleteBackground } from '../hooks/useThemes'
import type { ImageInfo } from '@/types/image'

interface ThemePreviewProps {
  image: ImageInfo | null
  onClose: () => void
}

export function ThemePreview({ image, onClose }: ThemePreviewProps) {
  const { activeBackgroundId, setActiveBackground } = useActiveBackground()
  const deleteBackground = useDeleteBackground()

  if (!image) return null

  const isActive = activeBackgroundId === image.id

  const handleSetAsBackground = () => {
    setActiveBackground(image.id)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this background?')) {
      await deleteBackground.mutateAsync(image.id)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-6xl w-full"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Image */}
          <div className="relative rounded-lg overflow-hidden bg-cosmic-dark/50 backdrop-blur">
            <img
              src={image.url}
              alt={image.prompt}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>

          {/* Info and Actions */}
          <div className="mt-4 p-4 bg-cosmic-dark/80 backdrop-blur rounded-lg border border-cosmic-light/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-white text-sm mb-1">
                  {image.prompt}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(image.created_at).toLocaleDateString()} • {image.width}x{image.height}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSetAsBackground}
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                  disabled={isActive}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {isActive ? 'Active' : 'Set as Background'}
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  size="sm"
                  disabled={deleteBackground.isPending}
                  className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
