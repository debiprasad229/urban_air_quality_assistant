"""V1 API Router Aggregator."""

from fastapi import APIRouter

from app.api.v1.air_quality import router as air_quality_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.calculators import router as calculators_router
from app.api.v1.impact import router as impact_router
from app.api.v1.locations import router as locations_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(locations_router)
api_v1_router.include_router(air_quality_router)
api_v1_router.include_router(calculators_router)
api_v1_router.include_router(assistant_router)
api_v1_router.include_router(impact_router)
