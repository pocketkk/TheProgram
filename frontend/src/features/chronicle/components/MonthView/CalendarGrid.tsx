/**
 * CalendarGrid Component
 * Main calendar grid showing month days in 7-column layout
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { DayCell } from './DayCell'
import type { DayIndicators } from './types'

interface CalendarGridProps {
  month: number
  year: number
  onDayClick: (date: string) => void
  selectedDay: string | null
  dayData: Record<string, DayIndicators>
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarGrid({
  month,
  year,
  onDayClick,
  selectedDay,
  dayData
}: CalendarGridProps) {
  // Generate calendar grid data
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayWeekday = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    // Previous month days to fill first week
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    const prevMonthDays = firstDayWeekday

    // Calculate total cells needed (6 rows of 7 days)
    const totalCells = 42
    const nextMonthDays = totalCells - (prevMonthDays + daysInMonth)

    const days: Array<{
      date: string
      dayOfMonth: number
      isCurrentMonth: boolean
    }> = []

    // Previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        date: dateStr,
        dayOfMonth: day,
        isCurrentMonth: false
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        date: dateStr,
        dayOfMonth: day,
        isCurrentMonth: true
      })
    }

    // Next month days
    for (let day = 1; day <= nextMonthDays; day++) {
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        date: dateStr,
        dayOfMonth: day,
        isCurrentMonth: false
      })
    }

    return days
  }, [month, year])

  // Get today's date string
  const today = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [])

  return (
    <div className="space-y-2">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-sm font-semibold text-cosmic-400 py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <motion.div
        className="grid grid-cols-7 gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {calendarDays.map((day, index) => {
          const isToday = day.date === today
          const isSelected = day.date === selectedDay
          const indicators = dayData[day.date] || {}

          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.2,
                delay: index * 0.01, // Stagger animation
              }}
            >
              <DayCell
                date={day.date}
                dayOfMonth={day.dayOfMonth}
                isCurrentMonth={day.isCurrentMonth}
                isToday={isToday}
                isSelected={isSelected}
                indicators={indicators}
                onClick={() => onDayClick(day.date)}
              />
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
