# Birth Chart Feature Roadmap

## Implementation Priority & Pattern Usage Guide

This document maps the UI/UX improvements to the architectural patterns and provides implementation order.

---

## Phase 1: Foundation (Quick Wins - 1-2 days)

### 1.1 Planet Hover Tooltips
**Pattern:** Interaction Hooks + Chart Store
**Files to modify:**
- `BirthChartWheel.tsx` - Add hover handlers to planet elements
- New: `components/ChartTooltip.tsx`

```typescript
// In BirthChartWheel.tsx
const { onPlanetHover, getTooltipContent } = useChartInteractions()

<motion.g
  onMouseEnter={() => onPlanetHover(planet)}
  onMouseLeave={() => onPlanetHover(null)}
>
  {/* planet circle */}
</motion.g>

// ChartTooltip.tsx
export function ChartTooltip() {
  const { hoveredElement, getTooltipContent } = useChartTooltip()
  const content = getTooltipContent()
  // Render tooltip near cursor
}
```

**Estimated time:** 2-3 hours

---

### 1.2 Aspect Grouping by Planet
**Pattern:** State Management + Pattern Detection
**Files to modify:**
- `BirthChartPage.tsx` - Update aspects tab
- New: `components/AspectGroup.tsx`

```typescript
// Group aspects by planet
const groupedAspects = useMemo(() => {
  const groups = new Map<string, Aspect[]>()
  chart.aspects.forEach(aspect => {
    const p1Aspects = groups.get(aspect.planet1) || []
    p1Aspects.push(aspect)
    groups.set(aspect.planet1, p1Aspects)
    // ... same for planet2
  })
  return groups
}, [chart.aspects])

// Render collapsible groups
{Array.from(groupedAspects).map(([planet, aspects]) => (
  <AspectGroup key={planet} planet={planet} aspects={aspects} />
))}
```

**Estimated time:** 2 hours

---

### 1.3 Degree Markers
**Pattern:** Layer System
**Files to create:**
- `components/layers/DegreeMarkersLayer.tsx`

```typescript
export function DegreeMarkersLayer({ size, center, outerRadius }: LayerProps) {
  const markers = Array.from({ length: 12 }, (_, i) => i * 30) // Every 30°

  return (
    <g className="degree-markers">
      {markers.map(angle => {
        const pos = polarToCartesian(angle, outerRadius + 15)
        return (
          <g key={angle}>
            <line /* radial tick */ />
            <text x={pos.x} y={pos.y}>{angle}°</text>
          </g>
        )
      })}
    </g>
  )
}
```

**Estimated time:** 1 hour

---

### 1.4 Element/Modality Charts
**Pattern:** Data Visualization
**Files to create:**
- `components/ElementBalanceChart.tsx`
- `components/ModalityChart.tsx`

```typescript
export function ElementBalanceChart({ planets }: Props) {
  const counts = {
    Fire: planets.filter(p => p.element === 'Fire').length,
    Earth: planets.filter(p => p.element === 'Earth').length,
    Air: planets.filter(p => p.element === 'Air').length,
    Water: planets.filter(p => p.element === 'Water').length,
  }

  // Render donut chart with D3 or simple SVG
}
```

**Estimated time:** 3-4 hours

---

## Phase 2: Core Interactions (Medium Priority - 2-3 days)

### 2.1 Birth Data Editor
**Pattern:** State Management
**Files to create:**
- `components/BirthDataEditor.tsx`
- `components/LocationSearch.tsx`

```typescript
export function BirthDataEditor() {
  const [birthData, setBirthData] = useState<BirthData>()

  return (
    <Dialog>
      <DateTimePicker value={birthData.date} onChange={...} />
      <LocationSearch
        onSelect={(lat, lng, name) => {
          setBirthData(prev => ({ ...prev, latitude: lat, longitude: lng }))
        }}
      />
      <Button onClick={() => {
        // Calculate new chart
        const chart = calculateBirthChart(birthData)
        chartStore.addChart('custom', chart)
      }}>
        Calculate Chart
      </Button>
    </Dialog>
  )
}
```

**Estimated time:** 4-6 hours

---

### 2.2 Planet Clustering on Wheel
**Pattern:** Geometric Calculation
**Algorithm:**
1. Group planets within 15° of each other
2. Fan them out in a semicircle
3. Connect to actual position with line

```typescript
function clusterPlanets(planets: PlanetPosition[]): ClusteredPlanet[] {
  // Sort by longitude
  const sorted = [...planets].sort((a, b) => a.longitude - b.longitude)

  const clusters: PlanetPosition[][] = []
  let currentCluster: PlanetPosition[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].longitude - sorted[i-1].longitude < 15) {
      currentCluster.push(sorted[i])
    } else {
      clusters.push(currentCluster)
      currentCluster = [sorted[i]]
    }
  }
  clusters.push(currentCluster)

  // Fan out each cluster
  return clusters.map(cluster => {
    if (cluster.length === 1) return cluster[0]

    const centerAngle = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length
    const spread = 30 // degrees to spread cluster
    const step = spread / (cluster.length - 1)

    return cluster.map((planet, i) => ({
      ...planet,
      displayAngle: centerAngle - spread/2 + i * step,
      actualAngle: planet.longitude,
      isClustered: true
    }))
  }).flat()
}
```

**Estimated time:** 4-5 hours

---

### 2.3 Click-to-Highlight
**Pattern:** Interaction Hooks (already implemented!)
**Files to modify:**
- `BirthChartWheel.tsx` - Add click handlers

```typescript
const { onPlanetClick, isSelected, isHighlighted } = useChartInteractions()

// Planet rendering
<motion.g
  onClick={() => onPlanetClick(planet)}
  className={cn(
    "planet",
    isSelected('planet', planet.name) && "ring-2 ring-yellow-400",
    isHighlighted(planet.name) && "brightness-150"
  )}
>
```

**Estimated time:** 1 hour (mostly done by patterns)

---

### 2.4 Enhanced Aspect Filtering
**Pattern:** State Management + UI Controls
**Files to modify:**
- `BirthChartPage.tsx` - Add filter controls
- Update aspect rendering to respect filters

```typescript
const { visibility, setAspectVisibility } = useChartStore()

// Filter aspects before rendering
const visibleAspects = useMemo(() => {
  return chart.aspects.filter(aspect => {
    const config = ASPECT_CONFIG[aspect.type]
    const isMajor = ['Conjunction', 'Trine', 'Square', 'Opposition', 'Sextile'].includes(aspect.type)

    if (isMajor && !visibility.aspectTypes.major) return false
    if (!isMajor && !visibility.aspectTypes.minor) return false

    return true
  })
}, [chart.aspects, visibility.aspectTypes])
```

**Estimated time:** 2 hours

---

## Phase 3: Advanced Features (High Impact - 3-5 days)

### 3.1 Aspect Pattern Detection Display
**Pattern:** Pattern Detection (already implemented!)
**Files to create:**
- `components/PatternDisplay.tsx`
- `components/PatternHighlight.tsx`

```typescript
import { detectPatterns } from '@/lib/astrology/patterns'

export function PatternDisplay({ chart }: Props) {
  const patterns = useMemo(() => detectPatterns(chart), [chart])

  return (
    <div className="space-y-4">
      {patterns.map(pattern => (
        <PatternCard
          key={pattern.type}
          pattern={pattern}
          onHover={() => highlightPatternPlanets(pattern.planets)}
          onClick={() => showPatternDetails(pattern)}
        />
      ))}
    </div>
  )
}
```

**Visual on wheel:**
- Draw connecting lines between pattern planets
- Use pattern-specific colors
- Animate on hover

**Estimated time:** 6-8 hours

---

### 3.2 Chart Type Switcher
**Pattern:** Chart Calculator Pipeline (already implemented!)
**Files to create:**
- `components/ChartTypeSelector.tsx`

```typescript
import { chartRegistry } from '@/lib/astrology/chartTypes'

export function ChartTypeSelector() {
  const [chartType, setChartType] = useState<ChartType>('natal')
  const { natal } = useBirthData()

  const chart = useMemo(() => {
    return chartRegistry.calculate(chartType, {
      natal,
      transit: chartType === 'transit' ? new Date() : undefined,
      progressed: chartType === 'progressed' ? new Date() : undefined,
    })
  }, [chartType, natal])

  return (
    <>
      <Select value={chartType} onChange={setChartType}>
        <option value="natal">Natal Chart</option>
        <option value="transit">Current Transits</option>
        <option value="progressed">Progressed</option>
        <option value="solar-return">Solar Return</option>
      </Select>

      <BirthChartWheel chart={chart} />
    </>
  )
}
```

**Estimated time:** 3-4 hours

---

### 3.3 Export Features
**Pattern:** Utility Functions
**Files to create:**
- `utils/export.ts`

```typescript
export async function exportChartAsPNG(svgElement: SVGElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const svgData = new XMLSerializer().serializeToString(svgElement)
  const img = new Image()

  return new Promise((resolve) => {
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      canvas.toBlob(blob => resolve(blob!))
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  })
}

export function exportChartAsPDF(chart: BirthChart, chartImage: Blob) {
  // Use jsPDF library
  const pdf = new jsPDF()

  // Add chart image
  pdf.addImage(chartImage, 'PNG', 10, 10, 180, 180)

  // Add planet positions table
  pdf.text(20, 200, 'Planetary Positions')
  chart.planets.forEach((planet, i) => {
    pdf.text(20, 210 + i * 10,
      `${planet.name}: ${planet.degree}° ${planet.sign}`
    )
  })

  pdf.save('birth-chart.pdf')
}
```

**Estimated time:** 4-6 hours

---

### 3.4 House Overlay Interaction
**Pattern:** Layer System + Interaction Hooks
**When user clicks house:**
1. Dim everything except that house
2. Highlight planets in that house
3. Show house interpretation prominently

```typescript
const { activeHouse, setActiveHouse } = useChartStore()

// In BirthChartWheel
<g className={cn(
  "house-segment",
  activeHouse && activeHouse !== house.number && "opacity-20"
)}>
```

**Estimated time:** 2-3 hours

---

## Phase 4: Polish & Animations (1-2 days)

### 4.1 Loading Animations
```typescript
export function ChartLoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <ZodiacRing opacity={0.3} />
    </motion.div>
  )
}
```

**Estimated time:** 2 hours

---

### 4.2 Planet Entry Animation
```typescript
// In BirthChartWheel
{chart.planets.map((planet, index) => (
  <motion.g
    initial={{
      x: 0,
      y: -outerRadius * 2, // Start above chart
      opacity: 0
    }}
    animate={{
      x: planetPos.x - center,
      y: planetPos.y - center,
      opacity: 1
    }}
    transition={{
      delay: index * 0.1,
      type: "spring",
      stiffness: 100
    }}
  >
    {/* planet content */}
  </motion.g>
))}
```

**Estimated time:** 2-3 hours

---

### 4.3 Aspect Line Drawing Animation
```typescript
export function AnimatedAspectLine({ aspect, start, end }: Props) {
  return (
    <motion.line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.3 }}
      transition={{ duration: 0.5 }}
    />
  )
}
```

**Estimated time:** 1-2 hours

---

## Phase 5: Mobile & Responsive (2-3 days)

### 5.1 Mobile Layout
**Pattern:** Responsive Strategy (already implemented!)
**Files to modify:**
- `BirthChartPage.tsx` - Apply responsive config

```typescript
import { useResponsive } from './utils/responsive'

export function BirthChartPage() {
  const config = useResponsive()

  return (
    <div className={cn(
      "birth-chart-container",
      config.stackLayout && "flex-col"
    )}>
      <BirthChartWheel size={config.chartSize} />

      {config.showSidebar && <InfoPanel />}

      {!config.features.showAspectLines && (
        <p className="text-sm text-gray-500">
          Aspect lines hidden on mobile for clarity
        </p>
      )}
    </div>
  )
}
```

**Estimated time:** 4-6 hours

---

### 5.2 Touch Gestures
**Pattern:** Interaction Hooks (already has useChartTouchGestures!)
**Files to modify:**
- `BirthChartPage.tsx` - Add touch gesture support

```typescript
const chartRef = useRef<HTMLDivElement>(null)
useChartTouchGestures(chartRef)

<div ref={chartRef}>
  <BirthChartWheel />
</div>
```

**Estimated time:** 2 hours

---

### 5.3 Bottom Sheet for Mobile
```typescript
export function MobileInfoSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const selectedElement = useChartStore(state => state.interaction.selectedElement)

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-cosmic-900 rounded-t-2xl"
      initial={{ y: '100%' }}
      animate={{ y: selectedElement ? 0 : '100%' }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
    >
      {selectedElement && <ElementDetails element={selectedElement} />}
    </motion.div>
  )
}
```

**Estimated time:** 3-4 hours

---

## Phase 6: Advanced Calculations (Optional - 3-5 days)

### 6.1 Lunar Nodes
**Pattern:** Layer System + Calculator Extension
```typescript
// In calculator.ts
export function calculateLunarNodes(date: Date): { north: number, south: number } {
  // Use astronomy-engine
  const moonNode = Astronomy.MoonNode(date)
  // Calculate true node position
  return { north: moonNode.longitude, south: (moonNode.longitude + 180) % 360 }
}
```

**Estimated time:** 2-3 hours

---

### 6.2 Chiron & Asteroids
Similar pattern to lunar nodes, add to calculation pipeline.

**Estimated time:** 3-4 hours each

---

### 6.3 Arabic Parts
```typescript
export function calculatePartOfFortune(
  sunLon: number,
  moonLon: number,
  ascendant: number,
  isDayChart: boolean
): number {
  if (isDayChart) {
    return (ascendant + moonLon - sunLon + 360) % 360
  } else {
    return (ascendant + sunLon - moonLon + 360) % 360
  }
}
```

**Estimated time:** 4-6 hours for full system

---

## Total Time Estimates

- **Phase 1 (Quick Wins):** 8-10 hours
- **Phase 2 (Core Interactions):** 12-16 hours
- **Phase 3 (Advanced Features):** 15-21 hours
- **Phase 4 (Polish):** 5-7 hours
- **Phase 5 (Mobile):** 9-12 hours
- **Phase 6 (Optional Advanced):** 9-13 hours

**Minimum Viable Product:** Phases 1-3 = ~35-47 hours (1-2 weeks)
**World-Class Polish:** All phases = ~58-79 hours (2-3 weeks)

---

## Implementation Strategy

### Week 1: Foundation + Core
- Day 1-2: Phase 1 (tooltips, grouping, markers, charts)
- Day 3-4: Phase 2.1-2.2 (editor, clustering)
- Day 5: Phase 2.3-2.4 (interactions, filters)

### Week 2: Advanced Features
- Day 1-2: Phase 3.1 (pattern detection)
- Day 3: Phase 3.2 (chart types)
- Day 4-5: Phase 3.3-3.4 (export, house overlay)

### Week 3: Polish & Mobile
- Day 1-2: Phase 4 (animations)
- Day 3-5: Phase 5 (responsive, mobile, gestures)

### Optional Week 4: Advanced Calculations
- Phase 6 (nodes, asteroids, etc.)

---

## Testing Checklist

After each phase:
- [ ] Desktop Chrome, Firefox, Safari
- [ ] Mobile iOS Safari, Android Chrome
- [ ] Tablet iPad, Android tablet
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Performance: 60fps interactions
- [ ] No memory leaks (check dev tools)
- [ ] Visual regression tests pass

---

## Success Metrics

### User Experience
- Time to first interaction: < 1s
- Chart calculation time: < 200ms
- Smooth 60fps animations
- Zero layout shifts

### Code Quality
- Test coverage > 80%
- TypeScript strict mode
- Zero ESLint warnings
- Documented patterns used

### Feature Completeness
- All Phase 1-3 features working
- Mobile responsive design
- Keyboard accessible
- Export functionality

---

## Next Steps

1. **Review architecture doc:** `/BIRTH_CHART_ARCHITECTURE.md`
2. **Choose starting phase:** Recommend Phase 1 for immediate wins
3. **Set up testing:** Unit tests + visual regression
4. **Implement iteratively:** Small PRs, continuous integration
5. **Gather feedback:** User testing at end of each phase

Ready to start implementation!
