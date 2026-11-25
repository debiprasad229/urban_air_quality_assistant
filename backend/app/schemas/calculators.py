"""Calculator Request & Response DTOs."""

from pydantic import BaseModel, Field


class CADRRequestDTO(BaseModel):
    """Request payload for CADR room analysis."""

    room_length_m: float = Field(..., gt=0.5, le=30.0, description="Length in meters")
    room_width_m: float = Field(..., gt=0.5, le=30.0, description="Width in meters")
    ceiling_height_m: float = Field(default=2.44, gt=1.5, le=6.0, description="Ceiling height")
    current_purifier_cadr_m3h: float | None = Field(default=None, ge=0.0)


class CADRResponseDTO(BaseModel):
    """Response payload for CADR room analysis."""

    room_volume_m3: float
    target_ach: float
    required_cadr_m3h: float
    required_cadr_cfm: float
    clearance_time_minutes_90pct: int
    operating_guidance: str
    is_existing_purifier_adequate: bool | None = None
    existing_purifier_recommendation: str | None = None


class CommuteComparisonRequestDTO(BaseModel):
    """Request payload for multimodal commute comparison."""

    distance_km: float = Field(..., gt=0.1, le=100.0)
    ambient_pm25_ug_m3: float = Field(..., ge=0.0)
    baseline_mode: str = Field(default="SOLO_CAR_GASOLINE")
    mask_type: str = Field(default="NONE")


class CommuteOptionDTO(BaseModel):
    """Individual transit option metrics."""

    mode: str
    duration_minutes: int
    inhaled_pm25_ug: float
    tailpipe_co2e_grams: float
    tailpipe_pm25_grams: float
    exposure_tier: str


class CommuteComparisonResponseDTO(BaseModel):
    """Response payload for multimodal commute comparison."""

    distance_km: float
    ambient_pm25: float
    baseline_mode: str
    options: list[CommuteOptionDTO]
    best_exposure_mode: str
    best_emission_mode: str
    avoided_exposure_ug: float
    avoided_co2e_grams: float
    recommendation_summary: str
