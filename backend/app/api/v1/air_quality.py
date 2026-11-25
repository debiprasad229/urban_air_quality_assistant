"""Air Quality Forecast REST Endpoints."""

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_weather_service
from app.schemas.air_quality import CurrentAirQualityResponse
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/air-quality", tags=["air-quality"])


@router.get("/current", response_model=CurrentAirQualityResponse)
async def get_current_air_quality(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    name: str | None = Query(default=None, description="Optional location name"),
    weather_service: WeatherService = Depends(get_weather_service),
) -> CurrentAirQualityResponse:
    """Retrieve current air quality, EPA AQI, and 24-hr diurnal forecast."""
    return await weather_service.get_air_quality(lat=lat, lon=lon, location_name=name)
