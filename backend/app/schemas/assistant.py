"""Schemas for AI Assistant Daily Routine Planner."""

from pydantic import BaseModel, Field


class RoutineSlotDTO(BaseModel):
    """Single time-slotted routine recommendation."""

    time_window: str = Field(description="e.g. '07:30 - 08:30'")
    activity: str = Field(description="e.g. 'Morning Commute'")
    setting: str = Field(description="'OUTDOOR', 'INDOOR', or 'ENCLOSED_TRANSIT'")
    advisory_action: str = Field(description="Actionable guidance for this window")
    mask_required: bool = Field(description="Whether N95/protective mask is mandatory")
    purifier_setting: str = Field(description="'OFF', 'LOW', 'MEDIUM', 'HIGH', or 'TURBO'")


class AssistantPlanRequestDTO(BaseModel):
    """User preferences for daily routine generation."""

    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location_name: str = Field(default="")
    commute_distance_km: float = Field(default=8.0, gt=0.1, le=100.0)
    default_commute_mode: str = Field(default="SOLO_CAR_GASOLINE")
    vulnerability_category: str = Field(
        default="GENERAL",
        description="'GENERAL' or 'SENSITIVE' (children/elderly/respiratory)",
    )
    user_notes: str = Field(default="", max_length=300)


class AssistantPlanResponseDTO(BaseModel):
    """Synthesized, actionable daily routine plan."""

    location_name: str
    generated_at: str
    current_aqi: int
    aqi_category: str
    safety_advisory_level: str  # NORMAL, CAUTION, SEVERE_WARNING
    safety_advisory_message: str
    optimal_aeration_window: str
    daily_schedule: list[RoutineSlotDTO]
    avoided_exposure_estimate_ug: float
    avoided_co2e_estimate_kg: float
    impact_explanation: str
    is_fallback_plan: bool = False
    disclaimer: str = (
        "Public health advisory only; not clinical medical advice. "
        "Consult healthcare professionals for personal medical management."
    )
