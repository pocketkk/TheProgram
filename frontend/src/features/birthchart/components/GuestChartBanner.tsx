/**
 * Guest Chart Banner Component
 *
 * Displays a banner when viewing someone else's chart (not the primary chart).
 * Shows the person's name, relationship type, and provides a button to return to the user's chart.
 */

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { BirthDataResponse } from '@/lib/api/birthData'
import { RELATIONSHIP_LABELS } from '@/lib/api/birthData'
import { getPersonColor } from '../constants/personColors'

export interface GuestChartBannerProps {
  person: BirthDataResponse
  onReturnToMyChart: () => void
}

export function GuestChartBanner({ person, onReturnToMyChart }: GuestChartBannerProps) {
  // Get the person's color (custom or relationship default)
  const color = getPersonColor(person.color, person.relationship_type)

  // Get relationship label
  const relationshipLabel = person.relationship_type
    ? RELATIONSHIP_LABELS[person.relationship_type]
    : 'Other'

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full px-6 py-3 flex items-center justify-between border-b border-cosmic-700/30"
      style={{
        background: `linear-gradient(to right, ${color}20, transparent)`,
      }}
    >
      {/* Left side: Person info */}
      <div className="flex items-center gap-3">
        {/* Name with color accent */}
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-lg font-semibold text-cosmic-100">
            {person.name || 'Unnamed'}'s Chart
          </span>
        </div>

        {/* Relationship badge */}
        <span
          className="px-3 py-1 text-xs font-medium rounded-full border"
          style={{
            backgroundColor: `${color}15`,
            borderColor: `${color}40`,
            color: color,
          }}
        >
          {relationshipLabel}
        </span>
      </div>

      {/* Right side: Return button */}
      <button
        onClick={onReturnToMyChart}
        className="flex items-center gap-2 px-4 py-2 bg-cosmic-800/50 hover:bg-cosmic-700/50 border border-cosmic-600/50 hover:border-cosmic-500/50 rounded-lg text-cosmic-200 hover:text-cosmic-100 font-medium transition-all duration-200 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="hidden sm:inline">Return to My Chart</span>
        <span className="sm:hidden">My Chart</span>
      </button>
    </motion.div>
  )
}
