/**
 * Transit Summary Component
 * Displays compact summary in footer of transit widget
 */
import type { TransitSummary as TransitSummaryType } from './types'
import { getPlanetSymbol } from '@/lib/api/transits'
import { Maximize2 } from 'lucide-react'

interface TransitSummaryProps {
  summary: TransitSummaryType | null
  isLoading: boolean
  onExpand: () => void
}

export function TransitSummary({ summary, isLoading, onExpand }: TransitSummaryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between animate-pulse">
        <div className="h-4 bg-cosmic-700/50 rounded w-1/3"></div>
        <div className="h-4 bg-cosmic-700/50 rounded w-1/4"></div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-sm text-gray-400">
        No transit data available
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Moon and Sun signs */}
      <div className="flex items-center gap-3 text-sm text-cosmic-300">
        <div className="flex items-center gap-1">
          <span>{getPlanetSymbol('Moon')}</span>
          <span>{summary.moonSign}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{getPlanetSymbol('Sun')}</span>
          <span>{summary.sunSign}</span>
        </div>
      </div>

      {/* Active transits - clickable */}
      <button
        onClick={onExpand}
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-celestial-gold/10 border border-celestial-gold/30 hover:bg-celestial-gold/20 hover:border-celestial-gold/50 transition-colors"
      >
        <span className="text-sm font-medium text-celestial-gold">
          {summary.activeTransits} transits
        </span>
        <Maximize2 className="w-3 h-3 text-celestial-gold" />
      </button>
    </div>
  )
}
