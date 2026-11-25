"""High-Level Routine Planner Service.

Coordinates weather forecasting, domain physics, emission comparisons,
safety rule evaluation, prompt context construction, and AI synthesis.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.domain.emissions import compare_transit_alternatives
from app.domain.physics import analyze_room_cadr
from app.domain.rules import detect_diurnal_aeration_window, evaluate_safety_advisory
from app.schemas.assistant import AssistantPlanRequestDTO, AssistantPlanResponseDTO
from app.services.ai_service import AIService
from app.services.fallback_planner import FallbackPlanner
from app.services.weather_service import WeatherService

logger = logging.getLogger(__name__)


class PlannerService:
    """Orchestrates daily routine planning combining deterministic science and AI."""

    def __init__(self, weather_service: WeatherService, ai_service: AIService) -> None:
        self.weather_service = weather_service
        self.ai_service = ai_service

    async def create_daily_plan(self, req: AssistantPlanRequestDTO) -> AssistantPlanResponseDTO:
        """Generate a personalized daily plan with safety guardrails."""
        # 1. Fetch hourly weather & AQI
        aq_response = await self.weather_service.get_air_quality(
            lat=req.latitude,
            lon=req.longitude,
            location_name=req.location_name,
        )

        current_aqi = aq_response.calculated_aqi
        current_cat = aq_response.aqi_category

        # 2. Evaluate deterministic safety rules
        advisory = evaluate_safety_advisory(current_aqi, req.vulnerability_category)

        # 3. Detect diurnal aeration window from hourly forecast
        hourly_dicts = [p.model_dump() for p in aq_response.hourly_forecast]
        aeration = detect_diurnal_aeration_window(hourly_dicts)

        # 4. Compute standard room CADR (4m x 5m x 2.44m living space)
        cadr_analysis = analyze_room_cadr(length_m=4.0, width_m=5.0, height_m=2.44, target_ach=4.5)

        # 5. Compute multimodal commute exposure vs emissions
        commute_analysis = compare_transit_alternatives(
            distance_km=req.commute_distance_km,
            ambient_pm25=aq_response.pm25_ug_m3,
            baseline_mode=req.default_commute_mode,
            mask_type="N95_FFP2" if advisory.advisory_level == "SEVERE_WARNING" else "NONE",
        )

        # 6. Build Context-Injected Prompt for Gemini
        prompt = self._build_prompt(
            req=req,
            aqi=current_aqi,
            category=current_cat,
            advisory=advisory,
            aeration=aeration,
            cadr=cadr_analysis,
            commute=commute_analysis,
        )

        # 7. Attempt AI generation
        ai_output = await self.ai_service.generate_plan(prompt)

        if ai_output:
            try:
                # Validate AI output against Pydantic schema
                # Override critical safety fields to ensure AI cannot hallucinate safety
                ai_output["current_aqi"] = current_aqi
                ai_output["aqi_category"] = current_cat
                ai_output["safety_advisory_level"] = advisory.advisory_level
                ai_output["safety_advisory_message"] = (
                    advisory.headline + ". " + advisory.detailed_instructions
                )
                ai_output["is_fallback_plan"] = False
                ai_output["generated_at"] = datetime.now(timezone.utc).isoformat()
                ai_output["location_name"] = req.location_name or aq_response.location_name

                # If severe warning, strictly enforce no outdoor exercise in routine slots
                if advisory.advisory_level == "SEVERE_WARNING":
                    for slot in ai_output.get("daily_schedule", []):
                        if slot.get("setting") == "OUTDOOR":
                            slot["setting"] = "INDOOR"
                            slot["mask_required"] = True
                            slot["advisory_action"] = (
                                "Shifted indoors due to severe smog episode (AQI >= 200). "
                                + slot.get("advisory_action", "")
                            )

                return AssistantPlanResponseDTO.model_validate(ai_output)
            except Exception as val_exc:
                logger.warning("AI response failed schema validation: %s", val_exc)

        # 8. Fallback to deterministic planner
        return FallbackPlanner.build_plan(
            req=req,
            aqi_val=current_aqi,
            aqi_cat=current_cat,
            advisory=advisory,
            aeration=aeration,
            cadr_info=cadr_analysis,
            commute_info=commute_analysis,
        )

    def _build_prompt(
        self,
        req: AssistantPlanRequestDTO,
        aqi: int,
        category: str,
        advisory: Any,
        aeration: Any,
        cadr: Any,
        commute: Any,
    ) -> str:
        """Construct the prompt injecting deterministic facts."""
        facts = {
            "location": req.location_name or f"Coordinates ({req.latitude}, {req.longitude})",
            "current_aqi": aqi,
            "aqi_category": category,
            "safety_advisory_level": advisory.advisory_level,
            "safety_advisory_headline": advisory.headline,
            "mask_mandate": advisory.mask_mandate,
            "safe_aeration_window": (
                f"{aeration.recommended_start} to {aeration.recommended_end}"
                if aeration.safe_to_aerate
                else "DO NOT AERATE"
            ),
            "room_cadr_m3h": cadr.required_cadr_m3h,
            "clearance_time_minutes": cadr.clearance_time_minutes_90pct,
            "commute_distance_km": req.commute_distance_km,
            "best_transit_mode": commute.best_exposure_mode,
            "avoided_co2e_kg": round(commute.avoided_co2e_grams / 1000.0, 2),
            "avoided_exposure_ug": round(commute.avoided_exposure_ug, 1),
            "user_vulnerability": req.vulnerability_category,
            "user_notes": req.user_notes,
        }

        return (
            "You are the Urban Air Quality Assistant. Synthesize a practical daily schedule.\n\n"
            "IMMUTABLE SCIENTIFIC FACTS (Do NOT recalculate or contradict):\n"
            f"{json.dumps(facts, indent=2)}\n\n"
            "REQUIREMENTS:\n"
            "1. Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "daily_schedule": [\n'
            '    {"time_window": "07:30 - 08:30", "activity": "Morning Commute", '
            '"setting": "ENCLOSED_TRANSIT", "advisory_action": "...", '
            '"mask_required": true, "purifier_setting": "OFF"},\n'
            "    ...\n"
            "  ],\n"
            '  "optimal_aeration_window": "...",\n'
            '  "avoided_exposure_estimate_ug": float,\n'
            '  "avoided_co2e_estimate_kg": float,\n'
            '  "impact_explanation": "..."\n'
            "}\n"
            "2. If safety_advisory_level is SEVERE_WARNING, outdoor cardio exercise is forbidden.\n"
            "3. No medical diagnoses."
        )
