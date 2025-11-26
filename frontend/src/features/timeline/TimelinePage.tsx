/**
 * Timeline Page - Transit timeline with personal events
 *
 * Part of Phase 2: Transit Timeline
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
  Calendar,
  Edit3,
  Trash2,
  X,
  Save,
  Sparkles,
  Clock,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  AnimatedCard,
  Button,
  Badge,
} from '@/components/ui'
import { useTimelineStore } from '@/store/timelineStore'
import { listBirthData, type BirthDataResponse } from '@/lib/api/birthData'

// Importance color mapping
const importanceColors: Record<string, string> = {
  minor: 'text-gray-400 border-gray-400/30',
  moderate: 'text-blue-400 border-blue-400/30',
  major: 'text-celestial-gold border-celestial-gold/30',
  transformative: 'text-celestial-pink border-celestial-pink/30',
}

// Category icons/colors
const categoryStyles: Record<string, { color: string; label: string }> = {
  career: { color: 'bg-blue-500/20 text-blue-400', label: '💼' },
  relationship: { color: 'bg-pink-500/20 text-pink-400', label: '💕' },
  health: { color: 'bg-green-500/20 text-green-400', label: '🌿' },
  spiritual: { color: 'bg-purple-500/20 text-purple-400', label: '✨' },
  travel: { color: 'bg-cyan-500/20 text-cyan-400', label: '✈️' },
  financial: { color: 'bg-yellow-500/20 text-yellow-400', label: '💰' },
  creative: { color: 'bg-orange-500/20 text-orange-400', label: '🎨' },
  education: { color: 'bg-indigo-500/20 text-indigo-400', label: '📚' },
  family: { color: 'bg-red-500/20 text-red-400', label: '👨‍👩‍👧' },
  personal: { color: 'bg-teal-500/20 text-teal-400', label: '🌟' },
}

export function TimelinePage() {
  const {
    events,
    currentEvent,
    timelineData,
    isLoading,
    isEditing,
    error,
    viewStartDate,
    viewEndDate,
    importanceLevels,
    fetchEvents,
    fetchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchTimelineRange,
    setBirthDataId,
    setViewRange,
    setEditing,
    clearCurrentEvent,
    clearError,
  } = useTimelineStore()

  // Birth data selection
  const [birthDataList, setBirthDataList] = useState<BirthDataResponse[]>([])
  const [selectedBirthDataId, setSelectedBirthDataId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<{
    title: string
    description: string
    event_date: string
    event_time: string
    category: string
    importance: 'minor' | 'moderate' | 'major' | 'transformative'
    tags: string[]
    is_recurring: boolean
  }>({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '',
    category: 'personal',
    importance: 'moderate',
    tags: [],
    is_recurring: false,
  })

  // Fetch birth data on mount
  useEffect(() => {
    const fetchBirthData = async () => {
      try {
        const data = await listBirthData()
        setBirthDataList(data)
        if (data.length > 0 && !selectedBirthDataId) {
          setSelectedBirthDataId(data[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch birth data:', err)
      }
    }
    fetchBirthData()
  }, [selectedBirthDataId])

  // Fetch timeline when birth data or date range changes
  useEffect(() => {
    if (selectedBirthDataId) {
      setBirthDataId(selectedBirthDataId)
      fetchTimelineRange(selectedBirthDataId, viewStartDate, viewEndDate)
      fetchEvents({ birth_data_id: selectedBirthDataId })
    }
  }, [selectedBirthDataId, viewStartDate, viewEndDate, fetchTimelineRange, fetchEvents, setBirthDataId])

  // Update form when editing existing event
  useEffect(() => {
    if (currentEvent && isEditing) {
      setFormData({
        title: currentEvent.title,
        description: currentEvent.description || '',
        event_date: currentEvent.event_date,
        event_time: currentEvent.event_time || '',
        category: currentEvent.category || 'personal',
        importance: currentEvent.importance || 'moderate',
        tags: currentEvent.tags || [],
        is_recurring: currentEvent.is_recurring,
      })
    }
  }, [currentEvent, isEditing])

  // Handle new event
  const handleNewEvent = () => {
    clearCurrentEvent()
    setFormData({
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      event_time: '',
      category: 'personal',
      importance: 'moderate',
      tags: [],
      is_recurring: false,
    })
    setEditing(true)
  }

  // Handle save
  const handleSave = async () => {
    if (!formData.title.trim() || !selectedBirthDataId) return

    try {
      if (currentEvent) {
        await updateEvent(currentEvent.id, formData)
      } else {
        await createEvent({
          ...formData,
          birth_data_id: selectedBirthDataId,
        })
      }
      setEditing(false)
      clearCurrentEvent()
    } catch (err) {
      // Error is handled in store
    }
  }

  // Handle delete
  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(eventId)
    }
  }

  // Handle cancel editing
  const handleCancel = () => {
    setEditing(false)
    clearCurrentEvent()
  }

  // Navigate month
  const navigateMonth = (direction: 'prev' | 'next') => {
    const start = new Date(viewStartDate)
    if (direction === 'prev') {
      start.setMonth(start.getMonth() - 1)
    } else {
      start.setMonth(start.getMonth() + 1)
    }
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    setViewRange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    )
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatMonthYear = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

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
              Transit Timeline
            </h1>
            <p className="text-gray-400 mt-2">
              Track your life events alongside celestial movements
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Birth data selector */}
            <select
              value={selectedBirthDataId || ''}
              onChange={e => setSelectedBirthDataId(e.target.value)}
              className="px-4 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                       text-white focus:outline-none focus:border-celestial-gold/50"
            >
              {birthDataList.map(bd => (
                <option key={bd.id} value={bd.id}>
                  {bd.city || 'Unknown'} - {bd.birth_date}
                </option>
              ))}
            </select>
            {!isEditing && (
              <Button onClick={handleNewEvent} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between"
        >
          <span className="text-red-400">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-heading text-white min-w-[200px] text-center">
          {formatMonthYear(viewStartDate)}
        </h2>
        <Button variant="ghost" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline view */}
        <div className={`lg:col-span-2 ${isEditing ? 'hidden lg:block' : ''}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Events & Transits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Loading timeline...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No events in this period</p>
                  <Button onClick={handleNewEvent} variant="ghost" className="mt-4">
                    Add your first event
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-cosmic-light/20" />

                  {/* Events */}
                  <div className="space-y-4 pl-12">
                    <AnimatePresence>
                      {events.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative"
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-12 top-4 w-3 h-3 rounded-full border-2 bg-cosmic-dark
                                      ${importanceColors[event.importance]}`}
                          />

                          <AnimatedCard
                            onClick={() => fetchEvent(event.id)}
                            className={`cursor-pointer hover:border-celestial-gold/30 transition-colors
                                      ${currentEvent?.id === event.id ? 'border-celestial-gold/50' : ''}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {event.category && categoryStyles[event.category] && (
                                      <span className={`px-2 py-0.5 rounded text-xs ${categoryStyles[event.category].color}`}>
                                        {categoryStyles[event.category].label} {event.category}
                                      </span>
                                    )}
                                    <Badge variant="outline" className={importanceColors[event.importance]}>
                                      {event.importance}
                                    </Badge>
                                  </div>
                                  <h3 className="font-medium text-white">{event.title}</h3>
                                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(event.event_date)}
                                    {event.event_time && ` at ${event.event_time}`}
                                  </p>
                                  {event.description && (
                                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={e => {
                                      e.stopPropagation()
                                      fetchEvent(event.id)
                                      setEditing(true)
                                    }}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleDelete(event.id)
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Transit analysis preview */}
                              {event.transit_analysis && (
                                <div className="mt-3 pt-3 border-t border-cosmic-light/10">
                                  <p className="text-xs text-celestial-gold flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Transit Analysis Available
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </AnimatedCard>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event Editor/Info Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Edit3 className="h-5 w-5" />
                        {currentEvent ? 'Edit Event' : 'New Event'}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Title *</label>
                      <input
                        type="text"
                        placeholder="What happened?"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                 text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50"
                      />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Date *</label>
                        <input
                          type="date"
                          value={formData.event_date}
                          onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                          className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                   text-white focus:outline-none focus:border-celestial-gold/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Time</label>
                        <input
                          type="time"
                          value={formData.event_time}
                          onChange={e => setFormData(prev => ({ ...prev, event_time: e.target.value }))}
                          className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                   text-white focus:outline-none focus:border-celestial-gold/50"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                 text-white focus:outline-none focus:border-celestial-gold/50"
                      >
                        {Object.entries(categoryStyles).map(([cat, style]) => (
                          <option key={cat} value={cat}>
                            {style.label} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Importance */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Importance</label>
                      <div className="flex gap-2">
                        {importanceLevels.map(level => (
                          <button
                            key={level}
                            onClick={() => setFormData(prev => ({ ...prev, importance: level as typeof prev.importance }))}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm capitalize transition-colors
                                      ${formData.importance === level
                                        ? 'border-celestial-gold bg-celestial-gold/20 text-white'
                                        : 'border-cosmic-light/20 text-gray-500 hover:border-celestial-gold/30'
                                      }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        placeholder="Describe the event..."
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                 text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50
                                 resize-none"
                      />
                    </div>

                    {/* Save button */}
                    <Button
                      onClick={handleSave}
                      disabled={!formData.title.trim()}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Event
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-celestial-gold" />
                      Upcoming Transits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timelineData?.upcoming_significant_transits &&
                    timelineData.upcoming_significant_transits.length > 0 ? (
                      <div className="space-y-3">
                        {timelineData.upcoming_significant_transits.map((transit, i) => (
                          <div
                            key={i}
                            className="p-3 bg-cosmic-dark/30 rounded-lg border border-cosmic-light/10"
                          >
                            <p className="text-sm text-white">{String(transit.name || 'Transit')}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {String(transit.description || '')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No significant transits detected for this period.
                        <br />
                        <span className="text-xs">Transit analysis coming soon!</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default TimelinePage
