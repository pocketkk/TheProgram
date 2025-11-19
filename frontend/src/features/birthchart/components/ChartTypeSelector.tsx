/**
 * Chart Type Selector Component
 *
 * Allows switching between different chart types:
 * - Natal: Birth chart (default)
 * - Transit: Current planetary positions over natal houses
 * - Progressed: Secondary progressions (1 day = 1 year)
 */

import { Calendar, Clock, TrendingUp } from 'lucide-react'
import type { ChartType } from '../stores/chartStore'

export interface ChartTypeSelectorProps {
  value: ChartType
  onChange: (type: ChartType) => void
  disabled?: boolean
}

interface ChartOption {
  value: ChartType
  label: string
  description: string
  icon: typeof Calendar
}

const chartOptions: ChartOption[] = [
  {
    value: 'natal',
    label: 'Natal Chart',
    description: 'Your birth chart',
    icon: Calendar,
  },
  {
    value: 'transit',
    label: 'Current Transits',
    description: 'Planets now over your natal houses',
    icon: Clock,
  },
  {
    value: 'progressed',
    label: 'Progressed Chart',
    description: 'Secondary progressions (1 day = 1 year)',
    icon: TrendingUp,
  },
]

export function ChartTypeSelector({ value, onChange, disabled = false }: ChartTypeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-cosmic-300 font-medium">Chart Type:</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value as ChartType)}
          disabled={disabled}
          className="appearance-none px-4 py-2 pr-10 bg-cosmic-900/50 border border-cosmic-700/50 rounded-lg text-cosmic-200 font-medium hover:border-cosmic-500/50 focus:border-cosmic-500 focus:outline-none focus:ring-2 focus:ring-cosmic-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {chartOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-cosmic-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Chart type description */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-cosmic-800/30 rounded-lg border border-cosmic-700/30">
        {(() => {
          const currentOption = chartOptions.find(opt => opt.value === value)
          if (!currentOption) return null
          const Icon = currentOption.icon
          return (
            <>
              <Icon className="w-4 h-4 text-cosmic-400" />
              <span className="text-xs text-cosmic-400">{currentOption.description}</span>
            </>
          )
        })()}
      </div>
    </div>
  )
}

/**
 * Compact version for mobile/smaller screens
 */
export function ChartTypeSelectorCompact({
  value,
  onChange,
  disabled = false,
}: ChartTypeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={e => onChange(e.target.value as ChartType)}
        disabled={disabled}
        className="flex-1 appearance-none px-3 py-2 pr-8 bg-cosmic-900/50 border border-cosmic-700/50 rounded-lg text-sm text-cosmic-200 font-medium hover:border-cosmic-500/50 focus:border-cosmic-500 focus:outline-none focus:ring-2 focus:ring-cosmic-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {chartOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
