/**
 * Vedic Chart Controls Component
 *
 * Settings panel for:
 * - Chart style toggle (North/South Indian)
 * - Ayanamsa selection
 * - House system selection
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Square, Grid3X3 } from 'lucide-react'
import { AYANAMSA_OPTIONS, HOUSE_SYSTEM_OPTIONS } from '../utils/vedicConstants'
import type { VedicChartStyle, AyanamsaSystem } from '../types'

interface VedicChartControlsProps {
  chartStyle: VedicChartStyle
  ayanamsa: AyanamsaSystem
  houseSystem: string
  onChartStyleChange: (style: VedicChartStyle) => void
  onAyanamsaChange: (ayanamsa: AyanamsaSystem) => void
  onHouseSystemChange: (system: string) => void
  onRecalculate?: () => void
}

export const VedicChartControls: React.FC<VedicChartControlsProps> = ({
  chartStyle,
  ayanamsa,
  houseSystem,
  onChartStyleChange,
  onAyanamsaChange,
  onHouseSystemChange,
  onRecalculate,
}) => {
  return (
    <div className="space-y-4 p-4 bg-slate-800/40 rounded-lg">
      {/* Chart Style Toggle */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Chart Style</label>
        <div className="flex gap-1 p-1 bg-slate-900/50 rounded-lg">
          <button
            onClick={() => onChartStyleChange('south')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm
              transition-colors
              ${chartStyle === 'south'
                ? 'bg-cosmic-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}
            `}
          >
            <Grid3X3 size={16} />
            South
          </button>
          <button
            onClick={() => onChartStyleChange('north')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm
              transition-colors
              ${chartStyle === 'north'
                ? 'bg-cosmic-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}
            `}
          >
            <Square size={16} className="rotate-45" />
            North
          </button>
        </div>
      </div>

      {/* Ayanamsa Selection */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Ayanamsa</label>
        <select
          value={ayanamsa}
          onChange={(e) => {
            onAyanamsaChange(e.target.value as AyanamsaSystem)
            onRecalculate?.()
          }}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg
                     text-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-500"
        >
          {AYANAMSA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* House System Selection */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">House System</label>
        <select
          value={houseSystem}
          onChange={(e) => {
            onHouseSystemChange(e.target.value)
            onRecalculate?.()
          }}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg
                     text-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-500"
        >
          {HOUSE_SYSTEM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Info text */}
      <p className="text-xs text-slate-500">
        Changes to Ayanamsa or House System will recalculate the chart.
      </p>
    </div>
  )
}
