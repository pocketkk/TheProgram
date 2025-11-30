/**
 * Timeline Page - Walk Through Time
 *
 * Calendar view with historical newspaper, transits, and journal integration.
 * Part of Phase 3: Timeline Feature
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Loader2, Newspaper, Database, Globe, Sparkles, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useTimelineViewStore } from './stores/timelineViewStore'
import { useJournalStore } from '@/store/journalStore'
import { useTransitStore } from '@/store/transitStore'
import { MonthHeader } from './components/MonthView/MonthHeader'
import { CalendarGrid } from './components/MonthView/CalendarGrid'
import { DayViewLayout } from './components/DayView/DayViewLayout'
import { NewspaperFrame } from './components/Newspaper/NewspaperFrame'
import { TransitChartWidget } from './components/TransitWidget/TransitChartWidget'
import { JournalEditor } from './components/JournalSidebar/JournalEditor'
import type { DayIndicators } from './components/MonthView/types'
import type { NewspaperContent } from './components/Newspaper/types'
import { useUserProfileStore } from '@/store/userProfileStore'
import { authApi } from '@/lib/api/auth'
import {
  getNewspaper,
  streamYearSpecificNewspaper,
  type NewspaperResponse,
  type NewspaperProgressEvent,
  type NewspaperSourceCompleteEvent
} from '@/lib/api/timelineHistorical'

// Progress state for streaming newspaper generation
interface NewspaperLoadingState {
  isLoading: boolean
  progress: number
  currentStep: string
  message: string
  sources: {
    guardian: { fetched: boolean; success: boolean; count: number }
    nyt: { fetched: boolean; success: boolean; count: number }
    wikipedia: { fetched: boolean; success: boolean; count: number }
  }
}

/**
 * TimelinePage - Main timeline calendar interface
 *
 * Features:
 * - Month calendar view with indicators for transits, events, and journals
 * - Day view with newspaper, transit chart, and journal widgets
 * - Guide agent navigation support via custom events
 * - Integration with journalStore and transitStore
 */
export function TimelinePage() {
  const {
    currentMonth,
    currentYear,
    selectedDay,
    nextMonth,
    prevMonth,
    goToToday,
    selectDay,
    setNewspaperStyle,
  } = useTimelineViewStore()

  const { entries, fetchEntries } = useJournalStore()
  const { setBirthDataId, setTransitDate } = useTransitStore()

  // Get primary birth data from user profile
  const { profile, loadProfile, isLoaded: profileLoaded } = useUserProfileStore()
  const birthDataId = profile.birthDataId

  // Day indicators (transits, events, journals)
  const [dayData, setDayData] = useState<Record<string, DayIndicators>>({})
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false)

  // Newspaper data with streaming progress
  const [newspaperData, setNewspaperData] = useState<NewspaperContent | null>(null)
  const [loadingState, setLoadingState] = useState<NewspaperLoadingState>({
    isLoading: false,
    progress: 0,
    currentStep: '',
    message: '',
    sources: {
      guardian: { fetched: false, success: false, count: 0 },
      nyt: { fetched: false, success: false, count: 0 },
      wikipedia: { fetched: false, success: false, count: 0 }
    }
  })
  const streamCleanupRef = useRef<(() => void) | null>(null)

  // Load newspaper style preference on mount
  useEffect(() => {
    const loadNewspaperPreference = async () => {
      try {
        const response = await authApi.getNewspaperStyle()
        setNewspaperStyle(response.style as 'victorian' | 'modern')
      } catch (err) {
        console.error('Failed to load newspaper style preference:', err)
        // Default to modern if loading fails
      }
    }
    loadNewspaperPreference()
  }, [setNewspaperStyle])

  // Load user profile on mount and sync birth data ID
  useEffect(() => {
    if (!profileLoaded) {
      loadProfile()
    }
  }, [profileLoaded, loadProfile])

  useEffect(() => {
    if (birthDataId) {
      setBirthDataId(birthDataId)
    }
  }, [birthDataId, setBirthDataId])

  // Listen for Guide navigation events
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ date: string }>
      selectDay(customEvent.detail.date)
    }
    window.addEventListener('companion-navigate-timeline', handleNavigate)
    return () => window.removeEventListener('companion-navigate-timeline', handleNavigate)
  }, [selectDay])

  // Fetch day indicators for the current month
  useEffect(() => {
    if (!birthDataId) return

    const fetchDayIndicators = async () => {
      setIsLoadingIndicators(true)
      try {
        // Calculate month range
        const startDate = new Date(currentYear, currentMonth, 1)
        const endDate = new Date(currentYear, currentMonth + 1, 0)
        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        // Fetch journal entries for the month
        await fetchEntries({
          date_from: startDateStr,
          date_to: endDateStr,
        })

        // Build day indicators
        const indicators: Record<string, DayIndicators> = {}

        // Add journal indicators from store entries
        entries.forEach((entry) => {
          const date = entry.entry_date
          if (!indicators[date]) {
            indicators[date] = {}
          }
          indicators[date].hasJournal = true
        })

        // TODO: Add transit indicators from transitStore
        // TODO: Add event indicators from timelineStore (if we have events)

        setDayData(indicators)
      } catch (error) {
        console.error('Failed to fetch day indicators:', error)
      } finally {
        setIsLoadingIndicators(false)
      }
    }

    fetchDayIndicators()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear, birthDataId])

  // Get newspaper style from store
  const { newspaperStyle } = useTimelineViewStore()

  // Transform API response to component format
  const transformResponse = useCallback((response: NewspaperResponse): NewspaperContent => ({
    headline: response.headline,
    date_display: response.date_display,
    style: response.style as 'victorian' | 'modern',
    sections: response.sections.map(section => ({
      name: section.name,
      articles: section.articles.map(article => ({
        headline: article.headline,
        content: article.content,
        year: article.year,
        significance: article.significance,
        source: article.source as 'guardian' | 'nyt' | 'wikipedia' | 'system' | undefined
      }))
    }))
  }), [])

  // Handle streaming progress events
  const handleProgress = useCallback((event: NewspaperProgressEvent) => {
    setLoadingState(prev => ({
      ...prev,
      progress: event.percent,
      currentStep: event.step,
      message: event.message
    }))
  }, [])

  // Handle source complete events
  const handleSourceComplete = useCallback((event: NewspaperSourceCompleteEvent) => {
    setLoadingState(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [event.source]: {
          fetched: true,
          success: event.success,
          count: event.article_count
        }
      }
    }))
  }, [])

  // Fetch newspaper data when day is selected (with streaming for past dates)
  useEffect(() => {
    // Cleanup previous stream if any
    if (streamCleanupRef.current) {
      streamCleanupRef.current()
      streamCleanupRef.current = null
    }

    if (!selectedDay) {
      setNewspaperData(null)
      return
    }

    // Parse the date
    const dateObj = new Date(selectedDay)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()

    // Check if date is in the future
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isFutureDate = dateObj > today

    // Reset loading state
    setLoadingState({
      isLoading: true,
      progress: 0,
      currentStep: 'starting',
      message: 'Initializing...',
      sources: {
        guardian: { fetched: false, success: false, count: 0 },
        nyt: { fetched: false, success: false, count: 0 },
        wikipedia: { fetched: false, success: false, count: 0 }
      }
    })

    if (isFutureDate) {
      // For future dates, use non-streaming "On This Day" endpoint
      const fetchOnThisDay = async () => {
        try {
          const response = await getNewspaper(month, day, newspaperStyle)
          setNewspaperData(transformResponse(response))
        } catch (error) {
          console.error('Failed to fetch newspaper:', error)
          setNewspaperData({
            headline: 'The Cosmic Chronicle',
            date_display: dateObj.toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            }),
            style: newspaperStyle,
            sections: [{
              name: 'FRONT PAGE',
              articles: [{
                headline: 'Unable to Load Events',
                content: 'Please try again later or check your connection.',
                year: year,
                significance: 'Connection issue'
              }]
            }]
          })
        } finally {
          setLoadingState(prev => ({ ...prev, isLoading: false, progress: 100 }))
        }
      }
      fetchOnThisDay()
    } else {
      // For past dates, use streaming endpoint
      const cleanup = streamYearSpecificNewspaper(
        year, month, day, newspaperStyle,
        {
          onProgress: handleProgress,
          onSourceComplete: handleSourceComplete,
          onComplete: (newspaper) => {
            setNewspaperData(transformResponse(newspaper))
            setLoadingState(prev => ({
              ...prev,
              isLoading: false,
              progress: 100,
              message: 'Complete!'
            }))
          },
          onError: (error) => {
            console.error('Streaming error:', error)
            setNewspaperData({
              headline: 'The Cosmic Chronicle',
              date_display: dateObj.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              }),
              style: newspaperStyle,
              sections: [{
                name: 'FRONT PAGE',
                articles: [{
                  headline: 'Generation Error',
                  content: error || 'Unable to generate newspaper. Please try again.',
                  year: year,
                  significance: 'Error occurred'
                }]
              }]
            })
            setLoadingState(prev => ({ ...prev, isLoading: false }))
          }
        }
      )
      streamCleanupRef.current = cleanup
    }

    // Cleanup on unmount or day change
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
        streamCleanupRef.current = null
      }
    }
  }, [selectedDay, newspaperStyle, transformResponse, handleProgress, handleSourceComplete])

  // Update transit date when day is selected
  useEffect(() => {
    if (selectedDay) {
      setTransitDate(selectedDay)
    }
  }, [selectedDay, setTransitDate])

  // Handle day click
  const handleDayClick = (date: string) => {
    selectDay(date)
  }

  // Handle close day view
  const handleCloseDayView = () => {
    selectDay(null)
  }

  // Handle go to specific date
  const handleGoToDate = () => {
    // TODO: Implement date picker dialog
    console.log('Go to date dialog not yet implemented')
  }

  // Format month/year for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gradient-celestial flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-celestial-gold" />
              Walk Through Time
            </h1>
            <p className="text-gray-400 mt-2">
              Explore history, transits, and your journey
            </p>
          </div>
          {/* Profile indicator */}
          {profile.birthLocation && (
            <div className="flex items-center gap-2 px-3 py-1.5 glass-subtle rounded-lg">
              <div className="w-2 h-2 rounded-full bg-celestial-gold animate-pulse" />
              <span className="text-sm text-cosmic-200">
                {profile.birthLocation}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Calendar or Day View */}
      {selectedDay ? (
        <DayViewLayout
          date={selectedDay}
          onClose={handleCloseDayView}
          transitWidget={
            birthDataId ? (
              <TransitChartWidget date={selectedDay} birthDataId={birthDataId} />
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                Set up your birth data in settings to view transits
              </div>
            )
          }
          journalWidget={<JournalEditor date={selectedDay} />}
        >
          {loadingState.isLoading ? (
            <div className="flex items-center justify-center min-h-[600px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 bg-cosmic-dark/80 backdrop-blur-sm rounded-xl border border-cosmic-light/20"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <Newspaper className="h-8 w-8 text-celestial-gold" />
                  <h3 className="text-xl font-heading text-white">Generating Newspaper</h3>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>{loadingState.message}</span>
                    <span>{loadingState.progress}%</span>
                  </div>
                  <div className="h-2 bg-cosmic-light/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-celestial-gold to-amber-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${loadingState.progress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Source status */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">News Sources</p>

                  {/* Guardian */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between py-2 border-b border-cosmic-light/10"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-300">The Guardian</span>
                    </div>
                    {loadingState.sources.guardian.fetched ? (
                      loadingState.sources.guardian.success ? (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{loadingState.sources.guardian.count} articles</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <XCircle className="h-4 w-4" />
                          <span>No data</span>
                        </div>
                      )
                    ) : loadingState.currentStep === 'guardian' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    ) : (
                      <span className="text-xs text-gray-600">Waiting...</span>
                    )}
                  </motion.div>

                  {/* NYT */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-between py-2 border-b border-cosmic-light/10"
                  >
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-gray-300">New York Times</span>
                    </div>
                    {loadingState.sources.nyt.fetched ? (
                      loadingState.sources.nyt.success ? (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{loadingState.sources.nyt.count} articles</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <XCircle className="h-4 w-4" />
                          <span>No data</span>
                        </div>
                      )
                    ) : loadingState.currentStep === 'nyt' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <span className="text-xs text-gray-600">Waiting...</span>
                    )}
                  </motion.div>

                  {/* Wikipedia */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between py-2 border-b border-cosmic-light/10"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-stone-400" />
                      <span className="text-sm text-gray-300">Wikipedia</span>
                    </div>
                    {loadingState.sources.wikipedia.fetched ? (
                      loadingState.sources.wikipedia.success ? (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{loadingState.sources.wikipedia.count} events</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <XCircle className="h-4 w-4" />
                          <span>No data</span>
                        </div>
                      )
                    ) : loadingState.currentStep === 'wikipedia' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                    ) : (
                      <span className="text-xs text-gray-600">Waiting...</span>
                    )}
                  </motion.div>
                </div>

                {/* AI Generation indicator */}
                {(loadingState.currentStep === 'synthesis' || loadingState.currentStep === 'generating') && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex items-center gap-3 p-3 bg-celestial-gold/10 rounded-lg border border-celestial-gold/20"
                  >
                    <Sparkles className="h-5 w-5 text-celestial-gold animate-pulse" />
                    <span className="text-sm text-celestial-gold">AI is crafting your newspaper...</span>
                  </motion.div>
                )}
              </motion.div>
            </div>
          ) : newspaperData ? (
            <NewspaperFrame content={newspaperData} isLoading={false} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No newspaper data available for this date
            </div>
          )}
        </DayViewLayout>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <MonthHeader
                month={currentMonth}
                year={currentYear}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onToday={goToToday}
                onGoToDate={handleGoToDate}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingIndicators ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-celestial-gold" />
              </div>
            ) : (
              <CalendarGrid
                month={currentMonth}
                year={currentYear}
                onDayClick={handleDayClick}
                selectedDay={selectedDay}
                dayData={dayData}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TimelinePage
