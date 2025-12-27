/**
 * BodyGraph - Main container component
 *
 * Composes all center components and channel connections into
 * a complete Human Design body graph visualization.
 */
import React, { useMemo } from 'react'
import { useHDStore } from '../../stores/hdStore'
import { CENTER_POSITIONS, CHANNELS, VIEWBOX, COLORS } from './constants'
import {
  HeadCenter,
  AjnaCenter,
  ThroatCenter,
  GCenter,
  HeartCenter,
  SpleenCenter,
  SolarPlexusCenter,
  SacralCenter,
  RootCenter,
  getGatePosition,
} from './centers'
import { ChannelLine } from './channels/ChannelLine'
import type { GateActivationType, Position } from './types'
import type { GateActivation, CenterDefinition, ChannelDefinition } from '../../types'

interface BodyGraphProps {
  className?: string
}

// Purple cosmic silhouette background
const CosmicSilhouette: React.FC = () => (
  <g opacity={0.1}>
    <defs>
      <linearGradient id="silhouetteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="50%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#4338CA" />
      </linearGradient>
    </defs>
    {/* Head */}
    <ellipse cx={180} cy={55} rx={28} ry={32} fill="url(#silhouetteGradient)" />
    {/* Neck */}
    <rect x={168} y={85} width={24} height={30} rx={5} fill="url(#silhouetteGradient)" />
    {/* Upper body */}
    <path
      d="M155 112 Q70 135 60 210 Q50 310 70 380 L290 380 Q310 310 300 210 Q290 135 205 112 Z"
      fill="url(#silhouetteGradient)"
    />
    {/* Lower body */}
    <path
      d="M70 380 Q50 450 65 520 Q85 570 130 600 L230 600 Q275 570 295 520 Q310 450 290 380 Z"
      fill="url(#silhouetteGradient)"
    />
  </g>
)

export const BodyGraph: React.FC<BodyGraphProps> = ({ className = '' }) => {
  const {
    chart,
    showChannels,
    highlightedCenter,
    highlightedChannel,
    setHighlightedCenter,
    setHighlightedChannel,
    setSelection,
  } = useHDStore()

  // Process chart data into usable maps
  const { gateActivations, centerDefinitions, activeChannels, channelActivationTypes } = useMemo(() => {
    const gateMap = new Map<number, GateActivationType>()
    const centerMap = new Map<string, boolean>()
    const channelSet = new Set<string>()
    const channelTypes = new Map<string, GateActivationType>()

    if (!chart) {
      return {
        gateActivations: gateMap,
        centerDefinitions: centerMap,
        activeChannels: channelSet,
        channelActivationTypes: channelTypes,
      }
    }

    // Process gate activations
    const personalityArr = Array.isArray(chart.personality_activations) ? chart.personality_activations : []
    const designArr = Array.isArray(chart.design_activations) ? chart.design_activations : []

    const personalityGates = new Set(personalityArr.map((a: GateActivation) => a.gate))
    const designGates = new Set(designArr.map((a: GateActivation) => a.gate))

    personalityArr.forEach((a: GateActivation) => {
      gateMap.set(a.gate, designGates.has(a.gate) ? 'both' : 'personality')
    })
    designArr.forEach((a: GateActivation) => {
      if (!gateMap.has(a.gate)) {
        gateMap.set(a.gate, 'design')
      }
    })

    // Process center definitions
    const centersArr = Array.isArray(chart.centers) ? chart.centers : []
    centersArr.forEach((c: CenterDefinition) => {
      if (c.center) {
        centerMap.set(c.center, c.defined)
      }
    })

    // Process channels
    const channelsArr = Array.isArray(chart.channels) ? chart.channels : []
    channelsArr.forEach((c: ChannelDefinition) => {
      if (c.channel_id) {
        channelSet.add(c.channel_id)
        // Also add reverse
        const [g1, g2] = c.channel_id.split('-')
        channelSet.add(`${g2}-${g1}`)

        // Determine channel activation type
        const gate1 = parseInt(g1)
        const gate2 = parseInt(g2)
        const hasPersonality = personalityGates.has(gate1) || personalityGates.has(gate2)
        const hasDesign = designGates.has(gate1) || designGates.has(gate2)

        const type: GateActivationType =
          hasPersonality && hasDesign ? 'both' : hasPersonality ? 'personality' : 'design'

        channelTypes.set(c.channel_id, type)
        channelTypes.set(`${g2}-${g1}`, type)
      }
    })

    return {
      gateActivations: gateMap,
      centerDefinitions: centerMap,
      activeChannels: channelSet,
      channelActivationTypes: channelTypes,
    }
  }, [chart])

  const handleCenterClick = (center: string) => {
    const centersArr = Array.isArray(chart?.centers) ? chart.centers : []
    const centerData = centersArr.find((c: CenterDefinition) => c.center === center)
    setSelection({ type: 'center', id: center, data: centerData })
  }

  const handleChannelClick = (channelId: string) => {
    const channelsArr = Array.isArray(chart?.channels) ? chart.channels : []
    const channelData = channelsArr.find((c: ChannelDefinition) => c.channel_id === channelId)
    setSelection({ type: 'channel', id: channelId, data: channelData })
  }

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <radialGradient id="cosmicBg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#312E81" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="100%" height="100%" fill="transparent" />
      <ellipse cx={180} cy={300} rx={170} ry={280} fill="url(#cosmicBg)" />

      {/* Silhouette */}
      <CosmicSilhouette />

      {/* Channels - rendered first so centers appear on top */}
      {showChannels && (
        <g className="channels">
          {CHANNELS.map((channel) => {
            const pos1 = getGatePosition(channel.gates[0])
            const pos2 = getGatePosition(channel.gates[1])

            if (!pos1 || !pos2) return null

            const isActive = activeChannels.has(channel.id)
            const activationType = channelActivationTypes.get(channel.id) || 'none'

            return (
              <ChannelLine
                key={channel.id}
                startPos={pos1}
                endPos={pos2}
                isActive={isActive}
                activationType={isActive ? activationType : 'none'}
                isHighlighted={highlightedChannel === channel.id}
                onClick={() => handleChannelClick(channel.id)}
              />
            )
          })}
        </g>
      )}

      {/* Centers */}
      <g className="centers">
        <HeadCenter
          x={CENTER_POSITIONS.head.x}
          y={CENTER_POSITIONS.head.y}
          defined={centerDefinitions.get('head') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('head')}
        />
        <AjnaCenter
          x={CENTER_POSITIONS.ajna.x}
          y={CENTER_POSITIONS.ajna.y}
          defined={centerDefinitions.get('ajna') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('ajna')}
        />
        <ThroatCenter
          x={CENTER_POSITIONS.throat.x}
          y={CENTER_POSITIONS.throat.y}
          defined={centerDefinitions.get('throat') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('throat')}
        />
        <GCenter
          x={CENTER_POSITIONS.g_center.x}
          y={CENTER_POSITIONS.g_center.y}
          defined={centerDefinitions.get('g_center') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('g_center')}
        />
        <HeartCenter
          x={CENTER_POSITIONS.heart.x}
          y={CENTER_POSITIONS.heart.y}
          defined={centerDefinitions.get('heart') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('heart')}
        />
        <SpleenCenter
          x={CENTER_POSITIONS.spleen.x}
          y={CENTER_POSITIONS.spleen.y}
          defined={centerDefinitions.get('spleen') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('spleen')}
        />
        <SacralCenter
          x={CENTER_POSITIONS.sacral.x}
          y={CENTER_POSITIONS.sacral.y}
          defined={centerDefinitions.get('sacral') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('sacral')}
        />
        <SolarPlexusCenter
          x={CENTER_POSITIONS.solar_plexus.x}
          y={CENTER_POSITIONS.solar_plexus.y}
          defined={centerDefinitions.get('solar_plexus') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('solar_plexus')}
        />
        <RootCenter
          x={CENTER_POSITIONS.root.x}
          y={CENTER_POSITIONS.root.y}
          defined={centerDefinitions.get('root') ?? false}
          gateActivations={gateActivations}
          onCenterClick={() => handleCenterClick('root')}
        />
      </g>

      {/* Legend */}
      <g className="legend" transform="translate(10, 10)" opacity={0.9}>
        <circle cx={6} cy={6} r={5} fill={COLORS.definedFill} />
        <text x={16} y={10} fill="#E2E8F0" fontSize={9}>
          Defined
        </text>
        <circle cx={75} cy={6} r={5} fill="transparent" stroke={COLORS.undefinedStroke} strokeWidth={1.5} />
        <text x={85} y={10} fill="#E2E8F0" fontSize={9}>
          Open
        </text>
      </g>

      {/* Channel type legend */}
      <g className="channel-legend" transform={`translate(${VIEWBOX.width - 115}, 10)`} opacity={0.9}>
        <line x1={0} y1={6} x2={14} y2={6} stroke={COLORS.personalityChannel} strokeWidth={3} />
        <text x={18} y={10} fill="#E2E8F0" fontSize={8}>
          Pers
        </text>
        <line x1={52} y1={6} x2={66} y2={6} stroke={COLORS.designChannel} strokeWidth={3} />
        <text x={70} y={10} fill="#E2E8F0" fontSize={8}>
          Design
        </text>
      </g>
    </svg>
  )
}

export default BodyGraph
