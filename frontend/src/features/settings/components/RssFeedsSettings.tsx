/**
 * RssFeedsSettings Component
 *
 * Manage RSS feed subscriptions for Cosmic Chronicle.
 * Supports adding feeds, OPML import/export, and category management.
 */
import { useState, useEffect } from 'react'
import {
  Rss,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  Download,
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  listFeeds,
  createFeed,
  deleteFeed,
  discoverFeed,
  refreshAllFeeds,
  importOpml,
  exportOpml,
  type RssFeed,
  type RssFeedListResponse,
} from '@/lib/api/feeds'

export function RssFeedsSettings() {
  const [feeds, setFeeds] = useState<RssFeed[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Add feed state
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [newFeedCategory, setNewFeedCategory] = useState('')
  const [isDiscovering, setIsDiscovering] = useState(false)

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Import/Export state
  const [showImport, setShowImport] = useState(false)
  const [opmlContent, setOpmlContent] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  // Expanded feeds list
  const [showAllFeeds, setShowAllFeeds] = useState(false)

  // Load feeds on mount
  useEffect(() => {
    loadFeeds()
  }, [])

  const loadFeeds = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await listFeeds()
      setFeeds(response.feeds)
    } catch (err: any) {
      setError(err?.message || 'Failed to load feeds')
    } finally {
      setIsLoading(false)
    }
  }

  const clearFeedback = () => {
    setError(null)
    setSuccessMessage(null)
  }

  const handleAddFeed = async () => {
    clearFeedback()
    if (!newFeedUrl.trim()) {
      setError('Please enter a feed URL')
      return
    }

    setIsDiscovering(true)
    try {
      // First discover the feed
      const discovery = await discoverFeed(newFeedUrl)

      // Then create the subscription
      await createFeed({
        url: newFeedUrl,
        title: discovery.title,
        description: discovery.description || undefined,
        site_url: discovery.site_url || undefined,
        icon_url: discovery.icon_url || undefined,
        category: newFeedCategory || undefined,
      })

      setSuccessMessage(`Subscribed to "${discovery.title}"`)
      setNewFeedUrl('')
      setNewFeedCategory('')
      await loadFeeds()
    } catch (err: any) {
      setError(err?.message || 'Failed to add feed')
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleDeleteFeed = async (feedId: string, title: string) => {
    clearFeedback()
    try {
      await deleteFeed(feedId)
      setSuccessMessage(`Unsubscribed from "${title}"`)
      await loadFeeds()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete feed')
    }
  }

  const handleRefreshAll = async () => {
    clearFeedback()
    setIsRefreshing(true)
    try {
      const response = await refreshAllFeeds()
      const successCount = response.results.filter(r => r.success).length
      const totalNew = response.total_new_articles
      setSuccessMessage(`Refreshed ${successCount} feeds. ${totalNew} new articles.`)
      await loadFeeds()
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh feeds')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleImportOpml = async () => {
    clearFeedback()
    if (!opmlContent.trim()) {
      setError('Please paste OPML content')
      return
    }

    setIsImporting(true)
    try {
      const response = await importOpml(opmlContent)
      setSuccessMessage(
        `Imported ${response.imported} feeds. ` +
        `${response.skipped > 0 ? `${response.skipped} skipped (duplicates). ` : ''}` +
        `${response.errors.length > 0 ? `${response.errors.length} errors.` : ''}`
      )
      setOpmlContent('')
      setShowImport(false)
      await loadFeeds()
    } catch (err: any) {
      setError(err?.message || 'Failed to import OPML')
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportOpml = async () => {
    clearFeedback()
    try {
      const response = await exportOpml()
      // Create and download file
      const blob = new Blob([response.opml_content], { type: 'text/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cosmic-chronicle-feeds.opml'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setSuccessMessage(`Exported ${response.feed_count} feeds`)
    } catch (err: any) {
      setError(err?.message || 'Failed to export OPML')
    }
  }

  const displayedFeeds = showAllFeeds ? feeds : feeds.slice(0, 5)

  if (isLoading && feeds.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-cosmic-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Feeds Overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-cosmic-400" />
          <span className="text-sm font-medium">{feeds.length} Subscriptions</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing || feeds.length === 0}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh All
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-700/30">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-950/20 border border-green-700/30">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Add New Feed */}
      <div className="p-4 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30">
        <h4 className="text-sm font-medium mb-3">Add New Feed</h4>
        <div className="space-y-3">
          <Input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            disabled={isDiscovering}
          />
          <div className="flex gap-2">
            <Input
              type="text"
              value={newFeedCategory}
              onChange={(e) => setNewFeedCategory(e.target.value)}
              placeholder="Category (optional)"
              className="flex-1"
              disabled={isDiscovering}
            />
            <Button
              onClick={handleAddFeed}
              disabled={isDiscovering || !newFeedUrl.trim()}
            >
              {isDiscovering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Subscribe
            </Button>
          </div>
        </div>
      </div>

      {/* Current Feeds List */}
      {feeds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Your Feeds</h4>
          <div className="space-y-2">
            {displayedFeeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between p-3 rounded-lg bg-cosmic-900/20 border border-cosmic-700/20"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {feed.icon_url ? (
                    <img
                      src={feed.icon_url}
                      alt=""
                      className="h-5 w-5 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <Rss className="h-5 w-5 text-gray-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {feed.title}
                      </span>
                      {!feed.is_healthy && (
                        <span title={feed.last_error || 'Feed has errors'}>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {feed.category && (
                        <span className="px-1.5 py-0.5 rounded bg-cosmic-800 text-cosmic-300">
                          {feed.category}
                        </span>
                      )}
                      <span>{feed.article_count} articles</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {feed.site_url && (
                    <a
                      href={feed.site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-gray-300"
                      title="Visit site"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteFeed(feed.id, feed.title)}
                    className="p-1 text-gray-400 hover:text-red-400"
                    title="Unsubscribe"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {feeds.length > 5 && (
            <button
              onClick={() => setShowAllFeeds(!showAllFeeds)}
              className="flex items-center gap-1 text-sm text-cosmic-400 hover:text-cosmic-300"
            >
              {showAllFeeds ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show all {feeds.length} feeds
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {feeds.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-400">
          <Rss className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No feeds yet. Add your first subscription above!</p>
        </div>
      )}

      {/* OPML Import/Export */}
      <div className="p-4 rounded-lg bg-cosmic-900/30 border border-cosmic-700/30">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Import / Export</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(!showImport)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import OPML
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportOpml}
              disabled={feeds.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export OPML
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          OPML is a standard format for sharing feed subscriptions between apps.
        </p>

        {showImport && (
          <div className="space-y-3 mt-4 pt-4 border-t border-cosmic-700/30">
            <textarea
              value={opmlContent}
              onChange={(e) => setOpmlContent(e.target.value)}
              placeholder="Paste your OPML content here..."
              className="w-full h-32 p-3 rounded-lg bg-cosmic-800 border border-cosmic-700 text-sm font-mono resize-none"
              disabled={isImporting}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowImport(false)
                  setOpmlContent('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleImportOpml}
                disabled={isImporting || !opmlContent.trim()}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Import
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-950/30 to-cosmic-900/30 border border-blue-700/20">
        <h4 className="text-sm font-medium mb-2 text-blue-300">
          About RSS Feeds
        </h4>
        <p className="text-xs text-gray-300">
          Subscribe to any blog, news site, podcast, or newsletter. Your feeds sync locally and
          articles appear in the Chronicle newspaper alongside historical news sources.
          Reading patterns stay private on your device.
        </p>
      </div>
    </div>
  )
}
