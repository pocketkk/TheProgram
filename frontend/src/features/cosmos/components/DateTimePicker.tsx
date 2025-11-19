/**
 * Custom Date/Time Picker with Cosmic Theme
 * Beautiful, intuitive date/time selection for astronomy app
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DateTimePickerProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  onClose: () => void
  julianDay: number
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  currentDate,
  onDateChange,
  onClose,
  julianDay,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date(currentDate))
  const [viewYear, setViewYear] = useState(currentDate.getUTCFullYear())
  const [viewMonth, setViewMonth] = useState(currentDate.getUTCMonth())

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Generate calendar grid for current view
  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1))
    const lastDay = new Date(Date.UTC(viewYear, viewMonth + 1, 0))
    const daysInMonth = lastDay.getUTCDate()
    const startDayOfWeek = firstDay.getUTCDay()

    const days: (number | null)[] = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }, [viewYear, viewMonth])

  const handleDayClick = (day: number) => {
    const newDate = new Date(Date.UTC(
      viewYear,
      viewMonth,
      day,
      selectedDate.getUTCHours(),
      selectedDate.getUTCMinutes(),
      selectedDate.getUTCSeconds()
    ))
    setSelectedDate(newDate)
    onDateChange(newDate)
  }

  const handleTimeChange = (hours: number, minutes: number, seconds: number) => {
    const newDate = new Date(Date.UTC(
      selectedDate.getUTCFullYear(),
      selectedDate.getUTCMonth(),
      selectedDate.getUTCDate(),
      hours,
      minutes,
      seconds
    ))
    setSelectedDate(newDate)
    onDateChange(newDate)
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setViewYear(now.getUTCFullYear())
    setViewMonth(now.getUTCMonth())
    onDateChange(now)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getUTCDate() &&
           viewMonth === today.getUTCMonth() &&
           viewYear === today.getUTCFullYear()
  }

  const isSelected = (day: number) => {
    return day === selectedDate.getUTCDate() &&
           viewMonth === selectedDate.getUTCMonth() &&
           viewYear === selectedDate.getUTCFullYear()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-purple-500/20"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-6 w-6 text-purple-400" />
                Set Date & Time
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Selected Date Display */}
            <div className="text-center">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xl text-purple-300 mt-1">
                {selectedDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })} UTC
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Julian Day: <span className="text-purple-400 font-mono">{julianDay.toFixed(6)}</span>
              </div>
            </div>
          </div>

          {/* Calendar Body */}
          <div className="p-6">
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-purple-400" />
              </button>

              <div className="flex items-center gap-3">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-medium
                    focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {monthNames.map((month, idx) => (
                    <option key={idx} value={idx}>{month}</option>
                  ))}
                </select>

                <input
                  type="number"
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-medium text-center
                    focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-purple-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="mb-6">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => day && handleDayClick(day)}
                    disabled={!day}
                    className={`
                      aspect-square rounded-lg font-medium transition-all
                      ${!day ? 'invisible' : ''}
                      ${isSelected(day!) ?
                        'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-110' :
                        isToday(day!) ?
                        'bg-purple-500/30 text-purple-200 border-2 border-purple-400' :
                        'bg-slate-700/50 text-slate-300 hover:bg-purple-500/20 hover:text-white'
                      }
                      ${day && !isSelected(day) ? 'hover:scale-105' : ''}
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Controls */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-slate-300">Time (UTC)</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Hours */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 text-center">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={selectedDate.getUTCHours()}
                    onChange={(e) => handleTimeChange(
                      Number(e.target.value),
                      selectedDate.getUTCMinutes(),
                      selectedDate.getUTCSeconds()
                    )}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center font-mono
                      focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Minutes */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 text-center">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={selectedDate.getUTCMinutes()}
                    onChange={(e) => handleTimeChange(
                      selectedDate.getUTCHours(),
                      Number(e.target.value),
                      selectedDate.getUTCSeconds()
                    )}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center font-mono
                      focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Seconds */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 text-center">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={selectedDate.getUTCSeconds()}
                    onChange={(e) => handleTimeChange(
                      selectedDate.getUTCHours(),
                      selectedDate.getUTCMinutes(),
                      Number(e.target.value)
                    )}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center font-mono
                      focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700
                  text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
