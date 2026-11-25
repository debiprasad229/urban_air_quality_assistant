"""Deterministic Fallback Routine Planner.

Constructs 100% valid AssistantPlanResponseDTO objects using rule-based
templates and pre-calculated scientific numbers when the LLM is unreachable.
"""

from datetime import datetime, timezone
from typing import Any

from app.domain.physics import CADRAnalysis
from app.domain.rules import AerationWindow, SafetyAdvisory
from app.schemas.assistant import AssistantPlanRequestDTO, AssistantPlanResponseDTO, RoutineSlotDTO


class FallbackPlanner:
    """Compiles rule-based daily schedules without requiring an LLM."""

    @staticmethod
    def build_plan(
        req: AssistantPlanRequestDTO,
        aqi_val: int,
        aqi_cat: str,
        advisory: SafetyAdvisory,
        aeration: AerationWindow,
        cadr_info: CADRAnalysis,
        commute_info: Any,
    ) -> AssistantPlanResponseDTO:
        """Compile a complete daily routine schedule from pre-calculated domain facts."""
        is_severe = advisory.advisory_level == "SEVERE_WARNING"
        mask_needed = advisory.mask_mandate in ("MANDATORY_N95", "RECOMMENDED")

        # 1. Aeration statement
        if aeration.safe_to_aerate and aeration.recommended_start:
            aeration_statement = (
                f"{aeration.recommended_start} - {aeration.recommended_end} "
                f"({aeration.duration_minutes} min rapid cross-ventilation)"
            )
            midday_action = (
                f"Open opposing windows for exactly {aeration.duration_minutes} minutes "
                f"to flush indoor CO2. Seal windows promptly afterward."
            )
            midday_purifier = "TURBO"
        else:
            aeration_statement = "DO NOT AERATE TODAY (Air remains hazardous throughout daylight)"
            midday_action = (
                "Keep street-facing windows completely sealed. Air out using internal "
                "recirculation only."
            )
            midday_purifier = "MEDIUM"

        # 2. Build 5-slot structured schedule
        slots: list[RoutineSlotDTO] = [
            RoutineSlotDTO(
                time_window="07:30 - 08:30",
                activity="Morning Commute",
                setting="ENCLOSED_TRANSIT" if is_severe else "OUTDOOR",
                advisory_action=(
                    f"Morning boundary layer inversion traps surface particulates. "
                    f"Avoid walking or cycling along main roads. "
                    f"{'Wear a certified N95 respirator.' if mask_needed else 'Normal transit.'}"
                ),
                mask_required=mask_needed,
                purifier_setting="OFF",
            ),
            RoutineSlotDTO(
                time_window="09:00 - 12:30",
                activity="Indoor Work / Study",
                setting="INDOOR",
                advisory_action=(
                    f"Maintain home/office purifier on Medium mode. Target CADR: "
                    f"{cadr_info.required_cadr_m3h} m³/h to maintain clean air baseline."
                ),
                mask_required=False,
                purifier_setting="MEDIUM",
            ),
            RoutineSlotDTO(
                time_window="13:00 - 14:00",
                activity="Midday Aeration & Lunch",
                setting="INDOOR",
                advisory_action=midday_action,
                mask_required=False,
                purifier_setting=midday_purifier,
            ),
            RoutineSlotDTO(
                time_window="17:30 - 18:30",
                activity="Evening Commute & Errands",
                setting="ENCLOSED_TRANSIT" if is_severe else "OUTDOOR",
                advisory_action=(
                    "Evening rush hour and dropping temperatures cause a second smog spike. "
                    "Opt for electric metro or carpool to reduce personal inhalation."
                ),
                mask_required=mask_needed,
                purifier_setting="OFF",
            ),
            RoutineSlotDTO(
                time_window="20:00 - 22:30",
                activity="Evening Domestic Routine & Sleep Prep",
                setting="INDOOR",
                advisory_action=(
                    f"Close bedroom doors. Run air purifier on High/Turbo for "
                    f"{cadr_info.clearance_time_minutes_90pct} minutes before bedtime to achieve "
                    f"90% particle clearance, then switch to Sleep mode."
                ),
                mask_required=False,
                purifier_setting="HIGH",
            ),
        ]

        # 3. Calculate avoided impact metrics
        co2_saved_kg = round(commute_info.avoided_co2e_grams / 1000.0, 2)
        pm_saved_ug = round(commute_info.avoided_exposure_ug, 1)

        impact_text = (
            f"Adopting electric transit for your {req.commute_distance_km} km commute avoids "
            f"{co2_saved_kg} kg CO2e emissions and reduces personal particulate inhalation by "
            f"{pm_saved_ug} µg compared to driving solo."
        )

        loc = req.location_name or f"Coordinates ({req.latitude}, {req.longitude})"

        return AssistantPlanResponseDTO(
            location_name=loc,
            generated_at=datetime.now(timezone.utc).isoformat(),
            current_aqi=aqi_val,
            aqi_category=aqi_cat,
            safety_advisory_level=advisory.advisory_level,
            safety_advisory_message=advisory.headline + ". " + advisory.detailed_instructions,
            optimal_aeration_window=aeration_statement,
            daily_schedule=slots,
            avoided_exposure_estimate_ug=pm_saved_ug,
            avoided_co2e_estimate_kg=co2_saved_kg,
            impact_explanation=impact_text,
            is_fallback_plan=True,
        )
