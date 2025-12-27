# Birth Chart Animation System

A comprehensive, performance-optimized animation library for the birth chart feature built on Framer Motion.

## Features

✨ **50+ Animation Variants** - Covering every interaction type
🎯 **Performance Optimized** - GPU-accelerated transforms only
♿ **Accessibility First** - Respects `prefers-reduced-motion`
📱 **Mobile Ready** - Optimized for touch interactions
🎨 **Celestial Theme** - Cosmic-inspired motion design
📊 **Data Viz Animations** - Specialized chart animations

---

## Quick Start

```tsx
import { pageVariants, planetEntranceVariants } from '@/features/birthchart/animations'
import { motion } from 'framer-motion'

export function MyComponent() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Your content */}
    </motion.div>
  )
}
```

---

## File Structure

```
animations/
├── index.ts                          # Central exports
├── chartAnimations.ts                # General chart animations
├── planetAnimations.ts               # Planet-specific animations
├── ANIMATION_INTEGRATION_GUIDE.md    # Detailed integration steps
└── README.md                         # This file

components/
└── ChartLoadingState.tsx             # Loading spinner component
```

---

## Animation Categories

### 1. Page & Layout Animations

**Page entrance/exit:**
```tsx
import { pageVariants } from '@/features/birthchart/animations'

<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
  <BirthChartPage />
</motion.div>
```

**Collapsible panels:**
```tsx
import { panelVariants } from '@/features/birthchart/animations'

<motion.div variants={panelVariants} initial="closed" animate="open">
  <FilterPanel />
</motion.div>
```

**Tab transitions:**
```tsx
import { tabContentVariants } from '@/features/birthchart/animations'

<AnimatePresence mode="wait">
  {activeTab === 'planets' && (
    <motion.div
      key="planets"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <PlanetList />
    </motion.div>
  )}
</AnimatePresence>
```

---

### 2. Chart Wheel Animations

**Wheel entrance:**
```tsx
import { wheelVariants } from '@/features/birthchart/animations'

<motion.svg variants={wheelVariants} initial="initial" animate="animate">
  {/* Chart SVG content */}
</motion.svg>
```

**Zodiac segments (with stagger):**
```tsx
import { zodiacSegmentVariants } from '@/features/birthchart/animations'

{ZODIAC_SIGNS.map((sign, i) => (
  <motion.g
    key={sign.name}
    custom={i}
    variants={zodiacSegmentVariants}
    initial="initial"
    animate="animate"
  >
    {/* Sign content */}
  </motion.g>
))}
```

**Aspect line drawing:**
```tsx
import { aspectLineVariants } from '@/features/birthchart/animations'

<motion.line
  variants={aspectLineVariants}
  custom={index * 0.02}  // Stagger delay
  initial="initial"
  animate="animate"
  x1={x1} y1={y1} x2={x2} y2={y2}
/>
```

---

### 3. Planet Animations

**Planet entrance (fly-in from sky):**
```tsx
import { planetEntranceVariants } from '@/features/birthchart/animations'

{chart.planets.map((planet, index) => (
  <motion.g
    key={planet.name}
    custom={index}
    variants={planetEntranceVariants}
    initial="initial"
    animate="animate"
  >
    {/* Planet SVG */}
  </motion.g>
))}
```

**Alternative entrance styles:**
```tsx
import { planetFadeInVariants, planetOrbitalVariants } from '@/features/birthchart/animations'

// Simple fade-in
<motion.g variants={planetFadeInVariants} custom={index}>

// Orbital rotation entrance
<motion.g variants={planetOrbitalVariants} custom={index}>
```

**Hover effects:**
```tsx
import { planetHoverVariants } from '@/features/birthchart/animations'

<motion.g
  variants={planetHoverVariants}
  initial="rest"
  whileHover="hover"
>
  {/* Planet */}
</motion.g>
```

**Selection state:**
```tsx
import { planetSelectionVariants } from '@/features/birthchart/animations'

<motion.g
  variants={planetSelectionVariants}
  animate={isSelected ? 'selected' : 'unselected'}
>
  {/* Planet */}
</motion.g>
```

**Retrograde indicator:**
```tsx
import { retrogradeVariants } from '@/features/birthchart/animations'

{planet.isRetrograde && (
  <motion.text
    variants={retrogradeVariants}
    initial="initial"
    animate="animate"
  >
    ℞
  </motion.text>
)}
```

---

### 4. Selection & Highlight Animations

**Selection ring:**
```tsx
import { selectionRingVariants, selectionRingPulseVariants } from '@/features/birthchart/animations'

<AnimatePresence>
  {isSelected && (
    <motion.circle
      variants={selectionRingVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      r={20}
    />
  )}
</AnimatePresence>

// Or with pulse
<motion.circle variants={selectionRingPulseVariants} />
```

**Highlight ring (for related elements):**
```tsx
import { highlightRingVariants } from '@/features/birthchart/animations'

<AnimatePresence>
  {isHighlighted && (
    <motion.circle
      variants={highlightRingVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    />
  )}
</AnimatePresence>
```

---

### 5. Card & List Animations

**Card entrance with stagger:**
```tsx
import { cardVariants } from '@/features/birthchart/animations'

{planets.map((planet, i) => (
  <motion.div
    key={planet.name}
    custom={i}
    variants={cardVariants}
    initial="initial"
    animate="animate"
  >
    <PlanetCard planet={planet} />
  </motion.div>
))}
```

**List items:**
```tsx
import { listItemVariants, staggerContainerVariants } from '@/features/birthchart/animations'

<motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
  {items.map((item, i) => (
    <motion.div key={i} custom={i} variants={listItemVariants}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

---

### 6. Data Visualization Animations

**Bar charts:**
```tsx
import { barChartVariants } from '@/features/birthchart/animations'

{elements.map((element, i) => (
  <motion.rect
    key={element.name}
    custom={i}
    variants={barChartVariants}
    initial="initial"
    animate="animate"
    height={element.value}
  />
))}
```

**Pie charts:**
```tsx
import { pieChartVariants } from '@/features/birthchart/animations'

<motion.path
  variants={pieChartVariants}
  custom={delay}
  initial="initial"
  animate="animate"
  d={arcPath}
/>
```

---

### 7. Aspect Pattern Animations

**Grand Trine highlight:**
```tsx
import { grandTrineVariants } from '@/features/birthchart/animations'

{isInGrandTrine && (
  <motion.g variants={grandTrineVariants} initial="initial" animate="animate">
    {/* Planet */}
  </motion.g>
)}
```

**T-Square tension:**
```tsx
import { tSquareVariants } from '@/features/birthchart/animations'

{isInTSquare && (
  <motion.g variants={tSquareVariants}>
    {/* Planet */}
  </motion.g>
)}
```

**Yod (Finger of God):**
```tsx
import { yodVariants } from '@/features/birthchart/animations'

{isInYod && (
  <motion.g variants={yodVariants}>
    {/* Planet */}
  </motion.g>
)}
```

**Stellium highlight:**
```tsx
import { stelliumHighlightVariants } from '@/features/birthchart/animations'

{isInStellium && (
  <motion.g variants={stelliumHighlightVariants}>
    {/* Planet */}
  </motion.g>
)}
```

---

### 8. Tooltips

```tsx
import { tooltipVariants } from '@/features/birthchart/animations'
import { AnimatePresence } from 'framer-motion'

<AnimatePresence>
  {tooltip && (
    <motion.div
      variants={tooltipVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ position: 'absolute', left: x, top: y }}
    >
      {tooltip.content}
    </motion.div>
  )}
</AnimatePresence>
```

---

### 9. Loading States

**Full chart loading:**
```tsx
import { ChartLoadingState } from '@/features/birthchart/animations'

{isCalculating ? (
  <ChartLoadingState
    size={600}
    message="Calculating planetary positions..."
    progress={calculationProgress}
  />
) : (
  <BirthChartWheel chart={chart} />
)}
```

**Minimal inline loading:**
```tsx
import { ChartLoadingStateMinimal } from '@/features/birthchart/animations'

<Button disabled={loading}>
  {loading ? <ChartLoadingStateMinimal size={20} /> : 'Calculate'}
</Button>
```

---

## Utility Functions

### getPlanetEntranceDelay()

Calculate appropriate entrance delay based on planetary speed:

```tsx
import { getPlanetEntranceDelay } from '@/features/birthchart/animations'

const delay = getPlanetEntranceDelay('Mercury') // 0.1
const delay2 = getPlanetEntranceDelay('Pluto')   // 0.45
```

### getAnimationIntensity()

Calculate animation intensity based on aspect orb:

```tsx
import { getAnimationIntensity } from '@/features/birthchart/animations'

const intensity = getAnimationIntensity(aspect.orb, 8)
// Tighter orbs (< 1°) return higher intensity (> 0.9)
// Wider orbs (> 6°) return lower intensity (< 0.6)
```

### getPlanetSpringConfig()

Get spring physics config appropriate for planet type:

```tsx
import { getPlanetSpringConfig } from '@/features/birthchart/animations'

const springConfig = getPlanetSpringConfig('Jupiter')
// Returns: { type: 'spring', stiffness: 80, damping: 20, mass: 1.2 }
// Heavier planets get slower, more massive springs
```

### getAnimationConfig()

Check if animations should run (accessibility):

```tsx
import { getAnimationConfig } from '@/features/birthchart/animations'

const config = getAnimationConfig()
if (config.enabled) {
  // Run animations
} else {
  // User prefers reduced motion, skip animations
}
```

### withReducedMotion()

Wrap variants to respect reduced motion preference:

```tsx
import { withReducedMotion, pageVariants } from '@/features/birthchart/animations'

const accessibleVariants = withReducedMotion(pageVariants)
<motion.div variants={accessibleVariants} />
```

---

## Performance Tips

### ✅ DO

- Use `transform` and `opacity` (GPU accelerated)
- Keep durations under 500ms for UI feedback
- Use `ease-out` for entrances, `ease-in` for exits
- Stagger animations to limit simultaneous motion
- Add `will-change: transform` for heavy animations

### ❌ DON'T

- Animate `width`, `height`, `top`, `left` (causes layout reflow)
- Run infinite animations on hidden elements
- Use overly complex SVG filters in animations
- Animate during heavy calculations
- Nest too many animated components

---

## Accessibility

All animations respect `prefers-reduced-motion` by default. Users who enable this setting will see instant transitions instead of animations.

**Testing reduced motion:**

1. **macOS:** System Preferences → Accessibility → Display → Reduce Motion
2. **Windows:** Settings → Ease of Access → Display → Show animations
3. **Chrome DevTools:** Rendering → Emulate CSS media feature → prefers-reduced-motion: reduce

---

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 88+

Framer Motion uses the Web Animations API with fallbacks.

---

## Testing

### Visual Testing

```bash
# Run visual regression tests
npm run test:visual

# Update snapshots after animation changes
npm run test:visual -- --update-snapshots
```

### Performance Testing

1. Open Chrome DevTools → Performance
2. Record interaction
3. Check for:
   - 60fps frame rate
   - No long tasks (> 50ms)
   - Minimal layout shifts

### Manual Testing Checklist

- [ ] Page entrance smooth and complete
- [ ] Planets fly in naturally from sky positions
- [ ] Aspect lines draw progressively
- [ ] Selection rings expand smoothly
- [ ] Tooltips appear instantly (< 150ms)
- [ ] Tab transitions feel fluid
- [ ] No jank on mobile
- [ ] Reduced motion setting respected
- [ ] No memory leaks after 5+ minutes

---

## Examples

### Complete Component Example

```tsx
import {
  pageVariants,
  wheelVariants,
  planetEntranceVariants,
  selectionRingVariants,
  tooltipVariants,
  ChartLoadingState
} from '@/features/birthchart/animations'
import { motion, AnimatePresence } from 'framer-motion'

export function BirthChartWheel({ chart, isLoading }: Props) {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)

  if (isLoading) {
    return <ChartLoadingState size={600} message="Calculating..." />
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <motion.svg
        width={600}
        height={600}
        variants={wheelVariants}
        initial="initial"
        animate="animate"
      >
        {/* Planets */}
        {chart.planets.map((planet, index) => (
          <motion.g
            key={planet.name}
            custom={index}
            variants={planetEntranceVariants}
            initial="initial"
            animate="animate"
            onHoverStart={() => setHoveredPlanet(planet.name)}
            onHoverEnd={() => setHoveredPlanet(null)}
            onClick={() => setSelectedPlanet(planet.name)}
          >
            {/* Selection ring */}
            <AnimatePresence>
              {selectedPlanet === planet.name && (
                <motion.circle
                  variants={selectionRingVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  r={20}
                />
              )}
            </AnimatePresence>

            {/* Planet circle */}
            <circle r={12} fill={planet.color} />
            <text>{planet.symbol}</text>
          </motion.g>
        ))}
      </motion.svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredPlanet && (
          <motion.div
            variants={tooltipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {hoveredPlanet} details
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

---

## Troubleshooting

### Animations not running?

1. Check component wrapped with `<motion.*>`
2. Verify `initial` and `animate` states differ
3. Check `AnimatePresence` for conditional rendering
4. Ensure keys are unique

### Performance issues?

1. Check for non-GPU properties (width/height/position)
2. Reduce simultaneous animations
3. Add `will-change: transform`
4. Simplify animation complexity

### Jank on mobile?

1. Reduce animation duration
2. Remove filters/shadows
3. Use simpler easing functions
4. Test on actual device (not just DevTools)

---

## Future Enhancements (Phase 2)

- [ ] Chart morph transitions (natal → transit → progressed)
- [ ] Planet clustering with expand/collapse
- [ ] Aspect pattern highlights (auto-detect grand trines, etc.)
- [ ] Interactive onboarding animations
- [ ] Gesture-based chart rotation
- [ ] 3D planet orbit visualization
- [ ] Time-based transits animation (watch planets move)

---

## Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Web Animations Performance Guide](https://web.dev/animations/)
- [Accessibility: Reduced Motion](https://web.dev/prefers-reduced-motion/)
- [CSS GPU Acceleration](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- [Animation Timing Functions](https://easings.net/)

---

## Support

For questions or issues with the animation system:

1. Check the [Integration Guide](./ANIMATION_INTEGRATION_GUIDE.md)
2. Review the examples in this README
3. Test with Chrome DevTools Performance tab
4. Check browser console for Framer Motion warnings

---

**Built by Agent Delta - Animation & Polish Lead**
Version 1.0.0 - Phase 1 Complete
