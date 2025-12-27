/**
 * Hook for fetching RSS articles for the Chronicle newspaper
 *
 * Fetches recent RSS articles and converts them to NewspaperArticle format.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { useState, useCallback } from 'react'
import { listArticles, type RssArticleWithFeed } from '@/lib/api/feeds'
import type { NewspaperArticle, NewspaperSection } from '../components/Newspaper/types'

interface UseRssArticlesOptions {
  /** Maximum articles to fetch */
  limit?: number
  /** Only show unread articles */
  unreadOnly?: boolean
}

interface UseRssArticlesResult {
  /** RSS section for the newspaper */
  rssSection: NewspaperSection | null
  /** Whether articles are loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Number of unread articles */
  unreadCount: number
  /** Total articles available */
  totalCount: number
  /** Fetch RSS articles */
  fetchArticles: () => Promise<void>
  /** Refresh articles from feeds */
  refresh: () => Promise<void>
}

/**
 * Convert RSS articles to newspaper article format
 */
function convertToNewspaperArticles(articles: RssArticleWithFeed[]): NewspaperArticle[] {
  return articles.map((article) => ({
    headline: article.title,
    content: article.summary || article.preview || '',
    year: article.published_at
      ? new Date(article.published_at).getFullYear()
      : new Date().getFullYear(),
    source: 'rss' as const,
    url: article.url,
    feedTitle: article.feed_title,
    author: article.author || undefined,
    significance: article.feed_category
      ? `From ${article.feed_title} (${article.feed_category})`
      : `From ${article.feed_title}`,
  }))
}

/**
 * Hook for fetching and managing RSS articles for the newspaper
 */
export function useRssArticles(options: UseRssArticlesOptions = {}): UseRssArticlesResult {
  const { limit = 20, unreadOnly = false } = options

  const [rssSection, setRssSection] = useState<NewspaperSection | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const fetchArticles = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await listArticles({
        limit,
        is_read: unreadOnly ? false : undefined,
      })

      const newspaperArticles = convertToNewspaperArticles(response.articles)

      if (newspaperArticles.length > 0) {
        setRssSection({
          name: 'Your Feeds',
          articles: newspaperArticles,
        })
      } else {
        setRssSection(null)
      }

      setUnreadCount(response.unread_count)
      setTotalCount(response.total)
    } catch (err: any) {
      setError(err?.message || 'Failed to load RSS articles')
      setRssSection(null)
    } finally {
      setIsLoading(false)
    }
  }, [limit, unreadOnly])

  const refresh = useCallback(async () => {
    // For now, just refetch. In the future, this could trigger a feed refresh first.
    await fetchArticles()
  }, [fetchArticles])

  return {
    rssSection,
    isLoading,
    error,
    unreadCount,
    totalCount,
    fetchArticles,
    refresh,
  }
}
