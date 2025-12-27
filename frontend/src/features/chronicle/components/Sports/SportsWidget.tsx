/**
 * Sports Widget for Cosmic Chronicle
 *
 * Displays live scores in a compact ticker format.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui'
import {
  getScores,
  formatGameStatus,
  isGameLive,
  type SportScore
} from '@/lib/api/sports'

interface SportsWidgetProps {
  leagues?: string[]
  onConfigureClick?: () => void
  className?: string
}

/**
 * Single score card for the ticker
 */
function ScoreCard({ score }: { score: SportScore }) {
  const live = isGameLive(score)
  const status = formatGameStatus(score)

  return (
    <div className="flex-shrink-0 w-48 p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10">
      {/* League and status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {score.league}
        </span>
        <span className={`text-xs flex items-center gap-1 ${live ? 'text-red-400' : 'text-gray-400'}`}>
          {live && <Circle className="h-2 w-2 fill-red-400 animate-pulse" />}
          {status}
        </span>
      </div>

      {/* Teams and scores */}
      <div className="space-y-1.5">
        {/* Away team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {score.away_logo ? (
              <img
                src={score.away_logo}
                alt={score.away_team}
                className="w-5 h-5 object-contain"
              />
            ) : (
              <div className="w-5 h-5 bg-cosmic-light/20 rounded" />
            )}
            <span className="text-sm text-gray-200 truncate max-w-[100px]">
              {score.away_team_abbr}
            </span>
          </div>
          <span className={`text-sm font-mono ${
            score.status === 'final' && score.away_score !== null && score.home_score !== null
              ? score.away_score > score.home_score
                ? 'text-white font-bold'
                : 'text-gray-400'
              : 'text-white'
          }`}>
            {score.away_score ?? '-'}
          </span>
        </div>

        {/* Home team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {score.home_logo ? (
              <img
                src={score.home_logo}
                alt={score.home_team}
                className="w-5 h-5 object-contain"
              />
            ) : (
              <div className="w-5 h-5 bg-cosmic-light/20 rounded" />
            )}
            <span className="text-sm text-gray-200 truncate max-w-[100px]">
              {score.home_team_abbr}
            </span>
          </div>
          <span className={`text-sm font-mono ${
            score.status === 'final' && score.away_score !== null && score.home_score !== null
              ? score.home_score > score.away_score
                ? 'text-white font-bold'
                : 'text-gray-400'
              : 'text-white'
          }`}>
            {score.home_score ?? '-'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SportsWidget({
  leagues = ['nfl', 'nba'],
  onConfigureClick,
  className = ''
}: SportsWidgetProps) {
  const [scrollIndex, setScrollIndex] = useState(0)

  // Fetch scores
  const {
    data: scores,
    isLoading,
    error
  } = useQuery({
    queryKey: ['sports-scores', leagues],
    queryFn: () => getScores(leagues),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  })

  // Handle scroll
  const visibleCount = 3
  const maxScroll = Math.max(0, (scores?.length || 0) - visibleCount)

  const handlePrev = () => {
    setScrollIndex(Math.max(0, scrollIndex - 1))
  }

  const handleNext = () => {
    setScrollIndex(Math.min(maxScroll, scrollIndex + 1))
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 glass-subtle rounded-lg ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-celestial-gold" />
        <span className="text-sm text-gray-400">Loading scores...</span>
      </div>
    )
  }

  // Error or no scores
  if (error || !scores || scores.length === 0) {
    return (
      <button
        onClick={onConfigureClick}
        className={`flex items-center gap-2 px-3 py-2 glass-subtle rounded-lg hover:bg-cosmic-light/10 transition-colors ${className}`}
      >
        <Trophy className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-400">
          {error ? 'Sports unavailable' : 'No games today'}
        </span>
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Nav button - previous */}
      {scores.length > visibleCount && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={scrollIndex === 0}
          className="p-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Scores ticker */}
      <div className="relative overflow-hidden" style={{ width: `${visibleCount * 200}px` }}>
        <motion.div
          className="flex gap-2"
          animate={{ x: -scrollIndex * 200 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {scores.map((score) => (
            <ScoreCard key={score.game_id} score={score} />
          ))}
        </motion.div>
      </div>

      {/* Nav button - next */}
      {scores.length > visibleCount && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={scrollIndex >= maxScroll}
          className="p-1"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Settings button */}
      {onConfigureClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onConfigureClick}
          className="p-1 text-gray-500"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export default SportsWidget
