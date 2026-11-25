"""Transit Modal Inhaled Dose & Emission Abatement Engine.

Implements EPA Exposure Factors Handbook inhalation dose equations
and UK DEFRA mobile source greenhouse gas and particulate emission factors.
"""

from typing import NamedTuple

from app.domain.constants import (
    MASK_EFFICIENCY,
    TRANSIT_EMISSION_FACTORS,
    VENTILATION_RATES_M3_PER_HOUR,
)


class CommuteComparisonItem(NamedTuple):
    """Comparative exposure and emission metrics for a single transport mode."""

    mode: str
    duration_minutes: int
    inhaled_pm25_ug: float
    tailpipe_co2e_grams: float
    tailpipe_pm25_grams: float
    exposure_tier: str  # LOW, MODERATE, HIGH, EXTREME


class CommuteComparisonResult(NamedTuple):
    """Result of multimodal transit comparison."""

    distance_km: float
    ambient_pm25: float
    baseline_mode: str
    options: list[CommuteComparisonItem]
    best_exposure_mode: str
    best_emission_mode: str
    avoided_exposure_ug: float
    avoided_co2e_grams: float
    recommendation_summary: str


# Approximate urban travel speeds in km/h
MODE_SPEED_KMH: dict[str, float] = {
    "WALK": 4.5,
    "BICYCLE": 15.0,
    "SOLO_CAR_GASOLINE": 25.0,
    "CAR_HYBRID": 25.0,
    "CAR_EV": 25.0,
    "BUS_DIESEL": 18.0,
    "ELECTRIC_METRO": 32.0,
}

# Mode exertion level mapping
MODE_EXERTION: dict[str, str] = {
    "WALK": "LIGHT",
    "BICYCLE": "MODERATE",
    "SOLO_CAR_GASOLINE": "SEDENTARY",
    "CAR_HYBRID": "SEDENTARY",
    "CAR_EV": "SEDENTARY",
    "BUS_DIESEL": "SEDENTARY",
    "ELECTRIC_METRO": "SEDENTARY",
}


def estimate_duration_minutes(distance_km: float, transport_mode: str) -> int:
    """Estimate trip duration in minutes based on urban average travel speeds."""
    speed = MODE_SPEED_KMH.get(transport_mode, 20.0)
    hours = distance_km / speed
    return max(1, int(round(hours * 60.0)))


def calculate_inhaled_dose(
    ambient_pm25_ug_m3: float,
    duration_minutes: float,
    transport_mode: str,
    mask_type: str = "NONE",
) -> float:
    """Calculate total mass of PM2.5 inhaled during travel.

    Formula:
        Dose (µg) = C_ambient * (Duration / 60) * V_E * (1 - eta_mask)

    Args:
        ambient_pm25_ug_m3: Ambient particulate concentration in µg/m³.
        duration_minutes: Duration of transit in minutes.
        transport_mode: Mode string (e.g. 'BICYCLE', 'ELECTRIC_METRO').
        mask_type: Mask efficiency key ('NONE', 'SURGICAL', 'N95_FFP2').

    Returns:
        Inhaled particulate mass in micrograms, rounded to 2 decimal places.
    """
    if ambient_pm25_ug_m3 < 0.0 or duration_minutes <= 0.0:
        return 0.0

    exertion = MODE_EXERTION.get(transport_mode, "SEDENTARY")
    v_e = VENTILATION_RATES_M3_PER_HOUR.get(exertion, 0.48)
    eta_mask = MASK_EFFICIENCY.get(mask_type, 0.0)

    duration_hours = duration_minutes / 60.0
    dose_ug = ambient_pm25_ug_m3 * duration_hours * v_e * (1.0 - eta_mask)
    return round(dose_ug, 2)


def calculate_trip_emissions(distance_km: float, transport_mode: str) -> tuple[float, float]:
    """Calculate direct trip emissions based on DEFRA factors.

    Args:
        distance_km: Travel distance in kilometers.
        transport_mode: Transit mode string.

    Returns:
        (tailpipe_co2e_grams, tailpipe_pm25_grams) rounded to 2 decimal places.
    """
    if distance_km <= 0.0:
        return (0.0, 0.0)

    co2_factor, pm_factor = TRANSIT_EMISSION_FACTORS.get(transport_mode, (0.0, 0.0))
    co2_grams = distance_km * co2_factor
    pm_grams = distance_km * pm_factor
    return round(co2_grams, 2), round(pm_grams, 4)


def compare_transit_alternatives(
    distance_km: float,
    ambient_pm25: float,
    baseline_mode: str = "SOLO_CAR_GASOLINE",
    mask_type: str = "NONE",
) -> CommuteComparisonResult:
    """Generate multimodal comparison matrix between baseline and sustainable modes."""
    evaluated_modes = [
        "SOLO_CAR_GASOLINE",
        "CAR_EV",
        "ELECTRIC_METRO",
        "BUS_DIESEL",
        "BICYCLE",
        "WALK",
    ]

    items: list[CommuteComparisonItem] = []
    baseline_dose = 0.0
    baseline_co2 = 0.0

    for mode in evaluated_modes:
        duration = estimate_duration_minutes(distance_km, mode)
        # In cars/trains with windows up, assume ~30% passive filtration if no mask
        in_enclosed = mode in ("SOLO_CAR_GASOLINE", "CAR_EV", "ELECTRIC_METRO")
        effective_ambient = ambient_pm25 * 0.7 if in_enclosed else ambient_pm25
        dose = calculate_inhaled_dose(effective_ambient, duration, mode, mask_type)
        co2_g, pm_g = calculate_trip_emissions(distance_km, mode)

        if dose < 20.0:
            tier = "LOW"
        elif dose < 60.0:
            tier = "MODERATE"
        elif dose < 150.0:
            tier = "HIGH"
        else:
            tier = "EXTREME"

        item = CommuteComparisonItem(
            mode=mode,
            duration_minutes=duration,
            inhaled_pm25_ug=dose,
            tailpipe_co2e_grams=co2_g,
            tailpipe_pm25_grams=pm_g,
            exposure_tier=tier,
        )
        items.append(item)

        if mode == baseline_mode:
            baseline_dose = dose
            baseline_co2 = co2_g

    # Find optimal sustainable mode (e.g. Electric Metro)
    metro_item = next((i for i in items if i.mode == "ELECTRIC_METRO"), items[0])
    avoided_exposure = max(0.0, baseline_dose - metro_item.inhaled_pm25_ug)
    avoided_co2 = max(0.0, baseline_co2 - metro_item.tailpipe_co2e_grams)

    summary = (
        f"Switching from {baseline_mode} to ELECTRIC_METRO for a {distance_km} km commute avoids "
        f"{round(avoided_co2 / 1000.0, 2)} kg CO2e and reduces "
        f"inhaled PM2.5 by {round(avoided_exposure, 1)} µg."
    )

    return CommuteComparisonResult(
        distance_km=distance_km,
        ambient_pm25=ambient_pm25,
        baseline_mode=baseline_mode,
        options=items,
        best_exposure_mode="ELECTRIC_METRO",
        best_emission_mode="ELECTRIC_METRO",
        avoided_exposure_ug=round(avoided_exposure, 1),
        avoided_co2e_grams=round(avoided_co2, 1),
        recommendation_summary=summary,
    )
