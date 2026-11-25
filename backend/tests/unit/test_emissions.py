"""Unit Tests for Transit Inhalation Dose & Emission Engine."""

from app.domain.emissions import (
    calculate_inhaled_dose,
    calculate_trip_emissions,
    compare_transit_alternatives,
)


class TestInhaledDose:
    def test_bicycling_vs_seated_transit_inhalation(self) -> None:
        """Verifies that moderate exertion (cycling) results in ~5x higher dose

        than sedentary transit over the same duration due to minute ventilation rates.
        """
        ambient_pm25 = 150.0  # µg/m³
        duration_mins = 30.0  # 30 minutes

        # Cycling without mask: V_E = 2.40 m³/h
        # Dose = 150 * 0.5 * 2.40 * 1.0 = 180.0 µg
        dose_bike = calculate_inhaled_dose(ambient_pm25, duration_mins, "BICYCLE", "NONE")
        assert dose_bike == 180.0

        # Seated metro without mask: V_E = 0.48 m³/h
        # Dose = 150 * 0.5 * 0.48 * 1.0 = 36.0 µg
        dose_train = calculate_inhaled_dose(ambient_pm25, duration_mins, "ELECTRIC_METRO", "NONE")
        assert dose_train == 36.0

        # Ratio must equal exactly 2.40 / 0.48 = 5.0
        assert round(dose_bike / dose_train, 1) == 5.0

    def test_mask_filtration_reduction(self) -> None:
        """N95 mask (95% efficiency) reduces inhaled dose by 95%."""
        ambient_pm25 = 200.0
        duration_mins = 60.0

        dose_no_mask = calculate_inhaled_dose(ambient_pm25, duration_mins, "WALK", "NONE")
        dose_n95 = calculate_inhaled_dose(ambient_pm25, duration_mins, "WALK", "N95_FFP2")

        # Walking V_E = 1.20 m³/h
        # No mask: 200 * 1.0 * 1.20 * 1.0 = 240.0 µg
        assert dose_no_mask == 240.0
        # N95: 200 * 1.0 * 1.20 * 0.05 = 12.0 µg
        assert dose_n95 == 12.0


class TestTripEmissions:
    def test_solo_gasoline_car_emissions(self) -> None:
        # 10 km trip in solo ICE car:
        # CO2e: 10 * 170.0 = 1700.0 grams
        # PM2.5: 10 * 0.0150 = 0.15 grams
        co2_g, pm_g = calculate_trip_emissions(10.0, "SOLO_CAR_GASOLINE")
        assert co2_g == 1700.0
        assert pm_g == 0.15

    def test_electric_metro_zero_tailpipe(self) -> None:
        # 10 km trip in metro:
        # CO2e: 10 * 25.0 = 250.0 grams (grid allocated)
        # Tailpipe PM2.5: 0.0 grams
        co2_g, pm_g = calculate_trip_emissions(10.0, "ELECTRIC_METRO")
        assert co2_g == 250.0
        assert pm_g == 0.0


class TestCompareTransitAlternatives:
    def test_modal_shift_savings(self) -> None:
        res = compare_transit_alternatives(12.0, 180.0, "SOLO_CAR_GASOLINE", "NONE")
        assert res.distance_km == 12.0
        assert res.ambient_pm25 == 180.0
        assert res.best_exposure_mode == "ELECTRIC_METRO"
        assert res.avoided_co2e_grams > 0.0
        assert "Switching from SOLO_CAR_GASOLINE to ELECTRIC_METRO" in res.recommendation_summary
