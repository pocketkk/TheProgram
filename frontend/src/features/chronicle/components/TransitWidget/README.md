# Transit Widget Components

Components for displaying transit charts on specific dates with compact and expanded views.

## Overview

The Transit Widget provides a reusable set of components for showing planetary transits on a historical date. It wraps the existing BirthChartWheel component and adds transit-specific functionality.

## Components

### TransitChartWidget (Main Component)

The primary component that combines everything together.

```tsx
import { TransitChartWidget } from '@/features/timeline/components/TransitWidget'

function MyComponent() {
  return (
    <TransitChartWidget
      date="2025-01-15"  // ISO date string
      birthDataId="uuid-of-birth-chart"
    />
  )
}
```

**Props:**
- `date: string` - ISO date string (YYYY-MM-DD)
- `birthDataId?: string` - UUID of the birth chart (optional)

### CompactChart

A 200x200px compact chart view with expand button.

```tsx
import { CompactChart } from '@/features/timeline/components/TransitWidget'

<CompactChart
  date="2025-01-15"
  birthDataId="uuid"
  onExpand={() => setShowDialog(true)}
/>
```

### TransitSummary

Text summary showing Moon sign, Sun sign, and significant transits.

```tsx
import { TransitSummary } from '@/features/timeline/components/TransitWidget'

<TransitSummary
  date="2025-01-15"
  summary={{
    moonSign: 'Scorpio',
    sunSign: 'Capricorn',
    activeTransits: 12,
    significantTransits: ['Saturn square Sun', 'Jupiter trine Moon']
  }}
  isLoading={false}
/>
```

### ExpandedChartDialog

Full-screen modal dialog with 600x600px chart and transit details.

```tsx
import { ExpandedChartDialog } from '@/features/timeline/components/TransitWidget'

<ExpandedChartDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  date="2025-01-15"
  birthDataId="uuid"
/>
```

### useTransitsForDate (Hook)

React Query hook for fetching transit data.

```tsx
import { useTransitsForDate } from '@/features/timeline/components/TransitWidget'

const { data, isLoading, error } = useTransitsForDate({
  date: '2025-01-15',
  birthDataId: 'uuid',
  enabled: true  // optional
})

// data.raw - Raw transit API response
// data.chart - Transformed BirthChart format for BirthChartWheel
```

## Architecture

### Data Flow

1. **useTransitsForDate** fetches transit data via TanStack Query
2. Data is transformed from API format to BirthChart format
3. **BirthChartWheel** renders the transformed data
4. **TransitSummary** displays metadata and significant aspects

### API Integration

Uses the existing transit API:
- `POST /transits/current` - Get transit positions for a date
- Response includes current positions, aspects, and summary

### State Management

- TanStack Query for server state (5min stale time, 10min cache)
- Local React state for UI (expanded/collapsed)
- No global store needed (self-contained)

## Styling

Follows the cosmic theme:
- Glass effect backgrounds (`glass-strong`, `glass-subtle`)
- Golden accents for interactive elements (`celestial-gold`)
- Cosmic color palette for text and borders
- Smooth animations on expand/collapse

## Usage Example

```tsx
import { TransitChartWidget } from '@/features/timeline/components/TransitWidget'
import { useBirthDataStore } from '@/store/birthDataStore'

function TimelineSidebar({ selectedDate }: { selectedDate: string }) {
  const activeBirthData = useBirthDataStore(state => state.activeBirthData)

  return (
    <div className="w-80 p-4 glass-strong">
      <h2 className="text-lg font-semibold mb-4">Transit Chart</h2>
      <TransitChartWidget
        date={selectedDate}
        birthDataId={activeBirthData?.id}
      />
    </div>
  )
}
```

## Features

- Compact 200x200 chart for sidebar display
- Expand button (appears on hover) for full detail view
- Full 600x600 chart in modal dialog
- Planet position list with retrograde indicators
- Active transit list with significance levels
- Summary statistics and themes
- Loading skeletons for async data
- Error states with helpful messages
- Responsive design
- Accessible with proper ARIA labels

## Dependencies

- `@/features/birthchart/components/BirthChartWheel` - Chart rendering
- `@/lib/api/transits` - API client and helpers
- `@/components/ui/Dialog` - Modal dialog
- `@tanstack/react-query` - Data fetching
- `lucide-react` - Icons
- `framer-motion` - Animations (via BirthChartWheel)

## Future Enhancements

- [ ] Add transit-to-natal aspect lines in expanded view
- [ ] Show aspect patterns in transits
- [ ] Compare multiple dates side-by-side
- [ ] Export transit chart as image
- [ ] Add AI interpretation integration
- [ ] Show transit progression animation
