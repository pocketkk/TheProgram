# Cosmic Visualizer Bottom Panel - Implementation Guide

## Overview
This guide shows how to implement collapse/minimize functionality for the bottom time control panel.

---

## Current Code Location

**File**: `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/cosmos/CosmicVisualizerPage.tsx`

**Bottom Panel**: Lines 1997-2123

```tsx
{/* Time Controls */}
<div className="glass-strong border-t border-cosmic-700/50 p-3">
  {/* Current Date & Time Display - Lines 1999-2026 */}
  {/* Playback Controls - Lines 2028-2066 */}
  {/* Date/Time Presets - Lines 2068-2088 */}
  {/* Fine Step Controls - Lines 2091-2121 */}
</div>
```

---

## Implementation Option 1: Quick Collapse (RECOMMENDED)

### Step 1: Update State (Line ~288)

**Current**:
```tsx
const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
  'display-options': false,
  'per-planet-controls': false,
  'view-mode': false,
  'birth-chart': true,
  'visual-effects': false,
  'view-presets': false,
})
```

**Change to**:
```tsx
const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
  'display-options': false,
  'per-planet-controls': false,
  'view-mode': false,
  'birth-chart': true,
  'visual-effects': false,
  'view-presets': false,
  'bottom-panel': false,  // ADD THIS LINE
})
```

### Step 2: Wrap Bottom Panel (Line ~1997)

**Current**:
```tsx
{/* Time Controls */}
<div className="glass-strong border-t border-cosmic-700/50 p-3">
  {/* ... content ... */}
</div>
```

**Change to**:
```tsx
{/* Time Controls */}
<CollapsibleSection
  id="bottom-panel"
  title="Time Controls"
  isCollapsed={collapsedSections['bottom-panel']}
  onToggle={() => setCollapsedSections(prev => ({
    ...prev,
    'bottom-panel': !prev['bottom-panel']
  }))}
>
  <div className="glass-strong border-t border-cosmic-700/50 p-3">
    {/* ... existing content ... */}
  </div>
</CollapsibleSection>
```

**Note**: The CollapsibleSection component already exists at lines 219-244.

---

## Implementation Option 2: Enhanced Collapse with Custom Header

### Create Custom Collapse Component

Add after the CollapsibleSection definition (around line 244):

```tsx
/**
 * Custom collapsible bottom panel with time controls header
 */
const BottomTimePanel: React.FC<{
  isCollapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ isCollapsed, onToggle, children }) => {
  return (
    <div className="border-t border-cosmic-700/50">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 
                   bg-glass-strong hover:bg-cosmic-800/50 
                   transition-colors text-white"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cosmic-400" />
          <h3 className="text-sm font-semibold">Time Controls</h3>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${
            isCollapsed ? '-rotate-90' : ''
          }`}
        />
      </button>
      {!isCollapsed && (
        <div className="glass-strong p-3">
          {children}
        </div>
      )}
    </div>
  )
}
```

Then use it:
```tsx
<BottomTimePanel
  isCollapsed={collapsedSections['bottom-panel']}
  onToggle={() => setCollapsedSections(prev => ({
    ...prev,
    'bottom-panel': !prev['bottom-panel']
  }))}
>
  {/* ... all existing bottom panel content ... */}
</BottomTimePanel>
```

---

## Implementation Option 3: Compact Mode (No Collapse Button)

For users who prefer compact view with less padding:

### Reduce Button Padding (Lines 2031-2065)

**Current**:
```tsx
<button
  className="px-3 py-1.5 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors"
>
```

**Change to** (save ~15px):
```tsx
<button
  className="px-2 py-1 rounded-lg border border-cosmic-700/50 bg-cosmic-900/50 text-white text-sm hover:bg-cosmic-800/50 transition-colors"
>
```

### Reduce Flex Gaps (Lines 2029, 2092)

**Current**:
```tsx
<div className="flex items-center justify-center gap-2 mb-2">
```

**Change to** (save ~4px):
```tsx
<div className="flex items-center justify-center gap-1 mb-2">
```

### Reduce Container Padding (Line 1998)

**Current**:
```tsx
<div className="glass-strong border-t border-cosmic-700/50 p-3">
```

**Change to** (save ~8px):
```tsx
<div className="glass-strong border-t border-cosmic-700/50 p-2">
```

---

## Implementation Option 4: Accordion Style

Allow only one section expanded at a time:

### Add State
```tsx
const [expandedBottomSection, setExpandedBottomSection] = useState<
  'date' | 'playback' | 'presets' | 'steps' | null
>('date')
```

### Wrap Each Section
```tsx
{/* Date/Time Display */}
<div className={`transition-all duration-200 overflow-hidden 
                 ${expandedBottomSection === 'date' ? 'max-h-96' : 'max-h-0'}`}>
  {/* existing date content */}
</div>

{/* Playback Controls */}
<div className={`transition-all duration-200 overflow-hidden 
                 ${expandedBottomSection === 'playback' ? 'max-h-96' : 'max-h-0'}`}>
  {/* existing playback content */}
</div>

{/* And so on... */}
```

---

## Required Imports

Make sure these are already imported (check line 1-50):

```tsx
import { ChevronDown, Clock } from 'lucide-react'  // Clock is new if using enhanced version
```

These should already be there, but verify.

---

## Testing After Implementation

### Test Cases
1. Click collapse button - panel should hide
2. Click again - panel should show
3. Resize window - layout should remain stable
4. Check 3D viewport - should be larger when collapsed
5. Test on mobile - button should be accessible
6. Keyboard navigation - Tab should focus collapse button

### Visual Testing
```bash
# Check the layout visually
# Collapsed state:
#   - Only header visible (~50px)
#   - 3D viewport takes 90%+ of space
#
# Expanded state:
#   - Original layout preserved
#   - All controls visible
#   - Smooth animation
```

---

## Performance Considerations

### Collapse Animation
- Uses CSS transitions (performant)
- No JavaScript calculations
- Hardware-accelerated with `transition-transform`

### State Management
- Single boolean per section
- No additional API calls
- Minimal re-renders

### Bundle Impact
- No new dependencies
- Reuses existing CollapsibleSection
- ~50 bytes of new state/logic

---

## Styling Tips

### Match Existing Design
All styling already matches the cosmic theme:
- `glass-strong` class maintains glassmorphism
- `cosmic-*` colors stay consistent
- Spacing follows Tailwind conventions

### Custom Header Styling (if using Option 2)
```tsx
className="w-full flex items-center justify-between px-4 py-2 
           bg-cosmic-900/60 hover:bg-cosmic-800/50 
           transition-colors text-white border-b border-cosmic-700/50"
```

---

## Related Code

### CollapsibleSection Component (Lines 219-244)
```tsx
const CollapsibleSection: React.FC<{
  id: string
  title: string
  isCollapsed: boolean
  onToggle: () => void
  children: React.ReactNode
}> = ({ id, title, isCollapsed, onToggle, children }) => {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 rounded-t transition-colors text-white"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
        />
      </button>
      {!isCollapsed && (
        <div className="px-4 py-3 bg-gray-900 rounded-b">
          {children}
        </div>
      )}
    </div>
  )
}
```

This is what you'll reuse!

---

## Optional Enhancements

### Persist State to localStorage
```tsx
// After state declaration
useEffect(() => {
  const saved = localStorage.getItem('cosmic-collapsed-sections')
  if (saved) {
    setCollapsedSections(JSON.parse(saved))
  }
}, [])

// When updating state
const updateCollapsed = (key: string, value: boolean) => {
  const newState = { ...collapsedSections, [key]: value }
  setCollapsedSections(newState)
  localStorage.setItem('cosmic-collapsed-sections', JSON.stringify(newState))
}
```

### Responsive Design
```tsx
// Only show collapse on small screens
<button
  className="sm:hidden"  // Hidden on small screens
  onClick={onToggle}
>
  {/* collapse button */}
</button>

// Or inverse - always show on larger screens
<div className="hidden md:block">
  {/* collapse button */}
</div>
```

---

## Rollback Plan

If you need to undo changes:

1. Remove `'bottom-panel': false` from collapsedSections state
2. Remove the CollapsibleSection wrapper
3. Keep the inner `<div className="glass-strong...">` as is
4. Delete any new component definitions

Git commands:
```bash
git diff frontend/src/features/cosmos/CosmicVisualizerPage.tsx
git checkout frontend/src/features/cosmos/CosmicVisualizerPage.tsx
```

---

## Related Files

These files work together:
- **Component**: `CosmicVisualizerPage.tsx` (main implementation)
- **Styling**: `globals.css` (glass-strong, colors)
- **Config**: `tailwind.config.js` (spacing, colors)
- **Icons**: lucide-react library (ChevronDown, Clock, etc.)

No changes needed to other files!

---

## Questions & Answers

**Q: Will collapse persist after page reload?**
A: Not unless you add localStorage (see Optional Enhancements)

**Q: What if the animation is janky?**
A: Check hardware acceleration in browser DevTools, or use `transform: scaleY` instead of `height`

**Q: Can I add a keyboard shortcut?**
A: Yes! Add to the keyboard shortcuts list around line 613

**Q: Should I hide individual sections or entire panel?**
A: Start with entire panel (Option 1), then add section-level collapse if desired

---

## Success Criteria

After implementation, you should see:
- ✅ Collapse button appears in bottom panel
- ✅ Click toggles between expanded/collapsed states
- ✅ 3D viewport grows when panel is collapsed
- ✅ All time controls work when expanded
- ✅ No console errors
- ✅ Smooth animation (no jank)
- ✅ Mobile-friendly (button accessible on touch)

---

