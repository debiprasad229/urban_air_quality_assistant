"""Unit Tests for Safety Rules & Inversion Aeration Engine."""

from app.domain.rules import detect_diurnal_aeration_window, evaluate_safety_advisory


class TestEvaluateSafetyAdvisory:
    def test_severe_warning_at_or_above_200(self) -> None:
        advisory = evaluate_safety_advisory(220, "GENERAL")
        assert advisory.advisory_level == "SEVERE_WARNING"
        assert advisory.outdoor_exercise_permitted is False
        assert advisory.mask_mandate == "MANDATORY_N95"
        assert "Severe Smog Episode" in advisory.headline

    def test_caution_for_moderate_aqi(self) -> None:
        # AQI 120 (Unhealthy for Sensitive)
        adv_gen = evaluate_safety_advisory(120, "GENERAL")
        assert adv_gen.advisory_level == "CAUTION"
        assert adv_gen.outdoor_exercise_permitted is True

        adv_sens = evaluate_safety_advisory(120, "SENSITIVE")
        assert adv_sens.advisory_level == "CAUTION"
        assert adv_sens.outdoor_exercise_permitted is False
        assert adv_sens.mask_mandate == "MANDATORY_N95"

    def test_normal_for_low_aqi(self) -> None:
        advisory = evaluate_safety_advisory(45, "GENERAL")
        assert advisory.advisory_level == "NORMAL"
        assert advisory.outdoor_exercise_permitted is True
        assert advisory.mask_mandate == "NONE"


class TestDetectDiurnalAerationWindow:
    def test_identifies_midday_trough(self) -> None:
        """Simulates classic winter inversion: morning/evening spikes, midday low."""
        sample_series = [
            {"time": "2026-11-22T06:00", "pm25": 210.0},
            {"time": "2026-11-22T07:00", "pm25": 240.0},
            {"time": "2026-11-22T08:00", "pm25": 260.0},  # Peak
            {"time": "2026-11-22T10:00", "pm25": 160.0},
            {"time": "2026-11-22T12:00", "pm25": 95.0},
            {"time": "2026-11-22T13:00", "pm25": 72.0},  # Midday Trough
            {"time": "2026-11-22T14:00", "pm25": 80.0},
            {"time": "2026-11-22T16:00", "pm25": 120.0},
            {"time": "2026-11-22T18:00", "pm25": 190.0},
            {"time": "2026-11-22T20:00", "pm25": 220.0},
            {"time": "2026-11-22T22:00", "pm25": 230.0},
            {"time": "2026-11-22T23:00", "pm25": 215.0},
        ]
        window = detect_diurnal_aeration_window(sample_series)
        assert window.safe_to_aerate is True
        assert window.trough_pm25 == 72.0
        assert window.duration_minutes == 15
        assert "13:00" in (window.recommended_start or "")

    def test_blocks_aeration_when_trough_is_hazardous(self) -> None:
        """When daytime low is still above 150 µg/m³, aeration is strictly blocked."""
        severe_series = [
            {"time": f"2026-11-22T{h:02d}:00", "pm25": 280.0 if h < 11 or h > 16 else 190.0}
            for h in range(24)
        ]
        window = detect_diurnal_aeration_window(severe_series)
        assert window.safe_to_aerate is False
        assert "hazardous throughout daylight hours" in window.rationale
