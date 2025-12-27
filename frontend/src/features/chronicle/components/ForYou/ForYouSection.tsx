/**
 * For You Section for Cosmic Chronicle
 *
 * Displays personalized article recommendations based on interests.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Tag,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui'
import {
  listInterests,
  getForYouArticles,
  updateReadingFeedback,
  recordReading,
  type InterestProfile,
  type ScoredArticle,
  type ReadingEventCreate
} from '@/lib/api/interests'

interface Article {
  id: string
  title: string
  headline?: string
  content?: string
  summary?: string
  description?: string
  url?: string
  source?: string
  feedTitle?: string
}

interface ForYouSectionProps {
  articles: Article[]
  onArticleClick?: (article: Article) => void
  className?: string
}

/**
 * Article card with feedback controls
 */
function ForYouCard({
  article,
  score,
  matchedTopics,
  onFeedback,
  onClick
}: {
  article: Article
  score: number
  matchedTopics: string[]
  onFeedback: (feedback: 'more' | 'less') => void
  onClick?: () => void
}) {
  const title = article.headline || article.title
  const content = article.content || article.summary || article.description || ''
  const truncatedContent = content.length > 120
    ? content.substring(0, 120) + '...'
    : content

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 sm:p-4 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10 hover:border-celestial-gold/30 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className="group flex items-start gap-2"
            >
              <h4 className="text-sm font-medium text-white group-hover:text-celestial-gold transition-colors line-clamp-2">
                {title}
              </h4>
              <ExternalLink className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
            </a>
          ) : (
            <h4 className="text-sm font-medium text-white line-clamp-2">
              {title}
            </h4>
          )}
        </div>

        {/* Relevance score badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 bg-celestial-gold/20 rounded text-xs text-celestial-gold">
          <BarChart3 className="h-3 w-3" />
          {Math.round(score * 100)}%
        </div>
      </div>

      {/* Content preview */}
      {truncatedContent && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
          {truncatedContent}
        </p>
      )}

      {/* Matched topics */}
      {matchedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {matchedTopics.slice(0, 3).map((topic, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cosmic-light/10 rounded text-xs text-gray-400"
            >
              <Tag className="h-2.5 w-2.5" />
              {topic}
            </span>
          ))}
          {matchedTopics.length > 3 && (
            <span className="text-xs text-gray-500">
              +{matchedTopics.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Source and feedback */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {article.feedTitle || article.source || 'Unknown source'}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFeedback('more')}
            className="p-1 h-7 text-gray-400 hover:text-green-400"
            title="More like this"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFeedback('less')}
            className="p-1 h-7 text-gray-400 hover:text-red-400"
            title="Less like this"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Interest tag cloud
 */
function InterestCloud({ interests }: { interests: InterestProfile[] }) {
  if (interests.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {interests.slice(0, 8).map((interest) => (
        <span
          key={interest.id}
          className="px-2 py-1 bg-cosmic-light/10 rounded-full text-xs"
          style={{
            color: `hsl(${45 + interest.decayed_score * 20}, 70%, ${50 + interest.decayed_score * 20}%)`
          }}
        >
          {interest.topic}
          <span className="ml-1 opacity-60">
            ({interest.article_count})
          </span>
        </span>
      ))}
    </div>
  )
}

export function ForYouSection({
  articles,
  onArticleClick,
  className = ''
}: ForYouSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const queryClient = useQueryClient()

  // Fetch interests for display
  const { data: interestsData } = useQuery({
    queryKey: ['interests'],
    queryFn: () => listInterests(undefined, 2, 10),
    staleTime: 5 * 60 * 1000
  })

  // Get personalized articles
  const { data: forYouData, isLoading } = useQuery({
    queryKey: ['for-you', articles.map(a => a.id).join(',')],
    queryFn: () => getForYouArticles(
      articles.map(a => ({
        id: a.id,
        title: a.headline || a.title,
        content: a.content || a.summary || a.description,
        source: a.feedTitle || a.source
      })),
      6,
      0.35
    ),
    enabled: articles.length > 0,
    staleTime: 10 * 60 * 1000
  })

  // Record reading mutation
  const recordReadingMutation = useMutation({
    mutationFn: recordReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interests'] })
    }
  })

  // Handle feedback
  const handleFeedback = (article: Article, scored: ScoredArticle, feedback: 'more' | 'less') => {
    recordReadingMutation.mutate({
      article_id: article.id,
      source_type: article.source || 'rss',
      title: article.headline || article.title,
      url: article.url,
      content: article.content || article.summary,
      feedback
    })
  }

  // Handle article click
  const handleArticleClick = (article: Article, scored: ScoredArticle) => {
    // Record the reading
    recordReadingMutation.mutate({
      article_id: article.id,
      source_type: article.source || 'rss',
      title: article.headline || article.title,
      url: article.url,
      content: article.content || article.summary,
      time_spent_seconds: 0,
      scroll_depth_pct: 0
    })

    onArticleClick?.(article)
  }

  // Get scored articles
  const scoredArticles = forYouData?.articles || []
  const articleMap = new Map(articles.map(a => [a.id, a]))

  // Don't show if no articles or no interests
  const hasInterests = (interestsData?.interests.length || 0) > 0
  const hasRecommendations = scoredArticles.length > 0

  if (!hasInterests && !hasRecommendations) {
    return (
      <div className={`p-4 bg-cosmic-dark/30 rounded-lg border border-cosmic-light/10 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-celestial-gold" />
          <h3 className="font-medium text-white">For You</h3>
        </div>
        <p className="text-sm text-gray-400">
          Start reading articles to build your personalized feed.
          The more you read, the better your recommendations will be.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-cosmic-dark/30 rounded-lg border border-cosmic-light/10 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-cosmic-light/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-celestial-gold" />
          <h3 className="font-medium text-white">For You</h3>
          {hasRecommendations && (
            <span className="px-2 py-0.5 bg-celestial-gold/20 rounded text-xs text-celestial-gold">
              {scoredArticles.length} picks
            </span>
          )}
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
              {/* Interest cloud */}
              {hasInterests && (
                <InterestCloud interests={interestsData?.interests || []} />
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-celestial-gold" />
                </div>
              )}

              {/* Recommendations */}
              {!isLoading && hasRecommendations && (
                <div className="space-y-3">
                  {scoredArticles.map((scored) => {
                    const article = articleMap.get(scored.id)
                    if (!article) return null

                    return (
                      <ForYouCard
                        key={scored.id}
                        article={article}
                        score={scored.relevance_score}
                        matchedTopics={scored.matched_topics}
                        onFeedback={(fb) => handleFeedback(article, scored, fb)}
                        onClick={() => handleArticleClick(article, scored)}
                      />
                    )
                  })}
                </div>
              )}

              {/* No recommendations yet */}
              {!isLoading && !hasRecommendations && hasInterests && (
                <div className="text-center py-4">
                  <Info className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No strong matches in current articles.
                    Keep reading to improve recommendations.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ForYouSection
