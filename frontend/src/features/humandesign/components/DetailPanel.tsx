/**
 * Detail Panel for Human Design selections
 *
 * Shows detailed information when user clicks on centers, channels, or gates
 */
import React, { useState, useMemo } from 'react'
import { useHDStore } from '../stores/hdStore'
import { getCenterDisplayName, getAuthorityDisplayName, getPlanetSymbol } from '@/lib/api/humanDesign'
import { ActivationDetailPopup } from './ActivationDetailPopup'
import { CHANNEL_CONNECTIONS, type CenterDefinition, type ChannelDefinition, type GateActivation } from '../types'

interface DetailPanelProps {
  className?: string
}

const CenterDetail: React.FC<{ center: CenterDefinition }> = ({ center }) => {
  const activeGates = center.active_gates || center.activated_gates || []
  const gates = center.gates || activeGates

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-celestial-gold">
          {getCenterDisplayName(center.center || center.name || '')}
        </h3>
        <span className={`px-2 py-1 rounded text-sm ${center.defined ? 'bg-celestial-gold/20 text-celestial-gold' : 'bg-gray-700 text-gray-400'}`}>
          {center.defined ? 'Defined' : 'Undefined'}
        </span>
      </div>

      <div className="text-sm text-gray-300 space-y-2">
        <p><span className="text-gray-500">Biological:</span> {center.biological_correlation}</p>
        <p><span className="text-gray-500">Theme:</span> {center.theme}</p>
      </div>

      {gates && gates.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Active Gates in this Center</h4>
          <div className="flex flex-wrap gap-1">
            {gates.map(gate => (
              <span
                key={gate}
                className="px-2 py-1 rounded text-xs bg-celestial-gold/30 text-celestial-gold"
              >
                {gate}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeGates.length > 0 && (
        <div className="text-sm">
          <span className="text-gray-500">Active Gates: </span>
          <span className="text-celestial-gold">{activeGates.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

const ChannelDetail: React.FC<{ channel: ChannelDefinition }> = ({ channel }) => {
  const gates = channel?.gates || (channel?.gate1 && channel?.gate2 ? [channel.gate1, channel.gate2] : null)
  const centerFrom = channel?.center_from || channel?.center1 || ''
  const centerTo = channel?.center_to || channel?.center2 || ''

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-celestial-gold">
        {channel?.name || 'Channel'}
      </h3>

      <div className="text-sm text-gray-300 space-y-2">
        {gates && gates.length >= 2 && (
          <p><span className="text-gray-500">Gates:</span> {gates[0]} - {gates[1]}</p>
        )}
        <p><span className="text-gray-500">Centers:</span> {getCenterDisplayName(centerFrom)} to {getCenterDisplayName(centerTo)}</p>
        {channel?.circuit && (
          <p><span className="text-gray-500">Circuit:</span> {channel.circuit}</p>
        )}
        {channel?.type && (
          <p><span className="text-gray-500">Type:</span> {channel.type}</p>
        )}
      </div>

      {channel?.description && (
        <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-300 italic">{channel.description}</p>
        </div>
      )}

      {channel?.keynote && !channel?.description && (
        <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-300 italic">{channel.keynote}</p>
        </div>
      )}
    </div>
  )
}

const ChartOverview: React.FC = () => {
  const { chart } = useHDStore()

  if (!chart) return null

  // Get type from either type (transformed) or hd_type (raw)
  const hdType = chart?.type || chart?.hd_type || ''
  const formattedType = hdType ? hdType.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-celestial-gold">Chart Overview</h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500 block">Type</span>
          <span className="text-white font-medium">{formattedType}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Strategy</span>
          <span className="text-white font-medium">{chart?.strategy || ''}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Authority</span>
          <span className="text-white font-medium">{chart?.authority ? getAuthorityDisplayName(chart.authority) : ''}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Definition</span>
          <span className="text-white font-medium">{chart?.definition?.replace('_', ' ') || ''}</span>
        </div>
      </div>

      {chart?.profile && (
        <div className="border-t border-gray-700 pt-3">
          <span className="text-gray-500 block text-sm mb-1">Profile</span>
          <span className="text-celestial-gold font-medium">
            {chart.profile.name}
          </span>
          <p className="text-xs text-gray-400 mt-1">{chart.profile.angle}</p>
        </div>
      )}

      {chart?.incarnation_cross && (
        <div className="border-t border-gray-700 pt-3">
          <span className="text-gray-500 block text-sm mb-1">Incarnation Cross</span>
          <span className="text-celestial-gold font-medium">{chart.incarnation_cross.name}</span>
          <p className="text-xs text-gray-400 mt-1">{(chart.incarnation_cross as { cross_type?: string }).cross_type || chart.incarnation_cross.type || ''}</p>
        </div>
      )}

      {Array.isArray(chart?.channels) && chart.channels.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <span className="text-gray-500 block text-sm mb-2">Defined Channels ({chart.channels.length})</span>
          <div className="space-y-1">
            {chart.channels.map((channel: ChannelDefinition) => {
              const gates = channel.gates || (channel.gate1 && channel.gate2 ? [channel.gate1, channel.gate2] : null)
              return (
                <div key={channel.channel_id || channel.name || `${channel.gate1}-${channel.gate2}`} className="text-sm">
                  <span className="text-white">{channel.name || 'Unknown'}</span>
                  {gates && gates.length >= 2 && (
                    <span className="text-gray-500 text-xs ml-2">({gates[0]}-{gates[1]})</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const ActivationsView: React.FC = () => {
  const { chart } = useHDStore()
  const [selectedActivation, setSelectedActivation] = useState<{ activation: GateActivation; isDesign: boolean } | null>(null)

  // Get all activated gates for channel detection
  const allActivatedGates = useMemo(() => {
    if (!chart) return []
    const personalityActivations = Array.isArray(chart.personality_activations) ? chart.personality_activations : []
    const designActivations = Array.isArray(chart.design_activations) ? chart.design_activations : []
    const personalityGates = personalityActivations.map((a: GateActivation) => a.gate)
    const designGates = designActivations.map((a: GateActivation) => a.gate)
    return [...new Set([...personalityGates, ...designGates])]
  }, [chart])

  // Build a map of gates to their channel partners (if they form a channel)
  const gateChannelMap = useMemo(() => {
    const map: Record<number, { partnerId: number; channelName: string }> = {}
    for (const conn of CHANNEL_CONNECTIONS) {
      const [gate1, gate2] = conn.gates
      if (allActivatedGates.includes(gate1) && allActivatedGates.includes(gate2)) {
        map[gate1] = { partnerId: gate2, channelName: `${gate1}-${gate2}` }
        map[gate2] = { partnerId: gate1, channelName: `${gate1}-${gate2}` }
      }
    }
    return map
  }, [allActivatedGates])

  if (!chart) return null

  const renderActivation = (activation: GateActivation, isDesign: boolean) => {
    const degree = activation.degree ?? activation.degree_in_sign ?? 0
    const channelInfo = gateChannelMap[activation.gate]
    const gateName = activation.gate_name || activation.gate_keyword || ''

    return (
      <div
        key={`${activation.gate}-${activation.planet}-${isDesign}`}
        className="flex items-center justify-between text-sm py-1.5 px-2 -mx-2 rounded cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setSelectedActivation({ activation, isDesign })}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`flex-shrink-0 ${isDesign ? 'text-gray-500' : 'text-red-400'}`}>
            {getPlanetSymbol(activation.planet)}
          </span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-medium">Gate {activation.gate}.{activation.line}</span>
              {channelInfo && (
                <span className="text-celestial-gold text-xs" title={`Channel ${channelInfo.channelName}`}>
                  ⚡
                </span>
              )}
            </div>
            {gateName && (
              <span className="text-gray-400 text-xs truncate">{gateName}</span>
            )}
          </div>
        </div>
        <div className="text-gray-500 text-xs flex-shrink-0 ml-2">
          {activation.sign} {degree.toFixed(1)}°
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          Personality (Conscious)
        </h4>
        <div className="space-y-0.5">
          {Array.isArray(chart?.personality_activations) && chart.personality_activations.map((a: GateActivation) => renderActivation(a, false))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-600" />
          Design (Unconscious)
        </h4>
        <div className="space-y-0.5">
          {Array.isArray(chart?.design_activations) && chart.design_activations.map((a: GateActivation) => renderActivation(a, true))}
        </div>
      </div>

      {/* Activation Detail Popup */}
      {selectedActivation && (
        <ActivationDetailPopup
          activation={selectedActivation.activation}
          isDesign={selectedActivation.isDesign}
          allActivatedGates={allActivatedGates}
          onClose={() => setSelectedActivation(null)}
        />
      )}
    </div>
  )
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ className = '' }) => {
  const { selection, viewMode, clearSelection } = useHDStore()

  const renderContent = () => {
    if (viewMode === 'activations') {
      return <ActivationsView />
    }

    if (selection.type === 'center' && selection.data) {
      return <CenterDetail center={selection.data as CenterDefinition} />
    }

    if (selection.type === 'channel' && selection.data) {
      return <ChannelDetail channel={selection.data as ChannelDefinition} />
    }

    return <ChartOverview />
  }

  return (
    <div className={`bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 ${className}`}>
      {selection.type !== 'none' && (
        <button
          onClick={clearSelection}
          className="mb-3 text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
        >
          ← Back to Overview
        </button>
      )}
      {renderContent()}
    </div>
  )
}

export default DetailPanel
