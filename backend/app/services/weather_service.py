"""Asynchronous Open-Meteo Air Quality Service with In-Memory Caching."""

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from cachetools import TTLCache

from app.config import settings
from app.domain.aqi import calculate_aqi_from_pm25
from app.domain.presets import PRESETS_DATA, find_closest_preset
from app.domain.rules import detect_diurnal_aeration_window, evaluate_safety_advisory
from app.schemas.air_quality import CurrentAirQualityResponse, HourlyForecastPoint
from app.schemas.common import DataProvenance

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for retrieving real-time and forecasted air quality data."""

    def __init__(self) -> None:
        self.cache: TTLCache[tuple[float, float], CurrentAirQualityResponse] = TTLCache(
            maxsize=settings.CACHE_MAX_ENTRIES,
            ttl=settings.CACHE_TTL_SECONDS,
        )

    @staticmethod
    def coarsen_coordinates(lat: float, lon: float) -> tuple[float, float]:
        """Round coordinates to 2 decimal places (~1.1 km) for privacy and cache clustering."""
        return round(lat, 2), round(lon, 2)

    async def get_air_quality(
        self,
        lat: float,
        lon: float,
        location_name: str | None = None,
    ) -> CurrentAirQualityResponse:
        """Fetch current air quality and 24-hr forecast with caching and preset fallback."""
        lat_c, lon_c = self.coarsen_coordinates(lat, lon)
        cache_key = (lat_c, lon_c)

        # 1. Check in-memory cache
        if cache_key in self.cache:
            cached_item = self.cache[cache_key]
            # Return fresh copy marked as CACHED_ESTIMATE
            return cached_item.model_copy(
                update={
                    "data_provenance": DataProvenance.CACHED_ESTIMATE,
                    "location_name": location_name or cached_item.location_name,
                }
            )

        # 2. Query Open-Meteo API using local timezone & current observation
        url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        params: dict[str, str | int | float] = {
            "latitude": lat_c,
            "longitude": lon_c,
            "current": "pm2_5,pm10,us_aqi",
            "hourly": "pm2_5,pm10,us_aqi",
            "timezone": "auto",
            "forecast_days": 2,
        }

        try:
            async with httpx.AsyncClient(timeout=settings.OPEN_METEO_TIMEOUT_SECONDS) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    payload = resp.json()
                    parsed = self._parse_open_meteo_response(payload, lat_c, lon_c, location_name)
                    self.cache[cache_key] = parsed
                    return parsed
                logger.warning("Open-Meteo API returned non-200: %s", resp.status_code)
        except Exception as exc:
            logger.warning("Open-Meteo API request failed or timed out: %s", exc)

        # 3. Fallback to closest preset or generic seasonal baseline
        fallback = self._build_preset_fallback(lat_c, lon_c, location_name)
        return fallback

    def _enrich_response(
        self,
        location_name: str,
        lat: float,
        lon: float,
        timestamp: str,
        current_pm25: float,
        provenance: DataProvenance,
        hourly_points: list[HourlyForecastPoint],
    ) -> CurrentAirQualityResponse:
        """Compute EPA AQI, safety advisory, and aeration window metadata."""
        current_aqi = calculate_aqi_from_pm25(current_pm25)
        advisory = evaluate_safety_advisory(current_aqi.aqi, "GENERAL")
        aeration = detect_diurnal_aeration_window([p.model_dump() for p in hourly_points])

        if aeration.safe_to_aerate and aeration.recommended_start:
            aeration_window_text = (
                f"{aeration.recommended_start} - {aeration.recommended_end} "
                f"({aeration.duration_minutes} min rapid flush)"
            )
        else:
            aeration_window_text = "Keep windows sealed today"

        return CurrentAirQualityResponse(
            location_name=location_name,
            latitude=lat,
            longitude=lon,
            timestamp=timestamp,
            pm25_ug_m3=round(current_pm25, 1),
            calculated_aqi=current_aqi.aqi,
            aqi_category=current_aqi.category,
            severity_code=current_aqi.severity_code,
            standard_label="US_EPA_NOWCAST",
            data_provenance=provenance,
            safety_advisory_level=advisory.advisory_level,
            health_summary=f"{advisory.headline}. {advisory.detailed_instructions}",
            aeration_recommended=aeration.safe_to_aerate,
            aeration_window_text=aeration_window_text,
            aeration_rationale=aeration.rationale,
            hourly_forecast=hourly_points,
        )

    def _parse_open_meteo_response(
        self,
        payload: dict[str, Any],
        lat: float,
        lon: float,
        location_name: str | None,
    ) -> CurrentAirQualityResponse:
        hourly = payload.get("hourly", {})
        times: list[str] = hourly.get("time", [])
        pm25_vals: list[float | None] = hourly.get("pm2_5", [])
        pm10_vals: list[float | None] = hourly.get("pm10", [])

        hourly_points: list[HourlyForecastPoint] = []
        valid_24 = [float(v) for v in pm25_vals[:24] if v is not None]
        max_pm25 = max(valid_24) if valid_24 else 50.0

        for i in range(min(24, len(times))):
            t = times[i]
            raw_pm25 = pm25_vals[i] if i < len(pm25_vals) else None
            val = float(raw_pm25) if raw_pm25 is not None else 0.0
            raw_pm10 = pm10_vals[i] if i < len(pm10_vals) else None
            pm10_val = float(raw_pm10) if raw_pm10 is not None else None
            aqi_res = calculate_aqi_from_pm25(val)

            # Detect morning/evening peaks
            is_peak = val >= (max_pm25 * 0.90) and val > 60.0
            # Detect midday aeration window (12:00 - 15:00)
            is_aeration = False
            try:
                hour = int(t.split("T")[-1].split(":")[0])
                if 12 <= hour <= 15 and val < 150.0:
                    is_aeration = True
            except (ValueError, IndexError):
                pass

            hourly_points.append(
                HourlyForecastPoint(
                    time=t,
                    pm25_ug_m3=val,
                    pm10_ug_m3=pm10_val,
                    calculated_aqi=aqi_res.aqi,
                    aqi_category=aqi_res.category,
                    is_inversion_peak=is_peak,
                    is_aeration_window=is_aeration,
                )
            )

        current_block = payload.get("current", {})
        raw_current = current_block.get("pm2_5")
        if raw_current is not None:
            current_pm25 = float(raw_current)
        elif valid_24:
            current_pm25 = valid_24[0]
        else:
            current_pm25 = 25.0

        current_ts = str(
            current_block.get("time")
            or (times[0] if times else datetime.now(timezone.utc).isoformat())
        )
        name = location_name or f"Coordinates ({lat}, {lon})"

        return self._enrich_response(
            location_name=name,
            lat=lat,
            lon=lon,
            timestamp=current_ts,
            current_pm25=current_pm25,
            provenance=DataProvenance.FORECAST_MODEL,
            hourly_points=hourly_points,
        )

    def _build_preset_fallback(
        self,
        lat: float,
        lon: float,
        location_name: str | None,
    ) -> CurrentAirQualityResponse:
        preset = find_closest_preset(lat, lon, max_distance_km=150.0) or PRESETS_DATA[0]
        base_pm25 = float(preset["baseline_pm25"])

        hourly_points: list[HourlyForecastPoint] = []
        now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        for time_str, multiplier in preset["diurnal_multipliers"]:
            val = round(base_pm25 * multiplier, 1)
            aqi_res = calculate_aqi_from_pm25(val)
            iso_time = f"{now_date}T{time_str}"
            hour = int(time_str.split(":")[0])
            is_peak = multiplier >= 1.15
            is_aeration = (12 <= hour <= 15) and (val < 150.0)

            hourly_points.append(
                HourlyForecastPoint(
                    time=iso_time,
                    pm25_ug_m3=val,
                    pm10_ug_m3=round(val * 1.5, 1),
                    calculated_aqi=aqi_res.aqi,
                    aqi_category=aqi_res.category,
                    is_inversion_peak=is_peak,
                    is_aeration_window=is_aeration,
                )
            )

        return self._enrich_response(
            location_name=preset["name"] if not location_name else location_name,
            lat=lat,
            lon=lon,
            timestamp=datetime.now(timezone.utc).isoformat(),
            current_pm25=base_pm25,
            provenance=DataProvenance.DEMO_PRESET,
            hourly_points=hourly_points,
        )
