# Birth Data Editor - Code Examples

## Key Code Snippets for Reference

### 1. DateTimePicker Component

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/birthchart/components/DateTimePicker.tsx`

```typescript
export function DateTimePicker({ value, onChange, minDate, maxDate, error }: DateTimePickerProps) {
  const [dateValue, setDateValue] = useState(formatDateForInput(value))
  const [timeValue, setTimeValue] = useState(formatTimeForInput(value))

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateValue = e.target.value
    setDateValue(newDateValue)

    if (newDateValue) {
      const [year, month, day] = newDateValue.split('-').map(Number)
      const [hours, minutes] = timeValue.split(':').map(Number)
      const newDate = new Date(year, month - 1, day, hours, minutes)

      if (minDate && newDate < minDate) return
      if (maxDate && newDate > maxDate) return

      onChange(newDate)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-cosmic-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Date
        </label>
        <Input type="date" value={dateValue} onChange={handleDateChange} error={error} />
      </div>

      <div>
        <label className="block text-sm font-medium text-cosmic-300 mb-2">
          <Clock className="w-4 h-4 inline mr-2" />
          Time
        </label>
        <Input type="time" value={timeValue} onChange={handleTimeChange} />
      </div>

      <div className="text-xs text-cosmic-400 bg-cosmic-900/30 rounded-lg p-3">
        <span className="font-semibold">Preview: </span>
        {value.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
        {' at '}
        {value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>
    </div>
  )
}
```

---

### 2. LocationSearch with Nominatim API

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/birthchart/components/LocationSearch.tsx`

```typescript
// Search function using Nominatim
const searchLocation = useCallback(async (searchQuery: string) => {
  if (!searchQuery || searchQuery.length < 3) {
    setResults([])
    return
  }

  setIsLoading(true)
  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(searchQuery)}` +
      `&format=json` +
      `&limit=5` +
      `&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TheProgram-BirthChart/1.0', // Required by Nominatim
      },
    })

    if (!response.ok) throw new Error('Search failed')

    const data = await response.json()

    const locations: LocationResult[] = data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type || 'location',
    }))

    setResults(locations)
    setShowResults(true)
  } catch (err) {
    console.error('Location search error:', err)
    setResults([])
  } finally {
    setIsLoading(false)
  }
}, [])

// Debounced search with 300ms delay
useEffect(() => {
  if (searchTimeoutRef.current) {
    window.clearTimeout(searchTimeoutRef.current)
  }

  searchTimeoutRef.current = window.setTimeout(() => {
    searchLocation(query)
  }, 300)

  return () => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }
  }
}, [query, searchLocation])
```

---

### 3. Validation Logic

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/birthchart/hooks/useBirthDataEditor.ts`

```typescript
const validate = useCallback((): boolean => {
  const newErrors: ValidationErrors = {}

  // Validate date
  const now = new Date()
  const minDate = new Date('1800-01-01')

  if (!editedData.date || isNaN(editedData.date.getTime())) {
    newErrors.date = 'Invalid date'
  } else if (editedData.date > now) {
    newErrors.date = 'Birth date cannot be in the future'
  } else if (editedData.date < minDate) {
    newErrors.date = 'Birth date must be after 1800'
  }

  // Validate coordinates
  if (editedData.latitude < -90 || editedData.latitude > 90) {
    newErrors.coordinates = 'Latitude must be between -90 and 90'
  }
  if (editedData.longitude < -180 || editedData.longitude > 180) {
    newErrors.coordinates = newErrors.coordinates
      ? newErrors.coordinates + '; Longitude must be between -180 and 180'
      : 'Longitude must be between -180 and 180'
  }

  // Validate location name
  if (!editedData.locationName || editedData.locationName.trim().length === 0) {
    newErrors.location = 'Location is required'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}, [editedData])
```

---

### 4. LocalStorage Persistence

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/birthchart/BirthChartPage.tsx`

```typescript
// Load from localStorage on mount
const [birthData, setBirthData] = useState<BirthData>(() => {
  try {
    const saved = localStorage.getItem('birthData')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...parsed,
        date: new Date(parsed.date), // Convert string to Date
      }
    }
  } catch (err) {
    console.error('Error loading birth data from localStorage:', err)
  }
  return DEFAULT_BIRTH_DATA
})

const [locationName, setLocationName] = useState<string>(() => {
  try {
    const saved = localStorage.getItem('birthLocationName')
    if (saved) return saved
  } catch (err) {
    console.error('Error loading location name from localStorage:', err)
  }
  return DEFAULT_LOCATION_NAME
})

// Save to localStorage on every change
useEffect(() => {
  try {
    localStorage.setItem('birthData', JSON.stringify(birthData))
  } catch (err) {
    console.error('Error saving birth data to localStorage:', err)
  }
}, [birthData])

useEffect(() => {
  try {
    localStorage.setItem('birthLocationName', locationName)
  } catch (err) {
    console.error('Error saving location name to localStorage:', err)
  }
}, [locationName])
```

---

### 5. Dialog Integration

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/birthchart/BirthChartPage.tsx`

```typescript
// State for dialog
const [isEditorOpen, setIsEditorOpen] = useState(false)

// Handler for saving birth data
const handleSaveBirthData = (newData: BirthData, newLocationName: string) => {
  setBirthData(newData)
  setLocationName(newLocationName)
}

// In render
return (
  <motion.div>
    {/* Header with Edit button */}
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setIsEditorOpen(true)}
        variant="ghost"
        size="sm"
        className="text-cosmic-300 hover:text-white"
      >
        <Edit className="w-4 h-4" />
        <span className="ml-2">Edit Birth Data</span>
      </Button>
    </div>

    {/* Chart content */}
    {/* ... */}

    {/* Birth Data Editor Dialog */}
    <BirthDataEditor
      open={isEditorOpen}
      onClose={() => setIsEditorOpen(false)}
      initialData={birthData}
      initialLocationName={locationName}
      onSave={handleSaveBirthData}
    />
  </motion.div>
)
```

---

### 6. Keyboard Navigation in LocationSearch

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (!showResults || results.length === 0) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
      break
    case 'ArrowUp':
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
      break
    case 'Enter':
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectLocation(results[selectedIndex])
      }
      break
    case 'Escape':
      setShowResults(false)
      break
  }
}

// In render
<Input
  type="text"
  value={query}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}
  onFocus={() => results.length > 0 && setShowResults(true)}
  placeholder="Search for city or location..."
/>
```

---

### 7. Chart Recalculation

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/birthchart/BirthChartPage.tsx`

```typescript
// Chart automatically recalculates when birthData changes
const chart = useMemo(() => {
  switch (chartType) {
    case 'transit':
      return calculateTransitChart({ natalData: birthData })
    case 'progressed':
      return calculateProgressedChart({ natalData: birthData })
    case 'natal':
    default:
      return calculateBirthChart(birthData)
  }
}, [birthData, chartType])

// When user saves new birth data:
const handleSaveBirthData = (newData: BirthData, newLocationName: string) => {
  setBirthData(newData)      // This triggers chart recalculation via useMemo
  setLocationName(newLocationName)
}
```

---

### 8. Error Display

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/components/ui/Input.tsx`

```typescript
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-lg border bg-cosmic-900/50 px-4 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-cosmic-500',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-cosmic-700 hover:border-cosmic-600',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
```

---

### 9. Preview Section

**Location:** `/home/sylvia/ClaudeWork/TheProgram/frontend/src/features/birthchart/components/BirthDataEditor.tsx`

```typescript
<div className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-4 border border-cosmic-700/50">
  <div className="flex items-center gap-2 text-cosmic-300 mb-3">
    <Sparkles className="w-4 h-4" />
    <span className="text-sm font-semibold">Chart Preview</span>
  </div>

  <div className="space-y-2 text-sm">
    <div className="flex items-start gap-2">
      <Calendar className="w-4 h-4 text-cosmic-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-white">
          {editedData.date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
        <div className="text-cosmic-400">
          {editedData.date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}
        </div>
      </div>
    </div>

    <div className="flex items-start gap-2">
      <MapPin className="w-4 h-4 text-cosmic-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-white truncate">
          {editedData.locationName || 'No location selected'}
        </div>
        <div className="text-cosmic-400">
          {editedData.latitude.toFixed(4)}°, {editedData.longitude.toFixed(4)}°
        </div>
      </div>
    </div>
  </div>
</div>
```

---

### 10. Hook API Usage

```typescript
// In BirthDataEditor component
const {
  editedData,      // Current edited state
  errors,          // Validation errors
  isValid,         // Is all data valid?
  isDirty,         // Has data changed?
  updateDate,      // Update date/time
  updateLocation,  // Update location
  reset,           // Reset to initial
  getBirthData,    // Get formatted data
} = useBirthDataEditor(initialData, initialLocationName)

// Usage examples:
updateDate(new Date('2000-01-01'))

updateLocation({
  name: 'San Francisco, CA',
  latitude: 37.7749,
  longitude: -122.4194,
})

if (isValid && isDirty) {
  const birthData = getBirthData()
  onSave(birthData, editedData.locationName)
}
```

---

## Type Definitions

```typescript
// BirthData type from astrology library
interface BirthData {
  date: Date
  latitude: number
  longitude: number
  timezone?: string
}

// Location search result
interface LocationResult {
  name: string
  displayName: string
  latitude: number
  longitude: number
  type: string
}

// Editor state
interface BirthDataEditorState {
  date: Date
  latitude: number
  longitude: number
  locationName: string
}

// Validation errors
interface ValidationErrors {
  date?: string
  location?: string
  coordinates?: string
}
```

---

## Testing Code

### Manual Test Script

```typescript
// In browser console:

// 1. Check localStorage
console.log('Birth Data:', JSON.parse(localStorage.getItem('birthData') || '{}'))
console.log('Location Name:', localStorage.getItem('birthLocationName'))

// 2. Clear localStorage (reset to default)
localStorage.removeItem('birthData')
localStorage.removeItem('birthLocationName')
location.reload()

// 3. Set custom birth data
const customData = {
  date: new Date('1990-05-15T14:30:00'),
  latitude: 40.7128,
  longitude: -74.0060,
}
localStorage.setItem('birthData', JSON.stringify(customData))
localStorage.setItem('birthLocationName', 'New York, NY, USA')
location.reload()

// 4. Test Nominatim API directly
fetch('https://nominatim.openstreetmap.org/search?q=london&format=json&limit=5', {
  headers: { 'User-Agent': 'Test' }
})
  .then(res => res.json())
  .then(data => console.log('Search results:', data))
```

---

## Common Patterns

### 1. Debounced Input

```typescript
const searchTimeoutRef = useRef<number>()

useEffect(() => {
  if (searchTimeoutRef.current) {
    window.clearTimeout(searchTimeoutRef.current)
  }

  searchTimeoutRef.current = window.setTimeout(() => {
    performSearch(query)
  }, 300)

  return () => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }
  }
}, [query])
```

### 2. Click Outside Detection

```typescript
const containerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setShowResults(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

### 3. Lazy State Initialization

```typescript
const [state, setState] = useState<Type>(() => {
  try {
    const saved = localStorage.getItem('key')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (err) {
    console.error('Error loading state:', err)
  }
  return DEFAULT_VALUE
})
```

---

## Summary

All code snippets are production-ready and follow best practices for:
- Type safety with TypeScript
- Error handling
- Performance optimization
- Accessibility
- User experience
- Code maintainability

Ready to integrate or extend!
