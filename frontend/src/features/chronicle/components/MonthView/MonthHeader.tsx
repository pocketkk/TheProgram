/**
 * MonthHeader Component
 * Navigation header for month calendar with prev/next controls
 */

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui'

interface MonthHeaderProps {
  month: number
  year: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onGoToDate: () => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function MonthHeader({
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onToday,
  onGoToDate
}: MonthHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-6"
    >
      {/* Month and Year Display */}
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-heading font-bold text-gradient-celestial">
          {MONTH_NAMES[month]} {year}
        </h2>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Month */}
        <Button
          onClick={onPrevMonth}
          variant="ghost"
          size="sm"
          className="text-cosmic-300 hover:text-celestial-gold transition-colors"
          title="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Today */}
        <Button
          onClick={onToday}
          variant="ghost"
          size="sm"
          className="text-cosmic-300 hover:text-celestial-gold transition-colors px-4"
        >
          Today
        </Button>

        {/* Next Month */}
        <Button
          onClick={onNextMonth}
          variant="ghost"
          size="sm"
          className="text-cosmic-300 hover:text-celestial-gold transition-colors"
          title="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Go to Date */}
        <div className="ml-2 h-6 w-px bg-cosmic-700" />
        <Button
          onClick={onGoToDate}
          variant="ghost"
          size="sm"
          className="text-cosmic-300 hover:text-celestial-gold transition-colors"
          title="Go to specific date"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Go to Date
        </Button>
      </div>
    </motion.div>
  )
}
