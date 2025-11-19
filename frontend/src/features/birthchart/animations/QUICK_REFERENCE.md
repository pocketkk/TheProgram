# Animation System Quick Reference

**One-page cheat sheet for common animation tasks.**

---

## Import

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import {
  pageVariants,
  planetEntranceVariants,
  tooltipVariants,
  cardVariants,
  ChartLoadingState
} from '@/features/birthchart/animations'
```

---

## Common Patterns

### Page Entrance

```tsx
<motion.div variants={pageVariants} initial="initial" animate="animate">
  {/* content */}
</motion.div>
```

### Planet Animation

```tsx
{planets.map((planet, i) => (
  <motion.g
    key={planet.name}
    custom={i}
    variants={planetEntranceVariants}
    initial="initial"
    animate="animate"
  >
    {/* planet SVG */}
  </motion.g>
))}
```

### Selection Ring

```tsx
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
```

### Tooltip

```tsx
<AnimatePresence>
  {tooltip && (
    <motion.div
      variants={tooltipVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {tooltip.content}
    </motion.div>
  )}
</AnimatePresence>
```

### Staggered Cards

```tsx
{items.map((item, i) => (
  <motion.div
    key={item.id}
    custom={i}
    variants={cardVariants}
    initial="initial"
    animate="animate"
  >
    {/* card content */}
  </motion.div>
))}
```

### Tab Transitions

```tsx
<AnimatePresence mode="wait">
  {activeTab === 'planets' && (
    <motion.div
      key="planets"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* tab content */}
    </motion.div>
  )}
</AnimatePresence>
```

### Loading State

```tsx
{isLoading ? (
  <ChartLoadingState size={600} progress={progress} />
) : (
  <BirthChartWheel chart={chart} />
)}
```

---

## Animation Variants Quick List

### Page & Layout
- `pageVariants` - Page entrance/exit
- `panelVariants` - Collapsible panels
- `tabContentVariants` - Tab switching
- `staggerContainerVariants` - Stagger wrapper

### Planets
- `planetEntranceVariants` - Fly in from sky
- `planetHoverVariants` - Hover scale
- `planetSelectionVariants` - Selected state
- `retrogradeVariants` - Retrograde pulse

### Interactions
- `tooltipVariants` - Tooltip appearance
- `selectionRingVariants` - Ring expand
- `glowVariants` - Glow pulse
- `buttonHoverVariants` - Button lift

### Data Viz
- `cardVariants` - Card entrance
- `listItemVariants` - List stagger
- `barChartVariants` - Bar growth
- `aspectLineVariants` - Line drawing

---

## Key Props

### Motion Component

```tsx
<motion.div
  variants={myVariants}           // Animation definitions
  initial="initial"               // Starting state
  animate="animate"               // Target state
  exit="exit"                     // Exit state (needs AnimatePresence)
  custom={index}                  // Pass data to variants
  whileHover="hover"              // Hover state
  whileTap="tap"                  // Click state
  transition={{ duration: 0.3 }}  // Override transition
/>
```

### AnimatePresence

**Required for:**
- Conditional rendering
- Exit animations
- List item removal

```tsx
<AnimatePresence mode="wait">  {/* mode: wait, sync, popLayout */}
  {show && <motion.div />}
</AnimatePresence>
```

---

## Performance Tips

### ✅ DO
- Use `transform` and `opacity`
- Stagger animations
- Use `layout` prop for layout animations
- Add `will-change: transform` for heavy animations
- Test on mobile devices

### ❌ DON'T
- Animate `width`, `height`, position properties
- Run too many animations simultaneously
- Use complex SVG filters in animations
- Forget to cleanup animations on unmount

---

## Troubleshooting

**Animation not working?**
- Check component is `<motion.*>`
- Verify `initial` != `animate`
- Add `AnimatePresence` for conditional
- Check unique `key` props

**Low FPS?**
- Use transform instead of position
- Reduce simultaneous animations
- Add stagger delays
- Test in DevTools Performance tab

**Memory leak?**
- Cancel animations in cleanup
- Check event listeners removed
- Profile with Memory tab

---

## File Locations

```
animations/
├── index.ts                          - Import from here
├── chartAnimations.ts                - General animations
├── planetAnimations.ts               - Planet-specific
├── ANIMATION_INTEGRATION_GUIDE.md    - Full integration guide
├── README.md                         - Complete documentation
├── PERFORMANCE_TESTING.md            - Testing procedures
└── EXAMPLES.tsx                      - Working examples

components/
└── ChartLoadingState.tsx             - Loading spinners
```

---

## Testing Checklist

Before committing:
- [ ] Chrome DevTools shows 60fps
- [ ] No long tasks during animations
- [ ] Works on mobile device
- [ ] Reduced motion respected
- [ ] No TypeScript errors
- [ ] No memory leaks

---

## Resources

- **Full Docs:** `animations/README.md`
- **Integration:** `animations/ANIMATION_INTEGRATION_GUIDE.md`
- **Examples:** `animations/EXAMPLES.tsx`
- **Testing:** `animations/PERFORMANCE_TESTING.md`

---

**Built by Agent Delta**
