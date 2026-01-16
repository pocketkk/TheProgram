/**
 * Onboarding Page
 *
 * Shown after authentication when user has no birth data.
 * Collects birth information and creates their natal chart.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Calendar, Clock, MapPin, Loader2, Check, AlertCircle, User } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { createBirthData } from '@/lib/api/birthData'
import { calculateChart } from '@/lib/api/charts'
import { searchLocation, getTimezone, debounce, GeocodingResult } from '@/lib/services/geocoding'
import { useUserProfileStore } from '@/store/userProfileStore'

interface OnboardingPageProps {
  onComplete: () => void
}

export const OnboardingPage = ({ onComplete }: OnboardingPageProps) => {
  const { setProfile } = useUserProfileStore()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('12:00')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null)
  const [timezone, setTimezone] = useState('UTC')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'calculating'>('form')

  // Geocoding state
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

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
      setError('Please enter your name')
      return false
    }
    if (!birthDate) {
      setError('Please enter your birth date')
      return false
    }
    if (!timeUnknown && !birthTime) {
      setError('Please enter your birth time or check "Time unknown"')
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
    setStep('calculating')

    try {
      // Parse location name into city/state/country
      const locationParts = selectedLocation!.displayName.split(',').map(s => s.trim())
      const city = locationParts[0] || null
      const stateProvince = locationParts.length > 2 ? locationParts[1] : null
      const country = locationParts[locationParts.length - 1] || null

      // Create birth data - mark as primary (user's own chart)
      const birthData = await createBirthData({
        name,  // Store user's name with their birth data
        is_primary: true,  // This is the user's own chart
        birth_date: birthDate,
        birth_time: timeUnknown ? null : `${birthTime}:00`,
        time_unknown: timeUnknown,
        latitude: selectedLocation!.latitude,
        longitude: selectedLocation!.longitude,
        timezone: timezone,
        city,
        state_province: stateProvince,
        country,
        rodden_rating: timeUnknown ? 'X' : 'A',
      })

      // Calculate natal chart
      const chart = await calculateChart({
        birth_data_id: birthData.id,
        chart_name: `${name}'s Birth Chart`,
        chart_type: 'natal',
        astro_system: 'western',
        house_system: 'placidus',
        zodiac_type: 'tropical',
      })

      // Save to profile store (persisted to localStorage automatically)
      setProfile({
        name,
        birthDataId: birthData.id,
        birthDate: birthDate,
        birthTime: timeUnknown ? null : `${birthTime}:00`,
        birthLocation: selectedLocation!.displayName,
        latitude: selectedLocation!.latitude,
        longitude: selectedLocation!.longitude,
        timezone: timezone,
        chartId: chart.id,
      })

      // Also store for backward compatibility with existing components
      localStorage.setItem('userName', name)
      localStorage.setItem('lastViewedChartId', chart.id)
      localStorage.setItem('primaryBirthDataId', birthData.id)
      localStorage.setItem('birthData', JSON.stringify({
        date: new Date(`${birthDate}T${timeUnknown ? '12:00' : birthTime}:00`),
        latitude: selectedLocation!.latitude,
        longitude: selectedLocation!.longitude,
      }))
      localStorage.setItem('birthLocationName', selectedLocation!.displayName)

      // Complete onboarding
      onComplete()
    } catch (err) {
      console.error('Onboarding failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to create your chart. Please try again.')
      setStep('form')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show calculating animation
  if (step === 'calculating') {
    return (
      <div className="min-h-screen cosmic-bg relative overflow-hidden flex items-center justify-center">
        <div className="starfield" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-6"
          >
            <Sparkles className="h-16 w-16 text-celestial-gold" />
          </motion.div>
          <h2 className="text-2xl font-heading text-gradient-celestial mb-4">
            Creating Your Birth Chart
          </h2>
          <p className="text-gray-400">
            Calculating planetary positions...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg relative overflow-hidden flex items-center justify-center py-8">
      {/* Starfield background */}
      <div className="starfield" />

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-celestial-purple"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Onboarding Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg px-4"
      >
        <Card className="border-cosmic-600">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="mb-4 flex justify-center"
            >
              <div className="rounded-full bg-gradient-to-br from-celestial-gold to-celestial-pink p-4">
                <Sparkles className="h-8 w-8 text-cosmic-950" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl text-gradient-celestial font-heading">
              Let's Create Your Chart
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Enter your birth information to generate your natal chart
            </CardDescription>
          </CardHeader>

          <CardContent>
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
                  Your Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
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
                    I don't know my birth time
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Accurate birth time gives more precise house and rising sign calculations
                </p>
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
                      {searchResults.map((result) => (
                        <button
                          key={`${result.displayName}-${result.latitude}-${result.longitude}`}
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

              {/* Submit Button */}
              <Button
                type="submit"
                variant="celestial"
                className="w-full"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Chart...' : 'Create My Birth Chart'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-sm text-gray-500"
        >
          Your data is stored locally and never shared with external servers
        </motion.p>
      </motion.div>
    </div>
  )
}

export default OnboardingPage
