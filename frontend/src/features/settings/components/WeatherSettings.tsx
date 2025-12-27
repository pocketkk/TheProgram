/**
 * Weather Settings Component
 *
 * Manages OpenWeatherMap API key and saved locations.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  MapPin,
  Plus,
  Trash2,
  Star,
  Check,
  Loader2,
  AlertCircle,
  Search,
  ExternalLink
} from 'lucide-react'
import { Button, Input } from '@/components/ui'
import {
  getWeatherApiStatus,
  setWeatherApiKey,
  listLocations,
  createLocation,
  deleteLocation,
  updateLocation,
  searchLocations,
  type WeatherLocation,
  type LocationSearchResult
} from '@/lib/api/weather'

export function WeatherSettings() {
  const queryClient = useQueryClient()

  // API Key state
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  // Location search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [selectedResult, setSelectedResult] = useState<LocationSearchResult | null>(null)

  // Fetch API status
  const { data: apiStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['weather-api-status'],
    queryFn: getWeatherApiStatus
  })

  // Fetch saved locations
  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['weather-locations'],
    queryFn: listLocations,
    enabled: apiStatus?.configured === true
  })

  // Set API key mutation
  const setApiKeyMutation = useMutation({
    mutationFn: setWeatherApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather-api-status'] })
      queryClient.invalidateQueries({ queryKey: ['weather-primary'] })
      setApiKey('')
    }
  })

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather-locations'] })
      queryClient.invalidateQueries({ queryKey: ['weather-primary'] })
      setSearchQuery('')
      setSearchResults([])
      setLocationName('')
      setSelectedResult(null)
    }
  })

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather-locations'] })
      queryClient.invalidateQueries({ queryKey: ['weather-primary'] })
    }
  })

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { is_primary?: boolean } }) =>
      updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather-locations'] })
      queryClient.invalidateQueries({ queryKey: ['weather-primary'] })
    }
  })

  // Handle API key save
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setApiKeyMutation.mutate(apiKey.trim())
    }
  }

  // Handle location search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await searchLocations(searchQuery, 5)
      setSearchResults(response.results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle location selection
  const handleSelectLocation = (result: LocationSearchResult) => {
    setSelectedResult(result)
    setLocationName(result.name)
  }

  // Handle add location
  const handleAddLocation = () => {
    if (!selectedResult || !locationName.trim()) return

    createLocationMutation.mutate({
      name: locationName.trim(),
      city: selectedResult.name,
      country: selectedResult.country,
      latitude: selectedResult.latitude,
      longitude: selectedResult.longitude,
      is_primary: (locationsData?.locations.length || 0) === 0 // First location is primary
    })
  }

  // Handle set as primary
  const handleSetPrimary = (location: WeatherLocation) => {
    updateLocationMutation.mutate({
      id: location.id,
      data: { is_primary: true }
    })
  }

  // Handle delete location
  const handleDeleteLocation = (id: string) => {
    deleteLocationMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      {/* API Key Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-celestial-gold" />
            <h3 className="font-medium text-white">API Key</h3>
          </div>
          {apiStatus?.configured && (
            <span className="flex items-center gap-1 text-sm text-green-400">
              <Check className="h-4 w-4" />
              Configured
            </span>
          )}
        </div>

        <p className="text-sm text-gray-400">
          Get a free API key from{' '}
          <a
            href="https://openweathermap.org/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-celestial-gold hover:underline inline-flex items-center gap-1"
          >
            OpenWeatherMap
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>

        <div className="flex gap-2">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={apiStatus?.configured ? 'Enter new key to replace...' : 'Enter your OpenWeatherMap API key'}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? 'Hide' : 'Show'}
          </Button>
          <Button
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim() || setApiKeyMutation.isPending}
          >
            {setApiKeyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>

        {setApiKeyMutation.isError && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Failed to save API key
          </p>
        )}
      </div>

      {/* Location Management */}
      {apiStatus?.configured && (
        <div className="space-y-4 pt-4 border-t border-cosmic-light/10">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-celestial-gold" />
            <h3 className="font-medium text-white">Saved Locations</h3>
          </div>

          {/* Add new location */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a city..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search results */}
            <AnimatePresence>
              {searchResults.length > 0 && !selectedResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 p-2 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10"
                >
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-cosmic-light/10 transition-colors"
                    >
                      <div className="text-sm text-white">{result.name}</div>
                      <div className="text-xs text-gray-400">
                        {result.state && `${result.state}, `}{result.country}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Selected location form */}
              {selectedResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white">{selectedResult.name}</div>
                      <div className="text-xs text-gray-400">
                        {selectedResult.state && `${selectedResult.state}, `}{selectedResult.country}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedResult(null)
                        setLocationName('')
                      }}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder='Display name (e.g., "Home", "Work")'
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddLocation}
                      disabled={!locationName.trim() || createLocationMutation.isPending}
                    >
                      {createLocationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Saved locations list */}
          {isLoadingLocations ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-celestial-gold" />
            </div>
          ) : locationsData?.locations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No locations saved. Search and add your first location above.
            </p>
          ) : (
            <div className="space-y-2">
              {locationsData?.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 bg-cosmic-dark/30 rounded-lg border border-cosmic-light/10"
                >
                  <div className="flex items-center gap-3">
                    {location.is_primary && (
                      <Star className="h-4 w-4 text-celestial-gold fill-celestial-gold" />
                    )}
                    <div>
                      <div className="text-sm text-white font-medium">{location.name}</div>
                      <div className="text-xs text-gray-400">
                        {location.city}, {location.country}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!location.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(location)}
                        disabled={updateLocationMutation.isPending}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                      disabled={deleteLocationMutation.isPending}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WeatherSettings
