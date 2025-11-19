import { PLANETS } from '@/lib/astronomy/planetaryData'
import { AstroSymbol } from './AstroSymbol'

interface PlanetKeyProps {
  selectedPlanets: string[]
  onPlanetSelect: (planetName: string) => void
}

export const PlanetKey = ({ selectedPlanets, onPlanetSelect }: PlanetKeyProps) => {
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

  return (
    <div
      className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 shadow-xl"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
        Planet Key
      </div>
      <div className="space-y-1">
        {planets.map(({ name, data }) => (
          <button
            key={name}
            onClick={() => onPlanetSelect(name)}
            className={`
              w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all
              hover:bg-slate-700/50 hover:scale-105
              ${selectedPlanets.includes(name) ? 'bg-slate-600/70 ring-2 ring-blue-400' : ''}
            `}
          >
            {/* Planet color indicator */}
            <div
              className="w-3 h-3 rounded-full border border-white/30 shadow-lg"
              style={{
                backgroundColor: data.color,
                boxShadow: `0 0 8px ${data.color}`,
              }}
            />

            {/* Planet symbol and name */}
            <div className="flex items-center gap-1.5 flex-1 text-left">
              <AstroSymbol planet={name} size={16} color={data.color} />
              <span className="text-sm text-slate-200 font-medium">{data.name}</span>
            </div>

            {/* Selection indicator */}
            {selectedPlanets.includes(name) && (
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
