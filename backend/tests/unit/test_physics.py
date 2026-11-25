"""Unit Tests for AHAM CADR Room Turnover Physics Engine."""

import pytest

from app.domain.physics import (
    analyze_room_cadr,
    calculate_particle_clearance_time,
    calculate_required_cadr,
    calculate_room_volume,
    evaluate_existing_purifier,
)


class TestCalculateRoomVolume:
    def test_standard_bedroom_volume(self) -> None:
        # 4m x 5m room with standard 2.44m ceiling = 48.8 m³
        vol = calculate_room_volume(4.0, 5.0, 2.44)
        assert vol == 48.8

    def test_rejects_negative_or_zero_dimensions(self) -> None:
        with pytest.raises(ValueError, match="strictly positive"):
            calculate_room_volume(0.0, 5.0)
        with pytest.raises(ValueError, match="strictly positive"):
            calculate_room_volume(4.0, -2.0)


class TestCalculateRequiredCADR:
    def test_smog_containment_ach_4_5(self) -> None:
        # 48.8 m³ room at 4.5 ACH:
        # required_m3h = 48.8 * 4.5 = 219.6 m³/h
        # required_cfm = 219.6 / 1.6990108 = 129.25 -> 129.3 CFM
        cadr_m3h, cadr_cfm = calculate_required_cadr(48.8, 4.5)
        assert cadr_m3h == 219.6
        assert cadr_cfm == 129.3

    def test_rejects_zero_volume(self) -> None:
        with pytest.raises(ValueError):
            calculate_required_cadr(0.0)


class TestCalculateParticleClearanceTime:
    def test_90_percent_clearance_time(self) -> None:
        # Vol = 50 m³, CADR = 225 m³/h -> ACH = 4.5
        # t_90 = ln(10) / 4.5 * 60 = 2.30258 / 4.5 * 60 ~= 30.7 minutes -> 31 mins
        mins = calculate_particle_clearance_time(50.0, 225.0, 0.90)
        assert mins == 31

    def test_half_life_clearance_50_percent(self) -> None:
        # Vol = 50 m³, CADR = 225 m³/h -> ACH = 4.5
        # t_50 = ln(2) / 4.5 * 60 = 0.6931 / 4.5 * 60 ~= 9.24 mins -> 9 mins
        mins = calculate_particle_clearance_time(50.0, 225.0, 0.50)
        assert mins == 9


class TestAnalyzeRoomCADR:
    def test_complete_analysis_bundle(self) -> None:
        analysis = analyze_room_cadr(4.0, 5.0, 2.44, 4.5)
        assert analysis.room_volume_m3 == 48.8
        assert analysis.target_ach == 4.5
        assert analysis.required_cadr_m3h == 219.6
        assert analysis.required_cadr_cfm == 129.3
        assert analysis.clearance_time_minutes_90pct == 31
        assert "maintain a minimum CADR of 219.6 m³/h" in analysis.operating_guidance


class TestEvaluateExistingPurifier:
    def test_adequacy_evaluation(self) -> None:
        # Room: 50 m³, Required at 4.5 ACH = 225 m³/h
        # Purifier 1: 300 m³/h (Adequate)
        p1 = evaluate_existing_purifier(300.0, 50.0, 4.5)
        assert p1.is_adequate is True
        assert p1.achieved_ach == 6.0
        assert "Sufficient" in p1.recommendation

        # Purifier 2: 150 m³/h (Undersized)
        p2 = evaluate_existing_purifier(150.0, 50.0, 4.5)
        assert p2.is_adequate is False
        assert p2.achieved_ach == 3.0
        assert "Undersized" in p2.recommendation
