/**
 * Body Graph SVG visualization
 *
 * Anatomically accurate Human Design body graph with:
 * - 9 Centers in correct positions
 * - 36 Channel connections
 * - Gate activations (personality=red, design=black, both=purple)
 * - Human silhouette overlay
 */
import React, { useMemo } from 'react'
import { useHDStore } from '../stores/hdStore'
import {
  BODYGRAPH_LAYOUT,
  CENTER_SHAPES,
  CHANNEL_CONNECTIONS,
  HD_COLORS,
} from '../types'
import type { CenterDefinition, ChannelDefinition, GateActivation } from '../types'

interface BodyGraphProps {
  className?: string
  width?: number
  height?: number
}

// Center shape rendering
const CenterShape: React.FC<{
  center: string
  x: number
  y: number
  defined: boolean
  isHighlighted: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}> = ({ center, x, y, defined, isHighlighted, onClick, onMouseEnter, onMouseLeave }) => {
  const shape = CENTER_SHAPES[center]
  const fill = defined ? HD_COLORS.defined : HD_COLORS.undefined
  const stroke = defined ? HD_COLORS.defined : '#4B5563'
  const size = center === 'g_center' ? 35 : 28
  const opacity = isHighlighted ? 1 : 0.9

  // Common props
  const commonProps = {
    fill,
    stroke,
    strokeWidth: isHighlighted ? 3 : 2,
    opacity,
    cursor: 'pointer',
    onClick,
    onMouseEnter,
    onMouseLeave,
    style: { transition: 'all 0.2s ease' }
  }

  if (shape === 'triangle') {
    // Point up for Head, Ajna, Solar Plexus; point down for Heart, Spleen
    const pointUp = ['head', 'ajna', 'solar_plexus'].includes(center)
    const h = size * 0.866 // height of equilateral triangle
    const points = pointUp
      ? `${x},${y - h / 2} ${x - size / 2},${y + h / 2} ${x + size / 2},${y + h / 2}`
      : `${x - size / 2},${y - h / 2} ${x + size / 2},${y - h / 2} ${x},${y + h / 2}`

    return <polygon points={points} {...commonProps} data-testid={`hd-center-${center}`} aria-label={`${center.replace('_', ' ')} center, ${defined ? 'defined' : 'undefined'}`} />
  }

  if (shape === 'diamond') {
    const s = size * 0.7
    const points = `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`
    return <polygon points={points} {...commonProps} data-testid={`hd-center-${center}`} aria-label={`${center.replace('_', ' ')} center, ${defined ? 'defined' : 'undefined'}`} />
  }

  // Square
  const s = size / 2
  return (
    <rect
      x={x - s}
      y={y - s}
      width={size}
      height={size}
      rx={3}
      {...commonProps}
      data-testid={`hd-center-${center}`}
      aria-label={`${center.replace('_', ' ')} center, ${defined ? 'defined' : 'undefined'}`}
    />
  )
}

// Channel line rendering
const ChannelLine: React.FC<{
  channel: typeof CHANNEL_CONNECTIONS[0]
  isActive: boolean
  isHighlighted: boolean
  x1: number
  y1: number
  x2: number
  y2: number
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}> = ({ channel, isActive, isHighlighted, x1, y1, x2, y2, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={isActive ? HD_COLORS.channel : HD_COLORS.channelInactive}
      strokeWidth={isHighlighted ? 6 : isActive ? 4 : 2}
      opacity={isHighlighted ? 1 : isActive ? 0.9 : 0.3}
      cursor="pointer"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ transition: 'all 0.2s ease' }}
      data-testid={`hd-channel-${channel.id}`}
      aria-label={`Channel ${channel.id}, ${isActive ? 'active' : 'inactive'}`}
    />
  )
}

// Human silhouette background
const HumanSilhouette: React.FC = () => (
  <g opacity={0.1} fill="#94A3B8">
    {/* Head */}
    <ellipse cx={170} cy={35} rx={25} ry={30} />
    {/* Neck */}
    <rect x={160} y={60} width={20} height={25} />
    {/* Torso */}
    <path d="M120 85 Q100 150 105 250 Q110 350 125 400 L145 400 Q160 320 170 320 Q180 320 195 400 L215 400 Q230 350 235 250 Q240 150 220 85 Z" />
    {/* Arms */}
    <path d="M100 100 Q70 120 50 200 Q45 220 55 225 Q65 230 75 210 Q90 160 110 130" />
    <path d="M240 100 Q270 120 290 200 Q295 220 285 225 Q275 230 265 210 Q250 160 230 130" />
    {/* Legs */}
    <path d="M125 400 Q120 450 125 500 L145 500 Q150 450 145 400" />
    <path d="M195 400 Q200 450 195 500 L175 500 Q170 450 175 400" />
  </g>
)

export const BodyGraph: React.FC<BodyGraphProps> = ({
  className = '',
  width = 340,
  height = 500,
}) => {
  const {
    chart,
    showChannels,
    highlightedCenter,
    highlightedChannel,
    setHighlightedCenter,
    setHighlightedChannel,
    setSelection,
  } = useHDStore()

  // Build sets of active gates and channels
  const { activeGates, personalityGates, designGates, activeChannels } = useMemo(() => {
    if (!chart) {
      return {
        activeGates: new Set<number>(),
        personalityGates: new Set<number>(),
        designGates: new Set<number>(),
        activeChannels: new Set<string>(),
      }
    }

    const personalityArr = Array.isArray(chart.personality_activations) ? chart.personality_activations : []
    const designArr = Array.isArray(chart.design_activations) ? chart.design_activations : []
    const channelsArr = Array.isArray(chart.channels) ? chart.channels : []

    const personality = new Set(personalityArr.map((a: GateActivation) => a.gate))
    const design = new Set(designArr.map((a: GateActivation) => a.gate))
    const all = new Set([...personality, ...design])
    const channels = new Set(channelsArr.map((c: ChannelDefinition) => c.channel_id))

    return {
      activeGates: all,
      personalityGates: personality,
      designGates: design,
      activeChannels: channels,
    }
  }, [chart])

  // Build center definition map
  const centerDefinitions = useMemo(() => {
    if (!chart || !Array.isArray(chart.centers)) return new Map<string, boolean>()
    return new Map(chart.centers.map((c: CenterDefinition) => [c.center, c.defined]))
  }, [chart])

  const scale = Math.min(width / BODYGRAPH_LAYOUT.width, height / BODYGRAPH_LAYOUT.height)

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
      width={width}
      height={height}
      viewBox={`0 0 ${BODYGRAPH_LAYOUT.width} ${BODYGRAPH_LAYOUT.height}`}
      className={className}
    >
      <defs>
        {/* Glow filter for highlighted elements */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Gradient for defined centers */}
        <linearGradient id="definedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="100%" height="100%" fill={HD_COLORS.background} rx={8} />

      {/* Human silhouette */}
      <HumanSilhouette />

      {/* Channel lines - drawn first so centers appear on top */}
      {showChannels && (
        <g className="channels">
          {CHANNEL_CONNECTIONS.map((channel) => {
            const [center1, center2] = channel.centers
            const pos1 = BODYGRAPH_LAYOUT.centers[center1]
            const pos2 = BODYGRAPH_LAYOUT.centers[center2]

            if (!pos1 || !pos2) return null

            const isActive = activeChannels.has(channel.id) ||
              activeChannels.has(`${channel.gates[1]}-${channel.gates[0]}`)

            return (
              <ChannelLine
                key={channel.id}
                channel={channel}
                isActive={isActive}
                isHighlighted={highlightedChannel === channel.id}
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                onClick={() => handleChannelClick(channel.id)}
                onMouseEnter={() => setHighlightedChannel(channel.id)}
                onMouseLeave={() => setHighlightedChannel(null)}
              />
            )
          })}
        </g>
      )}

      {/* Centers */}
      <g className="centers">
        {Object.entries(BODYGRAPH_LAYOUT.centers).map(([center, pos]) => {
          const defined = centerDefinitions.get(center) ?? false
          const isHighlighted = highlightedCenter === center

          return (
            <g key={center} filter={isHighlighted ? 'url(#glow)' : undefined}>
              <CenterShape
                center={center}
                x={pos.x}
                y={pos.y}
                defined={defined}
                isHighlighted={isHighlighted}
                onClick={() => handleCenterClick(center)}
                onMouseEnter={() => setHighlightedCenter(center)}
                onMouseLeave={() => setHighlightedCenter(null)}
              />
              {/* Center label */}
              <text
                x={pos.x}
                y={pos.y + 45}
                textAnchor="middle"
                fill={HD_COLORS.text}
                fontSize={10}
                opacity={0.7}
              >
                {center.replace('_', ' ').replace('g center', 'G')}
              </text>
            </g>
          )
        })}
      </g>

      {/* Type indicator at bottom */}
      {chart?.type && (
        <g className="type-indicator">
          <text
            x={BODYGRAPH_LAYOUT.width / 2}
            y={BODYGRAPH_LAYOUT.height - 30}
            textAnchor="middle"
            fill={HD_COLORS.text}
            fontSize={14}
            fontWeight="bold"
          >
            {chart.type.replace('_', ' ').toUpperCase()}
          </text>
          <text
            x={BODYGRAPH_LAYOUT.width / 2}
            y={BODYGRAPH_LAYOUT.height - 12}
            textAnchor="middle"
            fill={HD_COLORS.text}
            fontSize={11}
            opacity={0.7}
          >
            {chart?.profile?.profile || ''} | {chart?.definition?.replace('_', ' ') || ''}
          </text>
        </g>
      )}

      {/* Legend */}
      <g className="legend" transform="translate(10, 15)">
        <rect x={0} y={0} width={12} height={12} fill={HD_COLORS.defined} rx={2} />
        <text x={16} y={10} fill={HD_COLORS.text} fontSize={9}>Defined</text>

        <rect x={0} y={18} width={12} height={12} fill={HD_COLORS.undefined} stroke="#4B5563" rx={2} />
        <text x={16} y={28} fill={HD_COLORS.text} fontSize={9}>Undefined</text>
      </g>
    </svg>
  )
}

export default BodyGraph
