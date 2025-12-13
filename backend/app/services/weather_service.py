"""
Historical Weather Service

Fetches historical weather data using the free Open-Meteo Archive API.
Provides weather conditions for any date from 1940 to present.
"""
import asyncio
import logging
from datetime import date, datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


class WeatherServiceError(Exception):
    """Base exception for weather service errors"""
    pass


class WeatherFetchError(WeatherServiceError):
    """Raised when weather fetching fails"""
    pass


@dataclass
class HistoricalWeather:
    """Historical weather data for a specific date and location"""
    date: str  # YYYY-MM-DD
    location_name: Optional[str]
    latitude: float
    longitude: float
    timezone: str

    # Daily values
    temperature_max: Optional[float]  # Celsius
    temperature_min: Optional[float]  # Celsius
    temperature_mean: Optional[float]  # Celsius
    precipitation_sum: Optional[float]  # mm
    rain_sum: Optional[float]  # mm
    snowfall_sum: Optional[float]  # cm
    wind_speed_max: Optional[float]  # km/h
    wind_gusts_max: Optional[float]  # km/h
    wind_direction_dominant: Optional[int]  # degrees

    # Weather description
    weather_code: Optional[int]
    weather_description: Optional[str]

    # Sunrise/sunset (local time)
    sunrise: Optional[str]
    sunset: Optional[str]

    # UV Index (available from 2004)
    uv_index_max: Optional[float]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "location": {
                "name": self.location_name,
                "latitude": self.latitude,
                "longitude": self.longitude,
                "timezone": self.timezone
            },
            "temperature": {
                "max_c": self.temperature_max,
                "min_c": self.temperature_min,
                "mean_c": self.temperature_mean,
                "max_f": self._c_to_f(self.temperature_max),
                "min_f": self._c_to_f(self.temperature_min),
                "mean_f": self._c_to_f(self.temperature_mean)
            },
            "precipitation": {
                "total_mm": self.precipitation_sum,
                "rain_mm": self.rain_sum,
                "snowfall_cm": self.snowfall_sum
            },
            "wind": {
                "speed_max_kmh": self.wind_speed_max,
                "gusts_max_kmh": self.wind_gusts_max,
                "direction_degrees": self.wind_direction_dominant,
                "direction_cardinal": self._degrees_to_cardinal(self.wind_direction_dominant)
            },
            "weather": {
                "code": self.weather_code,
                "description": self.weather_description
            },
            "sun": {
                "sunrise": self.sunrise,
                "sunset": self.sunset
            },
            "uv_index_max": self.uv_index_max
        }

    def _c_to_f(self, celsius: Optional[float]) -> Optional[float]:
        """Convert Celsius to Fahrenheit"""
        if celsius is None:
            return None
        return round(celsius * 9/5 + 32, 1)

    def _degrees_to_cardinal(self, degrees: Optional[int]) -> Optional[str]:
        """Convert wind direction degrees to cardinal direction"""
        if degrees is None:
            return None
        directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        index = round(degrees / 22.5) % 16
        return directions[index]

    def to_newspaper_summary(self) -> str:
        """Generate a newspaper-style weather summary"""
        parts = []

        # Temperature
        if self.temperature_max is not None and self.temperature_min is not None:
            max_f = self._c_to_f(self.temperature_max)
            min_f = self._c_to_f(self.temperature_min)
            parts.append(f"High of {max_f}°F ({self.temperature_max}°C), low of {min_f}°F ({self.temperature_min}°C)")

        # Weather condition
        if self.weather_description:
            parts.append(self.weather_description)

        # Precipitation
        if self.precipitation_sum and self.precipitation_sum > 0:
            if self.snowfall_sum and self.snowfall_sum > 0:
                parts.append(f"{self.snowfall_sum} cm of snow")
            elif self.rain_sum and self.rain_sum > 0:
                parts.append(f"{self.rain_sum} mm of rain")
            else:
                parts.append(f"{self.precipitation_sum} mm precipitation")

        # Wind
        if self.wind_speed_max and self.wind_speed_max > 20:
            cardinal = self._degrees_to_cardinal(self.wind_direction_dominant) or ""
            parts.append(f"Winds {cardinal} at {self.wind_speed_max} km/h")

        return ". ".join(parts) if parts else "Weather data unavailable"


# WMO Weather Codes to descriptions
WMO_WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}


class WeatherService:
    """
    Historical weather service using Open-Meteo Archive API.

    Open-Meteo is free for non-commercial use and provides:
    - Historical data from 1940 to present
    - No API key required
    - 10,000 requests per day limit

    Coverage:
    - Global coverage with 25km resolution (ERA5)
    - More recent data has higher resolution

    Usage:
        service = WeatherService()
        weather = await service.get_historical_weather(
            latitude=40.7128,
            longitude=-74.0060,
            date="1969-07-20",
            location_name="New York, NY"
        )
    """

    BASE_URL = "https://archive-api.open-meteo.com/v1/archive"
    EARLIEST_DATE = date(1940, 1, 1)

    def __init__(self, timeout: float = 30.0):
        """
        Initialize weather service.

        Args:
            timeout: HTTP request timeout in seconds
        """
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={"User-Agent": "TheProgram/1.0 (Cosmic Paper Weather)"}
            )
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get_historical_weather(
        self,
        latitude: float,
        longitude: float,
        target_date: str,
        location_name: Optional[str] = None
    ) -> HistoricalWeather:
        """
        Get historical weather for a specific date and location.

        Args:
            latitude: Location latitude
            longitude: Location longitude
            target_date: Date in YYYY-MM-DD format
            location_name: Optional human-readable location name

        Returns:
            HistoricalWeather object

        Raises:
            WeatherFetchError: If weather data cannot be fetched
        """
        # Validate date
        try:
            dt = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            raise WeatherFetchError(f"Invalid date format: {target_date}")

        if dt < self.EARLIEST_DATE:
            raise WeatherFetchError(f"Weather data not available before {self.EARLIEST_DATE}")

        if dt > date.today():
            raise WeatherFetchError("Cannot get weather for future dates")

        # Build API request
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": target_date,
            "end_date": target_date,
            "daily": ",".join([
                "temperature_2m_max",
                "temperature_2m_min",
                "temperature_2m_mean",
                "precipitation_sum",
                "rain_sum",
                "snowfall_sum",
                "wind_speed_10m_max",
                "wind_gusts_10m_max",
                "wind_direction_10m_dominant",
                "weather_code",
                "sunrise",
                "sunset",
                "uv_index_max"
            ]),
            "timezone": "auto"
        }

        try:
            client = await self._get_client()
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            # Parse response
            daily = data.get("daily", {})
            timezone = data.get("timezone", "UTC")

            # Get weather code description
            weather_code = daily.get("weather_code", [None])[0]
            weather_desc = WMO_WEATHER_CODES.get(weather_code) if weather_code else None

            return HistoricalWeather(
                date=target_date,
                location_name=location_name,
                latitude=latitude,
                longitude=longitude,
                timezone=timezone,
                temperature_max=daily.get("temperature_2m_max", [None])[0],
                temperature_min=daily.get("temperature_2m_min", [None])[0],
                temperature_mean=daily.get("temperature_2m_mean", [None])[0],
                precipitation_sum=daily.get("precipitation_sum", [None])[0],
                rain_sum=daily.get("rain_sum", [None])[0],
                snowfall_sum=daily.get("snowfall_sum", [None])[0],
                wind_speed_max=daily.get("wind_speed_10m_max", [None])[0],
                wind_gusts_max=daily.get("wind_gusts_10m_max", [None])[0],
                wind_direction_dominant=daily.get("wind_direction_10m_dominant", [None])[0],
                weather_code=weather_code,
                weather_description=weather_desc,
                sunrise=daily.get("sunrise", [None])[0],
                sunset=daily.get("sunset", [None])[0],
                uv_index_max=daily.get("uv_index_max", [None])[0]
            )

        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            logger.error(f"Weather fetch error: {error_msg}")
            raise WeatherFetchError(error_msg)
        except httpx.RequestError as e:
            error_msg = f"Request failed: {str(e)}"
            logger.error(f"Weather fetch error: {error_msg}")
            raise WeatherFetchError(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"Weather error: {error_msg}")
            raise WeatherFetchError(error_msg)

    async def get_weather_range(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
        location_name: Optional[str] = None
    ) -> List[HistoricalWeather]:
        """
        Get historical weather for a date range.

        Args:
            latitude: Location latitude
            longitude: Location longitude
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            location_name: Optional human-readable location name

        Returns:
            List of HistoricalWeather objects

        Note:
            For ranges longer than 30 days, consider batching requests
            to avoid timeout issues.
        """
        # Build API request for range
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": ",".join([
                "temperature_2m_max",
                "temperature_2m_min",
                "temperature_2m_mean",
                "precipitation_sum",
                "rain_sum",
                "snowfall_sum",
                "wind_speed_10m_max",
                "wind_gusts_10m_max",
                "wind_direction_10m_dominant",
                "weather_code",
                "sunrise",
                "sunset",
                "uv_index_max"
            ]),
            "timezone": "auto"
        }

        try:
            client = await self._get_client()
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            # Parse response
            daily = data.get("daily", {})
            timezone = data.get("timezone", "UTC")
            dates = daily.get("time", [])

            results = []
            for i, date_str in enumerate(dates):
                weather_code = daily.get("weather_code", [])[i] if i < len(daily.get("weather_code", [])) else None
                weather_desc = WMO_WEATHER_CODES.get(weather_code) if weather_code else None

                results.append(HistoricalWeather(
                    date=date_str,
                    location_name=location_name,
                    latitude=latitude,
                    longitude=longitude,
                    timezone=timezone,
                    temperature_max=daily.get("temperature_2m_max", [])[i] if i < len(daily.get("temperature_2m_max", [])) else None,
                    temperature_min=daily.get("temperature_2m_min", [])[i] if i < len(daily.get("temperature_2m_min", [])) else None,
                    temperature_mean=daily.get("temperature_2m_mean", [])[i] if i < len(daily.get("temperature_2m_mean", [])) else None,
                    precipitation_sum=daily.get("precipitation_sum", [])[i] if i < len(daily.get("precipitation_sum", [])) else None,
                    rain_sum=daily.get("rain_sum", [])[i] if i < len(daily.get("rain_sum", [])) else None,
                    snowfall_sum=daily.get("snowfall_sum", [])[i] if i < len(daily.get("snowfall_sum", [])) else None,
                    wind_speed_max=daily.get("wind_speed_10m_max", [])[i] if i < len(daily.get("wind_speed_10m_max", [])) else None,
                    wind_gusts_max=daily.get("wind_gusts_10m_max", [])[i] if i < len(daily.get("wind_gusts_10m_max", [])) else None,
                    wind_direction_dominant=daily.get("wind_direction_10m_dominant", [])[i] if i < len(daily.get("wind_direction_10m_dominant", [])) else None,
                    weather_code=weather_code,
                    weather_description=weather_desc,
                    sunrise=daily.get("sunrise", [])[i] if i < len(daily.get("sunrise", [])) else None,
                    sunset=daily.get("sunset", [])[i] if i < len(daily.get("sunset", [])) else None,
                    uv_index_max=daily.get("uv_index_max", [])[i] if i < len(daily.get("uv_index_max", [])) else None
                ))

            return results

        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
            logger.error(f"Weather range fetch error: {error_msg}")
            raise WeatherFetchError(error_msg)
        except httpx.RequestError as e:
            error_msg = f"Request failed: {str(e)}"
            logger.error(f"Weather range fetch error: {error_msg}")
            raise WeatherFetchError(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"Weather range error: {error_msg}")
            raise WeatherFetchError(error_msg)

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Singleton instance
_weather_service: Optional[WeatherService] = None


def get_weather_service() -> WeatherService:
    """Get or create weather service singleton"""
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service
