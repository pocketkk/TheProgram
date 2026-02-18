/**
 * DashboardPage — The Daily Reading
 *
 * A personalized cosmic landing page that surfaces today's celestial energy.
 *
 * Sections:
 *  1. Cosmic Greeting — moon phase hero with SVG moon visualization
 *  2. Today's Oracles — Tarot card, daily number, I Ching hexagram
 *  3. Your Sky Today — current transits (only when birth data exists)
 *  4. Human Design Transits — natal body graph + today's transit overlay
 *  5. Portals — feature entry cards
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Star, BookOpen, Layers, Wand2, RefreshCw, GitBranch,
  ArrowRight, Hash, Hexagon,
} from 'lucide-react'
import { useUserProfileStore } from '@/store/userProfileStore'
import { useTarotStore } from '@/store/tarotStore'
import { useNumerologyStore } from '@/store/numerologyStore'
import { getMoonPhase, getMoonPhaseEmoji, type MoonPhase } from '@/lib/api/insights'
import { getDailySnapshot, type DailySnapshotResponse } from '@/lib/api/transits'
import { getDailyHexagram, type DailyHexagram } from '@/lib/api/iching'
import { listBirthData } from '@/lib/api/birthData'
import { HumanDesignTransitCard } from './components/HumanDesignTransitCard'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSunSign(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Aries'
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Taurus'
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Gemini'
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Cancer'
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Leo'
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Virgo'
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Libra'
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Scorpio'
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Sagittarius'
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Capricorn'
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Aquarius'
  return 'Pisces'
}

function getGreeting(name?: string | null): string {
  const hour = new Date().getHours()
  let salutation = 'Good morning'
  if (hour >= 12 && hour < 17) salutation = 'Good afternoon'
  else if (hour >= 17 && hour < 22) salutation = 'Good evening'
  else if (hour >= 22 || hour < 5) salutation = 'Still up'
  return `${salutation}${name ? `, ${name}` : ''}`
}

// ─── SVG Moon Phase ───────────────────────────────────────────────────────────
// Renders an accurate illuminated moon using two-arc SVG path.
// frac: 0=new, 0.5=half, 1=full. waxing: true if growing.

function getMoonPath(frac: number, waxing: boolean, cx: number, cy: number, r: number): string {
  if (frac <= 0.02) return '' // new moon — draw nothing (dark circle)
  if (frac >= 0.98) {
    // Full moon — full circle (handled separately)
    return `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`
  }

  // innerRx is how wide the inner arc is:
  //   at frac=0.25 (crescent) → innerRx ≈ r*0.5
  //   at frac=0.5 (half)     → innerRx = 0 (straight line)
  //   at frac=0.75 (gibbous) → innerRx ≈ r*0.5
  const innerRx = r * Math.abs(1 - 2 * frac)
  const isGibbous = frac > 0.5

  if (waxing) {
    // Right side illuminated
    // Outer arc: top-right to bottom-right (clockwise, right half)
    // Inner arc: bottom-right to top-right
    const innerSweep = isGibbous ? 0 : 1
    return [
      `M ${cx},${cy - r}`,
      `A ${r},${r} 0 0,1 ${cx},${cy + r}`,   // outer right arc (clockwise)
      `A ${innerRx},${r} 0 0,${innerSweep} ${cx},${cy - r}`, // inner arc back up
    ].join(' ')
  } else {
    // Left side illuminated
    const innerSweep = isGibbous ? 1 : 0
    return [
      `M ${cx},${cy - r}`,
      `A ${r},${r} 0 0,0 ${cx},${cy + r}`,   // outer left arc (counter-clockwise)
      `A ${innerRx},${r} 0 0,${innerSweep} ${cx},${cy - r}`, // inner arc back up
    ].join(' ')
  }
}

function MoonPhaseSVG({ phase, dayOfCycle }: { phase: string; dayOfCycle: number }) {
  const r = 28
  const cx = 36
  const cy = 36
  const size = 72

  // Compute fraction from day of cycle (0–29)
  const frac = Math.max(0, Math.min(1, dayOfCycle / 29.5))
  const waxing = dayOfCycle <= 14.75

  const isNew = phase.toLowerCase().includes('new')
  const isFull = phase.toLowerCase().includes('full')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Dark circle background */}
      <circle cx={cx} cy={cy} r={r} fill="#0f0f23" stroke="#334155" strokeWidth="1" />

      {isNew ? null : isFull ? (
        // Full moon — bright filled circle
        <circle cx={cx} cy={cy} r={r - 1} fill="#e2e8f0" />
      ) : (
        // Crescent or gibbous
        <path
          d={getMoonPath(frac, waxing, cx, cy, r - 1)}
          fill="#e2e8f0"
          opacity="0.92"
        />
      )}

      {/* Subtle outer glow ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />
    </svg>
  )
}

// ─── Portal config ────────────────────────────────────────────────────────────

const PORTALS = [
  {
    id: 'astrology',
    name: 'Birth Chart',
    hook: 'Your natal blueprint — planets, houses, aspects',
    Icon: Star,
    gradient: 'from-violet-950 to-indigo-950',
    border: 'border-violet-700/40',
    accent: 'text-violet-400',
    hover: 'hover:border-violet-500/50 hover:shadow-violet-950/60',
  },
  {
    id: 'transits',
    name: 'Transits',
    hook: 'The current sky moving through your chart',
    Icon: RefreshCw,
    gradient: 'from-sky-950 to-blue-950',
    border: 'border-sky-700/40',
    accent: 'text-sky-400',
    hover: 'hover:border-sky-500/50 hover:shadow-sky-950/60',
  },
  {
    id: 'humandesign',
    name: 'Human Design',
    hook: 'Your body graph and energetic blueprint',
    Icon: GitBranch,
    gradient: 'from-amber-950 to-orange-950',
    border: 'border-amber-700/40',
    accent: 'text-amber-400',
    hover: 'hover:border-amber-500/50 hover:shadow-amber-950/60',
  },
  {
    id: 'tarot',
    name: 'Tarot',
    hook: 'Draw cards, explore spreads, seek guidance',
    Icon: Layers,
    gradient: 'from-purple-950 to-fuchsia-950',
    border: 'border-purple-700/40',
    accent: 'text-purple-400',
    hover: 'hover:border-purple-500/50 hover:shadow-purple-950/60',
  },
  {
    id: 'journal',
    name: 'Journal',
    hook: 'Track your inner life through cosmic rhythms',
    Icon: BookOpen,
    gradient: 'from-teal-950 to-emerald-950',
    border: 'border-teal-700/40',
    accent: 'text-teal-400',
    hover: 'hover:border-teal-500/50 hover:shadow-teal-950/60',
  },
  {
    id: 'studio',
    name: 'Studio',
    hook: 'Generate custom tarot decks and celestial art',
    Icon: Wand2,
    gradient: 'from-rose-950 to-pink-950',
    border: 'border-rose-700/40',
    accent: 'text-rose-400',
    hover: 'hover:border-rose-500/50 hover:shadow-rose-950/60',
  },
]

const SECONDARY_TOOLS = [
  { id: 'vedic',        label: 'Vedic',      symbol: '☽' },
  { id: 'iching',       label: 'I Ching',    symbol: '☯' },
  { id: 'numerology',   label: 'Numerology', symbol: '∑' },
  { id: 'gematria',     label: 'Gematria',   symbol: 'א' },
  { id: 'charts',       label: 'Cosmos',     symbol: '⊙' },
  { id: 'coloringbook', label: 'Coloring',   symbol: '✦' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { profile } = useUserProfileStore()
  const { dailyCard, getDailyCard, getCardImage } = useTarotStore()
  const { dailyNumber, fetchDailyNumber } = useNumerologyStore()

  const [moonPhase, setMoonPhase] = useState<(MoonPhase & { date: string }) | null>(null)
  const [hexagram, setHexagram] = useState<DailyHexagram | null>(null)
  const [snapshot, setSnapshot] = useState<DailySnapshotResponse | null>(null)
  const [hasBirthData, setHasBirthData] = useState(false)

  const today = new Date()
  const sunSign = getSunSign(today)
  const greeting = getGreeting(profile.name)
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    getMoonPhase().then(setMoonPhase).catch(() => {})
    getDailyHexagram().then(setHexagram).catch(() => {})
    if (!dailyCard) getDailyCard().catch(() => {})
    if (!dailyNumber) fetchDailyNumber().catch(() => {})

    listBirthData().then(data => {
      if (data.length > 0) {
        setHasBirthData(true)
        const primary = data.find(d => d.is_primary) ?? data[0]
        getDailySnapshot(primary.id).then(setSnapshot).catch(() => {})
      }
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const moonEmoji = moonPhase ? getMoonPhaseEmoji(moonPhase.phase) : null
  const cardImage = dailyCard?.card ? getCardImage(dailyCard.card.id) : undefined

  // Prefer snapshot sign data; fall back to client-computed
  const displaySunSign = snapshot?.sun_sign || sunSign
  const displayMoonSign = snapshot?.moon_sign || (moonPhase ? moonPhase.phase : null)

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── 1. COSMIC GREETING ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-indigo-800/40 p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, #1a0a3e 0%, #0e1040 40%, #1a0a2e 100%)',
          boxShadow: '0 0 40px rgba(99,60,170,0.18), 0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Richer star field */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              'radial-gradient(1.5px 1.5px at 12% 20%, rgba(255,255,255,0.5), transparent)',
              'radial-gradient(1px 1px at 78% 14%, rgba(255,255,255,0.4), transparent)',
              'radial-gradient(1px 1px at 52% 68%, rgba(255,255,255,0.45), transparent)',
              'radial-gradient(1px 1px at 6%  82%, rgba(255,255,255,0.35), transparent)',
              'radial-gradient(1.5px 1.5px at 94% 52%, rgba(255,255,255,0.4), transparent)',
              'radial-gradient(1px 1px at 35% 42%, rgba(255,255,255,0.3), transparent)',
              'radial-gradient(1px 1px at 65% 90%, rgba(255,255,255,0.35), transparent)',
              'radial-gradient(1px 1px at 44% 8%,  rgba(255,255,255,0.3), transparent)',
              'radial-gradient(1px 1px at 88% 78%, rgba(255,255,255,0.25), transparent)',
              'radial-gradient(1.5px 1.5px at 22% 55%, rgba(180,160,255,0.3), transparent)',
            ].join(', '),
          }}
        />
        {/* Purple nebula glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 80% 50%, rgba(120,60,200,0.12) 0%, transparent 60%)',
          }}
        />

        <div className="relative flex items-start justify-between gap-6">
          {/* Left: greeting + date */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-sm mb-1">{dateStr}</p>
            <h1 className="text-3xl font-bold text-white mb-2">{greeting}</h1>
            <p className="text-sm flex items-center gap-2 flex-wrap">
              <span className="text-amber-300/90">☀ {displaySunSign}</span>
              {displayMoonSign && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-300/80">
                    {moonEmoji ?? '🌙'} {snapshot?.moon_sign ? `Moon in ${snapshot.moon_sign}` : displayMoonSign}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Right: SVG moon visual */}
          <div className="text-center shrink-0">
            {moonPhase ? (
              <>
                <div style={{ filter: 'drop-shadow(0 0 12px rgba(148,163,184,0.35))' }}>
                  <MoonPhaseSVG phase={moonPhase.phase} dayOfCycle={moonPhase.day_of_cycle} />
                </div>
                <p className="text-slate-300 text-sm font-medium mt-1.5">{moonPhase.phase}</p>
                <p className="text-slate-600 text-xs mt-0.5">Day {moonPhase.day_of_cycle} of 29</p>
              </>
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-slate-800/40 animate-pulse" />
            )}
          </div>
        </div>

        {/* Moon description */}
        {moonPhase?.description && (
          <p className="relative mt-5 pt-4 text-slate-400 text-sm italic leading-relaxed border-t border-indigo-900/60">
            {moonPhase.description}
          </p>
        )}
      </motion.div>

      {/* ── 2. TODAY'S ORACLES ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
          Today's Oracles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Tarot */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            onClick={() => onNavigate('tarot')}
            className="cursor-pointer rounded-xl border border-purple-800/30 p-4 hover:border-purple-600/50 hover:shadow-lg hover:shadow-purple-950/40 transition-all group"
            style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0e0a24 100%)' }}
          >
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers size={11} />
              Today's Card
            </p>
            {dailyCard ? (
              <>
                <div className="w-full overflow-hidden rounded-lg mb-3" style={{ height: '160px' }}>
                  {cardImage ? (
                    <img
                      src={cardImage.url}
                      alt={dailyCard.card.name}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-950/60 border border-purple-800/20 flex items-center justify-center">
                      <span className="text-4xl opacity-60">
                        {dailyCard.card.suit === 'major' ? '✦' : '◆'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-white text-sm font-semibold leading-tight">
                  {dailyCard.card.name}
                  {dailyCard.card.reversed && (
                    <span className="text-purple-400 font-normal"> (R)</span>
                  )}
                </p>
                <p className="text-slate-500 text-xs mt-1 line-clamp-1">
                  {dailyCard.card.keywords.slice(0, 2).join(' · ')}
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-purple-950/30 animate-pulse" style={{ height: '160px' }} />
                <div className="h-3 bg-slate-800/60 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-800/60 rounded animate-pulse" />
              </div>
            )}
          </motion.div>

          {/* Daily Number */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            onClick={() => onNavigate('numerology')}
            className="cursor-pointer rounded-xl border border-amber-800/30 p-4 hover:border-amber-600/50 hover:shadow-lg hover:shadow-amber-950/40 transition-all"
            style={{ background: 'linear-gradient(135deg, #1c1208 0%, #110f05 100%)' }}
          >
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Hash size={11} />
              Daily Number
            </p>
            {dailyNumber ? (
              <>
                <div className="text-6xl font-bold text-amber-300 leading-none mb-3">
                  {dailyNumber.universal_day}
                </div>
                <p className="text-white text-sm font-semibold">{dailyNumber.name}</p>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed line-clamp-2">
                  {dailyNumber.guidance}
                </p>
                {dailyNumber.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {dailyNumber.keywords.slice(0, 3).map(kw => (
                      <span key={kw} className="px-1.5 py-0.5 rounded text-xs bg-amber-950/60 text-amber-400 border border-amber-800/30">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="h-14 w-14 rounded bg-amber-950/30 animate-pulse" />
                <div className="h-3 bg-slate-800/60 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-slate-800/60 rounded animate-pulse" />
              </div>
            )}
          </motion.div>

          {/* I Ching Hexagram */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            onClick={() => onNavigate('iching')}
            className="cursor-pointer rounded-xl border border-teal-800/30 p-4 hover:border-teal-600/50 hover:shadow-lg hover:shadow-teal-950/40 transition-all"
            style={{ background: 'linear-gradient(135deg, #071a17 0%, #050f0e 100%)' }}
          >
            <p className="text-teal-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Hexagon size={11} />
              Daily Hexagram
            </p>
            {hexagram ? (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-teal-300 leading-none">
                    {hexagram.hexagram_number}
                  </span>
                </div>
                <p className="text-white text-sm font-semibold">{hexagram.hexagram.name}</p>
                <p className="text-teal-400/70 text-xs mt-0.5">{hexagram.hexagram.english}</p>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed line-clamp-2">
                  {hexagram.daily_guidance}
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="h-10 w-10 rounded bg-teal-950/30 animate-pulse" />
                <div className="h-3 bg-slate-800/60 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-slate-800/60 rounded animate-pulse" />
              </div>
            )}
          </motion.div>

        </div>
      </div>

      {/* ── 3. YOUR SKY TODAY (conditional) ────────────────────────────── */}
      {snapshot && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="rounded-xl border border-slate-800/60 p-5"
          style={{ background: 'rgba(15,15,30,0.7)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
              Your Sky Today
            </h2>
            <button
              onClick={() => onNavigate('transits')}
              className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors"
            >
              Full report <ArrowRight size={11} />
            </button>
          </div>

          {/* Sun + Moon signs */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-950/40 text-amber-300 border border-amber-800/30">
              ☀ Sun in {displaySunSign}
            </span>
            {displayMoonSign && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-800/60 text-slate-300 border border-slate-700/30">
                🌙 {snapshot.moon_sign ? `Moon in ${snapshot.moon_sign}` : displayMoonSign}
              </span>
            )}
          </div>

          {/* Energy themes */}
          {snapshot.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {snapshot.themes.slice(0, 5).map(theme => (
                <span key={theme} className="px-2 py-0.5 rounded text-xs bg-indigo-950/50 text-indigo-300 border border-indigo-800/30">
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* Major transit */}
          {snapshot.major_transit && (
            <div className="text-sm text-slate-400 border-t border-slate-800/60 pt-3">
              <span className="text-slate-500 text-xs uppercase tracking-wider">Major transit · </span>
              <span className="text-slate-200">{snapshot.major_transit.transit_planet}</span>
              {' '}<span className="text-indigo-400">{snapshot.major_transit.aspect}</span>{' '}
              <span className="text-slate-200">{snapshot.major_transit.natal_planet}</span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-slate-800 text-slate-500 capitalize">
                {snapshot.major_transit.significance}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── 4. HUMAN DESIGN TRANSITS (conditional) ──────────────────────── */}
      {hasBirthData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
            Body Graph
          </h2>
          <HumanDesignTransitCard onNavigate={onNavigate} />
        </motion.div>
      )}

      {/* ── 5. PORTALS ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">
          Explore
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PORTALS.map((portal, idx) => (
            <motion.div
              key={portal.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.04 }}
              onClick={() => onNavigate(portal.id)}
              className={`cursor-pointer rounded-xl bg-gradient-to-br ${portal.gradient} border ${portal.border} p-4 ${portal.hover} hover:shadow-lg transition-all group`}
            >
              <portal.Icon className={`${portal.accent} mb-3 w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity`} />
              <h3 className="text-white text-sm font-semibold mb-1">{portal.name}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">{portal.hook}</p>
            </motion.div>
          ))}
        </div>

        {/* Secondary tools */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SECONDARY_TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => onNavigate(tool.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/50 hover:border-slate-700/70 hover:bg-slate-800/40 transition-colors text-xs text-slate-500 hover:text-slate-300"
            >
              <span className="opacity-60">{tool.symbol}</span>
              {tool.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
