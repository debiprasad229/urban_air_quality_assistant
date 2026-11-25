"""Integration Tests for Open-Meteo WeatherService with Mocked HTTP."""

from unittest.mock import AsyncMock, patch

import pytest

from app.domain.presets import find_closest_preset, haversine_km, list_all_presets
from app.schemas.common import DataProvenance
from app.services.weather_service import WeatherService


class TestPresetsDomain:
    def test_list_all_5_presets(self) -> None:
        presets = list_all_presets()
        assert len(presets) == 5
        preset_ids = [p["id"] for p in presets]
        assert "delhi" in preset_ids
        assert "lahore" in preset_ids
        assert "salt_lake_city" in preset_ids
        assert "london" in preset_ids
        assert "bhubaneswar" in preset_ids

    def test_haversine_distance_accuracy(self) -> None:
        # Distance between New Delhi (28.6139, 77.2090) and Agra (27.1767, 78.0081) is approx 180 km
        dist = haversine_km(28.6139, 77.2090, 27.1767, 78.0081)
        assert 170.0 < dist < 195.0

    def test_closest_preset_matcher(self) -> None:
        # Near New Delhi airport (~15 km away)
        match = find_closest_preset(28.5562, 77.1000, max_distance_km=30.0)
        assert match is not None
        assert match["id"] == "delhi"

        # Out in middle of ocean
        no_match = find_closest_preset(0.0, 0.0, max_distance_km=50.0)
        assert no_match is None


@pytest.mark.asyncio
class TestWeatherService:
    async def test_successful_api_parsing_and_caching(self) -> None:
        service = WeatherService()

        mock_payload = {
            "latitude": 28.61,
            "longitude": 77.21,
            "hourly": {
                "time": [f"2026-11-22T{h:02d}:00" for h in range(24)],
                "pm2_5": [180.0 + (h * 2) for h in range(24)],
                "pm10": [250.0 + (h * 3) for h in range(24)],
            },
        }

        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: mock_payload

        with patch("httpx.AsyncClient.get", return_value=mock_resp):
            # First call -> fetches from Open-Meteo
            res1 = await service.get_air_quality(28.6139, 77.2090, "New Delhi")
            assert res1.data_provenance == DataProvenance.FORECAST_MODEL
            assert res1.calculated_aqi > 200
            assert len(res1.hourly_forecast) == 24

            # Second call with slightly different coordinates (within 1.1 km grid)
            # Should hit in-memory cache!
            res2 = await service.get_air_quality(28.6145, 77.2095, "New Delhi")
            assert res2.data_provenance == DataProvenance.CACHED_ESTIMATE
            assert res2.calculated_aqi == res1.calculated_aqi

    async def test_fallback_to_demo_preset_on_timeout(self) -> None:
        service = WeatherService()

        # Simulate connection timeout
        with patch("httpx.AsyncClient.get", side_effect=Exception("Connection timeout")):
            res = await service.get_air_quality(20.2961, 85.8245, "Bhubaneswar")
            assert res.data_provenance == DataProvenance.DEMO_PRESET
            assert res.location_name == "Bhubaneswar"
            assert res.pm25_ug_m3 == 115.0
            assert len(res.hourly_forecast) == 12
