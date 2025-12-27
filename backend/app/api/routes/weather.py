"""
Weather endpoints for Cosmic Chronicle

Location management and weather data fetching.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models import WeatherLocation, AppConfig
from app.schemas.weather import (
    WeatherLocationCreate,
    WeatherLocationUpdate,
    WeatherLocationResponse,
    WeatherLocationListResponse,
    LocationSearchResult,
    LocationSearchResponse,
    WeatherResponse,
    CurrentWeather,
    DailyForecast,
    WeatherApiKeyRequest,
    WeatherApiStatusResponse,
)
from app.schemas.common import Message
from app.services.weather_service import (
    get_weather_service,
    WeatherServiceError,
    WeatherApiError,
    WeatherConfigError,
)

router = APIRouter()


# =============================================================================
# API Key Configuration
# =============================================================================

def _get_weather_api_key(db: Session) -> Optional[str]:
    """Get OpenWeatherMap API key from app config"""
    config = db.query(AppConfig).first()
    if config and config.extra_settings:
        return config.extra_settings.get("openweathermap_api_key")
    return None


def _set_weather_api_key(db: Session, api_key: str):
    """Save OpenWeatherMap API key to app config"""
    config = db.query(AppConfig).first()
    if not config:
        config = AppConfig(extra_settings={})
        db.add(config)

    if not config.extra_settings:
        config.extra_settings = {}

    config.extra_settings["openweathermap_api_key"] = api_key
    db.commit()


@router.get("/weather/api-status", response_model=WeatherApiStatusResponse)
async def get_weather_api_status(db: Session = Depends(get_db)):
    """
    Check if OpenWeatherMap API key is configured.

    Returns:
        API configuration status
    """
    api_key = _get_weather_api_key(db)
    return WeatherApiStatusResponse(
        configured=bool(api_key),
        provider="openweathermap"
    )


@router.post("/weather/api-key", response_model=Message)
async def set_weather_api_key(
    request: WeatherApiKeyRequest,
    db: Session = Depends(get_db)
):
    """
    Set OpenWeatherMap API key.

    Args:
        request: API key data
        db: Database session

    Returns:
        Success message
    """
    _set_weather_api_key(db, request.api_key)
    return Message(message="Weather API key saved successfully")


# =============================================================================
# Location Search
# =============================================================================

@router.get("/weather/search", response_model=LocationSearchResponse)
async def search_locations(
    query: str = Query(..., min_length=2, description="City name to search"),
    limit: int = Query(5, ge=1, le=10, description="Maximum results"),
    db: Session = Depends(get_db)
):
    """
    Search for locations by city name.

    Uses OpenWeatherMap geocoding API.

    Args:
        query: City name to search
        limit: Maximum results
        db: Database session

    Returns:
        List of matching locations

    Raises:
        HTTPException 503: If API key not configured
        HTTPException 502: If API request fails
    """
    api_key = _get_weather_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenWeatherMap API key not configured"
        )

    service = get_weather_service(api_key)

    try:
        results = await service.search_location(query, limit)
        return LocationSearchResponse(
            results=[
                LocationSearchResult(
                    name=loc["name"],
                    country=loc["country"],
                    state=loc.get("state"),
                    latitude=loc["latitude"],
                    longitude=loc["longitude"]
                )
                for loc in results
            ],
            query=query
        )
    except WeatherApiError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather API error: {str(e)}"
        )
    except WeatherServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Service error: {str(e)}"
        )


# =============================================================================
# Location Management
# =============================================================================

@router.post("/weather/locations", response_model=WeatherLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_in: WeatherLocationCreate,
    db: Session = Depends(get_db)
):
    """
    Save a weather location.

    Args:
        location_in: Location data
        db: Database session

    Returns:
        Created location
    """
    # If setting as primary, unset other primaries
    if location_in.is_primary:
        db.query(WeatherLocation).filter(
            WeatherLocation.is_primary == True
        ).update({"is_primary": False})

    location = WeatherLocation(
        name=location_in.name,
        city=location_in.city,
        country=location_in.country,
        latitude=location_in.latitude,
        longitude=location_in.longitude,
        is_primary=location_in.is_primary,
        timezone=location_in.timezone
    )

    db.add(location)
    db.commit()
    db.refresh(location)

    return location


@router.get("/weather/locations", response_model=WeatherLocationListResponse)
async def list_locations(db: Session = Depends(get_db)):
    """
    List all saved weather locations.

    Returns:
        List of saved locations
    """
    locations = db.query(WeatherLocation).order_by(
        WeatherLocation.is_primary.desc(),
        WeatherLocation.name
    ).all()

    return WeatherLocationListResponse(
        locations=locations,
        total=len(locations)
    )


@router.get("/weather/locations/{location_id}", response_model=WeatherLocationResponse)
async def get_location(
    location_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get location by ID.

    Args:
        location_id: Location ID
        db: Database session

    Returns:
        Location details

    Raises:
        HTTPException 404: If location not found
    """
    location = db.query(WeatherLocation).filter(
        WeatherLocation.id == str(location_id)
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    return location


@router.put("/weather/locations/{location_id}", response_model=WeatherLocationResponse)
async def update_location(
    location_id: UUID,
    location_in: WeatherLocationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update location settings.

    Args:
        location_id: Location ID
        location_in: Update data
        db: Database session

    Returns:
        Updated location

    Raises:
        HTTPException 404: If location not found
    """
    location = db.query(WeatherLocation).filter(
        WeatherLocation.id == str(location_id)
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    update_data = location_in.model_dump(exclude_unset=True)

    # If setting as primary, unset other primaries
    if update_data.get("is_primary"):
        db.query(WeatherLocation).filter(
            WeatherLocation.id != str(location_id),
            WeatherLocation.is_primary == True
        ).update({"is_primary": False})

    for field, value in update_data.items():
        setattr(location, field, value)

    db.commit()
    db.refresh(location)

    return location


@router.delete("/weather/locations/{location_id}", response_model=Message)
async def delete_location(
    location_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete a saved location.

    Args:
        location_id: Location ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If location not found
    """
    location = db.query(WeatherLocation).filter(
        WeatherLocation.id == str(location_id)
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    db.delete(location)
    db.commit()

    return Message(message="Location deleted successfully")


# =============================================================================
# Weather Data
# =============================================================================

@router.get("/weather/current", response_model=WeatherResponse)
async def get_current_weather(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    units: str = Query("metric", description="Units: metric, imperial, standard"),
    db: Session = Depends(get_db)
):
    """
    Get current weather and forecast for coordinates.

    Args:
        lat: Latitude
        lon: Longitude
        units: Temperature units
        db: Database session

    Returns:
        Current weather and 5-day forecast

    Raises:
        HTTPException 503: If API key not configured
        HTTPException 502: If API request fails
    """
    api_key = _get_weather_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenWeatherMap API key not configured"
        )

    service = get_weather_service(api_key)

    try:
        weather = await service.get_weather(lat, lon, units)

        return WeatherResponse(
            location_name=weather.location_name,
            country=weather.country,
            latitude=weather.latitude,
            longitude=weather.longitude,
            timezone_offset=weather.timezone_offset,
            fetched_at=weather.fetched_at,
            current=CurrentWeather(
                temperature=weather.current.temperature,
                feels_like=weather.current.feels_like,
                humidity=weather.current.humidity,
                pressure=weather.current.pressure,
                wind_speed=weather.current.wind_speed,
                wind_direction=weather.current.wind_direction,
                description=weather.current.description,
                icon=weather.current.icon,
                visibility=weather.current.visibility,
                clouds=weather.current.clouds,
                sunrise=weather.current.sunrise,
                sunset=weather.current.sunset
            ),
            forecast=[
                DailyForecast(
                    date=f.date,
                    temp_min=f.temp_min,
                    temp_max=f.temp_max,
                    description=f.description,
                    icon=f.icon,
                    humidity=f.humidity,
                    wind_speed=f.wind_speed,
                    pop=f.pop
                )
                for f in weather.forecast
            ]
        )
    except WeatherApiError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather API error: {str(e)}"
        )
    except WeatherServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Service error: {str(e)}"
        )


@router.get("/weather/location/{location_id}/current", response_model=WeatherResponse)
async def get_weather_for_location(
    location_id: UUID,
    units: str = Query("metric", description="Units: metric, imperial, standard"),
    db: Session = Depends(get_db)
):
    """
    Get weather for a saved location.

    Args:
        location_id: Location ID
        units: Temperature units
        db: Database session

    Returns:
        Current weather and 5-day forecast

    Raises:
        HTTPException 404: If location not found
        HTTPException 503: If API key not configured
        HTTPException 502: If API request fails
    """
    location = db.query(WeatherLocation).filter(
        WeatherLocation.id == str(location_id)
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )

    api_key = _get_weather_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenWeatherMap API key not configured"
        )

    service = get_weather_service(api_key)

    try:
        weather = await service.get_weather(
            location.latitude,
            location.longitude,
            units
        )

        return WeatherResponse(
            location_name=location.name,  # Use saved name
            country=weather.country,
            latitude=weather.latitude,
            longitude=weather.longitude,
            timezone_offset=weather.timezone_offset,
            fetched_at=weather.fetched_at,
            current=CurrentWeather(
                temperature=weather.current.temperature,
                feels_like=weather.current.feels_like,
                humidity=weather.current.humidity,
                pressure=weather.current.pressure,
                wind_speed=weather.current.wind_speed,
                wind_direction=weather.current.wind_direction,
                description=weather.current.description,
                icon=weather.current.icon,
                visibility=weather.current.visibility,
                clouds=weather.current.clouds,
                sunrise=weather.current.sunrise,
                sunset=weather.current.sunset
            ),
            forecast=[
                DailyForecast(
                    date=f.date,
                    temp_min=f.temp_min,
                    temp_max=f.temp_max,
                    description=f.description,
                    icon=f.icon,
                    humidity=f.humidity,
                    wind_speed=f.wind_speed,
                    pop=f.pop
                )
                for f in weather.forecast
            ]
        )
    except WeatherApiError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather API error: {str(e)}"
        )
    except WeatherServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Service error: {str(e)}"
        )


@router.get("/weather/primary", response_model=WeatherResponse)
async def get_primary_weather(
    units: str = Query("metric", description="Units: metric, imperial, standard"),
    db: Session = Depends(get_db)
):
    """
    Get weather for the primary location.

    Returns:
        Current weather and forecast for primary location

    Raises:
        HTTPException 404: If no primary location set
        HTTPException 503: If API key not configured
        HTTPException 502: If API request fails
    """
    location = db.query(WeatherLocation).filter(
        WeatherLocation.is_primary == True
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No primary location configured"
        )

    api_key = _get_weather_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenWeatherMap API key not configured"
        )

    service = get_weather_service(api_key)

    try:
        weather = await service.get_weather(
            location.latitude,
            location.longitude,
            units
        )

        return WeatherResponse(
            location_name=location.name,
            country=weather.country,
            latitude=weather.latitude,
            longitude=weather.longitude,
            timezone_offset=weather.timezone_offset,
            fetched_at=weather.fetched_at,
            current=CurrentWeather(
                temperature=weather.current.temperature,
                feels_like=weather.current.feels_like,
                humidity=weather.current.humidity,
                pressure=weather.current.pressure,
                wind_speed=weather.current.wind_speed,
                wind_direction=weather.current.wind_direction,
                description=weather.current.description,
                icon=weather.current.icon,
                visibility=weather.current.visibility,
                clouds=weather.current.clouds,
                sunrise=weather.current.sunrise,
                sunset=weather.current.sunset
            ),
            forecast=[
                DailyForecast(
                    date=f.date,
                    temp_min=f.temp_min,
                    temp_max=f.temp_max,
                    description=f.description,
                    icon=f.icon,
                    humidity=f.humidity,
                    wind_speed=f.wind_speed,
                    pop=f.pop
                )
                for f in weather.forecast
            ]
        )
    except WeatherApiError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Weather API error: {str(e)}"
        )
    except WeatherServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Service error: {str(e)}"
        )
