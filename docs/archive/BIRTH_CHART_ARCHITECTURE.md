# Birth Chart Architecture & Patterns

## Overview

This document defines the core patterns and abstractions that govern the birth chart feature. These patterns must be understood before implementing improvements to ensure consistency and maintainability.

## Core Patterns

### 1. **Centralized State Management**
**File:** `/frontend/src/features/birthchart/stores/chartStore.ts`

**Purpose:** Single source of truth for all chart state, interactions, and visibility settings.

**Key Concepts:**
- **Multiple Charts:** Support for natal, transit, progressed, synastry charts in one store
- **Selection State:** Tracks what element (planet/house/aspect) is selected or hovered
- **Visibility Layers:** Control what visual elements are shown
- **Computed Helpers:** Derive related data (e.g., aspects for selected planet)

**Usage:**
```typescript
import { useChartStore } from '@/features/birthchart/stores/chartStore'

// In component
const { visibility, toggleLayer, setSelectedElement } = useChartStore()
```

**Why This Matters:**
- Prevents prop drilling through multiple component layers
- Enables coordinated interactions across separate components
- Makes it easy to add features like chart comparison or transit overlays

---

### 2. **Layer System Architecture**
**File:** `/frontend/src/features/birthchart/types/layers.ts`

**Purpose:** Composable visual layers with z-index management and dependencies.

**Layer Categories:**
- **Core:** zodiac, houses, planets, aspects (always available)
- **Additional:** nodes, chiron (opt-in)
- **Advanced:** asteroids, arabic parts, fixed stars (power users)

**Key Concepts:**
- **Z-Index Management:** Layers render in correct order automatically
- **Dependencies:** Some layers require others (e.g., aspect lines need planets)
- **Render Functions:** Each layer provides its own rendering logic

**Usage:**
```typescript
const layerManager = new ChartLayerManager()
layerManager.setLayerVisibility('asteroids', true)
const visibleLayers = layerManager.getVisibleLayers()
```

**Why This Matters:**
- Easy to add new visual elements without modifying core chart
- Performance: only render what's visible
- User control: toggle layers independently

---

### 3. **Aspect Pattern Detection**
**File:** `/frontend/src/lib/astrology/patterns.ts`

**Purpose:** Algorithmic detection of special planetary configurations.

**Detected Patterns:**
- **Grand Trine:** 3 planets 120° apart (harmonious talent)
- **Grand Cross:** 4 planets in cross formation (intense challenge)
- **T-Square:** 2 planets opposition + 1 square to both (dynamic tension)
- **Yod:** 2 sextile + both quincunx to 3rd (karmic purpose)
- **Kite:** Grand Trine + opposite planet (talent + drive)
- **Stellium:** 3+ planets in same sign (concentrated energy)
- **Mystic Rectangle:** 2 oppositions with harmonious connections

**Usage:**
```typescript
import { detectPatterns } from '@/lib/astrology/patterns'

const patterns = detectPatterns(chart)
// Returns array of AspectPattern objects with strength ratings
```

**Why This Matters:**
- Provides advanced interpretation beyond individual aspects
- Patterns are more significant than sum of parts
- Strength rating allows prioritization in UI

---

### 4. **Chart Type Calculation Pipeline**
**File:** `/frontend/src/lib/astrology/chartTypes.ts`

**Purpose:** Extensible system for different chart calculation methods.

**Chart Types:**
- **Natal:** Birth chart
- **Transit:** Current planets over natal
- **Progressed:** Secondary progressions (1 day = 1 year)
- **Synastry:** Two charts compared
- **Composite:** Midpoint chart for relationships
- **Solar Return:** Sun return to natal position

**Architecture:**
```typescript
// Base calculator with shared logic
abstract class BaseChartCalculator {
  abstract calculate(params: ChartCalculationParams): BirthChart
  protected applyOptions(chart: BirthChart, options?: ChartOptions): BirthChart
}

// Registry pattern for extensibility
const chartRegistry = new ChartCalculatorRegistry()
chartRegistry.register(new CustomChartCalculator())
```

**Usage:**
```typescript
import { chartRegistry } from '@/lib/astrology/chartTypes'

const transitChart = chartRegistry.calculate('transit', {
  natal: birthData,
  transit: new Date()
})
```

**Why This Matters:**
- Single interface for all chart types
- Easy to add new calculation methods
- Shared logic for common operations
- Options can modify calculations globally

---

### 5. **Chart Interaction System**
**File:** `/frontend/src/features/birthchart/hooks/useChartInteractions.ts`

**Purpose:** Coordinate user interactions across chart components.

**Interaction Types:**
- **Hover:** Show tooltips, highlight related elements
- **Click:** Select element, show detailed info
- **Keyboard:** Navigate with arrow keys, numbers
- **Touch:** Pinch to zoom, tap to select

**Handlers Provided:**
```typescript
const {
  onPlanetHover,
  onPlanetClick,
  onHouseHover,
  onHouseClick,
  onAspectHover,
  onAspectClick,
  isSelected,
  isHovered,
  isHighlighted,
  clearSelection
} = useChartInteractions()
```

**Features:**
- **Auto-highlighting:** Selecting planet highlights its aspects
- **Query functions:** Check if element is selected/hovered/highlighted
- **Keyboard navigation:** Tab through planets, number keys for houses
- **Escape to clear:** Standard UX pattern

**Why This Matters:**
- Consistent behavior across all chart components
- Reduces duplication of interaction logic
- Makes adding new interactive elements trivial
- Accessibility built-in (keyboard nav)

---

### 6. **Responsive Strategy Pattern**
**File:** `/frontend/src/features/birthchart/utils/responsive.ts`

**Purpose:** Adaptive layout and feature sets for different devices.

**Breakpoints:**
- **Mobile** (< 640px): Simplified, stacked layout, no aspects
- **Tablet** (640-1024px): Medium detail, stacked layout
- **Desktop** (1024-1920px): Full features, side-by-side
- **Ultrawide** (> 1920px): Maximum detail and size

**Adaptive Features:**
```typescript
const config = useResponsive()
// Returns: chartSize, showSidebar, stackLayout, fontSize, features

const isMobile = useIsMobile()
const features = useAdaptiveFeatures()
// Returns: touchSupport, hoverSupport, reducedMotion, darkMode
```

**Why This Matters:**
- Optimal experience at every screen size
- Performance: disable expensive features on mobile
- Accessibility: respects user preferences (reduced motion, dark mode)
- Touch vs mouse: different interaction patterns

---

## Implementation Guidelines

### When Adding New Features

1. **Ask These Questions:**
   - Does this need new state? → Add to `chartStore.ts`
   - Is this a visual element? → Add to layer system
   - Does this involve calculation? → Add to `chartTypes.ts` or `calculator.ts`
   - Is this an interaction? → Use/extend `useChartInteractions.ts`
   - Does it change on mobile? → Add responsive rules

2. **Pattern Selection Matrix:**

   | Feature Type | Use Pattern |
   |--------------|-------------|
   | New chart type | Chart Calculator Pipeline |
   | New visual overlay | Layer System |
   | New interaction | Interaction Hooks |
   | New aspect pattern | Pattern Detection |
   | New state | Chart Store |
   | Device adaptation | Responsive Strategy |

3. **Examples:**

   **Adding Chiron Display:**
   ```typescript
   // 1. Add to layer system (already defined)
   // 2. Create ChironLayer component
   // 3. Register with layer manager
   // 4. Add calculation in calculator.ts
   // 5. Add to additional points in store visibility
   ```

   **Adding Harmonic Charts:**
   ```typescript
   // 1. Create HarmonicChartCalculator extends BaseChartCalculator
   // 2. Implement calculate() method
   // 3. Register with chartRegistry
   // 4. Add UI toggle to switch chart types
   ```

   **Adding Planet Drag-to-Compare:**
   ```typescript
   // 1. Add comparisonMode to chartStore
   // 2. Extend useChartInteractions with onPlanetDrag
   // 3. Update selectedElement to track two planets
   // 4. Create ComparisonPanel component
   ```

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Chart Store                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Charts Map (natal, transit, progressed, etc.)       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Visibility Settings (layers, aspects, labels)       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Interaction State (hover, select, highlight)        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                      ↓
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ Chart Wheel    │   │  Info Panels   │   │ Controls/UI    │
│ (SVG layers)   │   │  (tabbed)      │   │ (toggles)      │
└────────────────┘   └────────────────┘   └────────────────┘
        ↓                     ↓                      ↓
┌────────────────────────────────────────────────────────────┐
│           Interaction Hooks (useChartInteractions)          │
│     (hover, click, keyboard → update store state)           │
└────────────────────────────────────────────────────────────┘
```

---

## Data Flow for Common Operations

### User Selects a Planet

1. User clicks planet in SVG
2. Component calls `onPlanetClick(planet)` from `useChartInteractions`
3. Hook updates `chartStore.interaction.selectedElement`
4. Hook calculates related aspects → `highlightedAspects`
5. Store notifies all subscribed components
6. Chart wheel dims non-highlighted elements
7. Info panel scrolls to planet details
8. Aspect lines highlight in different color

### User Toggles Aspect Lines

1. User clicks "Hide Aspects" button
2. Button calls `toggleLayer('aspects')`
3. Store updates `visibility.aspects = false`
4. Chart wheel re-renders without aspect layer
5. Layer manager skips aspect rendering

### Responsive Resize

1. Window resize event fires
2. `useResponsive` hook recalculates config
3. Returns new `chartSize`, `features`, etc.
4. Chart wheel resizes
5. Features enable/disable based on breakpoint
6. Layout switches stack/side-by-side

---

## Extension Points

### For Future Development

1. **Interpretation Engine:**
   - Create `interpretations/` folder
   - JSON files with planet-sign-house combinations
   - Loading/plugin system for custom interpretations
   - AI integration for dynamic interpretation

2. **Export System:**
   - Chart to PNG (svg → canvas → image)
   - PDF report generation
   - Share link with encoded chart data
   - Print-optimized layout

3. **Animation System:**
   - Transit playback (watch planets move over time)
   - Birth moment animation (planets fly to positions)
   - Aspect formation animation
   - Time travel slider

4. **Advanced Calculations:**
   - Midpoints (planetary midpoint structures)
   - Harmonics (9th harmonic, etc.)
   - Arabic Parts (expanded set)
   - Fixed stars (major stars only to start)
   - Asteroids (Ceres, Pallas, Juno, Vesta)

5. **Comparison Features:**
   - Side-by-side chart view
   - Synastry aspect grid
   - Composite chart with interpretation
   - Time-lord techniques (profections, solar arc)

---

## Performance Considerations

### Optimization Patterns

1. **Calculation Caching:**
   ```typescript
   const chart = useMemo(() =>
     calculateBirthChart(birthData),
     [birthData]
   )
   ```

2. **Layer Memoization:**
   - Each layer renders independently
   - Only re-render layers that changed
   - Use React.memo for layer components

3. **Interaction Debouncing:**
   - Hover tooltips debounced by 100ms
   - Aspect line calculations cached
   - Pattern detection runs once per chart

4. **Responsive Loading:**
   - Mobile: load minimal features first
   - Desktop: progressive enhancement
   - Lazy load advanced calculations

---

## Testing Strategy

### Unit Tests
- **Calculator functions:** Verify planetary positions
- **Pattern detection:** Known chart configurations
- **Chart types:** Each calculator method
- **Utilities:** Coordinate conversion, angle calculations

### Integration Tests
- **Store interactions:** State updates correctly
- **Hooks:** Interactions coordinate properly
- **Responsive:** Breakpoint transitions
- **Layer system:** Dependencies and rendering

### Visual Regression
- **Chart wheel:** Screenshot comparisons
- **Layouts:** Different breakpoints
- **Themes:** Light/dark modes
- **States:** Hover, select, highlight

---

## Migration Path

### For Existing Code

Current BirthChartPage.tsx can gradually adopt these patterns:

**Phase 1:** State Management
- Move local state to chartStore
- Replace useState with useChartStore

**Phase 2:** Interactions
- Replace inline handlers with useChartInteractions
- Add keyboard navigation

**Phase 3:** Layers
- Extract wheel rendering to layer components
- Add layer visibility controls

**Phase 4:** Responsive
- Apply responsive config to sizing
- Add mobile adaptations

**Phase 5:** Advanced
- Add pattern detection display
- Implement chart type switching
- Add export features

---

## Questions for Implementation

Before implementing any improvement, ask:

1. **Does this follow existing patterns?**
   - If no, should it? Or is a new pattern needed?

2. **Is this responsive?**
   - How does it work on mobile?
   - Does it respect user preferences?

3. **Is this accessible?**
   - Keyboard navigable?
   - Screen reader friendly?
   - Color contrast sufficient?

4. **Is this testable?**
   - Can we write unit tests?
   - Can we visually verify?
   - Can we performance test?

5. **Is this extensible?**
   - Can users customize this?
   - Can developers extend this?
   - Will this work with new chart types?

---

## Summary

These patterns create a **scalable, maintainable, and performant** birth chart system. By following these abstractions:

- **New features integrate cleanly** without refactoring
- **Code is DRY** (shared logic in base classes/hooks)
- **User experience is consistent** (centralized interaction handling)
- **Performance is optimized** (layer system, memoization, responsive loading)
- **Accessibility is built-in** (keyboard nav, ARIA, responsive)

**Before implementing improvements:** Review which patterns apply and how they should be used.

**When stuck:** Refer to this document to understand the architectural decisions and extension points.
