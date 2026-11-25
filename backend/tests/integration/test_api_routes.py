"""Integration Tests for FastAPI Endpoints & RFC 7807 Error Handling."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

MOCK_METEO_PAYLOAD = {
    "latitude": 28.61,
    "longitude": 77.21,
    "hourly": {
        "time": [f"2026-11-22T{h:02d}:00" for h in range(24)],
        "pm2_5": [120.0 + (h * 2) for h in range(24)],
        "pm10": [180.0 + (h * 3) for h in range(24)],
    },
}


class TestHealthEndpoint:
    def test_health_check_returns_200(self) -> None:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "gemini_api" in data["dependencies"]


class TestLocationsEndpoints:
    def test_get_presets_returns_5_cities(self) -> None:
        resp = client.get("/api/v1/locations/presets")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 5
        names = [p["name"] for p in data]
        assert any("Delhi" in n for n in names)
        assert any("Bhubaneswar" in n for n in names)

    def test_search_locations_geocoding(self) -> None:
        mock_geo_payload = {
            "results": [
                {
                    "id": 12345,
                    "name": "Tokyo",
                    "country": "Japan",
                    "country_code": "JP",
                    "admin1": "Tokyo",
                    "latitude": 35.6895,
                    "longitude": 139.6917,
                }
            ]
        }
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: mock_geo_payload

        with patch("httpx.AsyncClient.get", return_value=mock_resp):
            resp = client.get("/api/v1/locations/search?q=Tokyo")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 1
            assert data[0]["name"] == "Tokyo, Japan"
            assert data[0]["latitude"] == 35.6895


class TestAirQualityEndpoints:
    def test_get_current_air_quality(self) -> None:
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: MOCK_METEO_PAYLOAD

        with patch("httpx.AsyncClient.get", return_value=mock_resp):
            resp = client.get("/api/v1/air-quality/current?lat=28.61&lon=77.21&name=Delhi")
            assert resp.status_code == 200
            data = resp.json()
            assert data["location_name"] == "Delhi"
            assert "calculated_aqi" in data
            assert "hourly_forecast" in data

    def test_validation_error_returns_rfc7807(self) -> None:
        # Latitude out of bounds (> 90.0)
        resp = client.get("/api/v1/air-quality/current?lat=95.0&lon=77.21")
        assert resp.status_code == 422
        problem = resp.json()
        assert problem["status"] == 422
        assert problem["error_code"] == "VALIDATION_ERROR"
        assert "lat" in problem["detail"]


class TestCalculatorsEndpoints:
    def test_cadr_calculator(self) -> None:
        payload = {
            "room_length_m": 4.0,
            "room_width_m": 5.0,
            "ceiling_height_m": 2.44,
            "current_purifier_cadr_m3h": 150.0,
        }
        resp = client.post("/api/v1/calculators/cadr", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["room_volume_m3"] == 48.8
        assert data["required_cadr_m3h"] == 219.6
        assert data["is_existing_purifier_adequate"] is False

    def test_commute_calculator(self) -> None:
        payload = {
            "distance_km": 10.0,
            "ambient_pm25_ug_m3": 180.0,
            "baseline_mode": "SOLO_CAR_GASOLINE",
            "mask_type": "NONE",
        }
        resp = client.post("/api/v1/calculators/commute", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["best_exposure_mode"] == "ELECTRIC_METRO"
        assert data["avoided_co2e_grams"] > 0


class TestAssistantEndpoints:
    def test_assistant_plan_fallback(self) -> None:
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: MOCK_METEO_PAYLOAD

        payload = {
            "latitude": 28.6139,
            "longitude": 77.2090,
            "location_name": "New Delhi",
            "commute_distance_km": 10.0,
            "vulnerability_category": "GENERAL",
        }

        with patch("httpx.AsyncClient.get", return_value=mock_resp):
            resp = client.post("/api/v1/assistant/plan", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["location_name"] == "New Delhi"
            assert len(data["daily_schedule"]) == 5
            assert "avoided_co2e_estimate_kg" in data
            assert "disclaimer" in data


class TestImpactEndpoints:
    def test_impact_record_and_summary(self) -> None:
        action_payload = {
            "action_type": "TRANSIT_MODAL_SHIFT",
            "avoided_co2e_kg": 2.5,
            "avoided_pm25_ug": 15.0,
        }
        resp1 = client.post("/api/v1/impact/record", json=action_payload)
        assert resp1.status_code == 200
        res1_data = resp1.json()
        assert res1_data["total_actions_logged"] > 0

        resp2 = client.get("/api/v1/impact/summary")
        assert resp2.status_code == 200
        res2_data = resp2.json()
        assert res2_data["total_co2e_avoided_kg"] >= 2.5
