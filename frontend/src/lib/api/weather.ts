/**
 * Weather API client
 *
 * Provides access to weather data and location management.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { apiClient } from './client'

// =============================================================================
// Types
// =============================================================================

export interface WeatherLocation {
  id: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
  is_primary: boolean
  timezone?: string
  created_at: string
  updated_at: string
}

export interface WeatherLocationCreate {
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
  is_primary?: boolean
  timezone?: string
}

export interface WeatherLocationUpdate {
  name?: string
  is_primary?: boolean
}

export interface WeatherLocationListResponse {
  locations: WeatherLocation[]
  total: number
}

export interface LocationSearchResult {
  name: string
  country: string
  state?: string
  latitude: number
  longitude: number
}

export interface LocationSearchResponse {
  results: LocationSearchResult[]
  query: string
}

export interface CurrentWeather {
  temperature: number
  feels_like: number
  humidity: number
  pressure: number
  wind_speed: number
  wind_direction: number
  description: string
  icon: string
  visibility: number
  clouds: number
  sunrise: string
  sunset: string
}

export interface DailyForecast {
  date: string
  temp_min: number
  temp_max: number
  description: string
  icon: string
  humidity: number
  wind_speed: number
  pop: number  // Probability of precipitation (0-1)
}

export interface WeatherResponse {
  location_name: string
  country: string
  latitude: number
  longitude: number
  timezone_offset: number
  fetched_at: string
  current: CurrentWeather
  forecast: DailyForecast[]
}

export interface WeatherApiStatus {
  configured: boolean
  provider: string
}

// =============================================================================
// API Key Management
// =============================================================================

/**
 * Check if OpenWeatherMap API key is configured
 */
export async function getWeatherApiStatus(): Promise<WeatherApiStatus> {
  const response = await apiClient.get('/chronicle/weather/api-status')
  return response.data
}

/**
 * Set OpenWeatherMap API key
 */
export async function setWeatherApiKey(apiKey: string): Promise<void> {
  await apiClient.post('/chronicle/weather/api-key', { api_key: apiKey })
}

// =============================================================================
// Location Search
// =============================================================================

/**
 * Search for locations by city name
 */
export async function searchLocations(
  query: string,
  limit: number = 5
): Promise<LocationSearchResponse> {
  const response = await apiClient.get('/chronicle/weather/search', {
    params: { query, limit }
  })
  return response.data
}

// =============================================================================
// Location Management
// =============================================================================

/**
 * Create a saved location
 */
export async function createLocation(
  data: WeatherLocationCreate
): Promise<WeatherLocation> {
  const response = await apiClient.post('/chronicle/weather/locations', data)
  return response.data
}

/**
 * List all saved locations
 */
export async function listLocations(): Promise<WeatherLocationListResponse> {
  const response = await apiClient.get('/chronicle/weather/locations')
  return response.data
}

/**
 * Get location by ID
 */
export async function getLocation(id: string): Promise<WeatherLocation> {
  const response = await apiClient.get(`/chronicle/weather/locations/${id}`)
  return response.data
}

/**
 * Update a location
 */
export async function updateLocation(
  id: string,
  data: WeatherLocationUpdate
): Promise<WeatherLocation> {
  const response = await apiClient.put(`/chronicle/weather/locations/${id}`, data)
  return response.data
}

/**
 * Delete a location
 */
export async function deleteLocation(id: string): Promise<void> {
  await apiClient.delete(`/chronicle/weather/locations/${id}`)
}

// =============================================================================
// Weather Data
// =============================================================================

/**
 * Get weather for coordinates
 */
export async function getWeather(
  lat: number,
  lon: number,
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): Promise<WeatherResponse> {
  const response = await apiClient.get('/chronicle/weather/current', {
    params: { lat, lon, units }
  })
  return response.data
}

/**
 * Get weather for a saved location
 */
export async function getWeatherForLocation(
  locationId: string,
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): Promise<WeatherResponse> {
  const response = await apiClient.get(`/chronicle/weather/location/${locationId}/current`, {
    params: { units }
  })
  return response.data
}

/**
 * Get weather for the primary location
 */
export async function getPrimaryWeather(
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): Promise<WeatherResponse> {
  const response = await apiClient.get('/chronicle/weather/primary', {
    params: { units }
  })
  return response.data
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get OpenWeatherMap icon URL
 */
export function getWeatherIconUrl(icon: string, size: '1x' | '2x' | '4x' = '2x'): string {
  const sizeMap = { '1x': '', '2x': '@2x', '4x': '@4x' }
  return `https://openweathermap.org/img/wn/${icon}${sizeMap[size]}.png`
}

/**
 * Format temperature with units
 */
export function formatTemperature(
  temp: number,
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): string {
  const rounded = Math.round(temp)
  switch (units) {
    case 'metric':
      return `${rounded}°C`
    case 'imperial':
      return `${rounded}°F`
    case 'standard':
      return `${rounded}K`
  }
}

/**
 * Get wind direction as compass point
 */
export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

/**
 * Format wind speed with units
 */
export function formatWindSpeed(
  speed: number,
  units: 'metric' | 'imperial' | 'standard' = 'metric'
): string {
  const rounded = Math.round(speed)
  switch (units) {
    case 'metric':
      return `${rounded} m/s`
    case 'imperial':
      return `${rounded} mph`
    case 'standard':
      return `${rounded} m/s`
  }
}
