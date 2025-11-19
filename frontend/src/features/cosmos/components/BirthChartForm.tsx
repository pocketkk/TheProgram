/**
 * Birth Chart Input Form
 * Allows users to input birth data and create natal charts
 * Features automatic geocoding for location search
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Loader2, Check } from 'lucide-react'
import { createBirthChart, saveBirthChart, setActiveChartId, BirthLocation } from '../../../lib/astronomy/birthChart'
import { searchLocation, getTimezone, debounce, GeocodingResult } from '../../../lib/services/geocoding'

interface BirthChartFormProps {
  onClose: () => void
  onChartCreated: (chartId: string) => void
}

export const BirthChartForm: React.FC<BirthChartFormProps> = ({ onClose, onChartCreated }) => {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('12:00:00')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationName, setLocationName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Geocoding state
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null)
  const [useCustomCoordinates, setUseCustomCoordinates] = useState(false)

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
    setLocationName(result.displayName)
    setLatitude(result.latitude.toString())
    setLongitude(result.longitude.toString())
    setShowResults(false)

    // Fetch timezone
    const tz = await getTimezone(result.latitude, result.longitude)
    setTimezone(tz)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!birthDate) {
      newErrors.birthDate = 'Birth date is required'
    }

    if (!birthTime) {
      newErrors.birthTime = 'Birth time is required'
    }

    if (!locationName.trim()) {
      newErrors.locationName = 'Location is required'
    }

    const lat = parseFloat(latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = 'Latitude must be between -90 and 90'
    }

    const lon = parseFloat(longitude)
    if (isNaN(lon) || lon < -180 || lon > 180) {
      newErrors.longitude = 'Longitude must be between -180 and 180'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const location: BirthLocation = {
      name: locationName,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timezone,
    }

    const date = new Date(birthDate)
    const chart = createBirthChart(name, date, birthTime, location, notes)

    saveBirthChart(chart)
    setActiveChartId(chart.id)
    onChartCreated(chart.id)
    onClose()
  }

  const inputClassName = (fieldName: string) =>
    `w-full px-3 py-2 bg-slate-700 border ${
      errors[fieldName] ? 'border-red-500' : 'border-slate-600'
    } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
        style={{ isolation: 'isolate' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Create Birth Chart</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Chart Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                Chart Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe, My Birth Chart"
                className={inputClassName('name')}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Birth Date & Time */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-slate-300 mb-2">
                    Birth Date *
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={inputClassName('birthDate')}
                  />
                  {errors.birthDate && <p className="mt-1 text-sm text-red-500">{errors.birthDate}</p>}
                </div>

                <div>
                  <label htmlFor="birthTime" className="block text-sm font-medium text-slate-300 mb-2">
                    Birth Time *
                    <span className="text-xs text-slate-400 ml-2 font-normal">(HH:MM:SS)</span>
                  </label>
                  <input
                    id="birthTime"
                    type="time"
                    step="1"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className={inputClassName('birthTime')}
                  />
                  {errors.birthTime && <p className="mt-1 text-sm text-red-500">{errors.birthTime}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    Precise time improves house and angle calculations
                  </p>
                </div>
              </div>
            </div>

            {/* Location Search with Autocomplete */}
            <div className="relative">
              <label htmlFor="locationSearch" className="block text-sm font-medium text-slate-300 mb-2">
                Birth Location *
                <span className="text-xs text-slate-400 ml-2">
                  (Type city, state, country)
                </span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                  ) : selectedLocation ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <MapPin className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <input
                  ref={searchInputRef}
                  id="locationSearch"
                  type="text"
                  value={locationSearch}
                  onChange={(e) => handleLocationSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  placeholder="e.g., New York, USA or London, UK"
                  className={`w-full pl-10 pr-3 py-2 bg-slate-700 border ${
                    errors.locationName ? 'border-red-500' : 'border-slate-600'
                  } rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div
                  ref={resultsRef}
                  className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                >
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleLocationSelect(result)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-600 transition-colors border-b border-slate-600 last:border-b-0 focus:outline-none focus:bg-slate-600"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium truncate">
                            {result.displayName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {result.latitude.toFixed(4)}°, {result.longitude.toFixed(4)}°
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showResults && !isSearching && searchResults.length === 0 && locationSearch.length >= 3 && (
                <div
                  ref={resultsRef}
                  className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl p-4 text-center text-slate-400 text-sm"
                >
                  No locations found. Try a different search term.
                </div>
              )}

              {errors.locationName && <p className="mt-1 text-sm text-red-500">{errors.locationName}</p>}
            </div>

            {/* Coordinates - Auto-populated or Manual */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Coordinates *
                  {selectedLocation && (
                    <span className="text-xs text-green-500 ml-2">
                      ✓ Auto-filled from location
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomCoordinates(!useCustomCoordinates)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {useCustomCoordinates ? '← Use auto-filled' : 'Edit manually →'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="latitude" className="block text-xs text-slate-400 mb-1">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="40.7128"
                    readOnly={!useCustomCoordinates && selectedLocation !== null}
                    className={`${inputClassName('latitude')} ${
                      !useCustomCoordinates && selectedLocation !== null
                        ? 'bg-slate-800 cursor-not-allowed'
                        : ''
                    }`}
                  />
                  {errors.latitude && <p className="mt-1 text-sm text-red-500">{errors.latitude}</p>}
                </div>

                <div>
                  <label htmlFor="longitude" className="block text-xs text-slate-400 mb-1">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-74.0060"
                    readOnly={!useCustomCoordinates && selectedLocation !== null}
                    className={`${inputClassName('longitude')} ${
                      !useCustomCoordinates && selectedLocation !== null
                        ? 'bg-slate-800 cursor-not-allowed'
                        : ''
                    }`}
                  />
                  {errors.longitude && <p className="mt-1 text-sm text-red-500">{errors.longitude}</p>}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Latitude: -90 to +90 | Longitude: -180 to +180
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-slate-300 mb-2">
                Timezone
                {selectedLocation && timezone !== 'UTC' && (
                  <span className="text-xs text-green-500 ml-2">
                    ✓ Auto-detected
                  </span>
                )}
              </label>
              <input
                id="timezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g., America/New_York, Europe/London"
                className={inputClassName('timezone')}
              />
              <p className="mt-1 text-xs text-slate-400">
                IANA timezone format (auto-detected from coordinates)
              </p>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this chart..."
                rows={3}
                className={inputClassName('notes')}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
              >
                Create Chart
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
