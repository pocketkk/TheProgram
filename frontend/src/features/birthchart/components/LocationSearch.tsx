/**
 * LocationSearch Component
 * Autocomplete location search using OpenStreetMap Nominatim API
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface LocationResult {
  name: string
  displayName: string
  latitude: number
  longitude: number
  type: string // city, town, village, etc.
}

export interface LocationSearchProps {
  value: string
  latitude: number
  longitude: number
  onChange: (location: LocationResult) => void
  error?: string
}

export function LocationSearch({ value, latitude, longitude, onChange, error }: LocationSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<LocationResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchTimeoutRef = useRef<number>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search locations using Nominatim API
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
          'User-Agent': 'TheProgram-BirthChart/1.0', // Nominatim requires User-Agent
        },
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

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

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      searchLocation(query)
    }, 300) // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, searchLocation])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setSelectedIndex(-1)
  }

  const handleSelectLocation = (location: LocationResult) => {
    setQuery(location.displayName)
    setShowResults(false)
    onChange(location)
  }

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

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-cosmic-300 mb-2">
        <MapPin className="w-4 h-4 inline mr-2" />
        Location
      </label>

      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search for city or location..."
          error={error}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-cosmic-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-cosmic-400" />
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-cosmic-900 border border-cosmic-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((location, index) => (
            <button
              key={`${location.latitude}-${location.longitude}`}
              onClick={() => handleSelectLocation(location)}
              className={cn(
                'w-full text-left px-4 py-3 transition-colors border-b border-cosmic-800 last:border-b-0',
                'hover:bg-cosmic-800/50',
                selectedIndex === index && 'bg-cosmic-800/70'
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-cosmic-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{location.name}</div>
                  <div className="text-xs text-cosmic-400 truncate">
                    {location.displayName}
                  </div>
                  <div className="text-xs text-cosmic-500 mt-1">
                    {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && !isLoading && query.length >= 3 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-cosmic-900 border border-cosmic-700 rounded-lg shadow-xl p-4 text-center text-cosmic-400 text-sm">
          No locations found. Try a different search term.
        </div>
      )}

      {/* Current Coordinates Display */}
      <div className="mt-2 text-xs text-cosmic-400 bg-cosmic-900/30 rounded-lg p-3 border border-cosmic-800">
        <span className="font-semibold">Coordinates: </span>
        {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
      </div>
    </div>
  )
}
