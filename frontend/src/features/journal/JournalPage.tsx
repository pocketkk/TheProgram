/**
 * Journal Page - Personal consciousness exploration journal
 *
 * Part of Phase 2: Journal System
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Tag,
  Smile,
  Edit3,
  Trash2,
  X,
  Save,
  ChevronLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
import { useJournalStore } from '@/store/journalStore'
import { apiClient } from '@/lib/api/client'
import * as journalApi from '@/lib/api/journal'

// Helper to get local date in YYYY-MM-DD format (avoids UTC timezone issues)
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Mood emoji mapping
const moodEmojis: Record<string, string> = {
  reflective: '🤔',
  anxious: '😰',
  inspired: '✨',
  peaceful: '😌',
  curious: '🧐',
  melancholic: '😢',
  joyful: '😊',
  contemplative: '💭',
  energized: '⚡',
  confused: '😵',
  grateful: '🙏',
  frustrated: '😤',
  hopeful: '🌟',
  neutral: '😐',
  overwhelmed: '😵‍💫',
}

// Writing prompts keyed by moon phase name (matches backend phase strings exactly)
const MOON_PROMPTS: Record<string, string[]> = {
  'New Moon': [
    'What intentions are you setting as this lunar cycle begins?',
    'What are you ready to start fresh with?',
    'What seed are you planting in the dark?',
  ],
  'Waxing Crescent': [
    'What small steps are you taking toward your intentions?',
    'Where do you feel momentum building in your life?',
    'What courage is being asked of you right now?',
  ],
  'First Quarter': [
    'What obstacles are you encountering on your path, and how are you meeting them?',
    'What decisions are you being called to make this week?',
    'What needs adjustment or re-direction in a project or relationship?',
  ],
  'Waxing Gibbous': [
    'What is refining itself in you — a skill, a belief, a relationship?',
    'Where are you close to a breakthrough and what final effort is needed?',
    'What are you perfecting or putting the finishing touches on?',
  ],
  'Full Moon': [
    'What has come to fruition or completion lately?',
    'What needs releasing — a habit, a belief, a relationship pattern?',
    'What feels illuminated or revealed right now?',
  ],
  'Waning Gibbous': [
    'What wisdom or insight are you integrating from recent experiences?',
    'Who or what are you feeling grateful for, and why?',
    'What have you learned that you want to pass along to others?',
  ],
  'Last Quarter': [
    'What are you releasing or forgiving — in yourself or someone else?',
    'What structures or patterns in your life no longer serve you?',
    'What does a clean slate in one area of your life look like?',
  ],
  'Waning Crescent': [
    'What needs rest, withdrawal, or quiet reflection right now?',
    'What are you preparing for in the next cycle of your life?',
    'What dreams or visions are visiting you in this liminal time?',
  ],
}

// Compute consecutive-day writing streak from today backwards
function computeStreak(entries: journalApi.JournalEntry[]): number {
  const entryDates = new Set(entries.map(e => e.entry_date))
  let streak = 0
  const checkDate = new Date()

  // If today has no entry, start from yesterday
  if (!entryDates.has(getLocalDateString(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (entryDates.has(getLocalDateString(checkDate))) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}

type FormData = {
  title: string
  content: string
  mood: string
  mood_score: number
  tags: string[]
  entry_date: string
}

export function JournalPage() {
  const {
    entries,
    currentEntry,
    isLoading,
    isEditing,
    error,
    searchQuery,
    allTags,
    fetchEntries,
    fetchEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    setSearchQuery,
    setEditing,
    clearCurrentEntry,
    fetchAllTags,
    clearError,
  } = useJournalStore()

  // Local form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    mood: '',
    mood_score: 5,
    tags: [] as string[],
    entry_date: getLocalDateString(),
  })
  const [newTag, setNewTag] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  // Autosave state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isDirty, setIsDirty] = useState(false)
  // Tracks ID of the entry last saved silently (so autosave updates, not duplicates)
  const autoSavedIdRef = useRef<string | null>(null)

  // Auto-growing textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Moon phase prompts
  const [moonPhase, setMoonPhase] = useState<{ phase: string; description: string } | null>(null)
  const [promptsOpen, setPromptsOpen] = useState(true)

  // Stable ref for the silent save function (avoids stale closure in debounce/keydown)
  const silentSaveRef = useRef<() => Promise<void>>()
  silentSaveRef.current = async () => {
    if (!formData.content.trim()) return
    setSaveStatus('saving')
    try {
      const entryId = autoSavedIdRef.current
      if (entryId) {
        await journalApi.updateJournalEntry(entryId, formData)
      } else {
        const newEntry = await journalApi.createJournalEntry(formData)
        autoSavedIdRef.current = newEntry.id
      }
      await fetchEntries()
      setSaveStatus('saved')
      setIsDirty(false)
    } catch {
      setSaveStatus('idle')
    }
  }

  // Fetch data on mount
  useEffect(() => {
    fetchEntries()
    fetchAllTags()
  }, [fetchEntries, fetchAllTags])

  // Fetch moon phase on mount (fail silently)
  useEffect(() => {
    apiClient.get('/insights/moon-phase')
      .then(res => setMoonPhase(res.data))
      .catch(() => {})
  }, [])

  // Update form when editing existing entry
  useEffect(() => {
    if (currentEntry && isEditing) {
      setFormData({
        title: currentEntry.title || '',
        content: currentEntry.content,
        mood: currentEntry.mood || '',
        mood_score: currentEntry.mood_score || 5,
        tags: currentEntry.tags || [],
        entry_date: currentEntry.entry_date,
      })
      setIsDirty(false)
      setSaveStatus('idle')
      setPromptsOpen(false)
    }
  }, [currentEntry, isEditing])

  // Sync autoSavedIdRef with currentEntry when entering edit mode
  useEffect(() => {
    if (currentEntry?.id && isEditing) {
      autoSavedIdRef.current = currentEntry.id
    }
  }, [currentEntry?.id, isEditing])

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [formData.content])

  // Autosave debounce (1.5s after last content change)
  useEffect(() => {
    if (!isDirty || !formData.content.trim()) return
    const timer = setTimeout(() => {
      silentSaveRef.current?.()
    }, 1500)
    return () => clearTimeout(timer)
  }, [isDirty, formData.content, formData.title, formData.mood, formData.mood_score, formData.tags, formData.entry_date])

  // Auto-clear "saved" status after 3s
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Cmd/Ctrl+S triggers immediate save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && formData.content.trim()) {
          silentSaveRef.current?.()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDirty, formData.content])

  // Unified form change handler — marks dirty
  const handleFormChange = (update: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...update }))
    setIsDirty(true)
    setSaveStatus('idle')
  }

  // Append a writing prompt to the textarea
  const appendPrompt = (prompt: string) => {
    const separator = formData.content.trim() ? '\n\n' : ''
    handleFormChange({ content: formData.content + separator + prompt })
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  // Handle new entry
  const handleNewEntry = () => {
    clearCurrentEntry()
    autoSavedIdRef.current = null
    setIsDirty(false)
    setSaveStatus('idle')
    setFormData({
      title: '',
      content: '',
      mood: '',
      mood_score: 5,
      tags: [],
      entry_date: getLocalDateString(),
    })
    setPromptsOpen(true)
    setEditing(true)
  }

  // Handle edit entry
  const handleEditEntry = async (entryId: string) => {
    await fetchEntry(entryId)
    setEditing(true)
  }

  // Handle explicit save (closes editor, uses store action)
  const handleSave = async () => {
    if (!formData.content.trim()) return
    try {
      const entryId = autoSavedIdRef.current
      if (entryId) {
        await updateEntry(entryId, formData)
      } else {
        await createEntry(formData)
      }
      autoSavedIdRef.current = null
      clearCurrentEntry()
    } catch {
      // Error is handled in store
    }
  }

  // Handle delete
  const handleDelete = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      await deleteEntry(entryId)
    }
  }

  // Handle cancel editing
  const handleCancel = () => {
    setEditing(false)
    clearCurrentEntry()
    autoSavedIdRef.current = null
    setIsDirty(false)
    setSaveStatus('idle')
    setFormData({
      title: '',
      content: '',
      mood: '',
      mood_score: 5,
      tags: [],
      entry_date: getLocalDateString(),
    })
  }

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      handleFormChange({ tags: [...formData.tags, newTag.trim().toLowerCase()] })
      setNewTag('')
    }
    setShowTagInput(false)
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    handleFormChange({ tags: formData.tags.filter(t => t !== tag) })
  }

  // Format date for display (parse as local date to avoid UTC timezone issues)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Sidebar stats
  const streak = computeStreak(entries)
  const now = new Date()
  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const monthEntryCount = entries.filter(e => {
    const [y, m] = e.entry_date.split('-').map(Number)
    return y === now.getFullYear() && m === now.getMonth() + 1
  }).length

  // Recent moods strip (last 10 entries with a mood set)
  const recentMoods = entries.slice(0, 10).filter(e => e.mood)

  // Live word count
  const wordCount = formData.content.trim() ? formData.content.trim().split(/\s+/).length : 0

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
              <BookOpen className="h-8 w-8 text-celestial-gold" />
              Consciousness Journal
            </h1>
            <p className="text-gray-400 mt-2">
              Record your insights, reflections, and inner discoveries
            </p>
          </div>
          {!isEditing && (
            <Button onClick={handleNewEntry} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry List (left sidebar on large screens) */}
        <div className={`lg:col-span-1 ${isEditing ? 'hidden lg:block' : ''}`}>
          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 px-1 mb-3">
            <span>📝 {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
            {streak > 0 && <span>🔥 {streak}-day streak</span>}
            <span>📅 {currentMonthLabel}</span>
          </div>

          {/* Search and filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-cosmic-800/50 border border-cosmic-light/20 rounded-lg
                           text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50"
                />
              </div>

              {/* Recent moods strip */}
              {recentMoods.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cosmic-light/10">
                  <p className="text-xs text-gray-600 mb-1.5">
                    Recent moods · {monthEntryCount} this month
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {recentMoods.map(e => (
                      <span
                        key={e.id}
                        title={`${e.mood} · ${formatDate(e.entry_date)}`}
                        className="text-base cursor-default leading-none"
                      >
                        {moodEmojis[e.mood!] || '😐'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entry list */}
          <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {isLoading && entries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">No journal entries yet</p>
                  <Button onClick={handleNewEntry} variant="ghost" className="mt-4">
                    Write your first entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AnimatedCard
                      onClick={() => fetchEntry(entry.id)}
                      className={`cursor-pointer hover:border-celestial-gold/30 transition-colors
                                ${currentEntry?.id === entry.id ? 'border-celestial-gold/50' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">
                              {entry.title || 'Untitled Entry'}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {formatDate(entry.entry_date)}
                            </p>
                          </div>
                          {entry.mood && (
                            <span className="text-xl" title={entry.mood}>
                              {moodEmojis[entry.mood] || '😐'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2">{entry.preview}</p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {entry.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{entry.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Entry Editor/Viewer (main content area) */}
        <div className="lg:col-span-2">
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
                        {currentEntry ? 'Edit Entry' : 'New Entry'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!formData.content.trim()}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Date */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={formData.entry_date}
                        onChange={e => handleFormChange({ entry_date: e.target.value })}
                        className="w-full px-4 py-2 bg-cosmic-800/50 border border-cosmic-light/20 rounded-lg
                                 text-white focus:outline-none focus:border-celestial-gold/50 [color-scheme:dark]"
                      />
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Title (optional)</label>
                      <input
                        type="text"
                        placeholder="Give your entry a title..."
                        value={formData.title}
                        onChange={e => handleFormChange({ title: e.target.value })}
                        className="w-full px-4 py-2 bg-cosmic-800/50 border border-cosmic-light/20 rounded-lg
                                 text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50"
                      />
                    </div>

                    {/* Writing Prompts */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setPromptsOpen(p => !p)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mb-2 w-full text-left"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-celestial-gold/70" />
                        <span>Writing Prompts</span>
                        {moonPhase && (
                          <span className="text-xs text-gray-600">— {moonPhase.phase}</span>
                        )}
                        <span className="ml-auto">
                          {promptsOpen
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                          }
                        </span>
                      </button>
                      <AnimatePresence>
                        {promptsOpen && moonPhase && MOON_PROMPTS[moonPhase.phase] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-2 pb-2">
                              {MOON_PROMPTS[moonPhase.phase].map((prompt, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => appendPrompt(prompt)}
                                  className="text-left text-sm px-3 py-2 bg-cosmic-800/40 border border-cosmic-light/10
                                           rounded-lg text-gray-400 hover:text-gray-200 hover:border-celestial-gold/20
                                           transition-colors"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Your thoughts...</label>
                      <textarea
                        ref={textareaRef}
                        placeholder="Write your reflections, insights, dreams..."
                        value={formData.content}
                        onChange={e => handleFormChange({ content: e.target.value })}
                        className="w-full min-h-[200px] px-4 py-3 bg-cosmic-800/50 border border-cosmic-light/20 rounded-lg
                                 text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50
                                 resize-none overflow-hidden"
                      />
                      {/* Save status + word count */}
                      <div className="flex items-center justify-between mt-1.5 px-0.5">
                        <div className="text-xs h-4">
                          {saveStatus === 'saving' && (
                            <span className="text-gray-500 flex items-center gap-1.5">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-500 animate-pulse" />
                              Saving…
                            </span>
                          )}
                          {saveStatus === 'saved' && (
                            <span className="text-green-500">✓ Saved</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600">
                          {wordCount > 0 ? `${wordCount} word${wordCount === 1 ? '' : 's'}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Mood */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                        <Smile className="h-4 w-4" />
                        How are you feeling?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(moodEmojis).map(([mood, emoji]) => (
                          <button
                            key={mood}
                            onClick={() => handleFormChange({ mood })}
                            className={`px-3 py-2 rounded-lg border transition-colors
                                      ${formData.mood === mood
                                        ? 'border-celestial-gold bg-celestial-gold/20'
                                        : 'border-cosmic-light/20 hover:border-celestial-gold/30'
                                      }`}
                            title={mood}
                          >
                            <span className="text-lg mr-1">{emoji}</span>
                            <span className="text-sm text-gray-400 capitalize">{mood}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map(tag => (
                          <Badge
                            key={tag}
                            className="flex items-center gap-1 cursor-pointer hover:bg-celestial-gold/30"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </Badge>
                        ))}
                        {showTagInput ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newTag}
                              onChange={e => setNewTag(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                              onBlur={handleAddTag}
                              autoFocus
                              placeholder="new tag"
                              className="w-24 px-2 py-1 text-sm bg-cosmic-800/50 border border-cosmic-light/20
                                       rounded text-white placeholder-gray-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTagInput(true)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add tag
                          </Button>
                        )}
                      </div>
                      {/* Suggested tags from existing */}
                      {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {allTags
                            .filter(tag => !formData.tags.includes(tag))
                            .slice(0, 10)
                            .map(tag => (
                              <button
                                key={tag}
                                onClick={() => handleFormChange({ tags: [...formData.tags, tag] })}
                                className="px-2 py-1 text-xs bg-cosmic-800/30 border border-cosmic-light/10
                                         rounded hover:border-celestial-gold/30 text-gray-500 hover:text-gray-300"
                              >
                                {tag}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : currentEntry ? (
              <motion.div
                key="viewer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          {currentEntry.mood && (
                            <span className="text-2xl">{moodEmojis[currentEntry.mood] || '😐'}</span>
                          )}
                          {currentEntry.title || 'Untitled Entry'}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(currentEntry.entry_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => clearCurrentEntry()}>
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                        <Button variant="ghost" onClick={() => handleEditEntry(currentEntry.id)}>
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(currentEntry.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300 whitespace-pre-wrap">{currentEntry.content}</p>
                    </div>
                    {currentEntry.tags && currentEntry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-cosmic-light/10">
                        {currentEntry.tags.map(tag => (
                          <Badge key={tag} variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <Card className="w-full max-w-md">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-16 w-16 mx-auto text-celestial-gold/50 mb-6" />
                    <h3 className="text-xl font-heading text-white mb-2">
                      Your Consciousness Journal
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Select an entry to read or create a new one to begin recording your inner journey.
                    </p>
                    <Button onClick={handleNewEntry}>
                      <Plus className="h-4 w-4 mr-2" />
                      Write New Entry
                    </Button>
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

export default JournalPage
