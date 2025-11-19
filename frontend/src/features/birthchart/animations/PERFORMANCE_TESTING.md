# Animation Performance Testing Guide

## Overview

This guide provides comprehensive performance testing procedures for the birth chart animation system. Follow these steps to ensure animations run smoothly at 60fps across all devices.

---

## Quick Performance Checklist

Before deploying animation changes:

- [ ] Chrome DevTools shows consistent 60fps
- [ ] No long tasks (> 50ms) during animations
- [ ] Page load animation completes in < 1 second
- [ ] Wheel entrance animation completes in < 2 seconds
- [ ] Tooltip appears in < 150ms
- [ ] No memory leaks after 5+ minutes
- [ ] Works smoothly on mobile device (not just emulator)
- [ ] Reduced motion preference respected

---

## Testing Tools

### 1. Chrome DevTools Performance Tab

**Setup:**
1. Open DevTools (F12)
2. Navigate to Performance tab
3. Click "Capture Settings" (⚙️)
4. Enable:
   - Screenshots
   - CPU throttling: 4x slowdown (simulate mobile)
   - Network throttling: Fast 3G

**Recording:**
1. Click Record (●)
2. Navigate to birth chart page
3. Wait for all animations to complete
4. Stop recording (●)

**Analysis:**
Look for these metrics:

**Frame Rate:**
- Green bars = good (60fps)
- Yellow bars = concerning (30-60fps)
- Red bars = bad (< 30fps)

**Long Tasks:**
- Any task > 50ms shows as red bar
- Should be minimal during animations
- Investigate with Bottom-Up tab

**Layout Shifts:**
- Purple bars indicate layout recalculation
- Should only occur during initial load
- Frequent shifts = performance problem

**Paint Events:**
- Green bars indicate repaint
- Should be minimal
- Check "Layers" tab for compositing issues

---

### 2. Chrome DevTools Rendering Panel

**Setup:**
1. DevTools → More Tools → Rendering
2. Enable "Frame Rendering Stats"
3. Enable "Paint Flashing" (optional)

**What to check:**
- FPS counter in top-right corner
- Should stay at 60fps during animations
- Dips below 50fps indicate problems
- Paint flashing shows repaint regions (should be minimal)

---

### 3. Lighthouse Performance Audit

**Run audit:**
```bash
npm run lighthouse
```

Or manually:
1. DevTools → Lighthouse tab
2. Select "Performance"
3. Click "Analyze page load"

**Target scores:**
- Performance: > 90
- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.8s
- Cumulative Layout Shift: < 0.1

---

### 4. React DevTools Profiler

**Setup:**
1. Install React DevTools extension
2. Open extension
3. Navigate to Profiler tab

**Recording:**
1. Click Record
2. Interact with birth chart (select planets, switch tabs)
3. Stop recording

**Analysis:**
- Flame graph shows render time
- Each animation frame should be < 16ms
- Look for unexpected re-renders
- Check component hierarchy for optimization opportunities

---

## Performance Benchmarks

### Target Timings

| Animation | Target Duration | Max Duration | Notes |
|-----------|----------------|--------------|-------|
| Page entrance | 500ms | 700ms | Initial fade-in |
| Wheel entrance | 800ms | 1200ms | Rotation + scale |
| Planet fly-in | 1000ms | 1500ms | All planets animated |
| Aspect lines draw | 500ms | 800ms | Staggered drawing |
| Tab transition | 300ms | 400ms | Content swap |
| Tooltip appearance | 150ms | 200ms | Critical for UX |
| Card stagger | 400ms | 600ms | Per card: 50ms |
| Selection ring | 300ms | 400ms | Expand animation |
| Hover feedback | 100ms | 150ms | Must feel instant |

### Frame Rate Requirements

| Scenario | Minimum FPS | Target FPS | Device Type |
|----------|-------------|------------|-------------|
| Desktop - Full animations | 50fps | 60fps | Modern desktop |
| Desktop - Heavy load | 40fps | 50fps | Older desktop |
| Tablet - Full animations | 45fps | 60fps | iPad Pro |
| Tablet - Reduced load | 35fps | 45fps | Older tablets |
| Mobile - Full animations | 40fps | 60fps | Modern phones |
| Mobile - Reduced load | 30fps | 40fps | Older phones |

---

## Test Scenarios

### Scenario 1: Initial Page Load

**Steps:**
1. Clear cache (Ctrl+Shift+Delete)
2. Open Performance tab
3. Start recording
4. Navigate to `/birth-chart`
5. Wait for all animations to complete (2-3 seconds)
6. Stop recording

**Success criteria:**
- [ ] Page entrance animation smooth (60fps)
- [ ] Wheel appears within 1 second
- [ ] All planets visible within 2 seconds
- [ ] No layout shifts after initial render
- [ ] First Contentful Paint < 1.5s

---

### Scenario 2: Planet Selection

**Steps:**
1. Load birth chart page
2. Start Performance recording
3. Click on 3-4 different planets rapidly
4. Stop recording

**Success criteria:**
- [ ] Selection rings appear instantly (< 100ms)
- [ ] No dropped frames during ring expansion
- [ ] Aspect lines highlight smoothly
- [ ] No re-renders of unrelated components
- [ ] Memory usage stable (no leaks)

---

### Scenario 3: Tab Switching

**Steps:**
1. Load birth chart page
2. Start Performance recording
3. Rapidly switch between Planets/Houses/Aspects tabs
4. Stop recording

**Success criteria:**
- [ ] Tab content transitions smooth (60fps)
- [ ] No flash of unstyled content
- [ ] Stagger animation completes within 400ms
- [ ] No memory buildup from mounting/unmounting

---

### Scenario 4: Aspect Filtering

**Steps:**
1. Load birth chart page with all aspects visible
2. Start Performance recording
3. Toggle major aspects off, then on
4. Adjust orb slider from 8° to 2° to 8°
5. Stop recording

**Success criteria:**
- [ ] Aspect lines fade out/in smoothly
- [ ] No jank when many lines animate simultaneously
- [ ] Slider dragging feels responsive
- [ ] Frame rate stays above 50fps

---

### Scenario 5: Extended Usage (Memory Leak Test)

**Steps:**
1. Load birth chart page
2. Open Performance Monitor (DevTools → More Tools)
3. Perform various interactions for 5 minutes:
   - Select different planets
   - Switch tabs repeatedly
   - Toggle aspects on/off
   - Hover over elements
4. Monitor memory usage

**Success criteria:**
- [ ] Memory usage plateaus (not constantly increasing)
- [ ] Heap size < 50MB increase over baseline
- [ ] No detached DOM nodes accumulating
- [ ] Event listeners cleaned up properly

---

### Scenario 6: Mobile Performance

**Steps:**
1. Use real mobile device (not just emulator!)
2. Enable Chrome Remote Debugging
3. Open birth chart page
4. Record Performance profile
5. Interact with chart (tap planets, scroll, zoom)

**Success criteria:**
- [ ] Touch interactions feel responsive
- [ ] No janky scrolling
- [ ] Animations complete smoothly (45fps+)
- [ ] Hover states work with touch
- [ ] No layout issues from animations

---

## Performance Optimization Techniques

### 1. GPU Acceleration

**DO:**
```tsx
// These properties are GPU-accelerated
<motion.div
  animate={{
    transform: 'translateX(100px)', // ✅ Good
    opacity: 0.5,                    // ✅ Good
    scale: 1.2,                      // ✅ Good
    rotate: 45                       // ✅ Good
  }}
/>
```

**DON'T:**
```tsx
// These trigger layout/paint
<motion.div
  animate={{
    width: 200,      // ❌ Bad - triggers layout
    height: 300,     // ❌ Bad - triggers layout
    top: 50,         // ❌ Bad - triggers layout
    left: 100,       // ❌ Bad - triggers layout
    margin: 20       // ❌ Bad - triggers layout
  }}
/>
```

---

### 2. Will-Change Optimization

**Before heavy animation:**
```tsx
<motion.div
  style={{ willChange: 'transform' }}
  animate={{ x: 500 }}
  onAnimationComplete={() => {
    // Remove will-change after animation
    element.style.willChange = 'auto'
  }}
/>
```

**Warning:** Don't overuse will-change:
- Only for elements about to animate
- Remove after animation completes
- Max 3-4 elements at once

---

### 3. Animation Staggering

**Instead of all at once:**
```tsx
// ❌ Bad - all 10 planets animate simultaneously
{planets.map(planet => (
  <motion.g animate={{ x: 0 }} />
))}
```

**Stagger for performance:**
```tsx
// ✅ Good - staggered by 50ms
<motion.div variants={staggerContainer}>
  {planets.map((planet, i) => (
    <motion.g custom={i} variants={planetVariants} />
  ))}
</motion.div>
```

---

### 4. Conditional Animation

**Only animate when visible:**
```tsx
import { useInView } from 'framer-motion'

const ref = useRef(null)
const isInView = useInView(ref, { once: true })

<motion.div
  ref={ref}
  animate={isInView ? 'visible' : 'hidden'}
  variants={variants}
/>
```

---

### 5. Reduce Animation Complexity

**Complex animations on mobile:**
```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery'

const isMobile = useMediaQuery('(max-width: 768px)')

<motion.div
  animate={{
    // Simpler animation on mobile
    opacity: 1,
    x: isMobile ? 0 : complexCalculation()
  }}
  transition={{
    duration: isMobile ? 0.2 : 0.5
  }}
/>
```

---

## Automated Performance Testing

### Setup Jest Performance Tests

```tsx
// __tests__/animations.perf.test.tsx
import { render } from '@testing-library/react'
import { BirthChartWheel } from '../components/BirthChartWheel'

describe('Animation Performance', () => {
  it('should render chart within budget', async () => {
    const startTime = performance.now()

    render(<BirthChartWheel chart={mockChart} />)

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100)
  })

  it('should not cause memory leaks', () => {
    const { unmount } = render(<BirthChartWheel chart={mockChart} />)

    const beforeUnmount = performance.memory.usedJSHeapSize
    unmount()

    // Force garbage collection (requires --expose-gc flag)
    if (global.gc) global.gc()

    const afterUnmount = performance.memory.usedJSHeapSize

    // Memory should not increase significantly
    expect(afterUnmount - beforeUnmount).toBeLessThan(1000000) // 1MB
  })
})
```

**Run tests:**
```bash
npm test -- animations.perf.test.tsx
```

---

## Performance Monitoring in Production

### Add Performance Metrics

```tsx
// utils/performance.ts
export function measureAnimation(name: string, callback: () => void) {
  const start = performance.now()
  callback()
  const duration = performance.now() - start

  // Log to analytics
  if (duration > 16) { // Slower than 60fps
    console.warn(`Slow animation: ${name} took ${duration}ms`)
    // Send to analytics service
    analytics.track('slow_animation', { name, duration })
  }
}

// Usage:
measureAnimation('planet-selection', () => {
  setSelectedPlanet(planet)
})
```

---

## Common Performance Issues

### Issue 1: Low FPS During Animation

**Symptoms:**
- Stuttering/jank
- Dropped frames
- Slow response

**Causes:**
- Too many elements animating simultaneously
- Non-GPU properties (width, height, position)
- Complex calculations during animation
- Unnecessary re-renders

**Solutions:**
1. Use transform/opacity only
2. Add stagger to reduce simultaneous animations
3. Move calculations outside animation loop
4. Use React.memo() for static components
5. Add `will-change: transform` before animation

---

### Issue 2: Memory Leaks

**Symptoms:**
- Memory usage constantly increasing
- Page slows down over time
- Browser tab becomes unresponsive

**Causes:**
- Event listeners not cleaned up
- Animations not cancelled on unmount
- References to DOM nodes held in closures

**Solutions:**
1. Use cleanup functions in useEffect
2. Cancel animations in useEffect cleanup
3. Use WeakMap for DOM node references
4. Profile with Chrome Memory tab

```tsx
useEffect(() => {
  const animation = element.animate(...)

  return () => {
    animation.cancel() // ✅ Clean up
  }
}, [])
```

---

### Issue 3: Layout Thrashing

**Symptoms:**
- Forced reflow warnings in console
- Purple bars in Performance timeline
- Janky animations

**Causes:**
- Reading layout properties during animation
- Alternating reads/writes to DOM

**Solutions:**
1. Batch DOM reads together
2. Batch DOM writes together
3. Use transform instead of position properties

```tsx
// ❌ Bad - layout thrashing
element.style.left = element.offsetWidth + 'px' // read then write
element.style.top = element.offsetHeight + 'px' // read then write

// ✅ Good - batched
const width = element.offsetWidth   // read
const height = element.offsetHeight // read
element.style.left = width + 'px'   // write
element.style.top = height + 'px'   // write
```

---

## Performance Budget

Set performance budgets to catch regressions:

**build-time budget (in `package.json`):**
```json
{
  "bundlesize": [
    {
      "path": "./dist/animations.*.js",
      "maxSize": "10 KB"
    }
  ]
}
```

**Runtime budget:**
- Page load: < 3 seconds
- Time to interactive: < 4 seconds
- Animation frame time: < 16ms (60fps)
- Memory usage: < 100MB increase over session

---

## Tools & Resources

**Performance Testing:**
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)

**Animation Performance:**
- [Framer Motion Performance](https://www.framer.com/motion/guide-reduce-bundle-size/)
- [FLIP Animations](https://aerotwist.com/blog/flip-your-animations/)
- [will-change MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)

**Profiling:**
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Chrome Memory Profiler](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

---

**Last Updated:** Phase 1 Complete
**Maintainer:** Agent Delta - Animation & Polish Lead
