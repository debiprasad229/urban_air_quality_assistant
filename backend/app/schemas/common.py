"""Common Pydantic Schemas & Shared Enums."""

from enum import Enum

from pydantic import BaseModel, Field


class DataProvenance(str, Enum):
    """Explicit taxonomy distinguishing live vs modeled vs demo data."""

    LIVE_STATION = "LIVE_STATION"
    FORECAST_MODEL = "FORECAST_MODEL"
    CACHED_ESTIMATE = "CACHED_ESTIMATE"
    DEMO_PRESET = "DEMO_PRESET"


class GeoCoordinates(BaseModel):
    """Geographical coordinate pair."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
