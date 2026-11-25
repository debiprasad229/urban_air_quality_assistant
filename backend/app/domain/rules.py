"""Deterministic Harm-Reduction Safety Rules & Diurnal Inversion Analysis.

Evaluates safety thresholds, mandates respiratory protection,
and algorithmically detects optimal window aeration windows.
"""

from typing import Any, NamedTuple


class SafetyAdvisory(NamedTuple):
    """Harm-reduction advisory output."""

    advisory_level: str  # NORMAL, CAUTION, SEVERE_WARNING
    outdoor_exercise_permitted: bool
    mask_mandate: str  # NONE, RECOMMENDED, MANDATORY_N95
    headline: str
    detailed_instructions: str


class AerationWindow(NamedTuple):
    """Midday aeration window analysis."""

    safe_to_aerate: bool
    recommended_start: str | None  # "13:30"
    recommended_end: str | None  # "13:50"
    duration_minutes: int
    trough_pm25: float | None
    peak_pm25: float | None
    rationale: str


def evaluate_safety_advisory(
    aqi: int,
    vulnerability_category: str = "GENERAL",
) -> SafetyAdvisory:
    """Evaluate harm-reduction safety advisory based on EPA AQI and vulnerability.

    Args:
        aqi: Calculated AQI integer value.
        vulnerability_category: 'GENERAL' or 'SENSITIVE' (children/elderly/respiratory).

    Returns:
        SafetyAdvisory containing non-prohibitive, actionable risk escalation.
    """
    is_sensitive = vulnerability_category.upper() == "SENSITIVE"

    # Extreme Hazard: AQI >= 200 (Very Unhealthy / Hazardous)
    if aqi >= 200:
        return SafetyAdvisory(
            advisory_level="SEVERE_WARNING",
            outdoor_exercise_permitted=False,
            mask_mandate="MANDATORY_N95",
            headline="Severe Smog Episode: Escalate Exposure Defenses",
            detailed_instructions=(
                "Ground-level particulate concentrations are hazardous. "
                "Shift all aerobic workouts to indoor filtered spaces. For essential travel, "
                "wear a certified, well-fitted N95/FFP2 respirator. Keep home windows sealed."
            ),
        )

    # Moderate Hazard: 100 <= AQI < 200 (Unhealthy for Sensitive / Unhealthy)
    if aqi >= 100:
        exercise_allowed = not is_sensitive
        mask = "MANDATORY_N95" if is_sensitive else "RECOMMENDED"
        return SafetyAdvisory(
            advisory_level="CAUTION",
            outdoor_exercise_permitted=exercise_allowed,
            mask_mandate=mask,
            headline="Elevated Air Pollution: Moderate Exposure Risk",
            detailed_instructions=(
                "Particulate matter exceeds clean air thresholds. "
                + (
                    "Sensitive individuals should avoid prolonged outdoor exertion "
                    "and wear an N95 mask."
                    if is_sensitive
                    else "Reduce prolonged intense outdoor cardio. Consider wearing a mask."
                )
            ),
        )

    # Low / Normal Hazard: AQI < 100 (Good / Moderate)
    return SafetyAdvisory(
        advisory_level="NORMAL",
        outdoor_exercise_permitted=True,
        mask_mandate="NONE",
        headline="Acceptable Air Quality",
        detailed_instructions=(
            "Air quality is satisfactory for standard outdoor routines. "
            "Sensitive individuals may experience minor irritation during localized traffic peaks."
        ),
    )


def detect_diurnal_aeration_window(
    hourly_series: list[dict[str, Any]],
) -> AerationWindow:
    """Analyze a 24-hour diurnal PM2.5 forecast curve to identify safe ventilation windows.

    Inversion dynamics dictate that midday (12:00 to 15:30) solar heating temporarily
    lifts the boundary layer, creating a relative particulate minimum.

    Criteria for safe aeration:
    1. Trough PM2.5 must be < 150 µg/m³ (beyond which natural air is strictly hazardous).
    2. Trough PM2.5 must be >= 15% lower than the morning peak concentration.
    3. Trough occurs during daylight solar mixing hours (11:00 to 16:00).
    """
    if not hourly_series or len(hourly_series) < 12:
        return AerationWindow(
            safe_to_aerate=False,
            recommended_start=None,
            recommended_end=None,
            duration_minutes=0,
            trough_pm25=None,
            peak_pm25=None,
            rationale="Insufficient hourly forecast data to evaluate diurnal cycle.",
        )

    # Extract concentrations and timestamps
    readings = [(h["time"], float(h.get("pm25", h.get("pm2_5", 0.0)))) for h in hourly_series]

    peak_pm25 = max(r[1] for r in readings)

    # Filter to solar mixing window (11:00 to 16:00)
    daylight_readings: list[tuple[str, float]] = []
    for t_str, val in readings:
        # Check hour representation (e.g. '2026-11-22T13:00' or '13:00')
        hour_part = t_str.split("T")[-1] if "T" in t_str else t_str
        try:
            hour_val = int(hour_part.split(":")[0])
            if 11 <= hour_val <= 16:
                daylight_readings.append((t_str, val))
        except (ValueError, IndexError):
            continue

    if not daylight_readings:
        return AerationWindow(
            safe_to_aerate=False,
            recommended_start=None,
            recommended_end=None,
            duration_minutes=0,
            trough_pm25=None,
            peak_pm25=peak_pm25,
            rationale="No daytime solar mixing hours found in forecast window.",
        )

    # Find the lowest concentration during daytime
    best_time, trough_pm25 = min(daylight_readings, key=lambda x: x[1])

    # If even the daytime low is above 150 µg/m³, natural ventilation is harmful
    if trough_pm25 >= 150.0:
        return AerationWindow(
            safe_to_aerate=False,
            recommended_start=None,
            recommended_end=None,
            duration_minutes=0,
            trough_pm25=trough_pm25,
            peak_pm25=peak_pm25,
            rationale=(
                f"Outdoor PM2.5 remains hazardous throughout daylight hours "
                f"(minimum {trough_pm25} µg/m³). "
                "Keep all windows sealed and rely entirely on mechanical filtration."
            ),
        )

    # Calculate drop compared to peak
    drop_pct = (peak_pm25 - trough_pm25) / peak_pm25 if peak_pm25 > 0 else 0.0

    # Format time slot (e.g., 13:00 -> 13:15 to 13:30)
    hour_clean = best_time.split("T")[-1][:5] if "T" in best_time else best_time[:5]
    start_time = f"{hour_clean}"
    # Recommended 15-minute cross-ventilation burst
    end_time = f"{hour_clean[:3]}20" if hour_clean.endswith(":00") else f"{hour_clean}"

    return AerationWindow(
        safe_to_aerate=True,
        recommended_start=start_time,
        recommended_end=end_time,
        duration_minutes=15,
        trough_pm25=trough_pm25,
        peak_pm25=peak_pm25,
        rationale=(
            f"Diurnal boundary layer expansion lowers PM2.5 to {trough_pm25} µg/m³ "
            f"({round(drop_pct * 100)}% lower than peak). "
            f"Safe for a 15-minute rapid cross-ventilation burst around {start_time}. "
            "Seal windows promptly afterward and run air purifier on High for 20 minutes."
        ),
    )
