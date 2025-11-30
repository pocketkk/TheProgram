/**
 * Transit Summary Component
 * Displays summary text below compact chart
 */
import type { TransitSummary as TransitSummaryType } from './types'
import { getPlanetSymbol } from '@/lib/api/transits'

interface TransitSummaryProps {
  date: string
  summary: TransitSummaryType | null
  isLoading: boolean
}

export function TransitSummary({ date, summary, isLoading }: TransitSummaryProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-cosmic-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-cosmic-700/50 rounded w-1/2"></div>
        <div className="h-4 bg-cosmic-700/50 rounded w-2/3"></div>
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
    <div className="space-y-2 text-sm">
      {/* Date */}
      <div className="text-cosmic-200 font-medium">
        {new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      {/* Moon and Sun signs */}
      <div className="flex items-center gap-4 text-cosmic-300">
        <div className="flex items-center gap-1">
          <span className="text-lg">{getPlanetSymbol('Moon')}</span>
          <span>in {summary.moonSign}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">{getPlanetSymbol('Sun')}</span>
          <span>in {summary.sunSign}</span>
        </div>
      </div>

      {/* Active transits count */}
      <div className="text-celestial-gold">
        {summary.activeTransits} active transit{summary.activeTransits !== 1 ? 's' : ''}
      </div>

      {/* Significant transits */}
      {summary.significantTransits.length > 0 && (
        <div className="space-y-1">
          <div className="text-cosmic-400 text-xs uppercase tracking-wide">
            Significant Aspects
          </div>
          <ul className="space-y-1">
            {summary.significantTransits.map((transit, index) => (
              <li key={index} className="text-cosmic-200 text-xs flex items-center gap-1">
                <span className="text-celestial-pink">•</span>
                <span>{transit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
