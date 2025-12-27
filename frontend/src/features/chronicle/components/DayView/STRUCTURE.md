# DayView Component Structure

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Full Screen Overlay                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    DayNavigationHeader                         │  │
│  │  ← Calendar    Tuesday, January 15, 1985     ‹  ›            │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐  │  │
│  │  │                          │  │                          │  │  │
│  │  │   Cosmic Chronicle       │  │   Transit Chart Widget   │  │  │
│  │  │   (Newspaper)            │  │                          │  │  │
│  │  │                          │  │                          │  │  │
│  │  │   Main content           │  ├──────────────────────────┤  │  │
│  │  │   area for daily         │  │                          │  │  │
│  │  │   horoscope and          │  │   Journal Editor         │  │  │
│  │  │   astrological           │  │                          │  │  │
│  │  │   insights               │  │                          │  │  │
│  │  │                          │  │                          │  │  │
│  │  │                          │  │                          │  │  │
│  │  └──────────────────────────┘  └──────────────────────────┘  │  │
│  │         2/3 width                      1/3 width             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
DayViewLayout
├── ExpandTransition (animation wrapper)
│   └── backdrop (blur + dark overlay)
│   └── ExpandContent
│       └── content container
│           ├── DayNavigationHeader
│           │   ├── Back button
│           │   ├── Date display
│           │   └── Prev/Next buttons
│           │
│           └── Layout grid
│               ├── Left column (2/3)
│               │   └── {children} (Cosmic Chronicle)
│               │
│               └── ExpandSidebar (right column 1/3)
│                   ├── {transitWidget}
│                   └── {journalWidget}
```

## Animation Timeline

```
0ms     150ms    400ms    500ms    800ms
│       │        │        │        │
├───────┤        │        │        │
│ Backdrop      │        │        │
│ fade in       │        │        │
│               │        │        │
├───────────────┤────────┤        │
│               │ Content │        │
│               │ scale up│        │
│               │ (spring)│        │
│               │        │        │
│               ├────────┼────────┤
│               │        │ Sidebar│
│               │        │ slide  │
│               │        │ in     │
│               │        │        │
└───────────────┴────────┴────────┘
```

## State Flow

```
Calendar View
     │
     │ User clicks day
     ├─────────────────────────────────┐
     │                                 │
     ▼                                 │
Expanded Day View                      │
     │                                 │
     │ User actions:                   │
     │  • Escape key                   │
     │  • Backdrop click               │
     │  • Back button                  │
     └─────────────────────────────────┘
     │
     ▼
Calendar View

Navigation within Day View:
     │
     │ Left/Right arrow
     │ or Prev/Next button
     ▼
Same Expanded View, Different Date
```

## Props Flow

```
Parent Component (Calendar)
     │
     ├─ selectedDate: string
     ├─ onClose: () => void
     ├─ onNavigate: (offset: number) => void
     │
     ▼
DayViewLayout
     │
     ├─ date ────────────────────────────┐
     ├─ onClose ─────────────────────────┤
     │                                   │
     ├─ children (slot) ◄────────────────┤ CosmicChronicle
     ├─ transitWidget (slot) ◄───────────┤ TransitChartWidget
     └─ journalWidget (slot) ◄───────────┘ JournalEditor
```

## Responsive Behavior

### Desktop (lg+)
```
┌──────────────────────────┬──────────────┐
│                          │              │
│   Newspaper (2/3)        │   Sidebar    │
│                          │   (1/3)      │
│                          │              │
└──────────────────────────┴──────────────┘
```

### Mobile/Tablet (< lg)
```
┌──────────────────────────┐
│                          │
│   Newspaper              │
│   (full width)           │
│                          │
├──────────────────────────┤
│                          │
│   Transit Chart          │
│   (full width)           │
│                          │
├──────────────────────────┤
│                          │
│   Journal                │
│   (full width)           │
│                          │
└──────────────────────────┘
```
