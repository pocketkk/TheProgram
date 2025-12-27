# Birth Chart Animation Integration Guide

## Overview

This guide provides complete instructions for integrating the animation system into existing birth chart components. The animation system is built on Framer Motion and optimized for performance and accessibility.

## Quick Start

```tsx
import { pageVariants, planetEntranceVariants } from '@/features/birthchart/animations'
import { motion } from 'framer-motion'

// Wrap your component with motion and variants
<motion.div variants={pageVariants} initial="initial" animate="animate">
  {/* Your content */}
</motion.div>
```

---

## Integration Steps by Component

### 1. BirthChartPage.tsx

**Current state:** Page already uses some Framer Motion but can be enhanced.

**Integration:**

```tsx
import {
  pageVariants,
  panelVariants,
  tabContentVariants,
  staggerContainerVariants
} from './animations'

export function BirthChartPage() {
  // ... existing code ...

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-cosmic-950 to-slate-900"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header stays the same */}

      {/* Aspect Filter Panel - replace existing animation */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden border-t border-cosmic-700/30"
          >
            {/* Panel content */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content - replace existing animation */}
      <AnimatePresence mode="wait">
        {activeTab === 'planets' && (
          <motion.div
            key="planets"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-4"
          >
            {/* Use stagger container for children */}
            <motion.div variants={staggerContainerVariants}>
              {chart.planets.map((planet, index) => (
                <motion.div key={planet.name} custom={index} variants={cardVariants}>
                  <PlanetInfo planet={planet} index={index} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

**Benefits:**
- Consistent page entrance
- Smooth panel transitions
- Staggered card animations for visual polish

---

### 2. BirthChartWheel.tsx

**Current state:** Planets have basic fade-in, needs enhancement.

**Integration:**

```tsx
import {
  wheelVariants,
  zodiacSegmentVariants,
  planetEntranceVariants,
  aspectLineVariants,
  selectionRingVariants,
  getPlanetEntranceDelay
} from '../animations'

export function BirthChartWheel({ chart, showAspects, showHouseNumbers, size }: Props) {
  // ... existing code ...

  return (
    <div ref={containerRef} className="relative" style={{ width: size, height: size }}>
      <ChartTooltip containerRef={containerRef} />

      {/* Wrap SVG with wheel entrance */}
      <motion.svg
        width={size}
        height={size}
        className="drop-shadow-2xl"
        variants={wheelVariants}
        initial="initial"
        animate="animate"
      >
        {/* ... defs ... */}

        {/* Zodiac signs with stagger */}
        {ZODIAC_SIGNS.map((sign, i) => (
          <motion.g
            key={sign.name}
            custom={i}
            variants={zodiacSegmentVariants}
            initial="initial"
            animate="animate"
          >
            {/* Existing sign rendering */}
          </motion.g>
        ))}

        {/* Aspect lines with draw animation */}
        {showAspects && filteredAspects.map((aspect, index) => {
          const planet1 = chart.planets.find(p => p.name === aspect.planet1)
          const planet2 = chart.planets.find(p => p.name === aspect.planet2)
          if (!planet1 || !planet2) return null

          const pos1 = polarToCartesian(planet1.longitude, planetRadius - 40)
          const pos2 = polarToCartesian(planet2.longitude, planetRadius - 40)
          const config = ASPECT_CONFIG[aspect.type]
          const highlighted = isHighlighted(aspect.planet1) || isHighlighted(aspect.planet2)

          return (
            <motion.line
              key={`aspect-${index}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={config.color}
              strokeWidth={highlighted ? 3 : aspect.orb < 2 ? 2 : 1}
              strokeDasharray={aspect.isApplying ? 'none' : '4 4'}
              variants={aspectLineVariants}
              custom={index * 0.02} // Stagger line drawing
              initial="initial"
              animate="animate"
              className="transition-all duration-200"
            />
          )
        })}

        {/* Planets with enhanced entrance */}
        {chart.planets.map((planet, index) => {
          const pos = polarToCartesian(planet.longitude, planetRadius)
          const planetConfig = PLANETS.find(p => p.name === planet.name)
          const selected = isSelected('planet', planet.name)
          const highlighted = isHighlighted(planet.name)

          return (
            <motion.g
              key={planet.name}
              custom={index}
              variants={planetEntranceVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              whileTap="tap"
              onMouseEnter={() => onPlanetHover(planet)}
              onMouseLeave={() => onPlanetHover(null)}
              onClick={() => onPlanetClick(planet)}
              className="cursor-pointer"
            >
              {/* Selection ring with animation */}
              <AnimatePresence>
                {selected && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={18}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    variants={selectionRingVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  />
                )}
              </AnimatePresence>

              {/* Planet circle and symbol - existing code */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={12}
                fill={planetConfig?.color || '#fff'}
                filter="url(#planetGlow)"
                className="hover:brightness-125 transition-all"
              />

              <text
                x={pos.x}
                y={pos.y}
                fontSize={16}
                fill="#000"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {planet.symbol}
              </text>

              {/* Retrograde with pulse animation */}
              {planet.isRetrograde && (
                <motion.text
                  x={pos.x + 15}
                  y={pos.y - 10}
                  fontSize={10}
                  fill="#ff6b6b"
                  fontWeight="bold"
                  className="pointer-events-none"
                  variants={retrogradeVariants}
                  initial="initial"
                  animate="animate"
                >
                  ℞
                </motion.text>
              )}
            </motion.g>
          )
        })}
      </motion.svg>
    </div>
  )
}
```

**Benefits:**
- Dramatic wheel entrance
- Planets fly in from sky positions
- Aspect lines draw progressively
- Selection rings animate smoothly
- Retrograde indicators pulse

---

### 3. PlanetInfo.tsx

**Current state:** Basic component without animations.

**Integration:**

```tsx
import { cardVariants, listItemVariants } from '../animations'
import { motion } from 'framer-motion'

export function PlanetInfo({ planet, index }: Props) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-4 border border-cosmic-700/50"
    >
      {/* Header section */}
      <div className="flex items-center justify-between mb-3">
        {/* ... existing header content ... */}
      </div>

      {/* Planet details as list with stagger */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
        className="space-y-2"
      >
        {planetDetails.map((detail, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={listItemVariants}
            className="flex justify-between"
          >
            <span className="text-cosmic-400">{detail.label}</span>
            <span className="text-cosmic-200">{detail.value}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
```

---

### 4. ChartTooltip.tsx

**Current state:** Likely has basic tooltip display.

**Integration:**

```tsx
import { tooltipVariants } from '../animations'
import { AnimatePresence, motion } from 'framer-motion'

export function ChartTooltip({ containerRef }: Props) {
  const tooltip = useChartStore(state => state.tooltip)

  return (
    <AnimatePresence>
      {tooltip && (
        <motion.div
          variants={tooltipVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            pointerEvents: 'none',
            zIndex: 50
          }}
          className="bg-cosmic-900/95 text-cosmic-100 px-3 py-2 rounded-lg border border-cosmic-700/50 shadow-lg"
        >
          {/* Tooltip content */}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

### 5. ElementBalanceChart.tsx & ModalityChart.tsx

**Current state:** Static data visualization.

**Integration:**

```tsx
import { barChartVariants, pieChartVariants } from '../animations'
import { motion } from 'framer-motion'

export function ElementBalanceChart({ chart, size }: Props) {
  // ... calculate element data ...

  return (
    <svg width={size} height={size}>
      {elements.map((element, i) => (
        <motion.rect
          key={element.name}
          custom={i}
          variants={barChartVariants}
          initial="initial"
          animate="animate"
          x={/* bar x position */}
          y={/* bar y position */}
          width={/* bar width */}
          height={/* bar height */}
          fill={element.color}
        />
      ))}
    </svg>
  )
}
```

---

## Loading State Usage

Replace chart rendering with loading state during calculations:

```tsx
import { ChartLoadingState } from '@/features/birthchart/animations'

export function BirthChartPage() {
  const [isCalculating, setIsCalculating] = useState(true)
  const [calculationProgress, setCalculationProgress] = useState(0)

  // Simulate calculation progress
  useEffect(() => {
    const timer = setInterval(() => {
      setCalculationProgress(prev => {
        if (prev >= 100) {
          setIsCalculating(false)
          return 100
        }
        return prev + 10
      })
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center justify-center">
      {isCalculating ? (
        <ChartLoadingState
          size={600}
          message="Calculating planetary positions..."
          progress={calculationProgress}
        />
      ) : (
        <BirthChartWheel chart={chart} />
      )}
    </div>
  )
}
```

For inline loading indicators:

```tsx
import { ChartLoadingStateMinimal } from '@/features/birthchart/animations'

<Button disabled={loading}>
  {loading ? <ChartLoadingStateMinimal size={20} /> : 'Calculate'}
</Button>
```

---

## Performance Best Practices

### 1. GPU-Accelerated Properties

✅ **Use these properties** (GPU accelerated):
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (use sparingly)

❌ **Avoid these properties** (trigger layout):
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`

### 2. Will-Change Optimization

For heavy animations, add `will-change`:

```tsx
<motion.div
  style={{ willChange: 'transform' }}
  animate={{ x: 100 }}
>
```

**Important:** Remove `will-change` after animation completes:

```tsx
<motion.div
  style={{ willChange: 'transform' }}
  animate={{ x: 100 }}
  onAnimationComplete={() => {
    // Remove will-change
  }}
>
```

### 3. Limit Simultaneous Animations

Use stagger to avoid animating too many elements at once:

```tsx
<motion.div variants={staggerContainerVariants}>
  {items.map((item, i) => (
    <motion.div key={i} custom={i} variants={itemVariants} />
  ))}
</motion.div>
```

### 4. Conditional Animation

Only animate visible elements:

```tsx
{isVisible && (
  <motion.div variants={fadeIn} initial="initial" animate="animate" />
)}
```

---

## Accessibility

### Respecting Reduced Motion

All animations automatically respect `prefers-reduced-motion`:

```tsx
import { getAnimationConfig, withReducedMotion } from './animations'

// Check if animations should run
const animConfig = getAnimationConfig()
if (!animConfig.enabled) {
  // Skip animations
}

// Or wrap variants
const accessibleVariants = withReducedMotion(myVariants)
```

### Manual Override

For critical animations that should always run instantly when reduced motion is preferred:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.3
  }}
>
```

---

## Testing Animations

### Chrome DevTools Performance

1. Open DevTools → Performance tab
2. Click Record
3. Navigate to birth chart page
4. Stop recording
5. Look for:
   - Frame rate (should be 60fps)
   - Long tasks (should be < 50ms)
   - Layout shifts (should be minimal)

### Visual Regression Testing

```bash
# Take screenshot before changes
npm run test:visual -- --update-snapshots

# Compare after implementing animations
npm run test:visual
```

### Performance Benchmarks

Target metrics:
- **Page load animation:** < 1 second
- **Planet entrance:** < 2 seconds
- **Tab transitions:** < 300ms
- **Tooltip appearance:** < 150ms
- **Hover feedback:** < 100ms

---

## Animation Timing Reference

| Animation Type | Duration | Easing | Notes |
|---------------|----------|--------|-------|
| Page entrance | 500ms | easeOut | Initial load |
| Wheel entrance | 800ms | custom | Smooth rotation |
| Planet fly-in | 1000ms | spring | Natural physics |
| Aspect line draw | 500ms | easeOut | Staggered |
| Tooltip | 150ms | easeOut | Fast feedback |
| Card entrance | 400ms | easeOut | Staggered |
| Tab transition | 300ms | easeInOut | Smooth swap |
| Button hover | 200ms | easeOut | Instant feedback |

---

## Common Patterns

### Pattern 1: Staggered List

```tsx
<motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
  {items.map((item, i) => (
    <motion.div key={i} custom={i} variants={listItemVariants}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

### Pattern 2: Conditional Animation

```tsx
<AnimatePresence>
  {show && (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 3: Hover + Click

```tsx
<motion.button
  variants={buttonHoverVariants}
  initial="rest"
  whileHover="hover"
  whileTap="tap"
>
  Click me
</motion.button>
```

### Pattern 4: Gesture-Based

```tsx
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300 }}
  whileDrag={{ scale: 1.1 }}
>
  Drag me
</motion.div>
```

---

## Troubleshooting

### Problem: Animations are janky

**Solutions:**
1. Check for non-GPU properties
2. Reduce number of simultaneous animations
3. Add `will-change: transform`
4. Simplify animation paths
5. Check for layout thrashing

### Problem: Animations don't trigger

**Solutions:**
1. Ensure component is wrapped with `<motion.*>`
2. Check initial/animate states are different
3. Verify AnimatePresence is used for conditional rendering
4. Check key props are unique

### Problem: Performance issues on mobile

**Solutions:**
1. Reduce animation complexity
2. Lower animation duration
3. Remove filters/shadows during animation
4. Use `layoutId` for shared element transitions

---

## Next Steps (Phase 2)

After completing Phase 1 integration:

1. **Add chart type switcher animations**
   - Morph between natal/transit/progressed
   - Smooth planet position transitions

2. **Implement planet clustering animations**
   - Group close planets
   - Expand on hover

3. **Add aspect pattern highlights**
   - Animate grand trines, T-squares, etc.
   - Show pattern connections

4. **Create interactive tutorials**
   - Animated walkthroughs
   - Highlight features sequentially

5. **Polish micro-interactions**
   - Degree marker hovers
   - House cusp highlights
   - Sign boundary indicators

---

## Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Web Animation Performance](https://web.dev/animations/)
- [Reduced Motion Guide](https://web.dev/prefers-reduced-motion/)
- [CSS GPU Acceleration](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
