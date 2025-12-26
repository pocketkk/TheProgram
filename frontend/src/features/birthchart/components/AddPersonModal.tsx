/**
 * Add Person Modal
 *
 * Modal for adding a new person to the birth chart tracker.
 * Collects birth data and relationship information.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Calendar, Clock, MapPin, Palette, Loader2, Check, AlertCircle } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import type { BirthDataCreate, RelationshipType } from '@/lib/api/birthData'
import { RELATIONSHIP_LABELS, RELATIONSHIP_TYPES } from '@/lib/api/birthData'
import { usePeopleStore } from '../stores/peopleStore'
import { PERSON_COLORS, RELATIONSHIP_COLORS } from '../constants/personColors'
import { searchLocation, getTimezone, debounce, GeocodingResult } from '@/lib/services/geocoding'

interface AddPersonModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddPersonModal = ({ isOpen, onClose }: AddPersonModalProps) => {
  const { addPerson } = usePeopleStore()

  // Form state
  const [name, setName] = useState('')
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('friend')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('12:00')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null)
  const [timezone, setTimezone] = useState('UTC')
  const [color, setColor] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  // Geocoding state
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Set default color based on relationship type
  useEffect(() => {
    if (!color) {
      setColor(RELATIONSHIP_COLORS[relationshipType])
    }
  }, [relationshipType])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setName('')
    setRelationshipType('friend')
    setBirthDate('')
    setBirthTime('12:00')
    setTimeUnknown(false)
    setLocationSearch('')
    setSelectedLocation(null)
    setTimezone('UTC')
    setColor(RELATIONSHIP_COLORS.friend)
    setNotes('')
    setSearchResults([])
    setIsSearching(false)
    setShowResults(false)
    setIsSubmitting(false)
    setError('')
  }

  // Debounced location search
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      const results = await searchLocation(query)
      setSearchResults(results)
      setIsSearching(false)
      setShowResults(true)
    }, 500),
    []
  )

  // Handle location search input
  const handleLocationSearchChange = (value: string) => {
    setLocationSearch(value)
    setSelectedLocation(null)
    if (value.length >= 3) {
      setIsSearching(true)
      performSearch(value)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }

  // Handle location selection from dropdown
  const handleLocationSelect = async (result: GeocodingResult) => {
    setSelectedLocation(result)
    setLocationSearch(result.displayName)
    setShowResults(false)

    // Fetch timezone
    const tz = await getTimezone(result.latitude, result.longitude)
    setTimezone(tz)
  }

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Please enter a name')
      return false
    }
    if (!birthDate) {
      setError('Please enter a birth date')
      return false
    }
    if (!timeUnknown && !birthTime) {
      setError('Please enter a birth time or check "Time Unknown"')
      return false
    }
    if (!selectedLocation) {
      setError('Please select a birth location')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Parse location name into city/state/country
      const locationParts = selectedLocation!.displayName.split(',').map(s => s.trim())
      const city = locationParts[0] || null
      const stateProvince = locationParts.length > 2 ? locationParts[1] : null
      const country = locationParts[locationParts.length - 1] || null

      // Create birth data
      const data: BirthDataCreate = {
        name,
        relationship_type: relationshipType,
        notes: notes.trim() || null,
        color,
        birth_date: birthDate,
        birth_time: timeUnknown ? null : `${birthTime}:00`,
        time_unknown: timeUnknown,
        latitude: selectedLocation!.latitude,
        longitude: selectedLocation!.longitude,
        timezone,
        city,
        state_province: stateProvince,
        country,
        rodden_rating: timeUnknown ? 'X' : 'A',
      }

      await addPerson(data)
      onClose()
    } catch (err) {
      console.error('Failed to add person:', err)
      setError(err instanceof Error ? err.message : 'Failed to add person. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col"
        >
          <Card className="glass-strong border-cosmic-600 flex flex-col max-h-full">
            {/* Header - Sticky */}
            <CardHeader className="sticky top-0 z-10 glass-strong border-b border-cosmic-600 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-gradient-celestial font-heading">
                  Add New Person
                </CardTitle>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-cosmic-700 transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </CardHeader>

            {/* Content - Scrollable */}
            <CardContent className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-400"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" required>
                    Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Relationship Type */}
                <div className="space-y-2">
                  <Label htmlFor="relationshipType">
                    Relationship
                  </Label>
                  <select
                    id="relationshipType"
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                    className="w-full rounded-lg border border-cosmic-600 bg-cosmic-800 px-4 py-2.5 text-white focus:border-celestial-purple focus:outline-none focus:ring-2 focus:ring-celestial-purple/50"
                    disabled={isSubmitting}
                  >
                    {RELATIONSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {RELATIONSHIP_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Birth Date Field */}
                <div className="space-y-2">
                  <Label htmlFor="birthDate" required>
                    Birth Date
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Birth Time Field */}
                <div className="space-y-2">
                  <Label htmlFor="birthTime">
                    Birth Time
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="birthTime"
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="pl-10"
                      disabled={isSubmitting || timeUnknown}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="timeUnknown"
                      checked={timeUnknown}
                      onChange={(e) => setTimeUnknown(e.target.checked)}
                      className="rounded border-cosmic-600 bg-cosmic-800 text-celestial-purple focus:ring-celestial-purple"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="timeUnknown" className="text-sm text-gray-400">
                      Time Unknown
                    </label>
                  </div>
                </div>

                {/* Location Search */}
                <div className="space-y-2 relative">
                  <Label htmlFor="location" required>
                    Birth Location
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isSearching ? (
                        <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
                      ) : selectedLocation ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <MapPin className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <Input
                      ref={searchInputRef}
                      id="location"
                      type="text"
                      placeholder="Search city, e.g., New York, USA"
                      value={locationSearch}
                      onChange={(e) => handleLocationSearchChange(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowResults(true)}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {showResults && searchResults.length > 0 && (
                      <motion.div
                        ref={resultsRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full mt-1 bg-cosmic-800 border border-cosmic-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                      >
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(result)}
                            className="w-full px-4 py-3 text-left hover:bg-cosmic-700 transition-colors border-b border-cosmic-700 last:border-b-0 focus:outline-none focus:bg-cosmic-700"
                          >
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-celestial-purple mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white font-medium truncate">
                                  {result.displayName}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {result.latitude.toFixed(4)}°, {result.longitude.toFixed(4)}°
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* No results message */}
                  {showResults && !isSearching && searchResults.length === 0 && locationSearch.length >= 3 && (
                    <div className="absolute z-20 w-full mt-1 bg-cosmic-800 border border-cosmic-600 rounded-lg shadow-xl p-4 text-center text-gray-400 text-sm">
                      No locations found. Try a different search term.
                    </div>
                  )}

                  {selectedLocation && (
                    <p className="text-xs text-green-500">
                      Timezone: {timezone}
                    </p>
                  )}
                </div>

                {/* Color Picker */}
                <div className="space-y-2">
                  <Label htmlFor="color">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <span>Color (Optional)</span>
                    </div>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PERSON_COLORS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setColor(preset.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          color === preset.value
                            ? 'border-white scale-110'
                            : 'border-transparent hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Defaults to {RELATIONSHIP_LABELS[relationshipType].toLowerCase()} color
                  </p>
                </div>

                {/* Notes Field */}
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Initial Notes (Optional)
                  </Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this person..."
                    className="w-full min-h-[80px] rounded-lg border border-cosmic-600 bg-cosmic-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-celestial-purple focus:outline-none focus:ring-2 focus:ring-celestial-purple/50 resize-y"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Footer - Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-cosmic-600">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="celestial"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Person'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default AddPersonModal
