"""Community Impact Ledger REST Endpoints."""

from fastapi import APIRouter, Depends

from app.api.deps import get_impact_service
from app.schemas.impact import CommunityImpactSummaryDTO, ImpactActionDTO
from app.services.impact_service import ImpactService

router = APIRouter(prefix="/impact", tags=["impact"])


@router.post("/record", response_model=CommunityImpactSummaryDTO)
async def record_user_action(
    payload: ImpactActionDTO,
    impact_service: ImpactService = Depends(get_impact_service),
) -> CommunityImpactSummaryDTO:
    """Log an anonymous sustainable user action and increment communal totals."""
    return impact_service.record_action(
        action_type=payload.action_type,
        avoided_co2e_kg=payload.avoided_co2e_kg,
        avoided_pm25_ug=payload.avoided_pm25_ug,
    )


@router.get("/summary", response_model=CommunityImpactSummaryDTO)
async def get_community_summary(
    impact_service: ImpactService = Depends(get_impact_service),
) -> CommunityImpactSummaryDTO:
    """Retrieve cumulative community avoided emissions and exposure metrics."""
    return impact_service.get_summary()
