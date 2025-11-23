# TASK-015: Code Snippets Reference

Quick reference for the view presets implementation.

## Import Additions

```typescript
// Add to lucide-react imports (line 26-27)
import {
  // ... existing imports
  Sun,
  Orbit,
} from 'lucide-react'
```

## Preset Configuration

```typescript
/**
 * View preset configurations
 * Defines which bodies are visible for each preset
 */
const VIEW_PRESETS = {
  'inner-system': {
    name: 'Inner Solar System',
    description: 'Sun, Mercury, Venus, Earth, Mars',
    icon: Sun,
    bodies: ['sun', 'mercury', 'venus', 'earth', 'mars', 'moon'],
  },
  'outer-planets': {
    name: 'Outer Planets',
    description: 'Jupiter, Saturn, Uranus, Neptune, Pluto',
    icon: Orbit,
    bodies: ['sun', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'],
  },
  'gas-giants': {
    name: 'Gas Giants',
    description: 'Jupiter and Saturn',
    icon: Circle,
    bodies: ['sun', 'jupiter', 'saturn'],
  },
  'ice-giants': {
    name: 'Ice Giants',
    description: 'Uranus and Neptune',
    icon: Circle,
    bodies: ['sun', 'uranus', 'neptune'],
  },
  'terrestrial': {
    name: 'Terrestrial Planets',
    description: 'Mercury, Venus, Earth, Mars',
    icon: Globe,
    bodies: ['sun', 'mercury', 'venus', 'earth', 'mars'],
  },
  'all': {
    name: 'All Bodies',
    description: 'Show everything',
    icon: Star,
    bodies: celestialBodies.map(b => b.id),
  },
} as const
```

## State Variable

```typescript
// Add after searchQuery state (line 147)
const [activePreset, setActivePreset] = useState<string | null>(null)
```

## Apply Preset Function

```typescript
/**
 * Apply a view preset to show/hide specific bodies
 */
const applyViewPreset = (presetId: keyof typeof VIEW_PRESETS) => {
  const preset = VIEW_PRESETS[presetId]

  setBodyStates(prev => {
    const newStates = { ...prev }

    // Hide all bodies first
    Object.keys(newStates).forEach(bodyId => {
      newStates[bodyId] = {
        ...newStates[bodyId],
        visibility: {
          ...newStates[bodyId].visibility,
          body: false,
        },
      }
    })

    // Show only bodies in the preset
    preset.bodies.forEach(bodyId => {
      if (newStates[bodyId]) {
        newStates[bodyId] = {
          ...newStates[bodyId],
          visibility: {
            ...newStates[bodyId].visibility,
            body: true,
          },
        }
      }
    })

    return newStates
  })

  setActivePreset(presetId)
  localStorage.setItem('cosmic-view-preset', presetId)
}
```

## LocalStorage Persistence Hook

```typescript
// Load saved preset from localStorage on mount
useEffect(() => {
  const savedPreset = localStorage.getItem('cosmic-view-preset')
  if (savedPreset && VIEW_PRESETS[savedPreset as keyof typeof VIEW_PRESETS]) {
    applyViewPreset(savedPreset as keyof typeof VIEW_PRESETS)
  }
}, []) // Empty dependency array - only run on mount
```

## UI Component

```tsx
{/* View Presets */}
<div className="mb-6">
  <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
    <Star className="h-5 w-5" />
    View Presets
  </h3>
  <div className="grid grid-cols-2 gap-2">
    {Object.entries(VIEW_PRESETS).map(([id, preset]) => {
      const Icon = preset.icon
      return (
        <button
          key={id}
          onClick={() => applyViewPreset(id as keyof typeof VIEW_PRESETS)}
          className={`px-3 py-2 rounded text-sm transition-colors ${
            activePreset === id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title={preset.description}
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span>{preset.name}</span>
          </div>
        </button>
      )
    })}
  </div>
</div>
```

## Adding a New Preset

To add a new preset, add an entry to `VIEW_PRESETS`:

```typescript
const VIEW_PRESETS = {
  // ... existing presets ...

  'rocky-planets': {
    name: 'Rocky Planets',
    description: 'Mercury, Venus, Earth, Mars',
    icon: Globe,  // Choose an appropriate icon
    bodies: ['sun', 'mercury', 'venus', 'earth', 'mars'],
  },
} as const
```

The UI will automatically render the new preset button with no additional changes needed.

## Type Safety

The implementation is fully type-safe:

```typescript
// presetId is constrained to keys of VIEW_PRESETS
type PresetId = keyof typeof VIEW_PRESETS
// 'inner-system' | 'outer-planets' | 'gas-giants' | ...

// Calling with invalid preset ID causes TypeScript error
applyViewPreset('invalid-preset') // ❌ Type error
applyViewPreset('inner-system')   // ✅ Valid
```

## Testing the Implementation

```typescript
// Manual testing in browser console:

// Check current preset
localStorage.getItem('cosmic-view-preset')

// Set a preset manually
localStorage.setItem('cosmic-view-preset', 'gas-giants')

// Clear saved preset
localStorage.removeItem('cosmic-view-preset')

// Access presets from window (if needed for debugging)
// Note: VIEW_PRESETS is not exported, but you can access it via React DevTools
```

## Styling Classes

Active button:
```css
bg-blue-600 text-white
```

Inactive button:
```css
bg-gray-700 hover:bg-gray-600 text-white
```

Button layout:
```css
px-3 py-2 rounded text-sm transition-colors
```

Grid container:
```css
grid grid-cols-2 gap-2
```

## Integration Points

The preset system integrates with:

1. **Unified Body States** (TASK-003)
   - Uses `setBodyStates()` to update visibility
   - Respects existing state structure

2. **LocalStorage**
   - Key: `'cosmic-view-preset'`
   - Value: Preset ID string

3. **Settings Panel**
   - Positioned before Per-Planet Controls
   - Uses consistent styling

4. **Visual Feedback**
   - Active state via `activePreset` state
   - Smooth CSS transitions

## Performance Considerations

```typescript
// Efficient: Single state update per preset change
setBodyStates(prev => {
  // Batch all updates together
  const newStates = { ...prev }
  // ... modify newStates ...
  return newStates // Single re-render
})

// Inefficient (avoided):
// Multiple calls to setBodyStates would cause multiple re-renders
```

## Accessibility Attributes

```tsx
<button
  title={preset.description}  // Tooltip for screen readers
  className="..."             // Visual feedback
  onClick={...}               // Keyboard accessible
>
```

## Error Handling

```typescript
// Safe localStorage access
useEffect(() => {
  const savedPreset = localStorage.getItem('cosmic-view-preset')

  // Validate preset exists before applying
  if (savedPreset && VIEW_PRESETS[savedPreset as keyof typeof VIEW_PRESETS]) {
    applyViewPreset(savedPreset as keyof typeof VIEW_PRESETS)
  }
  // If invalid, silently ignore (no error thrown)
}, [])
```

## Future Enhancement Examples

### 1. Add Smooth Transitions

```typescript
const applyViewPreset = (presetId: keyof typeof VIEW_PRESETS) => {
  const preset = VIEW_PRESETS[presetId]

  // Phase 1: Fade out (150ms)
  setBodyStates(prev => {
    const newStates = { ...prev }
    Object.keys(newStates).forEach(bodyId => {
      if (!preset.bodies.includes(bodyId)) {
        newStates[bodyId].visibility.body = false
      }
    })
    return newStates
  })

  // Phase 2: Fade in (after delay)
  setTimeout(() => {
    setBodyStates(prev => {
      const newStates = { ...prev }
      preset.bodies.forEach(bodyId => {
        if (newStates[bodyId]) {
          newStates[bodyId].visibility.body = true
        }
      })
      return newStates
    })
  }, 150)

  setActivePreset(presetId)
}
```

### 2. Add Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
      const presets = Object.keys(VIEW_PRESETS)
      const index = parseInt(e.key) - 1
      if (presets[index]) {
        applyViewPreset(presets[index] as keyof typeof VIEW_PRESETS)
      }
    }
  }
  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [])
```

### 3. Custom Presets

```typescript
interface CustomPreset {
  name: string
  bodies: string[]
}

const [customPresets, setCustomPresets] = useState<Record<string, CustomPreset>>({})

const saveCustomPreset = (name: string, bodies: string[]) => {
  setCustomPresets(prev => ({
    ...prev,
    [name]: { name, bodies }
  }))
  localStorage.setItem('custom-presets', JSON.stringify({
    ...customPresets,
    [name]: { name, bodies }
  }))
}
```

## Common Issues and Solutions

### Issue: Preset not applying on page load
**Solution**: Check localStorage key is correct and preset ID is valid

### Issue: Active state not highlighting
**Solution**: Verify `activePreset` state is being set

### Issue: Preset switching feels slow
**Solution**: Batch state updates (already implemented)

### Issue: Button layout breaks on small screens
**Solution**: Grid already responsive with `grid-cols-2`
