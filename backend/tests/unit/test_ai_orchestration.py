"""Unit Tests for AI Service & Planner Orchestration."""

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.assistant import AssistantPlanRequestDTO
from app.services.ai_service import AIService
from app.services.planner_service import PlannerService
from app.services.weather_service import WeatherService


@pytest.mark.asyncio
class TestAIService:
    async def test_returns_none_when_no_api_key(self) -> None:
        service = AIService()
        service.api_key = ""
        res = await service.generate_plan("Prompt")
        assert res is None

    async def test_parses_json_response(self) -> None:
        service = AIService()
        service.api_key = "fake_key"

        sample_text = (
            '```json\n{"daily_schedule": [], "optimal_aeration_window": "13:00"}\n```'
        )
        mock_payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": sample_text}]
                    }
                }
            ]
        }

        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: mock_payload

        with patch("httpx.AsyncClient.post", return_value=mock_resp):
            res = await service.generate_plan("Prompt")
            assert res is not None
            assert res["optimal_aeration_window"] == "13:00"

    async def test_graceful_handling_of_timeout(self) -> None:
        service = AIService()
        service.api_key = "fake_key"

        with patch("httpx.AsyncClient.post", side_effect=Exception("ReadTimeout")):
            res = await service.generate_plan("Prompt")
            assert res is None


@pytest.mark.asyncio
class TestPlannerService:
    async def test_falls_back_when_ai_returns_none(self) -> None:
        weather_svc = WeatherService()
        ai_svc = AIService()
        ai_svc.api_key = ""  # Force fallback

        planner = PlannerService(weather_service=weather_svc, ai_service=ai_svc)
        req = AssistantPlanRequestDTO(
            latitude=28.6139,
            longitude=77.2090,
            location_name="New Delhi",
            commute_distance_km=10.0,
        )

        plan = await planner.create_daily_plan(req)
        assert plan.is_fallback_plan is True
        assert len(plan.daily_schedule) == 5
        assert plan.location_name == "New Delhi"
