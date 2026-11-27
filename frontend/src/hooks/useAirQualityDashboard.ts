import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AssistantPlanResponse,
  CommunityImpactSummary,
  CurrentAirQualityResponse,
  LocationPreset,
} from '../api/types';
import { apiClient, FALLBACK_DELHI_DATA, FALLBACK_PRESETS } from '../api/client';
import { buildFallbackRoutinePlan, FALLBACK_IMPACT_SUMMARY } from '../api/fallbacks';
import { PlanFormInput } from '../components/assistant/PlanRequestForm';

const PLAN_CACHE_TTL_MS = 15 * 60 * 1000;

function buildPlanCacheKey(preset: LocationPreset, formInput: PlanFormInput): string {
  return JSON.stringify([
    Number(preset.latitude.toFixed(2)),
    Number(preset.longitude.toFixed(2)),
    formInput.commute_distance_km,
    formInput.default_commute_mode,
    formInput.vulnerability_category,
    formInput.user_notes.trim(),
  ]);
}

/** Manages air quality fetching, 15-min TTL plan caching, health probing, and impact state. */
export function useAirQualityDashboard() {
  const [presets, setPresets] = useState<LocationPreset[]>(FALLBACK_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<LocationPreset>(FALLBACK_PRESETS[0]);
  const [airQuality, setAirQuality] = useState<CurrentAirQualityResponse>(FALLBACK_DELHI_DATA);
  const [plan, setPlan] = useState<AssistantPlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [lastFormInput, setLastFormInput] = useState<PlanFormInput>({
    commute_distance_km: 8.0,
    default_commute_mode: 'SOLO_CAR_GASOLINE',
    vulnerability_category: 'GENERAL',
    user_notes: '',
  });
  const [impactSummary, setImpactSummary] = useState<CommunityImpactSummary>(
    FALLBACK_IMPACT_SUMMARY
  );
  const [backendHealth, setBackendHealth] = useState<'checking' | 'healthy' | 'waking' | 'offline'>(
    'checking'
  );

  const planCacheRef = useRef<Map<string, { plan: AssistantPlanResponse; cachedAt: number }>>(
    new Map()
  );

  const checkHealth = useCallback(async () => {
    setBackendHealth('checking');
    try {
      await apiClient.getHealth();
      setBackendHealth('healthy');
    } catch {
      setBackendHealth('waking');
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    const initData = async () => {
      try {
        const loadedPresets = await apiClient.getPresets();
        if (loadedPresets.length > 0) {
          setPresets(loadedPresets);
          setSelectedPreset(
            (prev) => loadedPresets.find((p) => p.name === prev.name) || loadedPresets[0]
          );
        }
      } catch (err) {
        console.warn('Using default presets:', err);
      }

      try {
        const impact = await apiClient.getCommunityImpact();
        setImpactSummary(impact);
      } catch (err) {
        console.warn('Using default impact summary:', err);
      }
    };

    void initData();
  }, []);

  const generatePlanForPreset = useCallback(
    async (
      preset: LocationPreset,
      formInput: PlanFormInput,
      aqSnapshot: CurrentAirQualityResponse
    ) => {
      const cacheKey = buildPlanCacheKey(preset, formInput);
      const cached = planCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < PLAN_CACHE_TTL_MS) {
        setPlanError(null);
        setPlan({ ...cached.plan, location_name: preset.name });
        return;
      }

      setPlanLoading(true);
      setPlanError(null);
      try {
        const generated = await apiClient.createAssistantPlan({
          latitude: preset.latitude,
          longitude: preset.longitude,
          location_name: preset.name,
          commute_distance_km: formInput.commute_distance_km,
          default_commute_mode: formInput.default_commute_mode,
          vulnerability_category: formInput.vulnerability_category,
          user_notes: formInput.user_notes,
        });
        if (!generated.is_fallback_plan) {
          planCacheRef.current.set(cacheKey, { plan: generated, cachedAt: Date.now() });
        }
        setPlan(generated);
      } catch (err) {
        console.warn('Assistant API unavailable or rate-limited, using fallback schedule:', err);
        const errMsg = err instanceof Error ? err.message : '';
        setPlanError(
          errMsg.toLowerCase().includes('rate limit')
            ? `${errMsg} Showing deterministic safety schedule.`
            : 'Live assistant endpoint unreachable — showing offline safety schedule.'
        );
        setPlan(buildFallbackRoutinePlan(preset.name, formInput.commute_distance_km, aqSnapshot));
      } finally {
        setPlanLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let isCancelled = false;
    const fetchCityState = async () => {
      let aqSnapshot = airQuality;
      try {
        const data = await apiClient.getCurrentAirQuality(
          selectedPreset.latitude,
          selectedPreset.longitude,
          selectedPreset.name
        );
        if (!isCancelled) {
          setAirQuality(data);
          aqSnapshot = data;
        }
      } catch (err) {
        console.error('Failed to load air quality:', err);
      }

      if (!isCancelled) {
        await generatePlanForPreset(selectedPreset, lastFormInput, aqSnapshot);
      }
    };

    void fetchCityState();
    return () => {
      isCancelled = true;
    };
  }, [selectedPreset.name]);

  const handleFormSubmit = async (formInput: PlanFormInput) => {
    setLastFormInput(formInput);
    await generatePlanForPreset(selectedPreset, formInput, airQuality);
  };

  return {
    presets,
    selectedPreset,
    setSelectedPreset,
    airQuality,
    plan,
    planLoading,
    planError,
    impactSummary,
    setImpactSummary,
    backendHealth,
    checkHealth,
    handleFormSubmit,
  };
}
