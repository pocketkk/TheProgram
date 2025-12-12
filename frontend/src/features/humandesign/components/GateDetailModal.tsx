/**
 * Gate Detail Modal
 *
 * Shows detailed information about a specific gate including
 * its meaning, channel connections, Gene Keys, and I Ching hexagram.
 */
import React, { useEffect, useState } from 'react'
import { getGateInfo, getChannelInfo, type HDGateInfo, type HDChannelInfo } from '@/lib/api/humanDesign'
import { CHANNEL_CONNECTIONS, GATE_POSITIONS } from '../types'

interface GateDetailModalProps {
  gateNumber: number
  activationType: 'personality' | 'design' | 'both' | null
  activeGates: Map<number, 'personality' | 'design' | 'both'>
  onClose: () => void
  onNavigateToGate?: (gate: number) => void
}

// Find which center a gate belongs to
const getCenterForGate = (gate: number): string | null => {
  for (const [center, gates] of Object.entries(GATE_POSITIONS)) {
    if (gates.includes(gate)) {
      return center
    }
  }
  return null
}

// Center display names
const CENTER_DISPLAY_NAMES: Record<string, string> = {
  head: 'Head',
  ajna: 'Ajna',
  throat: 'Throat',
  g_center: 'G Center',
  heart: 'Heart/Will',
  sacral: 'Sacral',
  solar_plexus: 'Solar Plexus',
  spleen: 'Spleen',
  root: 'Root',
}

export const GateDetailModal: React.FC<GateDetailModalProps> = ({
  gateNumber,
  activationType,
  activeGates,
  onClose,
  onNavigateToGate,
}) => {
  const [gateInfo, setGateInfo] = useState<HDGateInfo | null>(null)
  const [channelInfoMap, setChannelInfoMap] = useState<Map<string, HDChannelInfo>>(new Map())
  const [loading, setLoading] = useState(true)

  const center = getCenterForGate(gateNumber)
  const isActive = activationType !== null

  // Find all channels this gate is part of (deduplicated by partner gate)
  const connectedChannels = CHANNEL_CONNECTIONS.filter(
    ch => ch.gates[0] === gateNumber || ch.gates[1] === gateNumber
  ).filter((ch, index, arr) => {
    // Get partner gate for this channel
    const partnerGate = ch.gates[0] === gateNumber ? ch.gates[1] : ch.gates[0]
    // Only keep the first occurrence of each partner gate
    return arr.findIndex(c =>
      (c.gates[0] === gateNumber ? c.gates[1] : c.gates[0]) === partnerGate
    ) === index
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch gate info
        const info = await getGateInfo(gateNumber)
        setGateInfo(info)

        // Fetch channel info for connected channels
        const channelPromises = connectedChannels.map(async (ch) => {
          try {
            const chInfo = await getChannelInfo(ch.id)
            return [ch.id, chInfo] as [string, HDChannelInfo]
          } catch {
            return null
          }
        })

        const results = await Promise.all(channelPromises)
        const infoMap = new Map<string, HDChannelInfo>()
        results.forEach(result => {
          if (result) {
            infoMap.set(result[0], result[1])
          }
        })
        setChannelInfoMap(infoMap)
      } catch (error) {
        console.error('Error fetching gate info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [gateNumber])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b border-gray-700 ${
          isActive
            ? activationType === 'personality'
              ? 'bg-red-900/20'
              : activationType === 'design'
              ? 'bg-indigo-900/20'
              : 'bg-amber-900/20'
            : 'bg-gray-800/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${
                isActive
                  ? activationType === 'personality'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : activationType === 'design'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}>
                {gateNumber}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Gate {gateNumber}
                </h3>
                <p className="text-sm text-gray-400">
                  {center ? CENTER_DISPLAY_NAMES[center] : 'Unknown'} Center
                  {isActive && (
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      activationType === 'personality'
                        ? 'bg-red-500/20 text-red-300'
                        : activationType === 'design'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {activationType === 'both' ? 'Both' : activationType === 'personality' ? 'Personality' : 'Design'}
                    </span>
                  )}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="space-y-4">
              <div className="animate-pulse h-24 bg-gray-800 rounded-lg" />
              <div className="animate-pulse h-32 bg-gray-800 rounded-lg" />
            </div>
          ) : gateInfo ? (
            <>
              {/* Gate Name and Keyword */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-medium text-celestial-gold">{gateInfo.name}</h4>
                  {gateInfo.hexagram_name && gateInfo.hexagram_name !== gateInfo.name && (
                    <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                      ☯ {gateInfo.hexagram_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-gray-500">Keyword</span>
                  <span className="text-white font-medium">{gateInfo.keynote}</span>
                </div>
                {gateInfo.theme && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-gray-500">Circuit</span>
                    <span className="text-gray-300">{gateInfo.theme}</span>
                  </div>
                )}
                {gateInfo.channel_name && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-gray-500">Channel</span>
                    <span className="text-gray-300">{gateInfo.channel_name}</span>
                  </div>
                )}
              </div>

              {/* Gate Description */}
              {gateInfo.description && (
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                  <p className="text-gray-300 text-sm leading-relaxed">{gateInfo.description}</p>
                </div>
              )}

              {/* Line Descriptions (if available) */}
              {gateInfo.line_descriptions && Object.keys(gateInfo.line_descriptions).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <span className="text-celestial-gold">☰</span>
                    Line Descriptions
                  </h4>
                  <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50 space-y-2">
                    {Object.entries(gateInfo.line_descriptions).map(([line, desc]) => (
                      <div key={line} className="flex items-start gap-3">
                        <span className="text-xs text-celestial-gold w-8 flex-shrink-0 pt-0.5">Line {line}</span>
                        <span className="text-gray-300 text-sm">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gene Keys - only show if data available */}
              {(gateInfo.shadow || gateInfo.gift || gateInfo.siddhi) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <span className="text-purple-400">✧</span>
                    Gene Keys Spectrum
                  </h4>
                  <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50 space-y-2">
                    {gateInfo.shadow && (
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-gray-500 w-14 flex-shrink-0 pt-0.5">Shadow</span>
                        <span className="text-gray-400">{gateInfo.shadow}</span>
                      </div>
                    )}
                    {gateInfo.gift && (
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-celestial-gold w-14 flex-shrink-0 pt-0.5">Gift</span>
                        <span className="text-celestial-gold">{gateInfo.gift}</span>
                      </div>
                    )}
                    {gateInfo.siddhi && (
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-purple-400 w-14 flex-shrink-0 pt-0.5">Siddhi</span>
                        <span className="text-purple-300">{gateInfo.siddhi}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Channel Connections */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <span className="text-celestial-gold">⚡</span>
                  Channel Connections ({connectedChannels.length})
                </h4>
                <div className="space-y-2">
                  {connectedChannels.map(channel => {
                    const partnerGate = channel.gates[0] === gateNumber ? channel.gates[1] : channel.gates[0]
                    const partnerActivation = activeGates.get(partnerGate)
                    const isChannelComplete = isActive && partnerActivation
                    const channelInfo = channelInfoMap.get(channel.id)
                    const otherCenter = channel.centers[0] === center ? channel.centers[1] : channel.centers[0]

                    return (
                      <div
                        key={channel.id}
                        className={`rounded-lg p-3 border cursor-pointer transition-all hover:scale-[1.01] ${
                          isChannelComplete
                            ? 'bg-celestial-gold/10 border-celestial-gold/30 hover:bg-celestial-gold/15'
                            : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                        }`}
                        onClick={() => onNavigateToGate?.(partnerGate)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm ${isChannelComplete ? 'text-celestial-gold' : 'text-gray-400'}`}>
                              {channel.id}
                            </span>
                            {isChannelComplete && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-celestial-gold/20 text-celestial-gold">
                                Defined
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>→ Gate {partnerGate}</span>
                            {partnerActivation && (
                              <span className={`px-1.5 py-0.5 rounded ${
                                partnerActivation === 'personality'
                                  ? 'bg-red-500/20 text-red-300'
                                  : partnerActivation === 'design'
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {partnerActivation === 'both' ? 'Both' : partnerActivation === 'personality' ? 'Pers' : 'Des'}
                              </span>
                            )}
                          </div>
                        </div>
                        {channelInfo && (
                          <p className={`text-sm ${isChannelComplete ? 'text-white' : 'text-gray-400'}`}>
                            {channelInfo.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {CENTER_DISPLAY_NAMES[center || ''] || center} ↔ {CENTER_DISPLAY_NAMES[otherCenter] || otherCenter}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No information available for Gate {gateNumber}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/30">
          <p className="text-xs text-gray-500 text-center">
            Click a channel to explore the partner gate
          </p>
        </div>
      </div>
    </div>
  )
}

export default GateDetailModal
