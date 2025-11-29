# Infinite Render Loop Fix - SolarSystemScene

**Date**: November 1, 2025
**Status**: ✅ Fixed
**Time Spent**: ~20 minutes

---

## Issue

**Error Message:**
```
Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

**Location:** `SolarSystemScene` component (`frontend/src/features/cosmos/components/SolarSystemScene.tsx`)

**Symptoms:**
- Application crashed immediately after login
- Browser console showed infinite render loop error
- Multiple stack traces pointing to renderWithHooks and workLoopSync

---

## Root Causes

There were **two separate issues** causing infinite render loops:

### Issue 1: FrameCounter Component Recreation

**Problem:**
`FrameCounter` component was defined **inside** the `SolarSystemScene` component, causing it to be recreated on every render.

**Infinite Loop:**
1. `FrameCounter` defined inside `SolarSystemScene`
2. `useFrame` hook calls `setFrameCount` (60 times per second)
3. State update triggers re-render
4. Re-render creates NEW `FrameCounter` component
5. New component mounts → triggers `useFrame` → infinite loop!

**Location:** Lines 455-460 (before fix)

**Code Before:**
```typescript
export const SolarSystemScene = ({ ... }) => {
  const [frameCount, setFrameCount] = useState(0)

  // ❌ BAD: Component defined inside another component
  const FrameCounter = () => {
    useFrame(() => {
      setFrameCount(prev => prev + 1)  // Triggers re-render
    })
    return null
  }

  return (
    <Canvas>
      <FrameCounter />  {/* Re-created on every render! */}
    </Canvas>
  )
}
```

---

### Issue 2: useMemo with State Update in Body

**Problem:**
The `retrogradeStatus` `useMemo` hook had `cachedRetrogradeStatus` in its dependency array, **but also updated that same state** inside the memo body.

**Infinite Loop:**
1. `frameCount` changes (every frame, 60fps)
2. `useMemo` runs because `frameCount` is in dependencies
3. Calls `setCachedRetrogradeStatus(newStatus)` (line 295)
4. `cachedRetrogradeStatus` state updates
5. `useMemo` runs again because `cachedRetrogradeStatus` is in dependencies
6. Infinite loop!

**Location:** Lines 291-301 (before fix)

**Code Before:**
```typescript
const retrogradeStatus = useMemo(() => {
  if (frameCount % ANIMATION_CONSTANTS.RETROGRADE_CHECK_INTERVAL === 0) {
    const newStatus = getRetrogradeStatus(julianDay)
    setCachedRetrogradeStatus(newStatus)  // ❌ State update inside useMemo
    return newStatus
  }
  return cachedRetrogradeStatus  // ❌ Reading dependency inside memo
}, [julianDay, frameCount, cachedRetrogradeStatus])  // ❌ Circular dependency!
```

**Why This Causes a Loop:**
- `useMemo` should be **pure** (no side effects)
- Calling `setState` inside `useMemo` is a side effect
- Having the state you're updating in the dependencies creates a circular dependency

---

## The Fixes

### Fix 1: Move FrameCounter Outside Component

**File:** `SolarSystemScene.tsx` (lines 225-234)

**Code After:**
```typescript
/**
 * Frame counter component for retrograde throttling
 * Moved outside SolarSystemScene to prevent re-creation on every render
 */
const FrameCounter = ({ onFrame }: { onFrame: () => void }) => {
  useFrame(() => {
    onFrame()
  })
  return null
}

export const SolarSystemScene = ({ ... }) => {
  const [frameCount, setFrameCount] = useState(0)

  // ✅ GOOD: Callback wrapped in useCallback
  const incrementFrameCount = useCallback(() => {
    setFrameCount(prev => prev + 1)
  }, [])

  return (
    <Canvas>
      <FrameCounter onFrame={incrementFrameCount} />  {/* ✅ Never re-created */}
    </Canvas>
  )
}
```

**Why This Works:**
1. `FrameCounter` defined **outside** → never recreated
2. Receives callback via props (stable reference with `useCallback`)
3. Component identity stays consistent across renders
4. No infinite loop!

---

### Fix 2: Replace useMemo with useEffect

**File:** `SolarSystemScene.tsx` (lines 290-300)

**Code After:**
```typescript
// ✅ GOOD: useEffect for side effects
useEffect(() => {
  // Only recalculate on interval frames to avoid performance hit
  if (frameCount % ANIMATION_CONSTANTS.RETROGRADE_CHECK_INTERVAL === 0) {
    const newStatus = getRetrogradeStatus(julianDay)
    setCachedRetrogradeStatus(newStatus)  // ✅ State update in useEffect (correct)
  }
}, [julianDay, frameCount])  // ✅ No circular dependency

// ✅ GOOD: Just read the cached state
const retrogradeStatus = cachedRetrogradeStatus
```

**Why This Works:**
1. `useEffect` is designed for **side effects** (like calling `setState`)
2. Dependencies are only `julianDay` and `frameCount` (no circular dependency)
3. `retrogradeStatus` simply reads from state (no memo needed)
4. No infinite loop!

---

## Key Learnings

### React Hook Best Practices

#### 1. Don't Define Components Inside Components

**❌ Bad:**
```typescript
const ParentComponent = () => {
  const ChildComponent = () => {  // Re-created every render!
    return <div>Child</div>
  }
  return <ChildComponent />
}
```

**✅ Good:**
```typescript
const ChildComponent = () => {  // Defined outside
  return <div>Child</div>
}

const ParentComponent = () => {
  return <ChildComponent />
}
```

---

#### 2. Don't Call setState Inside useMemo

**❌ Bad:**
```typescript
const value = useMemo(() => {
  setState(newValue)  // Side effect in useMemo!
  return newValue
}, [dependency])
```

**✅ Good:**
```typescript
useEffect(() => {
  setState(newValue)  // Side effect in useEffect
}, [dependency])

const value = state  // Just read state
```

---

#### 3. Avoid Circular Dependencies

**❌ Bad:**
```typescript
const value = useMemo(() => {
  if (condition) {
    setState(newState)
  }
  return state  // Reading dependency
}, [state])  // Depends on state it updates!
```

**✅ Good:**
```typescript
useEffect(() => {
  if (condition) {
    setState(newState)
  }
}, [condition])  // Only depends on condition

const value = state
```

---

## React Hook Rules Reminder

### useMemo
- **Purpose:** Memoize expensive calculations
- **Should:** Return a computed value
- **Should NOT:** Have side effects (setState, API calls, etc.)
- **Dependencies:** Values used in the computation

### useEffect
- **Purpose:** Handle side effects
- **Should:** Perform side effects (setState, subscriptions, API calls)
- **Should NOT:** Return computed values for rendering
- **Dependencies:** Values that trigger the effect

### useCallback
- **Purpose:** Memoize callback functions
- **Should:** Return a stable function reference
- **Should NOT:** Have side effects (unless in the callback itself)
- **Dependencies:** Values used in the callback

---

## Testing Results

### Before Fix
```
Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
  at renderWithHooks
  at mountIndeterminateComponent
  at beginWork
```

### After Fix
- ✅ No infinite render loop
- ✅ Application loads successfully
- ✅ Frame counter works correctly (60fps)
- ✅ Retrograde detection throttled properly (every 30 frames)
- ✅ Hot reload working perfectly
- ✅ All features functional

---

## Files Modified

| File | Lines Changed | Changes Made |
|------|---------------|--------------|
| **SolarSystemScene.tsx** | ~25 | Moved FrameCounter outside, refactored useMemo to useEffect |

**Specific Changes:**

1. **Line 19:** Added `useCallback` import
2. **Lines 225-234:** Moved `FrameCounter` component definition outside `SolarSystemScene`
3. **Lines 290-300:** Replaced `useMemo` with `useEffect` for retrograde status updates
4. **Lines 466-468:** Added `useCallback` wrapper for `incrementFrameCount`
5. **Line 495:** Updated `FrameCounter` usage to pass callback

---

## Performance Impact

### Frame Counter
- **Before:** Infinite loop, application crashes
- **After:** Stable 60fps updates, no performance issues

### Retrograde Detection
- **Before:** Attempted to recalculate on every state change (infinite loop)
- **After:** Throttled to every 30 frames (~2x per second)
- **CPU Impact:** Minimal, properly throttled

---

## Prevention Strategy

### Code Review Checklist

When reviewing React components, check for:

1. **Component Nesting:**
   - [ ] No component definitions inside other components
   - [ ] All components defined at module level or imported

2. **useMemo Usage:**
   - [ ] No `setState` calls inside `useMemo`
   - [ ] No side effects in `useMemo` body
   - [ ] Dependencies don't include state being updated inside memo

3. **useEffect Usage:**
   - [ ] Side effects (setState, API calls) in `useEffect`, not `useMemo`
   - [ ] Dependencies are minimal and don't create circular loops
   - [ ] Cleanup functions for subscriptions/timers

4. **useCallback Usage:**
   - [ ] Callbacks that trigger re-renders are memoized
   - [ ] Dependencies include all values used in callback

---

## Related Documentation

- [React Hooks Rules](https://react.dev/reference/react)
- [useMemo](https://react.dev/reference/react/useMemo) - For expensive calculations
- [useEffect](https://react.dev/reference/react/useEffect) - For side effects
- [useCallback](https://react.dev/reference/react/useCallback) - For memoized callbacks

---

## Summary

**Two infinite render loops fixed:**

1. **FrameCounter Recreation**
   - Problem: Component defined inside component
   - Fix: Moved outside, passed callback via props

2. **useMemo Circular Dependency**
   - Problem: setState inside useMemo with circular dependencies
   - Fix: Replaced with useEffect for side effects

**Result:**
- ✅ Application stable
- ✅ No infinite loops
- ✅ Performance optimized
- ✅ Hot reload working
- ✅ All features functional

**Key Takeaway:**
Always define components at module level and use `useEffect` for side effects, not `useMemo`.
