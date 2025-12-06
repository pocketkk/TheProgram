/**
 * Palm Reading Results Component
 *
 * Displays the comprehensive palm reading results with sections.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hand,
  Heart,
  Brain,
  Activity,
  Target,
  Mountain,
  Fingerprint,
  Sparkles,
  Star,
  Compass,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'
import { Button } from '@/components/ui'
import type { PalmReadingResponse, PalmReadingRecord } from '../types'

interface PalmReadingResultsProps {
  reading: PalmReadingResponse | PalmReadingRecord
  onToggleFavorite?: () => void
  isFavorite?: boolean
  showActions?: boolean
}

// Section configuration with icons and colors
const sectionConfig: Record<
  string,
  { icon: typeof Hand; title: string; color: string; gradient: string }
> = {
  hand_shape: {
    icon: Hand,
    title: 'Hand Shape & Element',
    color: 'text-amber-400',
    gradient: 'from-amber-600/20 to-amber-500/10',
  },
  heart_line: {
    icon: Heart,
    title: 'Heart Line',
    color: 'text-rose-400',
    gradient: 'from-rose-600/20 to-rose-500/10',
  },
  head_line: {
    icon: Brain,
    title: 'Head Line',
    color: 'text-blue-400',
    gradient: 'from-blue-600/20 to-blue-500/10',
  },
  life_line: {
    icon: Activity,
    title: 'Life Line',
    color: 'text-emerald-400',
    gradient: 'from-emerald-600/20 to-emerald-500/10',
  },
  fate_line: {
    icon: Target,
    title: 'Fate Line',
    color: 'text-purple-400',
    gradient: 'from-purple-600/20 to-purple-500/10',
  },
  mounts: {
    icon: Mountain,
    title: 'The Mounts (Planetary Hills)',
    color: 'text-indigo-400',
    gradient: 'from-indigo-600/20 to-indigo-500/10',
  },
  fingers: {
    icon: Fingerprint,
    title: 'Finger Analysis',
    color: 'text-cyan-400',
    gradient: 'from-cyan-600/20 to-cyan-500/10',
  },
  special_markings: {
    icon: Sparkles,
    title: 'Special Markings',
    color: 'text-yellow-400',
    gradient: 'from-yellow-600/20 to-yellow-500/10',
  },
  astrological_synthesis: {
    icon: Star,
    title: 'Astrological Synthesis',
    color: 'text-celestial-gold',
    gradient: 'from-celestial-gold/20 to-celestial-gold/10',
  },
  guidance: {
    icon: Compass,
    title: 'Guidance & Potential',
    color: 'text-cosmic-400',
    gradient: 'from-cosmic-600/20 to-cosmic-500/10',
  },
}

// Section order for display
const sectionOrder = [
  'hand_shape',
  'heart_line',
  'head_line',
  'life_line',
  'fate_line',
  'mounts',
  'fingers',
  'special_markings',
  'astrological_synthesis',
  'guidance',
]

function ReadingSection({
  sectionKey,
  content,
  defaultExpanded = false,
}: {
  sectionKey: string
  content: string
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const config = sectionConfig[sectionKey] || {
    icon: Sparkles,
    title: sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    color: 'text-gray-400',
    gradient: 'from-cosmic-600/20 to-cosmic-500/10',
  }

  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl overflow-hidden bg-gradient-to-br ${config.gradient}`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-cosmic-800/50 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-white">{config.title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="pl-12 text-gray-300 leading-relaxed whitespace-pre-wrap">
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function PalmReadingResults({
  reading,
  onToggleFavorite,
  isFavorite = false,
  showActions = true,
}: PalmReadingResultsProps) {
  const [copied, setCopied] = useState(false)
  const [showFullReading, setShowFullReading] = useState(false)

  // Get sections from either response format
  const sections =
    'sections' in reading && reading.sections
      ? reading.sections
      : 'sections_json' in reading && reading.sections_json
        ? JSON.parse(reading.sections_json)
        : null

  const fullReading =
    'full_reading' in reading ? reading.full_reading : reading.full_reading

  // Copy to clipboard
  const handleCopy = async () => {
    if (fullReading) {
      await navigator.clipboard.writeText(fullReading)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Get ordered sections
  const orderedSections = sectionOrder
    .filter(key => sections && sections[key])
    .map(key => ({ key, content: sections[key] }))

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      {showActions && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Hand className="h-5 w-5 text-cosmic-400" />
            <span className="text-sm text-gray-400">
              {('hand_type' in reading ? reading.hand_type : 'both')
                .charAt(0)
                .toUpperCase() +
                ('hand_type' in reading ? reading.hand_type : 'both').slice(1)}{' '}
              Hand Reading
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            {onToggleFavorite && (
              <Button variant="ghost" size="sm" onClick={onToggleFavorite}>
                {isFavorite ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-1 text-celestial-gold" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sectioned View */}
      {orderedSections.length > 0 ? (
        <div className="space-y-3">
          {orderedSections.map(({ key, content }, index) => (
            <ReadingSection
              key={key}
              sectionKey={key}
              content={content}
              defaultExpanded={index < 3} // Expand first 3 sections by default
            />
          ))}
        </div>
      ) : (
        // Full reading view if sections not available
        <div className="glass rounded-xl p-6">
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {fullReading}
          </div>
        </div>
      )}

      {/* Toggle Full Reading */}
      {sections && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullReading(!showFullReading)}
          >
            {showFullReading ? 'Hide' : 'Show'} Full Reading
          </Button>

          <AnimatePresence>
            {showFullReading && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="glass rounded-xl p-6 mt-4 text-left">
                  <h4 className="font-medium text-white mb-4">Complete Reading</h4>
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {fullReading}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Token usage info (if available) */}
      {'tokens_used' in reading && reading.tokens_used && (
        <div className="text-center text-xs text-gray-500">
          Tokens used: {reading.tokens_used.input} input, {reading.tokens_used.output}{' '}
          output
        </div>
      )}
    </div>
  )
}
