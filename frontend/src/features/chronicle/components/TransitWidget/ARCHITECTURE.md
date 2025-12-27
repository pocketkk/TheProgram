# Transit Widget Architecture

## Component Hierarchy

```
TransitChartWidget (Main Container)
├── CompactChart (200x200)
│   ├── useTransitsForDate (data hook)
│   ├── BirthChartWheel (chart render)
│   └── Expand button overlay
│
├── TransitSummary (text info)
│   ├── Date display
│   ├── Moon/Sun signs
│   ├── Active transit count
│   └── Significant transits list
│
└── ExpandedChartDialog (modal)
    ├── Dialog (Radix UI)
    ├── useTransitsForDate (data hook)
    ├── BirthChartWheel (600x600)
    └── Transit details sidebar
        ├── Planet positions
        ├── Active transits
        └── Summary panel
```

## Data Flow

```
User selects date
       ↓
TransitChartWidget receives props
       ↓
useTransitsForDate fetches data
       ↓
┌──────────────────────────────────┐
│  TanStack Query Cache Layer      │
│  - Deduplicates requests         │
│  - 5min stale time               │
│  - 10min cache time              │
└──────────────────────────────────┘
       ↓
getCurrentTransits API call
       ↓
POST /transits/current
  {
    birth_data_id: "uuid",
    transit_date: "2025-01-15",
    zodiac: "tropical"
  }
       ↓
Backend calculates transits
       ↓
Response: CurrentTransitsResponse
  {
    transit_datetime: "...",
    current_positions: {...},
    transits: [...],
    summary: {...}
  }
       ↓
transformTransitsToChart()
  - Maps positions to PlanetPosition[]
  - Creates BirthChart structure
  - Empty houses/aspects arrays
       ↓
┌──────────────────────────────────┐
│  Parallel Rendering              │
├──────────────────────────────────┤
│  CompactChart                    │
│  - BirthChartWheel (200px)       │
│  - No aspects/houses             │
│  - Expand button                 │
├──────────────────────────────────┤
│  TransitSummary                  │
│  - Extract Moon/Sun signs        │
│  - Count active transits         │
│  - Format top 5 significant      │
└──────────────────────────────────┘
       ↓
User clicks expand
       ↓
ExpandedChartDialog opens
  - BirthChartWheel (600px)
  - Full transit details
  - Summary statistics
```

## State Management

### Local Component State
```tsx
// In TransitChartWidget
const [isExpanded, setIsExpanded] = useState(false)
```

### Server State (TanStack Query)
```tsx
// In useTransitsForDate
const { data, isLoading, error } = useQuery({
  queryKey: ['transits-for-date', date, birthDataId],
  queryFn: async () => {
    const response = await getCurrentTransits({...})
    return {
      raw: response,
      chart: transformTransitsToChart(response, date)
    }
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000
})
```

No global store needed - components are self-contained.

## Type Transformations

### API → BirthChart

```typescript
// API Type (from backend)
interface CurrentTransitsResponse {
  current_positions: Record<string, {
    longitude: number
    latitude: number
    distance: number
    speed_longitude: number
    is_retrograde: boolean
    sign_name: string
    degree_in_sign: number
  }>
  transits: TransitAspect[]
  summary: TransitSummary
}

// Transformed to BirthChart Type
interface BirthChart {
  birthData: BirthData
  planets: PlanetPosition[]  // ← Converted from current_positions
  houses: House[]            // ← Empty for transit charts
  aspects: Aspect[]          // ← Empty (could add transit-natal aspects)
  ascendant: number          // ← 0 for transit charts
  midheaven: number          // ← 0 for transit charts
  descendant: number         // ← 0 for transit charts
  ic: number                 // ← 0 for transit charts
}
```

### Transformation Logic

```typescript
// For each planet in current_positions
Object.entries(positions).map(([name, position]) => {
  // Calculate sign (0-11)
  const signIndex = Math.floor(position.longitude / 30)

  // Calculate degree within sign (0-29.999)
  const degreeInSign = position.longitude % 30
  const degree = Math.floor(degreeInSign)
  const minute = Math.floor((degreeInSign - degree) * 60)

  // Map to zodiac properties
  const sign = signs[signIndex]
  const element = elements[Math.floor(signIndex / 3) % 4]
  const modality = modalities[signIndex % 3]

  return {
    name,
    symbol: planetSymbols[name],
    longitude: position.longitude,
    latitude: position.latitude,
    distance: position.distance,
    speed: position.speed_longitude,
    isRetrograde: position.is_retrograde,
    sign,
    degree,
    minute,
    house: 0,  // No houses for transits
    element,
    modality
  }
})
```

## Rendering Pipeline

### Compact View (Sidebar)

```
CompactChart Component
  ↓
useTransitsForDate hook
  ↓
isLoading? → Skeleton
  ↓
error? → Error message
  ↓
data? → BirthChartWheel
  ↓
SVG rendered at 200x200
  ↓
Expand button overlay (hover)
```

### Expanded View (Modal)

```
ExpandedChartDialog Component
  ↓
Dialog primitive (Radix UI)
  ↓
useTransitsForDate hook (same cache)
  ↓
isLoading? → Centered spinner
  ↓
data? → Split layout
  ├─ Left: BirthChartWheel (600x600)
  └─ Right: Details panel
      ├─ Planet positions
      ├─ Active transits
      └─ Summary stats
```

## Performance Optimizations

1. **Query Deduplication**
   - TanStack Query caches by key
   - Same date = single API call
   - Shared between compact & expanded

2. **Stale-While-Revalidate**
   - 5min stale time
   - Shows cached data immediately
   - Revalidates in background

3. **Lazy Dialog Loading**
   - Dialog content only renders when open
   - useTransitsForDate only enabled when needed

4. **Memoization in BirthChartWheel**
   - SVG elements memoized (from original component)
   - Reduces re-renders on hover/interaction

## Error Handling

### Network Errors
```tsx
try {
  const response = await getCurrentTransits({...})
  return { raw: response, chart: transformTransitsToChart(...) }
} catch (error) {
  throw new Error(getErrorMessage(error))
}
```

### UI Error States
```tsx
{error && (
  <div className="text-red-400">
    {error instanceof Error ? error.message : 'Failed to load'}
  </div>
)}
```

### Missing Data
```tsx
if (!birthDataId) {
  return <p>Select a birth chart to view transits</p>
}
```

## Styling System

### Theme Colors
- `cosmic-*` - Background, borders, text
- `celestial-gold` - Interactive elements, highlights
- `celestial-pink` - Significant transits

### Glass Morphism
```css
.glass-strong {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.glass-subtle {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
}
```

### Animations
- Skeleton loading: `animate-pulse`
- Dialog: Radix UI built-in transitions
- Hover effects: `transition-all duration-200`

## Testing Strategy

### Unit Tests
```typescript
describe('transformTransitsToChart', () => {
  it('converts API response to BirthChart format', () => {
    const response = mockTransitResponse
    const chart = transformTransitsToChart(response, '2025-01-15')
    expect(chart.planets).toHaveLength(10)
    expect(chart.houses).toHaveLength(0)
    expect(chart.planets[0]).toMatchObject({
      name: 'Sun',
      sign: expect.any(String),
      degree: expect.any(Number)
    })
  })
})
```

### Integration Tests
```typescript
describe('TransitChartWidget', () => {
  it('fetches and displays transit data', async () => {
    const { getByText } = render(
      <TransitChartWidget date="2025-01-15" birthDataId="uuid" />
    )

    await waitFor(() => {
      expect(getByText(/Moon in/)).toBeInTheDocument()
      expect(getByText(/active transit/)).toBeInTheDocument()
    })
  })
})
```

### E2E Tests
```typescript
test('expand and view full transit details', async ({ page }) => {
  await page.goto('/timeline')
  await page.click('[data-testid="transit-widget"]')
  await page.hover('[data-testid="compact-chart"]')
  await page.click('[data-testid="expand-button"]')

  await expect(page.locator('[role="dialog"]')).toBeVisible()
  await expect(page.locator('svg[width="600"]')).toBeVisible()
})
```

## Future Enhancements

### Transit-to-Natal Aspects
```typescript
// Calculate aspects between transit and natal planets
function calculateTransitAspects(
  transitPositions: PlanetPosition[],
  natalPositions: PlanetPosition[]
): Aspect[] {
  // Compare each transit planet to each natal planet
  // Return aspects array for BirthChart
}
```

### Multi-Date Comparison
```typescript
interface MultiDateWidgetProps {
  dates: string[]
  birthDataId: string
}

// Render multiple compact charts side-by-side
// Highlight changing planets between dates
```

### Chart Export
```typescript
async function exportTransitChart(chartRef: React.RefObject<SVGElement>) {
  const svg = chartRef.current
  const blob = await convertSVGToImage(svg, 'png')
  downloadFile(blob, `transit-${date}.png`)
}
```

### AI Integration
```typescript
// Add AI interpretation panel to ExpandedChartDialog
const { data: interpretation } = useQuery({
  queryKey: ['transit-interpretation', date, birthDataId],
  queryFn: () => getAIDailyForecast(birthDataId, date)
})
```
