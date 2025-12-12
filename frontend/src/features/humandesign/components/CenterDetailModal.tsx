/**
 * Center Detail Modal
 *
 * Shows an enlarged view of a center with all gates, activation status,
 * and detailed information about the center's meaning and function.
 */
import React, { useEffect, useState } from 'react'
import { getCenterInfo, getGateInfo, type HDCenterInfo, type HDGateInfo } from '@/lib/api/humanDesign'
import { GATE_POSITIONS, CENTER_SHAPES, CHANNEL_CONNECTIONS } from '../types'
import { GateDetailModal } from './GateDetailModal'

interface CenterDetailModalProps {
  centerName: string
  defined: boolean
  activeGates: Map<number, 'personality' | 'design' | 'both'>
  allActiveChannels: Set<string>
  onClose: () => void
}

// Center display names
const CENTER_DISPLAY_NAMES: Record<string, string> = {
  head: 'Head Center',
  ajna: 'Ajna Center',
  throat: 'Throat Center',
  g_center: 'G Center (Identity)',
  heart: 'Heart/Will Center',
  sacral: 'Sacral Center',
  solar_plexus: 'Solar Plexus Center',
  spleen: 'Spleen Center',
  root: 'Root Center',
}

// Center colors for visual representation
const CENTER_COLORS: Record<string, { defined: string; undefined: string }> = {
  head: { defined: '#FCD34D', undefined: '#374151' },
  ajna: { defined: '#FCD34D', undefined: '#374151' },
  throat: { defined: '#FCD34D', undefined: '#374151' },
  g_center: { defined: '#FCD34D', undefined: '#374151' },
  heart: { defined: '#FCD34D', undefined: '#374151' },
  sacral: { defined: '#FCD34D', undefined: '#374151' },
  solar_plexus: { defined: '#FCD34D', undefined: '#374151' },
  spleen: { defined: '#FCD34D', undefined: '#374151' },
  root: { defined: '#FCD34D', undefined: '#374151' },
}

// SVG shape renderer for center
const CenterShapeSVG: React.FC<{
  shape: string
  size: number
  defined: boolean
  color: string
}> = ({ shape, size, defined, color }) => {
  const halfSize = size / 2

  switch (shape) {
    case 'crown':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="crownGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={defined ? '#FDE68A' : '#4B5563'} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <path
            d={`M${halfSize} ${size * 0.15}
               L${size * 0.75} ${size * 0.35}
               L${size * 0.65} ${size * 0.6}
               L${size * 0.35} ${size * 0.6}
               L${size * 0.25} ${size * 0.35}
               Z`}
            fill="url(#crownGradient)"
            stroke={defined ? '#FCD34D' : '#6B7280'}
            strokeWidth="2"
          />
          <circle cx={halfSize} cy={size * 0.75} r={size * 0.15} fill={color} stroke={defined ? '#FCD34D' : '#6B7280'} strokeWidth="1" />
        </svg>
      )
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${halfSize},${size * 0.1} ${size * 0.9},${size * 0.9} ${size * 0.1},${size * 0.9}`}
            fill={color}
            stroke={defined ? '#FCD34D' : '#6B7280'}
            strokeWidth="2"
          />
        </svg>
      )
    case 'triangle_down':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${size * 0.1},${size * 0.1} ${size * 0.9},${size * 0.1} ${halfSize},${size * 0.9}`}
            fill={color}
            stroke={defined ? '#FCD34D' : '#6B7280'}
            strokeWidth="2"
          />
        </svg>
      )
    case 'square':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect
            x={size * 0.1}
            y={size * 0.1}
            width={size * 0.8}
            height={size * 0.8}
            rx={size * 0.1}
            fill={color}
            stroke={defined ? '#FCD34D' : '#6B7280'}
            strokeWidth="2"
          />
        </svg>
      )
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${halfSize},${size * 0.1} ${size * 0.9},${halfSize} ${halfSize},${size * 0.9} ${size * 0.1},${halfSize}`}
            fill={color}
            stroke={defined ? '#FCD34D' : '#6B7280'}
            strokeWidth="2"
          />
        </svg>
      )
    default:
      return null
  }
}

export const CenterDetailModal: React.FC<CenterDetailModalProps> = ({
  centerName,
  defined,
  activeGates,
  allActiveChannels,
  onClose,
}) => {
  const [centerInfo, setCenterInfo] = useState<HDCenterInfo | null>(null)
  const [gateInfoMap, setGateInfoMap] = useState<Map<number, HDGateInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedGate, setSelectedGate] = useState<number | null>(null)

  const gates = GATE_POSITIONS[centerName] || []
  const shape = CENTER_SHAPES[centerName] || 'square'
  const colors = CENTER_COLORS[centerName] || { defined: '#FCD34D', undefined: '#374151' }

  // Find channels connected to this center
  const connectedChannels = CHANNEL_CONNECTIONS.filter(
    ch => ch.centers.includes(centerName)
  ).filter(ch => allActiveChannels.has(ch.id) || allActiveChannels.has(`${ch.gates[1]}-${ch.gates[0]}`))

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch center info
        const info = await getCenterInfo(centerName)
        setCenterInfo(info)

        // Fetch info for ALL gates in this center (for exploration)
        const gateInfoPromises = gates.map(async (gate) => {
          try {
            const info = await getGateInfo(gate)
            return [gate, info] as [number, HDGateInfo]
          } catch {
            return null
          }
        })

        const results = await Promise.all(gateInfoPromises)
        const infoMap = new Map<number, HDGateInfo>()
        results.forEach(result => {
          if (result) {
            infoMap.set(result[0], result[1])
          }
        })
        setGateInfoMap(infoMap)
      } catch (error) {
        console.error('Error fetching center info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [centerName, gates, activeGates])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b border-gray-700 ${defined ? 'bg-celestial-gold/10' : 'bg-gray-800/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <CenterShapeSVG
                  shape={shape}
                  size={48}
                  defined={defined}
                  color={defined ? colors.defined : colors.undefined}
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {CENTER_DISPLAY_NAMES[centerName] || centerName}
                </h3>
                <p className={`text-sm ${defined ? 'text-celestial-gold' : 'text-gray-400'}`}>
                  {defined ? 'Defined (Consistent Energy)' : 'Open (Receptive/Amplifying)'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="animate-pulse h-20 bg-gray-800 rounded-lg" />
              <div className="animate-pulse h-32 bg-gray-800 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Center Meaning */}
              {centerInfo && (
                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Theme</h4>
                      <p className="text-white">{centerInfo.theme}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Biological Correlation</h4>
                      <p className="text-gray-300 text-sm">{centerInfo.biological_correlation}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        {defined ? 'Defined Meaning' : 'Open/Undefined Meaning'}
                      </h4>
                      <p className="text-gray-300 text-sm">
                        {defined ? centerInfo.defined_meaning : centerInfo.undefined_meaning}
                      </p>
                    </div>
                    {!defined && centerInfo.not_self_question && (
                      <div className="border-t border-gray-700 pt-3">
                        <h4 className="text-xs uppercase tracking-wider text-amber-500/80 mb-1">Not-Self Question</h4>
                        <p className="text-amber-200/90 text-sm italic">"{centerInfo.not_self_question}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gates Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <span className="text-celestial-gold">⬡</span>
                  Gates in This Center ({gates.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {gates.map(gate => {
                    const activation = activeGates.get(gate)
                    const isActive = !!activation
                    const gateInfo = gateInfoMap.get(gate)

                    return (
                      <div
                        key={gate}
                        onClick={() => setSelectedGate(gate)}
                        className={`rounded-lg p-3 border transition-all cursor-pointer hover:scale-[1.02] ${
                          isActive
                            ? activation === 'personality'
                              ? 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                              : activation === 'design'
                              ? 'bg-indigo-900/20 border-indigo-500/30 hover:bg-indigo-900/30'
                              : 'bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30'
                            : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold ${
                            isActive
                              ? activation === 'personality'
                                ? 'text-red-400'
                                : activation === 'design'
                                ? 'text-indigo-400'
                                : 'text-amber-400'
                              : 'text-gray-500'
                          }`}>
                            Gate {gate}
                          </span>
                          {isActive && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              activation === 'personality'
                                ? 'bg-red-500/20 text-red-300'
                                : activation === 'design'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {activation === 'both' ? 'Both' : activation === 'personality' ? 'Pers' : 'Design'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          {gateInfo ? (
                            <div>
                              <p className={`text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                {gateInfo.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{gateInfo.keynote}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              {isActive ? 'Activated' : 'Click to explore'}
                            </p>
                          )}
                        </div>
                        {/* Click indicator */}
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Connected Channels */}
              {connectedChannels.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <span className="text-celestial-gold">⚡</span>
                    Active Channels Through This Center ({connectedChannels.length})
                  </h4>
                  <div className="space-y-2">
                    {connectedChannels.map(channel => {
                      const otherCenter = channel.centers[0] === centerName ? channel.centers[1] : channel.centers[0]
                      return (
                        <div
                          key={channel.id}
                          className="bg-celestial-gold/10 border border-celestial-gold/20 rounded-lg p-3 flex justify-between items-center"
                        >
                          <div>
                            <span className="text-white font-medium">Channel {channel.id}</span>
                            <span className="text-gray-400 text-sm ml-2">
                              → {CENTER_DISPLAY_NAMES[otherCenter]?.replace(' Center', '') || otherCenter}
                            </span>
                          </div>
                          <span className="text-xs text-celestial-gold font-mono">
                            {channel.gates[0]}–{channel.gates[1]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/30">
          <p className="text-xs text-gray-500 text-center">
            Click any gate to explore its details and channel connections
          </p>
        </div>
      </div>

      {/* Gate Detail Modal */}
      {selectedGate !== null && (
        <GateDetailModal
          gateNumber={selectedGate}
          activationType={activeGates.get(selectedGate) || null}
          activeGates={activeGates}
          onClose={() => setSelectedGate(null)}
          onNavigateToGate={(gate) => setSelectedGate(gate)}
        />
      )}
    </div>
  )
}

export default CenterDetailModal
