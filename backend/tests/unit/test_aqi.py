"""Unit Tests for Deterministic US EPA NowCast AQI Calculation."""

import pytest

from app.domain.aqi import calculate_aqi_from_pm25, truncate_pm25


class TestTruncatePM25:
    """Verifies EPA 1-decimal truncation rule."""

    def test_truncates_without_rounding_up(self) -> None:
        assert truncate_pm25(35.49) == 35.4
        assert truncate_pm25(9.08) == 9.0
        assert truncate_pm25(12.01) == 12.0
        assert truncate_pm25(55.45) == 55.4

    def test_handles_zero_and_negative(self) -> None:
        assert truncate_pm25(0.0) == 0.0
        assert truncate_pm25(-2.5) == 0.0


class TestCalculateAQIFromPM25:
    """Verifies exact piecewise linear calculations across all EPA breakpoints."""

    @pytest.mark.parametrize(
        "pm25, expected_aqi, expected_category, expected_code",
        [
            # Category 1: Good (0 - 50)
            (0.0, 0, "Good", "GOOD"),
            (4.5, 25, "Good", "GOOD"),
            (9.0, 50, "Good", "GOOD"),  # Boundary
            # Category 2: Moderate (51 - 100)
            (9.1, 51, "Moderate", "MODERATE"),  # Lower boundary
            (12.0, 56, "Moderate", "MODERATE"),
            (22.25, 75, "Moderate", "MODERATE"),
            (35.4, 100, "Moderate", "MODERATE"),  # Upper boundary
            # Category 3: Unhealthy for Sensitive Groups (101 - 150)
            (35.5, 101, "Unhealthy for Sensitive Groups", "SENSITIVE_UNHEALTHY"),
            (45.45, 125, "Unhealthy for Sensitive Groups", "SENSITIVE_UNHEALTHY"),
            (55.4, 150, "Unhealthy for Sensitive Groups", "SENSITIVE_UNHEALTHY"),
            # Category 4: Unhealthy (151 - 200)
            (55.5, 151, "Unhealthy", "UNHEALTHY"),
            (90.45, 175, "Unhealthy", "UNHEALTHY"),
            (125.4, 200, "Unhealthy", "UNHEALTHY"),
            # Category 5: Very Unhealthy (201 - 300)
            (125.5, 201, "Very Unhealthy", "VERY_UNHEALTHY"),
            (175.45, 250, "Very Unhealthy", "VERY_UNHEALTHY"),
            (225.4, 300, "Very Unhealthy", "VERY_UNHEALTHY"),
            # Category 6: Hazardous Tier 1 (301 - 400)
            (225.5, 301, "Hazardous", "HAZARDOUS_1"),
            (275.45, 350, "Hazardous", "HAZARDOUS_1"),
            (325.4, 400, "Hazardous", "HAZARDOUS_1"),
            # Category 7: Hazardous Tier 2 (401 - 500)
            (325.5, 401, "Hazardous", "HAZARDOUS_2"),
            (412.95, 450, "Hazardous", "HAZARDOUS_2"),
            (500.4, 500, "Hazardous", "HAZARDOUS_2"),
        ],
    )
    def test_breakpoint_exact_values(
        self,
        pm25: float,
        expected_aqi: int,
        expected_category: str,
        expected_code: str,
    ) -> None:
        result = calculate_aqi_from_pm25(pm25)
        assert result.aqi == expected_aqi
        assert result.category == expected_category
        assert result.severity_code == expected_code

    def test_beyond_index_capping(self) -> None:
        """Concentrations exceeding 500.4 cap at 500 Emergency."""
        result = calculate_aqi_from_pm25(650.0)
        assert result.aqi == 500
        assert result.category == "Beyond Index / Emergency"
        assert result.severity_code == "EMERGENCY"
        assert result.truncated_pm25 == 650.0

    def test_negative_concentration_clamped(self) -> None:
        """Negative sensor drift clamped to 0."""
        result = calculate_aqi_from_pm25(-10.5)
        assert result.aqi == 0
        assert result.category == "Good"
        assert result.truncated_pm25 == 0.0
