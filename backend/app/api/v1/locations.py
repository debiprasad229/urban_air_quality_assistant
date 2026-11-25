"""Location Presets & Global Geocoding Search REST Endpoints."""

import logging
from typing import Any

import httpx
from cachetools import TTLCache
from fastapi import APIRouter, Query

from app.config import settings
from app.domain.presets import list_all_presets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/locations", tags=["locations"])

# Cache geocoding lookups for 1 hour to minimize external API calls
_GEOCODE_CACHE: TTLCache[str, list[dict[str, Any]]] = TTLCache(maxsize=256, ttl=3600)


@router.get("/presets")
async def get_presets() -> list[dict[str, Any]]:
    """Retrieve pre-configured demonstration cities with diurnal profiles."""
    return list_all_presets()


@router.get("/search")
async def search_locations(
    q: str = Query(..., min_length=2, max_length=80, description="City name search query"),
) -> list[dict[str, Any]]:
    """Search global cities via Open-Meteo Geocoding API with preset fallback."""
    normalized_q = q.strip().lower()
    if normalized_q in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[normalized_q]

    url = "https://geocoding-api.open-meteo.com/v1/search"
    params: dict[str, str | int] = {
        "name": q.strip(),
        "count": 5,
        "language": "en",
        "format": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OPEN_METEO_TIMEOUT_SECONDS) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                payload = resp.json()
                raw_results = payload.get("results") or []
                mapped: list[dict[str, Any]] = []
                for idx, item in enumerate(raw_results):
                    city_name = str(item.get("name", "")).strip()
                    country = str(item.get("country", "")).strip()
                    admin1 = str(item.get("admin1", "")).strip()
                    display_name = f"{city_name}, {country}" if country else city_name
                    region_desc = ", ".join(p for p in (admin1, country) if p)
                    mapped.append(
                        {
                            "id": f"geo_{item.get('id', idx)}",
                            "name": display_name,
                            "country": str(item.get("country_code", "")),
                            "latitude": float(item["latitude"]),
                            "longitude": float(item["longitude"]),
                            "baseline_pm25": 0.0,
                            "description": (
                                f"Live atmospheric forecast for {region_desc}"
                                if region_desc
                                else "Live atmospheric forecast"
                            ),
                        }
                    )
                _GEOCODE_CACHE[normalized_q] = mapped
                return mapped
            logger.warning("Open-Meteo Geocoding returned status %s", resp.status_code)
    except Exception as exc:
        logger.warning("Open-Meteo Geocoding request failed: %s", exc)

    # Graceful fallback: match built-in presets by name or country
    return [
        p
        for p in list_all_presets()
        if normalized_q in str(p["name"]).lower() or normalized_q in str(p["country"]).lower()
    ]
