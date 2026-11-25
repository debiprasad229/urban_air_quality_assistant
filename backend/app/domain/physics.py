"""AHAM AC-1 & ASHRAE 62.2 CADR and Air Turnover Physics Engine.

Deterministic formulas for room volume, Clean Air Delivery Rate (CADR),
target Air Changes per Hour (ACH), and particle clearance half-life.
"""

import math
from typing import NamedTuple

from app.domain.constants import (
    DEFAULT_CEILING_HEIGHT_M,
    M3H_TO_CFM_FACTOR,
    TARGET_ACH_SMOG,
)


class CADRAnalysis(NamedTuple):
    """Immutable result of room CADR calculation."""

    room_volume_m3: float
    target_ach: float
    required_cadr_m3h: float
    required_cadr_cfm: float
    clearance_time_minutes_90pct: int
    operating_guidance: str


class PurifierEvaluation(NamedTuple):
    """Evaluation of an existing purifier's adequacy."""

    is_adequate: bool
    achieved_ach: float
    adequacy_ratio: float
    recommendation: str


def calculate_room_volume(
    length_m: float,
    width_m: float,
    height_m: float = DEFAULT_CEILING_HEIGHT_M,
) -> float:
    """Calculate room volume in cubic meters.

    Args:
        length_m: Room length in meters (> 0.5m).
        width_m: Room width in meters (> 0.5m).
        height_m: Ceiling height in meters (default 2.44m / 8ft).

    Returns:
        Volume in m³, rounded to 2 decimal places.
    """
    if length_m <= 0.0 or width_m <= 0.0 or height_m <= 0.0:
        raise ValueError("Room dimensions must be strictly positive.")
    return round(length_m * width_m * height_m, 2)


def calculate_required_cadr(
    room_volume_m3: float,
    target_ach: float = TARGET_ACH_SMOG,
) -> tuple[float, float]:
    """Calculate required CADR in m³/h and CFM to achieve target ACH.

    Formula:
        CADR (m³/h) = Volume (m³) * Target ACH
        CADR (CFM) = CADR (m³/h) / 1.6990108

    Args:
        room_volume_m3: Room volume in cubic meters.
        target_ach: Target Air Changes per Hour (default 4.5 for smog).

    Returns:
        (cadr_m3h, cadr_cfm) rounded to 1 decimal place.
    """
    if room_volume_m3 <= 0.0 or target_ach <= 0.0:
        raise ValueError("Room volume and target ACH must be strictly positive.")

    cadr_m3h = room_volume_m3 * target_ach
    cadr_cfm = cadr_m3h / M3H_TO_CFM_FACTOR
    return round(cadr_m3h, 1), round(cadr_cfm, 1)


def calculate_particle_clearance_time(
    room_volume_m3: float,
    cadr_m3h: float,
    target_reduction_pct: float = 0.90,
) -> int:
    """Calculate minutes required to eliminate target percentage of suspended particles.

    Assuming well-mixed air and constant effective CADR:
        C(t) = C0 * exp(-ACH * t)
        t = (-ln(1 - reduction)) / ACH

    For 90% reduction (target_reduction_pct = 0.90):
        t_90 = ln(10) / ACH hours ~= 2.3026 / ACH hours

    Args:
        room_volume_m3: Room volume in cubic meters.
        cadr_m3h: Clean Air Delivery Rate in m³/h.
        target_reduction_pct: Desired particulate reduction fraction (default 0.90).

    Returns:
        Minutes to clearance (integer rounded).
    """
    if room_volume_m3 <= 0.0 or cadr_m3h <= 0.0:
        raise ValueError("Room volume and CADR must be strictly positive.")
    if not (0.0 < target_reduction_pct < 1.0):
        raise ValueError("Reduction fraction must be between 0.0 and 1.0.")

    effective_ach = cadr_m3h / room_volume_m3
    hours = -math.log(1.0 - target_reduction_pct) / effective_ach
    minutes = hours * 60.0
    return max(1, int(round(minutes)))


def analyze_room_cadr(
    length_m: float,
    width_m: float,
    height_m: float = DEFAULT_CEILING_HEIGHT_M,
    target_ach: float = TARGET_ACH_SMOG,
) -> CADRAnalysis:
    """Convenience orchestrator for complete CADR sizing analysis."""
    vol = calculate_room_volume(length_m, width_m, height_m)
    cadr_m3h, cadr_cfm = calculate_required_cadr(vol, target_ach)
    clearance_mins = calculate_particle_clearance_time(vol, cadr_m3h, 0.90)

    guidance = (
        f"For a {vol} m³ space, maintain a minimum CADR of {cadr_m3h} m³/h ({cadr_cfm} CFM). "
        f"Following window closure or cooking, run purifier on High/Turbo for {clearance_mins} "
        f"minutes to achieve 90% particle removal, then reduce to Quiet/Medium mode."
    )

    return CADRAnalysis(
        room_volume_m3=vol,
        target_ach=target_ach,
        required_cadr_m3h=cadr_m3h,
        required_cadr_cfm=cadr_cfm,
        clearance_time_minutes_90pct=clearance_mins,
        operating_guidance=guidance,
    )


def evaluate_existing_purifier(
    existing_cadr_m3h: float,
    room_volume_m3: float,
    target_ach: float = TARGET_ACH_SMOG,
) -> PurifierEvaluation:
    """Evaluate whether an existing air purifier is adequate for a room."""
    if existing_cadr_m3h <= 0.0 or room_volume_m3 <= 0.0:
        raise ValueError("CADR and room volume must be positive.")

    achieved_ach = round(existing_cadr_m3h / room_volume_m3, 2)
    ratio = round(achieved_ach / target_ach, 2)
    is_adequate = achieved_ach >= target_ach

    if is_adequate:
        rec = (
            f"Sufficient. Purifier delivers {achieved_ach} ACH "
            f"(exceeds recommended {target_ach} ACH). "
            "Can operate on Medium/Auto setting during baseline hours."
        )
    else:
        rec = (
            f"Undersized for severe smog. Delivers {achieved_ach} ACH "
            f"vs required {target_ach} ACH. "
            "Operate strictly on maximum Turbo speed and consider "
            "adding secondary localized filtration."
        )

    return PurifierEvaluation(
        is_adequate=is_adequate,
        achieved_ach=achieved_ach,
        adequacy_ratio=ratio,
        recommendation=rec,
    )
