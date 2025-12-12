/**
 * Journal Page - Personal consciousness exploration journal
 *
 * Part of Phase 2: Journal System
 */
import { useState, useEffect } from 'react'
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
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    mood_score: 5,
    tags: [] as string[],
    entry_date: getLocalDateString(),
  })
  const [newTag, setNewTag] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  // Fetch data on mount
  useEffect(() => {
    fetchEntries()
    fetchAllTags()
  }, [fetchEntries, fetchAllTags])

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
    }
  }, [currentEntry, isEditing])

  // Handle new entry
  const handleNewEntry = () => {
    clearCurrentEntry()
    setFormData({
      title: '',
      content: '',
      mood: '',
      mood_score: 5,
      tags: [],
      entry_date: getLocalDateString(),
    })
    setEditing(true)
  }

  // Handle edit entry
  const handleEditEntry = async (entryId: string) => {
    await fetchEntry(entryId)
    setEditing(true)
  }

  // Handle save
  const handleSave = async () => {
    if (!formData.content.trim()) return

    try {
      if (currentEntry) {
        await updateEntry(currentEntry.id, formData)
      } else {
        await createEntry(formData)
      }
      setEditing(false)
      clearCurrentEntry()
    } catch (err) {
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
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()],
      }))
      setNewTag('')
    }
    setShowTagInput(false)
  }

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }))
  }

  // Format date for display (parse as local date to avoid UTC timezone issues)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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
                  className="w-full pl-10 pr-4 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                           text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50"
                />
              </div>
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
                        onChange={e => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                        className="w-full px-4 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                 text-white focus:outline-none focus:border-celestial-gold/50"
                      />
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Title (optional)</label>
                      <input
                        type="text"
                        placeholder="Give your entry a title..."
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                 text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50"
                      />
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Your thoughts...</label>
                      <textarea
                        placeholder="Write your reflections, insights, dreams..."
                        value={formData.content}
                        onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        rows={12}
                        className="w-full px-4 py-3 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg
                                 text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50
                                 resize-none"
                      />
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
                            onClick={() => setFormData(prev => ({ ...prev, mood }))}
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
                              className="w-24 px-2 py-1 text-sm bg-cosmic-dark/50 border border-cosmic-light/20
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
                                onClick={() => setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
                                className="px-2 py-1 text-xs bg-cosmic-dark/30 border border-cosmic-light/10
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
