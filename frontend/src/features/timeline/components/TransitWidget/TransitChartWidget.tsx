/**
 * Transit Chart Widget Component
 * Main container component combining compact chart, summary, and expanded dialog
 */
import { useState } from 'react'
import { CompactChart } from './CompactChart'
import { TransitSummary } from './TransitSummary'
import { ExpandedChartDialog } from './ExpandedChartDialog'
import { useTransitsForDate } from './useTransitsForDate'
import type { TransitSummary as TransitSummaryType } from './types'
import { formatTransitFull } from '@/lib/api/transits'

interface TransitChartWidgetProps {
  date: string
  birthDataId?: string
}

export function TransitChartWidget({ date, birthDataId }: TransitChartWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { data, isLoading } = useTransitsForDate({
    date,
    birthDataId,
    enabled: !!birthDataId
  })

  // Transform transit data into summary format
  // Use case-insensitive matching for planet names
  const findPlanet = (name: string) =>
    data?.chart.planets.find(p => p.name.toLowerCase() === name.toLowerCase())

  const summary: TransitSummaryType | null = data?.raw ? {
    moonSign: findPlanet('Moon')?.sign || 'Unknown',
    sunSign: findPlanet('Sun')?.sign || 'Unknown',
    activeTransits: data.raw.transits.length,
    significantTransits: data.raw.transits
      .filter(t => t.significance === 'major' || t.significance === 'significant')
      .slice(0, 5) // Show top 5
      .map(t => formatTransitFull(t))
  } : null

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Transit chart - fills available space */}
      <div className="flex-1 min-h-0">
        <CompactChart
          date={date}
          birthDataId={birthDataId}
          onExpand={() => setIsExpanded(true)}
        />
      </div>

      {/* Summary - compact, doesn't shrink */}
      <div className="flex-shrink-0">
        <TransitSummary
          date={date}
          summary={summary}
          isLoading={isLoading}
        />
      </div>

      {/* Expanded dialog */}
      <ExpandedChartDialog
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        date={date}
        birthDataId={birthDataId}
      />
    </div>
  )
}
