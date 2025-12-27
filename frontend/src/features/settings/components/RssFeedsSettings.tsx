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
  Sparkles,
  Newspaper,
  Leaf,
  Cpu,
  Music,
  Briefcase,
  Trophy,
} from 'lucide-react'

/**
 * Curated feed suggestions organized by category
 */
const SUGGESTED_FEEDS = {
  'Oregon Ducks': {
    icon: Trophy,
    color: 'text-green-400',
    feeds: [
      { url: 'https://www.addictedtoquack.com/rss/index.xml', title: 'Addicted to Quack', description: 'In-depth Oregon Ducks coverage and analysis' },
      { url: 'https://media.rss.com/ducksrisingpodcast/feed.xml', title: 'Ducks Rising Podcast', description: 'Weekly Oregon football podcast' },
      { url: 'https://247sports.com/college/oregon/Team.rss', title: '247Sports Oregon', description: 'Ducks recruiting and news' },
    ]
  },
  'Plants & Gardening': {
    icon: Leaf,
    color: 'text-emerald-400',
    feeds: [
      { url: 'https://www.terrariumtribe.com/feed/', title: 'Terrarium Tribe', description: 'Terrarium guides and inspiration' },
      { url: 'https://www.ohiotropics.com/feed/', title: 'Ohio Tropics', description: 'Tropical houseplants and orchids' },
      { url: 'https://www.epicgardening.com/feed/', title: 'Epic Gardening', description: 'Urban gardening for everyone' },
      { url: 'https://www.guide-to-houseplants.com/house-plants-blog.xml', title: 'Guide to Houseplants', description: 'Care tips and plant encyclopedia' },
      { url: 'https://www.janeperrone.com/on-the-ledge?format=rss', title: 'On The Ledge', description: 'Houseplant podcast by Jane Perrone' },
    ]
  },
  'Bonsai': {
    icon: Leaf,
    color: 'text-lime-400',
    feeds: [
      { url: 'https://bonsaitonight.com/feed/', title: 'Bonsai Tonight', description: 'Professional bonsai care and styling' },
      { url: 'https://crataegus.com/blog/feed/', title: 'Crataegus Bonsai', description: 'Michael Hagedorn\'s bonsai insights' },
      { url: 'https://adamaskwhy.com/feed/', title: 'Adam\'s Art and Bonsai', description: 'Bonsai workshops and demonstrations' },
      { url: 'https://www.kaizenbonsai.com/blog/feed/', title: 'Kaizen Bonsai', description: 'UK bonsai supplies and guides' },
      { url: 'https://yamadori.co.uk/blog/feed/', title: 'Yamadori Bonsai', description: 'Collecting and styling native trees' },
    ]
  },
  'Tech News': {
    icon: Cpu,
    color: 'text-blue-400',
    feeds: [
      { url: 'https://techcrunch.com/feed/', title: 'TechCrunch', description: 'Startup and technology news' },
      { url: 'https://www.theverge.com/rss/index.xml', title: 'The Verge', description: 'Tech, science, art, and culture' },
      { url: 'https://www.wired.com/feed/rss', title: 'Wired', description: 'Technology and culture magazine' },
      { url: 'https://arstechnica.com/feed/', title: 'Ars Technica', description: 'In-depth tech analysis' },
      { url: 'https://feeds.macrumors.com/MacRumors-All', title: 'MacRumors', description: 'Apple news and rumors' },
      { url: 'https://www.androidcentral.com/feed', title: 'Android Central', description: 'Android news and reviews' },
      { url: 'https://news.ycombinator.com/rss', title: 'Hacker News', description: 'Tech and startup community' },
    ]
  },
  'Music': {
    icon: Music,
    color: 'text-purple-400',
    feeds: [
      { url: 'https://pitchfork.com/feed/feed-news/rss', title: 'Pitchfork News', description: 'Music news and reviews' },
      { url: 'https://www.stereogum.com/feed/', title: 'Stereogum', description: 'Indie and alternative music' },
      { url: 'https://www.billboard.com/feed/', title: 'Billboard', description: 'Music industry news and charts' },
      { url: 'https://www.nme.com/news/music/feed', title: 'NME', description: 'Music news and reviews' },
      { url: 'https://indieshuffle.com/feed/', title: 'Indie Shuffle', description: 'Discover new indie music' },
      { url: 'https://edmidentity.com/feed/', title: 'EDM Identity', description: 'Electronic dance music' },
      { url: 'https://www.albumoftheyear.org/rss/releases.xml', title: 'Album of the Year', description: 'New album releases' },
    ]
  },
  'Business & Startups': {
    icon: Briefcase,
    color: 'text-amber-400',
    feeds: [
      { url: 'https://feeds.hbr.org/harvardbusiness', title: 'Harvard Business Review', description: 'Business insights and analysis' },
      { url: 'https://www.entrepreneur.com/latest.rss', title: 'Entrepreneur', description: 'Startup advice and news' },
      { url: 'https://steveblank.com/feed/', title: 'Steve Blank', description: 'Lean startup methodology' },
      { url: 'https://feld.com/feed', title: 'Brad Feld', description: 'VC insights and startup advice' },
      { url: 'https://seths.blog/feed/', title: 'Seth Godin', description: 'Marketing and business wisdom' },
      { url: 'https://www.fastcompany.com/latest/rss', title: 'Fast Company', description: 'Business innovation' },
      { url: 'https://a16z.com/feed/', title: 'a16z Blog', description: 'Andreessen Horowitz insights' },
    ]
  },
  'General News': {
    icon: Newspaper,
    color: 'text-gray-400',
    feeds: [
      { url: 'https://www.theguardian.com/world/rss', title: 'The Guardian - World', description: 'International news' },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', title: 'NY Times', description: 'News from the New York Times' },
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', title: 'BBC World', description: 'World news from BBC' },
      { url: 'https://www.npr.org/rss/rss.php?id=1001', title: 'NPR News', description: 'National Public Radio news' },
      { url: 'https://www.reuters.com/rssFeed/worldNews', title: 'Reuters World', description: 'Global news coverage' },
    ]
  },
}
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

  // Discover feeds section
  const [showDiscover, setShowDiscover] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [addingFeed, setAddingFeed] = useState<string | null>(null)

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

  const handleAddSuggestedFeed = async (
    feedUrl: string,
    feedTitle: string,
    category: string
  ) => {
    clearFeedback()
    setAddingFeed(feedUrl)
    try {
      // Try to discover the feed first
      let title = feedTitle
      let description: string | undefined
      let siteUrl: string | undefined
      let iconUrl: string | undefined

      try {
        const discovery = await discoverFeed(feedUrl)
        title = discovery.title || feedTitle
        description = discovery.description || undefined
        siteUrl = discovery.site_url || undefined
        iconUrl = discovery.icon_url || undefined
      } catch {
        // If discovery fails, use provided title
      }

      await createFeed({
        url: feedUrl,
        title,
        description,
        site_url: siteUrl,
        icon_url: iconUrl,
        category,
      })

      setSuccessMessage(`Subscribed to "${title}"`)
      await loadFeeds()
    } catch (err: any) {
      setError(err?.message || 'Failed to add feed')
    } finally {
      setAddingFeed(null)
    }
  }

  // Check if a feed URL is already subscribed
  const isSubscribed = (url: string) => {
    return feeds.some(f => f.url === url)
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

      {/* Discover Feeds */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-cosmic-900/40 to-purple-900/20 border border-purple-700/30">
        <button
          onClick={() => setShowDiscover(!showDiscover)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h4 className="text-sm font-medium">Discover Feeds</h4>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-xs text-purple-300">
              {Object.values(SUGGESTED_FEEDS).reduce((acc, cat) => acc + cat.feeds.length, 0)} curated
            </span>
          </div>
          {showDiscover ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {showDiscover && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-400">
              Browse curated feeds by category. Click + to subscribe.
            </p>

            {Object.entries(SUGGESTED_FEEDS).map(([categoryName, category]) => {
              const CategoryIcon = category.icon
              const isExpanded = expandedCategory === categoryName

              return (
                <div
                  key={categoryName}
                  className="rounded-lg bg-cosmic-800/30 border border-cosmic-700/30 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : categoryName)}
                    className="w-full flex items-center justify-between p-3 hover:bg-cosmic-700/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={`h-4 w-4 ${category.color}`} />
                      <span className="text-sm font-medium">{categoryName}</span>
                      <span className="text-xs text-gray-500">
                        ({category.feeds.length} feeds)
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {category.feeds.map((feed) => {
                        const subscribed = isSubscribed(feed.url)
                        const isAdding = addingFeed === feed.url

                        return (
                          <div
                            key={feed.url}
                            className="flex items-center justify-between p-2 rounded bg-cosmic-900/30"
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-sm font-medium truncate">{feed.title}</p>
                              <p className="text-xs text-gray-500 truncate">{feed.description}</p>
                            </div>
                            {subscribed ? (
                              <span className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-xs text-green-400">
                                <Check className="h-3 w-3" />
                                Added
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddSuggestedFeed(feed.url, feed.title, categoryName)}
                                disabled={isAdding}
                                className="h-7 px-2"
                              >
                                {isAdding ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
