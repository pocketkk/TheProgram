/**
 * DayCell Component
 * Individual day cell in the calendar grid
 */

import { motion } from 'framer-motion'
import { Calendar, Book, Sparkles } from 'lucide-react'
import type { DayIndicators } from './types'

interface DayCellProps {
  date: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  indicators: DayIndicators
  onClick: () => void
}

export function DayCell({
  date,
  dayOfMonth,
  isCurrentMonth,
  isToday,
  isSelected,
  indicators,
  onClick
}: DayCellProps) {
  // Calculate if cell has any activity
  const hasActivity = indicators.hasTransit || indicators.hasEvent || indicators.hasJournal

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative glass rounded-lg p-3 min-h-[100px]
        transition-all duration-200
        ${!isCurrentMonth ? 'opacity-40' : ''}
        ${isSelected ? 'ring-2 ring-celestial-gold glow-gold' : ''}
        ${!isSelected && hasActivity ? 'hover:ring-1 hover:ring-celestial-gold/50' : 'hover:border-cosmic-600'}
        ${!isSelected && !hasActivity ? 'hover:bg-cosmic-800/50' : ''}
      `}
      whileHover={{ scale: isCurrentMonth ? 1.02 : 1 }}
      whileTap={{ scale: isCurrentMonth ? 0.98 : 1 }}
      disabled={!isCurrentMonth}
    >
      {/* Day Number */}
      <div className="flex items-start justify-between mb-2">
        <span
          className={`
            text-lg font-semibold
            ${isToday ? 'text-celestial-gold text-glow-gold' : ''}
            ${isSelected ? 'text-celestial-gold' : 'text-cosmic-200'}
            ${!isCurrentMonth ? 'text-cosmic-500' : ''}
          `}
        >
          {dayOfMonth}
        </span>

        {/* Today Indicator - Animated Ring */}
        {isToday && (
          <motion.div
            className="w-2 h-2 rounded-full bg-celestial-gold"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(247, 179, 43, 0.7)',
                '0 0 0 8px rgba(247, 179, 43, 0)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {/* Indicator Icons */}
      <div className="flex flex-col gap-1">
        {/* Transit Indicator */}
        {indicators.hasTransit && (
          <div className="flex items-center gap-1 text-xs text-celestial-cyan">
            <Sparkles className="w-3 h-3" />
            <span className="text-[10px]">Transit</span>
          </div>
        )}

        {/* Event Indicator */}
        {indicators.hasEvent && (
          <div className="flex items-center gap-1 text-xs text-celestial-pink">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px]">
              {indicators.eventCount && indicators.eventCount > 1
                ? `${indicators.eventCount} Events`
                : 'Event'}
            </span>
          </div>
        )}

        {/* Journal Indicator */}
        {indicators.hasJournal && (
          <div className="flex items-center gap-1 text-xs text-celestial-purple">
            <Book className="w-3 h-3" />
            <span className="text-[10px]">Journal</span>
          </div>
        )}
      </div>

      {/* Selected State Overlay */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-celestial-gold pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.button>
  )
}
