# MonthView Components

Calendar month view components for the Timeline feature.

## Components

### CalendarGrid
The main 7-column calendar grid showing the month.

**Props:**
- `month: number` - Month (0-11)
- `year: number` - Full year
- `onDayClick: (date: string) => void` - Handler when day is clicked (date in YYYY-MM-DD format)
- `selectedDay: string | null` - Currently selected date (YYYY-MM-DD)
- `dayData: Record<string, DayIndicators>` - Data for each day (keyed by YYYY-MM-DD)

### DayCell
Individual day cell component with indicators.

**Props:**
- `date: string` - Date in YYYY-MM-DD format
- `dayOfMonth: number` - Day number (1-31)
- `isCurrentMonth: boolean` - Is this day in the current month
- `isToday: boolean` - Is this today
- `isSelected: boolean` - Is this day selected
- `indicators: DayIndicators` - Activity indicators for this day
- `onClick: () => void` - Click handler

### MonthHeader
Navigation header with month/year display and controls.

**Props:**
- `month: number` - Current month (0-11)
- `year: number` - Current year
- `onPrevMonth: () => void` - Navigate to previous month
- `onNextMonth: () => void` - Navigate to next month
- `onToday: () => void` - Jump to today
- `onGoToDate: () => void` - Open date picker

## Types

### DayIndicators
```typescript
interface DayIndicators {
  hasTransit?: boolean      // Show transit indicator (planet icon)
  hasEvent?: boolean         // Show event indicator (calendar icon)
  hasJournal?: boolean       // Show journal indicator (book icon)
  eventCount?: number        // Number of events (shows count if > 1)
}
```

## Usage Example

```tsx
import { useState } from 'react'
import { CalendarGrid, MonthHeader, type DayIndicators } from './components/MonthView'

function TimelineMonthView() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Example day data
  const dayData: Record<string, DayIndicators> = {
    '2025-11-15': { hasTransit: true, hasJournal: true },
    '2025-11-20': { hasEvent: true, eventCount: 2 },
    '2025-11-25': { hasTransit: true, hasEvent: true, hasJournal: true }
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
  }

  const handleDayClick = (date: string) => {
    setSelectedDay(date)
    // Expand day view here
  }

  return (
    <div className="p-6">
      <MonthHeader
        month={currentMonth}
        year={currentYear}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onGoToDate={() => {/* Open date picker */}}
      />

      <CalendarGrid
        month={currentMonth}
        year={currentYear}
        onDayClick={handleDayClick}
        selectedDay={selectedDay}
        dayData={dayData}
      />
    </div>
  )
}
```

## Styling

Components use the cosmic theme from the project's Tailwind config:

- **Background**: `glass` class (glassmorphism effect)
- **Colors**:
  - `cosmic-*` for backgrounds and borders
  - `celestial-gold` for selected states
  - `celestial-cyan` for transit indicators
  - `celestial-pink` for event indicators
  - `celestial-purple` for journal indicators
- **Effects**:
  - `glow-gold` for golden glow on selected days
  - Framer Motion animations for interactions

## Features

- **Today Indicator**: Animated pulsing ring on current day
- **Selected State**: Golden border and glow effect
- **Activity Indicators**: Icons showing transits, events, journals
- **Hover Effects**: Smooth scale and color transitions
- **Stagger Animation**: Days animate in with slight delay
- **Month Boundaries**: Previous/next month days shown with reduced opacity
