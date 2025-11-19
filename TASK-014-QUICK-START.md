# Birth Data Editor - Quick Start Guide

## How to Use

### 1. Open the Editor

Click the **"Edit Birth Data"** button in the top-right controls section of the Birth Chart page.

### 2. Edit Date & Time

Use the date and time pickers to select your birth date and time:
- **Date Picker:** Click the calendar icon or type the date
- **Time Picker:** Click the clock icon or type the time (24-hour format)
- **Preview:** See your selection formatted below

### 3. Search for Location

Type your birth city in the location search box:
- Results appear as you type (after 300ms)
- Use arrow keys to navigate results
- Press Enter or click to select
- Coordinates update automatically

### 4. Review Changes

Check the **Chart Preview** section to verify:
- Date and time are correct
- Location name is correct
- Coordinates look reasonable

### 5. Calculate Chart

Click the **"Calculate Chart"** button (becomes enabled when data is valid and changed).

The chart will recalculate immediately with your new birth data!

---

## Features

### Validation

The editor prevents invalid data:
- ❌ Birth date cannot be in the future
- ❌ Birth date must be after 1800
- ❌ Location cannot be empty
- ❌ Coordinates must be valid ranges (-90 to +90 lat, -180 to +180 lng)

### Persistence

Your birth data is automatically saved to your browser:
- ✅ Data persists across page refreshes
- ✅ No account or login required
- ✅ Stored locally in your browser

### Keyboard Shortcuts

- **Arrow Up/Down:** Navigate location search results
- **Enter:** Select highlighted location
- **Escape:** Close location dropdown or dialog
- **Tab:** Navigate between fields

---

## Example: Changing Your Birth Data

### Current Data (Default)
- **Date:** September 16, 1974
- **Time:** 7:14 AM PDT
- **Location:** Eugene, Oregon
- **Coordinates:** 44.05°N, 123.09°W

### To Change to San Francisco
1. Click "Edit Birth Data"
2. Keep date and time (or change them)
3. Type "San Francisco" in location search
4. Select "San Francisco, California, USA" from results
5. Coordinates update to: 37.77°N, 122.42°W
6. Click "Calculate Chart"

Your chart now shows your San Francisco birth chart!

---

## Technical Details

### Location Search API

Uses **OpenStreetMap Nominatim** (free geocoding service):
- No API key required
- Searches worldwide locations
- Returns coordinates automatically
- Rate limit: 1 request/second (handled with debouncing)

### Data Storage

Birth data is stored in browser's localStorage:
```javascript
localStorage.setItem('birthData', JSON.stringify(birthData))
localStorage.setItem('birthLocationName', locationName)
```

To clear saved data:
```javascript
localStorage.removeItem('birthData')
localStorage.removeItem('birthLocationName')
```
Then refresh the page to see default data.

---

## Troubleshooting

### Location Search Not Working?

**Check your internet connection:** The search requires a network request to OpenStreetMap.

**Try different search terms:**
- ✅ "New York" (works)
- ✅ "London" (works)
- ❌ "My house" (too specific)

**Still not working?**
- Open browser console (F12)
- Look for network errors
- Check if CORS is blocking requests

### Chart Not Recalculating?

**Make sure you clicked "Calculate":** The chart only updates when you explicitly save.

**Check validation:** The "Calculate" button is disabled if:
- Data is invalid (see error messages)
- Data hasn't changed (no edits made)

### Data Not Persisting?

**Check browser settings:** Make sure localStorage is enabled.

**Private browsing:** localStorage may be disabled in private/incognito mode.

**Storage quota:** Clear some localStorage data if full.

---

## Component Architecture

```
BirthDataEditor (Dialog)
├── DateTimePicker
│   ├── Date Input (HTML5)
│   ├── Time Input (HTML5)
│   └── Preview Display
├── LocationSearch
│   ├── Search Input (debounced)
│   ├── Nominatim API Integration
│   ├── Results Dropdown
│   └── Coordinates Display
└── useBirthDataEditor Hook
    ├── State Management
    ├── Validation Logic
    └── Data Formatting
```

---

## What's Next?

### Potential Enhancements

1. **Multiple Saved Charts:** Save and switch between multiple people's charts
2. **Timezone Detection:** Auto-detect timezone from coordinates
3. **Chart Comparison:** Compare two birth charts side-by-side
4. **Export/Import:** Share birth data via JSON or URL

### Current Limitations

- No timezone detection (uses local browser timezone)
- Single saved chart (can't save multiple charts yet)
- No chart comparison features yet

These are planned for future updates!

---

## For Developers

### Component Props

**DateTimePicker:**
```typescript
interface DateTimePickerProps {
  value: Date
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  error?: string
}
```

**LocationSearch:**
```typescript
interface LocationSearchProps {
  value: string
  latitude: number
  longitude: number
  onChange: (location: LocationResult) => void
  error?: string
}
```

**BirthDataEditor:**
```typescript
interface BirthDataEditorProps {
  open: boolean
  onClose: () => void
  initialData: BirthData
  initialLocationName?: string
  onSave: (data: BirthData, locationName: string) => void
}
```

### Integration Example

```typescript
const [birthData, setBirthData] = useState<BirthData>(DEFAULT_BIRTH_DATA)
const [locationName, setLocationName] = useState('Eugene, Oregon')
const [isEditorOpen, setIsEditorOpen] = useState(false)

const handleSaveBirthData = (newData: BirthData, newLocationName: string) => {
  setBirthData(newData)
  setLocationName(newLocationName)
}

return (
  <>
    <Button onClick={() => setIsEditorOpen(true)}>
      Edit Birth Data
    </Button>

    <BirthDataEditor
      open={isEditorOpen}
      onClose={() => setIsEditorOpen(false)}
      initialData={birthData}
      initialLocationName={locationName}
      onSave={handleSaveBirthData}
    />
  </>
)
```

---

## Summary

The Birth Data Editor provides a **complete, production-ready solution** for editing birth chart data with:

- ✅ Intuitive UI
- ✅ Real-time validation
- ✅ Free geocoding API
- ✅ Persistent storage
- ✅ Keyboard accessible
- ✅ Error handling
- ✅ Mobile-friendly

**Ready to use in production!**
