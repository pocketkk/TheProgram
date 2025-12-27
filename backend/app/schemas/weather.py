"""
Weather Pydantic schemas

Schemas for weather locations and data.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


# =============================================================================
# Weather Location Schemas
# =============================================================================

class WeatherLocationBase(BaseModel):
    """Base weather location schema"""
    name: str = Field(..., max_length=100, description="Display name")
    city: str = Field(..., max_length=255, description="City name")
    country: str = Field(..., max_length=10, description="Country code")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")


class WeatherLocationCreate(WeatherLocationBase):
    """Schema for creating a weather location"""
    is_primary: bool = Field(False, description="Set as primary location")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone")


class WeatherLocationUpdate(BaseModel):
    """Schema for updating a weather location"""
    name: Optional[str] = Field(None, max_length=100, description="Display name")
    is_primary: Optional[bool] = Field(None, description="Set as primary location")


class WeatherLocationResponse(WeatherLocationBase):
    """Schema for weather location response"""
    id: UUID = Field(..., description="Location ID")
    is_primary: bool = Field(..., description="Is primary location")
    timezone: Optional[str] = Field(None, description="Timezone")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class WeatherLocationListResponse(BaseModel):
    """Schema for list of weather locations"""
    locations: List[WeatherLocationResponse] = Field(..., description="List of locations")
    total: int = Field(..., description="Total location count")


# =============================================================================
# Location Search Schemas
# =============================================================================

class LocationSearchResult(BaseModel):
    """Schema for location search result"""
    name: str = Field(..., description="Location name")
    country: str = Field(..., description="Country code")
    state: Optional[str] = Field(None, description="State/province")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")


class LocationSearchResponse(BaseModel):
    """Schema for location search response"""
    results: List[LocationSearchResult] = Field(..., description="Search results")
    query: str = Field(..., description="Search query")


# =============================================================================
# Weather Data Schemas
# =============================================================================

class CurrentWeather(BaseModel):
    """Schema for current weather conditions"""
    temperature: float = Field(..., description="Temperature")
    feels_like: float = Field(..., description="Feels like temperature")
    humidity: int = Field(..., description="Humidity percentage")
    pressure: int = Field(..., description="Pressure in hPa")
    wind_speed: float = Field(..., description="Wind speed in m/s")
    wind_direction: int = Field(..., description="Wind direction in degrees")
    description: str = Field(..., description="Weather description")
    icon: str = Field(..., description="Weather icon code")
    visibility: int = Field(..., description="Visibility in meters")
    clouds: int = Field(..., description="Cloud cover percentage")
    sunrise: datetime = Field(..., description="Sunrise time")
    sunset: datetime = Field(..., description="Sunset time")


class DailyForecast(BaseModel):
    """Schema for daily forecast"""
    date: datetime = Field(..., description="Forecast date")
    temp_min: float = Field(..., description="Minimum temperature")
    temp_max: float = Field(..., description="Maximum temperature")
    description: str = Field(..., description="Weather description")
    icon: str = Field(..., description="Weather icon code")
    humidity: int = Field(..., description="Humidity percentage")
    wind_speed: float = Field(..., description="Wind speed in m/s")
    pop: float = Field(..., description="Probability of precipitation (0-1)")


class WeatherResponse(BaseModel):
    """Schema for weather data response"""
    location_name: str = Field(..., description="Location name")
    country: str = Field(..., description="Country code")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    timezone_offset: int = Field(..., description="Timezone offset in seconds")
    fetched_at: datetime = Field(..., description="When data was fetched")
    current: CurrentWeather = Field(..., description="Current conditions")
    forecast: List[DailyForecast] = Field(..., description="5-day forecast")


# =============================================================================
# API Configuration Schemas
# =============================================================================

class WeatherApiKeyRequest(BaseModel):
    """Schema for setting weather API key"""
    api_key: str = Field(..., min_length=1, description="OpenWeatherMap API key")


class WeatherApiStatusResponse(BaseModel):
    """Schema for weather API status"""
    configured: bool = Field(..., description="Whether API key is configured")
    provider: str = Field("openweathermap", description="Weather provider")
