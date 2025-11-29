/**
 * Activation Detail Popup
 *
 * Shows detailed information about a planet's gate activation including
 * gate info, channel connections, colors, tones, and bases
 */
import React, { useEffect, useState } from 'react'
import { getGateInfo, getChannelInfo, getPlanetSymbol, type GateActivation, type HDGateInfo, type HDChannelInfo } from '@/lib/api/humanDesign'
import { CHANNEL_CONNECTIONS } from '../types'

interface ActivationDetailPopupProps {
  activation: GateActivation
  isDesign: boolean
  allActivatedGates: number[]
  onClose: () => void
}

// Color names for HD system
const COLOR_NAMES: Record<number, string> = {
  1: 'Fear',
  2: 'Hope',
  3: 'Desire',
  4: 'Need',
  5: 'Guilt',
  6: 'Innocence',
}

// Tone names for HD system
const TONE_NAMES: Record<number, string> = {
  1: 'Survival',
  2: 'Uncertainty',
  3: 'Action',
  4: 'Meditation',
  5: 'Judgment',
  6: 'Acceptance',
}

// Base names for HD system
const BASE_NAMES: Record<number, string> = {
  1: '1st Base',
  2: '2nd Base',
  3: '3rd Base',
  4: '4th Base',
  5: '5th Base',
}

export const ActivationDetailPopup: React.FC<ActivationDetailPopupProps> = ({
  activation,
  isDesign,
  allActivatedGates,
  onClose,
}) => {
  const [gateInfo, setGateInfo] = useState<HDGateInfo | null>(null)
  const [channelInfo, setChannelInfo] = useState<HDChannelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [channelPartner, setChannelPartner] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch gate info
        const gate = await getGateInfo(activation.gate)
        setGateInfo(gate)

        // Check if this gate forms a channel with any other activated gate
        const connections = CHANNEL_CONNECTIONS.filter(
          ch => ch.gates[0] === activation.gate || ch.gates[1] === activation.gate
        )

        for (const conn of connections) {
          const partnerGate = conn.gates[0] === activation.gate ? conn.gates[1] : conn.gates[0]
          if (allActivatedGates.includes(partnerGate)) {
            setChannelPartner(partnerGate)
            // Fetch channel info
            try {
              const channel = await getChannelInfo(conn.id)
              setChannelInfo(channel)
            } catch {
              // Channel info not available, use connection data
              setChannelInfo({
                channel_id: conn.id,
                name: `Channel ${conn.gates[0]}-${conn.gates[1]}`,
                gates: conn.gates,
                center_from: conn.centers[0],
                center_to: conn.centers[1],
                type: '',
                keynote: '',
                description: '',
              })
            }
            break
          }
        }
      } catch (error) {
        console.error('Error fetching gate/channel info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activation.gate, allActivatedGates])

  const degree = activation.degree ?? activation.degree_in_sign ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b border-gray-700 ${isDesign ? 'bg-gray-800/50' : 'bg-red-900/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${isDesign ? 'text-gray-400' : 'text-red-400'}`}>
                {getPlanetSymbol(activation.planet)}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {activation.planet}
                </h3>
                <p className={`text-sm ${isDesign ? 'text-gray-400' : 'text-red-300'}`}>
                  {isDesign ? 'Design (Unconscious)' : 'Personality (Conscious)'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Gate Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-celestial-gold font-medium">
                Gate {activation.gate}.{activation.line}
              </h4>
              <span className="text-xs text-gray-500">
                {activation.sign} {degree.toFixed(1)}°
              </span>
            </div>

            {loading ? (
              <div className="animate-pulse h-16 bg-gray-800 rounded" />
            ) : gateInfo ? (
              <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                <p className="text-white font-medium">{gateInfo.name}</p>
                <p className="text-sm text-gray-400">{gateInfo.keynote}</p>
                {gateInfo.hexagram_name && (
                  <p className="text-xs text-gray-500">
                    I Ching: {gateInfo.hexagram_name}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-white font-medium">
                  {activation.gate_name || `Gate ${activation.gate}`}
                </p>
                <p className="text-sm text-gray-400">
                  {activation.gate_keyword || ''}
                </p>
              </div>
            )}
          </div>

          {/* Channel Info (if forms a channel) */}
          {channelPartner && channelInfo && (
            <div className="space-y-2">
              <h4 className="text-celestial-gold font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Defined Channel
              </h4>
              <div className="bg-celestial-gold/10 border border-celestial-gold/30 rounded-lg p-3 space-y-2">
                <p className="text-white font-medium">{channelInfo.name}</p>
                <p className="text-sm text-gray-400">
                  Gates {channelInfo.gates[0]} - {channelInfo.gates[1]}
                </p>
                {channelInfo.keynote && (
                  <p className="text-sm text-gray-300 italic">{channelInfo.keynote}</p>
                )}
              </div>
            </div>
          )}

          {/* Variables (Color, Tone, Base) */}
          {(activation.color || activation.tone || activation.base) && (
            <div className="space-y-2">
              <h4 className="text-gray-400 font-medium text-sm">Variables</h4>
              <div className="grid grid-cols-3 gap-2">
                {activation.color && (
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 mb-1">Color</div>
                    <div className="text-white font-medium">{activation.color}</div>
                    <div className="text-xs text-gray-400">
                      {COLOR_NAMES[activation.color] || ''}
                    </div>
                  </div>
                )}
                {activation.tone && (
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 mb-1">Tone</div>
                    <div className="text-white font-medium">{activation.tone}</div>
                    <div className="text-xs text-gray-400">
                      {TONE_NAMES[activation.tone] || ''}
                    </div>
                  </div>
                )}
                {activation.base && (
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 mb-1">Base</div>
                    <div className="text-white font-medium">{activation.base}</div>
                    <div className="text-xs text-gray-400">
                      {BASE_NAMES[activation.base] || ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gene Keys (if available from gate info) */}
          {gateInfo && (gateInfo.shadow || gateInfo.gift || gateInfo.siddhi) && (
            <div className="space-y-2">
              <h4 className="text-gray-400 font-medium text-sm">Gene Keys</h4>
              <div className="space-y-1 text-sm">
                {gateInfo.shadow && (
                  <div className="flex">
                    <span className="text-gray-500 w-16">Shadow:</span>
                    <span className="text-gray-300">{gateInfo.shadow}</span>
                  </div>
                )}
                {gateInfo.gift && (
                  <div className="flex">
                    <span className="text-gray-500 w-16">Gift:</span>
                    <span className="text-celestial-gold">{gateInfo.gift}</span>
                  </div>
                )}
                {gateInfo.siddhi && (
                  <div className="flex">
                    <span className="text-gray-500 w-16">Siddhi:</span>
                    <span className="text-purple-400">{gateInfo.siddhi}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Position Info */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
            <div className="flex justify-between">
              <span>Ecliptic Longitude:</span>
              <span>{activation.longitude.toFixed(4)}°</span>
            </div>
            <div className="flex justify-between">
              <span>Zodiac Position:</span>
              <span>{activation.sign} {degree.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivationDetailPopup
