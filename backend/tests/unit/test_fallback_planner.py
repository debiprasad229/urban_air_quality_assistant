"""Unit Tests for Deterministic Fallback Planner."""

from app.domain.emissions import compare_transit_alternatives
from app.domain.physics import analyze_room_cadr
from app.domain.rules import AerationWindow, SafetyAdvisory
from app.schemas.assistant import AssistantPlanRequestDTO
from app.services.fallback_planner import FallbackPlanner


def test_fallback_planner_severe_smog() -> None:
    req = AssistantPlanRequestDTO(
        latitude=28.6139,
        longitude=77.2090,
        location_name="New Delhi",
        commute_distance_km=10.0,
        default_commute_mode="SOLO_CAR_GASOLINE",
        vulnerability_category="GENERAL",
    )

    advisory = SafetyAdvisory(
        advisory_level="SEVERE_WARNING",
        outdoor_exercise_permitted=False,
        mask_mandate="MANDATORY_N95",
        headline="Severe Smog Episode",
        detailed_instructions="Ground-level particulates are hazardous. Shift workouts indoors.",
    )

    aeration = AerationWindow(
        safe_to_aerate=False,
        recommended_start=None,
        recommended_end=None,
        duration_minutes=0,
        trough_pm25=190.0,
        peak_pm25=280.0,
        rationale="Hazardous throughout daylight.",
    )

    cadr = analyze_room_cadr(4.0, 5.0, 2.44, 4.5)
    commute = compare_transit_alternatives(10.0, 240.0, "SOLO_CAR_GASOLINE", "N95_FFP2")

    plan = FallbackPlanner.build_plan(
        req=req,
        aqi_val=345,
        aqi_cat="Hazardous",
        advisory=advisory,
        aeration=aeration,
        cadr_info=cadr,
        commute_info=commute,
    )

    assert plan.is_fallback_plan is True
    assert plan.current_aqi == 345
    assert plan.safety_advisory_level == "SEVERE_WARNING"
    assert "DO NOT AERATE" in plan.optimal_aeration_window
    assert len(plan.daily_schedule) == 5
    assert plan.avoided_co2e_estimate_kg > 0.0

    # Under SEVERE_WARNING, commute slot must mandate mask and enclosed transit
    morning_slot = plan.daily_schedule[0]
    assert morning_slot.setting == "ENCLOSED_TRANSIT"
    assert morning_slot.mask_required is True


def test_fallback_planner_moderate_smog_with_aeration() -> None:
    req = AssistantPlanRequestDTO(
        latitude=40.7608,
        longitude=-111.8910,
        location_name="Salt Lake City",
        commute_distance_km=6.0,
    )

    advisory = SafetyAdvisory(
        advisory_level="NORMAL",
        outdoor_exercise_permitted=True,
        mask_mandate="NONE",
        headline="Acceptable Air Quality",
        detailed_instructions="Air quality is satisfactory.",
    )

    aeration = AerationWindow(
        safe_to_aerate=True,
        recommended_start="13:00",
        recommended_end="13:15",
        duration_minutes=15,
        trough_pm25=22.0,
        peak_pm25=48.0,
        rationale="Midday boundary layer expansion allows safe ventilation.",
    )

    cadr = analyze_room_cadr(4.0, 4.0, 2.44, 4.5)
    commute = compare_transit_alternatives(6.0, 35.0, "SOLO_CAR_GASOLINE", "NONE")

    plan = FallbackPlanner.build_plan(
        req=req,
        aqi_val=75,
        aqi_cat="Moderate",
        advisory=advisory,
        aeration=aeration,
        cadr_info=cadr,
        commute_info=commute,
    )

    assert plan.safety_advisory_level == "NORMAL"
    assert "13:00 - 13:15" in plan.optimal_aeration_window
    midday_slot = plan.daily_schedule[2]
    assert "Open opposing windows for exactly 15 minutes" in midday_slot.advisory_action
    assert midday_slot.purifier_setting == "TURBO"
