"""Authoritative Scientific & Environmental Constants.

Sources:
- US EPA Air Quality Index Breakpoints (40 CFR Part 58, Appendix G)
- ANSI/AHAM AC-1-2020 & ASHRAE 62.2 (Air turnover and CADR)
- US EPA Exposure Factors Handbook (2011), Chapter 6, Table 6-1 (Minute Ventilation)
- UK Department for Environment, Food & Rural Affairs (DEFRA 2023/2024 GHG Factors)
"""

from typing import Final

# -------------------------------------------------------------------------
# 1. US EPA PM2.5 Breakpoints (Truncated to 1 decimal place)
# Format: (C_low, C_high, I_low, I_high, Category Name, Severity Code)
# -------------------------------------------------------------------------
EPA_PM25_BREAKPOINTS: Final[list[tuple[float, float, int, int, str, str]]] = [
    (0.0, 9.0, 0, 50, "Good", "GOOD"),
    (9.1, 35.4, 51, 100, "Moderate", "MODERATE"),
    (35.5, 55.4, 101, 150, "Unhealthy for Sensitive Groups", "SENSITIVE_UNHEALTHY"),
    (55.5, 125.4, 151, 200, "Unhealthy", "UNHEALTHY"),
    (125.5, 225.4, 201, 300, "Very Unhealthy", "VERY_UNHEALTHY"),
    (225.5, 325.4, 301, 400, "Hazardous", "HAZARDOUS_1"),
    (325.5, 500.4, 401, 500, "Hazardous", "HAZARDOUS_2"),
]

# Max concentration capped in standard index
EPA_PM25_MAX_CONCENTRATION: Final[float] = 500.4
EPA_MAX_AQI: Final[int] = 500

# -------------------------------------------------------------------------
# 2. Indoor Air Quality & CADR Standards (ANSI/AHAM AC-1-2020)
# -------------------------------------------------------------------------
# Target Air Changes per Hour for high-smog / wildfire smoke containment
TARGET_ACH_SMOG: Final[float] = 4.5

# Standard residential ceiling height in meters (approx. 8 feet)
DEFAULT_CEILING_HEIGHT_M: Final[float] = 2.44

# Cubic meters per hour to Cubic Feet per Minute conversion factor
# 1 m³/h = 1 / 1.6990107955 CFM ~= 0.588577 CFM
M3H_TO_CFM_FACTOR: Final[float] = 1.6990108

# -------------------------------------------------------------------------
# 3. Minute Ventilation / Inhalation Breathing Rates (US EPA 2011)
# Expressed in m³/hour (Mean Short-Term Inhalation Rates)
# -------------------------------------------------------------------------
VENTILATION_RATES_M3_PER_HOUR: Final[dict[str, float]] = {
    "SEDENTARY": 0.48,  # ~8.0 L/min (sitting, driving, riding train)
    "LIGHT": 1.20,  # ~20.0 L/min (walking 4 km/h)
    "MODERATE": 2.40,  # ~40.0 L/min (bicycling 16 km/h)
    "HEAVY": 3.60,  # ~60.0 L/min (running, vigorous aerobic exercise)
}

# -------------------------------------------------------------------------
# 4. Respiratory Protection Filtration Efficiency (Inward Leakage Factor)
# -------------------------------------------------------------------------
MASK_EFFICIENCY: Final[dict[str, float]] = {
    "NONE": 0.00,
    "SURGICAL": 0.20,  # Low seal efficiency for fine sub-micron particulates
    "N95_FFP2": 0.95,  # Properly fitted particulate respirator
}

# -------------------------------------------------------------------------
# 5. Transit Modal Emission Factors (UK DEFRA 2023/2024 Conversion Factors)
# Values: (g CO2e per passenger-km, g tailpipe PM2.5 per passenger-km)
# -------------------------------------------------------------------------
TRANSIT_EMISSION_FACTORS: Final[dict[str, tuple[float, float]]] = {
    "SOLO_CAR_GASOLINE": (170.0, 0.0150),
    "CAR_HYBRID": (105.0, 0.0070),
    "CAR_EV": (0.0, 0.0000),  # Direct tailpipe emissions
    "BUS_DIESEL": (82.0, 0.0035),  # Average occupancy allocation
    "ELECTRIC_METRO": (25.0, 0.0000),  # Grid-allocated upstream, 0 tailpipe
    "BICYCLE": (0.0, 0.0000),
    "WALK": (0.0, 0.0000),
}
