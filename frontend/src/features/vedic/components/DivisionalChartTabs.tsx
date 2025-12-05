/**
 * Divisional Chart Tabs Component
 *
 * Tab switcher for D-1 (Rasi) and D-9 (Navamsa) charts
 */
import React from 'react'
import { motion } from 'framer-motion'
import type { DivisionalChartType } from '../types'

interface DivisionalChartTabsProps {
  activeChart: DivisionalChartType
  onChange: (chart: DivisionalChartType) => void
  hasD9Data?: boolean
}

const CHART_TABS: Array<{
  id: DivisionalChartType
  label: string
  fullName: string
  sanskrit: string
}> = [
  { id: 'd1', label: 'D-1', fullName: 'Rasi', sanskrit: 'Rashi' },
  { id: 'd9', label: 'D-9', fullName: 'Navamsa', sanskrit: 'Navamsha' },
]

export const DivisionalChartTabs: React.FC<DivisionalChartTabsProps> = ({
  activeChart,
  onChange,
  hasD9Data = true,
}) => {
  return (
    <div className="flex flex-col gap-1 p-1 bg-slate-800/60 rounded-lg">
      {CHART_TABS.map((tab) => {
        const isActive = activeChart === tab.id
        const isDisabled = tab.id === 'd9' && !hasD9Data

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onChange(tab.id)}
            disabled={isDisabled}
            className={`
              relative px-3 py-2 rounded-md text-sm font-medium transition-colors w-full
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-300'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeChartTab"
                className="absolute inset-0 bg-gradient-to-r from-cosmic-600 to-cosmic-500 rounded-md"
                transition={{ type: 'spring', duration: 0.3 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-between">
              <span className="font-bold">{tab.label}</span>
              <span className="text-xs opacity-80">{tab.fullName}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
