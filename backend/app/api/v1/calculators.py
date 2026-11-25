"""Deterministic Physics & Emission Calculators REST Endpoints."""

from fastapi import APIRouter

from app.domain.emissions import compare_transit_alternatives
from app.domain.physics import analyze_room_cadr, evaluate_existing_purifier
from app.schemas.calculators import (
    CADRRequestDTO,
    CADRResponseDTO,
    CommuteComparisonRequestDTO,
    CommuteComparisonResponseDTO,
    CommuteOptionDTO,
)

router = APIRouter(prefix="/calculators", tags=["calculators"])


@router.post("/cadr", response_model=CADRResponseDTO)
async def compute_cadr_sizing(payload: CADRRequestDTO) -> CADRResponseDTO:
    """Compute required CADR (m³/h and CFM), 4.5 ACH target, and 90% particle clearance time."""
    analysis = analyze_room_cadr(
        length_m=payload.room_length_m,
        width_m=payload.room_width_m,
        height_m=payload.ceiling_height_m,
        target_ach=4.5,
    )

    is_adequate = None
    existing_rec = None
    if payload.current_purifier_cadr_m3h is not None and payload.current_purifier_cadr_m3h > 0:
        purifier_eval = evaluate_existing_purifier(
            existing_cadr_m3h=payload.current_purifier_cadr_m3h,
            room_volume_m3=analysis.room_volume_m3,
            target_ach=4.5,
        )
        is_adequate = purifier_eval.is_adequate
        existing_rec = purifier_eval.recommendation

    return CADRResponseDTO(
        room_volume_m3=analysis.room_volume_m3,
        target_ach=analysis.target_ach,
        required_cadr_m3h=analysis.required_cadr_m3h,
        required_cadr_cfm=analysis.required_cadr_cfm,
        clearance_time_minutes_90pct=analysis.clearance_time_minutes_90pct,
        operating_guidance=analysis.operating_guidance,
        is_existing_purifier_adequate=is_adequate,
        existing_purifier_recommendation=existing_rec,
    )


@router.post("/commute", response_model=CommuteComparisonResponseDTO)
async def compute_commute_comparison(
    payload: CommuteComparisonRequestDTO,
) -> CommuteComparisonResponseDTO:
    """Compare transit alternatives by inhaled particulate dose and avoided tailpipe emissions."""
    res = compare_transit_alternatives(
        distance_km=payload.distance_km,
        ambient_pm25=payload.ambient_pm25_ug_m3,
        baseline_mode=payload.baseline_mode,
        mask_type=payload.mask_type,
    )

    options_dto = [
        CommuteOptionDTO(
            mode=opt.mode,
            duration_minutes=opt.duration_minutes,
            inhaled_pm25_ug=opt.inhaled_pm25_ug,
            tailpipe_co2e_grams=opt.tailpipe_co2e_grams,
            tailpipe_pm25_grams=opt.tailpipe_pm25_grams,
            exposure_tier=opt.exposure_tier,
        )
        for opt in res.options
    ]

    return CommuteComparisonResponseDTO(
        distance_km=res.distance_km,
        ambient_pm25=res.ambient_pm25,
        baseline_mode=res.baseline_mode,
        options=options_dto,
        best_exposure_mode=res.best_exposure_mode,
        best_emission_mode=res.best_emission_mode,
        avoided_exposure_ug=res.avoided_exposure_ug,
        avoided_co2e_grams=res.avoided_co2e_grams,
        recommendation_summary=res.recommendation_summary,
    )
