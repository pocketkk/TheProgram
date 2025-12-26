/**
 * NotesPanel - Editable notes section for a person's chart
 *
 * Shows when viewing any chart, allows editing notes with auto-save.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { usePeopleStore } from '../stores/peopleStore'
import type { BirthDataResponse } from '@/lib/api/birthData'

interface NotesPanelProps {
  person: BirthDataResponse
  className?: string
}

export function NotesPanel({ person, className = '' }: NotesPanelProps) {
  const { updateNotes } = usePeopleStore()
  const [notes, setNotes] = useState(person.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync notes when person changes
  useEffect(() => {
    setNotes(person.notes || '')
    setHasChanges(false)
    setLastSaved(null)
  }, [person.id, person.notes])

  // Track changes
  useEffect(() => {
    setHasChanges(notes !== (person.notes || ''))
  }, [notes, person.notes])

  // Debounced auto-save
  useEffect(() => {
    if (!hasChanges) return

    const timer = setTimeout(async () => {
      await saveNotes()
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer)
  }, [notes, hasChanges])

  const saveNotes = useCallback(async () => {
    if (!hasChanges) return

    setIsSaving(true)
    try {
      await updateNotes(person.id, notes)
      setLastSaved(new Date())
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSaving(false)
    }
  }, [person.id, notes, hasChanges, updateNotes])

  // Manual save on blur
  const handleBlur = () => {
    if (hasChanges) {
      saveNotes()
    }
  }

  const formatLastSaved = () => {
    if (!lastSaved) return null
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000)

    if (diff < 5) return 'Just saved'
    if (diff < 60) return `Saved ${diff}s ago`
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`
    return `Saved at ${lastSaved.toLocaleTimeString()}`
  }

  return (
    <div className={`bg-cosmic-900/50 rounded-lg border border-cosmic-700/50 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-cosmic-800/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-celestial-purple" />
          <span className="font-medium text-gray-200">Notes</span>
          {hasChanges && (
            <span className="text-xs text-celestial-gold">(unsaved)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <Loader2 className="w-4 h-4 text-celestial-cyan animate-spin" />
          )}
          {lastSaved && !isSaving && !hasChanges && (
            <span className="text-xs text-gray-500">{formatLastSaved()}</span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
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
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleBlur}
                placeholder={`Add notes about ${person.name || 'this chart'}...`}
                className="w-full min-h-[120px] max-h-[300px] p-3 rounded-lg
                  bg-cosmic-950/50 border border-cosmic-700/50
                  text-gray-200 placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-celestial-purple/50 focus:border-celestial-purple/50
                  resize-y transition-colors"
              />

              {/* Footer with save button */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  Changes auto-save after 2 seconds
                </p>
                {hasChanges && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={saveNotes}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1 text-sm rounded-md
                      bg-celestial-purple/20 text-celestial-purple
                      hover:bg-celestial-purple/30 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Save Now
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
