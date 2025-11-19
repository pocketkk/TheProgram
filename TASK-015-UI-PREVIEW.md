# TASK-015: View Presets UI Preview

## Settings Panel Layout

```
┌─────────────────────────────────────────────────────┐
│  ⚙️  Settings                                    ×  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  👁️ Display Options                                │
│  □ Show Houses                                      │
│  □ Show Footprints                                  │
│  □ Footprint Connections                            │
│  □ Aspect Lines                                     │
│  □ Aspect Patterns                                  │
│  □ Sun Footprint                                    │
│  □ Sun Glow Line                                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⭐ View Presets                                    │
│                                                     │
│  ┌──────────────────┬──────────────────┐           │
│  │ ☀️ Inner Solar   │ 🔄 Outer Planets │           │
│  │   System         │                  │           │
│  └──────────────────┴──────────────────┘           │
│  ┌──────────────────┬──────────────────┐           │
│  │ ⭕ Gas Giants    │ ⭕ Ice Giants    │           │
│  └──────────────────┴──────────────────┘           │
│  ┌──────────────────┬──────────────────┐           │
│  │ 🌍 Terrestrial   │ ⭐ All Bodies    │           │
│  │   Planets        │                  │           │
│  └──────────────────┴──────────────────┘           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⭕ Per-Planet Controls    [Show All] [Hide All]   │
│                                                     │
│  Planet  Body Orbit Label Trail Footprint Glow     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Sun       ✓    ✓     ✓     ✓      ✓       ✓      │
│  Mercury   ✓    ✓     ✓     □      ✓       ✓      │
│  Venus     ✓    ✓     ✓     □      ✓       ✓      │
│  ...                                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Button States

### Inactive Button (Default)
```
┌──────────────────┐
│ 🌍 Terrestrial   │  <- Gray background (bg-gray-700)
│   Planets        │     White text
└──────────────────┘     Hover: lighter gray (bg-gray-600)
```

### Active Button (Selected)
```
┌──────────────────┐
│ ☀️ Inner Solar   │  <- Blue background (bg-blue-600)
│   System         │     White text
└──────────────────┘     Bold indicator
```

### Hover State
```
┌──────────────────┐
│ 🔄 Outer Planets │  <- Lighter background on hover
│                  │     Smooth transition
└──────────────────┘     Cursor: pointer
```

## Preset Configurations

### Inner Solar System
**Bodies Shown**: Sun, Mercury, Venus, Earth, Mars, Moon
**Icon**: ☀️ Sun
**Use Case**: Study inner rocky planets and Earth's neighborhood

### Outer Planets
**Bodies Shown**: Sun, Jupiter, Saturn, Uranus, Neptune, Pluto
**Icon**: 🔄 Orbit
**Use Case**: Focus on distant planets and their orbits

### Gas Giants
**Bodies Shown**: Sun, Jupiter, Saturn
**Icon**: ⭕ Circle
**Use Case**: Compare the two largest gas giants

### Ice Giants
**Bodies Shown**: Sun, Uranus, Neptune
**Icon**: ⭕ Circle
**Use Case**: Study the outermost ice giants

### Terrestrial Planets
**Bodies Shown**: Sun, Mercury, Venus, Earth, Mars
**Icon**: 🌍 Globe
**Use Case**: Compare all rocky planets

### All Bodies
**Bodies Shown**: All celestial bodies
**Icon**: ⭐ Star
**Use Case**: Reset to show everything

## Interaction Flow

```
User Action                      System Response
────────────────────────────────────────────────────────
1. Click "Inner Solar System"
   │
   ├─> Hide all bodies
   ├─> Show: Sun, Mercury, Venus, Earth, Mars, Moon
   ├─> Set activePreset = 'inner-system'
   ├─> Save to localStorage
   └─> Highlight button in blue

2. Click "Gas Giants"
   │
   ├─> Hide previously visible bodies
   ├─> Show: Sun, Jupiter, Saturn
   ├─> Set activePreset = 'gas-giants'
   ├─> Save to localStorage
   ├─> Remove highlight from previous button
   └─> Highlight new button in blue

3. Page Refresh
   │
   ├─> Load 'gas-giants' from localStorage
   ├─> Auto-apply Gas Giants preset
   └─> Highlight Gas Giants button
```

## Tooltip Display

When hovering over a preset button:

```
        ┌─────────────────────────────────┐
        │ Sun, Mercury, Venus, Earth, Mars│  <- Tooltip
        └─────────────────┬───────────────┘
                          │
                ┌─────────▼─────────┐
                │ ☀️ Inner Solar    │
                │   System          │
                └───────────────────┘
```

## Visual Hierarchy

1. **Section Header** (text-lg, font-semibold, white)
   - Star icon for visual identity
   - Clear section separation

2. **Button Grid** (2 columns)
   - Even spacing with gap-2
   - Responsive to container width
   - Consistent button heights

3. **Button Content** (flex layout)
   - Icon on left
   - Text on right
   - Center-aligned vertically

4. **Color Scheme**
   - Active: Blue (#2563eb) - stands out clearly
   - Inactive: Gray (#374151) - subtle but visible
   - Hover: Lighter gray (#4b5563) - interactive feedback

## Accessibility Features

- ✅ All buttons keyboard accessible (Tab navigation)
- ✅ Clear focus indicators
- ✅ Descriptive button text
- ✅ Tooltip descriptions for screen readers
- ✅ High contrast between active/inactive states
- ✅ Icon + text for visual + textual information

## Responsive Behavior

The 2-column grid automatically adjusts:
- Wide screens: Full 2-column layout
- Narrow screens: Buttons stack if needed
- Settings panel: Scrollable for overflow

## Integration with Existing Controls

The View Presets section:
- ✅ Appears BEFORE Per-Planet Controls
- ✅ Uses same styling as other sections
- ✅ Integrates with unified bodyStates
- ✅ Works alongside manual planet toggles
- ✅ Complementary to Show All/Hide All buttons

## Performance

- Button clicks: Instant response
- State updates: Single batch update
- Visual feedback: Smooth CSS transitions
- No jank or lag in preset switching
