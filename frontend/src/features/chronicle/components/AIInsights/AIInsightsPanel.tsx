/**
 * AI Insights Panel for Cosmic Chronicle
 *
 * Provides AI-powered analysis of reading patterns and interests.
 * Privacy-first: only sends anonymized topic data to AI.
 */
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Rss,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  ExternalLink,
  Search,
  BookOpen,
  RefreshCw,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui'
import {
  analyzeInterests,
  getFeedRecommendations,
  getAIPrivacyInfo,
  type InterestAnalysis,
  type FeedRecommendations,
  type PrivacyInfo
} from '@/lib/api/interests'

interface AIInsightsPanelProps {
  className?: string
}

/**
 * Privacy info tooltip content
 */
function PrivacyInfoCard({ info }: { info: PrivacyInfo }) {
  return (
    <div className="p-4 bg-cosmic-dark/80 rounded-lg border border-cosmic-light/20">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-green-400" />
        <h4 className="font-medium text-white">Privacy-First AI Analysis</h4>
      </div>
      <p className="text-sm text-gray-400 mb-4">{info.explanation}</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-green-400 mb-2">Data Sent</p>
          <ul className="text-xs text-gray-400 space-y-1">
            {info.data_sent.slice(0, 4).map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-green-400">+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-red-400 mb-2">Never Sent</p>
          <ul className="text-xs text-gray-400 space-y-1">
            {info.data_not_sent.slice(0, 4).map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-red-400">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * Analysis results display
 */
function AnalysisResults({ analysis }: { analysis: InterestAnalysis }) {
  if (analysis.status === 'insufficient_data') {
    return (
      <div className="text-center py-6">
        <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">{analysis.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Reading Style */}
      {analysis.reading_style && (
        <div className="p-3 bg-celestial-gold/10 rounded-lg border border-celestial-gold/20">
          <p className="text-sm text-celestial-gold">{analysis.reading_style}</p>
        </div>
      )}

      {/* Focus Areas */}
      {analysis.focus_areas.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">FOCUS AREAS</p>
          <div className="flex flex-wrap gap-2">
            {analysis.focus_areas.map((area, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-cosmic-light/10 rounded-full text-xs text-gray-300"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            INSIGHTS
          </p>
          <ul className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-celestial-gold mt-1">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trends */}
      {analysis.trends.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            TRENDS
          </p>
          <ul className="space-y-2">
            {analysis.trends.map((trend, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-green-400 mt-1">↗</span>
                {trend}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Search className="h-3 w-3" />
            EXPLORE
          </p>
          <ul className="space-y-2">
            {analysis.suggestions.map((suggestion, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-blue-400 mt-1">→</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Feed recommendations display
 */
function FeedRecommendationsDisplay({ recommendations }: { recommendations: FeedRecommendations }) {
  if (recommendations.status === 'insufficient_data') {
    return (
      <div className="text-center py-6">
        <Rss className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">{recommendations.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recommended Feeds */}
      {recommendations.recommended_feeds.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">RECOMMENDED FEEDS</p>
          <div className="space-y-2">
            {recommendations.recommended_feeds.slice(0, 5).map((feed, i) => (
              <div
                key={i}
                className="p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{feed.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{feed.reason}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {feed.topics.slice(0, 3).map((topic, j) => (
                        <span
                          key={j}
                          className="px-1.5 py-0.5 bg-cosmic-light/10 rounded text-xs text-gray-500"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-celestial-gold transition-colors"
                    title="Open feed URL"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explore Topics */}
      {recommendations.explore_topics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">TOPICS TO EXPLORE</p>
          <div className="space-y-2">
            {recommendations.explore_topics.map((topic, i) => (
              <div
                key={i}
                className="p-2 bg-cosmic-dark/30 rounded border border-cosmic-light/5"
              >
                <p className="text-sm text-white">{topic.topic}</p>
                <p className="text-xs text-gray-400 mt-1">{topic.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diversify Suggestions */}
      {recommendations.diversify_suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">DIVERSIFY YOUR READING</p>
          <ul className="space-y-1">
            {recommendations.diversify_suggestions.map((suggestion, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-purple-400 mt-1">◇</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function AIInsightsPanel({ className = '' }: AIInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'analysis' | 'feeds' | 'privacy'>('analysis')
  const [showPrivacy, setShowPrivacy] = useState(false)

  // Analysis query - only fetch when expanded and tab is active
  const {
    data: analysis,
    isLoading: isAnalyzing,
    error: analysisError,
    refetch: refetchAnalysis
  } = useQuery({
    queryKey: ['ai-analysis'],
    queryFn: analyzeInterests,
    enabled: isExpanded && activeTab === 'analysis',
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  })

  // Feed recommendations query
  const {
    data: recommendations,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refetch: refetchRecommendations
  } = useQuery({
    queryKey: ['feed-recommendations'],
    queryFn: getFeedRecommendations,
    enabled: isExpanded && activeTab === 'feeds',
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false
  })

  // Privacy info query
  const { data: privacyInfo } = useQuery({
    queryKey: ['ai-privacy-info'],
    queryFn: getAIPrivacyInfo,
    enabled: showPrivacy,
    staleTime: 60 * 60 * 1000 // 1 hour
  })

  const isLoading = isAnalyzing || isLoadingRecommendations
  const error = activeTab === 'analysis' ? analysisError : recommendationsError

  return (
    <div className={`bg-cosmic-dark/30 rounded-lg border border-cosmic-light/10 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-cosmic-light/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <h3 className="font-medium text-white">AI Insights</h3>
          <span className="px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-300">
            Beta
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* Privacy toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      activeTab === 'analysis'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('feeds')}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      activeTab === 'feeds'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Rss className="h-3 w-3 inline mr-1" />
                    Feed Ideas
                  </button>
                </div>
                <button
                  onClick={() => setShowPrivacy(!showPrivacy)}
                  className="p-1 text-gray-500 hover:text-green-400 transition-colors"
                  title="Privacy info"
                >
                  <Shield className="h-4 w-4" />
                </button>
              </div>

              {/* Privacy info */}
              {showPrivacy && privacyInfo && (
                <div className="mb-4">
                  <PrivacyInfoCard info={privacyInfo} />
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {activeTab === 'analysis' ? 'Analyzing patterns...' : 'Finding recommendations...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && !isLoading && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-400">
                      {error instanceof Error ? error.message : 'Failed to get AI insights'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Make sure ANTHROPIC_API_KEY is configured
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => activeTab === 'analysis' ? refetchAnalysis() : refetchRecommendations()}
                    className="text-gray-400"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Analysis results */}
              {!isLoading && !error && activeTab === 'analysis' && analysis && (
                <AnalysisResults analysis={analysis} />
              )}

              {/* Feed recommendations */}
              {!isLoading && !error && activeTab === 'feeds' && recommendations && (
                <FeedRecommendationsDisplay recommendations={recommendations} />
              )}

              {/* Refresh button */}
              {!isLoading && !error && (analysis || recommendations) && (
                <div className="mt-4 pt-3 border-t border-cosmic-light/10 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => activeTab === 'analysis' ? refetchAnalysis() : refetchRecommendations()}
                    className="text-gray-400 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AIInsightsPanel
