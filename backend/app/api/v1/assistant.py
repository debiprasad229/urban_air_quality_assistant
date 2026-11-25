"""AI Assistant Daily Routine Planner REST Endpoints."""

from fastapi import APIRouter, Depends

from app.api.deps import get_planner_service
from app.schemas.assistant import AssistantPlanRequestDTO, AssistantPlanResponseDTO
from app.services.planner_service import PlannerService

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/plan", response_model=AssistantPlanResponseDTO)
async def create_personalized_daily_plan(
    payload: AssistantPlanRequestDTO,
    planner: PlannerService = Depends(get_planner_service),
) -> AssistantPlanResponseDTO:
    """Generate a personalized daily routine plan synthesizing weather, physics, and AI."""
    return await planner.create_daily_plan(payload)
