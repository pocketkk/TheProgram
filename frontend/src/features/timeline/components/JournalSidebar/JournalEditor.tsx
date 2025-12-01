/**
 * JournalEditor Component
 *
 * Simplified journal editor for the Timeline day view sidebar.
 * Allows quick journaling for the selected date.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { Save, Smile, Tag, Plus, X } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { useJournalStore } from '@/store/journalStore'
import type { JournalEntry } from '@/lib/api/journal'

interface JournalEditorProps {
  /** Date in YYYY-MM-DD format */
  date: string
}

// Mood emoji mapping (reused from JournalPage)
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

/**
 * JournalEditor - Quick journal entry for timeline day view
 *
 * Provides a compact interface for creating/editing journal entries
 * for the selected date in the timeline.
 *
 * Features:
 * - Auto-loads existing entry for the date
 * - Auto-save on blur
 * - Mood selector
 * - Tag management
 *
 * @example
 * ```tsx
 * <JournalEditor date="1985-01-15" />
 * ```
 */
export function JournalEditor({ date }: JournalEditorProps) {
  const {
    entries,
    fetchEntries,
    createEntry,
    updateEntry,
    isLoading
  } = useJournalStore()

  // Track which date we've already fetched to prevent loops
  const lastFetchedDateRef = useRef<string | null>(null)

  // Find existing entry for this date - memoize to prevent unnecessary re-renders
  const existingEntry = useMemo(
    () => entries.find((entry: JournalEntry) => entry.entry_date === date),
    [entries, date]
  )

  // Track the entry ID to detect actual changes (not just reference changes)
  const existingEntryId = existingEntry?.id

  // Local form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    tags: [] as string[]
  })

  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [newTag, setNewTag] = useState('')

  // Load entries for this date on mount - use ref to prevent duplicate fetches
  useEffect(() => {
    if (lastFetchedDateRef.current === date) return
    lastFetchedDateRef.current = date
    fetchEntries({ date_from: date, date_to: date })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // Sync form with existing entry - depend on entry ID to avoid reference comparison issues
  useEffect(() => {
    if (existingEntry) {
      setFormData({
        title: existingEntry.title || '',
        content: existingEntry.content || '',
        mood: existingEntry.mood || '',
        tags: existingEntry.tags || []
      })
      setHasUnsavedChanges(false)
    } else {
      // New entry for this date
      setFormData({
        title: '',
        content: '',
        mood: '',
        tags: []
      })
      setHasUnsavedChanges(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEntryId, date])

  // Handle form changes
  const handleChange = (field: keyof typeof formData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  // Auto-save handler
  const handleSave = async () => {
    if (!formData.content.trim() || !hasUnsavedChanges) return

    setIsSaving(true)
    try {
      if (existingEntry) {
        await updateEntry(existingEntry.id, {
          ...formData,
          entry_date: date
        })
      } else {
        await createEntry({
          ...formData,
          entry_date: date
        })
      }
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save journal entry:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      handleChange('tags', [...formData.tags, newTag.trim().toLowerCase()])
      setNewTag('')
    }
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    handleChange('tags', formData.tags.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cosmic-300">
          Journal Entry
        </h3>
        {hasUnsavedChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !formData.content.trim()}
            className="text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="Title (optional)"
        value={formData.title}
        onChange={e => handleChange('title', e.target.value)}
        onBlur={handleSave}
        className="w-full px-3 py-1.5 text-sm bg-cosmic-900/80 border border-cosmic-light/20
                   rounded-lg text-white placeholder-gray-500 focus:outline-none
                   focus:border-celestial-gold/50"
      />

      {/* Content */}
      <textarea
        placeholder="What happened today? How did you feel?"
        value={formData.content}
        onChange={e => handleChange('content', e.target.value)}
        onBlur={handleSave}
        rows={6}
        className="w-full px-3 py-2 text-sm bg-cosmic-900/80 border border-cosmic-light/20
                   rounded-lg text-white placeholder-gray-500 focus:outline-none
                   focus:border-celestial-gold/50 resize-none flex-1"
      />

      {/* Mood selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400 flex items-center gap-1">
            <Smile className="h-3 w-3" />
            Mood
          </label>
          <button
            onClick={() => setShowMoodSelector(!showMoodSelector)}
            className="text-xs text-celestial-gold hover:text-celestial-gold/80"
          >
            {showMoodSelector ? 'Hide' : 'Select'}
          </button>
        </div>

        {formData.mood && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{moodEmojis[formData.mood]}</span>
            <span className="text-sm text-gray-400 capitalize">{formData.mood}</span>
            <button
              onClick={() => {
                handleChange('mood', '')
                handleSave()
              }}
              className="ml-auto text-gray-500 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {showMoodSelector && (
          <div className="grid grid-cols-3 gap-1 p-2 bg-cosmic-dark/30 rounded-lg border border-cosmic-light/10">
            {Object.entries(moodEmojis).map(([mood, emoji]) => (
              <button
                key={mood}
                onClick={() => {
                  handleChange('mood', mood)
                  setShowMoodSelector(false)
                  handleSave()
                }}
                className={`px-2 py-1 rounded text-xs transition-colors
                          ${formData.mood === mood
                            ? 'bg-celestial-gold/20 border border-celestial-gold'
                            : 'border border-transparent hover:border-celestial-gold/30'
                          }`}
                title={mood}
              >
                <span className="mr-1">{emoji}</span>
                <span className="text-gray-400 capitalize hidden lg:inline">
                  {mood.slice(0, 6)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs text-gray-400 flex items-center gap-1 mb-2">
          <Tag className="h-3 w-3" />
          Tags
        </label>
        <div className="flex flex-wrap gap-1">
          {formData.tags.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs cursor-pointer hover:bg-celestial-gold/20"
              onClick={() => {
                handleRemoveTag(tag)
                handleSave()
              }}
            >
              {tag}
              <X className="h-2 w-2 ml-1" />
            </Badge>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddTag()
                  handleSave()
                }
              }}
              placeholder="add tag"
              className="w-16 px-2 py-0.5 text-xs bg-cosmic-900/80 border border-cosmic-light/20
                       rounded text-white placeholder-gray-500 focus:outline-none"
            />
            <button
              onClick={() => {
                handleAddTag()
                handleSave()
              }}
              className="text-celestial-gold hover:text-celestial-gold/80"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {isLoading && (
        <div className="text-xs text-gray-500 text-center">Loading...</div>
      )}
    </div>
  )
}
