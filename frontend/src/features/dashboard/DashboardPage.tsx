/**
 * DashboardPage — The Daily Reading
 *
 * A personalized cosmic landing page. Instead of stats and recent charts,
 * it surfaces today's celestial energy and invites exploration.
 *
 * Sections:
 *  1. Cosmic Greeting — moon phase hero with date in astro language
 *  2. Today's Oracles — Tarot card, daily number, I Ching hexagram
 *  3. Your Sky Today — current transits (only when birth data exists)
 *  4. Portals — feature entry cards
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
  { id: 'vedic',       label: 'Vedic',     symbol: '☽' },
  { id: 'iching',      label: 'I Ching',   symbol: '☯' },
  { id: 'numerology',  label: 'Numerology',symbol: '∑' },
  { id: 'gematria',    label: 'Gematria',  symbol: 'א' },
  { id: 'charts',      label: 'Cosmos',    symbol: '⊙' },
  { id: 'coloringbook',label: 'Coloring',  symbol: '✦' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export const DashboardPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { profile } = useUserProfileStore()
  const { dailyCard, getDailyCard, getCardImage } = useTarotStore()
  const { dailyNumber, fetchDailyNumber } = useNumerologyStore()

  const [moonPhase, setMoonPhase] = useState<(MoonPhase & { date: string }) | null>(null)
  const [hexagram, setHexagram] = useState<DailyHexagram | null>(null)
  const [snapshot, setSnapshot] = useState<DailySnapshotResponse | null>(null)

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
        const primary = data.find(d => d.is_primary) ?? data[0]
        getDailySnapshot(primary.id).then(setSnapshot).catch(() => {})
      }
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const moonEmoji = moonPhase ? getMoonPhaseEmoji(moonPhase.phase) : '🌙'
  const cardImage = dailyCard?.card ? getCardImage(dailyCard.card.id) : undefined

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── 1. COSMIC GREETING ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-slate-800/60 p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, #0f0f23 0%, #0d1033 40%, #150d2a 100%)',
        }}
      >
        {/* Faint star field */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              'radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.4), transparent)',
              'radial-gradient(1px 1px at 75% 18%, rgba(255,255,255,0.3), transparent)',
              'radial-gradient(1px 1px at 55% 72%, rgba(255,255,255,0.35), transparent)',
              'radial-gradient(1px 1px at 8%  80%, rgba(255,255,255,0.25), transparent)',
              'radial-gradient(1px 1px at 92% 55%, rgba(255,255,255,0.3), transparent)',
              'radial-gradient(1px 1px at 38% 45%, rgba(255,255,255,0.2), transparent)',
              'radial-gradient(1px 1px at 68% 88%, rgba(255,255,255,0.25), transparent)',
            ].join(', '),
          }}
        />

        <div className="relative flex items-start justify-between gap-6">
          {/* Left: greeting + date */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-sm mb-1">{dateStr}</p>
            <h1 className="text-3xl font-bold text-white mb-2">{greeting}</h1>
            <p className="text-slate-400 text-sm">
              <span className="text-amber-300/80">☀ {sunSign}</span>
              {snapshot?.moon_sign
                ? <span className="text-slate-500"> · </span>
                : moonPhase ? <span className="text-slate-500"> · </span> : null}
              {snapshot?.moon_sign
                ? <span className="text-slate-300/70">🌙 {snapshot.moon_sign}</span>
                : moonPhase
                  ? <span className="text-slate-400/70">{moonPhase.phase}</span>
                  : null}
            </p>
          </div>

          {/* Right: moon visual */}
          <div className="text-center shrink-0">
            <div
              className="text-6xl md:text-7xl leading-none mb-2 select-none"
              style={{ filter: 'drop-shadow(0 0 24px rgba(148,163,184,0.45))' }}
            >
              {moonEmoji}
            </div>
            <p className="text-slate-300 text-sm font-medium">
              {moonPhase?.phase ?? <span className="text-slate-600">···</span>}
            </p>
            {moonPhase && (
              <p className="text-slate-600 text-xs mt-0.5">
                Day {moonPhase.day_of_cycle} of 29
              </p>
            )}
          </div>
        </div>

        {/* Moon description */}
        {moonPhase?.description && (
          <p className="relative mt-5 pt-4 text-slate-400 text-sm italic leading-relaxed border-t border-slate-800/60">
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
                {cardImage ? (
                  <img
                    src={cardImage.url}
                    alt={dailyCard.card.name}
                    className="w-full aspect-[2/3] object-cover rounded-lg mb-3 opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-lg bg-purple-950/60 border border-purple-800/20 flex items-center justify-center mb-3">
                    <span className="text-4xl opacity-60">
                      {dailyCard.card.suit === 'major' ? '✦' : '◆'}
                    </span>
                  </div>
                )}
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
                <div className="w-full aspect-[2/3] rounded-lg bg-purple-950/30 animate-pulse" />
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
              ☀ Sun in {snapshot.sun_sign}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-800/60 text-slate-300 border border-slate-700/30">
              🌙 Moon in {snapshot.moon_sign}
            </span>
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

      {/* ── 4. PORTALS ─────────────────────────────────────────────────── */}
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
