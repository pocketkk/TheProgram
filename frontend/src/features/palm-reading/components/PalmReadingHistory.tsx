/**
 * Palm Reading History Component
 *
 * Displays a list of past palm readings.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  Hand,
  BookmarkCheck,
  Trash2,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import {
  usePalmReadingHistory,
  useDeletePalmReading,
  useUpdatePalmReading,
} from '../hooks/usePalmReading'
import type { PalmReadingRecord } from '../types'

interface PalmReadingHistoryProps {
  onSelectReading: (reading: PalmReadingRecord) => void
  favoritesOnly?: boolean
}

export function PalmReadingHistory({
  onSelectReading,
  favoritesOnly = false,
}: PalmReadingHistoryProps) {
  const [showFavorites, setShowFavorites] = useState(favoritesOnly)

  const { data, isLoading, error } = usePalmReadingHistory({
    limit: 50,
    favoritesOnly: showFavorites,
  })

  const deleteMutation = useDeletePalmReading()
  const updateMutation = useUpdatePalmReading()

  const handleDelete = async (e: React.MouseEvent, readingId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this reading?')) {
      deleteMutation.mutate(readingId)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent, reading: PalmReadingRecord) => {
    e.stopPropagation()
    updateMutation.mutate({
      readingId: reading.id,
      data: { is_favorite: !reading.is_favorite },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Failed to load reading history</p>
      </div>
    )
  }

  const readings = data?.readings || []

  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      <div className="flex gap-2">
        <Button
          variant={showFavorites ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowFavorites(false)}
        >
          All Readings
        </Button>
        <Button
          variant={showFavorites ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFavorites(true)}
        >
          <BookmarkCheck className="h-4 w-4 mr-1" />
          Favorites
        </Button>
      </div>

      {/* Readings List */}
      {readings.length === 0 ? (
        <div className="text-center py-12 glass rounded-xl">
          <Sparkles className="h-12 w-12 text-cosmic-400 mx-auto mb-4" />
          <p className="text-gray-400">
            {showFavorites
              ? 'No favorite readings yet'
              : 'No palm readings yet. Capture your palm to get started!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {readings.map((reading, index) => (
            <motion.div
              key={reading.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectReading(reading)}
              className="glass rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                {/* Hand Icon */}
                <div className="p-3 rounded-lg bg-cosmic-800/50 text-cosmic-400">
                  <Hand className="h-6 w-6" />
                </div>

                {/* Reading Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white capitalize">
                      {reading.hand_type} Hand Reading
                    </span>
                    {reading.is_favorite && (
                      <BookmarkCheck className="h-4 w-4 text-celestial-gold" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                    <Clock className="h-3 w-3" />
                    {format(new Date(reading.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  {reading.notes && (
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      Note: {reading.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => handleToggleFavorite(e, reading)}
                    disabled={updateMutation.isPending}
                  >
                    <BookmarkCheck
                      className={`h-4 w-4 ${reading.is_favorite ? 'text-celestial-gold' : 'text-gray-400'}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => handleDelete(e, reading.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>

                <ChevronRight className="h-5 w-5 text-gray-500" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Total count */}
      {data && data.total > 0 && (
        <p className="text-center text-sm text-gray-500">
          {data.total} reading{data.total === 1 ? '' : 's'} total
        </p>
      )}
    </div>
  )
}
