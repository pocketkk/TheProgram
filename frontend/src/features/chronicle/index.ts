/**
 * Cosmic Chronicle Feature Module
 *
 * Privacy-first personal news hub with RSS feeds, weather, sports, and AI curation.
 */
export { ChroniclePage } from './ChroniclePage'
export { default } from './ChroniclePage'
// Legacy alias for backward compatibility
export { ChroniclePage as TimelinePage } from './ChroniclePage'

// Export stores
export { useTimelineViewStore } from './stores/timelineViewStore'

// Export components
export { JournalEditor } from './components/JournalSidebar/JournalEditor'
export { MonthHeader } from './components/MonthView/MonthHeader'
export { CalendarGrid } from './components/MonthView/CalendarGrid'
export { DayCell } from './components/MonthView/DayCell'
export { DayViewLayout } from './components/DayView/DayViewLayout'
export { NewspaperFrame } from './components/Newspaper/NewspaperFrame'
export { TransitChartWidget } from './components/TransitWidget/TransitChartWidget'
