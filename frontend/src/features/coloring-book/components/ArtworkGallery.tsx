/**
 * Artwork Gallery Component
 *
 * View and manage saved artwork
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Trash2,
  Download,
  Edit3,
  X,
  Calendar,
  Tag,
  MoreVertical,
  FolderOpen,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { listArtwork, deleteArtwork, getArtwork } from '@/lib/api/coloringBook'
import type { Artwork } from '../types'

interface ArtworkGalleryProps {
  onLoadArtwork: (artwork: Artwork) => void
  className?: string
}

export const ArtworkGallery = ({ onLoadArtwork, className }: ArtworkGalleryProps) => {
  const queryClient = useQueryClient()
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Fetch artwork list
  const { data, isLoading, error } = useQuery({
    queryKey: ['artwork'],
    queryFn: () => listArtwork({ limit: 50 }),
  })

  const artworks = data?.artworks || []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteArtwork,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artwork'] })
      setShowDeleteConfirm(null)
      if (selectedArtwork && showDeleteConfirm === selectedArtwork.id) {
        setSelectedArtwork(null)
      }
    },
  })

  // Load full artwork details
  const loadArtwork = async (id: string) => {
    try {
      const artwork = await getArtwork(id)
      onLoadArtwork(artwork)
    } catch (err) {
      console.error('Failed to load artwork:', err)
    }
  }

  // Download artwork
  const downloadArtwork = (artwork: Artwork) => {
    const link = document.createElement('a')
    link.href = artwork.url
    link.download = `${artwork.name.replace(/[^a-z0-9]/gi, '_')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-red-400">Failed to load artwork</p>
      </div>
    )
  }

  if (artworks.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <FolderOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">No Artwork Yet</h3>
        <p className="text-sm text-gray-500">
          Your saved artwork will appear here
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {artworks.map((artwork) => (
          <motion.div
            key={artwork.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative"
          >
            <div
              onClick={() => setSelectedArtwork(artwork)}
              className="aspect-square rounded-xl overflow-hidden border border-cosmic-700 hover:border-cosmic-500 transition-all cursor-pointer bg-cosmic-800/30"
            >
              <img
                src={artwork.url}
                alt={artwork.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-cosmic-900/90 via-cosmic-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h4 className="text-sm font-medium text-white truncate">
                    {artwork.name}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {formatDate(artwork.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  loadArtwork(artwork.id)
                }}
                className="p-1.5 bg-cosmic-800/80 rounded-lg text-white hover:bg-cosmic-700 transition-colors"
                title="Continue editing"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  downloadArtwork(artwork)
                }}
                className="p-1.5 bg-cosmic-800/80 rounded-lg text-white hover:bg-cosmic-700 transition-colors"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteConfirm(artwork.id)
                }}
                className="p-1.5 bg-cosmic-800/80 rounded-lg text-red-400 hover:bg-red-900/50 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Artwork Detail Modal */}
      <AnimatePresence>
        {selectedArtwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmic-900/80 backdrop-blur-sm"
            onClick={() => setSelectedArtwork(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row h-full">
                {/* Image */}
                <div className="flex-1 bg-white/5 flex items-center justify-center p-4">
                  <img
                    src={selectedArtwork.url}
                    alt={selectedArtwork.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>

                {/* Details */}
                <div className="w-full md:w-80 p-6 border-t md:border-t-0 md:border-l border-cosmic-700">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-heading font-bold text-white">
                      {selectedArtwork.name}
                    </h2>
                    <button
                      onClick={() => setSelectedArtwork(null)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedArtwork.created_at)}</span>
                    </div>

                    {selectedArtwork.width > 0 && (
                      <div className="text-sm text-gray-400">
                        {selectedArtwork.width} x {selectedArtwork.height} px
                      </div>
                    )}

                    {selectedArtwork.tags && selectedArtwork.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedArtwork.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-cosmic-700/50 rounded-full text-xs text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={() => loadArtwork(selectedArtwork.id)}
                      className="w-full"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Continue Editing
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadArtwork(selectedArtwork)}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(selectedArtwork.id)}
                      className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cosmic-900/80 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-white mb-2">
                Delete Artwork?
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                This action cannot be undone. The artwork will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-500"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
