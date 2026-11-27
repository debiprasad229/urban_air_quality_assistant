import {
  AssistantPlanRequest,
  AssistantPlanResponse,
  CADRRequest,
  CADRResponse,
  CommuteComparisonRequest,
  CommuteComparisonResponse,
  CommunityImpactSummary,
  CurrentAirQualityResponse,
  HealthResponse,
  ImpactAction,
  LocationPreset,
} from './types';
import {
  FALLBACK_DELHI_DATA,
  FALLBACK_IMPACT_SUMMARY,
  FALLBACK_PRESETS,
  buildFallbackCADR,
  buildFallbackCommute,
  buildPresetFallbackData,
} from './fallbacks';

export { FALLBACK_DELHI_DATA, FALLBACK_PRESETS, buildPresetFallbackData };

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
      // Ignore malformed JSON error bodies
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

/** Typed REST API client communicating with the FastAPI backend. */
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
      return buildFallbackCADR(req);
    }
  },

  async compareCommute(req: CommuteComparisonRequest): Promise<CommuteComparisonResponse> {
    try {
      return await fetchJSON<CommuteComparisonResponse>(resolveUrl('/v1/calculators/commute'), {
        method: 'POST',
        body: JSON.stringify(req),
      });
    } catch (err) {
      console.warn('Fallback commute comparator:', err);
      return buildFallbackCommute(req);
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
      return FALLBACK_IMPACT_SUMMARY;
    }
  },

  async recordImpactAction(req: ImpactAction): Promise<CommunityImpactSummary> {
    return fetchJSON<CommunityImpactSummary>(resolveUrl('/v1/impact/record'), {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};
