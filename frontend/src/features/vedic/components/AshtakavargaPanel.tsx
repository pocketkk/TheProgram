/**
 * Ashtakavarga Panel Component
 *
 * Displays Ashtakavarga data with heatmap visualization and analysis.
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { AshtakavargaResponse, BhinnaAshtakavarga } from '@/lib/api/ashtakavarga'

interface AshtakavargaPanelProps {
  data: AshtakavargaResponse | null
  isLoading: boolean
}

const SIGN_ABBREV = ['Ar', 'Ta', 'Ge', 'Ca', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi']
const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]
const PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']
const PLANET_ABBREV: Record<string, string> = {
  sun: 'Su',
  moon: 'Mo',
  mars: 'Ma',
  mercury: 'Me',
  jupiter: 'Ju',
  venus: 'Ve',
  saturn: 'Sa',
}

/**
 * Get color for bindu value (0-8 for Bhinna, 0-48 for Sarva)
 */
function getBinduColor(value: number, maxValue: number): string {
  const ratio = value / maxValue
  if (ratio >= 0.75) return 'bg-green-500/80'
  if (ratio >= 0.6) return 'bg-green-600/60'
  if (ratio >= 0.5) return 'bg-yellow-500/50'
  if (ratio >= 0.4) return 'bg-orange-500/40'
  return 'bg-red-500/30'
}

function getTextColor(value: number, maxValue: number): string {
  const ratio = value / maxValue
  if (ratio >= 0.5) return 'text-white'
  return 'text-slate-300'
}

const SarvaGrid: React.FC<{ bindus: number[] }> = ({ bindus }) => {
  const average = bindus.reduce((a, b) => a + b, 0) / 12

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Sarvashtakavarga</h4>
        <span className="text-xs text-slate-400">Avg: {average.toFixed(1)}</span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {bindus.map((value, idx) => (
          <div
            key={idx}
            className={`
              relative p-2 rounded text-center
              ${getBinduColor(value, 48)}
              ${value >= 28 ? 'ring-1 ring-green-400/50' : ''}
            `}
            title={`${SIGN_NAMES[idx]}: ${value} bindus`}
          >
            <div className="text-[10px] text-slate-400 mb-0.5">{SIGN_ABBREV[idx]}</div>
            <div className={`text-sm font-bold ${getTextColor(value, 48)}`}>{value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500/80 rounded" /> 28+ Good
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500/50 rounded" /> 22-27 Avg
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500/30 rounded" /> &lt;22 Weak
        </span>
      </div>
    </div>
  )
}

const BhinnaHeatmap: React.FC<{ bhinna: Record<string, BhinnaAshtakavarga> }> = ({ bhinna }) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-white">Bhinnashtakavarga Heatmap</h4>

      {/* Header row - signs */}
      <div className="flex">
        <div className="w-8 shrink-0" /> {/* Spacer for planet column */}
        {SIGN_ABBREV.map((sign, idx) => (
          <div key={idx} className="flex-1 text-center text-[10px] text-slate-500">
            {sign}
          </div>
        ))}
        <div className="w-8 shrink-0 text-center text-[10px] text-slate-500">Tot</div>
      </div>

      {/* Planet rows */}
      {PLANETS.map((planet) => {
        const data = bhinna[planet]
        if (!data) return null

        return (
          <div key={planet} className="flex items-center">
            <div className="w-8 shrink-0 text-[10px] text-slate-400 font-medium">
              {PLANET_ABBREV[planet]}
            </div>
            {data.bindus_by_sign.map((value, idx) => (
              <div
                key={idx}
                className={`
                  flex-1 h-6 flex items-center justify-center text-[10px] font-medium
                  ${getBinduColor(value, 8)}
                  ${getTextColor(value, 8)}
                `}
                title={`${data.planet_name} in ${SIGN_NAMES[idx]}: ${value} bindus`}
              >
                {value}
              </div>
            ))}
            <div className="w-8 shrink-0 text-center text-[10px] text-slate-300 font-bold">
              {data.total_bindus}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PlanetSelector: React.FC<{
  bhinna: Record<string, BhinnaAshtakavarga>
  selectedPlanet: string
  onSelect: (planet: string) => void
}> = ({ bhinna, selectedPlanet, onSelect }) => {
  const data = bhinna[selectedPlanet]
  if (!data) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-white">Planet Detail</h4>
        <select
          value={selectedPlanet}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-slate-800 text-white text-xs rounded px-2 py-1 border border-slate-700"
        >
          {PLANETS.map((p) => (
            <option key={p} value={p}>
              {bhinna[p]?.planet_name || p}
            </option>
          ))}
        </select>
      </div>

      {/* Planet's bindu grid */}
      <div className="grid grid-cols-6 gap-1">
        {data.bindus_by_sign.map((value, idx) => (
          <div
            key={idx}
            className={`
              p-2 rounded text-center
              ${getBinduColor(value, 8)}
            `}
          >
            <div className="text-[10px] text-slate-400 mb-0.5">{SIGN_ABBREV[idx]}</div>
            <div className={`text-sm font-bold ${getTextColor(value, 8)}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Total: <span className="text-white font-medium">{data.total_bindus}</span>
        </span>
        <span className="text-green-400">
          Strong: {data.strongest_signs.slice(0, 3).join(', ')}
        </span>
      </div>
    </div>
  )
}

const HouseStrengthTable: React.FC<{ houseStrength: Record<number, { sign: string; bindus: number; strength: string }> }> = ({
  houseStrength,
}) => {
  const strengthColors: Record<string, string> = {
    excellent: 'text-green-400',
    good: 'text-green-300',
    average: 'text-yellow-400',
    challenging: 'text-red-400',
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-white">House Strength (SAV)</h4>
      <div className="grid grid-cols-3 gap-1 text-xs">
        {Object.entries(houseStrength).map(([house, data]) => (
          <div
            key={house}
            className="bg-slate-800/60 rounded p-2 flex items-center justify-between"
          >
            <span className="text-slate-400">H{house}</span>
            <span className={strengthColors[data.strength] || 'text-slate-300'}>
              {data.bindus}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const AshtakavargaPanel: React.FC<AshtakavargaPanelProps> = ({ data, isLoading }) => {
  const [selectedPlanet, setSelectedPlanet] = useState('jupiter')
  const [view, setView] = useState<'sarva' | 'heatmap' | 'planet' | 'houses'>('sarva')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-cosmic-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center text-slate-500 py-8">
        <p>No Ashtakavarga data available</p>
      </div>
    )
  }

  const { sarvashtakavarga, bhinnashtakavarga, summary } = data

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-lg">
        {[
          { id: 'sarva', label: 'SAV' },
          { id: 'heatmap', label: 'Heatmap' },
          { id: 'planet', label: 'Planet' },
          { id: 'houses', label: 'Houses' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as typeof view)}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              view === tab.id
                ? 'bg-cosmic-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Strongest Planet</span>
          <span className="text-green-400 font-medium">
            {summary.strongest_planet} ({summary.strongest_planet_bindus})
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Strongest Sign</span>
          <span className="text-green-400 font-medium">
            {summary.strongest_sign} ({summary.strongest_sign_bindus})
          </span>
        </div>
        {summary.transit_favorable_signs.length > 0 && (
          <div className="text-xs">
            <span className="text-slate-400">Good for transits: </span>
            <span className="text-cyan-400">
              {summary.transit_favorable_signs.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Content based on view */}
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {view === 'sarva' && <SarvaGrid bindus={sarvashtakavarga.bindus_by_sign} />}
        {view === 'heatmap' && <BhinnaHeatmap bhinna={bhinnashtakavarga} />}
        {view === 'planet' && (
          <PlanetSelector
            bhinna={bhinnashtakavarga}
            selectedPlanet={selectedPlanet}
            onSelect={setSelectedPlanet}
          />
        )}
        {view === 'houses' && <HouseStrengthTable houseStrength={summary.house_strength} />}
      </motion.div>
    </div>
  )
}
