import {
  LocationPreset,
  CurrentAirQualityResponse,
  CADRRequest,
  CADRResponse,
  CommuteComparisonRequest,
  CommuteComparisonResponse,
  AssistantPlanRequest,
  AssistantPlanResponse,
  CommunityImpactSummary,
  ImpactAction,
  HealthResponse,
} from './types';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (envUrl) {
    if (envUrl.startsWith('http')) return envUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
      return `${window.location.origin}${envUrl.startsWith('/') ? '' : '/'}${envUrl}`.replace(/\/$/, '');
    }
  }
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:8000/api';
};

const resolveUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export const FALLBACK_PRESETS: LocationPreset[] = [
  {
    id: 'delhi',
    name: 'New Delhi, India',
    country: 'IN',
    latitude: 28.6139,
    longitude: 77.2090,
    baseline_pm25: 245.0,
    description: 'Severe post-harvest biomass burning + vehicular stagnation under shallow winter inversion.',
  },
  {
    id: 'lahore',
    name: 'Lahore, Pakistan',
    country: 'PK',
    latitude: 31.5204,
    longitude: 74.3587,
    baseline_pm25: 280.0,
    description: 'Dense Indus basin smog with recurring hazardous particulate entrapment.',
  },
  {
    id: 'salt_lake_city',
    name: 'Salt Lake City, USA',
    country: 'US',
    latitude: 40.7608,
    longitude: -111.8910,
    baseline_pm25: 48.0,
    description: 'Topographic bowl inversion trapping winter woodsmoke and vehicle exhaust.',
  },
  {
    id: 'london',
    name: 'London, United Kingdom',
    country: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    baseline_pm25: 28.0,
    description: 'Maritime winter boundary layer with localized diesel and domestic heating spikes.',
  },
  {
    id: 'bhubaneswar',
    name: 'Bhubaneswar, India',
    country: 'IN',
    latitude: 20.2961,
    longitude: 85.8245,
    baseline_pm25: 115.0,
    description: 'Rapidly developing tropical urban center with road dust, vehicular spikes, and winter nocturnal cooling.',
  },
];

function approximateAqiFromPm25(pm: number): { aqi: number; category: string } {
  if (pm <= 9.0) return { aqi: Math.round((pm / 9.0) * 50), category: 'Good' };
  if (pm <= 35.4) return { aqi: Math.round(51 + ((pm - 9.1) / 26.3) * 49), category: 'Moderate' };
  if (pm <= 55.4) return { aqi: Math.round(101 + ((pm - 35.5) / 19.9) * 49), category: 'Unhealthy for Sensitive Groups' };
  if (pm <= 125.4) return { aqi: Math.round(151 + ((pm - 55.5) / 69.9) * 49), category: 'Unhealthy' };
  if (pm <= 225.4) return { aqi: Math.round(201 + ((pm - 125.5) / 99.9) * 99), category: 'Very Unhealthy' };
  return { aqi: Math.min(500, Math.round(301 + ((pm - 225.5) / 274.9) * 199)), category: 'Hazardous' };
}

export function buildPresetFallbackData(
  lat: number,
  lon: number,
  name?: string
): CurrentAirQualityResponse {
  const matched =
    FALLBACK_PRESETS.find((p) => (name && p.name === name) || (Math.abs(p.latitude - lat) < 0.5 && Math.abs(p.longitude - lon) < 0.5)) ||
    FALLBACK_PRESETS[0];
  const basePm = matched.baseline_pm25;
  const { aqi, category } = approximateAqiFromPm25(basePm);
  const advisoryLevel = aqi >= 200 ? 'SEVERE_WARNING' : aqi >= 100 ? 'CAUTION' : 'NORMAL';
  const aerationOk = basePm * 0.65 < 150;

  return {
    location_name: name || matched.name,
    latitude: lat,
    longitude: lon,
    timestamp: new Date().toISOString(),
    pm25_ug_m3: basePm,
    calculated_aqi: aqi,
    aqi_category: category,
    severity_code: advisoryLevel,
    standard_label: 'US_EPA_NOWCAST',
    data_provenance: 'DEMO_PRESET',
    safety_advisory_level: advisoryLevel,
    health_summary: matched.description,
    aeration_recommended: aerationOk,
    aeration_window_text: aerationOk ? '13:00 - 13:20 (15 min rapid flush)' : 'Keep windows sealed today',
    aeration_rationale: aerationOk
      ? 'Midday solar mixing lowers particulate concentration enough for a brief 15-minute cross-ventilation flush.'
      : 'Particulate levels remain too high for natural ventilation; rely on mechanical HEPA filtration.',
    hourly_forecast: Array.from({ length: 24 }).map((_, i) => {
      const isPeak = (i >= 6 && i <= 9) || (i >= 18 && i <= 22);
      const isAeration = i >= 12 && i <= 15;
      const mult = isPeak ? 1.25 : isAeration ? 0.6 : 0.95;
      const pm = Math.round(basePm * mult * 10) / 10;
      const ptAqi = approximateAqiFromPm25(pm);
      return {
        time: `${String(i).padStart(2, '0')}:00`,
        pm25_ug_m3: pm,
        pm10_ug_m3: Math.round(pm * 1.5 * 10) / 10,
        calculated_aqi: ptAqi.aqi,
        aqi_category: ptAqi.category,
        is_inversion_peak: isPeak,
        is_aeration_window: isAeration && pm < 150,
      };
    }),
  };
}

export const FALLBACK_DELHI_DATA: CurrentAirQualityResponse = buildPresetFallbackData(
  28.6139,
  77.209,
  'New Delhi, India'
);

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errObj = await res.json();
      errorDetail = errObj.detail || errObj.message || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  async getHealth(): Promise<HealthResponse> {
    return fetchJSON<HealthResponse>(resolveUrl('/health'));
  },

  async getPresets(): Promise<LocationPreset[]> {
    try {
      return await fetchJSON<LocationPreset[]>(resolveUrl('/v1/locations/presets'));
    } catch (err) {
      console.warn('Backend unavailable, using fallback presets:', err);
      return FALLBACK_PRESETS;
    }
  },

  async searchLocations(query: string): Promise<LocationPreset[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    try {
      const url = new URL(resolveUrl('/v1/locations/search'));
      url.searchParams.set('q', trimmed);
      return await fetchJSON<LocationPreset[]>(url.toString());
    } catch (err) {
      console.warn('Location search unavailable, matching fallback presets:', err);
      const lower = trimmed.toLowerCase();
      return FALLBACK_PRESETS.filter(
        (p) => p.name.toLowerCase().includes(lower) || p.country.toLowerCase().includes(lower)
      );
    }
  },

  async getCurrentAirQuality(
    lat: number,
    lon: number,
    name?: string
  ): Promise<CurrentAirQualityResponse> {
    try {
      const url = new URL(resolveUrl('/v1/air-quality/current'));
      url.searchParams.set('lat', lat.toString());
      url.searchParams.set('lon', lon.toString());
      if (name) url.searchParams.set('name', name);
      return await fetchJSON<CurrentAirQualityResponse>(url.toString());
    } catch (err) {
      console.warn('API error, returning representative fallback data:', err);
      return buildPresetFallbackData(lat, lon, name);
    }
  },

  async calculateCADR(req: CADRRequest): Promise<CADRResponse> {
    try {
      return await fetchJSON<CADRResponse>(resolveUrl('/v1/calculators/cadr'), {
        method: 'POST',
        body: JSON.stringify(req),
      });
    } catch (err) {
      console.warn('Fallback CADR math:', err);
      const volume = Math.round(req.room_length_m * req.room_width_m * req.ceiling_height_m * 10) / 10;
      const cadr_m3h = Math.round(volume * 4.5 * 10) / 10;
      const cadr_cfm = Math.round((cadr_m3h / 1.6990108) * 10) / 10;
      const effectiveAch =
        req.current_purifier_cadr_m3h && req.current_purifier_cadr_m3h > 0
          ? req.current_purifier_cadr_m3h / volume
          : 4.5;
      const mins = Math.round((2.302585 / effectiveAch) * 60);
      const isAdequate =
        req.current_purifier_cadr_m3h !== undefined && req.current_purifier_cadr_m3h !== null
          ? req.current_purifier_cadr_m3h >= cadr_m3h
          : null;
      return {
        room_volume_m3: volume,
        target_ach: 4.5,
        required_cadr_m3h: cadr_m3h,
        required_cadr_cfm: cadr_cfm,
        clearance_time_minutes_90pct: mins,
        operating_guidance: 'Run purifier continuously during inversion peaks.',
        is_existing_purifier_adequate: isAdequate,
        existing_purifier_recommendation:
          isAdequate === null
            ? null
            : isAdequate
            ? 'Sufficient capacity for 4.5 ACH smog clearance.'
            : `Undersized: requires at least ${cadr_m3h} m³/h for 4.5 ACH.`,
      };
    }
  },

  async compareCommute(req: CommuteComparisonRequest): Promise<CommuteComparisonResponse> {
    try {
      return await fetchJSON<CommuteComparisonResponse>(
        resolveUrl('/v1/calculators/commute'),
        {
          method: 'POST',
          body: JSON.stringify(req),
        }
      );
    } catch (err) {
      console.warn('Fallback commute comparator:', err);
      const scale = req.distance_km / 8.0;
      const pmScale = req.ambient_pm25_ug_m3 / 150.0;
      return {
        distance_km: req.distance_km,
        ambient_pm25: req.ambient_pm25_ug_m3,
        baseline_mode: req.baseline_mode || 'SOLO_CAR_GASOLINE',
        best_exposure_mode: 'ELECTRIC_METRO',
        best_emission_mode: 'BICYCLE',
        avoided_exposure_ug: Math.round(10.0 * scale * pmScale * 10) / 10,
        avoided_co2e_grams: Math.round(1160 * scale),
        recommendation_summary: 'Electric Metro minimizes inhaled PM2.5 while cutting >80% of CO2e.',
        options: [
          {
            mode: 'SOLO_CAR_GASOLINE',
            duration_minutes: Math.round(19 * scale),
            inhaled_pm25_ug: Math.round(16.0 * scale * pmScale * 10) / 10,
            tailpipe_co2e_grams: Math.round(1360 * scale),
            tailpipe_pm25_grams: Math.round(0.12 * scale * 100) / 100,
            exposure_tier: 'MODERATE',
          },
          {
            mode: 'ELECTRIC_METRO',
            duration_minutes: Math.round(15 * scale),
            inhaled_pm25_ug: Math.round(8.4 * scale * pmScale * 10) / 10,
            tailpipe_co2e_grams: Math.round(200 * scale),
            tailpipe_pm25_grams: 0,
            exposure_tier: 'LOW',
          },
          {
            mode: 'BUS_DIESEL',
            duration_minutes: Math.round(27 * scale),
            inhaled_pm25_ug: Math.round(28.0 * scale * pmScale * 10) / 10,
            tailpipe_co2e_grams: Math.round(656 * scale),
            tailpipe_pm25_grams: Math.round(0.03 * scale * 100) / 100,
            exposure_tier: 'MODERATE',
          },
          {
            mode: 'BICYCLE',
            duration_minutes: Math.round(32 * scale),
            inhaled_pm25_ug: Math.round(96.0 * scale * pmScale * 10) / 10,
            tailpipe_co2e_grams: 0,
            tailpipe_pm25_grams: 0,
            exposure_tier: 'EXTREME',
          },
        ],
      };
    }
  },

  async createAssistantPlan(req: AssistantPlanRequest): Promise<AssistantPlanResponse> {
    return fetchJSON<AssistantPlanResponse>(resolveUrl('/v1/assistant/plan'), {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getCommunityImpact(): Promise<CommunityImpactSummary> {
    try {
      return await fetchJSON<CommunityImpactSummary>(resolveUrl('/v1/impact/summary'));
    } catch (err) {
      console.warn('Fallback impact ledger:', err);
      return {
        total_actions_logged: 142,
        total_co2e_avoided_kg: 248.5,
        total_pm25_avoided_ug: 1845.0,
        last_updated: new Date().toISOString(),
      };
    }
  },

  async recordImpactAction(req: ImpactAction): Promise<CommunityImpactSummary> {
    return fetchJSON<CommunityImpactSummary>(resolveUrl('/v1/impact/record'), {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};
