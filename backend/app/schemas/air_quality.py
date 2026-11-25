"""Air Quality & Forecast DTOs."""

from pydantic import BaseModel, Field

from app.schemas.common import DataProvenance


class HourlyForecastPoint(BaseModel):
    """Single hour point on a 24-hr diurnal curve."""

    time: str = Field(description="ISO timestamp of forecast hour")
    pm25_ug_m3: float
    pm10_ug_m3: float | None = None
    calculated_aqi: int
    aqi_category: str
    is_inversion_peak: bool = Field(default=False)
    is_aeration_window: bool = Field(default=False)


class CurrentAirQualityResponse(BaseModel):
    """Consolidated atmospheric status for a geographical coordinate."""

    location_name: str
    latitude: float
    longitude: float
    timestamp: str
    pm25_ug_m3: float
    calculated_aqi: int
    aqi_category: str
    severity_code: str
    standard_label: str = "US_EPA_NOWCAST"
    data_provenance: DataProvenance
    safety_advisory_level: str = "NORMAL"
    health_summary: str = ""
    aeration_recommended: bool = False
    aeration_window_text: str = ""
    aeration_rationale: str = ""
    hourly_forecast: list[HourlyForecastPoint]
