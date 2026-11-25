"""Schemas for Community Impact Ledger."""

from pydantic import BaseModel, Field


class ImpactActionDTO(BaseModel):
    """Payload for logging a verified user action."""

    action_type: str = Field(
        ...,
        description="'TRANSIT_MODAL_SHIFT', 'AERATION_TIMED', or 'PURIFIER_OPTIMIZED'",
    )
    avoided_co2e_kg: float = Field(..., ge=0.0)
    avoided_pm25_ug: float = Field(..., ge=0.0)


class CommunityImpactSummaryDTO(BaseModel):
    """Aggregated anonymous impact metrics."""

    total_actions_logged: int
    total_co2e_avoided_kg: float
    total_pm25_avoided_ug: float
    last_updated: str
