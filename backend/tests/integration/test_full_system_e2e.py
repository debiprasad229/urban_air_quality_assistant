"""Full End-to-End System Integration Test Suite.

Simulates the complete user and client journey across all domain calculators,
preset cities, diurnal forecasting, AI assistant planning, and impact logging.
"""

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


class TestFullSystemE2E:
    """Full system end-to-end client journey verification."""

    def test_health_check_probe(self) -> None:
        """Verify the health check endpoint returns healthy status for Render probes."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "gemini_api" in data["dependencies"]

    def test_presets_discovery(self) -> None:
        """Verify all 5 demo presets are discoverable with valid coordinates."""
        response = client.get("/api/v1/locations/presets")
        assert response.status_code == 200
        presets = response.json()
        assert len(presets) == 5

        preset_names = {p["name"] for p in presets}
        assert any("Delhi" in n for n in preset_names)
        assert any("Lahore" in n for n in preset_names)
        assert any("Salt Lake City" in n for n in preset_names)
        assert any("London" in n for n in preset_names)
        assert any("Bhubaneswar" in n for n in preset_names)

    def test_all_five_presets_air_quality(self) -> None:
        """Verify air quality and diurnal curve retrieval for each of the 5 presets."""
        presets_resp = client.get("/api/v1/locations/presets")
        assert presets_resp.status_code == 200
        presets = presets_resp.json()

        for p in presets:
            aq_resp = client.get(
                f"/api/v1/air-quality/current?lat={p['latitude']}&lon={p['longitude']}&name={p['name']}"
            )
            assert aq_resp.status_code == 200, f"Failed for preset {p['name']}"
            aq = aq_resp.json()

            assert "calculated_aqi" in aq
            assert "aqi_category" in aq
            assert "hourly_forecast" in aq
            assert len(aq["hourly_forecast"]) >= 24

            # City-specific scientific grounding checks
            assert aq["calculated_aqi"] > 0
            if "Delhi" in p["name"] or "Lahore" in p["name"]:
                # Winter baseline is high (unhealthy/severe range)
                assert aq["calculated_aqi"] >= 150
            elif "London" in p["name"]:
                assert aq["calculated_aqi"] <= 200

    def test_cadr_purifier_calculator_flow(self) -> None:
        """Verify ANSI/AHAM AC-1 (4.5 ACH) calculation flow."""
        payload = {
            "room_length_m": 4.0,
            "room_width_m": 5.0,
            "ceiling_height_m": 2.44,
            "current_purifier_cadr_m3h": 300.0,
        }
        resp = client.post("/api/v1/calculators/cadr", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["room_volume_m3"] == 48.8
        assert data["required_cadr_m3h"] == 219.6  # 48.8 * 4.5
        assert round(data["required_cadr_cfm"], 1) == 129.3
        assert data["is_existing_purifier_adequate"] is True  # 300 >= 219.6

    def test_commute_exposure_comparator_flow(self) -> None:
        """Verify minute-ventilation inhaled dose vs UK DEFRA emission calculations."""
        payload = {
            "distance_km": 10.0,
            "ambient_pm25_ug_m3": 180.0,
            "baseline_mode": "SOLO_CAR_GASOLINE",
            "mask_type": "NONE",
        }
        resp = client.post("/api/v1/calculators/commute", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["distance_km"] == 10.0
        assert data["best_exposure_mode"] == "ELECTRIC_METRO"
        assert data["avoided_co2e_grams"] > 0
        assert len(data["options"]) >= 4

    def test_assistant_personalized_routine_flow(self) -> None:
        """Verify the 5-slot routine generation with harm-reduction rules."""
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: MOCK_METEO_PAYLOAD

        payload = {
            "latitude": 28.6139,
            "longitude": 77.2090,
            "location_name": "New Delhi",
            "commute_distance_km": 12.0,
            "vulnerability_category": "SENSITIVE",
        }
        with patch("httpx.AsyncClient.get", return_value=mock_resp):
            resp = client.post("/api/v1/assistant/plan", json=payload)
            assert resp.status_code == 200
            plan = resp.json()

            assert plan["location_name"] == "New Delhi"
            assert "daily_schedule" in plan
            assert len(plan["daily_schedule"]) == 5
            assert "disclaimer" in plan
            assert "medical advice" in plan["disclaimer"].lower()

    def test_communal_impact_logging_flow(self) -> None:
        """Verify logging verified sustainable actions increments communal totals."""
        action_payload = {
            "action_type": "TRANSIT_MODAL_SHIFT",
            "avoided_co2e_kg": 2.5,
            "avoided_pm25_ug": 15.0,
        }
        resp1 = client.post("/api/v1/impact/record", json=action_payload)
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["total_actions_logged"] > 0

        resp2 = client.get("/api/v1/impact/summary")
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["total_co2e_avoided_kg"] >= 2.5
