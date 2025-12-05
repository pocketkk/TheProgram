/**
 * Controls Component
 *
 * View mode controls and options for the Myers-Briggs page.
 */
import { Eye, Brain, Sparkles, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MBViewMode } from '../types'

interface ControlsProps {
  viewMode: MBViewMode
  onViewModeChange: (mode: MBViewMode) => void
  includeCorrelations: boolean
  onIncludeCorrelationsChange: (include: boolean) => void
}

const viewModes: { mode: MBViewMode; label: string; icon: typeof Eye }[] = [
  { mode: 'overview', label: 'Overview', icon: Eye },
  { mode: 'dichotomies', label: 'Dichotomies', icon: BarChart3 },
  { mode: 'cognitive', label: 'Cognitive', icon: Brain },
  { mode: 'reading', label: 'AI Reading', icon: Sparkles },
]

export function Controls({
  viewMode,
  onViewModeChange,
  includeCorrelations,
  onIncludeCorrelationsChange,
}: ControlsProps) {
  return (
    <div className="glass rounded-xl p-4">
      {/* View Mode Selector */}
      <div className="flex flex-wrap gap-2">
        {viewModes.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewMode === mode
                ? 'bg-cosmic-600 text-white'
                : 'bg-cosmic-800 text-gray-400 hover:bg-cosmic-700 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="mt-4 pt-4 border-t border-cosmic-700">
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCorrelations}
            onChange={(e) => onIncludeCorrelationsChange(e.target.checked)}
            className="w-4 h-4 rounded border-cosmic-600 bg-cosmic-800 text-cosmic-500 focus:ring-cosmic-500 focus:ring-offset-0"
          />
          Include astrological correlations
        </label>
      </div>
    </div>
  )
}
