"""
Weather Service

Fetches weather data from OpenWeatherMap API.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)


class WeatherServiceError(Exception):
    """Base exception for weather service errors"""
    pass


class WeatherApiError(WeatherServiceError):
    """Error from OpenWeatherMap API"""
    pass


class WeatherConfigError(WeatherServiceError):
    """Configuration error (missing API key)"""
    pass


@dataclass
class WeatherCondition:
    """Current weather conditions"""
    temperature: float  # Celsius
    feels_like: float
    humidity: int  # Percentage
    pressure: int  # hPa
    wind_speed: float  # m/s
    wind_direction: int  # Degrees
    description: str
    icon: str  # OpenWeatherMap icon code
    visibility: int  # Meters
    clouds: int  # Percentage
    sunrise: datetime
    sunset: datetime


@dataclass
class DailyForecast:
    """Daily forecast data"""
    date: datetime
    temp_min: float
    temp_max: float
    description: str
    icon: str
    humidity: int
    wind_speed: float
    pop: float  # Probability of precipitation (0-1)


@dataclass
class WeatherData:
    """Complete weather data for a location"""
    location_name: str
    country: str
    latitude: float
    longitude: float
    timezone_offset: int  # Seconds from UTC
    current: WeatherCondition
    forecast: List[DailyForecast] = field(default_factory=list)
    fetched_at: datetime = field(default_factory=datetime.utcnow)


# Simple in-memory cache
_weather_cache: Dict[str, tuple[WeatherData, datetime]] = {}
CACHE_DURATION = timedelta(minutes=30)


class WeatherService:
    """
    Service for fetching weather data from OpenWeatherMap.

    Features:
    - Current weather conditions
    - 5-day forecast
    - Location search
    - Caching to reduce API calls

    Usage:
        service = WeatherService(api_key="your-api-key")
        weather = await service.get_weather(lat=37.77, lon=-122.42)
    """

    BASE_URL = "https://api.openweathermap.org/data/2.5"
    GEO_URL = "https://api.openweathermap.org/geo/1.0"
    DEFAULT_TIMEOUT = 30.0

    def __init__(self, api_key: Optional[str] = None, timeout: float = DEFAULT_TIMEOUT):
        """Initialize weather service"""
        self.api_key = api_key
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={"User-Agent": "CosmicChronicle/1.0"}
            )
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _check_api_key(self):
        """Verify API key is configured"""
        if not self.api_key:
            raise WeatherConfigError("OpenWeatherMap API key not configured")

    def _get_cache_key(self, lat: float, lon: float) -> str:
        """Generate cache key for coordinates"""
        return f"{lat:.2f},{lon:.2f}"

    def _get_cached(self, lat: float, lon: float) -> Optional[WeatherData]:
        """Get cached weather data if valid"""
        key = self._get_cache_key(lat, lon)
        if key in _weather_cache:
            data, cached_at = _weather_cache[key]
            if datetime.utcnow() - cached_at < CACHE_DURATION:
                return data
            else:
                del _weather_cache[key]
        return None

    def _set_cache(self, lat: float, lon: float, data: WeatherData):
        """Cache weather data"""
        key = self._get_cache_key(lat, lon)
        _weather_cache[key] = (data, datetime.utcnow())

    async def search_location(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search for locations by name.

        Args:
            query: City name or location query
            limit: Maximum results

        Returns:
            List of location matches with coordinates
        """
        self._check_api_key()
        client = await self._get_client()

        try:
            response = await client.get(
                f"{self.GEO_URL}/direct",
                params={
                    "q": query,
                    "limit": limit,
                    "appid": self.api_key
                }
            )
            response.raise_for_status()
            data = response.json()

            return [
                {
                    "name": loc.get("name"),
                    "country": loc.get("country"),
                    "state": loc.get("state"),
                    "latitude": loc.get("lat"),
                    "longitude": loc.get("lon"),
                }
                for loc in data
            ]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise WeatherApiError("Invalid API key")
            raise WeatherApiError(f"API error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise WeatherApiError(f"Request failed: {str(e)}")

    async def get_weather(
        self,
        lat: float,
        lon: float,
        units: str = "metric",
        use_cache: bool = True
    ) -> WeatherData:
        """
        Get current weather and forecast for coordinates.

        Args:
            lat: Latitude
            lon: Longitude
            units: Temperature units (metric, imperial, standard)
            use_cache: Whether to use cached data

        Returns:
            WeatherData with current conditions and forecast
        """
        self._check_api_key()

        # Check cache
        if use_cache:
            cached = self._get_cached(lat, lon)
            if cached:
                return cached

        client = await self._get_client()

        try:
            # Fetch current weather and forecast in parallel
            current_task = client.get(
                f"{self.BASE_URL}/weather",
                params={
                    "lat": lat,
                    "lon": lon,
                    "units": units,
                    "appid": self.api_key
                }
            )
            forecast_task = client.get(
                f"{self.BASE_URL}/forecast",
                params={
                    "lat": lat,
                    "lon": lon,
                    "units": units,
                    "appid": self.api_key
                }
            )

            current_response, forecast_response = await asyncio.gather(
                current_task, forecast_task
            )

            current_response.raise_for_status()
            forecast_response.raise_for_status()

            current_data = current_response.json()
            forecast_data = forecast_response.json()

            # Parse current weather
            current = WeatherCondition(
                temperature=current_data["main"]["temp"],
                feels_like=current_data["main"]["feels_like"],
                humidity=current_data["main"]["humidity"],
                pressure=current_data["main"]["pressure"],
                wind_speed=current_data["wind"]["speed"],
                wind_direction=current_data["wind"].get("deg", 0),
                description=current_data["weather"][0]["description"],
                icon=current_data["weather"][0]["icon"],
                visibility=current_data.get("visibility", 10000),
                clouds=current_data["clouds"]["all"],
                sunrise=datetime.fromtimestamp(current_data["sys"]["sunrise"]),
                sunset=datetime.fromtimestamp(current_data["sys"]["sunset"]),
            )

            # Parse forecast - get daily summaries (noon forecasts)
            daily_forecasts = []
            seen_dates = set()

            for item in forecast_data["list"]:
                dt = datetime.fromtimestamp(item["dt"])
                date_str = dt.strftime("%Y-%m-%d")

                # Take noon forecast as representative for each day
                if date_str not in seen_dates and dt.hour >= 11 and dt.hour <= 14:
                    seen_dates.add(date_str)
                    daily_forecasts.append(DailyForecast(
                        date=dt,
                        temp_min=item["main"]["temp_min"],
                        temp_max=item["main"]["temp_max"],
                        description=item["weather"][0]["description"],
                        icon=item["weather"][0]["icon"],
                        humidity=item["main"]["humidity"],
                        wind_speed=item["wind"]["speed"],
                        pop=item.get("pop", 0),
                    ))

                if len(daily_forecasts) >= 5:
                    break

            # Build result
            weather_data = WeatherData(
                location_name=current_data["name"],
                country=current_data["sys"]["country"],
                latitude=lat,
                longitude=lon,
                timezone_offset=current_data["timezone"],
                current=current,
                forecast=daily_forecasts,
            )

            # Cache the result
            self._set_cache(lat, lon, weather_data)

            return weather_data

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise WeatherApiError("Invalid API key")
            raise WeatherApiError(f"API error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise WeatherApiError(f"Request failed: {str(e)}")
        except KeyError as e:
            raise WeatherApiError(f"Invalid response format: missing {e}")

    def to_dict(self, weather: WeatherData) -> Dict[str, Any]:
        """Convert WeatherData to dictionary for JSON response"""
        return {
            "location_name": weather.location_name,
            "country": weather.country,
            "latitude": weather.latitude,
            "longitude": weather.longitude,
            "timezone_offset": weather.timezone_offset,
            "fetched_at": weather.fetched_at.isoformat(),
            "current": {
                "temperature": weather.current.temperature,
                "feels_like": weather.current.feels_like,
                "humidity": weather.current.humidity,
                "pressure": weather.current.pressure,
                "wind_speed": weather.current.wind_speed,
                "wind_direction": weather.current.wind_direction,
                "description": weather.current.description,
                "icon": weather.current.icon,
                "visibility": weather.current.visibility,
                "clouds": weather.current.clouds,
                "sunrise": weather.current.sunrise.isoformat(),
                "sunset": weather.current.sunset.isoformat(),
            },
            "forecast": [
                {
                    "date": f.date.isoformat(),
                    "temp_min": f.temp_min,
                    "temp_max": f.temp_max,
                    "description": f.description,
                    "icon": f.icon,
                    "humidity": f.humidity,
                    "wind_speed": f.wind_speed,
                    "pop": f.pop,
                }
                for f in weather.forecast
            ],
        }

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Singleton instance
_weather_service: Optional[WeatherService] = None


def get_weather_service(api_key: Optional[str] = None) -> WeatherService:
    """Get weather service instance"""
    global _weather_service
    if _weather_service is None or (api_key and _weather_service.api_key != api_key):
        _weather_service = WeatherService(api_key=api_key)
    return _weather_service


async def close_weather_service():
    """Close the singleton weather service"""
    global _weather_service
    if _weather_service:
        await _weather_service.close()
        _weather_service = None
