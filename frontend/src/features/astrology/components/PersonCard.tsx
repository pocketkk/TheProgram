import { motion } from 'framer-motion'
import { Crown, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { BirthDataResponse } from '@/lib/api/birthData'
import { RELATIONSHIP_LABELS } from '@/lib/api/birthData'
import { getPersonColor } from '../constants/personColors'

interface PersonCardProps {
  person: BirthDataResponse
  isSelected: boolean
  onClick: () => void
}

export function PersonCard({ person, isSelected, onClick }: PersonCardProps) {
  const color = getPersonColor(person.color, person.relationship_type)
  const displayName = person.is_primary && !person.name ? 'My Chart' : person.name || 'Unnamed'

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        'relative p-3 rounded-lg cursor-pointer transition-all',
        'border-l-[3px]',
        'backdrop-blur-sm',
        isSelected
          ? 'bg-cosmic-800/80 shadow-lg'
          : 'bg-cosmic-900/50 hover:bg-cosmic-800/50'
      )}
      style={{
        borderLeftColor: color,
        boxShadow: isSelected ? `0 0 20px ${color}20` : undefined,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Primary chart indicator */}
      {person.is_primary && (
        <div className="absolute top-2 right-2">
          <Crown className="w-4 h-4 text-celestial-gold" />
        </div>
      )}

      <div className="space-y-2">
        {/* Name */}
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              'font-semibold truncate',
              isSelected ? 'text-white' : 'text-cosmic-100'
            )}
          >
            {displayName}
          </h3>
        </div>

        {/* Relationship badge */}
        {person.relationship_type && (
          <div>
            <Badge
              variant="secondary"
              className="text-xs"
              style={{
                borderLeft: `2px solid ${color}`,
              }}
            >
              {RELATIONSHIP_LABELS[person.relationship_type]}
            </Badge>
          </div>
        )}

        {/* Birth date */}
        <div className="flex items-center gap-2 text-sm text-cosmic-300">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(person.birth_date)}</span>
          {person.time_unknown && (
            <span className="text-xs text-cosmic-400">(time unknown)</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
