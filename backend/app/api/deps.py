"""Dependency Injection Singletons for FastAPI."""

from functools import lru_cache

from fastapi import Request

from app.config import settings
from app.services.ai_service import AIService
from app.services.impact_service import ImpactService
from app.services.planner_service import PlannerService
from app.services.rate_limiter import SlidingWindowRateLimiter
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


@lru_cache
def get_planner_service() -> PlannerService:
    """Return singleton PlannerService initialized with singletons."""
    return PlannerService(
        weather_service=get_weather_service(),
        ai_service=get_ai_service(),
    )


@lru_cache
def get_assistant_rate_limiter() -> SlidingWindowRateLimiter:
    """Return singleton SlidingWindowRateLimiter for the AI planner endpoint."""
    return SlidingWindowRateLimiter(
        max_requests=settings.ASSISTANT_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.ASSISTANT_RATE_LIMIT_WINDOW_SECONDS,
    )


def enforce_assistant_rate_limit(request: Request) -> None:
    """FastAPI dependency enforcing 5 requests per 10 minutes on AI planning."""
    get_assistant_rate_limiter().check(request)
