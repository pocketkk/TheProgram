/**
 * Preset Card Component
 *
 * Displays a meditation preset with options to play, edit, or favorite
 */
import { motion } from 'framer-motion'
import { Play, Heart, Clock, Music, Waves, MoreVertical, Trash2, Edit3 } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import type { MeditationPreset } from '../types'

interface PresetCardProps {
  preset: MeditationPreset
  onPlay: () => void
  onEdit?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
}

export function PresetCard({
  preset,
  onPlay,
  onEdit,
  onDelete,
  onToggleFavorite,
}: PresetCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const getVisualizationIcon = () => {
    switch (preset.visualization_type) {
      case 'waveform':
        return '〰️'
      case 'particles':
        return '✨'
      case 'mandala':
        return '🌸'
      case 'cosmos':
        return '🌌'
      default:
        return '🎵'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-colors">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />

        <CardContent className="p-4 relative">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title and badges */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white truncate">{preset.name}</h3>
                {preset.is_default && (
                  <Badge variant="outline" className="text-xs">Default</Badge>
                )}
              </div>

              {/* Description */}
              {preset.description && (
                <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                  {preset.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {preset.duration_minutes} min
                </span>

                {preset.music_enabled && (
                  <span className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    {preset.music_style || 'Ambient'}
                  </span>
                )}

                {preset.visualization_enabled && (
                  <span className="flex items-center gap-1">
                    <Waves className="h-3 w-3" />
                    {getVisualizationIcon()}
                  </span>
                )}

                {preset.times_used > 0 && (
                  <span className="text-gray-600">
                    Used {preset.times_used}x
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-2">
              {/* Favorite button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite?.()
                }}
                className="p-2"
              >
                <Heart
                  className={`h-4 w-4 ${
                    preset.is_favorite
                      ? 'fill-red-500 text-red-500'
                      : 'text-gray-500'
                  }`}
                />
              </Button>

              {/* More options */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className="p-2"
                >
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>

                {/* Dropdown menu */}
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 mt-1 w-36 bg-cosmic-900 border border-cosmic-700 rounded-lg shadow-xl z-20"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMenu(false)
                          onEdit?.()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-cosmic-800 rounded-t-lg"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMenu(false)
                          if (confirm('Delete this preset?')) {
                            onDelete?.()
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-cosmic-800 rounded-b-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="lg"
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg"
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
