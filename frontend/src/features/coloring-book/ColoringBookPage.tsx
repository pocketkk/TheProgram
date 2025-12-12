/**
 * Coloring Book Page
 *
 * Main page for the art therapy / coloring book feature.
 * Allows users to:
 * - Generate coloring book images from AI
 * - Color them in with various art tools
 * - Paint on a blank canvas
 * - Save and manage their artwork
 */
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Palette,
  Image,
  FolderOpen,
  ChevronLeft,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { ArtCanvas, type ArtCanvasRef } from './components/ArtCanvas'
import { Toolbar } from './components/Toolbar'
import { ColorPalette } from './components/ColorPalette'
import { BrushSettings } from './components/BrushSettings'
import { TemplateGallery } from './components/TemplateGallery'
import { ArtworkGallery } from './components/ArtworkGallery'
import { useColoringBookStore } from './stores/useColoringBookStore'
import { saveArtwork, updateArtwork } from '@/lib/api/coloringBook'
import type { Artwork } from './types'

type View = 'templates' | 'canvas' | 'gallery'

export const ColoringBookPage = () => {
  const queryClient = useQueryClient()
  const canvasRef = useRef<ArtCanvasRef>(null)

  const [view, setView] = useState<View>('templates')
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('')
  const [currentImageId, setCurrentImageId] = useState<string | undefined>()
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [artworkName, setArtworkName] = useState('')
  const [artworkTags, setArtworkTags] = useState('')

  const { canvasSize } = useColoringBookStore()

  // Save artwork mutation
  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      const imageData = canvasRef.current?.getImageData()
      if (!imageData) throw new Error('Failed to get canvas data')

      const tags = artworkTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      if (editingArtwork) {
        // Update existing artwork
        return updateArtwork(editingArtwork.id, {
          name,
          image_data: imageData,
          tags,
        })
      } else {
        // Save new artwork
        return saveArtwork({
          name,
          image_data: imageData,
          source_image_id: currentImageId,
          tags,
        })
      }
    },
    onSuccess: (artwork) => {
      queryClient.invalidateQueries({ queryKey: ['artwork'] })
      setShowSaveModal(false)
      setEditingArtwork(artwork)
      setArtworkName('')
      setArtworkTags('')
    },
  })

  // Handle selecting an image to color
  const handleSelectImage = useCallback((imageUrl: string, imageId?: string) => {
    setCurrentImageUrl(imageUrl)
    setCurrentImageId(imageId)
    setEditingArtwork(null)
    setView('canvas')
  }, [])

  // Handle loading existing artwork
  const handleLoadArtwork = useCallback((artwork: Artwork) => {
    setEditingArtwork(artwork)
    setCurrentImageUrl(artwork.url)
    setCurrentImageId(artwork.source_image_id)
    setView('canvas')

    // Load the artwork into canvas after a short delay
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.loadImage(artwork.url)
      }
    }, 100)
  }, [])

  // Canvas action handlers
  const handleUndo = useCallback(() => canvasRef.current?.undo(), [])
  const handleRedo = useCallback(() => canvasRef.current?.redo(), [])
  const handleClear = useCallback(() => canvasRef.current?.clear(), [])

  const handleSave = useCallback(() => {
    if (editingArtwork) {
      setArtworkName(editingArtwork.name)
      setArtworkTags(editingArtwork.tags?.join(', ') || '')
    }
    setShowSaveModal(true)
  }, [editingArtwork])

  const handleDownload = useCallback(() => {
    const dataUrl = canvasRef.current?.getImageData()
    if (!dataUrl) return

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `artwork_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cosmic-700/50">
        <div className="flex items-center gap-4">
          {view === 'canvas' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('templates')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <h1 className="text-2xl font-heading font-bold text-gradient-celestial flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Art Therapy Studio
          </h1>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 bg-cosmic-800/50 rounded-lg p-1">
          <button
            onClick={() => setView('templates')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${view === 'templates'
                ? 'bg-cosmic-600 text-white'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <Image className="h-4 w-4" />
            Templates
          </button>
          <button
            onClick={() => setView('canvas')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${view === 'canvas'
                ? 'bg-cosmic-600 text-white'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <Palette className="h-4 w-4" />
            Canvas
          </button>
          <button
            onClick={() => setView('gallery')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${view === 'gallery'
                ? 'bg-cosmic-600 text-white'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            <FolderOpen className="h-4 w-4" />
            My Art
          </button>
        </div>

        {/* Quick save when on canvas */}
        {view === 'canvas' && (
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {editingArtwork ? 'Update' : 'Save'}
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Templates View */}
          {view === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto p-6"
            >
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-medium text-white mb-2">
                    Choose Your Canvas
                  </h2>
                  <p className="text-gray-400">
                    Select a coloring book template, generate a custom image, or start with a blank canvas
                  </p>
                </div>

                <TemplateGallery onSelectImage={handleSelectImage} />
              </div>
            </motion.div>
          )}

          {/* Canvas View */}
          {view === 'canvas' && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex"
            >
              {/* Left Sidebar - Tools */}
              <div className="w-56 p-3 overflow-y-auto border-r border-cosmic-700/50">
                <Toolbar
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClear}
                  onSave={handleSave}
                  onDownload={handleDownload}
                />
              </div>

              {/* Canvas Area */}
              <div className="flex-1 flex items-center justify-center bg-cosmic-900/50 p-4 overflow-hidden">
                <div className="relative max-w-full max-h-full">
                  <ArtCanvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    backgroundImage={currentImageUrl || undefined}
                    className="rounded-lg shadow-2xl"
                  />

                  {/* Editing indicator */}
                  {editingArtwork && (
                    <div className="absolute -top-8 left-0 text-xs text-gray-400">
                      Editing: {editingArtwork.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar - Colors & Settings */}
              <div className="w-64 p-3 overflow-y-auto border-l border-cosmic-700/50 space-y-3">
                <ColorPalette />
                <BrushSettings />
              </div>
            </motion.div>
          )}

          {/* Gallery View */}
          {view === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto p-6"
            >
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-medium text-white mb-2">
                    Your Artwork
                  </h2>
                  <p className="text-gray-400">
                    View and manage your saved creations
                  </p>
                </div>

                <ArtworkGallery onLoadArtwork={handleLoadArtwork} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmic-900/80 backdrop-blur-sm"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-medium text-white mb-4">
                {editingArtwork ? 'Update Artwork' : 'Save Artwork'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={artworkName}
                    onChange={(e) => setArtworkName(e.target.value)}
                    placeholder="My Beautiful Creation"
                    className="w-full bg-cosmic-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 border border-cosmic-600 focus:border-cosmic-400 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={artworkTags}
                    onChange={(e) => setArtworkTags(e.target.value)}
                    placeholder="mandala, cosmic, relaxing"
                    className="w-full bg-cosmic-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 border border-cosmic-600 focus:border-cosmic-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(artworkName || `Artwork ${Date.now()}`)}
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingArtwork ? 'Update' : 'Save'}
                    </>
                  )}
                </Button>
              </div>

              {saveMutation.isError && (
                <p className="mt-4 text-sm text-red-400 text-center">
                  {saveMutation.error?.message || 'Failed to save artwork'}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
