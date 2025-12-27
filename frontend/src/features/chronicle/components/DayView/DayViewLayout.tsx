/**
 * DayViewLayout Component
 *
 * Main layout container for the expanded day view.
 * Resizable two-column layout with newspaper on left and widgets on right.
 *
 * Layout structure:
 * - Full-screen overlay with backdrop blur
 * - Left: Cosmic Chronicle newspaper (resizable)
 * - Right: Stacked widgets - transit chart (top) + journal (bottom) (resizable)
 * - Drag the handle between panels to resize
 * - Sizes persist in localStorage
 *
 * @module features/chronicle/components/DayView
 */

import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { GripVertical } from 'lucide-react'
import { ExpandTransition, ExpandContent } from './ExpandTransition'

export interface DayViewLayoutProps {
  /** Current date in YYYY-MM-DD format */
  date: string
  /** Close handler */
  onClose: () => void
  /** Main newspaper content */
  children?: React.ReactNode
  /** Transit chart widget */
  transitWidget?: React.ReactNode
  /** Journal editor widget */
  journalWidget?: React.ReactNode
}

/**
 * DayViewLayout - Full-screen layout for expanded day view
 *
 * Provides the structure for displaying all day view components.
 * Handles escape key to close and backdrop click.
 *
 * @example
 * ```tsx
 * <DayViewLayout
 *   date="1985-01-15"
 *   onClose={() => setExpanded(false)}
 *   transitWidget={<TransitChartWidget date={date} />}
 *   journalWidget={<JournalEditor date={date} />}
 * >
 *   <CosmicChronicle date={date} />
 * </DayViewLayout>
 * ```
 */
export function DayViewLayout({
  date,
  onClose,
  children,
  transitWidget,
  journalWidget
}: DayViewLayoutProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <ExpandTransition isOpen={true}>
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close day view"
      />

      {/* Main content */}
      <ExpandContent>
        <div className="relative h-full flex flex-col cosmic-bg rounded-lg shadow-2xl border border-cosmic-700 overflow-hidden">
          {/* Resizable panel layout */}
          <PanelGroup
            direction="horizontal"
            autoSaveId="timeline-day-view-layout"
            className="flex-1"
          >
            {/* Left: Newspaper content */}
            <Panel defaultSize={65} minSize={30} maxSize={85}>
              <div className="h-full p-4 pr-2">
                <div className="h-full glass-strong rounded-lg p-6 overflow-y-auto">
                  {children}
                </div>
              </div>
            </Panel>

            {/* Resize handle */}
            <PanelResizeHandle className="w-2 flex items-center justify-center group hover:bg-celestial-gold/10 transition-colors">
              <div className="w-1 h-16 rounded-full bg-cosmic-light/30 group-hover:bg-celestial-gold/60 group-active:bg-celestial-gold transition-colors flex items-center justify-center">
                <GripVertical className="w-3 h-3 text-cosmic-light/50 group-hover:text-celestial-gold" />
              </div>
            </PanelResizeHandle>

            {/* Right: Sidebar widgets */}
            <Panel defaultSize={35} minSize={15} maxSize={70}>
              <div className="h-full p-4 pl-2 flex flex-col gap-4">
                {/* Transit chart widget */}
                {transitWidget && (
                  <div className="glass-strong rounded-lg p-4 flex-1 min-h-0 overflow-auto">
                    {transitWidget}
                  </div>
                )}

                {/* Journal editor widget */}
                {journalWidget && (
                  <div className="glass-strong rounded-lg p-4 flex-shrink-0 max-h-[300px] overflow-auto">
                    {journalWidget}
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </ExpandContent>
    </ExpandTransition>
  )
}
