/**
 * HumanDesignTransitCard
 *
 * Shows the user's natal body graph with today's planetary transit gates
 * overlaid, highlighting channels being activated by current transits.
 */
import { useState, useEffect } from 'react'
import { GitBranch, ArrowRight } from 'lucide-react'
import { calculateHDChart, type HDChartResponse } from '@/lib/api/humanDesign'
import { getCurrentTransitsSimple, type CurrentTransitsResponse } from '@/lib/api/transits'
import { listBirthData } from '@/lib/api/birthData'
import { CENTER_POSITIONS, CHANNELS } from '@/features/humandesign/components/bodygraph/constants'

// ── HD Gate Wheel ─────────────────────────────────────────────────────────────

const HD_GATE_WHEEL = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
]

const GATE_NAMES: Record<number, string> = {
  1: 'Self-Expression', 2: 'Direction', 3: 'Ordering', 4: 'Formulization',
  5: 'Fixed Rhythms', 6: 'Friction', 7: 'The Role', 8: 'Contribution',
  9: 'Focus', 10: 'Behavior', 11: 'Ideas', 12: 'Caution',
  13: 'The Listener', 14: 'Power Skills', 15: 'Extremes', 16: 'Skills',
  17: 'Opinions', 18: 'Correction', 19: 'Wanting', 20: 'The Now',
  21: 'The Hunter', 22: 'Openness', 23: 'Assimilation', 24: 'Rationalization',
  25: 'Innocence', 26: 'The Egoist', 27: 'Caring', 28: 'The Game Player',
  29: 'Saying Yes', 30: 'Feelings', 31: 'Leading', 32: 'Continuity',
  33: 'Privacy', 34: 'Power', 35: 'Change', 36: 'Crisis',
  37: 'Friendship', 38: 'Opposition', 39: 'Provocation', 40: 'Aloneness',
  41: 'Fantasy', 42: 'Growth', 43: 'Insight', 44: 'Alertness',
  45: 'Gathering', 46: 'Love of Body', 47: 'Realization', 48: 'Depth',
  49: 'Principles', 50: 'Values', 51: 'Initiative', 52: 'Stillness',
  53: 'Development', 54: 'Ambition', 55: 'Spirit', 56: 'Stimulation',
  57: 'Intuition', 58: 'Joy', 59: 'Sexuality', 60: 'Acceptance',
  61: 'Inner Truth', 62: 'Details', 63: 'Doubt', 64: 'Confusion',
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋', 'Mean Node': '☊', Chiron: '⚷',
}

// Priority order for display — inner planets first, outer planets last
const PLANET_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'South Node', 'Chiron',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function longitudeToGate(longitude: number): number {
  const idx = Math.floor(((longitude - 302) % 360 + 360) % 360 / 5.625)
  return HD_GATE_WHEEL[Math.min(idx, 63)]
}

// gate → { partner, centers, channelId }
interface GateInfo { partner: number; centers: [string, string]; channelId: string }
const GATE_MAP = new Map<number, GateInfo>()
for (const ch of CHANNELS) {
  const [g1, g2] = ch.gates
  GATE_MAP.set(g1, { partner: g2, centers: ch.centers as [string, string], channelId: ch.id })
  GATE_MAP.set(g2, { partner: g1, centers: ch.centers as [string, string], channelId: ch.id })
}

// ── Mini Body Graph ───────────────────────────────────────────────────────────

type CenterShape =
  | { type: 'diamond'; r: number }
  | { type: 'rect'; w: number; h: number }
  | { type: 'ellipse'; rx: number; ry: number }

const CENTER_SHAPES: Record<string, CenterShape> = {
  head:         { type: 'diamond', r: 17 },
  ajna:         { type: 'diamond', r: 15 },
  throat:       { type: 'rect', w: 38, h: 20 },
  g_center:     { type: 'diamond', r: 24 },
  heart:        { type: 'diamond', r: 15 },
  spleen:       { type: 'ellipse', rx: 21, ry: 13 },
  sacral:       { type: 'rect', w: 44, h: 24 },
  solar_plexus: { type: 'ellipse', rx: 21, ry: 13 },
  root:         { type: 'rect', w: 44, h: 21 },
}

function CenterShape({
  name, pos, shape, fill, stroke,
}: {
  name: string
  pos: { x: number; y: number }
  shape: CenterShape
  fill: string
  stroke: string
}) {
  if (shape.type === 'diamond') {
    const r = shape.r
    return (
      <polygon
        key={name}
        points={`${pos.x},${pos.y - r} ${pos.x + r},${pos.y} ${pos.x},${pos.y + r} ${pos.x - r},${pos.y}`}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    )
  }
  if (shape.type === 'rect') {
    return (
      <rect
        key={name}
        x={pos.x - shape.w / 2}
        y={pos.y - shape.h / 2}
        width={shape.w}
        height={shape.h}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    )
  }
  return (
    <ellipse
      key={name}
      cx={pos.x}
      cy={pos.y}
      rx={shape.rx}
      ry={shape.ry}
      fill={fill}
      stroke={stroke}
      strokeWidth="1.5"
    />
  )
}

interface MiniBodyGraphProps {
  definedCenters: string[]
  natalChannelIds: Set<string>
  transitChannelIds: Set<string>
}

function MiniBodyGraph({ definedCenters, natalChannelIds, transitChannelIds }: MiniBodyGraphProps) {
  const transitActivatedCenters = new Set<string>()
  for (const chId of transitChannelIds) {
    const ch = CHANNELS.find(c => c.id === chId)
    if (ch) {
      transitActivatedCenters.add(ch.centers[0])
      transitActivatedCenters.add(ch.centers[1])
    }
  }

  return (
    <svg viewBox="0 0 360 620" width="130" height="225" style={{ flexShrink: 0 }}>
      {/* Channel lines — drawn first so centers sit on top */}
      {CHANNELS.map(ch => {
        const p1 = CENTER_POSITIONS[ch.centers[0] as keyof typeof CENTER_POSITIONS]
        const p2 = CENTER_POSITIONS[ch.centers[1] as keyof typeof CENTER_POSITIONS]
        if (!p1 || !p2) return null
        const isNatal = natalChannelIds.has(ch.id)
        const isTransit = transitChannelIds.has(ch.id)
        return (
          <line
            key={ch.id}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke={isNatal ? '#F59E0B' : isTransit ? '#22D3EE' : '#374151'}
            strokeWidth={isNatal ? 3 : isTransit ? 2.5 : 1.5}
            opacity={isNatal || isTransit ? 1 : 0.4}
          />
        )
      })}

      {/* Centers */}
      {Object.entries(CENTER_POSITIONS).map(([name, pos]) => {
        const shape = CENTER_SHAPES[name]
        if (!shape) return null
        const isNatal = definedCenters.includes(name)
        const isTransit = transitActivatedCenters.has(name) && !isNatal
        const fill = isNatal ? '#78350F' : isTransit ? '#083344' : '#1e1b4b'
        const stroke = isNatal ? '#F59E0B' : isTransit ? '#22D3EE' : '#4B5563'
        return (
          <CenterShape key={name} name={name} pos={pos} shape={shape} fill={fill} stroke={stroke} />
        )
      })}
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface TransitActivation {
  planet: string
  gate: number
  completesChannel: boolean
  channelId?: string
  partnerGate?: number
}

interface HumanDesignTransitCardProps {
  onNavigate?: (page: string) => void
}

export function HumanDesignTransitCard({ onNavigate }: HumanDesignTransitCardProps) {
  const [loading, setLoading] = useState(true)
  const [hdChart, setHdChart] = useState<HDChartResponse | null>(null)
  const [transits, setTransits] = useState<CurrentTransitsResponse | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const birthDataList = await listBirthData()
        if (birthDataList.length === 0) { setLoading(false); return }
        const primary = birthDataList.find(d => d.is_primary) ?? birthDataList[0]
        const [chart, currentTransits] = await Promise.all([
          calculateHDChart(primary.id),
          getCurrentTransitsSimple(primary.id),
        ])
        setHdChart(chart)
        setTransits(currentTransits)
      } catch {
        // silently fail — card just won't render
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-amber-900/30 p-5" style={{ background: 'rgba(28,16,4,0.6)' }}>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={13} className="text-amber-500" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Human Design Transits</span>
        </div>
        <div className="flex gap-4">
          <div className="w-[130px] h-[225px] rounded bg-amber-950/20 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 rounded bg-slate-800/60 animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!hdChart || !transits) return null

  // ── Compute activations ────────────────────────────────────────────────────

  const natalGateSet = new Set(hdChart.all_activated_gates)

  const transitGateMap = new Map<string, number>()
  const allTransitGates = new Set<number>()
  for (const [planet, pos] of Object.entries(transits.current_positions)) {
    if (!pos) continue
    const gate = longitudeToGate(pos.longitude)
    transitGateMap.set(planet, gate)
    allTransitGates.add(gate)
  }

  const natalChannelIds = new Set<string>()
  const transitChannelIds = new Set<string>()
  for (const ch of CHANNELS) {
    const [g1, g2] = ch.gates
    const g1Natal = natalGateSet.has(g1)
    const g2Natal = natalGateSet.has(g2)
    if (g1Natal && g2Natal) {
      natalChannelIds.add(ch.id)
    } else if (
      (g1Natal && allTransitGates.has(g2) && !g2Natal) ||
      (g2Natal && allTransitGates.has(g1) && !g1Natal)
    ) {
      transitChannelIds.add(ch.id)
    }
  }

  // Build per-planet list — use all planets from response, sorted by priority order
  const availablePlanets = [...transitGateMap.keys()]
  const sortedPlanets = [
    ...PLANET_ORDER.filter(p => transitGateMap.has(p)),
    ...availablePlanets.filter(p => !PLANET_ORDER.includes(p)),
  ]
  const activations: TransitActivation[] = sortedPlanets.map(planet => {
    const gate = transitGateMap.get(planet)!
    const info = GATE_MAP.get(gate)
    const completesChannel = !!(info && natalGateSet.has(info.partner) && !natalGateSet.has(gate))
    return {
      planet,
      gate,
      completesChannel,
      channelId: completesChannel ? info?.channelId : undefined,
      partnerGate: completesChannel ? info?.partner : undefined,
    }
  })

  const completing = activations.filter(a => a.completesChannel)

  return (
    <div
      className="rounded-xl border border-amber-800/30 p-5 hover:border-amber-700/40 transition-colors"
      style={{ background: 'rgba(28,16,4,0.6)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch size={13} className="text-amber-500" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Human Design Transits</span>
        </div>
        <div className="flex items-center gap-2">
          {hdChart.hd_type && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/30">
              {hdChart.hd_type}
            </span>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('humandesign')}
              className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors"
            >
              Full chart <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Body: mini graph + transit list */}
      <div className="flex gap-4">
        {/* Mini body graph */}
        <MiniBodyGraph
          definedCenters={hdChart.defined_centers}
          natalChannelIds={natalChannelIds}
          transitChannelIds={transitChannelIds}
        />

        {/* Transit list */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: '225px' }}>
          {completing.length > 0 && (
            <p className="text-xs text-cyan-400/80 mb-2">
              {completing.length} channel{completing.length !== 1 ? 's' : ''} activated today
            </p>
          )}
          <div className="space-y-1">
            {activations.map(({ planet, gate, completesChannel, channelId, partnerGate }) => (
              <div
                key={planet}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                  completesChannel
                    ? 'bg-cyan-950/50 border border-cyan-700/40'
                    : 'bg-slate-800/30 border border-slate-700/20'
                }`}
              >
                {/* Planet symbol */}
                <span
                  className={`shrink-0 w-5 text-center font-medium ${
                    completesChannel ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                >
                  {PLANET_SYMBOLS[planet] ?? '·'}
                </span>

                {/* Gate info */}
                <div className="flex-1 min-w-0 truncate">
                  <span className={completesChannel ? 'text-white' : 'text-slate-300'}>
                    {gate}
                  </span>
                  <span className={`ml-1 ${completesChannel ? 'text-slate-300' : 'text-slate-500'}`}>
                    · {GATE_NAMES[gate] ?? ''}
                  </span>
                </div>

                {/* Activation badge */}
                {completesChannel && channelId && (
                  <span className="shrink-0 text-cyan-400 font-semibold">
                    ✦
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500" />
              <span className="text-xs text-slate-600">Natal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-cyan-400" />
              <span className="text-xs text-slate-600">Transit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
