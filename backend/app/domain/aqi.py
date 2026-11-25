"""Deterministic US EPA NowCast Air Quality Index (AQI) Calculation Engine.

Implements official piecewise linear interpolation for PM2.5 concentrations
in accordance with 40 CFR Part 58, Appendix G.
"""

import math
from typing import NamedTuple

from app.domain.constants import (
    EPA_MAX_AQI,
    EPA_PM25_BREAKPOINTS,
    EPA_PM25_MAX_CONCENTRATION,
)


class AQIResult(NamedTuple):
    """Immutable result of an AQI calculation."""

    aqi: int
    category: str
    severity_code: str
    truncated_pm25: float


def truncate_pm25(concentration: float) -> float:
    """Truncate PM2.5 concentration to 1 decimal place as specified by US EPA.

    Example: 35.48 -> 35.4 (not rounded to 35.5).
    """
    if concentration <= 0.0:
        return 0.0
    # math.floor on scaled value avoids IEEE float rounding issues
    return math.floor(round(concentration, 4) * 10.0) / 10.0


def calculate_aqi_from_pm25(pm25_concentration: float) -> AQIResult:
    """Deterministically calculate the US EPA AQI from raw PM2.5 concentration.

    Formula:
        Ip = ((I_high - I_low) / (BP_high - BP_low)) * (Cp - BP_low) + I_low

    Args:
        pm25_concentration: Measured or forecasted PM2.5 in µg/m³.

    Returns:
        AQIResult containing integer AQI, category name, severity code,
        and the truncated PM2.5 concentration.
    """
    if pm25_concentration < 0.0:
        # Negative readings (e.g. baseline zero drift) are clamped to 0.0
        c_p = 0.0
    else:
        c_p = truncate_pm25(pm25_concentration)

    # Beyond standard index range (> 500.4 µg/m³) - Emergency / Capped at 500
    if c_p > EPA_PM25_MAX_CONCENTRATION:
        return AQIResult(
            aqi=EPA_MAX_AQI,
            category="Beyond Index / Emergency",
            severity_code="EMERGENCY",
            truncated_pm25=c_p,
        )

    # Piecewise linear lookup
    for bp_low, bp_high, i_low, i_high, category, code in EPA_PM25_BREAKPOINTS:
        if bp_low <= c_p <= bp_high:
            raw_aqi = ((i_high - i_low) / (bp_high - bp_low)) * (c_p - bp_low) + i_low
            # EPA rounds AQI to the nearest integer
            calculated_aqi = int(round(raw_aqi))
            return AQIResult(
                aqi=calculated_aqi,
                category=category,
                severity_code=code,
                truncated_pm25=c_p,
            )

    # Fallback to maximum bracket if edge rounding touches upper limit
    return AQIResult(
        aqi=EPA_MAX_AQI,
        category="Hazardous",
        severity_code="HAZARDOUS_2",
        truncated_pm25=c_p,
    )
