import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PLANETS } from '@/lib/astronomy/planetaryData'
import { AstroSymbol } from './AstroSymbol'

interface PlanetKeyProps {
  selectedPlanets: string[]
  onPlanetSelect: (planetName: string) => void
}

const STORAGE_KEY = 'cosmic-planet-key-collapsed'

export const PlanetKey = ({ selectedPlanets, onPlanetSelect }: PlanetKeyProps) => {
  // Default to collapsed for cleaner view
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored !== null ? JSON.parse(stored) : true // Default collapsed
    }
    return true
  })

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const planets = [
    { name: 'mercury', data: PLANETS.mercury },
    { name: 'venus', data: PLANETS.venus },
    { name: 'earth', data: PLANETS.earth },
    { name: 'mars', data: PLANETS.mars },
    { name: 'jupiter', data: PLANETS.jupiter },
    { name: 'saturn', data: PLANETS.saturn },
    { name: 'uranus', data: PLANETS.uranus },
    { name: 'neptune', data: PLANETS.neptune },
    { name: 'pluto', data: PLANETS.pluto },
  ]

  // Collapsed view - just a small toggle button
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute bottom-4 left-4 bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 rounded-lg p-2 shadow-lg hover:bg-slate-800/80 transition-all hover:scale-105"
        style={{ pointerEvents: 'auto' }}
        title="Show Planet Key"
      >
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            {/* Show a few planet color dots as preview */}
            {planets.slice(0, 4).map(({ name, data }) => (
              <div
                key={name}
                className="w-2.5 h-2.5 rounded-full border border-slate-600"
                style={{ backgroundColor: data.color }}
              />
            ))}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </button>
    )
  }

  // Expanded view
  return (
    <div
      className="absolute bottom-4 left-4 bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-lg"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header with collapse button */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/50 rounded-t-lg transition-colors"
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Planets
        </span>
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>

      {/* Planet list */}
      <div className="px-2 pb-2 space-y-0.5">
        {planets.map(({ name, data }) => (
          <button
            key={name}
            onClick={() => onPlanetSelect(name)}
            className={`
              w-full flex items-center gap-2 px-2 py-1 rounded transition-all text-sm
              hover:bg-slate-700/50
              ${selectedPlanets.includes(name) ? 'bg-slate-600/50 ring-1 ring-blue-400/50' : ''}
            `}
          >
            {/* Planet color indicator */}
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: data.color,
                boxShadow: `0 0 4px ${data.color}`,
              }}
            />

            {/* Planet symbol and name */}
            <AstroSymbol planet={name} size={12} color={data.color} />
            <span className="text-slate-300 text-xs">{data.name}</span>

            {/* Selection indicator */}
            {selectedPlanets.includes(name) && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
