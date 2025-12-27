# DayView Components

Components for the expanded day view in the Timeline feature.

## Overview

When a user clicks a day in the calendar, it expands to show a full-screen view with:
- **Cosmic Chronicle** newspaper (main content, left side)
- **Transit chart** widget (right sidebar, top)
- **Journal editor** (right sidebar, bottom)

## Components

### DayViewLayout

Main layout container that orchestrates the full-screen expanded view.

```tsx
import { DayViewLayout } from './components/DayView'

<DayViewLayout
  date="1985-01-15"
  onClose={() => setExpanded(false)}
  transitWidget={<TransitChartWidget date={date} />}
  journalWidget={<JournalEditor date={date} />}
>
  <CosmicChronicle date={date} />
</DayViewLayout>
```

**Features:**
- Full-screen overlay with backdrop blur
- Two-column responsive layout
- Escape key to close
- Backdrop click to close
- Prevents body scroll when open

### DayNavigationHeader

Header bar with date display and navigation controls.

```tsx
import { DayNavigationHeader } from './components/DayView'

<DayNavigationHeader
  date="1985-01-15"
  onPrev={() => navigateDay(-1)}
  onNext={() => navigateDay(1)}
  onClose={() => setExpanded(false)}
/>
```

**Features:**
- Formatted date display (e.g., "Tuesday, January 15, 1985")
- Back arrow to return to calendar
- Previous/Next day navigation
- Keyboard shortcuts (Left/Right arrows)

### ExpandTransition

Framer Motion wrapper for coordinated expansion animations.

```tsx
import { ExpandTransition, ExpandContent, ExpandSidebar } from './components/DayView'

<ExpandTransition isOpen={isDayOpen}>
  <ExpandContent>
    {/* Main content */}
  </ExpandContent>
  <ExpandSidebar>
    {/* Sidebar widgets */}
  </ExpandSidebar>
</ExpandTransition>
```

**Animation Sequence:**
1. Backdrop fades in (150ms)
2. Content scales up from center (400ms spring)
3. Sidebar slides in from right (300ms delay)

**Features:**
- Respects `prefers-reduced-motion`
- Smooth spring-based animations
- Staggered choreography for polish

## Integration Example

Complete example of integrating DayView into a calendar:

```tsx
import { useState } from 'react'
import { DayViewLayout, DayNavigationHeader } from '@/features/timeline/components/DayView'
import { addDays, subDays } from 'date-fns'

function TimelineCalendar() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
  }

  const handleNavigateDay = (offset: number) => {
    if (!selectedDate) return
    const currentDate = parseISO(selectedDate)
    const newDate = offset > 0 ? addDays(currentDate, offset) : subDays(currentDate, Math.abs(offset))
    setSelectedDate(format(newDate, 'yyyy-MM-dd'))
  }

  const handleClose = () => {
    setSelectedDate(null)
  }

  return (
    <div>
      {/* Calendar grid */}
      <CalendarGrid onDayClick={handleDayClick} />

      {/* Expanded day view */}
      {selectedDate && (
        <DayViewLayout
          date={selectedDate}
          onClose={handleClose}
          transitWidget={<TransitChartWidget date={selectedDate} />}
          journalWidget={<JournalEditor date={selectedDate} />}
        >
          <DayNavigationHeader
            date={selectedDate}
            onPrev={() => handleNavigateDay(-1)}
            onNext={() => handleNavigateDay(1)}
            onClose={handleClose}
          />
          <CosmicChronicle date={selectedDate} />
        </DayViewLayout>
      )}
    </div>
  )
}
```

## Styling

Components use Tailwind CSS with custom cosmic theme classes:

- `cosmic-bg` - Animated cosmic background gradient
- `glass` / `glass-strong` - Glassmorphism effects
- `cosmic-*` - Color palette (cosmic-100 to cosmic-950)

## Keyboard Navigation

- **Escape** - Close day view
- **Left Arrow** - Previous day
- **Right Arrow** - Next day

## Accessibility

- Semantic HTML structure
- ARIA labels for controls
- Keyboard navigation support
- Respects reduced motion preferences
- Focus management

## Dependencies

- `framer-motion` - Animations
- `date-fns` - Date formatting and manipulation
- `lucide-react` - Icons
- Existing animation utilities from `@/features/birthchart/animations/chartAnimations`

## File Structure

```
DayView/
├── DayViewLayout.tsx         # Main layout container
├── DayNavigationHeader.tsx   # Navigation header
├── ExpandTransition.tsx      # Animation wrapper
├── index.ts                  # Exports
└── README.md                 # This file
```
