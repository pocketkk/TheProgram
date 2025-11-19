/**
 * DateTimePicker Component
 * Combined date and time picker for birth data entry
 */

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface DateTimePickerProps {
  value: Date
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  error?: string
}

export function DateTimePicker({ value, onChange, minDate, maxDate, error }: DateTimePickerProps) {
  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Format time for input (HH:MM)
  const formatTimeForInput = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const [dateValue, setDateValue] = useState(formatDateForInput(value))
  const [timeValue, setTimeValue] = useState(formatTimeForInput(value))

  // Update local state when value prop changes
  useEffect(() => {
    setDateValue(formatDateForInput(value))
    setTimeValue(formatTimeForInput(value))
  }, [value])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateValue = e.target.value
    setDateValue(newDateValue)

    if (newDateValue) {
      try {
        // Parse date and time separately, then combine
        const [year, month, day] = newDateValue.split('-').map(Number)
        const [hours, minutes] = timeValue.split(':').map(Number)

        const newDate = new Date(year, month - 1, day, hours, minutes)

        // Validate against min/max
        if (minDate && newDate < minDate) return
        if (maxDate && newDate > maxDate) return

        onChange(newDate)
      } catch (err) {
        console.error('Invalid date:', err)
      }
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeValue = e.target.value
    setTimeValue(newTimeValue)

    if (newTimeValue && dateValue) {
      try {
        const [year, month, day] = dateValue.split('-').map(Number)
        const [hours, minutes] = newTimeValue.split(':').map(Number)

        const newDate = new Date(year, month - 1, day, hours, minutes)

        // Validate against min/max
        if (minDate && newDate < minDate) return
        if (maxDate && newDate > maxDate) return

        onChange(newDate)
      } catch (err) {
        console.error('Invalid time:', err)
      }
    }
  }

  const minDateStr = minDate ? formatDateForInput(minDate) : undefined
  const maxDateStr = maxDate ? formatDateForInput(maxDate) : undefined

  return (
    <div className="space-y-3">
      {/* Date Input */}
      <div>
        <label className="block text-sm font-medium text-cosmic-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Date
        </label>
        <Input
          type="date"
          value={dateValue}
          onChange={handleDateChange}
          min={minDateStr}
          max={maxDateStr}
          error={error}
          className={cn(
            'text-white',
            '[&::-webkit-calendar-picker-indicator]:filter',
            '[&::-webkit-calendar-picker-indicator]:invert',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer'
          )}
        />
      </div>

      {/* Time Input */}
      <div>
        <label className="block text-sm font-medium text-cosmic-300 mb-2">
          <Clock className="w-4 h-4 inline mr-2" />
          Time
        </label>
        <Input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          className={cn(
            'text-white',
            '[&::-webkit-calendar-picker-indicator]:filter',
            '[&::-webkit-calendar-picker-indicator]:invert',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer'
          )}
        />
      </div>

      {/* Preview */}
      <div className="text-xs text-cosmic-400 bg-cosmic-900/30 rounded-lg p-3 border border-cosmic-800">
        <span className="font-semibold">Preview: </span>
        {value.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}{' '}
        at{' '}
        {value.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}
      </div>
    </div>
  )
}
