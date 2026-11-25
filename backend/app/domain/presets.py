"""Built-In Demonstration Presets.

High-smog urban centers with pre-compiled 24-hour diurnal curves,
guaranteeing complete offline demo functionality.
"""

import math
from typing import Any

PRESETS_DATA: list[dict[str, Any]] = [
    {
        "id": "delhi",
        "name": "New Delhi, India",
        "country": "IN",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "baseline_pm25": 245.0,
        "description": (
            "Severe post-harvest biomass burning + vehicular stagnation "
            "under shallow winter inversion."
        ),
        "diurnal_multipliers": [
            ("00:00", 0.95),
            ("02:00", 0.90),
            ("04:00", 0.92),
            ("06:00", 1.05),
            ("08:00", 1.25),
            ("10:00", 1.10),
            ("12:00", 0.75),
            ("14:00", 0.55),
            ("16:00", 0.65),
            ("18:00", 1.00),
            ("20:00", 1.20),
            ("22:00", 1.15),
        ],
    },
    {
        "id": "lahore",
        "name": "Lahore, Pakistan",
        "country": "PK",
        "latitude": 31.5204,
        "longitude": 74.3587,
        "baseline_pm25": 280.0,
        "description": "Dense Indus basin smog with recurring hazardous particulate entrapment.",
        "diurnal_multipliers": [
            ("00:00", 0.98),
            ("02:00", 0.95),
            ("04:00", 0.96),
            ("06:00", 1.12),
            ("08:00", 1.30),
            ("10:00", 1.15),
            ("12:00", 0.70),
            ("14:00", 0.50),
            ("16:00", 0.62),
            ("18:00", 1.05),
            ("20:00", 1.25),
            ("22:00", 1.18),
        ],
    },
    {
        "id": "salt_lake_city",
        "name": "Salt Lake City, USA",
        "country": "US",
        "latitude": 40.7608,
        "longitude": -111.8910,
        "baseline_pm25": 48.0,
        "description": "Topographic bowl inversion trapping winter woodsmoke and vehicle exhaust.",
        "diurnal_multipliers": [
            ("00:00", 0.90),
            ("02:00", 0.85),
            ("04:00", 0.88),
            ("06:00", 1.10),
            ("08:00", 1.22),
            ("10:00", 1.05),
            ("12:00", 0.80),
            ("14:00", 0.65),
            ("16:00", 0.75),
            ("18:00", 1.15),
            ("20:00", 1.20),
            ("22:00", 1.05),
        ],
    },
    {
        "id": "london",
        "name": "London, United Kingdom",
        "country": "GB",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "baseline_pm25": 28.0,
        "description": (
            "Maritime winter boundary layer with localized diesel and domestic heating spikes."
        ),
        "diurnal_multipliers": [
            ("00:00", 0.80),
            ("02:00", 0.75),
            ("04:00", 0.78),
            ("06:00", 1.05),
            ("08:00", 1.35),
            ("10:00", 1.00),
            ("12:00", 0.85),
            ("14:00", 0.80),
            ("16:00", 0.95),
            ("18:00", 1.30),
            ("20:00", 1.10),
            ("22:00", 0.90),
        ],
    },
    {
        "id": "bhubaneswar",
        "name": "Bhubaneswar, India",
        "country": "IN",
        "latitude": 20.2961,
        "longitude": 85.8245,
        "baseline_pm25": 115.0,
        "description": (
            "Rapidly developing tropical urban center with road dust, vehicular spikes, "
            "and winter nocturnal cooling."
        ),
        "diurnal_multipliers": [
            ("00:00", 0.90),
            ("02:00", 0.85),
            ("04:00", 0.90),
            ("06:00", 1.15),
            ("08:00", 1.30),
            ("10:00", 1.05),
            ("12:00", 0.68),
            ("14:00", 0.52),
            ("16:00", 0.65),
            ("18:00", 1.10),
            ("20:00", 1.25),
            ("22:00", 1.10),
        ],
    },
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in km between two GPS coordinates."""
    r = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def get_preset_by_id(preset_id: str) -> dict[str, Any] | None:
    """Retrieve preset by ID."""
    p_id = preset_id.lower().strip()
    return next((p for p in PRESETS_DATA if p["id"] == p_id), None)


def list_all_presets() -> list[dict[str, Any]]:
    """Return all preset summaries."""
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "country": p["country"],
            "latitude": p["latitude"],
            "longitude": p["longitude"],
            "baseline_pm25": p["baseline_pm25"],
            "description": p["description"],
        }
        for p in PRESETS_DATA
    ]


def find_closest_preset(
    lat: float,
    lon: float,
    max_distance_km: float = 60.0,
) -> dict[str, Any] | None:
    """Find the nearest preset if within max_distance_km."""
    closest = None
    min_dist = float("inf")
    for p in PRESETS_DATA:
        dist = haversine_km(lat, lon, p["latitude"], p["longitude"])
        if dist < min_dist:
            min_dist = dist
            closest = p

    if min_dist <= max_distance_km:
        return closest
    return None
