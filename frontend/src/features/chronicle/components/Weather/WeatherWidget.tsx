/**
 * Weather Widget for Cosmic Chronicle
 *
 * Displays current weather and forecast in a compact widget.
 * Part of Cosmic Chronicle - privacy-first personal news hub.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun,
  Moon,
  Wind,
  Droplets,
  ChevronDown,
  ChevronUp,
  MapPin,
  Settings,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui'
import {
  getPrimaryWeather,
  getWeatherApiStatus,
  formatTemperature,
  getWindDirection,
  type WeatherResponse,
  type CurrentWeather,
  type DailyForecast
} from '@/lib/api/weather'

interface WeatherWidgetProps {
  onConfigureClick?: () => void
  units?: 'metric' | 'imperial' | 'standard'
  className?: string
}

/**
 * Map OpenWeatherMap icon codes to Lucide icons
 */
function getWeatherIcon(iconCode: string, size: 'sm' | 'md' | 'lg' = 'md') {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10'
  }

  const className = sizeClasses[size]

  // OpenWeatherMap icon codes:
  // 01 = clear, 02 = few clouds, 03 = scattered clouds, 04 = broken clouds
  // 09 = shower rain, 10 = rain, 11 = thunderstorm, 13 = snow, 50 = mist
  // d = day, n = night
  const code = iconCode.substring(0, 2)
  const isNight = iconCode.endsWith('n')

  switch (code) {
    case '01':
      return isNight
        ? <Moon className={`${className} text-slate-300`} />
        : <Sun className={`${className} text-yellow-400`} />
    case '02':
    case '03':
    case '04':
      return <Cloud className={`${className} text-slate-400`} />
    case '09':
    case '10':
      return <CloudRain className={`${className} text-blue-400`} />
    case '11':
      return <CloudLightning className={`${className} text-purple-400`} />
    case '13':
      return <CloudSnow className={`${className} text-blue-200`} />
    case '50':
      return <Cloud className={`${className} text-slate-500`} />
    default:
      return <Cloud className={`${className} text-slate-400`} />
  }
}

/**
 * Format date for forecast display
 */
function formatForecastDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  }

  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export function WeatherWidget({
  onConfigureClick,
  units = 'metric',
  className = ''
}: WeatherWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Check if API is configured
  const { data: apiStatus, isLoading: isCheckingApi } = useQuery({
    queryKey: ['weather-api-status'],
    queryFn: getWeatherApiStatus,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Fetch weather only if API is configured
  const {
    data: weather,
    isLoading: isLoadingWeather,
    error: weatherError
  } = useQuery({
    queryKey: ['weather-primary', units],
    queryFn: () => getPrimaryWeather(units),
    enabled: apiStatus?.configured === true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  })

  // Show loading state
  if (isCheckingApi || isLoadingWeather) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 glass-subtle rounded-lg ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-celestial-gold" />
        <span className="text-sm text-gray-400">Loading weather...</span>
      </div>
    )
  }

  // Show configure prompt if API not set up
  if (!apiStatus?.configured) {
    return (
      <button
        onClick={onConfigureClick}
        className={`flex items-center gap-2 px-3 py-2 glass-subtle rounded-lg hover:bg-cosmic-light/10 transition-colors ${className}`}
      >
        <Settings className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-400">Set up weather</span>
      </button>
    )
  }

  // Show error state
  if (weatherError || !weather) {
    const errorMessage = (weatherError as Error)?.message || 'Weather unavailable'
    const isPrimaryNotSet = errorMessage.includes('No primary location')

    return (
      <button
        onClick={onConfigureClick}
        className={`flex items-center gap-2 px-3 py-2 glass-subtle rounded-lg hover:bg-cosmic-light/10 transition-colors ${className}`}
      >
        {isPrimaryNotSet ? (
          <>
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-400">Add location</span>
          </>
        ) : (
          <>
            <span title={errorMessage}>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </span>
            <span className="text-sm text-gray-400">Weather error</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Compact weather display */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 px-3 py-2 glass-subtle rounded-lg hover:bg-cosmic-light/10 transition-colors"
      >
        {/* Weather icon */}
        {getWeatherIcon(weather.current.icon, 'md')}

        {/* Temperature */}
        <span className="text-lg font-semibold text-white">
          {formatTemperature(weather.current.temperature, units)}
        </span>

        {/* Location */}
        <span className="text-sm text-gray-400 hidden sm:inline">
          {weather.location_name}
        </span>

        {/* Expand indicator */}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Expanded forecast panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 z-50 w-72 glass-card rounded-xl border border-cosmic-light/20 shadow-xl"
          >
            {/* Current conditions */}
            <div className="p-4 border-b border-cosmic-light/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-celestial-gold" />
                    <span className="text-white font-medium">{weather.location_name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {weather.current.description}
                  </p>
                </div>
                {getWeatherIcon(weather.current.icon, 'lg')}
              </div>

              {/* Temperature */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-white">
                  {formatTemperature(weather.current.temperature, units)}
                </span>
                <span className="text-sm text-gray-400">
                  Feels like {formatTemperature(weather.current.feels_like, units)}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300">{weather.current.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-slate-400" />
                  <span className="text-gray-300">
                    {Math.round(weather.current.wind_speed)} m/s {getWindDirection(weather.current.wind_direction)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5-day forecast */}
            <div className="p-4">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                5-Day Forecast
              </h4>
              <div className="space-y-2">
                {weather.forecast.slice(0, 5).map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-gray-300 w-16">
                      {formatForecastDate(day.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      {getWeatherIcon(day.icon, 'sm')}
                      {day.pop > 0.1 && (
                        <span className="text-xs text-blue-400">
                          {Math.round(day.pop * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-right">
                      <span className="text-white font-medium">
                        {Math.round(day.temp_max)}°
                      </span>
                      <span className="text-gray-500 ml-1">
                        {Math.round(day.temp_min)}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Settings link */}
            <div className="px-4 pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onConfigureClick}
                className="w-full text-gray-400 hover:text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Weather Settings
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  )
}

export default WeatherWidget
