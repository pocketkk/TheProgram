/**
 * Keyboard shortcuts hook for Cosmic Chronicle
 *
 * Provides keyboard navigation for the Chronicle page.
 */
import { useEffect, useCallback } from 'react'

interface ChronicleShortcutsOptions {
  onToday?: () => void
  onPrevMonth?: () => void
  onNextMonth?: () => void
  onCloseDay?: () => void
  onRefresh?: () => void
  onToggleForYou?: () => void
  enabled?: boolean
}

/**
 * Hook for Chronicle keyboard shortcuts
 *
 * Shortcuts:
 * - T: Go to today
 * - Left Arrow: Previous month
 * - Right Arrow: Next month
 * - Escape: Close day view
 * - R: Refresh feeds (when not in input)
 * - F: Toggle For You section
 */
export function useChronicleShortcuts({
  onToday,
  onPrevMonth,
  onNextMonth,
  onCloseDay,
  onRefresh,
  onToggleForYou,
  enabled = true
}: ChronicleShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only allow Escape in inputs
      if (event.key !== 'Escape') {
        return
      }
    }

    // Don't trigger with modifier keys (except for specific combos)
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    switch (event.key) {
      case 't':
      case 'T':
        event.preventDefault()
        onToday?.()
        break

      case 'ArrowLeft':
        if (!event.shiftKey) {
          event.preventDefault()
          onPrevMonth?.()
        }
        break

      case 'ArrowRight':
        if (!event.shiftKey) {
          event.preventDefault()
          onNextMonth?.()
        }
        break

      case 'Escape':
        event.preventDefault()
        onCloseDay?.()
        break

      case 'r':
      case 'R':
        event.preventDefault()
        onRefresh?.()
        break

      case 'f':
      case 'F':
        event.preventDefault()
        onToggleForYou?.()
        break
    }
  }, [onToday, onPrevMonth, onNextMonth, onCloseDay, onRefresh, onToggleForYou])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Keyboard shortcuts help text
 */
export const CHRONICLE_SHORTCUTS = [
  { key: 'T', description: 'Go to today' },
  { key: '←', description: 'Previous month' },
  { key: '→', description: 'Next month' },
  { key: 'Esc', description: 'Close day view' },
  { key: 'R', description: 'Refresh feeds' },
  { key: 'F', description: 'Toggle For You' },
]
