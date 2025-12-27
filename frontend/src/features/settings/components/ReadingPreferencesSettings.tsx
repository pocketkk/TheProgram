/**
 * Reading Preferences Settings Component
 *
 * Manage personal algorithm settings for Cosmic Chronicle.
 * Controls interest tracking, decay rates, and data management.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Brain,
  Trash2,
  Loader2,
  AlertCircle,
  BarChart3,
  Clock,
  Shield,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui'
import {
  getReadingStats,
  listInterests,
  clearHistory,
  type ReadingStats,
  type InterestProfile
} from '@/lib/api/interests'

export function ReadingPreferencesSettings() {
  const queryClient = useQueryClient()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [keepInterests, setKeepInterests] = useState(true)

  // Fetch reading stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['reading-stats'],
    queryFn: getReadingStats
  })

  // Fetch top interests
  const { data: interestsData, isLoading: isLoadingInterests } = useQuery({
    queryKey: ['interests-preview'],
    queryFn: () => listInterests(undefined, 2, 10)
  })

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: () => clearHistory(keepInterests),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-stats'] })
      queryClient.invalidateQueries({ queryKey: ['interests'] })
      queryClient.invalidateQueries({ queryKey: ['interests-preview'] })
      queryClient.invalidateQueries({ queryKey: ['for-you'] })
      setShowClearConfirm(false)
    }
  })

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Reading Statistics */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-celestial-gold" />
          Reading Statistics
        </h4>

        {isLoadingStats ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10">
              <p className="text-2xl font-bold text-white">{stats.total_readings}</p>
              <p className="text-xs text-gray-500">Articles Read</p>
            </div>
            <div className="p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10">
              <p className="text-2xl font-bold text-white">
                {formatTime(stats.total_time_seconds)}
              </p>
              <p className="text-xs text-gray-500">Reading Time</p>
            </div>
            <div className="p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10">
              <p className="text-2xl font-bold text-white">{stats.topics_tracked}</p>
              <p className="text-xs text-gray-500">Topics Tracked</p>
            </div>
            <div className="p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10">
              <p className="text-2xl font-bold text-white">{stats.starred_count}</p>
              <p className="text-xs text-gray-500">Starred</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No reading data yet</p>
        )}
      </div>

      {/* Top Interests */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" />
          Top Interests
        </h4>

        {isLoadingInterests ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : interestsData?.interests && interestsData.interests.length > 0 ? (
          <div className="space-y-2">
            {interestsData.interests.slice(0, 8).map((interest) => (
              <div
                key={interest.id}
                className="flex items-center justify-between p-2 bg-cosmic-dark/30 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{interest.topic}</span>
                  {interest.category && (
                    <span className="px-1.5 py-0.5 bg-cosmic-light/10 rounded text-xs text-gray-500">
                      {interest.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {interest.article_count} articles
                  </span>
                  <div
                    className="w-16 h-1.5 bg-cosmic-light/10 rounded-full overflow-hidden"
                    title={`Score: ${Math.round(interest.decayed_score * 100)}%`}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-celestial-gold to-amber-400"
                      style={{ width: `${interest.decayed_score * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No interests tracked yet. Read articles to build your profile.
          </p>
        )}
      </div>

      {/* How It Works */}
      <div className="p-4 bg-cosmic-light/5 rounded-lg border border-cosmic-light/10">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          How Your Personal Algorithm Works
        </h4>
        <ul className="text-xs text-gray-400 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-celestial-gold">1.</span>
            <span>Topics are extracted from articles you read</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-celestial-gold">2.</span>
            <span>Interest scores are based on reading time, scroll depth, and feedback</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-celestial-gold">3.</span>
            <span>Scores decay over time (10% per week) to reflect changing interests</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-celestial-gold">4.</span>
            <span>"For You" shows articles matching your strongest interests</span>
          </li>
        </ul>
      </div>

      {/* Privacy Note */}
      <div className="flex items-start gap-2 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
        <Shield className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-green-400 font-medium">Privacy-First</p>
          <p className="text-xs text-gray-500 mt-1">
            All reading data stays on your device. AI analysis only sends anonymized
            topic scores, never article content or personal information.
          </p>
        </div>
      </div>

      {/* Data Management */}
      <div className="border-t border-cosmic-light/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-400" />
          Data Management
        </h4>

        {!showClearConfirm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="text-red-400 border-red-400/30 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Reading History
          </Button>
        ) : (
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <p className="text-sm text-red-400 mb-3">
              Are you sure? This will delete your reading history.
            </p>

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={keepInterests}
                onChange={(e) => setKeepInterests(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-cosmic-dark text-celestial-gold focus:ring-celestial-gold/50"
              />
              <span className="text-sm text-gray-300">
                Keep my interest profiles (recommended)
              </span>
            </label>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
                className="text-gray-400"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
                className="text-red-400 border-red-400/30 hover:bg-red-500/10"
              >
                {clearHistoryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
