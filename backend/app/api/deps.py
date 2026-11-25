"""Dependency Injection Singletons for FastAPI."""

from functools import lru_cache

from app.services.ai_service import AIService
from app.services.impact_service import ImpactService
from app.services.planner_service import PlannerService
from app.services.weather_service import WeatherService


@lru_cache
def get_weather_service() -> WeatherService:
    """Return singleton WeatherService instance."""
    return WeatherService()


@lru_cache
def get_ai_service() -> AIService:
    """Return singleton AIService instance."""
    return AIService()


@lru_cache
def get_impact_service() -> ImpactService:
    """Return singleton ImpactService instance."""
    return ImpactService()


def get_planner_service() -> PlannerService:
    """Return PlannerService initialized with singletons."""
    return PlannerService(
        weather_service=get_weather_service(),
        ai_service=get_ai_service(),
    )
