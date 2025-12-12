/**
 * Controls for Human Design page
 *
 * Toggle visibility, zodiac options, view modes
 */
import React from 'react'
import { useHDStore } from '../stores/hdStore'
import { Button } from '@/components/ui/Button'

interface ControlsProps {
  className?: string
}

export const Controls: React.FC<ControlsProps> = ({ className = '' }) => {
  const {
    viewMode,
    setViewMode,
    showDesignGates,
    showPersonalityGates,
    showChannels,
    toggleDesignGates,
    togglePersonalityGates,
    toggleChannels,
    zodiac,
    setZodiac,
    siderealMethod,
    setSiderealMethod,
    ayanamsa,
    setAyanamsa,
    isLoading,
    chart,
  } = useHDStore()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* View Mode Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-800 rounded-lg p-1">
        {(['bodygraph', 'activations', 'reading'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${viewMode === mode
                ? 'bg-celestial-gold text-gray-900'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            data-testid={`hd-tab-${mode}`}
          >
            {mode === 'bodygraph' && 'Body Graph'}
            {mode === 'activations' && 'Activations'}
            {mode === 'reading' && 'Reading'}
          </button>
        ))}
      </div>

      {/* Visibility Toggles */}
      {viewMode === 'bodygraph' && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Display</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleChannels}
              className={`px-3 py-1.5 rounded text-sm ${showChannels
                  ? 'bg-celestial-gold/20 text-celestial-gold border border-celestial-gold/50'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              data-testid="hd-toggle-channels"
              aria-label="Toggle channel visibility"
            >
              Channels
            </button>
            <button
              onClick={togglePersonalityGates}
              className={`px-3 py-1.5 rounded text-sm ${showPersonalityGates
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              data-testid="hd-toggle-personality"
              aria-label="Toggle personality gates"
            >
              Personality
            </button>
            <button
              onClick={toggleDesignGates}
              className={`px-3 py-1.5 rounded text-sm ${showDesignGates
                  ? 'bg-gray-600/20 text-gray-300 border border-gray-500/50'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              data-testid="hd-toggle-design"
              aria-label="Toggle design gates"
            >
              Design
            </button>
          </div>
        </div>
      )}

      {/* Zodiac Settings */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Zodiac</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setZodiac('tropical')}
            className={`flex-1 px-3 py-1.5 rounded text-sm ${zodiac === 'tropical'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            data-testid="hd-btn-zodiac-tropical"
          >
            Tropical
          </button>
          <button
            onClick={() => setZodiac('sidereal')}
            className={`flex-1 px-3 py-1.5 rounded text-sm ${zodiac === 'sidereal'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            data-testid="hd-btn-zodiac-sidereal"
          >
            Sidereal
          </button>
        </div>

        {/* Sidereal Options */}
        {zodiac === 'sidereal' && (
          <div className="space-y-2 mt-2 pl-2 border-l-2 border-purple-500/30">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Method</label>
              <select
                value={siderealMethod}
                onChange={(e) => setSiderealMethod(e.target.value as 'shift_positions' | 'shift_wheel')}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                data-testid="hd-select-sidereal-method"
                aria-label="Select sidereal method"
              >
                <option value="shift_positions">Shift Positions</option>
                <option value="shift_wheel">Shift Wheel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ayanamsa</label>
              <select
                value={ayanamsa}
                onChange={(e) => setAyanamsa(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                data-testid="hd-select-ayanamsa"
                aria-label="Select ayanamsa"
              >
                <option value="lahiri">Lahiri</option>
                <option value="raman">Raman</option>
                <option value="krishnamurti">Krishnamurti</option>
                <option value="fagan_bradley">Fagan-Bradley</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Chart Info */}
      {chart && (
        <div className="space-y-2 text-xs text-gray-500 border-t border-gray-700 pt-3">
          <p>Personality: {new Date(chart.personality_datetime).toLocaleDateString()}</p>
          <p>Design Date: {new Date(chart.design_datetime).toLocaleDateString()} (~88 days prior)</p>
          <p>Gates Active: {chart.all_activated_gates?.length || 0}</p>
          <p>Channels Defined: {Array.isArray(chart.channels) ? chart.channels.length : 0}</p>
        </div>
      )}
    </div>
  )
}

export default Controls
