/**
 * DayNavigationHeader Component
 *
 * Header bar for the expanded day view with date display and navigation controls.
 * Provides keyboard navigation support for prev/next day.
 *
 * @module features/chronicle/components/DayView
 */

import { useEffect } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export interface DayNavigationHeaderProps {
  /** Current date in YYYY-MM-DD format */
  date: string
  /** Navigate to previous day */
  onPrev: () => void
  /** Navigate to next day */
  onNext: () => void
  /** Close day view and return to calendar */
  onClose: () => void
}

/**
 * DayNavigationHeader - Navigation controls for day view
 *
 * Displays the current date and provides navigation controls.
 * Supports keyboard shortcuts: Left/Right arrows for prev/next.
 *
 * @example
 * ```tsx
 * <DayNavigationHeader
 *   date="1985-01-15"
 *   onPrev={() => navigateDay(-1)}
 *   onNext={() => navigateDay(1)}
 *   onClose={() => setExpanded(false)}
 * />
 * ```
 */
export function DayNavigationHeader({ date, onPrev, onNext, onClose }: DayNavigationHeaderProps) {
  // Format date for display
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy')

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault()
            onPrev()
          }
          break
        case 'ArrowRight':
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault()
            onNext()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onPrev, onNext])

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-cosmic-700 glass">
      {/* Back to calendar button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cosmic-800/50 transition-colors group"
        aria-label="Back to calendar"
      >
        <ArrowLeft className="w-5 h-5 text-cosmic-300 group-hover:text-cosmic-100" />
        <span className="text-cosmic-300 group-hover:text-cosmic-100 font-medium">
          Calendar
        </span>
      </button>

      {/* Date display and navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPrev}
          className="p-2 rounded-lg hover:bg-cosmic-800/50 transition-colors group"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-6 h-6 text-cosmic-300 group-hover:text-cosmic-100" />
        </button>

        <h2 className="text-xl font-heading text-cosmic-100 min-w-[280px] text-center">
          {formattedDate}
        </h2>

        <button
          onClick={onNext}
          className="p-2 rounded-lg hover:bg-cosmic-800/50 transition-colors group"
          aria-label="Next day"
        >
          <ChevronRight className="w-6 h-6 text-cosmic-300 group-hover:text-cosmic-100" />
        </button>
      </div>

      {/* Spacer for alignment */}
      <div className="w-[120px]" />
    </div>
  )
}
